/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

import {
  ROUTE_OBSTACLES,
  ROUTE_START,
  ROUTE_TARGET,
  advanceRouteGame,
  beginRouteGame,
  releaseRouteGame,
} from '@/lib/route-game.mjs';
import type { RouteGameState, RoutePoint } from '@/lib/route-game.mjs';

function RouteBlossom() {
  return (
    <span className="route-blossom" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
      <b />
    </span>
  );
}

export function RouteGame() {
  const [route, setRoute] = useState<RouteGameState | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingPointer = useRef<number | null>(null);
  const isPlaying = route?.status === 'playing';
  const displayedPoint = isPlaying
    ? route.points.at(-1) ?? ROUTE_START
    : route?.status === 'won'
      ? ROUTE_TARGET
      : ROUTE_START;

  function pointFromPointer(clientX: number, clientY: number): RoutePoint | null {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }

  function startDrawing(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary) return;
    event.preventDefault();
    draggingPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = 'true';
    setRoute(beginRouteGame());
  }

  function continueDrawing(event: ReactPointerEvent<HTMLButtonElement>) {
    if (draggingPointer.current !== event.pointerId) return;
    const point = pointFromPointer(event.clientX, event.clientY);
    if (!point) return;
    setRoute((current) => current ? advanceRouteGame(current, point) : current);
  }

  function finishDrawing(event: ReactPointerEvent<HTMLButtonElement>) {
    if (draggingPointer.current !== event.pointerId) return;
    draggingPointer.current = null;
    event.currentTarget.removeAttribute('data-dragging');
    setRoute((current) => current ? releaseRouteGame(current) : current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const movement: Record<string, RoutePoint> = {
      ArrowLeft: { x: -5, y: 0 },
      ArrowRight: { x: 5, y: 0 },
      ArrowUp: { x: 0, y: -5 },
      ArrowDown: { x: 0, y: 5 },
    };
    const delta = movement[event.key];
    if (!delta) return;
    event.preventDefault();
    setRoute((current) => {
      const active = current?.status === 'playing' ? current : beginRouteGame();
      const point = active.points.at(-1) ?? ROUTE_START;
      return advanceRouteGame(active, { x: point.x + delta.x, y: point.y + delta.y });
    });
  }

  const trail = route?.points.map((point) => `${point.x},${point.y}`).join(' ') ?? '';
  const statusCopy = route?.status === 'won'
    ? '路线通过。'
    : route?.status === 'lost'
      ? '未通过，重新画。'
      : '按住图标，一笔拖到樱花。';

  return (
    <section className={`route-game route-${route?.status ?? 'idle'}`} aria-labelledby="route-game-title">
      <div className="lab-game-heading">
        <p>DRAW LOOP · ONE STROKE</p>
        <h2 id="route-game-title">一笔通关</h2>
        <span>绕开工作，把小东西拖到 Rosalie。</span>
      </div>

      <div className="route-stage" ref={stageRef}>
        <p className="route-status" aria-live="polite">{statusCopy}</p>
        <svg className="route-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={trail} />
        </svg>

        <span className="route-name route-name-toni">Toni</span>
        <span className="route-name route-name-rosalie">Rosalie</span>
        <span
          className="route-start-dot"
          style={{ left: `${ROUTE_START.x}%`, top: `${ROUTE_START.y}%` }}
          aria-hidden="true"
        />
        <span
          className="route-target"
          style={{ left: `${ROUTE_TARGET.x}%`, top: `${ROUTE_TARGET.y}%` }}
          aria-hidden="true"
        >
          <RouteBlossom />
        </span>

        {ROUTE_OBSTACLES.map((obstacle) => (
          <span
            className="route-obstacle"
            key={obstacle.label}
            style={{
              left: `${obstacle.x}%`,
              top: `${obstacle.y}%`,
              width: `clamp(54px, ${obstacle.radius * 2}%, 92px)`,
            }}
            aria-hidden="true"
          >
            {obstacle.label}
          </span>
        ))}

        <button
          className="route-controller"
          type="button"
          aria-label="按住小图标画出一条避开工作并到达 Rosalie 的路线"
          style={{ '--route-x': `${displayedPoint.x}%`, '--route-y': `${displayedPoint.y}%` } as CSSProperties}
          onPointerDown={startDrawing}
          onPointerMove={continueDrawing}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          onLostPointerCapture={(event) => {
            draggingPointer.current = null;
            event.currentTarget.removeAttribute('data-dragging');
          }}
          onKeyDown={moveWithKeyboard}
        >
          <img src="/soft-pull-cursor.png" alt="" width={78} height={78} draggable="false" />
          <span>{route?.status === 'won' ? '已送达' : route?.status === 'lost' ? '按住重画' : isPlaying ? '别松手' : '从这里拉'}</span>
        </button>
      </div>
    </section>
  );
}
