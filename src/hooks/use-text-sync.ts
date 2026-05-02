import { useState, useCallback, useRef, useEffect } from "react";
import type { SignalingMessage, TextUpdatePayload } from "@/lib/types";
import { TEXT_DEBOUNCE_MS } from "@/lib/constants";

export function useTextSync(signaling: {
  send: (msg: Omit<SignalingMessage, "from">) => void;
  onMessage: (type: string, handler: (msg: SignalingMessage) => void) => () => void;
}) {
  const [text, setTextInternal] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setText = useCallback(
    (newText: string) => {
      setTextInternal(newText);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        signaling.send({
          type: "text-update",
          payload: { text: newText } satisfies TextUpdatePayload,
        });
      }, TEXT_DEBOUNCE_MS);
    },
    [signaling]
  );

  useEffect(() => {
    return signaling.onMessage("text-update", (msg) => {
      const { text: remoteText } = msg.payload as TextUpdatePayload;
      setTextInternal(remoteText);
    });
  }, [signaling]);

  return { text, setText };
}
