import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNearbyNotes } from '@/hooks/useNearbyNotes';
import { NoteCard } from '@/components/NoteCard';
import { useNoteStore } from '@/stores/noteStore';

export function NearbyListScreen() {
  const navigation = useNavigation<any>();
  const { data, isLoading, refresh } = useNearbyNotes();
  const nearbyNotes = useNoteStore((s) => s.nearbyNotes);

  const allNotes = [
    ...(data?.unlocked || []),
    ...(data?.preview || []),
  ];

  const handlePressNote = (noteId: string) => {
    navigation.navigate('NoteDetail', { noteId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>附近纸条</Text>
        <Text style={styles.subtitle}>
          {nearbyNotes?.summary.unlockedCount || 0} 张已解锁 / {nearbyNotes?.summary.total || 0} 张总数
        </Text>
      </View>

      <FlatList
        data={allNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() => handlePressNote(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>附近还没有纸条</Text>
            <Text style={styles.emptySub}>去放一个吧</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  empty: {
    alignItems: 'center',
    marginTop: 120,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  emptySub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
});
