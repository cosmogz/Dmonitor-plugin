export function rollingAverage(values: number[], windowSize = 3): number[] {
  if (windowSize <= 0) return [];
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = values.slice(start, i + 1);
    const sum = slice.reduce((s, v) => s + v, 0);
    result.push(sum / slice.length);
  }
  return result;
}

export type Alert = { type: 'low' | 'high'; value: number; threshold: number } | null;

export function detectThreshold(value: number, thresholds: { low?: number; high?: number }): Alert {
  if (thresholds.low !== undefined && value < thresholds.low) {
    return { type: 'low', value, threshold: thresholds.low };
  }
  if (thresholds.high !== undefined && value > thresholds.high) {
    return { type: 'high', value, threshold: thresholds.high };
  }
  return null;
}
