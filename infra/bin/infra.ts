import * as cdk from 'aws-cdk-lib';
import { FrontendStack } from '../lib/infra-stack';

const app = new cdk.App();

new FrontendStack(app, 'FrontendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  githubOwner: 'gsierra22',
  githubRepo: 'to-do-list-aws',
  githubBranch: 'master',
});