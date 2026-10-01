import { getTeamColor } from "../utilities/utilities";

const teamTitles = {
  2: "Terroristas",
  3: "Counter-Terroristas",
};

const IdentityPicker = ({ players, currentKey, getKey, onPick, onSkip, onClose }) => {
  const teams = [2, 3];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass w-full max-w-lg max-h-full overflow-y-auto rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="text-center mb-5">
          <div className="logo-mark mx-auto mb-3" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <h2 className="brand-text m-0 text-2xl font-bold">Quem é você?</h2>
          <p className="m-0 mt-1 text-sm text-radar-secondary">
            Escolha seu jogador para aparecer em verde no radar.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {teams.map((team) => {
            const teamPlayers = players.filter((player) => player.m_team == team);
            if (!teamPlayers.length) return null;
            const color = getTeamColor(team);

            return (
              <section key={team}>
                <h3
                  className="m-0 mb-2 text-xs font-semibold uppercase tracking-[0.2em]"
                  style={{ color }}
                >
                  {teamTitles[team]}
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 m-0 p-0">
                  {teamPlayers.map((player) => {
                    const chosen = getKey(player) === currentKey;
                    return (
                      <li key={player.m_idx} className="list-none">
                        <button
                          type="button"
                          onClick={() => onPick(player)}
                          className="w-full flex items-center gap-3 rounded-2xl border px-3 py-2 text-left cursor-pointer card-glass hover:brightness-125"
                          style={{
                            borderColor: chosen ? `#22c55e` : `${color}55`,
                            boxShadow: chosen ? `0 0 16px #22c55e55` : `none`,
                          }}
                        >
                          <span
                            className="shrink-0 w-11 h-11 rounded-xl overflow-hidden border"
                            style={{
                              borderColor: `${color}55`,
                              background: `linear-gradient(160deg, ${color}22, rgba(0,0,0,0.5))`,
                            }}
                          >
                            <img
                              className="w-full h-full object-cover object-top"
                              src={`./assets/characters/${player.m_model_name}.png`}
                              onError={(event) => (event.currentTarget.style.display = "none")}
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate font-semibold text-white">
                            {player.m_name}
                          </span>
                          {chosen && <span className="text-xs text-green-400">você</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            onClick={onSkip}
            className="text-radar-secondary hover:text-white cursor-pointer bg-transparent border-0"
          >
            Só assistir
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-radar-secondary hover:text-white cursor-pointer bg-transparent border-0"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdentityPicker;
