import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  githubOwner: string;
  githubRepo: string;
  githubBranch?: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const branch = props.githubBranch ?? 'main';

    // 1. Target S3 Bucket (Private, Block All Public Access)
    const siteBucket = new s3.Bucket(this, 'AngularSiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 2. CloudFront Distribution with Origin Access Control (OAC)
    const distribution = new cloudfront.Distribution(this, 'AngularSiteDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          // Supports Angular client-side routing
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // 3. CodeBuild Project for Building Angular & Syncing to S3
    const buildProject = new codebuild.PipelineProject(this, 'AngularBuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0, // Node 20 runtime
        computeType: codebuild.ComputeType.SMALL,
      },
      environmentVariables: {
        S3_BUCKET_NAME: { value: siteBucket.bucketName },
        CLOUDFRONT_DIST_ID: { value: distribution.distributionId },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'npm --prefix to-do-list-aws ci',
            ],
          },
          build: {
            commands: [
              'npm --prefix to-do-list-aws run build -- --configuration production',
            ],
          },
          post_build: {
            commands: [
              'aws s3 sync to-do-list-aws/dist/to-do-list-aws/browser s3://gc-static-bucket-22 --delete',
              'aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DIST_ID --paths "/*"',
            ],
          },
        },
      }),
    });

    // Grant CodeBuild permissions to modify S3 and invalidate CloudFront
    siteBucket.grantReadWrite(buildProject);
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cloudfront:CreateInvalidation'],
        resources: [`arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`],
      })
    );

    // 4. CodePipeline Setup
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // Requires an AWS CodeStar Connections ARN or GitHub Webhook Connection
    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'GitHub_Source',
      owner: props.githubOwner,
      repo: props.githubRepo,
      branch: branch,
      connectionArn: `arn:aws:codeconnections:us-east-1:533267233668:connection/9b9e7c15-4107-4a93-ae89-8b08ce800f55`,
      output: sourceOutput,
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Angular_Build_and_Deploy',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    new codepipeline.Pipeline(this, 'AngularFrontendPipeline', {
      pipelineName: 'angular-frontend-pipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'BuildAndDeploy',
          actions: [buildAction],
        },
      ],
    });

    // Stack Outputs
    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'The live CloudFront URL of your Angular site',
    });
  }
}