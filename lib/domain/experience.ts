import type {
  CoordinateSystem,
  ExperienceCategory,
  ExperienceState,
  LatLngTuple,
  LocationStatus,
  RecommendationStatus,
} from './types.ts';

export const EXPERIENCE_CATEGORIES = [
  'Food & Drink',
  'Museum & Exhibition',
  'Shop & Market',
  'Entertainment',
  'Outdoor & Nature',
  'Other',
] as const satisfies readonly ExperienceCategory[];

export type ExperienceSummary = {
  id: string;
  title: string;
  category: ExperienceCategory;
  tags: readonly string[];
  address: string;
  coordinates?: LatLngTuple;
  coordinateSystem?: CoordinateSystem;
  locationStatus: LocationStatus;
  recommendationStatus: RecommendationStatus;
  state: ExperienceState;
};

export type ExperienceView = 'all' | 'wishlist' | 'footprints';

export type ExperienceFilters = {
  view: ExperienceView;
  category: ExperienceCategory | 'all';
  tag?: string;
  query?: string;
};

export const filterExperiences = (
  experiences: readonly ExperienceSummary[],
  filters: ExperienceFilters,
): ExperienceSummary[] => {
  const query = filters.query?.trim().toLocaleLowerCase() ?? '';

  return experiences.filter((experience) => {
    const matchesView = filters.view === 'all'
      || (filters.view === 'wishlist' && experience.state === 'wishlist')
      || (filters.view === 'footprints' && experience.state === 'footprint');
    const matchesCategory = filters.category === 'all' || experience.category === filters.category;
    const matchesTag = !filters.tag || experience.tags.includes(filters.tag);
    const searchableText = [experience.title, experience.address, ...experience.tags]
      .join('\n')
      .toLocaleLowerCase();
    const matchesSearch = !query || searchableText.includes(query);

    return matchesView && matchesCategory && matchesTag && matchesSearch;
  });
};
