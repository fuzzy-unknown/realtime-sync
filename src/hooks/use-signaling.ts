import { useRef, useState, useCallback, useEffect } from "react";
import type { SignalingMessage } from "@/lib/types";
import { WS_URL } from "@/lib/constants";

type MessageHandler = (msg: SignalingMessage) => void;

export function useSignaling() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peers, setPeers] = useState<string[]>([]);

  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: SignalingMessage;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case "peer-id":
        setPeerId((msg.payload as { id: string }).id);
        break;
      case "peers":
        setPeers((msg.payload as { ids: string[] }).ids);
        break;
      case "peer-joined":
        setPeers((prev) => [...prev, (msg.payload as { id: string }).id]);
        break;
      case "peer-left":
        setPeers((prev) =>
          prev.filter((id) => id !== (msg.payload as { id: string }).id)
        );
        break;
    }

    const handlers = handlersRef.current.get(msg.type);
    if (handlers) {
      for (const handler of handlers) handler(msg);
    }
  }, []);

  useEffect(() => {
    let disposed = false;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!disposed) setIsConnected(true);
    };
    ws.onclose = () => {
      if (!disposed) setIsConnected(false);
    };
    ws.onmessage = (e) => {
      if (!disposed) handleMessage(e);
    };

    return () => {
      disposed = true;
      ws.close();
      wsRef.current = null;
    };
  }, [handleMessage]);

  const send = useCallback(
    (msg: Omit<SignalingMessage, "from">) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
      }
    },
    []
  );

  const onMessage = useCallback(
    (type: string, handler: MessageHandler) => {
      if (!handlersRef.current.has(type)) {
        handlersRef.current.set(type, new Set());
      }
      handlersRef.current.get(type)!.add(handler);
      return () => {
        handlersRef.current.get(type)?.delete(handler);
      };
    },
    []
  );

  return { isConnected, peerId, peers, send, onMessage };
}
