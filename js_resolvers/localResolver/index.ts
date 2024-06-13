import { Context } from '@aws-appsync/utils'
export function request(ctx: Context) {
  return { payload: ctx.args };
}

export function response(ctx: Context) {
  return ctx.result;
}