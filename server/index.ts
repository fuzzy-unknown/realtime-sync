import { Hono } from "hono";
import { upgradeWebSocket, websocket } from "hono/bun";
import type { WSContext } from "hono/ws";

const clients = new Map<string, WSContext>();

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function broadcast(message: object, excludeId?: string) {
  const data = JSON.stringify(message);
  for (const [id, ws] of clients) {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function sendTo(ws: WSContext, message: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

const app = new Hono();

app.get("/", (c) => c.text("OK"));

app.get(
  "/ws",
  upgradeWebSocket(() => {
    let peerId: string;

    return {
      onOpen(_evt, ws) {
        peerId = generateId();
        clients.set(peerId, ws);

        sendTo(ws, { type: "peer-id", from: "server", payload: { id: peerId } });
        sendTo(ws, {
          type: "peers",
          from: "server",
          payload: { ids: Array.from(clients.keys()).filter((k) => k !== peerId) },
        });
        broadcast({ type: "peer-joined", from: "server", payload: { id: peerId } }, peerId);
      },

      onMessage(evt, _ws) {
        if (typeof evt.data !== "string") return;

        let msg: { type: string; from?: string; to?: string; payload?: unknown };
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }

        msg.from = peerId;

        if (msg.to) {
          const targetWs = clients.get(msg.to);
          if (targetWs) sendTo(targetWs, msg);
        } else {
          broadcast(msg, peerId);
        }
      },

      onClose(_evt, _ws) {
        clients.delete(peerId);
        broadcast({ type: "peer-left", from: "server", payload: { id: peerId } });
      },
    };
  })
);

export default {
  port: 3002,
  fetch: app.fetch,
  websocket,
};
