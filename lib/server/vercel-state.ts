// @ts-expect-error Node's strip-types test runner requires the explicit TypeScript extension.
import { restaurants } from '../../app/restaurants.ts';

export type VercelMemberId = 'toni' | 'rosalie';

export type VercelPlace = {
  id: string;
  name: string;
  position: number;
  createdAt: string;
};

export type VercelExperience = {
  id: string;
  placeId: string | null;
  name: string;
  category: string;
  tags: string[];
  address: string | null;
  coordinates: { lat: number; lng: number; system: string } | null;
  locationStatus: string;
  locationNote: string | null;
  recommendationStatus: string;
  state: string;
  sourceUrl: string | null;
  sourceKind: string | null;
  openingHours: string | null;
  notes: string | null;
  imageUrl: string | null;
  coverMediaId: string | null;
  createdByMemberId: VercelMemberId | null;
  createdAt: string;
  updatedAt: string;
};

export type VercelFootprint = {
  id: string;
  experienceId: string;
  visitedOn: string;
  rating: number | null;
  comment: string | null;
  memberId: VercelMemberId;
  createdAt: string;
};

export type VercelPlan = {
  id: string;
  experienceId: string;
  scheduledFor: string;
  note: string | null;
  status: 'pending' | 'accepted' | 'declined';
  createdByMemberId: VercelMemberId;
  targetMemberId: VercelMemberId;
  createdAt: string;
  updatedAt: string;
};

export type VercelMedia = {
  id: string;
  ownerType: 'footprint' | 'experience';
  ownerId: string;
  pathname: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  createdAt: string;
};

export type VercelExperienceState = {
  places: Map<string, VercelPlace>;
  experiences: Map<string, VercelExperience>;
  footprints: Map<string, VercelFootprint>;
  plans: Map<string, VercelPlan>;
  media: Map<string, VercelMedia>;
};

type EventBase<TType extends string, TPayload> = {
  version: 1;
  id: string;
  type: TType;
  createdAt: string;
  memberId: VercelMemberId;
  payload: TPayload;
};

export type VercelExperienceEvent =
  | EventBase<'place.created', VercelPlace>
  | EventBase<'experience.created', VercelExperience>
  | EventBase<'experience.updated', { id: string; patch: Partial<VercelExperience>; updatedAt: string }>
  | EventBase<'experience.deleted', { id: string }>
  | EventBase<'footprint.created', Omit<VercelFootprint, 'memberId'> & { memberId?: VercelMemberId }>
  | EventBase<'footprint.deleted', { id: string }>
  | EventBase<'plan.created', VercelPlan>
  | EventBase<'plan.responded', { id: string; status: 'accepted' | 'declined'; updatedAt: string }>
  | EventBase<'media.saved', VercelMedia>
  | EventBase<'media.deleted', { id: string }>;

const SEED_TIME = '2026-08-30T00:00:00.000Z';
const MEMBER_NAMES: Record<VercelMemberId, string> = { toni: 'Toni', rosalie: 'Rosalie' };

export function createVercelSeedState(): VercelExperienceState {
  const places = new Map<string, VercelPlace>([
    ['shantou', { id: 'shantou', name: '汕頭', position: 0, createdAt: SEED_TIME }],
    ['guangzhou', { id: 'guangzhou', name: '廣州', position: 1, createdAt: SEED_TIME }],
    ['shenzhen', { id: 'shenzhen', name: '深圳', position: 2, createdAt: SEED_TIME }],
  ]);
  const experiences = new Map<string, VercelExperience>();
  for (const restaurant of restaurants) {
    experiences.set(restaurant.id, {
      id: restaurant.id,
      placeId: 'shantou',
      name: restaurant.name,
      category: 'food_drink',
      tags: [restaurant.category],
      address: restaurant.address || null,
      coordinates: restaurant.coordinates
        ? { lat: restaurant.coordinates[0], lng: restaurant.coordinates[1], system: restaurant.coordinateSystem }
        : null,
      locationStatus: restaurant.locationStatus,
      locationNote: restaurant.locationNote ?? null,
      recommendationStatus: restaurant.recommendationStatus,
      state: restaurant.state,
      sourceUrl: null,
      sourceKind: null,
      openingHours: null,
      notes: restaurant.tip ?? null,
      imageUrl: restaurant.image ?? null,
      coverMediaId: null,
      createdByMemberId: null,
      createdAt: SEED_TIME,
      updatedAt: SEED_TIME,
    });
  }
  return { places, experiences, footprints: new Map(), plans: new Map(), media: new Map() };
}

function restoreWishlistIfEmpty(state: VercelExperienceState, experienceId: string, updatedAt: string) {
  const experience = state.experiences.get(experienceId);
  if (!experience) return;
  const hasFootprints = [...state.footprints.values()].some((item) => item.experienceId === experienceId);
  experience.state = hasFootprints ? 'footprint' : 'wishlist';
  experience.updatedAt = updatedAt;
}

export function applyVercelEvent(state: VercelExperienceState, event: VercelExperienceEvent): void {
  if (event.type === 'place.created') state.places.set(event.payload.id, structuredClone(event.payload));
  if (event.type === 'experience.created') state.experiences.set(event.payload.id, structuredClone(event.payload));
  if (event.type === 'experience.updated') {
    const current = state.experiences.get(event.payload.id);
    if (current) state.experiences.set(current.id, { ...current, ...structuredClone(event.payload.patch), updatedAt: event.payload.updatedAt });
  }
  if (event.type === 'experience.deleted') {
    state.experiences.delete(event.payload.id);
    for (const [id, footprint] of state.footprints) if (footprint.experienceId === event.payload.id) state.footprints.delete(id);
    for (const [id, plan] of state.plans) if (plan.experienceId === event.payload.id) state.plans.delete(id);
    for (const [id, media] of state.media) if (media.ownerType === 'experience' && media.ownerId === event.payload.id) state.media.delete(id);
  }
  if (event.type === 'footprint.created') {
    const footprint = { ...structuredClone(event.payload), memberId: event.payload.memberId ?? event.memberId };
    state.footprints.set(footprint.id, footprint);
    const experience = state.experiences.get(footprint.experienceId);
    if (experience) {
      experience.state = 'footprint';
      experience.updatedAt = event.createdAt;
    }
  }
  if (event.type === 'footprint.deleted') {
    const footprint = state.footprints.get(event.payload.id);
    if (footprint) {
      state.footprints.delete(event.payload.id);
      restoreWishlistIfEmpty(state, footprint.experienceId, event.createdAt);
    }
    for (const [id, media] of state.media) if (media.ownerType === 'footprint' && media.ownerId === event.payload.id) state.media.delete(id);
  }
  if (event.type === 'plan.created') state.plans.set(event.payload.id, structuredClone(event.payload));
  if (event.type === 'plan.responded') {
    const plan = state.plans.get(event.payload.id);
    if (plan) state.plans.set(plan.id, { ...plan, status: event.payload.status, updatedAt: event.payload.updatedAt });
  }
  if (event.type === 'media.saved') {
    if (event.payload.ownerType === 'experience') {
      for (const [id, media] of state.media) {
        if (media.ownerType === 'experience' && media.ownerId === event.payload.ownerId) state.media.delete(id);
      }
      const experience = state.experiences.get(event.payload.ownerId);
      if (experience) experience.coverMediaId = event.payload.id;
    }
    state.media.set(event.payload.id, structuredClone(event.payload));
  }
  if (event.type === 'media.deleted') {
    const media = state.media.get(event.payload.id);
    if (media?.ownerType === 'experience') {
      const experience = state.experiences.get(media.ownerId);
      if (experience?.coverMediaId === media.id) experience.coverMediaId = null;
    }
    state.media.delete(event.payload.id);
  }
}

export function memberPayload(id: VercelMemberId) {
  return { id, handle: id, name: MEMBER_NAMES[id], avatarUrl: null };
}

export function experiencePayload(state: VercelExperienceState, experience: VercelExperience) {
  const footprints = [...state.footprints.values()].filter((item) => item.experienceId === experience.id);
  const lastVisitedOn = footprints.map((item) => item.visitedOn).sort().at(-1) ?? null;
  return {
    id: experience.id,
    placeId: experience.placeId,
    name: experience.name,
    category: experience.category,
    tags: [...experience.tags],
    address: experience.address,
    coordinates: experience.coordinates ? { ...experience.coordinates } : null,
    locationStatus: experience.locationStatus,
    locationNote: experience.locationNote,
    recommendationStatus: experience.recommendationStatus,
    state: experience.state,
    sourceUrl: experience.sourceUrl,
    openingHours: experience.openingHours,
    notes: experience.notes,
    imageUrl: experience.coverMediaId ? `/api/media/${encodeURIComponent(experience.coverMediaId)}` : experience.imageUrl,
    createdBy: experience.createdByMemberId ? memberPayload(experience.createdByMemberId) : null,
    createdAt: experience.createdAt,
    updatedAt: experience.updatedAt,
    footprintCount: footprints.length,
    lastVisitedOn,
  };
}

export function listVercelExperiences(
  state: VercelExperienceState,
  filters: { state?: string; category?: string; tag?: string; search?: string; placeId?: string } = {},
) {
  const search = filters.search?.toLocaleLowerCase();
  return [...state.experiences.values()]
    .filter((item) => !filters.placeId || item.placeId === filters.placeId)
    .filter((item) => !filters.state || filters.state === 'all' || item.state === filters.state)
    .filter((item) => !filters.category || item.category === filters.category)
    .filter((item) => !filters.tag || item.tags.includes(filters.tag))
    .filter((item) => !search || item.name.toLocaleLowerCase().includes(search) || (item.address ?? '').toLocaleLowerCase().includes(search))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id))
    .map((item) => experiencePayload(state, item));
}

export function footprintPayload(state: VercelExperienceState, footprint: VercelFootprint) {
  const media = [...state.media.values()]
    .filter((item) => item.ownerType === 'footprint' && item.ownerId === footprint.id)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    .map((item) => ({ id: item.id, url: `/api/media/${encodeURIComponent(item.id)}`, mimeType: item.mimeType }));
  return {
    id: footprint.id,
    experienceId: footprint.experienceId,
    visitedOn: footprint.visitedOn,
    rating: footprint.rating,
    comment: footprint.comment,
    member: memberPayload(footprint.memberId),
    media,
  };
}

export function planPayload(plan: VercelPlan) {
  return {
    id: plan.id,
    experienceId: plan.experienceId,
    scheduledFor: plan.scheduledFor,
    note: plan.note,
    status: plan.status,
    createdBy: memberPayload(plan.createdByMemberId),
    targetMember: memberPayload(plan.targetMemberId),
    createdAt: plan.createdAt,
  };
}
