import { StyleSheet, Text, View } from 'react-native';

export function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  value: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  label: {
    color: '#b9c7e8',
    fontSize: 12,
    marginTop: 4,
  },
});
