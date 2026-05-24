import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

const MOCK_MESSAGES: Message[] = [
  { id: '1', sender: '孤独的美食家_2847', text: '你好，我也在那个地方看到了你的纸条', timestamp: '14:30', isMe: false },
  { id: '2', sender: 'me', text: '真的吗？你是什么时候去的', timestamp: '14:32', isMe: true },
  { id: '3', sender: '孤独的美食家_2847', text: '昨天晚上，那边的夜景确实不错', timestamp: '14:33', isMe: false },
];

export function ChatRoomScreen() {
  const route = useRoute<any>();
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'me',
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.isMe && styles.messageRowMe]}>
      <View style={[styles.bubble, item.isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={[styles.messageText, item.isMe && styles.messageTextMe]}>{item.text}</Text>
        <Text style={[styles.timeText, item.isMe && styles.timeTextMe]}>{item.timestamp}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        inverted={false}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="发送消息..."
          placeholderTextColor="#64748b"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.8}>
          <Text style={styles.sendText}>发送</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  listContent: {
    padding: 16,
    paddingTop: 60,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#f8fafc',
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#fff',
  },
  timeText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: '#93c5fd',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
