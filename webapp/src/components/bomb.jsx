import { useRef } from "react";
import { getRadarPosition, teamEnum } from "../utilities/utilities";

const BOMB_TIMER = 40; // mp_c4timer default
const BOMB_RADIUS = 500; // game units

const Bomb = ({ bombData, mapData, radarImage, localTeam, settings }) => {
  const radarPosition = getRadarPosition(mapData, bombData);

  const bombRef = useRef();
  // offsetWidth/Height are layout sizes, unaffected by the radar zoom transform
  const bombBounding = bombRef.current
    ? { width: bombRef.current.offsetWidth, height: bombRef.current.offsetHeight }
    : { width: 0, height: 0 };

  const radarImageBounding = radarImage
    ? { width: radarImage.offsetWidth, height: radarImage.offsetHeight }
    : { width: 0, height: 0 };
  const radarImageTranslation = {
    x: radarImageBounding.width * radarPosition.x - bombBounding.width * 0.5,
    y: radarImageBounding.height * radarPosition.y - bombBounding.height * 0.5,
  };

  // Calculate bomb size based on settings
  const baseSize = 1.5; // Base size in vw
  const scaledSize = baseSize * settings.bombSize;

  const planted = bombData.m_blow_time > 0 && !bombData.m_is_defused;
  const validPosition = radarPosition.x > 0 || radarPosition.y > 0;
  const fraction = Math.max(0, Math.min(1, bombData.m_blow_time / BOMB_TIMER));
  const urgent = bombData.m_blow_time <= 10;
  const ringColor = bombData.m_is_defusing ? `#34d399` : urgent ? `#f43f5e` : `#fbbf24`;
  const damageDiameter = ((BOMB_RADIUS * 2) / mapData.scale / 1024) * 100;

  return (
    <>
      {planted && validPosition && (
        <>
          {/* Damage radius */}
          <div
            className="absolute pointer-events-none rounded-full"
            style={{
              left: `${radarPosition.x * 100}%`,
              top: `${radarPosition.y * 100}%`,
              width: `${damageDiameter}%`,
              aspectRatio: `1 / 1`,
              transform: `translate(-50%, -50%)`,
              border: `1px dashed rgba(244, 63, 94, 0.55)`,
              background: `radial-gradient(circle, rgba(244,63,94,0.04) 0%, rgba(244,63,94,0.16) 100%)`,
            }}
          />

          {/* Pulse + countdown ring */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${radarPosition.x * 100}%`,
              top: `${radarPosition.y * 100}%`,
              width: `clamp(30px, 4vw, 60px)`,
              aspectRatio: `1 / 1`,
              transform: `translate(-50%, -50%)`,
              zIndex: 1,
            }}
          >
            <span
              className="bomb-pulse absolute inset-0 rounded-full"
              style={{
                borderColor: ringColor,
                animationDuration: urgent ? `0.5s` : `1.1s`,
              }}
            />
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(${ringColor} ${fraction * 360}deg, rgba(255,255,255,0.15) 0deg)`,
                WebkitMask: `radial-gradient(circle, transparent 60%, #000 64%)`,
                mask: `radial-gradient(circle, transparent 60%, #000 64%)`,
              }}
            />
          </div>
        </>
      )}

      <div
        className={`absolute origin-center rounded-[100%] left-0 top-0`}
        ref={bombRef}
        style={{
          width: `${scaledSize}vw`,
          height: `${scaledSize}vw`,
          transform: `translate(${radarImageTranslation.x}px, ${radarImageTranslation.y}px)`,
          backgroundColor: `${
            (bombData.m_is_defused && `#50904c`) ||
            (localTeam == teamEnum.counterTerrorist && `#6492b4`) ||
            `#c90b0b`
          }`,
          WebkitMask: `url('./assets/icons/c4_sml.png') no-repeat center / contain`,
          opacity: `1`,
          zIndex: `1`,
        }}
      />
    </>
  );
};

export default Bomb;
