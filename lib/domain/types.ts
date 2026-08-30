export type CoordinateSystem = 'gcj02' | 'wgs84' | 'bd09';

export type LocationStatus = 'verified' | 'pending';

export type RecommendationStatus = 'normal' | 'avoid';

export type ExperienceState = 'wishlist' | 'footprint';

export type PlanStatus = 'pending' | 'accepted' | 'declined';

export type ImportPreviewStatus = 'extracted' | 'partial' | 'link_only';

export type ExperienceCategory =
  | 'Food & Drink'
  | 'Museum & Exhibition'
  | 'Shop & Market'
  | 'Entertainment'
  | 'Outdoor & Nature'
  | 'Other';

export type LatLngTuple = [number, number];
