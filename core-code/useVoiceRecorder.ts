import { useState, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setIsRecording(true);
    setDuration(0);
    setUri(null);

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    setUri(uri);
    setIsRecording(false);
    recordingRef.current = null;
    return uri;
  }, []);

  const reset = useCallback(() => {
    setUri(null);
    setDuration(0);
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    duration,
    uri,
    startRecording,
    stopRecording,
    reset,
  };
}
