import { Construct } from "constructs";
import * as eb from "aws-cdk-lib/aws-events";
import *  as cdk from 'aws-cdk-lib';

// currently the type has only the required fields to make the rule work although if other fields are needed they can be added.
export type AppsyncRuleTarget = {
    id: string;
    // graphqlEndpointArn
    arn: any;
    // Invocation URL
    roleArn: string;
    appSyncParameters: {
        // graphqlQuery
        graphQlOperation: string;
    };
    inputTransformer: {
        inputPathsMap: {
            to: string;
            from: string;
            message: string;
        };
        // JSON
        inputTemplate: string;
    };
};

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

    /**
     * 
     * @param resourceId 
     * @param ruleName 
     * @param eventPattern 
     * @param {AppsyncRuleTarget} targets - The target to add to the rule.
     */
    addAppsyncRule(resourceId: string, ruleName: string, eventPattern: { [key: string]: any }, ...targets: AppsyncRuleTarget[]) {
        if (targets.length < 1) throw new Error('At least one target must be provided');

          // create from rule cfn instead as test
          new eb.CfnRule(this, resourceId, {
            eventBusName: this.eventBusName,
            eventPattern: eventPattern,
            name: ruleName,
            targets: targets.map(target => {
                return {
                    id: target.id,
                    arn: target.arn,
                    roleArn: target.roleArn,
                    appSyncParameters: target.appSyncParameters,
                    inputTransformer: target.inputTransformer
                }
            })
          }).addDependency(this.eventBus.node.defaultChild as cdk.CfnResource)
    }
}

