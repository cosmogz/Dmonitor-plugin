import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { fetchHealth, fetchVersion, fetchDashboardMetrics, fetchLatestReading } from './src/lib/backend';
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

interface DashboardMetrics {
  activePatients: number;
  alertsToday: number;
  syncQueue: number;
}

interface LatestReadingData {
  value: number;
  unit: string;
  timestamp: string;
  timeSinceSync: string;
}

const RETRY_INTERVAL = 30000; // 30 seconds
const MAX_RETRIES = 3;

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

function AppShell() {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  
  // Session & Auth State
  const [sessionReady, setSessionReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Connection State
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [serviceVersion, setServiceVersion] = useState('unknown');
  const [serviceStatus, setServiceStatus] = useState('checking');
  const [lastBackendCheck, setLastBackendCheck] = useState<number>(0);
  const [backendRetryCount, setBackendRetryCount] = useState(0);

  // UI State
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');
  const [readingFormVisible, setReadingFormVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Data State
  const [queuedCount, setQueuedCount] = useState(0);
  const [lastQueueResult, setLastQueueResult] = useState('No offline queue activity yet');
  const [summary, setSummary] = useState<DashboardMetrics>({
    activePatients: 0,
    alertsToday: 0,
    syncQueue: 0,
  });
  const [latestReading, setLatestReading] = useState<LatestReadingData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [readings, setReadings] = useState(sampleReadings);

  // Initialize session and load config
  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      try {
        const config = await loadMobileConfig();
        if (!mounted) return;

        setApiBaseUrl(config.apiBaseUrl);
        const hasToken = Boolean(config.apiToken);
        setIsSignedIn(hasToken);
        
        if (!hasToken) {
          setSessionError(null);
        }
        
        setSessionReady(true);
      } catch (error) {
        if (mounted) {
          setSessionError(
            error instanceof Error ? error.message : 'Failed to initialize session'
          );
          setSessionReady(true);
        }
      }
    }

    initializeSession();
    return () => {
      mounted = false;
    };
  }, []); // Run only once on mount

  // Fetch dashboard metrics
  useEffect(() => {
    if (!isSignedIn || !sessionReady) return;

    let mounted = true;

    async function fetchMetrics() {
      try {
        setDashboardLoading(true);
        const [metricsData, readingData] = await Promise.all([
          fetchDashboardMetrics(),
          fetchLatestReading(),
        ]);

        if (!mounted) return;

        setSummary({
          activePatients: metricsData.activePatients,
          alertsToday: metricsData.alertsToday,
          syncQueue: queuedCount,
        });

        if (readingData) {
          setLatestReading(readingData);
        }

        setDashboardLoading(false);
      } catch (error) {
        if (mounted) {
          console.warn('Failed to fetch dashboard metrics:', error);
          setDashboardLoading(false);
        }
      }
    }

    fetchMetrics();
  }, [isSignedIn, sessionReady, queuedCount]);

  // Check backend health with retry logic
  useEffect(() => {
    if (!isSignedIn || !sessionReady) return;

    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function checkBackend() {
      try {
        const [health, version] = await Promise.all([fetchHealth(), fetchVersion()]);
        if (!mounted) return;

        setConnectionState('online');
        setServiceStatus(health.status);
        setServiceVersion(version.version);
        setBackendRetryCount(0);
        setLastBackendCheck(Date.now());
      } catch (error) {
        if (!mounted) return;

        setConnectionState('offline');
        setServiceStatus('unreachable');

        // Retry with exponential backoff
        if (backendRetryCount < MAX_RETRIES) {
          const delay = RETRY_INTERVAL * Math.pow(1.5, backendRetryCount);
          timeoutId = setTimeout(() => {
            setBackendRetryCount((prev) => prev + 1);
          }, delay);
        }
      }
    }

    checkBackend();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSignedIn, sessionReady, backendRetryCount]);

  // Refresh queue count
  useEffect(() => {
    if (!isSignedIn || !sessionReady) return;

    let mounted = true;

    async function refreshQueue() {
      try {
        const queue = await loadQueuedReadings();
        if (mounted) {
          setQueuedCount(queue.length);
        }
      } catch (error) {
        console.warn('Failed to load queue:', error);
      }
    }

    refreshQueue();
    return () => {
      mounted = false;
    };
  }, [isSignedIn, sessionReady, readingFormVisible]);

  const handleFlushQueue = useCallback(async () => {
    try {
      const result = await flushQueuedReadings(submitReading);
      setQueuedCount(result.remaining.length);
      setLastQueueResult(
        result.sent.length > 0
          ? `Sent ${result.sent.length} queued reading${result.sent.length === 1 ? '' : 's'}`
          : 'No queued readings were sent'
      );
    } catch (error) {
      setLastQueueResult(
        `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      );
    }
  }, []);

  const handleSignOut = useCallback(() => {
    setIsSignedIn(false);
    setSettingsVisible(false);
    setReadingFormVisible(false);
    setActiveScreen('dashboard');
    setSummary({ activePatients: 0, alertsToday: 0, syncQueue: 0 });
    setLatestReading(null);
  }, []);

  const handleSettingsClose = useCallback(async () => {
    try {
      const config = await loadMobileConfig();
      setApiBaseUrl(config.apiBaseUrl);
      setSettingsVisible(false);
    } catch (error) {
      console.warn('Failed to reload config:', error);
      setSettingsVisible(false);
    }
  }, []);

  const connectionTone =
    connectionState === 'online'
      ? 'success'
      : connectionState === 'offline'
        ? 'danger'
        : 'warning';

  // Show sign-in as full-screen modal
  if (sessionReady && !isSignedIn) {
    return (
      <LinearGradient colors={['#08111f', '#0d1a31', '#13284a']} style={styles.background}>
        <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
          <StatusBar style="light" />
          <SignInScreen
            onSignedIn={() => {
              setIsSignedIn(true);
            }}
          />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Show loading or error state
  if (!sessionReady) {
    return (
      <LinearGradient colors={['#08111f', '#0d1a31', '#13284a']} style={styles.background}>
        <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
          <StatusBar style="light" />
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#8fb6ff" />
            <Text style={styles.loadingText}>Initializing app...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (sessionError) {
    return (
      <LinearGradient colors={['#08111f', '#0d1a31', '#13284a']} style={styles.background}>
        <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
          <StatusBar style="light" />
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Error initializing session</Text>
            <Text style={styles.errorDescription}>{sessionError}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#08111f', '#0d1a31', '#13284a']} style={styles.background}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}>
          <View style={styles.headerRow}>
            <View style={screenWidth < 360 ? { maxWidth: 200 } : undefined}>
              <Text style={styles.kicker}>Dmonitor Mobile</Text>
              <Text style={[styles.title, screenWidth < 360 && { fontSize: 24 }]}>
                Glucose care that stays in sync
              </Text>
            </View>
            <StatusBadge
              label={
                connectionState === 'loading'
                  ? 'Checking backend'
                  : connectionState === 'online'
                    ? 'Backend online'
                    : 'Backend offline'
              }
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
              latestReading={latestReading}
              loading={dashboardLoading}
              onAddReading={() => setReadingFormVisible(true)}
            />
          ) : null}

          {activeScreen === 'readings' ? (
            <ReadingsSection readings={readings} onAddReading={() => setReadingFormVisible(true)} />
          ) : null}

          {activeScreen === 'sync' ? (
            <SyncSection
              queuedCount={queuedCount}
              lastQueueResult={lastQueueResult}
              connectionState={connectionState}
              onRetryQueued={handleFlushQueue}
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
                <Text
                  style={[styles.tabButtonText, selected && styles.tabButtonTextActive]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {readingFormVisible ? (
          <ReadingFormScreen onClose={() => setReadingFormVisible(false)} />
        ) : null}
        {settingsVisible ? (
          <SettingsScreen
            onClose={handleSettingsClose}
            onSignOut={handleSignOut}
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
  latestReading,
  loading,
  onAddReading,
}: {
  summary: DashboardMetrics;
  apiBaseUrl: string;
  serviceStatus: string;
  serviceVersion: string;
  queuedCount: number;
  latestReading: LatestReadingData | null;
  loading: boolean;
  onAddReading: () => void;
}) {
  return (
    <>
      <InfoCard title="Today's overview">
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#8fb6ff" />
            <Text style={styles.loadingSmallText}>Loading latest reading...</Text>
          </View>
        ) : latestReading ? (
          <>
            <Text style={styles.heroValue}>
              {latestReading.value} <Text style={styles.heroUnit}>{latestReading.unit}</Text>
            </Text>
            <Text style={styles.heroMeta}>Latest reading • {latestReading.timeSinceSync}</Text>
          </>
        ) : (
          <Text style={styles.heroMeta}>No recent readings available</Text>
        )}
        <Text style={styles.metaLine}>API base: {apiBaseUrl}</Text>
        <Text style={styles.metaLine}>Service status: {serviceStatus}</Text>
        <Text style={styles.metaLine}>Service version: {serviceVersion}</Text>
        <View style={styles.heroStatsRow}>
          <MetricTile label="Patients" value={String(summary.activePatients)} />
          <MetricTile label="Alerts" value={String(summary.alertsToday)} />
          <MetricTile label="Queue" value={String(queuedCount)} />
        </View>
      </InfoCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.shortcutsGrid}>
          <Pressable style={styles.shortcutCard} onPress={onAddReading}>
            <Text style={styles.shortcutText}>Add reading</Text>
          </Pressable>
          <Pressable style={styles.shortcutCard} onPress={() => {}} disabled>
            <Text style={styles.shortcutText}>View alerts</Text>
          </Pressable>
          <Pressable style={styles.shortcutCard} onPress={() => {}} disabled>
            <Text style={styles.shortcutText}>Patient history</Text>
          </Pressable>
          <Pressable style={styles.shortcutCard} onPress={() => {}} disabled>
            <Text style={styles.shortcutText}>Sync status</Text>
          </Pressable>
        </View>
      </View>

      <InfoCard title="Sync status">
        <Text style={styles.syncText}>
          Ready to upload reading batches, patient history, and alerts to the backend service.
        </Text>
        <Text style={styles.syncText}>
          Offline queue: {queuedCount} reading{queuedCount === 1 ? '' : 's'}
        </Text>
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
        <Text style={styles.syncText}>
          Capture new glucose readings and keep them in sync with the backend.
        </Text>
        <Pressable style={styles.flushButton} onPress={onAddReading}>
          <Text style={styles.flushButtonText}>Add new reading</Text>
        </Pressable>
      </InfoCard>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent readings</Text>
        {readings.length > 0 ? (
          readings.map((reading) => (
            <View key={reading.label} style={styles.readingCard}>
              <View>
                <Text style={styles.readingLabel}>{reading.label}</Text>
                <Text style={styles.readingState}>{reading.state}</Text>
              </View>
              <Text style={styles.readingValue}>
                {reading.value} <Text style={styles.readingUnit}>{reading.unit}</Text>
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No readings available</Text>
        )}
      </View>
    </>
  );
}

function SyncSection({
  queuedCount,
  lastQueueResult,
  connectionState,
  onRetryQueued,
}: {
  queuedCount: number;
  lastQueueResult: string;
  connectionState: ConnectionState;
  onRetryQueued: () => void;
}) {
  return (
    <InfoCard title="Sync status">
      <Text style={styles.syncText}>
        Offline queue: {queuedCount} reading{queuedCount === 1 ? '' : 's'}
      </Text>
      <Text style={styles.syncText}>{lastQueueResult}</Text>
      <Text style={styles.syncText}>
        {connectionState === 'offline'
          ? '⚠️ Backend is offline. Readings will sync when connection is restored.'
          : 'Use retry to flush any queued uploads to the backend service.'}
      </Text>
      <View style={styles.syncDotsRow}>
        <View style={[styles.syncDot, styles.syncDotActive]} />
        <View style={styles.syncDot} />
        <View style={styles.syncDot} />
      </View>
      <Pressable
        style={[styles.flushButton, connectionState === 'offline' && styles.buttonDisabled]}
        onPress={onRetryQueued}
        disabled={connectionState === 'offline'}
      >
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
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  loadingText: {
    color: '#b9c7e8',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSmallText: {
    color: '#b9c7e8',
    fontSize: 12,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorDescription: {
    color: '#d5def1',
    fontSize: 14,
    textAlign: 'center',
  },
  noDataText: {
    color: '#91a4cf',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 16,
    textAlign: 'center',
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
    flexShrink: 1,
  },
  heroValue: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '900',
    marginTop: 2,
  },
  heroUnit: {
    color: '#8fb6ff',
    fontSize: 28,
    fontWeight: '700',
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
    flexWrap: 'wrap',
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
    justifyContent: 'space-between',
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
  buttonDisabled: {
    opacity: 0.5,
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
