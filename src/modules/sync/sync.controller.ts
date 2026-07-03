import { Router, Request, Response } from 'express';
import { SyncStatusRepository } from '../../shared/repositories/sync-status.repository';

export const syncRouter = Router();

syncRouter.post('/status', async (req: Request, res: Response) => {
  const { patientId, status, details } = req.body as { patientId?: string; status?: string; details?: string };
  if (!patientId || !status) {
    return res.status(400).json({ error: 'patientId and status are required' });
  }

  const syncRecord = await SyncStatusRepository.save({ patientId, status, details });
  return res.status(200).json({ message: 'Sync status recorded', data: syncRecord });
});
