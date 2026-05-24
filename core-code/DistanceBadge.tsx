import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getDistanceState, getDistanceLabel, formatDistance } from '@/utils/distance';
import type { DistanceState } from '@/types';

interface DistanceBadgeProps {
  distance: number;
}

const STATE_COLORS: Record<DistanceState, string> = {
  far: '#94a3b8',
  approach: '#f59e0b',
  near: '#3b82f6',
  unlocked: '#10b981',
  reading: '#8b5cf6',
};

export function DistanceBadge({ distance }: DistanceBadgeProps) {
  const state = getDistanceState(distance);
  const color = STATE_COLORS[state];
  const label = state === 'unlocked' ? '已解锁' : formatDistance(distance);

  return (
    <View style={[styles.badge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
