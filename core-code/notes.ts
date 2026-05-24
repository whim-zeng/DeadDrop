import { api } from './client';
import type { Note, NearbyResponse, HeatmapGrid, CreateNotePayload, FilterParams } from '@/types';

export async function fetchNearbyNotes(
  lat: number,
  lng: number,
  accuracy: number = 10,
  filters?: FilterParams
): Promise<NearbyResponse> {
  return api.post('/notes-nearby', {
    lat,
    lng,
    user_accuracy: accuracy,
    filter_type: filters?.filterType,
    filter_mood: filters?.filterMood,
    filter_topic: filters?.filterTopic,
    filter_time: filters?.filterTime,
    filter_lifespan: filters?.filterLifespan,
    sort_by: filters?.sortBy,
  });
}

export async function fetchHeatmap(
  north: number,
  south: number,
  east: number,
  west: number,
  zoom: number,
  timeRange?: string,
  filterMood?: string
): Promise<{ grids: HeatmapGrid[]; total_grids: number; grid_size: number }> {
  return api.post('/notes-heatmap', {
    north,
    south,
    east,
    west,
    zoom,
    time_range: timeRange,
    filter_mood: filterMood,
  });
}

export async function readNote(
  noteId: string,
  readerLat: number,
  readerLng: number,
  readerAccuracy: number = 10
): Promise<{ note: Note; replies: any[]; isFirstRead: boolean; distance: number; unlocked: boolean; message?: string }> {
  return api.post(`/notes-read/${noteId}`, {
    readerLat,
    readerLng,
    readerAccuracy,
  });
}

export async function createNote(payload: CreateNotePayload): Promise<Note> {
  return api.post('/notes-create', payload);
}
