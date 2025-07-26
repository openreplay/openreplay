import express from 'express';
import { isAWSRunning, createAWSJob } from './services/aws_batch.js';
const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const authHeader = req.get('authorization') || '';
    const jwt = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;
    const { projectId, sessionId } = req.body;
    if (!projectId || !sessionId) return res.status(400).json({ error: 'missing ids' });
    // since we're only supporting AWS for now;
    const isRunning = isAWSRunning;
    const launch = createAWSJob;
    if (await isRunning(projectId, sessionId)) {
      return res.status(200).json({ status: 'in_progress' });
    }

    const { jobId } = await launch(projectId, sessionId, jwt);
    return res.status(200).json({ status: 'queued', jobId });
  } catch (e) {
    next(e);
  }
});

router.get('/ping', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
