import { rollingAverage, detectThreshold } from '../modules/analytics/analytics.engine';

describe('analytics engine', () => {
  test('rolling average computes correct values', () => {
    const values = [5, 7, 9, 11];
    const avgs = rollingAverage(values, 2);
    expect(avgs).toEqual([5, 6, 8, 10]);
  });

  test('detectThreshold returns null when within range', () => {
    expect(detectThreshold(5, { low: 3, high: 10 })).toBeNull();
  });

  test('detectThreshold detects low and high', () => {
    expect(detectThreshold(2, { low: 3 })).toEqual({ type: 'low', value: 2, threshold: 3 });
    expect(detectThreshold(12, { high: 10 })).toEqual({ type: 'high', value: 12, threshold: 10 });
  });
});
