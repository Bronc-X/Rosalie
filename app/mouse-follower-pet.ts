export type Point = Readonly<{ x: number; y: number }>;
export type Size = Readonly<{ width: number; height: number }>;
export type PetDockInsets = Readonly<{
  horizontal: number;
  top: number;
  bottom: number;
}>;

export type PointerVector = Readonly<{
  x: number;
  y: number;
  proximity: number;
}>;

export type PetFrame = 'idle' | 'blink' | 'glance' | 'wave';
export type PetDockSide = 'left' | 'right';
export type PetOutfitPreset = 'classic' | 'date' | 'weekend' | 'field';
export type PetPose = 'stand' | 'profile' | 'crouch' | 'sit';
export type PetOutfit = { preset: PetOutfitPreset; color: string };
export type PetMemberId = 'toni' | 'rosalie';
export type PetVisibility = Record<PetMemberId, boolean>;
export type PetDockSettings = {
  side: PetDockSide;
  collapsed: boolean;
  position: Point | null;
  poses: { toni: PetPose; rosalie: PetPose };
  outfits: { toni: PetOutfit; rosalie: PetOutfit };
};

export const PET_OUTFIT_CUSTOMIZATION_ENABLED = false;

export function defaultPetVisibility(currentMemberId: PetMemberId): PetVisibility {
  return currentMemberId === 'toni'
    ? { toni: false, rosalie: true }
    : { toni: true, rosalie: false };
}

export function petVisibilityAfterCharacterClick(visibility: PetVisibility): PetVisibility {
  if (visibility.toni !== visibility.rosalie) return { toni: true, rosalie: true };
  return { ...visibility };
}

export function petVisibilityAfterToggle(
  visibility: PetVisibility,
  memberId: PetMemberId,
): PetVisibility {
  return { ...visibility, [memberId]: !visibility[memberId] };
}

export const DEFAULT_PET_DOCK_SETTINGS: PetDockSettings = {
  side: 'right',
  collapsed: false,
  position: null,
  poses: { toni: 'stand', rosalie: 'stand' },
  outfits: {
    toni: { preset: 'classic', color: '#b53b2f' },
    rosalie: { preset: 'classic', color: '#b53b2f' },
  },
};

const OUTFIT_PRESETS = new Set<PetOutfitPreset>(['classic', 'date', 'weekend', 'field']);
const PET_POSES = new Set<PetPose>(['stand', 'profile', 'crouch', 'sit']);

const PET_FRAME_DURATIONS: Readonly<Record<PetFrame, number>> = {
  idle: 0,
  blink: 170,
  glance: 900,
  wave: 920,
};

export function normalizePointerVector(
  pointer: Point,
  origin: Point,
  maxDistance: number,
): PointerVector {
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    return { x: 0, y: 0, proximity: 0 };
  }

  const deltaX = pointer.x - origin.x;
  const deltaY = pointer.y - origin.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance === 0) return { x: 0, y: 0, proximity: 0 };

  const scale = Math.min(1, maxDistance / distance) / maxDistance;

  return {
    x: deltaX * scale,
    y: deltaY * scale,
    proximity: Math.min(1, distance / maxDistance),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  const safeValue = Number.isFinite(value) ? value : minimum;
  return Math.min(maximum, Math.max(minimum, safeValue));
}

export function clampPetDockPosition(
  position: Point,
  dockSize: Size,
  viewportSize: Size,
  insets: PetDockInsets,
): Point {
  const minimumX = insets.horizontal;
  const minimumY = insets.top;
  const maximumX = Math.max(minimumX, viewportSize.width - dockSize.width - insets.horizontal);
  const maximumY = Math.max(minimumY, viewportSize.height - dockSize.height - insets.bottom);

  return {
    x: clamp(position.x, minimumX, maximumX),
    y: clamp(position.y, minimumY, maximumY),
  };
}

export function snapPetDockToSide(
  position: Point,
  dockSize: Size,
  viewportSize: Size,
  insets: PetDockInsets,
): Readonly<{ side: PetDockSide; position: Point }> {
  const safePosition = clampPetDockPosition(position, dockSize, viewportSize, insets);
  const side: PetDockSide = safePosition.x + dockSize.width / 2 <= viewportSize.width / 2 ? 'left' : 'right';
  const edgeX = side === 'left'
    ? insets.horizontal
    : Math.max(insets.horizontal, viewportSize.width - dockSize.width - insets.horizontal);

  return { side, position: { x: edgeX, y: safePosition.y } };
}

export function shouldAnimatePetPair({
  width,
  coarsePointer,
  reducedMotion,
}: Readonly<{
  width: number;
  coarsePointer: boolean;
  reducedMotion: boolean;
}>): boolean {
  return width > 800 && !coarsePointer && !reducedMotion;
}

export function selectAmbientPetFrame(randomValue: number): Extract<PetFrame, 'blink' | 'glance'> {
  return Math.min(1, Math.max(0, randomValue)) < 0.8 ? 'blink' : 'glance';
}

export function petFrameDuration(frame: PetFrame): number {
  return PET_FRAME_DURATIONS[frame];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOutfit(value: unknown, fallback: PetOutfit): PetOutfit {
  if (!isRecord(value)) return { ...fallback };

  const preset = typeof value.preset === 'string' && OUTFIT_PRESETS.has(value.preset as PetOutfitPreset)
    ? value.preset as PetOutfitPreset
    : fallback.preset;
  const color = typeof value.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color)
    ? value.color.toLowerCase()
    : fallback.color;

  return { preset, color };
}

function normalizePosition(value: unknown): Point | null {
  if (!isRecord(value)) return null;
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
  if ((value.x as number) < 0 || (value.y as number) < 0) return null;
  return { x: value.x as number, y: value.y as number };
}

export function parsePetDockSettings(raw: string | null): PetDockSettings {
  let value: unknown;

  try {
    value = raw ? JSON.parse(raw) : null;
  } catch {
    value = null;
  }

  if (!isRecord(value)) {
    return {
      ...DEFAULT_PET_DOCK_SETTINGS,
      poses: { ...DEFAULT_PET_DOCK_SETTINGS.poses },
      outfits: {
        toni: { ...DEFAULT_PET_DOCK_SETTINGS.outfits.toni },
        rosalie: { ...DEFAULT_PET_DOCK_SETTINGS.outfits.rosalie },
      },
    };
  }

  const outfits = isRecord(value.outfits) ? value.outfits : {};
  const poses = isRecord(value.poses) ? value.poses : {};
  const normalizePose = (pose: unknown, fallback: PetPose): PetPose => (
    typeof pose === 'string' && PET_POSES.has(pose as PetPose) ? pose as PetPose : fallback
  );

  return {
    side: value.side === 'left' || value.side === 'right' ? value.side : DEFAULT_PET_DOCK_SETTINGS.side,
    collapsed: typeof value.collapsed === 'boolean' ? value.collapsed : DEFAULT_PET_DOCK_SETTINGS.collapsed,
    position: normalizePosition(value.position),
    poses: {
      toni: normalizePose(poses.toni, DEFAULT_PET_DOCK_SETTINGS.poses.toni),
      rosalie: normalizePose(poses.rosalie, DEFAULT_PET_DOCK_SETTINGS.poses.rosalie),
    },
    outfits: {
      toni: normalizeOutfit(outfits.toni, DEFAULT_PET_DOCK_SETTINGS.outfits.toni),
      rosalie: normalizeOutfit(outfits.rosalie, DEFAULT_PET_DOCK_SETTINGS.outfits.rosalie),
    },
  };
}
