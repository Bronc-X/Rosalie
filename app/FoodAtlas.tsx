'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type * as Leaflet from 'leaflet';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toOsmLatLng } from '../lib/domain/coordinates';
import SharedCalendar, { type SharedCalendarEntry } from './calendar/SharedCalendar';
import MouseFollowerPet from './MouseFollowerPet';
import {
  CUSTOM_TAG_VALUE,
  TAG_PRESETS,
  previewHasContent,
  tagSelectionFromTags,
  tagsFromSelection,
  validateExperienceImage,
  type ReadableLinkPreview,
  type TagSelection,
} from './experience-form';
import {
  DEFAULT_EXPERIENCE_PLACES,
  appendExperiencePlace,
  canInitializeExperienceMap,
  canRespondToNotifications,
  dateKeyInTimeZone,
  filterExperiences,
  filterExperiencesByPlace,
  getExperiencePlaceHeroImage,
  isExperienceMarkerActivation,
  resolveCalendarEntryTarget,
  shantouDateTimeToIso,
  shouldScrollMapForCardSelection,
  type ExperiencePlace,
  type ExperienceState,
} from './experience-view-model';

type Member = { id: string; name: string };
type SessionPayload = {
  authenticated: boolean;
  configured: boolean;
  csrfToken?: string;
  member?: Member | null;
  members?: Member[];
};
type CoordinateSystem = 'gcj02' | 'wgs84' | 'bd09';
type ExperienceCategory = 'food_drink' | 'museum_exhibition' | 'shop_market' | 'entertainment' | 'outdoor_nature' | 'other';
type Experience = {
  id: string;
  placeId: string;
  name: string;
  category: ExperienceCategory;
  tags: string[];
  address: string | null;
  coordinates: { lat: number; lng: number; system: CoordinateSystem } | null;
  locationStatus: 'verified' | 'pending';
  locationNote: string | null;
  recommendationStatus: 'normal' | 'avoid';
  state: ExperienceState;
  sourceUrl: string | null;
  openingHours: string | null;
  notes: string | null;
  imageUrl: string | null;
  createdBy: Member | null;
  createdAt: string;
  updatedAt: string;
  footprintCount: number;
  lastVisitedOn: string | null;
  memberIds: string[];
};
type ExperiencePayload = Omit<Experience, 'memberIds'>;
type PlacePayload = { id: string; name: string };
type LinkPreview = ReadableLinkPreview & {
  coordinates?: { lat: number; lng: number; system: CoordinateSystem } | null;
  notes?: string | null;
};
type NotificationItem = {
  id: string;
  type: 'plan';
  createdAt: string;
  plan: {
    id: string;
    experienceId: string;
    scheduledFor: string;
    note?: string | null;
    status: string;
    createdBy?: Member | null;
    targetMember?: Member | null;
    experience?: { name?: string } | null;
  };
};
type ApiCalendarEntry = {
  id: string;
  type: 'plan' | 'footprint';
  date: string;
  experienceId: string;
  experienceName: string;
  memberIds: string[];
  status?: string;
  footprintId?: string;
};
type FootprintRecord = {
  id: string;
  experienceId: string;
  visitedOn: string;
  rating: number | null;
  comment: string | null;
  member: Member;
  media: Array<{ id: string; url: string; mimeType: string }>;
};
type ModalName = 'quick-add' | 'edit' | 'footprint' | 'footprint-history' | 'plan' | 'places' | 'legacy' | null;
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

const memberFallbacks: Member[] = [
  { id: 'toni', name: 'Toni' },
  { id: 'rosalie', name: 'Rosalie' },
];
const experienceImages: Record<string, string> = {
  '纪德来甜汤': '/food/jidelai.jpg',
  '金二顺潮汕生腌': '/food/jinershun.jpg',
  '三姐妹肠粉': '/food/sisters.jpg',
  '老牌福记加浓豆浆': '/food/fuji.jpg',
};
const categoryOptions: Array<{ value: ExperienceCategory; label: string; mark: string }> = [
  { value: 'food_drink', label: 'Food & Drink', mark: '食' },
  { value: 'museum_exhibition', label: 'Museum & Exhibition', mark: '展' },
  { value: 'shop_market', label: 'Shop & Market', mark: '集' },
  { value: 'entertainment', label: 'Entertainment', mark: '乐' },
  { value: 'outdoor_nature', label: 'Outdoor & Nature', mark: '野' },
  { value: 'other', label: 'Other', mark: '行' },
];
const categoryMarks: Record<ExperienceCategory, string> = {
  food_drink: '食', museum_exhibition: '展', shop_market: '集', entertainment: '乐', outdoor_nature: '野', other: '行',
};
const categoryLabels: Record<ExperienceCategory, string> = {
  food_drink: 'Food & Drink', museum_exhibition: 'Museum & Exhibition', shop_market: 'Shop & Market',
  entertainment: 'Entertainment', outdoor_nature: 'Outdoor & Nature', other: 'Other',
};
const quickFilterTags = [
  { value: '全部', label: '全部标签' },
  { value: '肠粉', label: '肠粉' },
  { value: '粿条面', label: '粿条面' },
  { value: '甜品小食', label: '甜品小食' },
  { value: '白粥大排档', label: '白粥大排档' },
  { value: '生腌', label: '生腌' },
] as const;
const emptyQuickDraft = {
  sourceUrl: '', name: '', category: 'other' as ExperienceCategory, address: '', tags: '', lat: '', lng: '',
  coordinateSystem: 'gcj02' as CoordinateSystem, openingHours: '', notes: '', imageUrl: '',
};
const today = dateKeyInTimeZone(new Date());
const initialMonth = today.slice(0, 7);

function normalizeExperience(item: ExperiencePayload): Experience {
  return {
    ...item, placeId: item.placeId ?? 'shantou', address: item.address ?? null, tags: item.tags ?? [], memberIds: ['toni', 'rosalie'],
    openingHours: item.openingHours ?? null, notes: item.notes ?? null, imageUrl: item.imageUrl ?? experienceImages[item.name] ?? null,
  };
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...init });
  const payload = await response.json().catch(() => ({})) as T & { error?: { code?: string; message?: string } };
  if (!response.ok) {
    const error = new Error(payload.error?.message ?? '刚才没有成功，请再试一次。') as Error & { code?: string };
    error.code = payload.error?.code;
    throw error;
  }
  return payload;
}

function accessErrorMessage(error: unknown): string {
  const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
  if (code === 'invalid_key') return '暗号不对';
  if (code === 'rate_limited') return '请稍后再试';
  if (code === 'invalid_input') return '暗号至少 9 位';
  return '暂时打不开';
}

function AvatarSlot({ member, active = false }: { member: Member; active?: boolean }) {
  const avatar = member.id === 'toni'
    ? '/avatars/toni-avatar-v2.png'
    : member.id === 'rosalie'
      ? '/avatars/rosalie-avatar-v3.png'
      : null;

  return (
    <span className={`avatar-slot ${active ? 'is-active' : ''}`} title={member.name}>
      {avatar
        ? <Image className="member-avatar-image" src={avatar} width={64} height={64} alt="" />
        : <span aria-hidden="true">{member.name.slice(0, 1).toUpperCase()}</span>}
      <span className="sr-only">{member.name}</span>
    </span>
  );
}

function BellIcon() {
  return (
    <Image
      className="topbar-generated-icon"
      src="/icons/bell-journal-v2.png"
      width={64}
      height={64}
      alt=""
    />
  );
}

function LockIcon() {
  return (
    <Image
      className="topbar-generated-icon"
      src="/icons/lock-journal-v2.png"
      width={64}
      height={64}
      alt=""
    />
  );
}

function LinkPreviewCard({ preview, category }: { preview: LinkPreview | null; category: ExperienceCategory }) {
  if (!previewHasContent(preview)) return null;
  const imageUrl = preview?.imageUrl?.startsWith('/') ? preview.imageUrl : null;
  return (
    <div className="quick-preview" aria-label="读取结果" aria-live="polite">
      <div className={imageUrl ? 'has-image' : ''}>
        {imageUrl
          ? <Image src={imageUrl} alt="" fill unoptimized sizes="7rem" />
          : <span>{categoryMarks[category]}</span>}
      </div>
      <div>
        {preview?.title && <strong>{preview.title}</strong>}
        {preview?.address && <p>{preview.address}</p>}
        {preview?.openingHours && <small>{preview.openingHours}</small>}
      </div>
    </div>
  );
}

function TagFields({
  selection,
  customTag,
  onSelectionChange,
  onCustomTagChange,
}: {
  selection: TagSelection;
  customTag: string;
  onSelectionChange: (selection: TagSelection) => void;
  onCustomTagChange: (value: string) => void;
}) {
  return (
    <>
      <label>标签<select value={selection} onChange={(event) => onSelectionChange(event.target.value as TagSelection)}>
        <option value="">选填</option>
        {TAG_PRESETS.map((tag) => <option value={tag} key={tag}>{tag}</option>)}
        <option value={CUSTOM_TAG_VALUE}>自定义</option>
      </select></label>
      {selection === CUSTOM_TAG_VALUE && <label>自定义<input value={customTag} onChange={(event) => onCustomTagChange(event.target.value)} placeholder="输入标签" /></label>}
    </>
  );
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const initialFocusSelector = '[autofocus], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-modal-close]), a[href]';
    document.body.style.overflow = 'hidden';

    const animationFrame = window.requestAnimationFrame(() => {
      const initialFocus = dialog.querySelector<HTMLElement>(initialFocusSelector)
        ?? dialog.querySelector<HTMLElement>(focusableSelector)
        ?? dialog;
      initialFocus.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      const activeIndex = focusable.indexOf(activeElement as HTMLElement);
      if (activeIndex === -1) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialogRef} tabIndex={-1}>
        <div className="modal-heading"><div>{eyebrow && <p>{eyebrow}</p>}<h2 id="modal-title">{title}</h2></div><button type="button" aria-label="关闭" data-modal-close onClick={onClose}>×</button></div>
        {children}
      </section>
    </div>
  );
}

export default function FoodAtlas({ initialView = 'experiences' }: { initialView?: 'experiences' | 'calendar' }) {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const markerLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markerRefs = useRef(new Map<string, Leaflet.Marker>());
  const notificationRequestRef = useRef(0);
  const focusedFootprintRecordRef = useRef<HTMLElement | null>(null);
  const placeSelectorRef = useRef<HTMLDivElement | null>(null);
  const [accessStatus, setAccessStatus] = useState<'loading' | 'setup' | 'locked' | 'profile' | 'ready' | 'error'>('loading');
  const [accessError, setAccessError] = useState('');
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [accessKey, setAccessKey] = useState('');
  const [accessBusy, setAccessBusy] = useState(false);
  const activeView = initialView;
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [placeOptions, setPlaceOptions] = useState<ExperiencePlace[]>(DEFAULT_EXPERIENCE_PLACES);
  const [currentPlaceId, setCurrentPlaceId] = useState('shantou');
  const [placeMenuOpen, setPlaceMenuOpen] = useState(false);
  const [placeStatus, setPlaceStatus] = useState<LoadStatus>('idle');
  const [placeError, setPlaceError] = useState('');
  const [newPlaceName, setNewPlaceName] = useState('');
  const [dataStatus, setDataStatus] = useState<LoadStatus>('idle');
  const canStartMap = canInitializeExperienceMap(accessStatus, activeView, dataStatus);
  const [dataError, setDataError] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationStatus, setNotificationStatus] = useState<LoadStatus>('idle');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [calendarEntries, setCalendarEntries] = useState<SharedCalendarEntry[]>([]);
  const [calendarStatus, setCalendarStatus] = useState<LoadStatus>('idle');
  const [calendarError, setCalendarError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(initialMonth);
  const [mapStatus, setMapStatus] = useState<LoadStatus>('idle');
  const [mapReady, setMapReady] = useState(false);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | ExperienceState>('all');
  const [category, setCategory] = useState('全部');
  const [tagFilter, setTagFilter] = useState('全部');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const [toast, setToast] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [quickDraft, setQuickDraft] = useState({ ...emptyQuickDraft });
  const [editDraft, setEditDraft] = useState({ ...emptyQuickDraft, locationNote: '' });
  const [quickTagSelection, setQuickTagSelection] = useState<TagSelection>('');
  const [editTagSelection, setEditTagSelection] = useState<TagSelection>('');
  const [quickPreview, setQuickPreview] = useState<LinkPreview | null>(null);
  const [editPreview, setEditPreview] = useState<LinkPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<LoadStatus>('idle');
  const [editPreviewStatus, setEditPreviewStatus] = useState<LoadStatus>('idle');
  const [quickImageFile, setQuickImageFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [footprintDraft, setFootprintDraft] = useState({ visitedOn: today, rating: 0, comment: '' });
  const [footprintExperienceId, setFootprintExperienceId] = useState('');
  const [footprintFiles, setFootprintFiles] = useState<File[]>([]);
  const [savedFootprintId, setSavedFootprintId] = useState<string | null>(null);
  const [footprintHistory, setFootprintHistory] = useState<FootprintRecord[]>([]);
  const [footprintHistoryStatus, setFootprintHistoryStatus] = useState<LoadStatus>('idle');
  const [footprintHistoryError, setFootprintHistoryError] = useState('');
  const [footprintHistoryExperience, setFootprintHistoryExperience] = useState<{ id: string; name: string } | null>(null);
  const [focusedFootprintId, setFocusedFootprintId] = useState<string | null>(null);
  const [deletingFootprintId, setDeletingFootprintId] = useState<string | null>(null);
  const [planExperienceId, setPlanExperienceId] = useState('');
  const [planDraft, setPlanDraft] = useState({ date: '', time: '', note: '' });
  const [legacyDate, setLegacyDate] = useState('');
  const [legacyItems, setLegacyItems] = useState<Array<{ experienceId: string; name: string; visitedOn: string; rating: number | null; comment: string | null }>>([]);

  const members = session?.members?.length ? session.members : memberFallbacks;
  const currentPetMemberId = session?.member?.id === 'toni' || session?.member?.id === 'rosalie'
    ? session.member.id
    : null;
  const csrfToken = session?.csrfToken ?? '';

  const loadAccess = useCallback(async () => {
    setAccessStatus('loading'); setAccessError('');
    try {
      const setup = await apiRequest<{ configured: boolean }>('/api/setup/status');
      if (!setup.configured) { setAccessStatus('setup'); return; }
      const nextSession = await apiRequest<SessionPayload>('/api/session');
      setSession(nextSession);
      if (!nextSession.authenticated) setAccessStatus('locked');
      else if (!nextSession.member) setAccessStatus('profile');
      else setAccessStatus('ready');
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : '手账暂时打不开。'); setAccessStatus('error');
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    setCalendarStatus('loading'); setCalendarError('');
    try {
      const payload = await apiRequest<{ entries: ApiCalendarEntry[] }>('/api/calendar');
      setCalendarEntries(payload.entries.map((entry) => ({
        id: entry.id, kind: entry.type, title: entry.experienceName, experienceId: entry.experienceId, memberIds: entry.memberIds,
        footprintId: entry.footprintId,
        status: entry.status ?? (entry.type === 'plan' ? 'accepted' : undefined), date: entry.date,
        scheduledFor: entry.type === 'plan' ? entry.date : undefined, visitedOn: entry.type === 'footprint' ? entry.date : undefined,
      })));
      setCalendarStatus('ready');
    } catch (error) {
      setCalendarError(error instanceof Error ? error.message : '日历读取失败。'); setCalendarStatus('error');
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    const requestId = ++notificationRequestRef.current;
    setNotifications([]);
    setNotificationStatus('loading');
    try {
      const payload = await apiRequest<{ notifications: NotificationItem[] }>('/api/notifications');
      if (requestId !== notificationRequestRef.current) return;
      setNotifications(payload.notifications); setNotificationStatus('ready');
    } catch {
      if (requestId !== notificationRequestRef.current) return;
      setNotifications([]); setNotificationStatus('error');
    }
  }, []);

  const loadExperiences = useCallback(async () => {
    setDataStatus('loading'); setDataError('');
    try {
      const payload = await apiRequest<{ experiences: ExperiencePayload[] }>('/api/experiences');
      const next = payload.experiences.map(normalizeExperience);
      setExperiences(next);
      const requestedId = new URLSearchParams(window.location.search).get('experience');
      setSelectedId((current) => requestedId && next.some((item) => item.id === requestedId)
        ? requestedId
        : current && next.some((item) => item.id === current) ? current : (next[0]?.id ?? null));
      if (requestedId) window.setTimeout(() => document.getElementById(`experience-${requestedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 180);
      setDataStatus('ready');
    } catch (error) {
      setDataError(error instanceof Error ? error.message : '清单暂时打不开。'); setDataStatus('error');
    }
  }, []);

  const loadPlaces = useCallback(async () => {
    setPlaceStatus('loading'); setPlaceError('');
    try {
      const payload = await apiRequest<{ places: PlacePayload[] }>('/api/places');
      const next = payload.places.map((place) => ({ id: place.id, label: place.name }));
      setPlaceOptions(next.length ? next : DEFAULT_EXPERIENCE_PLACES);
      setCurrentPlaceId((current) => next.some((place) => place.id === current) ? current : (next[0]?.id ?? 'shantou'));
      setPlaceStatus('ready');
    } catch (error) {
      setPlaceError(error instanceof Error ? error.message : '地方列表暂时打不开。');
      setPlaceOptions(DEFAULT_EXPERIENCE_PLACES); setPlaceStatus('error');
    }
  }, []);

  const loadWorkspace = useCallback(() => {
    void loadExperiences(); void loadPlaces(); void loadNotifications(); void loadCalendar();
  }, [loadCalendar, loadExperiences, loadNotifications, loadPlaces]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAccess(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAccess]);
  useEffect(() => {
    if (accessStatus !== 'ready') return;
    const timer = window.setTimeout(loadWorkspace, 0);
    return () => window.clearTimeout(timer);
  }, [accessStatus, loadWorkspace]);

  const currentPlace = placeOptions.find((place) => place.id === currentPlaceId) ?? DEFAULT_EXPERIENCE_PLACES[0];
  const placeExperiences = useMemo(() => filterExperiencesByPlace(experiences, currentPlaceId), [currentPlaceId, experiences]);
  const availableTags = useMemo(() => ['全部', ...Array.from(new Set(placeExperiences.flatMap((item) => item.tags))).sort((left, right) => left.localeCompare(right, 'zh-CN'))], [placeExperiences]);
  const filteredExperiences = useMemo(() => filterExperiences(placeExperiences, {
    state: stateFilter, owner: 'all', category, tag: tagFilter === '全部' ? undefined : tagFilter, query,
  }), [category, placeExperiences, query, stateFilter, tagFilter]);
  const selected = filteredExperiences.find((item) => item.id === selectedId) ?? filteredExperiences[0] ?? placeExperiences.find((item) => item.id === selectedId) ?? null;
  const footprintExperience = experiences.find((item) => item.id === footprintExperienceId) ?? null;
  const planExperience = experiences.find((item) => item.id === planExperienceId) ?? null;
  const wishlistCount = placeExperiences.filter((item) => item.state === 'wishlist').length;
  const footprintCount = placeExperiences.filter((item) => item.state === 'footprint').length;

  useEffect(() => {
    if (!placeMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!placeSelectorRef.current?.contains(event.target as Node)) setPlaceMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPlaceMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [placeMenuOpen]);

  useEffect(() => {
    if (!canStartMap || placeExperiences.length === 0) return;
    let active = true;
    let timeoutId: number | undefined;
    const markerRegistry = markerRefs.current;
    async function startMap() {
      if (!mapContainerRef.current || mapRef.current) return;
      try {
        const L = await import('leaflet');
        if (!active || !mapContainerRef.current) return;
        setMapStatus('loading');
        leafletRef.current = L;
        const center = toOsmLatLng([23.3658, 116.712], 'gcj02');
        const map = L.map(mapContainerRef.current, { center, zoom: 13, zoomControl: false, attributionControl: false });
        L.control.zoom({ position: 'bottomleft' }).addTo(map);
        L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
        const layer = L.layerGroup().addTo(map);
        mapRef.current = map; markerLayerRef.current = layer; setMapReady(true);
        tiles.once('load', () => { if (active) { if (timeoutId) window.clearTimeout(timeoutId); setMapStatus('ready'); } });
        tiles.once('tileerror', () => { if (active) setMapStatus('error'); });
        timeoutId = window.setTimeout(() => { if (active) setMapStatus('error'); }, 12000);
      } catch { if (active) setMapStatus('error'); }
    }
    void startMap();
    return () => {
      active = false; if (timeoutId) window.clearTimeout(timeoutId); markerRegistry.clear(); mapRef.current?.remove();
      mapRef.current = null; leafletRef.current = null; markerLayerRef.current = null; setMapReady(false);
    };
  }, [canStartMap, currentPlaceId, placeExperiences.length]);

  useEffect(() => {
    const L = leafletRef.current; const map = mapRef.current; const layer = markerLayerRef.current;
    if (!mapReady || !L || !map || !layer) return;
    layer.clearLayers(); markerRefs.current.clear();
    const points: [number, number][] = [];
    filteredExperiences.forEach((experience, index) => {
      if (!experience.coordinates) return;
      const point = toOsmLatLng([experience.coordinates.lat, experience.coordinates.lng], experience.coordinates.system);
      points.push(point);
      const markerVisual = document.createElement('span');
      markerVisual.className = `experience-marker ${experience.state === 'footprint' ? 'is-footprint' : ''}`;
      markerVisual.textContent = String(index + 1).padStart(2, '0'); markerVisual.setAttribute('aria-hidden', 'true');
      const marker = L.marker(point, { icon: L.divIcon({ className: 'experience-marker-wrap', html: markerVisual, iconSize: [38, 46], iconAnchor: [19, 42] }), keyboard: true, title: experience.name });
      const popup = document.createElement('div'); popup.className = 'experience-popup';
      const label = document.createElement('span'); label.textContent = experience.state === 'footprint' ? '去过' : '想去';
      const name = document.createElement('strong'); name.textContent = experience.name;
      const address = document.createElement('small'); address.textContent = experience.address ?? '具体位置待确认';
      popup.appendChild(label); popup.appendChild(name); popup.appendChild(address);
      marker.bindPopup(popup, { closeButton: false, offset: [0, -24] });
      marker.on('click keypress', (event) => {
        if (!isExperienceMarkerActivation(event)) return;
        setSelectedId(experience.id);
        window.setTimeout(() => document.getElementById(`experience-${experience.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
      });
      marker.addTo(layer);
      const markerElement = marker.getElement();
      markerElement?.setAttribute('aria-label', `查看 ${experience.name}`);
      markerElement?.setAttribute('role', 'button');
      markerElement?.setAttribute('tabindex', '0');
      markerRefs.current.set(experience.id, marker);
    });
    if (points.length > 1) map.fitBounds(points, { padding: [56, 56], maxZoom: 14 });
    else if (points.length === 1) map.flyTo(points[0], 15, { duration: 0.45 });
  }, [filteredExperiences, mapReady]);

  useEffect(() => {
    markerRefs.current.forEach((marker, id) => marker.getElement()?.querySelector('.experience-marker')?.classList.toggle('is-active', id === selected?.id));
  }, [selected?.id, filteredExperiences]);

  async function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessKey.trim()) return;
    setAccessBusy(true); setAccessError('');
    try {
      if (accessStatus === 'setup') await apiRequest('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: accessKey }) });
      const nextSession = await apiRequest<SessionPayload>('/api/auth/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: accessKey }) });
      setSession(nextSession); setAccessKey(''); setAccessStatus(nextSession.member ? 'ready' : 'profile');
    } catch (error) { setAccessError(accessErrorMessage(error)); }
    finally { setAccessBusy(false); }
  }

  async function chooseProfile(memberId: string) {
    if (accessBusy) return;
    const notificationRequestId = ++notificationRequestRef.current;
    setNotifications([]); setNotificationStatus('loading'); setNotificationOpen(false);
    setAccessBusy(true); setAccessError('');
    try {
      const nextSession = await apiRequest<SessionPayload>('/api/auth/profile', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ memberId }) });
      setSession(nextSession); setAccessStatus('ready'); loadWorkspace();
    } catch (error) {
      if (notificationRequestId === notificationRequestRef.current) setNotificationStatus('error');
      setAccessError(error instanceof Error ? error.message : '无法选择人物。');
    }
    finally { setAccessBusy(false); }
  }

  async function logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST', headers: { 'x-csrf-token': csrfToken } });
      setSession(null); setExperiences([]); setAccessStatus('locked');
    } catch { setToast('未能安全锁定，请检查网络后重试'); }
  }

  function focusExperience(experience: Experience) {
    setSelectedId(experience.id);
    if (experience.coordinates && mapRef.current) {
      const point = toOsmLatLng([experience.coordinates.lat, experience.coordinates.lng], experience.coordinates.system);
      const map = mapRef.current;
      const moveMap = () => {
        if (mapRef.current !== map) return;
        map.invalidateSize();
        map.flyTo(point, 16, { duration: 0.55 });
        window.setTimeout(() => markerRefs.current.get(experience.id)?.openPopup(), 580);
      };
      if (shouldScrollMapForCardSelection(window.innerWidth) && mapContainerRef.current) {
        mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(moveMap, 240);
      } else moveMap();
    }
  }

  function selectPlace(place: ExperiencePlace) {
    setCurrentPlaceId(place.id);
    setPlaceMenuOpen(false);
    setSelectedId(filterExperiencesByPlace(experiences, place.id)[0]?.id ?? null);
    setQuery(''); setStateFilter('all'); setCategory('全部'); setTagFilter('全部');
  }

  function openPlaceManager() {
    setPlaceMenuOpen(false); setNewPlaceName(''); setActionError(''); setModal('places');
  }

  async function createPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newPlaceName.trim();
    if (!name) return;
    setActionBusy(true); setActionError('');
    try {
      const payload = await apiRequest<{ place: PlacePayload }>('/api/places', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ name }),
      });
      const added = { id: payload.place.id, label: payload.place.name };
      setPlaceOptions((current) => appendExperiencePlace(current, added));
      setCurrentPlaceId(added.id); setSelectedId(null); setNewPlaceName(''); setModal(null);
      setQuery(''); setStateFilter('all'); setCategory('全部'); setTagFilter('全部');
      setToast(`${added.label}加进来了。`);
    } catch (error) { setActionError(error instanceof Error ? error.message : '地方没有添加成功。'); }
    finally { setActionBusy(false); }
  }

  function openQuickAdd() {
    setQuickDraft({ ...emptyQuickDraft });
    setQuickTagSelection('');
    setQuickPreview(null);
    setPreviewStatus('idle');
    setQuickImageFile(null);
    setActionError('');
    setModal('quick-add');
  }

  function openEdit(experience: Experience) {
    const tagDraft = tagSelectionFromTags(experience.tags);
    setSelectedId(experience.id);
    setEditDraft({
      sourceUrl: experience.sourceUrl ?? '', name: experience.name, category: experience.category,
      address: experience.address ?? '', tags: tagDraft.customTag,
      lat: experience.coordinates ? String(experience.coordinates.lat) : '', lng: experience.coordinates ? String(experience.coordinates.lng) : '',
      coordinateSystem: experience.coordinates?.system ?? 'gcj02', openingHours: experience.openingHours ?? '',
      notes: experience.notes ?? '', imageUrl: experience.imageUrl ?? '', locationNote: experience.locationNote ?? '',
    });
    setEditTagSelection(tagDraft.selection);
    setEditPreview(null);
    setEditPreviewStatus('idle');
    setEditImageFile(null);
    setActionError('');
    setModal('edit');
  }

  function openFootprint(experienceId = '', visitedOn = today) {
    if (experienceId) setSelectedId(experienceId);
    setFootprintExperienceId(experienceId);
    setFootprintDraft({ visitedOn, rating: 0, comment: '' });
    setSavedFootprintId(null);
    setFootprintFiles([]);
    setActionError('');
    setModal('footprint');
  }

  function openPlan(experienceId = '', date = '') {
    if (experienceId) setSelectedId(experienceId);
    setPlanExperienceId(experienceId);
    setPlanDraft({ date, time: '', note: '' });
    setActionError('');
    setModal('plan');
  }

  function openFromCalendarDate(date: string) {
    if (date < today) {
      openFootprint('', date);
      return;
    }
    openPlan('', date);
  }

  async function uploadExperienceImage(experienceId: string, file: File): Promise<Experience> {
    const body = new FormData();
    body.set('file', file);
    const payload = await apiRequest<{ experience: ExperiencePayload }>(`/api/experiences/${encodeURIComponent(experienceId)}/media`, {
      method: 'POST', headers: { 'x-csrf-token': csrfToken }, body,
    });
    return normalizeExperience(payload.experience);
  }

  function chooseExperienceImage(file: File | null, setFile: (next: File | null) => void) {
    if (!file) { setFile(null); return; }
    const result = validateExperienceImage(file);
    if (!result.valid) { setFile(null); setActionError(result.message); return; }
    setActionError('');
    setFile(file);
  }

  async function updateExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setActionBusy(true); setActionError('');
    try {
      const payload = await apiRequest<{ experience: ExperiencePayload }>(`/api/experiences/${encodeURIComponent(selected.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          name: editDraft.name.trim(), category: editDraft.category, address: editDraft.address.trim() || null,
          sourceUrl: editDraft.sourceUrl.trim() || null, tags: tagsFromSelection(editTagSelection, editDraft.tags),
          coordinates: editDraft.lat && editDraft.lng ? { lat: Number(editDraft.lat), lng: Number(editDraft.lng), system: editDraft.coordinateSystem } : null,
          locationStatus: editDraft.lat && editDraft.lng ? 'verified' : 'pending', locationNote: editDraft.locationNote.trim() || null,
          openingHours: editDraft.openingHours.trim() || null, notes: editDraft.notes.trim() || null,
        }),
      });
      let updated = normalizeExperience(payload.experience);
      if (editImageFile) {
        try {
          updated = await uploadExperienceImage(updated.id, editImageFile);
        } catch {
          setExperiences((current) => current.map((item) => item.id === updated.id ? updated : item));
          setModal(null); setToast('修改已保存，图片没传成功。可以再试一次。');
          return;
        }
      }
      setExperiences((current) => current.map((item) => item.id === updated.id ? updated : item));
      setModal(null); setToast('已保存。');
    } catch (error) { setActionError(error instanceof Error ? error.message : '更新失败。'); }
    finally { setActionBusy(false); }
  }

  async function previewLink(mode: 'quick' | 'edit') {
    const draft = mode === 'quick' ? quickDraft : editDraft;
    if (!draft.sourceUrl.trim()) return;
    const setStatus = mode === 'quick' ? setPreviewStatus : setEditPreviewStatus;
    const setPreview = mode === 'quick' ? setQuickPreview : setEditPreview;
    const requestedUrl = draft.sourceUrl.trim();
    setStatus('loading'); setPreview(null); setActionError('');
    try {
      const preview = await apiRequest<LinkPreview>('/api/experiences/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ url: requestedUrl }),
      });
      setPreview(preview);
      const mergePreview = <T,>(current: T & typeof emptyQuickDraft): T & typeof emptyQuickDraft => (
        current.sourceUrl.trim() !== requestedUrl ? current : ({
          ...current,
          sourceUrl: preview.sourceUrl || current.sourceUrl,
          name: preview.title || current.name,
          address: preview.address || current.address,
          lat: preview.coordinates ? String(preview.coordinates.lat) : current.lat,
          lng: preview.coordinates ? String(preview.coordinates.lng) : current.lng,
          coordinateSystem: preview.coordinates?.system ?? current.coordinateSystem,
          openingHours: preview.openingHours || current.openingHours,
          notes: preview.notes || current.notes,
          imageUrl: preview.imageUrl || current.imageUrl,
        })
      );
      if (mode === 'quick') setQuickDraft((current) => mergePreview(current));
      else setEditDraft((current) => mergePreview(current));
      setStatus('ready');
    } catch (error) {
      setPreview(null);
      setActionError(error instanceof Error ? error.message : '链接暂时无法读取。');
      setStatus('error');
    }
  }

  async function createExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setActionBusy(true); setActionError('');
    try {
      const payload = await apiRequest<{ experience: ExperiencePayload }>('/api/experiences', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          placeId: currentPlaceId,
          name: quickDraft.name.trim(), category: quickDraft.category, address: quickDraft.address.trim() || null,
          sourceUrl: quickDraft.sourceUrl.trim() || undefined, tags: tagsFromSelection(quickTagSelection, quickDraft.tags),
          coordinates: quickDraft.lat && quickDraft.lng ? { lat: Number(quickDraft.lat), lng: Number(quickDraft.lng), system: quickDraft.coordinateSystem } : null,
          openingHours: quickDraft.openingHours.trim() || null, notes: quickDraft.notes.trim() || null,
        }),
      });
      let created = normalizeExperience(payload.experience);
      if (quickImageFile) {
        try {
          created = await uploadExperienceImage(created.id, quickImageFile);
        } catch {
          setExperiences((current) => [created, ...current]); setSelectedId(created.id);
          setQuickDraft({ ...emptyQuickDraft }); setQuickTagSelection(''); setQuickImageFile(null); setQuickPreview(null);
          setModal(null); setToast('地点已保存，图片没传成功。可以在编辑里再试。');
          return;
        }
      }
      setExperiences((current) => [created, ...current]); setSelectedId(created.id);
      setQuickDraft({ ...emptyQuickDraft });
      setQuickTagSelection(''); setQuickImageFile(null); setQuickPreview(null); setPreviewStatus('idle');
      setModal(null); setToast('记下了，等我们一起去。');
    } catch (error) { setActionError(error instanceof Error ? error.message : '保存失败。'); }
    finally { setActionBusy(false); }
  }

  async function createFootprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!footprintExperience) return; setActionBusy(true); setActionError('');
    try {
      const payload = await apiRequest<{ footprint: { id: string } }>(`/api/experiences/${encodeURIComponent(footprintExperience.id)}/footprints`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ visitedOn: footprintDraft.visitedOn, rating: footprintDraft.rating || undefined, comment: footprintDraft.comment.trim() || undefined }),
      });
      setExperiences((current) => current.map((item) => item.id === footprintExperience.id ? { ...item, state: 'footprint', footprintCount: item.footprintCount + 1, lastVisitedOn: footprintDraft.visitedOn } : item));
      setSelectedId(footprintExperience.id);
      setSavedFootprintId(payload.footprint.id); void loadCalendar();
      if (footprintFiles.length) {
        await uploadFootprintFiles(payload.footprint.id);
        setToast(`这一天和 ${footprintFiles.length} 张照片都记下了。`);
      } else setToast('这一天记下了。');
      setModal(null); setSavedFootprintId(null); setFootprintExperienceId(''); setFootprintFiles([]); setFootprintDraft({ visitedOn: today, rating: 0, comment: '' });
    } catch (error) { setActionError(error instanceof Error ? error.message : '没有保存成功，请再试一次。'); }
    finally { setActionBusy(false); }
  }

  async function uploadFootprintFiles(footprintId: string) {
    const failed: File[] = [];
    for (const file of footprintFiles) {
      const body = new FormData(); body.append('file', file);
      try {
        await apiRequest(`/api/footprints/${encodeURIComponent(footprintId)}/media`, {
          method: 'POST', headers: { 'x-csrf-token': csrfToken }, body,
        });
      } catch { failed.push(file); }
    }
    setFootprintFiles(failed);
    if (failed.length) throw new Error(`这一天已经记下；${failed.length} 张照片没传成功，可以重试。`);
  }

  async function retryFootprintUpload() {
    if (!savedFootprintId || footprintFiles.length === 0) return;
    setActionBusy(true); setActionError('');
    try {
      const count = footprintFiles.length;
      await uploadFootprintFiles(savedFootprintId);
      setToast(`已补传 ${count} 张照片`); setModal(null); setSavedFootprintId(null); setFootprintExperienceId(''); setFootprintFiles([]);
      setFootprintDraft({ visitedOn: today, rating: 0, comment: '' });
    } catch (error) { setActionError(error instanceof Error ? error.message : '照片上传失败。'); }
    finally { setActionBusy(false); }
  }

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!planExperience || !planDraft.date || !planDraft.time) return; setActionBusy(true); setActionError('');
    try {
      await apiRequest(`/api/experiences/${encodeURIComponent(planExperience.id)}/plans`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ scheduledFor: shantouDateTimeToIso(planDraft.date, planDraft.time), note: planDraft.note.trim() || undefined }),
      });
      setSelectedId(planExperience.id);
      setPlanExperienceId(''); setPlanDraft({ date: '', time: '', note: '' }); setModal(null); setToast('邀请送到了。');
    } catch (error) { setActionError(error instanceof Error ? error.message : '邀请发送失败。'); }
    finally { setActionBusy(false); }
  }

  async function respondToPlan(planId: string, status: 'accepted' | 'declined') {
    if (!canRespondToNotifications(notificationStatus)) return;
    setActionError('');
    try {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ status }) });
      setNotifications((current) => current.filter((item) => item.plan.id !== planId));
      setToast(status === 'accepted' ? '约好了，日历里见。' : '这次先不约了。'); if (status === 'accepted') void loadCalendar();
    } catch (error) { setActionError(error instanceof Error ? error.message : '回应失败。'); }
  }

  async function importLegacy() {
    setActionBusy(true); setActionError('');
    try {
      const payload = await apiRequest<{ imported: number; skipped: number; requiresDates: string[] }>('/api/import/legacy', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ items: legacyItems.map(({ experienceId, visitedOn, rating, comment }) => ({ experienceId, visitedOn: visitedOn || legacyDate || null, rating, comment })) }),
      });
      setToast(`已导入 ${payload.imported} 条；跳过 ${payload.skipped} 条`);
      if (payload.requiresDates.length) {
        const pending = new Set(payload.requiresDates);
        setLegacyItems((current) => current.filter((item) => pending.has(item.experienceId)));
        setActionError(`${payload.requiresDates.length} 条记录还需逐条补日期。评价和文字会原样保留。`);
      } else setModal(null);
      void loadExperiences(); void loadCalendar();
    } catch (error) { setActionError(error instanceof Error ? error.message : '导入失败，旧版记录仍保留。'); }
    finally { setActionBusy(false); }
  }

  async function openFootprintHistory(experienceId: string, experienceName: string, footprintId: string | null = null) {
    setFootprintHistoryExperience({ id: experienceId, name: experienceName });
    setFocusedFootprintId(footprintId);
    setFootprintHistory([]); setFootprintHistoryError(''); setActionError(''); setFootprintHistoryStatus('loading'); setModal('footprint-history');
    try {
      const payload = await apiRequest<{ footprints: FootprintRecord[] }>(`/api/experiences/${encodeURIComponent(experienceId)}/footprints`);
      setFootprintHistory(payload.footprints); setFootprintHistoryStatus('ready');
    } catch (error) {
      setFootprintHistoryError(error instanceof Error ? error.message : '以前的记录没能打开。'); setFootprintHistoryStatus('error');
    }
  }

  async function deleteFootprint(recordId: string) {
    if (!footprintHistoryExperience || deletingFootprintId) return;
    setDeletingFootprintId(recordId); setActionError('');
    try {
      const payload = await apiRequest<{ experience: ExperiencePayload }>(`/api/footprints/${encodeURIComponent(recordId)}`, {
        method: 'DELETE', headers: { 'x-csrf-token': csrfToken },
      });
      const updated = normalizeExperience(payload.experience);
      setExperiences((current) => current.map((item) => item.id === updated.id ? updated : item));
      setFootprintHistory((current) => current.filter((record) => record.id !== recordId));
      setFocusedFootprintId((current) => current === recordId ? null : current);
      void loadCalendar();
      if (updated.footprintCount === 0) {
        setModal(null); setFootprintHistoryExperience(null);
        setToast('删掉了，这个地方又回到“想去”。');
      } else {
        setToast('这次记录删掉了。');
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '没有删掉，请再试一次。');
    } finally {
      setDeletingFootprintId(null);
    }
  }

  function openFromCalendar(entry: SharedCalendarEntry) {
    const target = resolveCalendarEntryTarget(entry);
    if (target.kind === 'history') {
      void openFootprintHistory(target.experienceId, target.experienceName, target.footprintId);
      return;
    }
    router.push(`/experiences?experience=${encodeURIComponent(target.experienceId)}`);
  }

  useEffect(() => {
    if (modal !== 'footprint-history' || footprintHistoryStatus !== 'ready' || !focusedFootprintId) return;
    const animationFrame = window.requestAnimationFrame(() => {
      const record = focusedFootprintRecordRef.current;
      if (!record) return;
      record.scrollIntoView({ behavior: 'smooth', block: 'center' });
      record.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [focusedFootprintId, footprintHistoryStatus, modal]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer);
  }, [toast]);

  if (accessStatus !== 'ready') {
    return (
      <main className="access-page">
        <div className="access-image"><Image src="/shantou-qilou-food-v1.png" alt="雨后的汕头骑楼" fill priority sizes="(max-width: 800px) 100vw, 58vw" /></div>
        <section className="access-panel">
          <div className="paired-seal" aria-hidden="true"><span>T</span><i>与</i><span>R</span></div>
          {accessStatus === 'loading' && <div className="access-state"><span className="ink-loader" /><strong>打开中…</strong></div>}
          {accessStatus === 'error' && <div className="access-state"><strong>暂时打不开</strong><p>{accessError}</p><button type="button" onClick={() => void loadAccess()}>再试一次</button></div>}
          {(accessStatus === 'setup' || accessStatus === 'locked') && (
            <form className="access-form" onSubmit={submitAccess}>
              <h2>暗号</h2>
              <input aria-label="暗号" type="password" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} autoComplete={accessStatus === 'setup' ? 'new-password' : 'current-password'} required />
              {accessError && <p className="form-error" role="alert">{accessError}</p>}
              <button className="primary-action" type="submit" disabled={accessBusy}>{accessBusy ? '确认中…' : '确认'}</button>
            </form>
          )}
          {accessStatus === 'profile' && (
            <div className="profile-picker">
              <h2>今天是谁来写？</h2>
              <div>{members.map((member) => <button type="button" key={member.id} disabled={accessBusy} onClick={() => void chooseProfile(member.id)}><AvatarSlot member={member} /><span><strong>{member.name}</strong></span></button>)}</div>
              {accessError && <p className="form-error" role="alert">{accessError}</p>}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="experience-app">
      {currentPetMemberId && <MouseFollowerPet currentMemberId={currentPetMemberId} key={currentPetMemberId} />}
      <header className="topbar">
        <Link className="couple-brand" href="/" aria-label="返回首页">
          <span className="mini-seal">T<span>&amp;</span>R</span><span><strong>Toni &amp; Rosalie</strong><small>{currentPlace.label}</small></span>
        </Link>
        <nav aria-label="主要页面"><Link href="/">Home</Link><Link className={activeView === 'experiences' ? 'is-active' : ''} href="/experiences">Wish List</Link><Link className={activeView === 'calendar' ? 'is-active' : ''} href="/calendar">Calendar</Link></nav>
        <div className="topbar-actions">
          <div className="member-stack" aria-label="切换当前人物">{members.slice(0, 2).map((member) => <button className="profile-switch" type="button" disabled={accessBusy} aria-pressed={member.id === session?.member?.id} title={`切换为 ${member.name}`} onClick={() => member.id !== session?.member?.id && void chooseProfile(member.id)} key={member.id}><AvatarSlot member={member} active={member.id === session?.member?.id} /></button>)}</div>
          <button className="notification-button" type="button" aria-label="通知" aria-controls="notification-drawer" onClick={() => setNotificationOpen((current) => !current)} aria-expanded={notificationOpen}><BellIcon /><b>{notifications.length}</b></button>
          <button className="more-button" type="button" aria-label="退出并锁定" onClick={() => void logout()} title="合上这本手账"><LockIcon /></button>
        </div>
      </header>

      {notificationOpen && (
        <aside className="notification-drawer" id="notification-drawer" aria-label="邀请通知">
          <div className="drawer-heading"><div><h2>等你回应</h2></div><button type="button" onClick={() => setNotificationOpen(false)} aria-label="关闭通知">×</button></div>
          {notificationStatus === 'loading' && <div className="drawer-state">正在读取…</div>}
          {notificationStatus === 'error' && <div className="drawer-state"><span>邀请暂时打不开。</span><button type="button" onClick={() => void loadNotifications()}>重试</button></div>}
          {notificationStatus === 'ready' && notifications.length === 0 && <div className="drawer-empty"><span>静</span><p>现在没有新邀请。</p></div>}
          {notificationStatus === 'ready' && notifications.map((item) => (
            <article className="invite-card" key={item.id}>
              <div><AvatarSlot member={item.plan.createdBy ?? memberFallbacks[0]} /><span><small>{item.plan.createdBy?.name ?? '对方'} 想和你一起去</small><strong>{item.plan.experience?.name ?? experiences.find((entry) => entry.id === item.plan.experienceId)?.name ?? '一个新地方'}</strong></span></div>
              <time dateTime={item.plan.scheduledFor}>{new Date(item.plan.scheduledFor).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
              {item.plan.note && <p>“{item.plan.note}”</p>}
              <div><button type="button" disabled={!canRespondToNotifications(notificationStatus)} onClick={() => void respondToPlan(item.plan.id, 'declined')}>这次不行</button><button className="accept" type="button" disabled={!canRespondToNotifications(notificationStatus)} onClick={() => void respondToPlan(item.plan.id, 'accepted')}>好呀</button></div>
            </article>
          ))}
          {actionError && <p className="form-error" role="alert">{actionError}</p>}
        </aside>
      )}

      {activeView === 'experiences' ? (
        <>
          <section className="experience-lede">
            <div className="lede-copy is-right"><h1>我们一起走过的地方</h1><div className="place-selector" ref={placeSelectorRef}>
              <button className="place-selector-trigger" type="button" aria-label={`当前是${currentPlace.label}，选择地方`} aria-haspopup="listbox" aria-expanded={placeMenuOpen} aria-controls="place-selector-list" onClick={() => setPlaceMenuOpen((open) => !open)}><span>{currentPlace.label}</span><Image className="place-selector-icon" src="/icons/place-dropdown-journal-v2.png" width={128} height={128} alt="" /></button>
              {placeMenuOpen && <div className="place-selector-menu">
                <div id="place-selector-list" role="listbox" aria-label="选择地方">
                  {placeOptions.map((place) => <button type="button" role="option" aria-selected={place.id === currentPlaceId} key={place.id} onClick={() => selectPlace(place)}><span>{place.label}</span><small>{filterExperiencesByPlace(experiences, place.id).length}</small></button>)}
                </div>
                {placeStatus === 'error' && <small className="place-selector-error" role="status">{placeError}</small>}
                <button className="place-selector-manage" type="button" onClick={openPlaceManager}>管理地方</button>
              </div>}
            </div><p className="lede-total" aria-label={`现在一共收录 ${placeExperiences.length} 个地方`}>现在一共收录 <strong>{placeExperiences.length}</strong> 个地方</p></div>
            <figure><Image src={getExperiencePlaceHeroImage(currentPlaceId)} alt="" fill sizes="(max-width: 800px) 100vw, (max-width: 1100px) 62vw, 48vw" /></figure>
            <div className="lede-ledger"><div><span>想去</span><strong>{wishlistCount}</strong><small>处</small></div><div><span>去过</span><strong>{footprintCount}</strong><small>处</small></div></div>
          </section>

          <section className="filter-ribbon" aria-label="想去的地方筛选">
            <label className="experience-search"><span aria-hidden="true">寻</span><input aria-label="寻店" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="寻店" /></label>
            <div className="state-filter-row">
              <button className="filter-add-button" type="button" onClick={openQuickAdd}>＋ 新增</button>
              <div className="state-filter-stack">
                <div className="state-tabs" role="group" aria-label="状态">
                  {([['all', '全部'], ['wishlist', '想去'], ['footprint', '去过']] as const).map(([value, label]) => <button type="button" key={value} className={stateFilter === value ? 'is-active' : ''} onClick={() => setStateFilter(value)}>{label}<small>{value === 'all' ? placeExperiences.length : value === 'wishlist' ? wishlistCount : footprintCount}</small></button>)}
                </div>
                <div className="quick-tag-tabs" role="group" aria-label="常用标签">
                  {quickFilterTags.filter(({ value }) => value === '全部' || availableTags.includes(value)).map(({ value, label }) => <button type="button" key={value} className={tagFilter === value ? 'is-active' : ''} aria-pressed={tagFilter === value} onClick={() => setTagFilter(value)}>{label}</button>)}
                </div>
              </div>
            </div>
            <label className="category-select"><span>类别</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="全部">全部类别</option>{categoryOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
            <label className="tag-select"><span>标签</span><select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>{availableTags.map((tag) => <option key={tag}>{tag}</option>)}</select></label>
          </section>

          {dataStatus === 'loading' && <div className="page-state workspace-state"><span className="ink-loader" /><strong>正在打开清单…</strong></div>}
          {dataStatus === 'error' && <div className="page-state workspace-state is-error"><strong>清单暂时打不开</strong><p>{dataError}</p><button type="button" onClick={() => void loadExperiences()}>再试一次</button></div>}
          {dataStatus === 'ready' && placeExperiences.length === 0 && <div className="page-state workspace-state place-empty-state"><strong>待你补充</strong><button type="button" onClick={openQuickAdd}>＋ 新增</button></div>}

          {dataStatus === 'ready' && placeExperiences.length > 0 && (
            <section className="explorer-shell">
              <div className="map-pane">
                <div className="map-canvas" ref={mapContainerRef} aria-label="地点地图" />
                {mapStatus === 'loading' && <div className="map-overlay"><span className="ink-loader" /><strong>地图正在打开…</strong></div>}
                {mapStatus === 'error' && <div className="map-overlay is-error"><strong>地图暂时打不开</strong></div>}
                <div className="map-key"><span><i /> 想去</span><span><i className="footprint" /> 去过</span></div>
                {selected && filteredExperiences.some((item) => item.id === selected.id) && (
                  <article className="map-selection">
                    <div><span>{categoryLabels[selected.category]} · {selected.state === 'wishlist' ? '想去' : '已去过'}</span><h2>{selected.name}</h2><p>{selected.address ?? '具体位置待确认'}{selected.locationNote ? ` · ${selected.locationNote}` : ''}</p></div>
                    <div className="selection-actions"><button type="button" onClick={() => openEdit(selected)}>编辑</button>{selected.footprintCount > 0 && <button type="button" onClick={() => void openFootprintHistory(selected.id, selected.name)}>去过 {selected.footprintCount} 次</button>}<button type="button" onClick={() => openPlan(selected.id)}>约一天</button><button className="been-here" type="button" onClick={() => openFootprint(selected.id)}>{selected.state === 'footprint' ? '再记一次' : '记下去过'}</button></div>
                  </article>
                )}
              </div>

              <div className="experience-list-pane">
                <div className="list-heading"><div><h2>{stateFilter === 'footprint' ? '去过的地方' : 'Wish List'}</h2></div><span>{filteredExperiences.length} / {placeExperiences.length}</span></div>
                <div className="experience-list">
                  {filteredExperiences.map((experience, index) => {
                    const image = experience.imageUrl?.startsWith('/') ? experience.imageUrl : experienceImages[experience.name];
                    return (
                      <article className={`experience-card ${selected?.id === experience.id ? 'is-selected' : ''}`} id={`experience-${experience.id}`} key={experience.id}>
                        <button className="experience-card-main" type="button" onClick={() => focusExperience(experience)}>
                          <div className={`experience-card-visual ${image ? 'has-image' : ''}`}>
                            {image ? <Image src={image} alt="" fill unoptimized sizes="(max-width: 800px) 8rem, 9rem" /> : <><span>{categoryMarks[experience.category] ?? '行'}</span><i /><i /></>}
                            <b>{String(index + 1).padStart(2, '0')}</b><em className={experience.state}>{experience.state === 'wishlist' ? '想去' : '去过'}</em>
                          </div>
                          <div className="experience-card-copy">
                            <div><span>{categoryLabels[experience.category]}</span>{experience.recommendationStatus === 'avoid' && <em>谨慎前往</em>}{experience.locationStatus === 'pending' && <em className="pending">位置待确认</em>}</div>
                            <h3>{experience.name}</h3><p>{experience.address ?? '具体位置待确认'}</p>
                            {experience.locationStatus === 'pending' && experience.locationNote && <p className="location-note">还没确认：{experience.locationNote}</p>}
                            {experience.tags.length > 0 && <div className="tag-row">{experience.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
                            <small>{experience.state === 'footprint' ? `去过 ${experience.footprintCount} 次${experience.lastVisitedOn ? ` · 最近 ${experience.lastVisitedOn}` : ''}` : experience.createdBy ? `${experience.createdBy.name} 记下的` : '想和你去'}</small>
                          </div>
                        </button>
                        <div className="card-actions"><button type="button" onClick={() => openEdit(experience)}>编辑</button>{experience.footprintCount > 0 && <button type="button" onClick={() => void openFootprintHistory(experience.id, experience.name)}>去过 {experience.footprintCount} 次</button>}<button type="button" onClick={() => openPlan(experience.id)}>约一天</button><button className="been-here" type="button" onClick={() => openFootprint(experience.id)}>{experience.state === 'footprint' ? '再记一次' : '记下去过'}</button>{experience.sourceUrl && <a href={experience.sourceUrl} target="_blank" rel="noreferrer">原链接 ↗</a>}</div>
                      </article>
                    );
                  })}
                </div>
                {filteredExperiences.length === 0 && <div className="list-empty"><span>无</span><strong>没找到。</strong><p>换个词再找找。</p><button type="button" onClick={() => { setQuery(''); setStateFilter('all'); setCategory('全部'); setTagFilter('全部'); }}>清除筛选</button></div>}
              </div>
            </section>
          )}
        </>
      ) : (
        <SharedCalendar
          entries={calendarEntries}
          month={calendarMonth}
          status={calendarStatus === 'idle' ? 'loading' : calendarStatus}
          error={calendarError}
          canAdd={dataStatus === 'ready' && experiences.length > 0}
          addError={dataStatus === 'error' ? dataError : undefined}
          onMonthChange={setCalendarMonth}
          onDateSelect={openFromCalendarDate}
          onEntrySelect={openFromCalendar}
          onRetry={() => void loadCalendar()}
          onAddRetry={() => void loadExperiences()}
        />
      )}

      <footer className="app-footer"><span>T &amp; R · {currentPlace.label}</span><p>位置和营业时间会变化，出发前请再确认。生腌等生食按各自身体状况选择。</p></footer>

      {modal === 'places' && (
        <ModalShell title="管理地方" onClose={() => setModal(null)}>
          <div className="place-manager">
            <div className="place-manager-list" aria-label="已有地方">
              {placeOptions.map((place) => (
                <button className="place-manager-item" type="button" aria-current={place.id === currentPlaceId ? 'true' : undefined} onClick={() => { selectPlace(place); setModal(null); }} key={place.id}>
                  <span>{place.label}</span>
                  <small>{filterExperiencesByPlace(experiences, place.id).length} 个地方</small>
                </button>
              ))}
            </div>
            <form className="place-manager-form" onSubmit={createPlace}>
              <label>添加地方<input value={newPlaceName} onChange={(event) => setNewPlaceName(event.target.value)} maxLength={40} autoComplete="off" required /></label>
              {actionError && <p className="form-error" role="alert">{actionError}</p>}
              <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>取消</button><button className="primary-action" type="submit" disabled={actionBusy || !newPlaceName.trim()}>{actionBusy ? '添加中…' : '确认'}</button></div>
            </form>
          </div>
        </ModalShell>
      )}

      {modal === 'quick-add' && (
        <ModalShell title="记下一处" onClose={() => setModal(null)}>
          <form className="modal-form quick-add-form" onSubmit={createExperience}>
            <div className="paste-link"><label>链接<input type="url" value={quickDraft.sourceUrl} onChange={(event) => { setQuickDraft({ ...quickDraft, sourceUrl: event.target.value }); setQuickPreview(null); setPreviewStatus('idle'); }} /></label><button type="button" onClick={() => void previewLink('quick')} disabled={!quickDraft.sourceUrl.trim() || previewStatus === 'loading'}>{previewStatus === 'loading' ? '读取中…' : '读取'}</button></div>
            <LinkPreviewCard preview={quickPreview} category={quickDraft.category} />
            <div className="form-grid">
              <label className="wide">名称<input value={quickDraft.name} onChange={(event) => setQuickDraft({ ...quickDraft, name: event.target.value })} required /></label>
              <label>类别<select value={quickDraft.category} onChange={(event) => setQuickDraft({ ...quickDraft, category: event.target.value as ExperienceCategory })}>{categoryOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
              <TagFields selection={quickTagSelection} customTag={quickDraft.tags} onSelectionChange={setQuickTagSelection} onCustomTagChange={(tags) => setQuickDraft({ ...quickDraft, tags })} />
              <label className="wide">地点 / 门牌<input value={quickDraft.address} onChange={(event) => setQuickDraft({ ...quickDraft, address: event.target.value })} placeholder="选填" /></label>
              <label>营业时间<input value={quickDraft.openingHours} onChange={(event) => setQuickDraft({ ...quickDraft, openingHours: event.target.value })} placeholder="选填" /></label>
              <label className="wide photo-upload"><input type="file" accept="image/*" capture="environment" aria-label="图片" onChange={(event) => chooseExperienceImage(event.target.files?.[0] ?? null, setQuickImageFile)} /><span>图片</span><small>{quickImageFile?.name ?? '选填'}</small></label>
              <label className="wide">想记的话<textarea rows={3} value={quickDraft.notes} onChange={(event) => setQuickDraft({ ...quickDraft, notes: event.target.value })} /></label>
            </div>
            {actionError && <p className="form-error" role="alert">{actionError}</p>}
            <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>取消</button><button className="primary-action" type="submit" disabled={actionBusy}>{actionBusy ? '保存中…' : '确认'}</button></div>
          </form>
        </ModalShell>
      )}

      {modal === 'edit' && selected && (
        <ModalShell eyebrow="编辑" title={selected.name} onClose={() => setModal(null)}>
          <form className="modal-form" onSubmit={updateExperience}>
            <div className="paste-link"><label>链接<input type="url" value={editDraft.sourceUrl} onChange={(event) => { setEditDraft({ ...editDraft, sourceUrl: event.target.value }); setEditPreview(null); setEditPreviewStatus('idle'); }} /></label><button type="button" onClick={() => void previewLink('edit')} disabled={!editDraft.sourceUrl.trim() || editPreviewStatus === 'loading'}>{editPreviewStatus === 'loading' ? '读取中…' : '读取'}</button></div>
            <LinkPreviewCard preview={editPreview} category={editDraft.category} />
            <div className="form-grid">
              <label className="wide">名称<input value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} required /></label>
              <label>类别<select value={editDraft.category} onChange={(event) => setEditDraft({ ...editDraft, category: event.target.value as ExperienceCategory })}>{categoryOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
              <TagFields selection={editTagSelection} customTag={editDraft.tags} onSelectionChange={setEditTagSelection} onCustomTagChange={(tags) => setEditDraft({ ...editDraft, tags })} />
              <label className="wide">地点 / 门牌<input value={editDraft.address} onChange={(event) => setEditDraft({ ...editDraft, address: event.target.value })} placeholder="选填" /></label>
              <label>营业时间<input value={editDraft.openingHours} onChange={(event) => setEditDraft({ ...editDraft, openingHours: event.target.value })} placeholder="选填" /></label>
              <label className="wide photo-upload"><input type="file" accept="image/*" capture="environment" aria-label="图片" onChange={(event) => chooseExperienceImage(event.target.files?.[0] ?? null, setEditImageFile)} /><span>图片</span><small>{editImageFile?.name ?? (selected.imageUrl ? '已保存' : '选填')}</small></label>
              <label className="wide">位置说明<textarea rows={2} value={editDraft.locationNote} onChange={(event) => setEditDraft({ ...editDraft, locationNote: event.target.value })} /></label>
              <label className="wide">想记的话<textarea rows={3} value={editDraft.notes} onChange={(event) => setEditDraft({ ...editDraft, notes: event.target.value })} /></label>
            </div>
            {actionError && <p className="form-error" role="alert">{actionError}</p>}
            <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>取消</button><button className="primary-action" type="submit" disabled={actionBusy}>{actionBusy ? '保存中…' : '确认'}</button></div>
          </form>
        </ModalShell>
      )}

      {modal === 'footprint' && (
        <ModalShell title="记下去过" onClose={() => setModal(null)}>
          <form className="modal-form footprint-form" onSubmit={savedFootprintId ? (event) => { event.preventDefault(); void retryFootprintUpload(); } : createFootprint}>
            <label>地点<select value={footprintExperienceId} onChange={(event) => setFootprintExperienceId(event.target.value)} disabled={Boolean(savedFootprintId)} required><option value="">选一个地方</option>{experiences.map((experience) => <option value={experience.id} key={experience.id}>{experience.name}</option>)}</select></label>
            <label>哪一天<input type="date" value={footprintDraft.visitedOn} onChange={(event) => setFootprintDraft({ ...footprintDraft, visitedOn: event.target.value })} disabled={Boolean(savedFootprintId)} required /></label>
            <fieldset><legend>这次几分</legend><div className="rating-row">{[1, 2, 3, 4, 5].map((rating) => <button type="button" aria-label={`${rating} 星`} className={footprintDraft.rating >= rating ? 'is-on' : ''} onClick={() => setFootprintDraft({ ...footprintDraft, rating })} key={rating}>★</button>)}</div></fieldset>
            <label>留几句<textarea rows={4} value={footprintDraft.comment} onChange={(event) => setFootprintDraft({ ...footprintDraft, comment: event.target.value })} disabled={Boolean(savedFootprintId)} placeholder="那天吃了什么、看见什么，还想再来吗？" /></label>
            <label className="photo-upload">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={Boolean(savedFootprintId)} onChange={(event) => {
                const picked = Array.from(event.target.files ?? []);
                const invalid = picked.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024);
                if (invalid || picked.length > 8) { setFootprintFiles([]); setActionError('最多 8 张；只收 JPEG、PNG、WebP，单张不超过 10MB。'); return; }
                setActionError(''); setFootprintFiles(picked);
              }} />
              <span>＋ 选择照片</span><small>JPEG / PNG / WebP · 最多 8 张 · 单张 10MB</small>
            </label>
            {footprintFiles.length > 0 && <div className="selected-files">{footprintFiles.map((file) => <span key={`${file.name}-${file.lastModified}`}>{file.name}</span>)}</div>}
            {actionError && <p className="form-error" role="alert">{actionError}</p>}
            <div className="modal-actions"><button type="button" onClick={() => { setModal(null); setSavedFootprintId(null); setFootprintExperienceId(''); setFootprintFiles([]); }}>{savedFootprintId ? '稍后再传' : '取消'}</button><button className="primary-action" type="submit" disabled={actionBusy || (!savedFootprintId && !footprintExperienceId)}>{actionBusy ? '正在保存…' : savedFootprintId ? '重试照片上传' : '记下这一天'}</button></div>
          </form>
        </ModalShell>
      )}

      {modal === 'footprint-history' && footprintHistoryExperience && (
        <ModalShell title={`去过「${footprintHistoryExperience.name}」`} onClose={() => setModal(null)}>
          <div className="footprint-history">
            {footprintHistoryStatus === 'loading' && <div className="inline-empty"><span className="ink-loader" aria-hidden="true" />正在读取…</div>}
            {footprintHistoryStatus === 'error' && <div className="inline-empty is-error"><p>{footprintHistoryError}</p><button type="button" onClick={() => void openFootprintHistory(footprintHistoryExperience.id, footprintHistoryExperience.name, focusedFootprintId)}>再试一次</button></div>}
            {footprintHistoryStatus === 'ready' && footprintHistory.length === 0 && <div className="inline-empty">还没有记录。</div>}
            {footprintHistoryStatus === 'ready' && footprintHistory.length > 0 && (
              <div className="footprint-history-list">
                {footprintHistory.map((record) => (
                  <article className={`footprint-record ${record.id === focusedFootprintId ? 'is-focused' : ''}`} aria-current={record.id === focusedFootprintId ? 'true' : undefined} aria-label={`${record.visitedOn} 的记录`} ref={record.id === focusedFootprintId ? focusedFootprintRecordRef : null} tabIndex={record.id === focusedFootprintId ? -1 : undefined} key={record.id}>
                    <header>
                      <div><time dateTime={record.visitedOn}>{record.visitedOn}</time><span>{record.member.name} 记下</span></div>
                      <div className="footprint-record-controls"><strong aria-label={record.rating ? `${record.rating} 星` : '未评分'}>{record.rating ? `${'★'.repeat(record.rating)}${'☆'.repeat(5 - record.rating)}` : '未评分'}</strong><button type="button" disabled={Boolean(deletingFootprintId)} aria-label={`删除 ${record.visitedOn} 的记录`} onClick={() => window.confirm(`删掉 ${record.visitedOn} 的“去过”记录吗？`) && void deleteFootprint(record.id)}>{deletingFootprintId === record.id ? '删除中…' : '删除这次'}</button></div>
                    </header>
                    {record.comment && <p>{record.comment}</p>}
                    {record.media.length > 0 && <div className="footprint-media">{record.media.map((media, index) => <Image src={media.url} alt={`${footprintHistoryExperience.name} ${record.visitedOn} 的照片 ${index + 1}`} width={360} height={240} unoptimized key={media.id} />)}</div>}
                  </article>
                ))}
              </div>
            )}
            {actionError && <p className="form-error" role="alert">{actionError}</p>}
          </div>
        </ModalShell>
      )}

      {modal === 'plan' && (
        <ModalShell title="约一天" onClose={() => setModal(null)}>
          <form className="modal-form plan-form" onSubmit={createPlan}>
            <div className="invite-pair"><AvatarSlot member={session?.member ?? memberFallbacks[0]} active /><i>→</i><AvatarSlot member={members.find((member) => member.id !== session?.member?.id) ?? memberFallbacks[1]} /></div>
            <label>地点<select value={planExperienceId} onChange={(event) => setPlanExperienceId(event.target.value)} required><option value="">选一个地方</option>{experiences.map((experience) => <option value={experience.id} key={experience.id}>{experience.name}</option>)}</select></label>
            <label>日期<input type="date" min={today} value={planDraft.date} onChange={(event) => setPlanDraft({ ...planDraft, date: event.target.value })} required /></label>
            <label>时间<input type="time" value={planDraft.time} onChange={(event) => setPlanDraft({ ...planDraft, time: event.target.value })} required /></label>
            <label>捎一句<textarea rows={3} value={planDraft.note} onChange={(event) => setPlanDraft({ ...planDraft, note: event.target.value })} placeholder="比如：周末晚一点去，避开排队？" /></label>
            {actionError && <p className="form-error" role="alert">{actionError}</p>}
            <div className="modal-actions"><button type="button" onClick={() => { setModal(null); setPlanExperienceId(''); }}>取消</button><button className="primary-action" type="submit" disabled={actionBusy || !planExperienceId || !planDraft.date || !planDraft.time}>{actionBusy ? '正在送出…' : '送出邀请'}</button></div>
          </form>
        </ModalShell>
      )}

      {modal === 'legacy' && (
        <ModalShell eyebrow="旧记录" title="把以前的食后记带过来。" onClose={() => setModal(null)}>
          <div className="legacy-import">
            <div className="legacy-count"><strong>{legacyItems.length}</strong><span>条旧记录</span></div>
            <p>导入不会影响原来的记录。请先补上到访日期。</p>
            <label>统一补日期（可选）<input type="date" value={legacyDate} onChange={(event) => setLegacyDate(event.target.value)} /></label>
            {legacyItems.length > 0 && (
              <div className="legacy-items">
                {legacyItems.map((item) => (
                  <article className="legacy-item" key={item.experienceId}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.rating ? `${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}` : '未评分'}</span>
                      {item.comment && <p>{item.comment}</p>}
                    </div>
                    <label>
                      <span>到访日期</span>
                      <input
                        aria-label={`${item.name} 到访日期`}
                        type="date"
                        value={item.visitedOn || legacyDate}
                        onChange={(event) => setLegacyItems((current) => current.map((entry) => entry.experienceId === item.experienceId ? { ...entry, visitedOn: event.target.value } : entry))}
                        required
                      />
                    </label>
                  </article>
                ))}
              </div>
            )}
            {legacyItems.length === 0 && <div className="inline-empty">这台设备上没有能带过来的旧记录。</div>}
            {actionError && <p className="form-error" role="alert">{actionError}</p>}
            <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>暂不导入</button><button className="primary-action" type="button" disabled={actionBusy || legacyItems.length === 0 || legacyItems.some((item) => !item.visitedOn && !legacyDate)} onClick={() => void importLegacy()}>{actionBusy ? '正在导入…' : '导入这些记录'}</button></div>
          </div>
        </ModalShell>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
