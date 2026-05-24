import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNoteStore } from '@/stores/noteStore';
import type { MoodTag, NoteType } from '@/types';
import { MOOD_CONFIG } from '@/types';

const NOTE_TYPES: { key: NoteType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'text', label: '文字' },
  { key: 'voice', label: '语音' },
];

const SORT_OPTIONS: { key: 'recent' | 'distance' | 'reads' | 'replies'; label: string }[] = [
  { key: 'recent', label: '最新' },
  { key: 'distance', label: '最近' },
  { key: 'reads', label: '最热' },
  { key: 'replies', label: '最多回复' },
];

export function NoteFilterScreen() {
  const navigation = useNavigation();
  const filters = useNoteStore((s) => s.filters);
  const setFilters = useNoteStore((s) => s.setFilters);

  const toggleMood = (mood: MoodTag) => {
    setFilters({
      ...filters,
      filterMood: filters.filterMood === mood ? undefined : mood,
    });
  };

  const selectType = (type: NoteType | 'all') => {
    setFilters({
      ...filters,
      filterType: type === 'all' ? undefined : type,
    });
  };

  const selectSort = (sort: 'recent' | 'distance' | 'reads' | 'replies') => {
    setFilters({
      ...filters,
      sortBy: sort,
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>筛选</Text>
        <TouchableOpacity onPress={clearFilters}>
          <Text style={styles.clearText}>重置</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Type Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>类型</Text>
          <View style={styles.chipRow}>
            {NOTE_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.chip,
                  (filters.filterType || 'all') === t.key && styles.chipActive,
                ]}
                onPress={() => selectType(t.key)}
              >
                <Text
                  style={[
                    styles.chipText,
                    (filters.filterType || 'all') === t.key && styles.chipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mood Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>情绪</Text>
          <View style={styles.chipRow}>
            {(Object.keys(MOOD_CONFIG) as MoodTag[]).map((mood) => (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.chip,
                  filters.filterMood === mood && { borderColor: MOOD_CONFIG[mood].color },
                ]}
                onPress={() => toggleMood(mood)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.filterMood === mood && { color: MOOD_CONFIG[mood].color },
                  ]}
                >
                  {MOOD_CONFIG[mood].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sort */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>排序</Text>
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.chip,
                  filters.sortBy === s.key && styles.chipActive,
                ]}
                onPress={() => selectSort(s.key)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.sortBy === s.key && styles.chipTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.confirmBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.9}
      >
        <Text style={styles.confirmText}>应用筛选</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  title: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '600',
  },
  clearText: {
    color: '#3b82f6',
    fontSize: 15,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#334155',
    borderColor: '#3b82f6',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#f8fafc',
    marginHorizontal: 20,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  confirmText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
});
