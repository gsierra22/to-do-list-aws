import * as cdk from 'aws-cdk-lib';
import { FrontendStack } from '../lib/frontend-stack';

const app = new cdk.App();

new FrontendStack(app, 'AngularFrontendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  githubOwner: 'gsierra22',
  githubRepo: 'to-do-list-aws',
  githubBranch: 'master',
});