import { Context, LambdaRequest } from '@aws-appsync/utils';
export function request(ctx: Context): LambdaRequest{
    return { 
      operation: 'Invoke', 
      payload: ctx.args 
    };
  }
  
  export function response(ctx: { result: any }) {
    return ctx.result;
  }