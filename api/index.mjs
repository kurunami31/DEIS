import { createApp } from '../backend/src/app.js';

let app;

function getApp() {
  if (!app) app = createApp();
  return app;
}

export default async function handler(req, res) {
  try {
    const expressApp = getApp();
    return expressApp(req, res);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
