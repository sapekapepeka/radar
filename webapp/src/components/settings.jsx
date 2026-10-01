import { useState } from "react";

const Slider = ({ label, value, min, max, step, suffix, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-radar-secondary text-sm">{label}</span>
        <span className="text-radar-primary text-sm font-mono">{Number(value).toFixed(1)}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-violet-400"
        style={{
          background: `linear-gradient(to right, #a78bfa ${pct}%, rgba(167, 139, 250, 0.2) ${pct}%)`,
        }}
      />
    </div>
  );
};

const Toggle = ({ label, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="w-full flex items-center justify-between text-sm cursor-pointer"
  >
    <span className="text-radar-secondary">{label}</span>
    <span
      className="relative w-9 h-5 rounded-full transition-colors"
      style={{ backgroundColor: checked ? "#8b5cf6" : "rgba(167, 139, 250, 0.2)" }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: checked ? "18px" : "2px" }}
      />
    </span>
  </button>
);

const SettingsButton = ({ settings, onSettingsChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass glass-btn flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-radar-primary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span className="hidden sm:inline">Configurações</span>
      </button>

      {isOpen && (
        <div className="glass absolute right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-2xl p-4 shadow-2xl">
          <h3 className="text-radar-primary text-lg font-semibold mb-4">Ajustes do radar</h3>

          <div className="space-y-3">
            <Slider label="Tamanho dos jogadores" value={settings.dotSize} min={1} max={2} step={0.1} suffix="x"
              onChange={(v) => onSettingsChange({ ...settings, dotSize: v })} />
            <Slider label="Tamanho da bomba" value={settings.bombSize} min={0.5} max={1.5} step={0.1} suffix="x"
              onChange={(v) => onSettingsChange({ ...settings, bombSize: v })} />
            <Slider label="Alcance da visão" value={settings.fovRange ?? 1} min={0.5} max={2} step={0.1} suffix="x"
              onChange={(v) => onSettingsChange({ ...settings, fovRange: v })} />
            <Slider label="Opacidade da visão" value={settings.fovOpacity ?? 1} min={0} max={1} step={0.1} suffix=""
              onChange={(v) => onSettingsChange({ ...settings, fovOpacity: v })} />

            <Toggle label="Nomes dos jogadores" checked={settings.showNames ?? true}
              onChange={(v) => onSettingsChange({ ...settings, showNames: v })} />
            <Toggle label="Rastro de movimento" checked={settings.showTrails ?? true}
              onChange={(v) => onSettingsChange({ ...settings, showTrails: v })} />
            <Toggle label="Feed de baixas" checked={settings.showFeed ?? true}
              onChange={(v) => onSettingsChange({ ...settings, showFeed: v })} />
            <Toggle label="Nomes dos lugares" checked={settings.showCallouts ?? true}
              onChange={(v) => onSettingsChange({ ...settings, showCallouts: v })} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsButton;
