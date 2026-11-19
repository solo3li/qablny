export type GhostMode = 'public' | 'friends' | 'ghost';

export interface NearbyUser {
  id: string;
  name: string;
  bio: string;
  profileImageUrl: string;
  age: number;
  gender: number;
  isOnline: boolean;
  lastSeen: string;
  distance: number;
  distanceText: string;
  latitude: number;
  longitude: number;
  isFriend: boolean;
  streakDays: number;
  hasRecentSnap: boolean;
  recentSnapPreview?: string | null;
  ghostMode: GhostMode;
}

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}
