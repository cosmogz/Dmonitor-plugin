import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { buildReadingSubmission } from '../lib/readingApi';
import { submitReading } from '../lib/backend';
import { enqueueReading } from '../lib/offlineQueue';

const unitOptions = ['mmol/L', 'mg/dL'] as const;

export function ReadingFormScreen({ onClose }: { onClose: () => void }) {
  const [patientId, setPatientId] = useState('patient-001');
  const [glucoseValue, setGlucoseValue] = useState('6.4');
  const [units, setUnits] = useState<(typeof unitOptions)[number]>('mmol/L');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Ready to submit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);
    setStatus('Submitting reading...');

    try {
      const payload = buildReadingSubmission({
        patientId,
        glucoseValue,
        units,
        notes,
      });
      try {
        const response = await submitReading(payload);
        setStatus(`${response.message} (${response.created ? 'created' : 'deduplicated'})`);
      } catch (error) {
        await enqueueReading(payload, error instanceof Error ? error.message : 'Submission failed');
        setStatus('Offline queue saved locally. Reading will be retried later.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add reading</Text>
        <Text style={styles.subtitle}>Send a glucose reading to the Dmonitor backend.</Text>

        <Field label="Patient ID" value={patientId} onChangeText={setPatientId} />
        <Field label="Glucose value" value={glucoseValue} onChangeText={setGlucoseValue} keyboardType="decimal-pad" />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />

        <View style={styles.section}>
          <Text style={styles.label}>Units</Text>
          <View style={styles.row}>
            {unitOptions.map((option) => {
              const active = option === units;
              return (
                <Pressable
                  key={option}
                  onPress={() => setUnits(option)}
                  style={[styles.unitButton, active && styles.unitButtonActive]}
                >
                  <Text style={styles.unitButtonText}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable onPress={onClose} style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={() => void handleSubmit()} style={[styles.button, styles.primaryButton]} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#08111f" /> : <Text style={styles.primaryButtonText}>Submit</Text>}
          </Pressable>
        </View>

        <Text style={styles.status}>{status}</Text>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.textArea]}
        placeholderTextColor="#7286b3"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 10, 20, 0.96)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#0f1b30',
    borderRadius: 28,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(143,182,255,0.18)',
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#b9c7e8',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 8,
  },
  label: {
    color: '#dce6ff',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  unitButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  unitButtonActive: {
    backgroundColor: '#8fb6ff',
  },
  unitButtonText: {
    color: '#08111f',
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#8fb6ff',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  primaryButtonText: {
    color: '#08111f',
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  status: {
    color: '#dce6ff',
    fontSize: 13,
    lineHeight: 18,
  },
});
