import * as cdk from 'aws-cdk-lib';
import { AppsyncWsStack } from '../lib/appsync-ws-stack';


const app = new cdk.App();

new AppsyncWsStack(
    app,
    `AppsyncWsStack`
);
