import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MOOD_CONFIG, type MoodTag } from '@/types';

interface MoodSelectorProps {
  selected?: MoodTag;
  onSelect: (mood: MoodTag) => void;
}

export function MoodSelector({ selected, onSelect }: MoodSelectorProps) {
  const moods = Object.entries(MOOD_CONFIG) as [MoodTag, { label: string; color: string }][];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {moods.map(([key, config]) => {
        const isSelected = selected === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onSelect(key)}
            activeOpacity={0.8}
            style={[
              styles.moodItem,
              isSelected && { backgroundColor: config.color + '20', borderColor: config.color },
            ]}
          >
            <View
              style={[
                styles.moodDot,
                { backgroundColor: config.color },
                isSelected && styles.moodDotActive,
              ]}
            />
            <Text
              style={[
                styles.moodLabel,
                isSelected && { color: config.color, fontWeight: '700' },
              ]}
            >
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
  },
  moodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginRight: 8,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  moodDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moodLabel: {
    fontSize: 13,
    color: '#475569',
  },
});
