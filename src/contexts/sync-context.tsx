import {
  createContext,
  useContext,
  type ReactNode,
  useCallback,
} from "react";
import type { FileOffer, TransferProgress } from "@/lib/types";
import { useSignaling } from "@/hooks/use-signaling";
import { useTextSync } from "@/hooks/use-text-sync";
import { useFileTransfer } from "@/hooks/use-file-transfer";

interface SyncContextValue {
  isConnected: boolean;
  peerId: string | null;
  peers: string[];
  text: string;
  setText: (text: string) => void;
  incomingOffers: FileOffer[];
  outgoingTransfers: Map<string, { file: File; acceptedBy: string[]; progress: Map<string, TransferProgress> }>;
  incomingTransfers: Map<string, { meta: FileOffer; progress: TransferProgress }>;
  sendFile: (file: File) => void;
  acceptFile: (transferId: string) => void;
  rejectFile: (transferId: string) => void;
  cancelSend: (transferId: string) => void;
  cancelReceive: (transferId: string) => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const signaling = useSignaling();
  const { text, setText } = useTextSync(signaling);

  const handleFileComplete = useCallback(
    (fileName: string, blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    []
  );

  const fileTransfer = useFileTransfer(signaling, handleFileComplete);

  return (
    <SyncContext.Provider
      value={{
        isConnected: signaling.isConnected,
        peerId: signaling.peerId,
        peers: signaling.peers,
        text,
        setText,
        ...fileTransfer,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
