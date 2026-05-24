import { create } from 'zustand';
import type { Note, FilterParams, NearbyResponse } from '@/types';

interface NoteState {
  nearbyNotes: NearbyResponse | null;
  currentNote: Note | null;
  filters: FilterParams;
  isLoading: boolean;
  setNearbyNotes: (notes: NearbyResponse | null) => void;
  setCurrentNote: (note: Note | null) => void;
  setFilters: (filters: FilterParams) => void;
  setLoading: (loading: boolean) => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  nearbyNotes: null,
  currentNote: null,
  filters: {},
  isLoading: false,
  setNearbyNotes: (notes) => set({ nearbyNotes: notes }),
  setCurrentNote: (note) => set({ currentNote: note }),
  setFilters: (filters) => set({ filters }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
