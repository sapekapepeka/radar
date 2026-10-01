import { useState, useEffect } from "react";
import MaskedIcon from "./maskedicon";
import { getTeamColor, teamEnum, ME_COLOR } from "../utilities/utilities";

const utilityColors = {
  flashbang: "#22d3ee",
  smokegrenade: "#e5e7eb",
  hegrenade: "#f97316",
  molotov: "#fb923c",
  incgrenade: "#fb923c",
  decoy: "#34d399",
};

const Badge = ({ children }) => (
  <span className="flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/10 px-1.5 py-[1px] text-[10px] font-semibold text-amber-300">
    {children}
  </span>
);

const PlayerCard = ({ playerData, selected, onSelect, isMe }) => {
  const [modelName, setModelName] = useState(playerData.m_model_name);

  useEffect(() => {
    if (playerData.m_model_name)
      setModelName(playerData.m_model_name);
  }, [playerData.m_model_name]);

  const color = getTeamColor(playerData.m_team);
  const weapons = playerData.m_weapons || {};
  const active = weapons.m_active;
  const iconColor = (name) =>
    active == name ? `bg-radar-primary` : `bg-radar-secondary`;
  const utilities = weapons.m_utilities || [];
  const emptySlots = Math.max(4 - utilities.length, 0);
  const lowHealth = playerData.m_health <= 25;

  const hasBomb =
    playerData.m_team == teamEnum.terrorist && playerData.m_has_bomb;
  const hasDefuser =
    playerData.m_team == teamEnum.counterTerrorist && playerData.m_has_defuser;

  return (
    <li
      onClick={() => onSelect && onSelect(playerData.m_idx)}
      style={{
        "--team": color,
        opacity: `${(playerData.m_is_dead && `0.5`) || `1`}`,
        borderColor: selected ? color : `${color}66`,
        boxShadow: selected ? `0 0 0 1px ${color}, 0 0 22px ${color}55` : undefined,
      }}
      className={`list-none card-glass card-fx rounded-2xl border px-4 py-2 flex flex-col gap-1.5 cursor-pointer`}
    >
      {/* Header: name, badge, money */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-bold text-base truncate max-w-[9rem] text-white"
          >
            {playerData.m_name}
          </span>
          {isMe && (
            <span
              className="rounded-md px-1.5 py-[1px] text-[10px] font-bold"
              style={{ color: ME_COLOR, border: `1px solid ${ME_COLOR}88`, background: `${ME_COLOR}18` }}
            >
              VOCÊ
            </span>
          )}
          <a
            href={`https://steamcommunity.com/profiles/${playerData.m_steam_id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir perfil na Steam"
            onClick={(e) => e.stopPropagation()}
            className="text-radar-secondary hover:text-white text-xs leading-none"
          >
            ↗
          </a>
          <div
            className="w-0 h-0 shrink-0 border-solid border-t-[9px] border-r-[6px] border-l-[6px] border-r-transparent border-l-transparent"
            style={{ borderTopColor: color }}
          />
          {hasBomb && (
            <Badge>
              <MaskedIcon path={`./assets/icons/c4.svg`} height={10} color={`bg-amber-300`} />
              C4
            </Badge>
          )}
          {hasDefuser && (
            <Badge>
              <MaskedIcon path={`./assets/icons/defuser.svg`} height={10} color={`bg-amber-300`} />
              KIT
            </Badge>
          )}
        </div>
        <span className="font-bold text-radar-green tabular-nums">
          ${playerData.m_money}
        </span>
      </div>

      <div className="flex gap-3 items-center">
        {/* Portrait */}
        <div
          className="shrink-0 w-[3.75rem] h-[3.75rem] rounded-xl overflow-hidden border"
          style={{ borderColor: `${color}55`, background: `linear-gradient(160deg, ${color}22, rgba(0,0,0,0.5))` }}
        >
          <img
            className="w-full h-full object-cover object-top"
            src={`./assets/characters/${modelName}.png`}
          />
        </div>

        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {/* Health / armor */}
          <div className="flex items-center gap-4 font-bold tabular-nums">
            <div className="flex items-center gap-1.5" style={{ color: lowHealth ? `#fb7185` : `#e4d9ff` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#a78bfa">
                <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
              </svg>
              <span>{playerData.m_health}</span>
            </div>
            <div className="flex items-center gap-1.5 text-radar-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill={playerData.m_has_helmet ? `#9f86e0` : `none`} stroke="#9f86e0" strokeWidth="2" strokeLinejoin="round">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
              </svg>
              <span>{playerData.m_armor}</span>
            </div>
          </div>

          {/* Health bar */}
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, playerData.m_health || 0))}%`,
                background: lowHealth
                  ? `linear-gradient(90deg, #f43f5e, #fb7185)`
                  : `linear-gradient(90deg, ${color}, #c4b5fd)`,
                boxShadow: `0 0 8px ${lowHealth ? `#f43f5e` : color}`,
                transition: `width 0.3s ease`,
              }}
            />
          </div>

          {/* Weapons */}
          <div className="flex items-center gap-3 h-5">
            {weapons.m_primary && (
              <MaskedIcon
                path={`./assets/icons/${weapons.m_primary}.svg`}
                height={18}
                color={iconColor(weapons.m_primary)}
              />
            )}
            {weapons.m_secondary && (
              <MaskedIcon
                path={`./assets/icons/${weapons.m_secondary}.svg`}
                height={22}
                color={iconColor(weapons.m_secondary)}
              />
            )}
            {weapons.m_melee &&
              weapons.m_melee.map((melee) => (
                <MaskedIcon
                  key={melee}
                  path={`./assets/icons/${melee}.svg`}
                  height={22}
                  color={iconColor(melee)}
                />
              ))}
          </div>

          {/* Utilities */}
          <div className="flex items-center gap-1.5">
            {utilities.map((utility, i) => (
              <span
                key={`${utility}-${i}`}
                title={utility}
                className="w-[10px] h-[10px] rounded-full"
                style={{
                  backgroundColor: utilityColors[utility] || `#e4d9ff`,
                  boxShadow: active == utility ? `0 0 0 2px rgba(255,255,255,0.8)` : `none`,
                }}
              />
            ))}
            {[...Array(emptySlots)].map((_, i) => (
              <span key={i} className="w-[10px] h-[10px] rounded-full bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    </li>
  );
};

export const PlayerChip = ({ playerData, selected, onSelect, isMe }) => {
  const color = getTeamColor(playerData.m_team);
  const health = Math.max(0, Math.min(100, playerData.m_health || 0));

  return (
    <li
      onClick={() => onSelect && onSelect(playerData.m_idx)}
      className={`list-none min-w-0 card-glass card-fx rounded-xl border px-1.5 py-1 flex flex-col gap-1 cursor-pointer`}
      style={{
        "--team": isMe ? ME_COLOR : color,
        borderColor: selected ? color : `${color}66`,
        boxShadow: selected ? `0 0 0 1px ${color}, 0 0 14px ${color}66` : undefined,
        opacity: playerData.m_is_dead ? 0.45 : 1,
      }}
    >
      <span className="truncate text-[11px] font-semibold" style={{ color: isMe ? ME_COLOR : color }}>
        {isMe ? `★ ` : ``}{playerData.m_name}
      </span>
      <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${health}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-radar-primary">
        <span>{playerData.m_is_dead ? "✕" : health}</span>
        <span className="text-radar-green">${playerData.m_money}</span>
      </div>
    </li>
  );
};

export default PlayerCard;
