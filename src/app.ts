import * as iot from '@aws-cdk/aws-iot-alpha';
import * as iotActions from '@aws-cdk/aws-iot-actions-alpha';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'PushIotMetricsToGrafanaMimirStack');

const fn = new nodejs.NodejsFunction(stack, 'Function', {
  entry: './src/app.Function.ts',
  runtime: lambda.Runtime.NODEJS_22_X,
  architecture: lambda.Architecture.ARM_64,
  environment: {},
})
ssm.StringParameter
  .fromSecureStringParameterAttributes(stack, 'GrafanaOtelSecrets', {
    parameterName: '/grafana/otel/secrets',
    version: 1,
  })
  .grantRead(fn);

const errorLog = new logs.LogGroup(stack, "ErrorLog", {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

const topic = new iot.TopicRule(stack, 'TopicRule', {
  sql: iot.IotSql.fromStringAsVer20160323("SELECT * FROM 'PushIotMetricsToGrafanaMimir'"),
  actions: [new iotActions.LambdaFunctionAction(fn)],
  errorAction: new iotActions.CloudWatchLogsAction(errorLog),
});
