import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { readNote } from '@/api/notes';
import { useLocation } from '@/hooks/useLocation';
import { DistanceBadge } from '@/components/DistanceBadge';
import { VoicePlayer } from '@/components/VoicePlayer';
import { ReplyThread } from '@/components/ReplyThread';
import { LifespanProgress } from '@/components/LifespanProgress';
import { formatRelativeTime } from '@/utils/time';
import type { Note } from '@/types';

export function NoteDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { currentLocation } = useLocation();
  const noteId = route.params?.noteId;

  const [data, setData] = useState<{ note: Note; replies: any[]; unlocked: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noteId || !currentLocation) return;

    const load = async () => {
      try {
        setLoading(true);
        const result = await readNote(
          noteId,
          currentLocation.latitude,
          currentLocation.longitude,
          currentLocation.accuracy
        );
        if (result.unlocked) {
          setData({ note: result.note, replies: result.replies, unlocked: true });
        } else {
          setError(result.message || '距离太远，无法解锁');
          setData({ note: result.note, replies: [], unlocked: false });
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [noteId, currentLocation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error && !data?.unlocked) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>无法解锁</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const note = data?.note;
  if (!note) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.header}>
          <DistanceBadge distance={note.distance || 0} />
          <Text style={styles.timeText}>{formatRelativeTime(note.createdAt)}</Text>
        </View>

        <Text style={styles.authorText}>
          {note.authorNickname || note.authorCode}
        </Text>

        {note.noteType === 'voice' && note.voiceUrl ? (
          <VoicePlayer uri={note.voiceUrl} duration={note.voiceDuration} />
        ) : (
          <Text style={styles.contentText}>{note.content}</Text>
        )}

        <View style={styles.statsRow}>
          <Text style={styles.statsText}>{note.readCount} 阅读</Text>
          <Text style={styles.statsText}>{note.replyCount} 回复</Text>
        </View>

        <LifespanProgress
          createdAt={note.createdAt}
          expiresAt={note.expiresAt}
          lifespanType={note.lifespanType}
        />
      </View>

      {/* Replies */}
      <View style={styles.repliesSection}>
        <Text style={styles.repliesTitle}>回复</Text>
        {data?.replies && data.replies.length > 0 ? (
          <ReplyThread replies={data.replies} />
        ) : (
          <Text style={styles.noReplies}>还没有回复，来写一条吧</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  authorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#f8fafc',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statsText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  repliesSection: {
    marginTop: 8,
  },
  repliesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16,
  },
  noReplies: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
  },
});
