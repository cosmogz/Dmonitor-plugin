import { StyleSheet, Text, View } from 'react-native';

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <View style={[styles.badge, toneStyles[tone]]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    color: '#f4f7ff',
    fontSize: 12,
    fontWeight: '800',
  },
});

const toneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  success: {
    backgroundColor: 'rgba(76, 201, 145, 0.22)',
  },
  warning: {
    backgroundColor: 'rgba(255, 193, 7, 0.24)',
  },
  danger: {
    backgroundColor: 'rgba(255, 99, 132, 0.24)',
  },
});
