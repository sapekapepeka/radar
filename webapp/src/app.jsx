```jsx
import ReactDOM from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import PlayerCard, { PlayerChip } from "./components/PlayerCard";
import Radar from "./components/Radar";
import SettingsButton from "./components/settings";
import MaskedIcon from "./components/maskedicon";
import IdentityPicker from "./components/identitypicker";
import { getTeamColor } from "./utilities/utilities";

const CONNECTION_TIMEOUT = 5000;

// Relay público
const RELAY_URL = "wss://radar-dgmk.onrender.com/cs2_webradar";

// Game ID vindo da URL
// Exemplo:
// https://radar-593.pages.dev/?game=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
const getGameIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("game")?.trim() || "";
};

const DEFAULT_SETTINGS = {
  dotSize: 1,
  bombSize: 0.5,
  fovRange: 1,
  fovOpacity: 1,
  showNames: true,
  showCallouts: true,
  showTrails: true,
  showFeed: true,
};

const loadSettings = () => {
  const savedSettings = localStorage.getItem("radarSettings");
  return savedSettings
    ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) }
    : DEFAULT_SETTINGS;
};

const ME_STORAGE_KEY = "radarMe";
const SKIP_STORAGE_KEY = "radarMeSkipped";

/* Stable identity for a player: steam id, or the name when there is none (bots) */
const getPlayerKey = (player) =>
  player.m_steam_id && String(player.m_steam_id) !== "0"
    ? String(player.m_steam_id)
    : `name:${player.m_name}`;

const App = () => {
  const [playerArray, setPlayerArray] = useState([]);
  const [mapData, setMapData] = useState();
  const [localTeam, setLocalTeam] = useState();
  const [bombData, setBombData] = useState();
  const [settings, setSettings] = useState(loadSettings());
  const [connected, setConnected] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [myKey, setMyKey] = useState(() =>
    localStorage.getItem(ME_STORAGE_KEY)
  );
  const [skipped, setSkipped] = useState(
    () => sessionStorage.getItem(SKIP_STORAGE_KEY) === "1"
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const gameId = getGameIdFromUrl();

  const me = playerArray.find(
    (player) => getPlayerKey(player) === myKey
  );

  const pickerVisible =
    pickerOpen || (playerArray.length > 0 && !me && !skipped);

  const pickIdentity = (player) => {
    const key = getPlayerKey(player);
    setMyKey(key);
    setSkipped(false);
    setPickerOpen(false);
    localStorage.setItem(ME_STORAGE_KEY, key);
    sessionStorage.removeItem(SKIP_STORAGE_KEY);
  };

  const skipIdentity = () => {
    setSkipped(true);
    setPickerOpen(false);
    sessionStorage.setItem(SKIP_STORAGE_KEY, "1");
  };

  const [feed, setFeed] = useState([]);
  const deadStateRef = useRef({});
  const [focusMode, setFocusMode] = useState(false);

  const handleSelect = (idx) =>
    setSelectedId((current) => (current === idx ? null : idx));

  const toggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);

    try {
      if (next && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (!next && document.fullscreenElement) {
        document.exitFullscreen();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Leave focus mode when the user exits fullscreen with the browser/OS
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setFocusMode(false);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Save settings to local storage whenever they change
  useEffect(() => {
    localStorage.setItem("radarSettings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let webSocket = null;
    let connectionTimeout = null;
    let cancelled = false;

    const getMessageElement = () =>
      document.getElementsByClassName("radar_message")[0];

    const setRadarMessage = (message) => {
      const element = getMessageElement();

      if (element) {
        element.textContent = message;
      }
    };

    const fetchData = async () => {
      /*
       * Sem Game ID não existe uma partida específica para assistir.
       *
       * Exemplo válido:
       * https://radar-593.pages.dev/?game=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
       */
      if (!gameId) {
        setConnected(false);
        setRadarMessage(
          "Game ID não informado. Abra o link da partida enviado pelo host."
        );
        return;
      }

      /*
       * O relay gera o Game ID automaticamente quando o usermode
       * conecta como host.
       *
       * O navegador entra como viewer usando:
       *
       * wss://radar-dgmk.onrender.com/cs2_webradar?role=viewer&game=GAME_ID
       */
      const webSocketURL =
        `${RELAY_URL}?role=viewer&game=${encodeURIComponent(gameId)}`;

      try {
        webSocket = new WebSocket(webSocketURL);
      } catch (error) {
        setRadarMessage(`Erro ao criar WebSocket: ${error}`);
        console.error(error);
        return;
      }

      connectionTimeout = setTimeout(() => {
        if (webSocket && webSocket.readyState !== WebSocket.OPEN) {
          webSocket.close();
        }
      }, CONNECTION_TIMEOUT);

      webSocket.onopen = () => {
        clearTimeout(connectionTimeout);

        if (cancelled) return;

        setConnected(true);

        setRadarMessage("Conectado! Aguardando dados do usermode");

        console.info(
          "connected to the web socket",
          webSocketURL
        );
      };

      webSocket.onclose = () => {
        clearTimeout(connectionTimeout);

        if (cancelled) return;

        setConnected(false);

        /*
         * Se a partida estiver rodando e o relay fechar a conexão,
         * mostramos uma mensagem genérica.
         */
        if (playerArray.length === 0) {
          setRadarMessage(
            "Desconectado do relay. Aguardando reconexão..."
          );
        }

        console.error("disconnected from the web socket");
      };

      webSocket.onerror = (error) => {
        clearTimeout(connectionTimeout);

        if (cancelled) return;

        setConnected(false);

        setRadarMessage(
          "Não foi possível conectar ao relay. Verifique o Game ID."
        );

        console.error("WebSocket error:", error);
      };

      webSocket.onmessage = async (event) => {
        if (cancelled) return;

        try {
          /*
           * Dependendo do navegador/configuração do WebSocket,
           * event.data pode ser string, Blob ou outro tipo.
           */
          let rawData;

          if (typeof event.data === "string") {
            rawData = event.data;
          } else if (event.data instanceof Blob) {
            rawData = await event.data.text();
          } else {
            rawData = String(event.data);
          }

          const message = JSON.parse(rawData);

          /*
           * ============================================
           * MENSAGENS DE CONTROLE DO RELAY
           * ============================================
           */

          // Viewer entrou na partida.
          if (message.type === "joined_game") {
            console.info(
              "Entrou na partida:",
              message.gameId
            );

            setConnected(true);

            setRadarMessage(
              "Conectado! Aguardando dados do usermode"
            );

            return;
          }

          // A partida terminou porque o host desconectou.
          if (message.type === "game_ended") {
            console.info(
              "A partida terminou:",
              message.gameId
            );

            setConnected(false);

            setRadarMessage(
              "A partida foi encerrada pelo host."
            );

            return;
          }

          // Erros enviados pelo relay.
          if (message.type === "error") {
            console.error(
              "Erro enviado pelo relay:",
              message.error
            );

            setConnected(false);

            if (message.error === "game_not_found") {
              setRadarMessage(
                "Game ID não encontrado. A partida pode ter terminado."
              );
            } else if (message.error === "game_id_required") {
              setRadarMessage(
                "Game ID não informado na URL."
              );
            } else {
              setRadarMessage(
                `Erro do relay: ${message.error || "erro desconhecido"}`
              );
            }

            return;
          }

          /*
           * ============================================
           * DADOS NORMAIS DO RADAR
           * ============================================
           *
           * O host envia f::m_data.dump().
           * Portanto, qualquer mensagem que não seja
           * uma mensagem de controle acima é tratada
           * como o JSON normal do radar.
           */

          if (!message || !Array.isArray(message.m_players)) {
            console.warn(
              "Mensagem WebSocket ignorada:",
              message
            );
            return;
          }

          const parsedData = message;

          // Death feed: a player that just switched from alive to dead
          const deaths = parsedData.m_players
            .filter(
              (player) =>
                player.m_is_dead &&
                deadStateRef.current[player.m_idx] === false
            )
            .map((player) => ({
              id: `${player.m_idx}-${Date.now()}`,
              name: player.m_name,
              team: player.m_team,
            }));

          parsedData.m_players.forEach((player) => {
            deadStateRef.current[player.m_idx] =
              !!player.m_is_dead;
          });

          if (deaths.length) {
            setFeed((current) =>
              [...current, ...deaths].slice(-5)
            );

            setTimeout(() => {
              setFeed((current) =>
                current.filter(
                  (entry) =>
                    !deaths.some(
                      (death) => death.id === entry.id
                    )
                )
              );
            }, 6000);
          }

          setPlayerArray(parsedData.m_players);
          setLocalTeam(parsedData.m_local_team);
          setBombData(parsedData.m_bomb);

          const map = parsedData.m_map;

          if (map !== "invalid" && map) {
            try {
              const mapResponse = await fetch(
                `data/${map}/data.json`
              );

              const mapJson = await mapResponse.json();

              if (!cancelled) {
                setMapData({
                  ...mapJson,
                  name: map,
                });
              }
            } catch (error) {
              console.error(
                `Erro ao carregar dados do mapa '${map}':`,
                error
              );
            }
          }
        } catch (error) {
          console.error(
            "Erro ao processar mensagem do WebSocket:",
            error
          );
        }
      };
    };

    fetchData();

    return () => {
      cancelled = true;

      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }

      if (webSocket) {
        webSocket.close();
      }
    };
  }, [gameId]);

  const terrorists = playerArray.filter(
    (player) => player.m_team == 2
  );

  const counterTerrorists = playerArray.filter(
    (player) => player.m_team == 3
  );

  const bombActive =
    bombData &&
    bombData.m_blow_time > 0 &&
    !bombData.m_is_defused;

  const bombColor =
    (bombData &&
      bombData.m_is_defusing &&
      bombData.m_blow_time - bombData.m_defuse_time > 0 &&
      `bg-radar-green`) ||
    (bombData &&
      bombData.m_blow_time - bombData.m_defuse_time < 0 &&
      `bg-radar-red`) ||
    `bg-radar-secondary`;

  const renderTeam = ({
    id,
    title,
    color,
    players,
    right,
  }) => (
    <section
      key={id}
      className="hidden lg:flex flex-col gap-3 w-[22rem] shrink-0 max-h-full overflow-y-auto overflow-x-hidden px-1 pb-2"
    >
      <div
        className={`flex items-center gap-2 px-1 ${
          right ? "flex-row-reverse" : ""
        }`}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />

        <h2
          className="m-0 text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color }}
        >
          {title}
        </h2>

        <span className="text-xs text-radar-secondary">
          {players.length}
        </span>
      </div>

      <ul
        id={id}
        className="flex flex-col gap-2 m-0 p-0"
      >
        {players.map((player) => (
          <PlayerCard
            isOnRightSide={right}
            key={player.m_idx}
            playerData={player}
            settings={settings}
            selected={selectedId === player.m_idx}
            onSelect={handleSelect}
            isMe={
              !!me &&
              me.m_idx === player.m_idx
            }
          />
        ))}
      </ul>
    </section>
  );

  return (
    <div
      className={`app-bg w-screen h-screen flex flex-col ${
        focusMode ? "focus-mode" : ""
      }`}
    >
      {/* Header */}
      <header
        className={`z-40 grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-1.5 lg:px-6 ${
          focusMode
            ? "absolute top-0 left-0 right-0 pointer-events-none"
            : "relative"
        }`}
      >
        <div
          className={`flex items-center gap-2 min-w-0 ${
            focusMode ? "invisible" : ""
          }`}
        >
          <div className="glass flex items-center gap-2 px-3 py-1.5 rounded-full text-xs">
            <span
              className={`status-dot ${
                connected ? "on" : "off"
              }`}
            />

            <span className="hidden sm:inline">
              {connected
                ? "Conectado"
                : "Desconectado"}
            </span>
          </div>

          <div className="glass hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs uppercase tracking-widest">
            {mapData
              ? mapData.name.replace(/^de_/, "")
              : "Aguardando mapa"}
          </div>
        </div>

        <div
          className={`brand flex flex-col items-center col-span-2 order-first sm:col-span-1 sm:order-none ${
            focusMode ? "invisible" : ""
          }`}
        >
          <div className="logo-wrap">
            <img
              className="logo-img"
              src="./assets/logo.webp"
              alt="Sapeka PPK"
              draggable={false}
            />
          </div>

          <h1 className="brand-text m-0 mt-1 text-base sm:text-xl lg:text-2xl font-extrabold whitespace-nowrap">
            Sapeka Pepeka
          </h1>
        </div>

        <div className="flex items-center justify-end gap-2 lg:gap-3 pointer-events-auto">
          {playerArray.length > 0 && (
            <button
              onClick={() => setPickerOpen(true)}
              title="Trocar de jogador"
              className="glass glass-btn flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-radar-primary"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: me
                    ? "#22c55e"
                    : "#9f86e0",
                }}
              />

              <span className="hidden sm:inline max-w-[7rem] truncate">
                {me ? me.m_name : "Quem é você?"}
              </span>
            </button>
          )}

          <button
            onClick={toggleFocusMode}
            title={
              focusMode
                ? "Sair da tela cheia"
                : "Só o radar (tela cheia)"
            }
            className="glass glass-btn flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-radar-primary"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {focusMode ? (
                <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4" />
              ) : (
                <path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4" />
              )}
            </svg>

            <span className="hidden sm:inline">
              {focusMode ? "Sair" : "Só radar"}
            </span>
          </button>

          <SettingsButton
            settings={settings}
            onSettingsChange={setSettings}
          />
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        {bombActive && (
          <div className="bomb-pill glass absolute top-1 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-1.5 rounded-full">
            <MaskedIcon
              path={`./assets/icons/c4_sml.png`}
              height={22}
              color={bombColor}
            />

            <span className="font-bold tabular-nums">
              {`${bombData.m_blow_time.toFixed(1)}s ${
                (bombData.m_is_defusing &&
                  `(${bombData.m_defuse_time.toFixed(
                    1
                  )}s)`) ||
                ""
              }`}
            </span>
          </div>
        )}

        {(settings.showFeed ?? true) &&
          feed.length > 0 && (
            <ul className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 m-0 p-0 pointer-events-none">
              {feed.map((entry) => (
                <li
                  key={entry.id}
                  className="feed-item glass list-none flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs"
                >
                  <span
                    style={{
                      color: getTeamColor(entry.team),
                    }}
                    className="font-semibold"
                  >
                    {entry.name}
                  </span>

                  <span className="text-radar-secondary">
                    morreu
                  </span>
                </li>
              ))}
            </ul>
          )}

        <div className="flex flex-col lg:flex-row items-center lg:items-center justify-evenly gap-3 px-3 pb-4 lg:px-6 lg:h-full">
          <ul className="grid lg:hidden grid-cols-5 gap-1 w-full m-0 p-0">
            {counterTerrorists.map((player) => (
              <PlayerChip
                key={player.m_idx}
                playerData={player}
                selected={
                  selectedId === player.m_idx
                }
                onSelect={handleSelect}
                isMe={
                  !!me &&
                  me.m_idx === player.m_idx
                }
              />
            ))}
          </ul>

          {renderTeam({
            id: "terrorist",
            title: "Terroristas",
            color: "#ff8c1a",
            players: terrorists,
            right: false,
          })}

          {playerArray.length > 0 &&
          mapData ? (
            <Radar
              playerArray={playerArray}
              radarImage={`./data/${mapData.name}/radar.png`}
              mapData={mapData}
              localTeam={localTeam}
              bombData={bombData}
              settings={settings}
              selectedId={selectedId}
              onSelect={handleSelect}
              myIdx={
                me ? me.m_idx : undefined
              }
            />
          ) : (
            <div
              id="radar"
              className="radar-empty relative overflow-hidden origin-center flex items-center justify-center p-8"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="spinner" />

                <h1 className="radar_message m-0 text-base font-medium text-radar-primary">
                  {gameId
                    ? "Conectado! Aguardando dados do usermode"
                    : "Game ID não informado"}
                </h1>
              </div>
            </div>
          )}

          {renderTeam({
            id: "counterTerrorist",
            title: "Counter-Terroristas",
            color: "#3d9bff",
            players: counterTerrorists,
            right: true,
          })}

          <ul className="grid lg:hidden grid-cols-5 gap-1 w-full m-0 p-0">
            {terrorists.map((player) => (
              <PlayerChip
                key={player.m_idx}
                playerData={player}
                selected={
                  selectedId === player.m_idx
                }
                onSelect={handleSelect}
                isMe={
                  !!me &&
                  me.m_idx === player.m_idx
                }
              />
            ))}
          </ul>
        </div>
      </main>

      {pickerVisible && (
        <IdentityPicker
          players={playerArray}
          currentKey={myKey}
          getKey={getPlayerKey}
          onPick={pickIdentity}
          onSkip={skipIdentity}
          onClose={
            pickerOpen
              ? () => setPickerOpen(false)
              : undefined
          }
        />
      )}
    </div>
  );
};

export default App;
```