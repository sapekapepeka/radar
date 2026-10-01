import { useRef, useState, useEffect } from "react";
import Player from "./player";
import Bomb from "./bomb";
import { callouts } from "../utilities/callouts";
import { getRadarPosition, getTeamColor } from "../utilities/utilities";

const TRAIL_DURATION = 3000;
const TRAIL_MIN_STEP = 0.002;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Keeps the zoomed layer covering the whole radar viewport
const clampView = (view, width, height) => {
  const z = clamp(view.z, MIN_ZOOM, MAX_ZOOM);
  return {
    z,
    x: clamp(view.x, width * (1 - z), 0),
    y: clamp(view.y, height * (1 - z), 0),
  };
};

const Radar = ({
  playerArray,
  radarImage,
  mapData,
  localTeam,
  bombData,
  settings,
  selectedId,
  onSelect,
  myIdx,
}) => {
  const containerRef = useRef();
  const radarImageRef = useRef();
  const trailsRef = useRef({});
  const lastPlayersRef = useRef(null);
  const pointersRef = useRef(new Map());
  const movedRef = useRef(0);
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });

  /* ---------- Zoom / pan ---------- */

  const zoomAt = (factor, cx, cy) => {
    const rect = containerRef.current.getBoundingClientRect();
    setView((prev) => {
      const z = clamp(prev.z * factor, MIN_ZOOM, MAX_ZOOM);
      const k = z / prev.z;
      return clampView(
        { z, x: cx - (cx - prev.x) * k, y: cy - (cy - prev.y) * k },
        rect.width,
        rect.height
      );
    });
  };

  const zoomFromCenter = (factor) => {
    const rect = containerRef.current.getBoundingClientRect();
    zoomAt(factor, rect.width / 2, rect.height / 2);
  };

  // Wheel zoom needs a non-passive listener to be able to preventDefault
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onWheel = (event) => {
      const rect = element.getBoundingClientRect();
      if (event.deltaY < 0 || view.z > 1) event.preventDefault();
      zoomAt(
        event.deltaY < 0 ? 1.15 : 1 / 1.15,
        event.clientX - rect.left,
        event.clientY - rect.top
      );
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  });

  const onPointerDown = (event) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    movedRef.current = 0;
  };

  const onPointerMove = (event) => {
    const pointers = pointersRef.current;
    const previous = pointers.get(event.pointerId);
    if (!previous) return;

    const current = { x: event.clientX, y: event.clientY };
    const rect = containerRef.current.getBoundingClientRect();

    if (pointers.size === 1) {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      movedRef.current += Math.abs(dx) + Math.abs(dy);
      if (view.z > 1) {
        setView((prev) => clampView({ ...prev, x: prev.x + dx, y: prev.y + dy }, rect.width, rect.height));
      }
    } else if (pointers.size === 2) {
      const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)[1];
      const before = Math.hypot(previous.x - other.x, previous.y - other.y);
      const after = Math.hypot(current.x - other.x, current.y - other.y);
      movedRef.current += 10;
      if (before > 0) {
        zoomAt(
          after / before,
          (current.x + other.x) / 2 - rect.left,
          (current.y + other.y) / 2 - rect.top
        );
      }
    }

    pointers.set(event.pointerId, current);
  };

  const onPointerEnd = (event) => {
    pointersRef.current.delete(event.pointerId);
  };

  // A drag must not count as a click on a player
  const onClickCapture = (event) => {
    if (movedRef.current > 6) {
      event.stopPropagation();
      movedRef.current = 0;
    }
  };

  /* ---------- Movement trails ---------- */

  const now = Date.now();
  if (lastPlayersRef.current !== playerArray) {
    lastPlayersRef.current = playerArray;

    playerArray.forEach((player) => {
      const position = getRadarPosition(mapData, player.m_position) || { x: 0, y: 0 };
      const valid = position.x > 0 && position.y > 0 && !player.m_is_dead;

      if (!valid) {
        trailsRef.current[player.m_idx] = [];
        return;
      }

      const trail = (trailsRef.current[player.m_idx] ||= []);
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(position.x - last.x, position.y - last.y) > TRAIL_MIN_STEP) {
        trail.push({ x: position.x, y: position.y, t: now });
      }
      while (trail.length && trail[0].t < now - TRAIL_DURATION) trail.shift();
    });
  }

  const showTrails = settings.showTrails ?? true;

  return (
    <div
      id="radar"
      ref={containerRef}
      className={`relative overflow-hidden origin-center`}
      style={{ touchAction: view.z > 1 ? "none" : "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onClickCapture={onClickCapture}
      onDoubleClick={() => setView({ z: 1, x: 0, y: 0 })}
    >
      <div
        className="relative w-full"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
          transformOrigin: `0 0`,
        }}
      >
        <img ref={radarImageRef} className={`w-full h-auto select-none`} draggable={false} src={radarImage} />

        {(settings.showCallouts ?? true) && (callouts[mapData.name] || []).map((callout) => (
          <span
            key={`${callout.name}-${callout.x}`}
            className={`callout callout-${callout.size} ${callout.vertical ? "callout-vertical" : ""}`}
            style={{
              left: `${callout.x * 100}%`,
              top: `${callout.y * 100}%`,
              ...(callout.color && { color: callout.color }),
            }}
          >
            {callout.name}
          </span>
        ))}

        {showTrails && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
          >
            {playerArray.flatMap((player) => {
              const trail = trailsRef.current[player.m_idx] || [];
              const color = getTeamColor(player.m_team);
              return trail.slice(1).map((point, i) => {
                const from = trail[i];
                const opacity = 0.7 * (1 - (now - point.t) / TRAIL_DURATION);
                if (opacity <= 0) return null;
                return (
                  <line
                    key={`${player.m_idx}-${point.t}`}
                    x1={from.x}
                    y1={from.y}
                    x2={point.x}
                    y2={point.y}
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={opacity}
                  />
                );
              });
            })}
          </svg>
        )}

        {bombData && (
          <Bomb
            bombData={bombData}
            mapData={mapData}
            radarImage={radarImageRef.current}
            localTeam={localTeam}
            settings={settings}
          />
        )}

        {playerArray.map((player) => (
          <Player
            key={player.m_idx}
            playerData={player}
            mapData={mapData}
            radarImage={radarImageRef.current}
            localTeam={localTeam}
            settings={settings}
            selected={selectedId === player.m_idx}
            onSelect={onSelect}
            isMe={myIdx === player.m_idx}
          />
        ))}
      </div>

      {/* Zoom controls */}
      <div
        className="absolute bottom-2 right-2 z-20 flex flex-col gap-1"
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <button className="zoom-btn" onClick={() => zoomFromCenter(1.4)} title="Aproximar">+</button>
        <button className="zoom-btn" onClick={() => zoomFromCenter(1 / 1.4)} title="Afastar">−</button>
        {view.z > 1 && (
          <button className="zoom-btn" onClick={() => setView({ z: 1, x: 0, y: 0 })} title="Resetar zoom">⟲</button>
        )}
      </div>
    </div>
  );
};

export default Radar;
