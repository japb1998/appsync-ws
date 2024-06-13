import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { AppsyncRuleTarget, CustomEventBus } from "./construcs/event-bus";

export class AppsyncWsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const graphqlApi = new appsync.GraphqlApi(this, "EventApi", {
      name: "event-processor-api",
      schema: appsync.SchemaFile.fromAsset("schema/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
        additionalAuthorizationModes: [{
          authorizationType: appsync.AuthorizationType.API_KEY,
        }],
      },
    });

    // get the CFN representation of the API Note: Needed in order to get the graphqlEndpointArn which is not the same as the api ARN.
    const cfnGraphqlApi = graphqlApi.node.defaultChild as appsync.CfnGraphQLApi;
    const graphqlEndpointArn = cfnGraphqlApi.getAtt("GraphQLEndpointArn");

    //Resolvers

    /** 
     *  None DataSource - for local event processing, meaning we do not trigger any external data source but we use a JS appsync runtime only.
     * https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-none-js.html
    */
    const noneDs = graphqlApi.addNoneDataSource("none-ds", {});
    noneDs.createResolver("localJsResolver", {
  
      typeName: "Mutation",
      fieldName: "sendEventBridgeEvent",
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      code: appsync.Code.fromInline(`
      export function request(ctx) {
      return { payload: ctx.args };
      }
      export function response(ctx) {
          return ctx.result;
      }`),
    });


    // Lambda Data Source
    const sendEventLambda = new lambda.Function(this, "event-processor", {
      functionName: "event-processor",
      runtime: lambda.Runtime.PROVIDED_AL2023,
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../bin/functions/sendEventResolver")
      ),
      handler: "does_not_matter", // this does not matter
      architecture: lambda.Architecture.ARM_64,
      tracing: lambda.Tracing.ACTIVE,
    });

    const sendEventDs = graphqlApi.addLambdaDataSource(
      "send-event-ds",
      sendEventLambda
    );

    /**
     * https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-lambda-js.html
     */
    sendEventDs.createResolver("send-event-resolver", {
      typeName: "Mutation",
      fieldName: "sendLambdaEvent",
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      code: appsync.Code.fromInline(`
      export function request(ctx) {
        return {
        operation: 'Invoke',
        payload: ctx.args
        };
      }
      export function response(ctx) {
          return ctx.result;
      }`),
    });

    /**
     * Role used to invoke the graphql API
     */
    const invocationRole = new iam.Role(this, "AppsyncInvocationRole", {
      roleName: "AppsyncDemoInvocationRole",
      assumedBy: new iam.ServicePrincipal("events.amazonaws.com"),
      inlinePolicies: {
        AppSyncInvokePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: "AppSyncInvokePolicy",
              actions: ["appsync:GraphQL"],
              resources: [`${graphqlApi.arn}/*`],
              effect: iam.Effect.ALLOW,
            }),
          ],
        }),
      },
    });

    /**
     * Documentation on the Rule CF fields that the dev needs to understand.
     * 1. event bridge rule - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-events-rule.html
     * 2. event bridge target - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-events-rule-target.html
     * 2.a appsync specific field appsync parameters - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-events-rule-appsyncparameters.html
     * 2.b Input transformer understanding is required in order to pass the right values from your event to your query - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-events-rule-inputtransformer.html
    */
    const appsyncTargets: AppsyncRuleTarget[] = [
      // None DS target
      {
        id: "eb-local-target",
        arn: graphqlEndpointArn,
        roleArn: invocationRole.roleArn,
        appSyncParameters: {
          graphQlOperation: `mutation sendEventBridgeEvent($to: String!, $from: String!, $message: String!){
            sendEventBridgeEvent(to: $to, from: $from, message: $message)
            {
              to
              message
              from
          }
}`,
        },
        inputTransformer: {
          // Map the fields required for mutation
          inputPathsMap: {
            to: "$.detail.to",
            from: "$.detail.from",
            message: "$.detail.message",
          },
          inputTemplate: JSON.stringify({
            to: "<to>",
            from: "<from>",
            message: "<message>",
          }),
        },
      },
    ];

    /**
     * https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html
    */ 
    const ebPattern = {
      source: ["appsync-ws"],
      detail: {
        message: [{ exists: true }],
        from: [{ exists: true }],
        to: [{ exists: true }],
      },
    }
    
    const eb = new CustomEventBus(this, 'AppsyncDemoEB', {
      ebName: 'appsync-demo-eb'
    });

    eb.addAppsyncRule('AppsyncDemoRule', 'appsync-live-notification', ebPattern, ...appsyncTargets)
  }
}
