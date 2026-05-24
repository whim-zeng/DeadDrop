import { useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '@/stores/locationStore';

export function useLocation() {
  const { currentLocation, isTracking, permissionStatus, setLocation, setTracking, setPermissionStatus } =
    useLocationStore();
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const requestPermission = useCallback(async () => {
    setPermissionStatus('pending');
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
    return status === 'granted';
  }, [setPermissionStatus]);

  const startTracking = useCallback(async () => {
    if (isTracking) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    setTracking(true);

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      (location) => {
        setLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 10,
          timestamp: location.timestamp,
        });
      }
    );
  }, [isTracking, requestPermission, setTracking, setLocation]);

  const stopTracking = useCallback(() => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    setTracking(false);
  }, [setTracking]);

  const getCurrentPosition = useCallback(async () => {
    const hasPermission = permissionStatus === 'granted' || (await requestPermission());
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    const data = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 10,
      timestamp: location.timestamp,
    };
    setLocation(data);
    return data;
  }, [permissionStatus, requestPermission, setLocation]);

  useEffect(() => {
    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
      }
    };
  }, []);

  return {
    currentLocation,
    isTracking,
    permissionStatus,
    requestPermission,
    startTracking,
    stopTracking,
    getCurrentPosition,
  };
}
