import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { fetchHealth, fetchVersion } from './src/lib/backend';
import { sampleReadings } from './src/lib/readings';
import { InfoCard } from './src/components/InfoCard';
import { MetricTile } from './src/components/MetricTile';
import { StatusBadge } from './src/components/StatusBadge';
import { ReadingFormScreen } from './src/screens/ReadingFormScreen';
import { flushQueuedReadings, loadQueuedReadings } from './src/lib/offlineQueue';
import { submitReading } from './src/lib/backend';
import { getMobileConfig, loadMobileConfig } from './src/lib/mobileConfig';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SignInScreen } from './src/screens/SignInScreen';

type ConnectionState = 'loading' | 'online' | 'offline';
type ActiveScreen = 'dashboard' | 'readings' | 'sync' | 'settings';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

function AppShell() {
  const insets = useSafeAreaInsets();
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [serviceVersion, setServiceVersion] = useState('unknown');
  const [serviceStatus, setServiceStatus] = useState('checking');
  const [sessionReady, setSessionReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');
  const [readingFormVisible, setReadingFormVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [lastQueueResult, setLastQueueResult] = useState('No offline queue activity yet');
  const [apiBaseUrl, setApiBaseUrl] = useState(getMobileConfig().apiBaseUrl);

  const summary = useMemo(
    () => ({
      activePatients: 128,
      alertsToday: 4,
      syncQueue: 2,
    }),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function refreshQueue() {
      const queue = await loadQueuedReadings();
      if (mounted) {
        setQueuedCount(queue.length);
      }
    }

    void refreshQueue();

    return () => {
      mounted = false;
    };
  }, [readingFormVisible]);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      const config = await loadMobileConfig();
      if (mounted) {
        setApiBaseUrl(config.apiBaseUrl);
        setIsSignedIn(Boolean(config.apiToken));
        setSessionReady(true);
      }
    }

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    let mounted = true;

    async function checkBackend() {
      try {
        const [health, version] = await Promise.all([fetchHealth(), fetchVersion()]);
        if (!mounted) {
          return;
        }

        setConnectionState('online');
        setServiceStatus(health.status);
        setServiceVersion(version.version);
      } catch {
        if (!mounted) {
          return;
        }

        setConnectionState('offline');
        setServiceStatus('unreachable');
      }
    }

    void checkBackend();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleFlushQueue() {
    const result = await flushQueuedReadings(submitReading);
    setQueuedCount(result.remaining.length);
    setLastQueueResult(
      result.sent.length > 0
        ? `Sent ${result.sent.length} queued reading${result.sent.length === 1 ? '' : 's'}`
        : 'No queued readings were sent'
    );
  }

  const connectionTone =
    connectionState === 'online'
      ? 'success'
      : connectionState === 'offline'
        ? 'danger'
        : 'warning';

  return (
    <LinearGradient colors={['#08111f', '#0d1a31', '#13284a']} style={styles.background}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}> 
        <StatusBar style="light" />
        {!sessionReady ? null : !isSignedIn ? (
          <SignInScreen
            onSignedIn={() => {
              setIsSignedIn(true);
            }}
          />
        ) : null}
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}> 
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.kicker}>Dmonitor Mobile</Text>
              <Text style={styles.title}>Glucose care that stays in sync</Text>
            </View>
            <StatusBadge
              label={connectionState === 'loading' ? 'Checking backend' : connectionState === 'online' ? 'Backend online' : 'Backend offline'}
              tone={connectionTone}
            />
          </View>
          <View style={styles.headerActionsRow}>
            <Pressable style={styles.headerActionButton} onPress={() => setSettingsVisible(true)}>
              <Text style={styles.headerActionText}>Settings</Text>
            </Pressable>
          </View>

          {activeScreen === 'dashboard' ? (
            <DashboardSection
              summary={summary}
              apiBaseUrl={apiBaseUrl}
              serviceStatus={serviceStatus}
              serviceVersion={serviceVersion}
              queuedCount={queuedCount}
              onAddReading={() => setReadingFormVisible(true)}
            />
          ) : null}

          {activeScreen === 'readings' ? (
            <ReadingsSection readings={sampleReadings} onAddReading={() => setReadingFormVisible(true)} />
          ) : null}

          {activeScreen === 'sync' ? (
            <SyncSection
              queuedCount={queuedCount}
              lastQueueResult={lastQueueResult}
              onRetryQueued={() => void handleFlushQueue()}
            />
          ) : null}

          {activeScreen === 'settings' ? (
            <SettingsSection
              apiBaseUrl={apiBaseUrl}
              onOpenSettings={() => setSettingsVisible(true)}
              onOpenTokenSettings={() => setSettingsVisible(true)}
            />
          ) : null}
        </ScrollView>
        <View style={[styles.tabBar, { paddingBottom: insets.bottom + 12 }]}>
          {[
            ['dashboard', 'Overview'],
            ['readings', 'Readings'],
            ['sync', 'Sync'],
            ['settings', 'Settings'],
          ].map(([screen, label]) => {
            const selected = activeScreen === screen;
            return (
              <Pressable
                key={screen}
                style={[styles.tabButton, selected && styles.tabButtonActive]}
                onPress={() => setActiveScreen(screen as ActiveScreen)}
              >
                <Text style={[styles.tabButtonText, selected && styles.tabButtonTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {readingFormVisible ? (
          <ReadingFormScreen onClose={() => setReadingFormVisible(false)} />
        ) : null}
        {settingsVisible ? (
          <SettingsScreen
            onClose={() => {
              setApiBaseUrl(getMobileConfig().apiBaseUrl);
              setSettingsVisible(false);
            }}
            onSignOut={() => {
              setApiBaseUrl(getMobileConfig().apiBaseUrl);
              setIsSignedIn(false);
              setSettingsVisible(false);
              setReadingFormVisible(false);
              setActiveScreen('dashboard');
            }}
          />
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

function DashboardSection({
  summary,
  apiBaseUrl,
  serviceStatus,
  serviceVersion,
  queuedCount,
  onAddReading,
}: {
  summary: { activePatients: number; alertsToday: number; syncQueue: number };
  apiBaseUrl: string;
  serviceStatus: string;
  serviceVersion: string;
  queuedCount: number;
  onAddReading: () => void;
}) {
  return (
    <>
      <InfoCard title="Today&apos;s overview">
        <Text style={styles.heroValue}>6.4 mmol/L</Text>
        <Text style={styles.heroMeta}>Latest reading • Device synced 12 min ago</Text>
        <Text style={styles.metaLine}>API base: {apiBaseUrl}</Text>
        <Text style={styles.metaLine}>Service status: {serviceStatus}</Text>
        <Text style={styles.metaLine}>Service version: {serviceVersion}</Text>
        <View style={styles.heroStatsRow}>
          <MetricTile label="Patients" value={String(summary.activePatients)} />
          <MetricTile label="Alerts" value={String(summary.alertsToday)} />
          <MetricTile label="Queue" value={String(queuedCount || summary.syncQueue)} />
        </View>
      </InfoCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.shortcutsGrid}>
          {['Add reading', 'Sync offline data', 'View alerts', 'Patient history'].map((shortcut) => (
            <Pressable
              key={shortcut}
              style={styles.shortcutCard}
              onPress={() => {
                if (shortcut === 'Add reading') {
                  onAddReading();
                }
              }}
            >
              <Text style={styles.shortcutText}>{shortcut}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <InfoCard title="Sync status">
        <Text style={styles.syncText}>Ready to upload reading batches, patient history, and alerts to the backend service.</Text>
        <Text style={styles.syncText}>Offline queue: {queuedCount} reading{queuedCount === 1 ? '' : 's'}</Text>
        <View style={styles.syncDotsRow}>
          <View style={[styles.syncDot, styles.syncDotActive]} />
          <View style={styles.syncDot} />
          <View style={styles.syncDot} />
        </View>
      </InfoCard>
    </>
  );
}

function ReadingsSection({
  readings,
  onAddReading,
}: {
  readings: typeof sampleReadings;
  onAddReading: () => void;
}) {
  return (
    <>
      <InfoCard title="Reading intake">
        <Text style={styles.syncText}>Capture new glucose readings and keep them in sync with the backend.</Text>
        <Pressable style={styles.flushButton} onPress={onAddReading}>
          <Text style={styles.flushButtonText}>Add new reading</Text>
        </Pressable>
      </InfoCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent readings</Text>
        {readings.map((reading) => (
          <View key={reading.label} style={styles.readingCard}>
            <View>
              <Text style={styles.readingLabel}>{reading.label}</Text>
              <Text style={styles.readingState}>{reading.state}</Text>
            </View>
            <Text style={styles.readingValue}>
              {reading.value} <Text style={styles.readingUnit}>{reading.unit}</Text>
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function SyncSection({
  queuedCount,
  lastQueueResult,
  onRetryQueued,
}: {
  queuedCount: number;
  lastQueueResult: string;
  onRetryQueued: () => void;
}) {
  return (
    <InfoCard title="Sync status">
      <Text style={styles.syncText}>Offline queue: {queuedCount} reading{queuedCount === 1 ? '' : 's'}</Text>
      <Text style={styles.syncText}>{lastQueueResult}</Text>
      <Text style={styles.syncText}>Use retry to flush any queued uploads to the backend service.</Text>
      <View style={styles.syncDotsRow}>
        <View style={[styles.syncDot, styles.syncDotActive]} />
        <View style={styles.syncDot} />
        <View style={styles.syncDot} />
      </View>
      <Pressable style={styles.flushButton} onPress={onRetryQueued}>
        <Text style={styles.flushButtonText}>Retry queued readings</Text>
      </Pressable>
    </InfoCard>
  );
}

function SettingsSection({
  apiBaseUrl,
  onOpenSettings,
  onOpenTokenSettings,
}: {
  apiBaseUrl: string;
  onOpenSettings: () => void;
  onOpenTokenSettings: () => void;
}) {
  return (
    <InfoCard title="App settings">
      <Text style={styles.syncText}>Current API base URL: {apiBaseUrl}</Text>
      <Text style={styles.syncText}>Store the bearer token and backend URL from the full settings screen.</Text>
      <Pressable style={styles.flushButton} onPress={onOpenSettings}>
        <Text style={styles.flushButtonText}>Open connection settings</Text>
      </Pressable>
      <Pressable style={styles.secondaryFlushButton} onPress={onOpenTokenSettings}>
        <Text style={styles.secondaryFlushButtonText}>Edit bearer token</Text>
      </Pressable>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(8, 17, 31, 0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabButtonActive: {
    backgroundColor: '#8fb6ff',
  },
  tabButtonText: {
    color: '#d5def1',
    fontWeight: '800',
    fontSize: 12,
  },
  tabButtonTextActive: {
    color: '#08111f',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerActionsRow: {
    alignItems: 'flex-end',
  },
  headerActionButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerActionText: {
    color: '#edf2ff',
    fontWeight: '800',
    fontSize: 12,
  },
  kicker: {
    color: '#8fb6ff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#f4f7ff',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    marginTop: 8,
    maxWidth: 260,
  },
  heroValue: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '900',
    marginTop: 2,
  },
  heroMeta: {
    color: '#b9c7e8',
    marginTop: 8,
    fontSize: 14,
  },
  metaLine: {
    color: '#d5def1',
    marginTop: 8,
    fontSize: 13,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#f4f7ff',
    fontSize: 18,
    fontWeight: '800',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcutCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  shortcutText: {
    color: '#edf2ff',
    fontSize: 15,
    fontWeight: '700',
  },
  readingCard: {
    backgroundColor: '#0f1b30',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 10,
  },
  readingLabel: {
    color: '#f4f7ff',
    fontSize: 16,
    fontWeight: '700',
  },
  readingState: {
    color: '#91a4cf',
    marginTop: 4,
    fontSize: 13,
  },
  readingValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  readingUnit: {
    color: '#8fb6ff',
    fontSize: 13,
    fontWeight: '700',
  },
  syncText: {
    color: '#d5def1',
    fontSize: 14,
    lineHeight: 20,
  },
  syncDotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  syncDotActive: {
    backgroundColor: '#8fb6ff',
  },
  flushButton: {
    marginTop: 16,
    backgroundColor: '#8fb6ff',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  flushButtonText: {
    color: '#08111f',
    fontWeight: '900',
  },
  secondaryFlushButton: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryFlushButtonText: {
    color: '#edf2ff',
    fontWeight: '900',
  },
});
