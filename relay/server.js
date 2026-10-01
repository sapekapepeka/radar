const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
// Opcional: se definido no Render, o host precisa enviar ?key=HOST_KEY
const HOST_KEY = process.env.HOST_KEY;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("ok"); // health check do Render
});
const wss = new WebSocketServer({ server });
const rooms = new Map(); // gameId -> { host, viewers:Set }

const sendJson = (ws, obj) => {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
};

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://x");
  const role = url.searchParams.get("role");

  if (role === "host") {
    if (HOST_KEY && url.searchParams.get("key") !== HOST_KEY) return ws.close();

    // O relay gera o Game ID e devolve para o usermode
    const gameId = crypto.randomUUID();
    const room = { host: ws, viewers: new Set() };
    rooms.set(gameId, room);
    sendJson(ws, { type: "game_created", gameId });

    ws.on("message", (data, isBinary) => {
      for (const v of room.viewers) {
        if (v.readyState === 1) v.send(data, { binary: isBinary });
      }
    });
    ws.on("close", () => {
      rooms.delete(gameId);
      for (const v of room.viewers) {
        sendJson(v, { type: "game_ended", gameId });
        v.close();
      }
    });
  } else {
    const gameId = url.searchParams.get("game");
    if (!gameId) {
      sendJson(ws, { type: "error", error: "game_id_required" });
      return ws.close();
    }

    const room = rooms.get(gameId);
    if (!room) {
      sendJson(ws, { type: "error", error: "game_not_found" });
      return ws.close();
    }

    room.viewers.add(ws);
    sendJson(ws, { type: "joined_game", gameId });
    ws.on("close", () => room.viewers.delete(ws));
  }

  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
});

// heartbeat: mantém conexões vivas e limpa as mortas
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 25000);

server.listen(PORT, () => console.log("relay on", PORT));
