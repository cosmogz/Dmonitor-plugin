export type ReadingSummary = {
  label: string;
  value: number;
  unit: string;
  state: string;
};

export const sampleReadings: ReadingSummary[] = [
  { label: 'Morning', value: 5.8, unit: 'mmol/L', state: 'In range' },
  { label: 'Lunch', value: 7.2, unit: 'mmol/L', state: 'Watch trend' },
  { label: 'Night', value: 6.4, unit: 'mmol/L', state: 'In range' },
];
