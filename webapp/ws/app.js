import { WebSocketServer } from "ws";
import http from "http";
import crypto from "crypto";

const port = process.env.PORT || 22006;
const host = "0.0.0.0";

// Optional Render environment variable.
// If empty, no host key is required.
const HOST_KEY = process.env.RELAY_HOST_KEY || "";

const games = new Map();

function sendJson(socket, payload) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "online",
      service: "cs2-webradar-relay",
      games: games.size
    }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("CS2 WebRadar Relay Online");
});

const webSocketServer = new WebSocketServer({
  server,
  path: "/cs2_webradar"
});

webSocketServer.on("connection", (socket, request) => {
  const url = new URL(
    request.url || "/cs2_webradar",
    `http://${request.headers.host || "localhost"}`
  );

  const role = url.searchParams.get("role") || "viewer";
  const gameId = url.searchParams.get("game");
  const key = url.searchParams.get("key") || "";

  // HOST:
  // The server creates a new UUID and sends it back to the host.
  if (role === "host") {
    if (HOST_KEY && key !== HOST_KEY) {
      sendJson(socket, {
        type: "error",
        error: "invalid_host_key"
      });

      socket.close(1008, "Invalid host key");
      return;
    }

    const newGameId = crypto.randomUUID();

    games.set(newGameId, {
      host: socket,
      viewers: new Set()
    });

    socket.gameId = newGameId;
    socket.role = "host";

    sendJson(socket, {
      type: "game_created",
      gameId: newGameId
    });

    console.log(`Game created: ${newGameId}`);

    socket.on("message", (message) => {
      const game = games.get(socket.gameId);

      if (!game || game.host !== socket)
        return;

      for (const viewer of game.viewers) {
        if (viewer.readyState === 1) {
          viewer.send(message);
        }
      }
    });

    socket.on("close", () => {
      const game = games.get(socket.gameId);

      if (!game)
        return;

      for (const viewer of game.viewers) {
        sendJson(viewer, {
          type: "game_ended",
          gameId: socket.gameId
        });
      }

      games.delete(socket.gameId);

      console.log(`Game ended: ${socket.gameId}`);
    });

    socket.on("error", (error) => {
      console.error("Host WebSocket error:", error);
    });

    return;
  }

  // VIEWER:
  // A viewer must supply the Game ID in ?game=...
  if (!gameId) {
    sendJson(socket, {
      type: "error",
      error: "game_id_required"
    });

    socket.close(1008, "Game ID required");
    return;
  }

  const game = games.get(gameId);

  if (!game) {
    sendJson(socket, {
      type: "error",
      error: "game_not_found",
      gameId
    });

    socket.close(1008, "Game not found");
    return;
  }

  game.viewers.add(socket);

  socket.gameId = gameId;
  socket.role = "viewer";

  sendJson(socket, {
    type: "joined_game",
    gameId
  });

  console.log(`Viewer joined: ${gameId}`);

  socket.on("close", () => {
    const currentGame = games.get(socket.gameId);

    if (currentGame) {
      currentGame.viewers.delete(socket);
    }
  });

  socket.on("error", (error) => {
    console.error("Viewer WebSocket error:", error);
  });
});

server.listen(port, host, () => {
  console.log(
    `HTTP/WebSocket server listening on ${host}:${port}`
  );
});
