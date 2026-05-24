import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getLifespanProgress } from '@/utils/time';

interface LifespanProgressProps {
  createdAt: string;
  expiresAt: string;
  lifespanType: string;
}

export function LifespanProgress({ createdAt, expiresAt, lifespanType }: LifespanProgressProps) {
  if (lifespanType === 'permanent') {
    return (
      <View style={styles.container}>
        <View style={[styles.bar, { backgroundColor: '#10b98120' }]}>
          <View style={[styles.fill, { width: '100%', backgroundColor: '#10b981' }]} />
        </View>
        <Text style={[styles.label, { color: '#10b981' }]}>永久留存</Text>
      </View>
    );
  }

  const progress = getLifespanProgress(createdAt, expiresAt);
  const remaining = Math.max(0, 1 - progress);

  let barColor = '#3b82f6';
  if (remaining < 0.1) barColor = '#ef4444';
  else if (remaining < 0.3) barColor = '#f59e0b';

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${remaining * 100}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.label, { color: barColor }]}>
        剩余 {Math.round(remaining * 100)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  bar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
