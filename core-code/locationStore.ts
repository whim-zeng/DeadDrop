import { create } from 'zustand';
import type { LocationData } from '@/types';

interface LocationState {
  currentLocation: LocationData | null;
  isTracking: boolean;
  permissionStatus: 'granted' | 'denied' | 'pending' | null;
  setLocation: (location: LocationData) => void;
  setTracking: (tracking: boolean) => void;
  setPermissionStatus: (status: LocationState['permissionStatus']) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  isTracking: false,
  permissionStatus: null,
  setLocation: (location) => set({ currentLocation: location }),
  setTracking: (tracking) => set({ isTracking: tracking }),
  setPermissionStatus: (status) => set({ permissionStatus: status }),
}));
