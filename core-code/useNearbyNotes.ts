import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNearbyNotes } from '@/api/notes';
import { useLocationStore } from '@/stores/locationStore';
import { useNoteStore } from '@/stores/noteStore';

export function useNearbyNotes() {
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const filters = useNoteStore((s) => s.filters);
  const queryClient = useQueryClient();

  const lat = currentLocation?.latitude;
  const lng = currentLocation?.longitude;
  const accuracy = currentLocation?.accuracy;

  const query = useQuery({
    queryKey: ['nearby-notes', lat, lng, accuracy, filters],
    queryFn: async () => {
      if (lat == null || lng == null) throw new Error('Location not available');
      return fetchNearbyNotes(lat, lng, accuracy, filters);
    },
    enabled: lat != null && lng != null,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['nearby-notes'] });
  };

  return { ...query, refresh };
}
