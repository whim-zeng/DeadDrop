import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { formatDuration } from '@/utils/time';

interface VoicePlayerProps {
  uri: string;
  duration?: number;
}

export function VoicePlayer({ uri, duration: initialDuration }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadAndPlay = async () => {
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;

      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setDuration(Math.floor(status.durationMillis / 1000));
      }

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPosition(Math.floor(status.positionMillis / 1000));
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
          }
        }
      });
    } else {
      await soundRef.current.playAsync();
    }
    setIsPlaying(true);
  };

  const pause = async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
    }
    setIsPlaying(false);
  };

  const toggle = () => {
    if (isPlaying) {
      pause();
    } else {
      loadAndPlay();
    }
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={styles.playButton}>
        <Text style={styles.playIcon}>{isPlaying ? '||' : '▶'}</Text>
      </TouchableOpacity>
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View style={[styles.barProgress, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatDuration(position)}</Text>
          <Text style={styles.timeText}>{formatDuration(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  barContainer: {
    flex: 1,
  },
  barBackground: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barProgress: {
    height: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
});
