import { createApp } from '../backend/src/app.js';

let app;

function getApp() {
  if (!app) app = createApp();
  return app;
}

export default async function handler(req, res) {
  const expressApp = getApp();
  return expressApp(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
