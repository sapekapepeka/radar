import { useRef, useState, useEffect } from "react";
import { getRadarPosition, getTeamColor, ME_COLOR } from "../utilities/utilities";

const DEAD_NAME_DURATION = 4000;

let playerRotations = [];
const calculatePlayerRotation = (playerData) => {
  const playerViewAngle = 270 - playerData.m_eye_angle;
  const idx = playerData.m_idx;

  playerRotations[idx] = (playerRotations[idx] || 0) % 360;
  playerRotations[idx] +=
    ((playerViewAngle - playerRotations[idx] + 540) % 360) - 180;

  return playerRotations[idx];
};

const Player = ({
  playerData,
  mapData,
  radarImage,
  localTeam,
  settings,
  selected,
  onSelect,
  isMe,
}) => {
  const [lastKnownPosition, setLastKnownPosition] = useState(null);
  const [showDeadName, setShowDeadName] = useState(false);
  const radarPosition = getRadarPosition(mapData, playerData.m_position) || { x: 0, y: 0 };
  const invalidPosition = radarPosition.x <= 0 && radarPosition.y <= 0;

  const playerRef = useRef();
  // offsetWidth/Height are layout sizes, unaffected by the radar zoom transform
  const playerBounding = playerRef.current
    ? { width: playerRef.current.offsetWidth, height: playerRef.current.offsetHeight }
    : { width: 0, height: 0 };
  const playerRotation = calculatePlayerRotation(playerData);

  const radarImageBounding = radarImage
    ? { width: radarImage.offsetWidth, height: radarImage.offsetHeight }
    : { width: 0, height: 0 };

  const scaledSize = 0.7 * settings.dotSize;
  const dotSize = `clamp(12px, ${scaledSize}vw, 40px)`;
  const color = isMe ? ME_COLOR : getTeamColor(playerData.m_team);
  const health = playerData.m_health || 0;
  const healthColor = health > 50 ? `#3ddc84` : health > 25 ? `#f5b301` : `#ff4d4d`;
  const fovRange = settings.fovRange ?? 1;
  const fovOpacity = settings.fovOpacity ?? 1;

  // Store the last known position when the player dies
  useEffect(() => {
    if (playerData.m_is_dead) {
      if (!lastKnownPosition) {
        setLastKnownPosition(radarPosition);
      }
    } else {
      setLastKnownPosition(null);
    }
  }, [playerData.m_is_dead, radarPosition, lastKnownPosition]);

  // Show the name next to the death marker for a few seconds
  useEffect(() => {
    if (!playerData.m_is_dead) {
      setShowDeadName(false);
      return;
    }
    setShowDeadName(true);
    const timeout = setTimeout(() => setShowDeadName(false), DEAD_NAME_DURATION);
    return () => clearTimeout(timeout);
  }, [playerData.m_is_dead]);

  const effectivePosition = playerData.m_is_dead ? lastKnownPosition || { x: 0, y: 0 } : radarPosition;

  const radarImageTranslation = {
    x: radarImageBounding.width * effectivePosition.x - playerBounding.width * 0.5,
    y: radarImageBounding.height * effectivePosition.y - playerBounding.height * 0.5,
  };

  const alive = !playerData.m_is_dead && !invalidPosition;
  const showName =
    (alive && ((settings.showNames ?? true) || selected || isMe)) ||
    (playerData.m_is_dead && showDeadName);

  return (
    <div
      className={`absolute origin-center rounded-[100%] left-0 top-0 cursor-pointer`}
      ref={playerRef}
      onClick={() => onSelect && onSelect(playerData.m_idx)}
      style={{
        width: dotSize,
        height: dotSize,
        transform: `translate(${radarImageTranslation.x}px, ${radarImageTranslation.y}px)`,
        transition: `transform 100ms linear`,
        zIndex: `${(selected && `3`) || (isMe && `2`) || (playerData.m_is_dead && `0`) || `1`}`,
      }}
    >
      {/* "You" marker: steady green halo */}
      {isMe && alive && (
        <span
          className="absolute pointer-events-none rounded-full"
          style={{ inset: `-35%`, border: `2px solid ${ME_COLOR}`, boxShadow: `0 0 12px ${ME_COLOR}` }}
        />
      )}

      {/* Selection ring */}
      {selected && alive && (
        <span
          className="selection-ring absolute pointer-events-none"
          style={{ inset: `-45%`, borderColor: color }}
        />
      )}

      {/* Rotating container: field of view cone + dot */}
      <div
        style={{
          transform: `rotate(${(playerData.m_is_dead && `0`) || playerRotation}deg)`,
          width: dotSize,
          height: dotSize,
          transition: `transform 100ms linear`,
          opacity: `${(playerData.m_is_dead && `0.8`) || (invalidPosition && `0`) || `1`}`,
          WebkitMask: `${(playerData.m_is_dead && `url('./assets/icons/icon-enemy-death_png.png') no-repeat center / contain`) || `none`}`,
        }}
      >
        {/* Field of view (points "down" at 0deg: the eye angle is offset so 0deg = facing down) */}
        {!playerData.m_is_dead && fovOpacity > 0 && (
          <div
            className={`absolute pointer-events-none`}
            style={{
              width: `calc(${dotSize} * ${6 * fovRange})`,
              height: `calc(${dotSize} * ${6 * fovRange})`,
              left: `calc(${dotSize} * ${(1 - 6 * fovRange) / 2})`,
              top: `calc(${dotSize} * ${(1 - 6 * fovRange) / 2})`,
              clipPath: `polygon(50% 50%, 6% 100%, 94% 100%)`,
              background: `radial-gradient(circle at 50% 50%, ${color}cc 0%, ${color}22 75%, transparent 100%)`,
              opacity: fovOpacity,
            }}
          />
        )}

        {/* Player dot */}
        <div
          className={`relative w-full h-full rounded-full`}
          style={{
            backgroundColor: color,
            border: `1.5px solid rgba(255,255,255,0.9)`,
            boxShadow: `0 0 6px rgba(0,0,0,0.7)`,
          }}
        />
      </div>

      {/* Name above (not rotated) */}
      {showName && (
        <span
          className={`absolute left-1/2 bottom-full -translate-x-1/2 mb-[2px] whitespace-nowrap pointer-events-none font-semibold leading-none`}
          style={{
            color: playerData.m_is_dead ? color : `#fff`,
            fontSize: `clamp(8px, ${selected ? 0.95 : 0.75}vw, ${selected ? 16 : 13}px)`,
            textShadow: `0 0 3px #000, 0 0 3px #000, 0 1px 2px #000`,
            opacity: playerData.m_is_dead ? 0.85 : 1,
          }}
        >
          {playerData.m_name}
        </span>
      )}

      {/* Health bar below (not rotated) */}
      {alive && (
        <div
          className={`absolute left-1/2 top-full -translate-x-1/2 mt-[2px] rounded-full overflow-hidden pointer-events-none`}
          style={{ width: `calc(${dotSize} * 2)`, height: `max(3px, calc(${dotSize} * 0.22))`, backgroundColor: `rgba(0,0,0,0.6)` }}
        >
          <div
            className={`h-full`}
            style={{
              width: `${Math.max(0, Math.min(100, health))}%`,
              backgroundColor: healthColor,
              transition: `width 150ms linear`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Player;
