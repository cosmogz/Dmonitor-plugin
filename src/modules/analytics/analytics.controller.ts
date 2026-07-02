import { Router, Request, Response } from 'express';
import { ReadingRepository } from '../../shared/repositories/reading.repository';
import { rollingAverage, detectThreshold } from './analytics.engine';

export const analyticsRouter = Router();

analyticsRouter.get('/patients/:id/trends', async (req: Request, res: Response) => {
  const { id } = req.params;
  const readings = await ReadingRepository.findByPatientId(id);
  const values = readings.map((r) => r.glucoseValue);
  const averages = rollingAverage(values, 3);
  const latest = values[0];
  const thresholds = { low: 3.9, high: 10.0 }; // mmol/L defaults
  const alert = latest !== undefined ? detectThreshold(latest, thresholds) : null;

  res.json({ patientId: id, readingsCount: readings.length, averages, latest, alert });
});
