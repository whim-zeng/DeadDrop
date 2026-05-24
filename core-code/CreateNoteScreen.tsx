import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '@/hooks/useLocation';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { createNote } from '@/api/notes';
import { MoodSelector } from '@/components/MoodSelector';
import type { MoodTag, LifespanType } from '@/types';

export function CreateNoteScreen() {
  const navigation = useNavigation();
  const { currentLocation } = useLocation();
  const { isRecording, duration, startRecording, stopRecording, reset } = useVoiceRecorder();

  const [content, setContent] = useState('');
  const [moodTag, setMoodTag] = useState<MoodTag | undefined>();
  const [lifespanType, setLifespanType] = useState<LifespanType>('24h');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('text');

  const handleSubmit = async () => {
    if (!currentLocation) return;
    if (mode === 'text' && !content.trim()) return;

    setIsSubmitting(true);
    try {
      await createNote({
        content: content.trim(),
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        lifespanType,
        moodTag,
      });
      navigation.goBack();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Mode Switch */}
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]}
            onPress={() => setMode('text')}
          >
            <Text style={[styles.modeText, mode === 'text' && styles.modeTextActive]}>文字</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'voice' && styles.modeBtnActive]}
            onPress={() => setMode('voice')}
          >
            <Text style={[styles.modeText, mode === 'voice' && styles.modeTextActive]}>语音</Text>
          </TouchableOpacity>
        </View>

        {/* Content Input */}
        {mode === 'text' ? (
          <TextInput
            style={styles.textInput}
            placeholder="写下你在这里的想法..."
            placeholderTextColor="#64748b"
            multiline
            maxLength={500}
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />
        ) : (
          <View style={styles.voiceSection}>
            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              activeOpacity={0.9}
            >
              <Text style={styles.recordBtnText}>{isRecording ? '松开结束' : '按住录音'}</Text>
            </TouchableOpacity>
            {duration > 0 && (
              <Text style={styles.durationText}>{duration}s / 60s</Text>
            )}
          </View>
        )}

        <Text style={styles.charCount}>{content.length}/500</Text>

        {/* Mood Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>情绪标签</Text>
          <MoodSelector selected={moodTag} onSelect={setMoodTag} />
        </View>

        {/* Lifespan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>生命周期</Text>
          <View style={styles.lifespanRow}>
            {(['24h', '7d', 'permanent'] as LifespanType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.lifespanBtn, lifespanType === type && styles.lifespanBtnActive]}
                onPress={() => setLifespanType(type)}
              >
                <Text
                  style={[
                    styles.lifespanText,
                    lifespanType === type && styles.lifespanTextActive,
                  ]}
                >
                  {type === '24h' ? '24 小时' : type === '7d' ? '7 天' : '永久'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location hint */}
        <View style={styles.locationHint}>
          <Text style={styles.locationText}>
            纸条将放在当前位置，50米内的人才能看到
          </Text>
        </View>
      </ScrollView>

      {/* Submit */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>{isSubmitting ? '发布中...' : '放下纸条'}</Text>
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
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#334155',
  },
  modeText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#f8fafc',
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    minHeight: 160,
    color: '#f8fafc',
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  voiceSection: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  recordBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordBtnActive: {
    backgroundColor: '#b91c1c',
    transform: [{ scale: 0.95 }],
  },
  recordBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  durationText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 14,
  },
  charCount: {
    textAlign: 'right',
    color: '#64748b',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
  },
  lifespanRow: {
    flexDirection: 'row',
    gap: 10,
  },
  lifespanBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  lifespanBtnActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f620',
  },
  lifespanText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  lifespanTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  locationHint: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  locationText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  submitBtn: {
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
});
