import express from 'express';
import { isRunning, launch } from './services/aws_batch.js';
const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const authHeader = req.get('authorization') || '';
    const jwt = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;
    const { projectId, sessionId } = req.body;
    if (!projectId || !sessionId) return res.status(400).json({ error: 'missing ids' });

    if (await isRunning(projectId, sessionId)) {
      return res.status(200).json({ status: 'in_progress' });
    }

    const { jobId } = await launch(projectId, sessionId, jwt);
    return res.status(200).json({ status: 'queued', jobId });
  } catch (e) {
    next(e);
  }
});

export default router;
