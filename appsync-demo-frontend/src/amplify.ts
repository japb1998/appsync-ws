import { Amplify } from 'aws-amplify';
console.log('configuring Amplify for appsync-demo');

Amplify.configure({
  API: {
    GraphQL: {
      // Provide endpoint and region information here
      endpoint: '<appsync-endpoint>',
      region: 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: '<api-key>'
      // Read next section on how to set the correct authorization mode for the API
    }
  }
});