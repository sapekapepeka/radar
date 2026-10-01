const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const HOST_KEY = process.env.HOST_KEY; // segredo só do host

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("ok"); // health check do Render
});
const wss = new WebSocketServer({ server });
const rooms = new Map(); // game -> { host, viewers:Set }

function getRoom(game) {
  let room = rooms.get(game);
  if (!room) rooms.set(game, (room = { host: null, viewers: new Set() }));
  return room;
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://x");
  const game = url.searchParams.get("game");
  const role = url.searchParams.get("role");
  if (!game || !/^[A-Za-z0-9]{4,16}$/.test(game)) return ws.close();

  const room = getRoom(game);
  if (role === "host") {
    if (!HOST_KEY || url.searchParams.get("key") !== HOST_KEY) return ws.close();
    room.host = ws;
    ws.on("message", (data, isBinary) => {
      for (const v of room.viewers) {
        if (v.readyState === 1) v.send(data, { binary: isBinary });
      }
    });
    ws.on("close", () => {
      room.host = null;
    });
  } else {
    room.viewers.add(ws);
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
