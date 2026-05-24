import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { generateAnonymousCode, getGradientColors } from '@/utils/identity';
import { GRADIENT_PRESETS } from '@/types';
import { supabase } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

export function AnonymousIdentityScreen() {
  const navigation = useNavigation<any>();
  const [code, setCode] = useState(generateAnonymousCode());
  const [nickname, setNickname] = useState('');
  const [gradient, setGradient] = useState('blue');
  const [isLoading, setIsLoading] = useState(false);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  const refreshCode = () => setCode(generateAnonymousCode());

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const { data: authData } = await supabase.auth.signInAnonymously();
      if (!authData.user) return;

      const { data, error } = await supabase.from('profiles').insert({
        id: authData.user.id,
        fingerprint_hash: `fp_${Date.now()}`,
        anonymous_code: code,
        nickname: nickname || null,
        avatar_gradient: gradient,
      }).select().single();

      if (error) throw error;

      setProfile({
        id: data.id,
        anonymousCode: data.anonymous_code,
        nickname: data.nickname,
        avatarGradient: data.avatar_gradient,
        createdAt: data.created_at,
      });
      setOnboardingStep(2);
      navigation.replace('LocationPermission');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>创建你的匿名身份</Text>
      <Text style={styles.subtitle}>这只是你在 DeadDrop 的代号，随时可以更改</Text>

      <View style={styles.codeSection}>
        <View style={styles.codeCard}>
          <Text style={styles.codeText}>{code}</Text>
        </View>
        <TouchableOpacity onPress={refreshCode} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>换一个</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>自定义昵称（可选）</Text>
        <TextInput
          style={styles.input}
          placeholder="给自己起个名字"
          placeholderTextColor="#94a3b8"
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
        />
      </View>

      <View style={styles.gradientSection}>
        <Text style={styles.label}>头像颜色</Text>
        <View style={styles.gradientRow}>
          {GRADIENT_PRESETS.map((preset) => {
            const colors = preset.colors;
            const isSelected = gradient === preset.name;
            return (
              <TouchableOpacity
                key={preset.name}
                onPress={() => setGradient(preset.name)}
                style={[
                  styles.gradientCircle,
                  { backgroundColor: colors[0] },
                  isSelected && styles.gradientSelected,
                ]}
              />
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.confirmBtn, isLoading && styles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={isLoading}
        activeOpacity={0.9}
      >
        <Text style={styles.confirmText}>{isLoading ? '创建中...' : '继续'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 32,
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  codeCard: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
  },
  refreshBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  refreshText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gradientSection: {
    marginBottom: 40,
  },
  gradientRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  gradientCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  gradientSelected: {
    borderWidth: 3,
    borderColor: '#f8fafc',
  },
  confirmBtn: {
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 'auto',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
});
