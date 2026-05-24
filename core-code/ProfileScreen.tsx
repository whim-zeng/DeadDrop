import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import { getGradientColors } from '@/utils/identity';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const gradientColors = getGradientColors(profile?.avatarGradient || 'blue');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: gradientColors[0] }]}>
          <Text style={styles.avatarText}>
            {(profile?.anonymousCode || '?')[0]}
          </Text>
        </View>
        <Text style={styles.codeText}>{profile?.anonymousCode || '匿名用户'}</Text>
        {profile?.nickname && (
          <Text style={styles.nicknameText}>{profile.nickname}</Text>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>我放的纸条</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>48</Text>
          <Text style={styles.statLabel}>我读的纸条</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>156</Text>
          <Text style={styles.statLabel}>收到的回复</Text>
        </View>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.8}>
          <Text style={styles.menuText}>我的纸条</Text>
          <Text style={styles.menuArrow}>&gt;</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.8}>
          <Text style={styles.menuText}>阅读历史</Text>
          <Text style={styles.menuArrow}>&gt;</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.8}>
          <Text style={styles.menuText}>通知设置</Text>
          <Text style={styles.menuArrow}>&gt;</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemDanger]}
          onPress={signOut}
          activeOpacity={0.8}
        >
          <Text style={styles.menuTextDanger}>退出登录</Text>
        </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  codeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
  },
  nicknameText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  menuSection: {
    marginHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuText: {
    fontSize: 15,
    color: '#f8fafc',
  },
  menuArrow: {
    fontSize: 15,
    color: '#64748b',
  },
  menuItemDanger: {
    marginTop: 16,
    justifyContent: 'center',
  },
  menuTextDanger: {
    fontSize: 15,
    color: '#ef4444',
    textAlign: 'center',
  },
});
