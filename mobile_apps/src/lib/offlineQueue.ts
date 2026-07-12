import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReadingSubmission, ReadingSubmissionResponse } from './readingApi';

const QUEUE_STORAGE_KEY = 'dmonitor-mobile-offline-queue';

export type QueuedReading = {
  id: string;
  payload: ReadingSubmission;
  createdAt: string;
  lastError?: string;
};

async function readQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
  if (!raw) {
    return [] as QueuedReading[];
  }

  try {
    return JSON.parse(raw) as QueuedReading[];
  } catch {
    return [] as QueuedReading[];
  }
}

async function writeQueue(queue: QueuedReading[]) {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export async function loadQueuedReadings() {
  return readQueue();
}

export async function enqueueReading(payload: ReadingSubmission, lastError?: string) {
  const queue = await readQueue();
  const queuedReading: QueuedReading = {
    id: `${payload.offlineUploadId ?? 'offline'}-${Date.now()}`,
    payload,
    createdAt: new Date().toISOString(),
    lastError,
  };

  const nextQueue = [...queue, queuedReading];
  await writeQueue(nextQueue);
  return nextQueue;
}

export async function removeQueuedReading(id: string) {
  const queue = await readQueue();
  const nextQueue = queue.filter((item) => item.id !== id);
  await writeQueue(nextQueue);
  return nextQueue;
}

export async function replaceQueuedReading(id: string, patch: Partial<QueuedReading>) {
  const queue = await readQueue();
  const nextQueue = queue.map((item) => (item.id === id ? { ...item, ...patch } : item));
  await writeQueue(nextQueue);
  return nextQueue;
}

export async function flushQueuedReadings(
  submit: (payload: ReadingSubmission) => Promise<ReadingSubmissionResponse>
) {
  const queue = await readQueue();
  const remaining: QueuedReading[] = [];
  const sent: string[] = [];

  for (const item of queue) {
    try {
      await submit(item.payload);
      sent.push(item.id);
    } catch (error) {
      remaining.push({
        ...item,
        lastError: error instanceof Error ? error.message : 'Queued submission failed',
      });
    }
  }

  await writeQueue(remaining);

  return {
    sent,
    remaining,
  };
}
