'use client';

import Image from 'next/image';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  DEFAULT_PET_DOCK_SETTINGS,
  PET_OUTFIT_CUSTOMIZATION_ENABLED,
  defaultPetVisibility,
  normalizePointerVector,
  parsePetDockSettings,
  petFrameDuration,
  petVisibilityAfterCharacterClick,
  petVisibilityAfterToggle,
  selectAmbientPetFrame,
  shouldAnimatePetPair,
  type PetDockSettings,
  type PetFrame,
  type PetMemberId,
  type PetOutfitPreset,
  type PetPose,
  type PetVisibility,
  type Point,
} from './mouse-follower-pet';

const PET_DOCK_STORAGE_KEY = 'toni-rosalie-pet-dock-v1';

const PETS = {
  toni: {
    name: 'Toni',
    avatar: '/avatars/toni-avatar-v2.png',
    frames: [
      { frame: 'idle', src: '/pets/toni/idle.png', width: 389, height: 1458 },
      { frame: 'blink', src: '/pets/toni/blink.png', width: 392, height: 1458 },
      { frame: 'glance', src: '/pets/toni/glance.png', width: 399, height: 1458 },
      { frame: 'wave', src: '/pets/toni/wave.png', width: 455, height: 1458 },
    ],
    poses: {
      profile: { src: '/pets/toni/profile.png', width: 1024, height: 1536 },
      crouch: { src: '/pets/toni/crouch.png', width: 1024, height: 1536 },
      sit: { src: '/pets/toni/sit.png', width: 1024, height: 1536 },
    },
  },
  rosalie: {
    name: 'Rosalie',
    avatar: '/avatars/rosalie-avatar-v3.png',
    frames: [
      { frame: 'idle', src: '/pets/rosalie/idle.png', width: 328, height: 1452 },
      { frame: 'blink', src: '/pets/rosalie/blink.png', width: 321, height: 1452 },
      { frame: 'glance', src: '/pets/rosalie/glance.png', width: 328, height: 1452 },
      { frame: 'wave', src: '/pets/rosalie/wave.png', width: 354, height: 1452 },
    ],
    poses: {
      profile: { src: '/pets/rosalie/profile.png', width: 858, height: 1833 },
      crouch: { src: '/pets/rosalie/crouch.png', width: 1023, height: 1537 },
      sit: { src: '/pets/rosalie/sit.png', width: 927, height: 1696 },
    },
  },
} as const;

const POSE_OPTIONS: ReadonlyArray<{ value: PetPose; label: string; mark: string }> = [
  { value: 'stand', label: '站立', mark: '站' },
  { value: 'profile', label: '侧身', mark: '侧' },
  { value: 'crouch', label: '蹲下', mark: '蹲' },
  { value: 'sit', label: '坐下', mark: '坐' },
];

const OUTFIT_OPTIONS: ReadonlyArray<{ value: PetOutfitPreset; label: string; note: string }> = [
  { value: 'classic', label: '原装', note: '经典' },
  { value: 'date', label: '约会', note: '领巾' },
  { value: 'weekend', label: '周末', note: '斜挎' },
  { value: 'field', label: '远足', note: '工装' },
];

const COLOR_SWATCHES = ['#b53b2f', '#2f6f8f', '#5f7047', '#d09b44', '#7a536c', '#222725'] as const;

type PetLooks = Pick<PetDockSettings, 'poses' | 'outfits'>;
type PetMotion = { current: Point; origin: Point };

function cloneLooks(settings: PetDockSettings): PetLooks {
  return {
    poses: { ...settings.poses },
    outfits: {
      toni: { ...settings.outfits.toni },
      rosalie: { ...settings.outfits.rosalie },
    },
  };
}

function CharacterSprite({
  memberId,
  pose,
  color,
}: Readonly<{
  memberId: PetMemberId;
  pose: PetPose;
  color: string;
}>) {
  const pet = PETS[memberId];
  const poseAsset = pose === 'stand' ? pet.frames[0] : pet.poses[pose];
  const maskSource = pose === 'stand' ? `/pets/${memberId}/garment-mask.png` : poseAsset.src;
  const tintStyle = {
    '--pet-outfit-color': color,
    '--pet-mask-source': `url("${maskSource}")`,
  } as CSSProperties;

  return (
    <span className="mouse-follower-sprite">
      {pose === 'stand' ? pet.frames.map((asset) => (
        <Image
          className="mouse-follower-frame"
          data-pet-frame={asset.frame satisfies PetFrame}
          src={asset.src}
          width={asset.width}
          height={asset.height}
          sizes="112px"
          alt=""
          draggable="false"
          key={asset.frame}
        />
      )) : (
        <Image
          className="mouse-follower-pose-frame"
          src={poseAsset.src}
          width={poseAsset.width}
          height={poseAsset.height}
          sizes="(max-width: 1100px) 112px, 160px"
          alt=""
          draggable="false"
        />
      )}
      {PET_OUTFIT_CUSTOMIZATION_ENABLED && (
        <>
          <span className="pet-garment-tint" style={tintStyle} aria-hidden="true" />
          <span className="pet-accessory pet-accessory-scarf" aria-hidden="true" />
          <span className="pet-accessory pet-accessory-strap" aria-hidden="true" />
          <span className="pet-accessory pet-accessory-bag" aria-hidden="true" />
          <span className="pet-accessory pet-accessory-patch" aria-hidden="true" />
        </>
      )}
    </span>
  );
}

export default function MouseFollowerPet({ currentMemberId }: Readonly<{ currentMemberId: PetMemberId }>) {
  const pairRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const [settings, setSettings] = useState<PetDockSettings>(DEFAULT_PET_DOCK_SETTINGS);
  const [visiblePets, setVisiblePets] = useState<PetVisibility>(() => defaultPetVisibility(currentMemberId));
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [wardrobeMember, setWardrobeMember] = useState<PetMemberId>(() => currentMemberId === 'toni' ? 'rosalie' : 'toni');
  const [draftLooks, setDraftLooks] = useState<PetLooks>(() => cloneLooks(DEFAULT_PET_DOCK_SETTINGS));

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      const restored = parsePetDockSettings(window.localStorage.getItem(PET_DOCK_STORAGE_KEY));
      const normalized = { ...restored, side: 'right' as const, position: null };
      setSettings(normalized);
      setDraftLooks(cloneLooks(normalized));
      hydratedRef.current = true;
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    window.localStorage.setItem(PET_DOCK_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const renderedLooks = wardrobeOpen ? draftLooks : settings;
  const visibleCount = Number(visiblePets.toni) + Number(visiblePets.rosalie);
  const hiddenPetName = visiblePets.toni ? PETS.rosalie.name : PETS.toni.name;

  useEffect(() => {
    const pair = pairRef.current;
    if (!pair || settings.collapsed) return;

    const characters = Array.from(pair.querySelectorAll<HTMLElement>('[data-pet-character]'));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const pointer = { x: 0, y: 0 };
    const motions: PetMotion[] = characters.map(() => ({ current: { x: 0, y: 0 }, origin: { x: 0, y: 0 } }));
    const ambientTimers = characters.map(() => 0);
    const resetTimers = characters.map(() => 0);
    let hasPointer = false;
    let animationFrame = 0;
    let reactionTimer = 0;

    const isAnimatedCharacter = (character: HTMLElement) => (
      character.dataset.visible === 'true' && character.dataset.pose === 'stand'
    );
    const clearCharacterTimer = (index: number) => {
      window.clearTimeout(ambientTimers[index]);
      window.clearTimeout(resetTimers[index]);
      ambientTimers[index] = 0;
      resetTimers[index] = 0;
    };
    const clearAllCharacterTimers = () => characters.forEach((_, index) => clearCharacterTimer(index));
    const scheduleAmbientFrame = (index: number, initial = false) => {
      const character = characters[index];
      if (!character || pair.dataset.motion !== 'active' || !isAnimatedCharacter(character)) return;
      window.clearTimeout(ambientTimers[index]);
      const delay = initial ? 1500 + index * 720 + Math.round(Math.random() * 900) : 3400 + Math.round(Math.random() * 2600);
      ambientTimers[index] = window.setTimeout(() => {
        const frame = selectAmbientPetFrame(Math.random());
        character.dataset.frame = frame;
        resetTimers[index] = window.setTimeout(() => {
          character.dataset.frame = 'idle';
          scheduleAmbientFrame(index);
        }, petFrameDuration(frame));
      }, delay);
    };
    const resetCharacterFrames = () => characters.forEach((character) => { character.dataset.frame = 'idle'; });
    const measureCharacters = () => characters.forEach((character, index) => {
      if (character.dataset.visible !== 'true') return;
      const bounds = character.getBoundingClientRect();
      motions[index].origin = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height * 0.12 };
    });
    const resetMotion = () => characters.forEach((character, index) => {
      motions[index].current = { x: 0, y: 0 };
      character.style.setProperty('--pet-look-x', '0');
      character.style.setProperty('--pet-look-y', '0');
      character.style.setProperty('--pet-near', '0');
    });
    const renderFrame = () => {
      const maxDistance = Math.min(window.innerWidth * 0.55, 720);
      characters.forEach((character, index) => {
        if (character.dataset.visible !== 'true') return;
        const target = hasPointer ? normalizePointerVector(pointer, motions[index].origin, maxDistance) : { x: 0, y: 0, proximity: 0 };
        const current = motions[index].current;
        const next = { x: current.x + (target.x - current.x) * 0.12, y: current.y + (target.y - current.y) * 0.12 };
        motions[index].current = next;
        character.style.setProperty('--pet-look-x', next.x.toFixed(4));
        character.style.setProperty('--pet-look-y', next.y.toFixed(4));
        character.style.setProperty('--pet-near', target.proximity.toFixed(4));
      });
      animationFrame = window.requestAnimationFrame(renderFrame);
    };
    const updateMotionPolicy = () => {
      const enabled = shouldAnimatePetPair({
        width: window.innerWidth,
        coarsePointer: coarsePointer.matches,
        reducedMotion: reducedMotion.matches,
      });
      pair.dataset.motion = enabled ? 'active' : 'still';
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      window.clearTimeout(reactionTimer);
      delete pair.dataset.reacting;
      clearAllCharacterTimers();
      resetCharacterFrames();
      if (enabled) {
        measureCharacters();
        animationFrame = window.requestAnimationFrame(renderFrame);
        characters.forEach((_, index) => scheduleAmbientFrame(index, true));
      } else {
        resetMotion();
      }
    };
    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      hasPointer = true;
    };
    const handleReaction = () => {
      if (pair.dataset.motion !== 'active') return;
      pair.dataset.reacting = 'true';
      clearAllCharacterTimers();
      characters.forEach((character) => {
        if (isAnimatedCharacter(character)) character.dataset.frame = 'wave';
      });
      window.clearTimeout(reactionTimer);
      reactionTimer = window.setTimeout(() => {
        delete pair.dataset.reacting;
        resetCharacterFrames();
        characters.forEach((_, index) => scheduleAmbientFrame(index));
      }, petFrameDuration('wave'));
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', updateMotionPolicy, { passive: true });
    reducedMotion.addEventListener('change', updateMotionPolicy);
    coarsePointer.addEventListener('change', updateMotionPolicy);
    pair.addEventListener('pet-react', handleReaction);
    updateMotionPolicy();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(reactionTimer);
      clearAllCharacterTimers();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', updateMotionPolicy);
      reducedMotion.removeEventListener('change', updateMotionPolicy);
      coarsePointer.removeEventListener('change', updateMotionPolicy);
      pair.removeEventListener('pet-react', handleReaction);
    };
  }, [settings.collapsed, visiblePets.toni, visiblePets.rosalie, renderedLooks.poses.toni, renderedLooks.poses.rosalie]);

  const openWardrobe = () => {
    setDraftLooks(cloneLooks(settings));
    setWardrobeOpen(true);
  };
  const saveWardrobe = () => {
    setSettings((current) => ({
      ...current,
      poses: { ...draftLooks.poses },
      outfits: {
        toni: { ...draftLooks.outfits.toni },
        rosalie: { ...draftLooks.outfits.rosalie },
      },
    }));
    setWardrobeOpen(false);
  };
  const closeWardrobe = () => {
    setDraftLooks(cloneLooks(settings));
    setWardrobeOpen(false);
  };
  const setPose = (pose: PetPose) => setDraftLooks((current) => ({
    ...current,
    poses: { ...current.poses, [wardrobeMember]: pose },
  }));
  const setPreset = (preset: PetOutfitPreset) => setDraftLooks((current) => ({
    ...current,
    outfits: { ...current.outfits, [wardrobeMember]: { ...current.outfits[wardrobeMember], preset } },
  }));
  const setOutfitColor = (color: string) => setDraftLooks((current) => ({
    ...current,
    outfits: { ...current.outfits, [wardrobeMember]: { ...current.outfits[wardrobeMember], color } },
  }));
  const handleCharacterClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (visibleCount === 1) {
      setVisiblePets((current) => petVisibilityAfterCharacterClick(current));
      return;
    }
    pairRef.current?.dispatchEvent(new Event('pet-react'));
  };

  const collapseDock = () => {
    setWardrobeOpen(false);
    setSettings((current) => ({ ...current, collapsed: true, side: 'right', position: null }));
  };

  const currentDraft = draftLooks.outfits[wardrobeMember];
  const dockClassName = `pet-dock is-right${settings.collapsed ? ' is-collapsed' : ''}`;

  return (
    <div className={dockClassName} data-side="right" ref={pairRef} data-motion="still">
      {settings.collapsed ? (
        <button
          className="pet-dock-handle"
          type="button"
          aria-label="展开 Toni 和 Rosalie"
          aria-expanded="false"
          onClick={() => setSettings((current) => ({ ...current, collapsed: false }))}
        >T<span>&amp;</span>R</button>
      ) : (
        <>
          <div className="pet-dock-toolbar" aria-label="宠物工具">
            <div className="pet-presence-controls" role="group" aria-label="显示人物">
              {(Object.keys(PETS) as PetMemberId[]).map((memberId) => {
                const pet = PETS[memberId];
                const isVisible = visiblePets[memberId];
                return (
                  <button
                    className="pet-presence-toggle"
                    type="button"
                    aria-label={`${isVisible ? '收起' : '叫来'} ${pet.name}`}
                    aria-pressed={isVisible}
                    title={`${isVisible ? '收起' : '叫来'} ${pet.name}`}
                    onClick={() => setVisiblePets((current) => petVisibilityAfterToggle(current, memberId))}
                    key={memberId}
                  >
                    <Image src={pet.avatar} width={32} height={32} alt="" />
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={openWardrobe} aria-label="打开姿势选择" aria-expanded={wardrobeOpen} title="姿势">姿</button>
            <button type="button" onClick={collapseDock} aria-label="收起宠物到侧边" title="收起到侧边">—</button>
          </div>

          <div
            className="mouse-follower-pair"
            aria-label="Toni 和 Rosalie 像素小人"
          >
            {(Object.keys(PETS) as PetMemberId[]).map((memberId) => {
              const pet = PETS[memberId];
              const pose = renderedLooks.poses[memberId];
              const outfit = renderedLooks.outfits[memberId];
              const poseAsset = pose === 'stand' ? pet.frames[0] : pet.poses[pose];
              return (
                <figure
                  className="mouse-follower-character"
                  data-pet-character
                  data-member={memberId}
                  data-frame="idle"
                  data-outfit={outfit.preset}
                  data-pose={pose}
                  data-visible={visiblePets[memberId] ? 'true' : 'false'}
                  style={{ '--pet-aspect': `${poseAsset.width} / ${poseAsset.height}` } as CSSProperties}
                  hidden={!visiblePets[memberId]}
                  key={memberId}
                >
                  <button className="pet-character-button" type="button" onClick={handleCharacterClick} aria-label={visibleCount === 1 ? `叫来 ${hiddenPetName}` : `${pet.name} 打招呼`}>
                    <span className="mouse-follower-name">{pet.name}</span>
                    <CharacterSprite memberId={memberId} pose={pose} color={outfit.color} />
                  </button>
                  <button
                    className="pet-character-hide"
                    type="button"
                    aria-label={`暂时收起 ${pet.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setVisiblePets((current) => petVisibilityAfterToggle(current, memberId));
                    }}
                  >×</button>
                </figure>
              );
            })}
          </div>

          {wardrobeOpen && (
            <aside className="pet-wardrobe" role="dialog" aria-label="宠物姿势">
              <header><strong>姿势</strong><button type="button" onClick={closeWardrobe} aria-label="关闭姿势选择">×</button></header>
              <div className="pet-wardrobe-tabs" role="tablist" aria-label="选择人物">
                {(Object.keys(PETS) as PetMemberId[]).map((memberId) => (
                  <button type="button" role="tab" aria-selected={wardrobeMember === memberId} onClick={() => setWardrobeMember(memberId)} key={memberId}>
                    <Image src={PETS[memberId].avatar} width={44} height={44} alt="" />
                    <span>{PETS[memberId].name}</span>
                  </button>
                ))}
              </div>
              <section className="pet-wardrobe-section" aria-labelledby="pet-pose-label">
                <h3 id="pet-pose-label">姿势</h3>
                <div className="pet-pose-grid">
                  {POSE_OPTIONS.map((option) => (
                    <button type="button" aria-pressed={draftLooks.poses[wardrobeMember] === option.value} onClick={() => setPose(option.value)} key={option.value}>
                      <i aria-hidden="true">{option.mark}</i><span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </section>
              {PET_OUTFIT_CUSTOMIZATION_ENABLED && (
                <>
                  <section className="pet-wardrobe-section" aria-labelledby="pet-outfit-label">
                    <h3 id="pet-outfit-label">穿搭</h3>
                    <div className="pet-outfit-grid">
                      {OUTFIT_OPTIONS.map((option) => (
                        <button type="button" aria-pressed={currentDraft.preset === option.value} onClick={() => setPreset(option.value)} key={option.value}>
                          <i aria-hidden="true" style={{ backgroundColor: currentDraft.color }} /><span><strong>{option.label}</strong><small>{option.note}</small></span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="pet-wardrobe-section pet-color-section" aria-labelledby="pet-color-label">
                    <h3 id="pet-color-label">颜色</h3>
                    <div>
                      {COLOR_SWATCHES.map((color) => <button type="button" aria-label={`选择颜色 ${color}`} aria-pressed={currentDraft.color === color} style={{ backgroundColor: color }} onClick={() => setOutfitColor(color)} key={color} />)}
                      <label title="自选颜色"><span className="sr-only">自选颜色</span><input type="color" value={currentDraft.color} onChange={(event) => setOutfitColor(event.target.value)} /></label>
                    </div>
                  </section>
                </>
              )}
              <footer><button type="button" onClick={closeWardrobe}>取消</button><button className="pet-wardrobe-save" type="button" onClick={saveWardrobe}>保存</button></footer>
            </aside>
          )}
        </>
      )}
    </div>
  );
}
