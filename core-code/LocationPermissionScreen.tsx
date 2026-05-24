import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '@/hooks/useLocation';
import { useAuthStore } from '@/stores/authStore';

export function LocationPermissionScreen() {
  const navigation = useNavigation<any>();
  const { requestPermission } = useLocation();
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const setOnboardingStep = useAuthStore((s) => s.setOnboardingStep);

  const completeOnboarding = () => {
    setOnboardingStep(3);
    setOnboarded(true);
    navigation.replace('App');
  };

  const handleGrant = async () => {
    const granted = await requestPermission();
    if (granted) {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  return (
    <View style={styles.container}>
      <View style={styles.illustration} />
      <Text style={styles.title}>我们需要你的位置</Text>
      <Text style={styles.desc}>
        DeadDrop 只在本地计算你与纸条的距离。{'\n'}
        你的精确坐标不会上传到任何服务器日志。
      </Text>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <View style={styles.featureDot} />
          <Text style={styles.featureText}>找到你附近的纸条</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureDot} />
          <Text style={styles.featureText}>验证你在纸条的 50 米范围内</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureDot} />
          <Text style={styles.featureText}>在地图上显示热力图</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.grantBtn} onPress={handleGrant} activeOpacity={0.9}>
        <Text style={styles.grantText}>允许定位</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>稍后设置</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  illustration: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1e293b',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
  },
  desc: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  features: {
    alignSelf: 'stretch',
    gap: 14,
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  featureText: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  grantBtn: {
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  grantText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    color: '#64748b',
    fontSize: 14,
  },
});
