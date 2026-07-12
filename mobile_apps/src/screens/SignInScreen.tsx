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
import { saveMobileConfig } from '../lib/mobileConfig';

export function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [apiBaseUrl, setApiBaseUrl] = useState(process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:3000');
  const [apiToken, setApiToken] = useState(process.env.EXPO_PUBLIC_API_TOKEN?.trim() || '');
  const [status, setStatus] = useState('Enter the backend URL and bearer token to continue.');
  const [isSaving, setIsSaving] = useState(false);

  async function handleContinue() {
    setIsSaving(true);
    setStatus('Saving session...');

    try {
      await saveMobileConfig({ apiBaseUrl, apiToken });
      setStatus('Session saved.');
      onSignedIn();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save session');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Dmonitor sign-in</Text>
        <Text style={styles.subtitle}>Use the backend URL and bearer token issued for your clinic or test environment.</Text>

        <Field label="API base URL" value={apiBaseUrl} onChangeText={setApiBaseUrl} autoCapitalize="none" autoCorrect={false} />
        <Field label="Bearer token" value={apiToken} onChangeText={setApiToken} autoCapitalize="none" autoCorrect={false} secureTextEntry />

        <Pressable onPress={() => void handleContinue()} style={[styles.button, styles.primaryButton]} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#08111f" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
        </Pressable>

        <Text style={styles.status}>{status}</Text>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        placeholderTextColor="#7286b3"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 10, 20, 0.98)',
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
    fontSize: 28,
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
  button: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#8fb6ff',
  },
  primaryButtonText: {
    color: '#08111f',
    fontWeight: '900',
  },
  status: {
    color: '#dce6ff',
    fontSize: 13,
    lineHeight: 18,
  },
});
