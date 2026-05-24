import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Circle, Marker, Region } from 'react-native-maps';
import { useLocation } from '@/hooks/useLocation';
import { useNearbyNotes } from '@/hooks/useNearbyNotes';
import { useNoteStore } from '@/stores/noteStore';
import { useNavigation } from '@react-navigation/native';
import type { Note } from '@/types';

const PAPER_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f3f1eb' }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b2aba0' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#f3f1eb' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#d9d4ca' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#efece5' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#dfd9ce' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#d4cdc0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#cbc4b8' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#ece9e2' }],
  },
];

export function ExploreMapScreen() {
  const navigation = useNavigation<any>();
  const { currentLocation, startTracking } = useLocation();
  const { data: nearbyData, isLoading } = useNearbyNotes();
  const setNearbyNotes = useNoteStore((s) => s.setNearbyNotes);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);

  useEffect(() => {
    startTracking();
  }, [startTracking]);

  useEffect(() => {
    if (currentLocation && !initialRegion) {
      setInitialRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [currentLocation, initialRegion]);

  useEffect(() => {
    if (nearbyData) {
      setNearbyNotes(nearbyData);
    }
  }, [nearbyData, setNearbyNotes]);

  const handleMarkerPress = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id });
  };

  const allNotes = [
    ...(nearbyData?.unlocked || []),
    ...(nearbyData?.preview || []),
  ];

  const locationText = useMemo(() => {
    if (!currentLocation) {
      return '实时定位 · 获取中';
    }
    return `实时定位 · ${currentLocation.latitude.toFixed(4)},${currentLocation.longitude.toFixed(4)}`;
  }, [currentLocation]);

  return (
    <View style={styles.container}>
      {initialRegion ? (
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          customMapStyle={PAPER_MAP_STYLE}
          showsUserLocation={false}
          showsMyLocationButton
          showsCompass={false}
          toolbarEnabled={false}
        >
          {allNotes.map((note) => (
            <Marker
              key={note.id}
              coordinate={{ latitude: note.lat, longitude: note.lng }}
              onPress={() => handleMarkerPress(note)}
            >
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.markerDot,
                    note.distance <= 50
                      ? styles.markerUnlocked
                      : styles.markerLocked,
                  ]}
                />
              </View>
            </Marker>
          ))}

          {currentLocation && (
            <>
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                radius={120}
                strokeColor="rgba(212, 128, 97, 0.28)"
                fillColor="rgba(212, 128, 97, 0.08)"
                strokeWidth={1}
              />
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                radius={55}
                strokeColor="rgba(212, 128, 97, 0.45)"
                fillColor="rgba(212, 128, 97, 0.02)"
                strokeWidth={1}
              />
              <Marker
                coordinate={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                tracksViewChanges={false}
              >
                <View style={styles.currentMarker}>
                  <View style={styles.currentMarkerDot} />
                </View>
              </Marker>
            </>
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d48061" />
          <Text style={styles.loadingText}>正在定位...</Text>
        </View>
      )}

      {/* Top overlay */}
      <View style={styles.topOverlay}>
        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>附近纸条</Text>
          <Text style={styles.titleSub}>{isLoading ? '加载中...' : `已加载 ${nearbyData?.summary.total || 0} 条`}</Text>
        </View>
        <View style={styles.topActions}>
          <View style={styles.locationChip}>
            <View style={styles.locationDot} />
            <Text style={styles.locationChipText}>{locationText}</Text>
          </View>
          <TouchableOpacity style={styles.listFloatBtn} onPress={() => navigation.navigate('NearbyList')}>
            <Text style={styles.listFloatText}>列表</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom sheet */}
      <View style={styles.bottomSheet}>
        <TouchableOpacity
          style={styles.listBtn}
          onPress={() => navigation.navigate('NearbyList')}
        >
          <Text style={styles.listBtnText}>查看附近列表</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f1eb',
  },
  loadingText: {
    color: '#80786a',
    marginTop: 12,
    fontSize: 14,
  },
  topOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    alignItems: 'flex-start',
    gap: 10,
  },
  titleBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  titleText: {
    color: '#1e1b16',
    fontSize: 18,
    fontWeight: '700',
  },
  titleSub: {
    color: '#7d7568',
    fontSize: 12,
    marginTop: 3,
  },
  topActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d9d4ca',
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '80%',
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#8da172',
  },
  locationChipText: {
    color: '#5f594e',
    fontSize: 13,
    fontWeight: '500',
  },
  listFloatBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ded9cf',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  listFloatText: {
    color: '#676154',
    fontSize: 15,
    fontWeight: '500',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#fffaf4',
  },
  markerUnlocked: {
    backgroundColor: '#cd7856',
  },
  markerLocked: {
    backgroundColor: '#b8aea1',
  },
  currentMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e3ddd1',
  },
  currentMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d48061',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    right: 16,
  },
  listBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: '#ddd8ce',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  listBtnText: {
    color: '#5f594e',
    fontSize: 14,
    fontWeight: '600',
  },
});
