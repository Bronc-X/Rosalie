/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { categories, restaurants, type Restaurant } from './restaurants';

type FoodLog = { rating: number; comment: string; visited: boolean };
type FoodLogs = Record<string, FoodLog>;

const emptyLog: FoodLog = { rating: 0, comment: '', visited: false };
const storageKey = 'shantou-food-log-v1';
function mapSearchUrl(restaurant: Restaurant) {
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}&city=汕头&view=map&src=shantou-food-atlas`;
}

function statusLabel(restaurant: Restaurant) {
  if (restaurant.status === 'avoid') return '莫去';
  return restaurant.coordinates ? '寻得到' : '门牌未定';
}

export default function FoodAtlas() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markerRefs = useRef(new Map<string, Leaflet.Marker>());
  const [mapReady, setMapReady] = useState(false);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [category, setCategory] = useState('全部');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(restaurants[0].id);
  const [logs, setLogs] = useState<FoodLogs>({});
  const [drafts, setDrafts] = useState<FoodLogs>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  const filteredRestaurants = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      const matchesCategory = category === '全部' || restaurant.category === category;
      const matchesQuery = !needle || `${restaurant.name}${restaurant.address}${restaurant.tip ?? ''}`.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const selected = restaurants.find((restaurant) => restaurant.id === selectedId) ?? restaurants[0];
  const locatedCount = restaurants.filter((restaurant) => restaurant.coordinates).length;
  const eatenCount = Object.values(logs).filter((log) => log.visited).length;
  const draft = drafts[selected.id] ?? logs[selected.id] ?? emptyLog;

  useEffect(() => {
    let hydrationTimer: number | undefined;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const storedLogs = JSON.parse(stored) as FoodLogs;
        hydrationTimer = window.setTimeout(() => setLogs(storedLogs), 0);
      }
    } catch { /* Keep the empty log when saved data is unreadable. */ }
    return () => {
      if (hydrationTimer) window.clearTimeout(hydrationTimer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let loadTimer: number | undefined;
    const markerRegistry = markerRefs.current;

    async function startMap() {
      if (!mapContainerRef.current || mapRef.current) return;
      try {
        const L = await import('leaflet');
        if (!active || !mapContainerRef.current) return;

        leafletRef.current = L;
        const map = L.map(mapContainerRef.current, {
          center: [23.3658, 116.712],
          zoom: 13,
          zoomControl: false,
          attributionControl: false,
        });
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.control.attribution({ prefix: false, position: 'bottomleft' }).addTo(map);
        const tiles = L.tileLayer('https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors · Tiles by HOT',
        }).addTo(map);
        const layer = L.layerGroup().addTo(map);
        mapRef.current = map;
        layerRef.current = layer;
        setMapReady(true);

        tiles.once('load', () => {
          if (!active) return;
          if (loadTimer) window.clearTimeout(loadTimer);
          setMapStatus('ready');
        });
        tiles.once('tileerror', () => {
          if (active) setMapStatus('error');
        });

        loadTimer = window.setTimeout(() => {
          if (active) setMapStatus('error');
        }, 12000);
      } catch {
        if (active) setMapStatus('error');
      }
    }

    void startMap();
    return () => {
      active = false;
      if (loadTimer) window.clearTimeout(loadTimer);
      markerRegistry.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!mapReady || !L || !map || !layer) return;

    layer.clearLayers();
    markerRefs.current.clear();

    filteredRestaurants.forEach((restaurant) => {
      if (!restaurant.coordinates) return;
      const number = Number(restaurant.id.split('-')[1]);
      const marker = L.marker(restaurant.coordinates, {
        icon: L.divIcon({
          className: 'food-map-marker-wrap',
          html: `<button type="button" class="food-map-marker ${restaurant.status === 'avoid' ? 'is-avoid' : ''}" aria-label="查看 ${restaurant.name}">${number}</button>`,
          iconSize: [34, 42],
          iconAnchor: [17, 38],
        }),
        title: restaurant.name,
      });
      const popup = document.createElement('div');
      popup.className = 'map-popup';
      const title = document.createElement('strong');
      title.textContent = restaurant.name;
      const address = document.createElement('span');
      address.textContent = restaurant.address;
      popup.appendChild(title);
      popup.appendChild(address);
      marker.bindPopup(popup, { offset: [0, -24], closeButton: false });
      marker.on('click', () => setSelectedId(restaurant.id));
      marker.addTo(layer);
      markerRefs.current.set(restaurant.id, marker);
    });

    const points = filteredRestaurants.flatMap((restaurant) => restaurant.coordinates ? [restaurant.coordinates] : []);
    const isUnfiltered = category === '全部' && !query.trim();
    const initialViewPoints = isUnfiltered
      ? points.filter(([latitude]) => latitude > 23.33)
      : points;
    if (initialViewPoints.length > 1) {
      map.fitBounds(initialViewPoints, { padding: [42, 42], maxZoom: 14 });
    } else if (initialViewPoints.length === 1) {
      map.flyTo(initialViewPoints[0], 15, { duration: .5 });
    }
  }, [category, filteredRestaurants, mapReady, query]);

  function focusRestaurant(restaurant: Restaurant) {
    setSelectedId(restaurant.id);
    if (restaurant.coordinates && mapRef.current) {
      mapRef.current.flyTo(restaurant.coordinates, 16, { duration: .65 });
      window.setTimeout(() => markerRefs.current.get(restaurant.id)?.openPopup(), 700);
    }
  }

  function updateDraft(patch: Partial<FoodLog>) {
    setDrafts((current) => ({
      ...current,
      [selected.id]: { ...(current[selected.id] ?? logs[selected.id] ?? emptyLog), ...patch },
    }));
    setSavedId(null);
  }

  function saveLog() {
    const next = { ...logs, [selected.id]: draft };
    setLogs(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setSavedId(selected.id);
    window.setTimeout(() => setSavedId((current) => current === selected.id ? null : current), 1800);
  }

  return (
    <main className="food-atlas">
      <header className="masthead">
        <div className="brand-mark" aria-hidden="true">汕</div>
        <div>
          <p className="eyebrow">汕头 · 家己人食单</p>
          <h1>你食未？<br />照这张慢慢食。</h1>
        </div>
        <div className="edition">{restaurants.length} 间<br />慢慢食</div>
      </header>

      <section className="hero-stats" aria-label="专辑概况">
        <div><span>{restaurants.length}</span><p>间<br />记在食单</p></div>
        <div><span>{locatedCount}</span><p>间<br />寻得到</p></div>
        <div><span>{eatenCount}</span><p>间<br />食过了</p></div>
        <p className="hero-note">门牌拿不准的先留空。临出门再寻一下，莫白行。</p>
      </section>

      <figure className="city-strip">
        <img src="/food/shantou-qilou-food-v1.webp" alt="雨后骑楼下摆着功夫茶、肠粉和铜锅的鮀城食路意象" />
        <figcaption>
          <p>雨歇了，坐落食杯茶</p>
          <h2>鼎滚肉熟，慢慢食。</h2>
          <span>这张是鮀城街头气氛图，不是哪一间店的实拍</span>
        </figcaption>
      </figure>

      <section className="feature-section" aria-labelledby="feature-heading">
        <div className="section-heading">
          <div><p>你发来的四张相片</p><h2 id="feature-heading">这四间先看</h2></div>
          <span>点相片，地图带路</span>
        </div>
        <div className="feature-grid">
          {restaurants.filter((restaurant) => restaurant.featuredDish).map((restaurant) => (
            <button className="feature-card" key={restaurant.id} onClick={() => focusRestaurant(restaurant)}>
              <img src={restaurant.image} alt={`${restaurant.name} · ${restaurant.featuredDish}`} />
              <span className="feature-number">{restaurant.id.replace('food-', '')}</span>
              <div><p>{restaurant.featuredDish}</p><h3>{restaurant.name}</h3></div>
            </button>
          ))}
        </div>
      </section>

      <section className="atlas-intro" id="atlas">
        <div><p>开源地图 · 家己人食单</p><h2>底间合你意？点开看</h2></div>
        <p>红点和店卡是同一张食单。食过就留几句，下次想再去，心内有数。</p>
      </section>

      <div className="filter-bar" aria-label="筛选餐厅">
        <label className="search-field">
          <span>寻店</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="店名、门牌、想食乜个" />
        </label>
        <div className="category-scroll">
          {categories.map((categoryName) => (
            <button key={categoryName} className={category === categoryName ? 'active' : ''} onClick={() => setCategory(categoryName)}>
              {categoryName}
            </button>
          ))}
        </div>
      </div>

      <section className="atlas-shell">
        <div className="map-column">
          <div className="map-frame">
            <div ref={mapContainerRef} className="leaflet-map" aria-label="汕头美食开源地图" />
            {mapStatus === 'loading' && <div className="map-state">地图正在来…</div>}
            {mapStatus === 'error' && <div className="map-state is-error"><strong>地图今次无出来</strong><span>店卡和带路照常用，刷新再来。</span></div>}
            <div className="map-legend"><span><i />寻得到</span><span><i className="avoid-dot" />莫去</span></div>
          </div>

          <article className={`selected-sheet ${selected.status === 'avoid' ? 'avoid-sheet' : ''}`}>
            <div className="selected-heading">
              <div>
                <span className="selected-index">{selected.id.replace('food-', '')}</span>
                <p>{selected.category} · {statusLabel(selected)}</p>
                <h3>{selected.name}</h3>
              </div>
              <a href={mapSearchUrl(selected)} target="_blank" rel="noreferrer">高德带路 ↗</a>
            </div>
            <p className="selected-address">{selected.address}</p>
            {selected.tip && <p className="selected-tip">{selected.tip}</p>}

            <div className="tasting-log">
              <div className="log-title"><strong>食过，记几句</strong><span>只留在这台电脑</span></div>
              <label className="visited-toggle"><input type="checkbox" checked={draft.visited} onChange={(event) => updateDraft({ visited: event.target.checked })} />食过</label>
              <fieldset>
                <legend>打几分</legend>
                <div className="star-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" className={draft.rating >= star ? 'filled' : ''} onClick={() => updateDraft({ rating: star })} aria-label={`${star} 星`}>★</button>
                  ))}
                </div>
              </fieldset>
              <label className="comment-field">食后记<textarea value={draft.comment} onChange={(event) => updateDraft({ comment: event.target.value })} placeholder="食了乜个？下次还来无？" rows={3} /></label>
              <button className="save-log" type="button" onClick={saveLog}>{savedId === selected.id ? '记好了 ✓' : '记下'}</button>
            </div>
          </article>
        </div>

        <div className="directory-column">
          <div className="directory-meta"><span>{filteredRestaurants.length} 间</span><p>{category === '全部' ? '全部食单' : category}</p></div>
          <div className="restaurant-grid">
            {filteredRestaurants.map((restaurant) => {
              const log = logs[restaurant.id];
              return (
                <article className={`restaurant-card ${selected.id === restaurant.id ? 'selected' : ''} ${restaurant.status === 'avoid' ? 'avoid-card' : ''}`} key={restaurant.id}>
                  <button className="restaurant-main" onClick={() => focusRestaurant(restaurant)}>
                    <div className={`restaurant-visual category-${restaurant.category.length}`}>
                      <img
                        src={restaurant.image}
                        alt={restaurant.imageKind === 'generated' ? `${restaurant.name}的菜品生成图` : `${restaurant.name}的真实照片`}
                        loading="lazy"
                      />
                      {restaurant.imageKind === 'generated'
                        ? <b className="thumbnail-label is-generated">生成图</b>
                        : <b className="thumbnail-label is-photo">实拍</b>}
                      <i>{restaurant.id.replace('food-', '')}</i>
                    </div>
                    <div className="restaurant-copy">
                      <div className="card-labels"><span>{restaurant.category}</span><em className={restaurant.status}>{statusLabel(restaurant)}</em></div>
                      <h3>{restaurant.name}</h3>
                      <p>{restaurant.address}</p>
                      {restaurant.tip && <small>{restaurant.tip}</small>}
                    </div>
                  </button>
                  <div className="restaurant-foot">
                    <span>{log?.visited ? `食过${log.rating ? ` · ${log.rating}星` : ''}` : '未食'}</span>
                    <a href={mapSearchUrl(restaurant)} target="_blank" rel="noreferrer">带路 ↗</a>
                  </div>
                </article>
              );
            })}
          </div>
          {filteredRestaurants.length === 0 && <div className="empty-state"><strong>寻无这间</strong><p>换个字再寻，或者点“全部”。</p></div>}
        </div>
      </section>

      <footer className="food-footer"><span>汕头食单</span><p>门牌和营业时间会变，出发前再寻一下；生腌是生食，按自己身体情况来。</p></footer>
    </main>
  );
}
