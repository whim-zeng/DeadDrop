import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getDistanceState, getDistanceLabel, formatDistance } from '@/utils/distance';
import { formatRelativeTime } from '@/utils/time';
import { MOOD_CONFIG } from '@/types';
import type { Note } from '@/types';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
}

export function NoteCard({ note, onPress }: NoteCardProps) {
  const distanceState = getDistanceState(note.distance);
  const isUnlocked = distanceState === 'unlocked' || distanceState === 'near';
  const mood = note.moodTag ? MOOD_CONFIG[note.moodTag] : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        isUnlocked ? styles.cardUnlocked : styles.cardLocked,
        note.isRead && styles.cardRead,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.metaRow}>
          {mood && (
            <View style={[styles.moodBadge, { backgroundColor: mood.color + '20' }]}>
              <Text style={[styles.moodText, { color: mood.color }]}>{mood.label}</Text>
            </View>
          )}
          <Text style={styles.authorText}>{note.authorNickname || note.authorCode}</Text>
        </View>
        <Text style={styles.distanceText}>{formatDistance(note.distance)}</Text>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {isUnlocked ? (
          <Text style={styles.contentText} numberOfLines={4}>
            {note.content}
          </Text>
        ) : (
          <>
            <View style={styles.blurOverlay} />
            <Text style={styles.previewText} numberOfLines={2}>
              {note.contentPreview}...
            </Text>
            <Text style={styles.hintText}>
              {getDistanceLabel(distanceState, note.distance)}
            </Text>
          </>
        )}
        {note.noteType === 'voice' && (
          <View style={styles.voiceBadge}>
            <Text style={styles.voiceText}>
              {note.voiceDuration ? `${note.voiceDuration}s` : '语音'}
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{formatRelativeTime(note.expiresAt)}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.footerText}>{note.readCount} 阅读</Text>
          <Text style={styles.footerText}>{note.replyCount} 回复</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardUnlocked: {
    borderColor: '#cbd5e1',
  },
  cardLocked: {
    backgroundColor: '#f8fafc',
  },
  cardRead: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  moodText: {
    fontSize: 11,
    fontWeight: '600',
  },
  authorText: {
    fontSize: 12,
    color: '#64748b',
  },
  distanceText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  contentContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1e293b',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.7)',
    borderRadius: 8,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#94a3b8',
  },
  hintText: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 6,
    fontWeight: '500',
  },
  voiceBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  voiceText: {
    fontSize: 12,
    color: '#64748b',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
