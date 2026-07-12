import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#101d35',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(143,182,255,0.16)',
    gap: 10,
  },
  title: {
    color: '#f4f7ff',
    fontSize: 17,
    fontWeight: '800',
  },
});
