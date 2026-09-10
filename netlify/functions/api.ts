import serverless from 'serverless-http';
import { createExpressApp } from '../../server/app';

const app = createExpressApp();
const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  // Netlify rewrites /api/* to /.netlify/functions/api/:splat
  // Normalize event.path so Express /api/* routes match reliably
  if (event.path && event.path.startsWith('/.netlify/functions/api')) {
    event.path = event.path.replace('/.netlify/functions/api', '/api');
  }

  // Prevent background event loop handles (e.g. rate limiter cleanup) from freezing Lambda response
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  return await serverlessHandler(event, context);
};
