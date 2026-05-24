import type { DistanceState } from '@/types';

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getDistanceState(distance: number): DistanceState {
  if (distance <= 10) return 'unlocked';
  if (distance <= 50) return 'near';
  if (distance <= 200) return 'approach';
  return 'far';
}

export function getDistanceLabel(state: DistanceState, distance: number): string {
  switch (state) {
    case 'unlocked':
      return '已解锁';
    case 'near':
      return `已经很近了！再走 ${Math.round(distance)} 米`;
    case 'approach':
      return `还需走近 ${Math.round(distance)} 米`;
    case 'far':
      return `前方 ${Math.round(distance)} 米有纸条`;
    case 'reading':
      return '阅读中...';
    default:
      return '';
  }
}

export function formatDistance(meters: number): string {
  if (meters < 10) return '近处';
  if (meters < 1000) return `${Math.round(meters)} 米`;
  return `${(meters / 1000).toFixed(1)} 公里`;
}
