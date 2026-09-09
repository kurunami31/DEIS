import serverless from 'serverless-http';
import { createApp } from '../backend/src/app.js';

const app = createApp();
const handler = serverless(app);

export default handler;
