import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatRelativeTime } from '@/utils/time';
import type { Reply } from '@/types';

interface ReplyThreadProps {
  replies: Reply[];
  depth?: number;
}

function ReplyItem({ reply, depth = 0 }: { reply: Reply; depth?: number }) {
  const indent = depth * 16;
  const borderColor = depth === 0 ? '#cbd5e1' : '#e2e8f0';

  return (
    <View style={[styles.replyContainer, { marginLeft: indent }]}>
      <View style={[styles.leftBar, { backgroundColor: borderColor }]} />
      <View style={styles.replyContent}>
        <View style={styles.replyHeader}>
          <Text style={styles.authorText}>
            {reply.author?.nickname || reply.author?.anonymous_code || '匿名'}
          </Text>
          <Text style={styles.timeText}>{formatRelativeTime(reply.createdAt)}</Text>
        </View>
        <Text style={styles.replyBody}>{reply.content}</Text>
        {reply.voiceUrl && (
          <Text style={styles.voiceHint}>[语音消息]</Text>
        )}
      </View>
      {reply.children && reply.children.length > 0 && (
        <View style={styles.childrenContainer}>
          {reply.children.map((child) => (
            <ReplyItem key={child.id} reply={child} depth={depth + 1} />
          ))}
        </View>
      )}
    </View>
  );
}

export function ReplyThread({ replies }: ReplyThreadProps) {
  return (
    <View style={styles.container}>
      {replies.map((reply) => (
        <ReplyItem key={reply.id} reply={reply} depth={0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  replyContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  leftBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 10,
    minHeight: 40,
  },
  replyContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  authorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  replyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1e293b',
  },
  voiceHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  childrenContainer: {
    marginTop: 8,
  },
});
