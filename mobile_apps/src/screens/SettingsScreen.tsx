import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { clearMobileSession, getMobileConfig, saveMobileConfig } from '../lib/mobileConfig';

export function SettingsScreen({ onClose, onSignOut }: { onClose: () => void; onSignOut: () => void }) {
  const config = getMobileConfig();
  const [apiBaseUrl, setApiBaseUrl] = useState(config.apiBaseUrl);
  const [apiToken, setApiToken] = useState(config.apiToken);
  const [status, setStatus] = useState('Save your API connection settings.');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setApiBaseUrl(config.apiBaseUrl);
    setApiToken(config.apiToken);
  }, [config.apiBaseUrl, config.apiToken]);

  async function handleSave() {
    setIsSaving(true);
    setStatus('Saving settings...');

    try {
      await saveMobileConfig({ apiBaseUrl, apiToken });
      setStatus('Settings saved. The next sync uses these values.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save settings');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSignOut() {
    setIsSaving(true);
    setStatus('Signing out...');

    try {
      await clearMobileSession();
      setStatus('Signed out.');
      onSignOut();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign out');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Connection settings</Text>
        <Text style={styles.subtitle}>Point the app at your backend and store a bearer token for protected endpoints.</Text>

        <Text style={styles.sessionHint}>If you are signing in for the first time, use the sign-in screen to create your mobile session.</Text>

        <Field label="API base URL" value={apiBaseUrl} onChangeText={setApiBaseUrl} autoCapitalize="none" autoCorrect={false} />
        <Field label="Bearer token" value={apiToken} onChangeText={setApiToken} autoCapitalize="none" autoCorrect={false} secureTextEntry />

        <View style={styles.actionsRow}>
          <Pressable onPress={onClose} style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Close</Text>
          </Pressable>
          <Pressable onPress={() => void handleSave()} style={[styles.button, styles.primaryButton]} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#08111f" /> : <Text style={styles.primaryButtonText}>Save</Text>}
          </Pressable>
        </View>

        <Pressable onPress={() => void handleSignOut()} style={[styles.button, styles.dangerButton]} disabled={isSaving}>
          <Text style={styles.dangerButtonText}>Sign out</Text>
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
  sessionHint: {
    color: '#dce6ff',
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
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
  dangerButton: {
    backgroundColor: 'rgba(255,99,132,0.2)',
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
  dangerButtonText: {
    color: '#ffd7df',
    fontWeight: '900',
  },
  status: {
    color: '#dce6ff',
    fontSize: 13,
    lineHeight: 18,
  },
});
