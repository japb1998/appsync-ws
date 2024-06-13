import { Construct } from "constructs";
import * as eb from "aws-cdk-lib/aws-events";
import *  as cdk from 'aws-cdk-lib';

export type AppsyncEBTarget = {
    Id: string;
    // graphqlEndpointArn
    Arn: any;
    // Invocation URL
    RoleArn: string;
    AppSyncParameters: {
        // graphqlQuery
        GraphQLOperation: string;
    };
    InputTransformer: {
        InputPathsMap: {
            to: string;
            from: string;
            message: string;
        };
        // JSON
        InputTemplate: string;
    };
}
export class CustomEventBus extends Construct {
    eventBus: eb.EventBus;

    get eventBusName() {
        return this.eventBus.eventBusName;
    }
    constructor(scope: Construct, id: string, props: {
        ebName: string;
    }){
        super(scope, id);
        const { ebName: eventBusName} = props;

        this.eventBus = new eb.EventBus(this, "EventBus", {
            eventBusName,
        });

    }

    addAppsyncRule(resourceId: string, ruleName: string, eventPattern: { [key: string]: any }, ...targets: AppsyncEBTarget[]) {
        if (targets.length < 1) throw new Error('At least one target must be provided');

        new cdk.CfnResource(this, resourceId, {
            type: "AWS::Events::Rule",
            properties: {
              EventBusName: this.eventBusName,
              EventPattern: eventPattern,
              Name: "appsync-rule",
              Targets: targets,
            },
          });
    }
}

