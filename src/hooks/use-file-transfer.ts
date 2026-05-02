import { useState, useCallback, useRef, useEffect } from "react";
import type {
  SignalingMessage,
  FileOffer,
  FileOfferPayload,
  TransferProgress,
} from "@/lib/types";
import { ICE_SERVERS } from "@/lib/constants";

const CHUNK_SIZE = 65536;
const BUFFER_THRESHOLD = 10_485_760; // 10MB
const BUFFER_LOW = 2_097_152; // 2MB

interface OutgoingTransfer {
  file: File;
  acceptedBy: string[];
  progress: Map<string, TransferProgress>;
}

interface IncomingTransfer {
  meta: FileOffer;
  progress: TransferProgress;
}

export function useFileTransfer(
  signaling: {
    peerId: string | null;
    send: (msg: Omit<SignalingMessage, "from">) => void;
    onMessage: (
      type: string,
      handler: (msg: SignalingMessage) => void
    ) => () => void;
  },
  onFileComplete?: (fileName: string, blob: Blob) => void
) {
  const [incomingOffers, setIncomingOffers] = useState<FileOffer[]>([]);
  const [outgoingTransfers, setOutgoingTransfers] = useState<
    Map<string, OutgoingTransfer>
  >(new Map());
  const [incomingTransfers, setIncomingTransfers] = useState<
    Map<string, IncomingTransfer>
  >(new Map());

  // Stable refs
  const sendRef = useRef(signaling.send);
  sendRef.current = signaling.send;
  const onMsgRef = useRef(signaling.onMessage);
  onMsgRef.current = signaling.onMessage;
  const onCompleteRef = useRef(onFileComplete);
  onCompleteRef.current = onFileComplete;
  const outgoingRef = useRef(outgoingTransfers);
  outgoingRef.current = outgoingTransfers;
  const incomingRef = useRef(incomingTransfers);
  incomingRef.current = incomingTransfers;
  const offersMapRef = useRef(new Map<string, FileOffer>());

  // WebRTC state — mirrors the reference's plain variables
  const senderTransferRef = useRef<{
    transferId: string;
    file: File;
    pc: RTCPeerConnection;
    channel: RTCDataChannel;
  } | null>(null);

  const receiverTransferRef = useRef<{
    transferId: string;
    fileName: string;
    fileSize: number;
    pc: RTCPeerConnection;
    chunks: ArrayBuffer[];
    received: number;
  } | null>(null);

  // --- file-offer ---
  useEffect(() => {
    return onMsgRef.current("file-offer", (msg) => {
      const p = msg.payload as FileOfferPayload;
      const offer: FileOffer = {
        transferId: p.transferId,
        fileName: p.fileName,
        fileSize: p.fileSize,
        fileType: p.fileType,
        fromPeerId: msg.from,
        receivedAt: Date.now(),
      };
      offersMapRef.current.set(offer.transferId, offer);
      setIncomingOffers((prev) => [...prev, offer]);
    });
  }, []);

  // --- file-accept: sender initiates WebRTC ---
  useEffect(() => {
    return onMsgRef.current("file-accept", (msg) => {
      const { transferId } = msg.payload as { transferId: string };
      const accepterId = msg.from;
      const outgoing = outgoingRef.current.get(transferId);
      if (!outgoing) return;

      // Update acceptedBy
      const newMap = new Map(outgoingRef.current);
      const existing = newMap.get(transferId)!;
      newMap.set(transferId, {
        ...existing,
        acceptedBy: [...existing.acceptedBy, accepterId],
      });
      setOutgoingTransfers(newMap);
      outgoingRef.current = newMap;

      const file = outgoing.file;
      const pc = new RTCPeerConnection(ICE_SERVERS);
      const channel = pc.createDataChannel("fileTransfer", { ordered: true });

      senderTransferRef.current = {
        transferId,
        file,
        pc,
        channel,
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          sendRef.current({
            type: "webrtc-signal",
            to: accepterId,
            payload: {
              transferId,
              signal: {
                type: "ice-candidate",
                candidate: ev.candidate,
              },
            },
          });
        }
      };

      channel.onopen = async () => {
        const total = file.size;
        for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
          const end = Math.min(offset + CHUNK_SIZE, total);
          const buf = await file.slice(offset, end).arrayBuffer();
          channel.send(buf);

          const pm = new Map(
            outgoingRef.current.get(transferId)?.progress || []
          );
          pm.set(accepterId, { sent: end, total });
          const t = new Map(outgoingRef.current);
          const ex = t.get(transferId);
          if (ex) {
            t.set(transferId, { ...ex, progress: pm });
            setOutgoingTransfers(t);
            outgoingRef.current = t;
          }

          if (channel.bufferedAmount > BUFFER_THRESHOLD) {
            channel.bufferedAmountLowThreshold = BUFFER_LOW;
            await new Promise<void>((r) => {
              channel.onbufferedamountlow = () => {
                channel.onbufferedamountlow = null;
                r();
              };
            });
          }
        }
        channel.send(JSON.stringify({ type: "done" }));

        // Remove from outgoing transfers
        const t = new Map(outgoingRef.current);
        t.delete(transferId);
        setOutgoingTransfers(t);
        outgoingRef.current = t;

        setTimeout(() => {
          pc.close();
          senderTransferRef.current = null;
        }, 1500);
      };

      pc.createOffer()
        .then((o) => pc.setLocalDescription(o))
        .then(() => {
          sendRef.current({
            type: "webrtc-signal",
            to: accepterId,
            payload: {
              transferId,
              signal: {
                type: "offer",
                sdp: pc.localDescription,
              },
            },
          });
        });
    });
  }, []);

  // --- webrtc-signal: unified handler (offer / answer / ice-candidate) ---
  useEffect(() => {
    return onMsgRef.current("webrtc-signal", (msg) => {
      const { transferId, signal } = msg.payload as {
        transferId: string;
        signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
      };
      const fromId = msg.from;

      if (signal.type === "offer") {
        // Receiver side
        const offer = offersMapRef.current.get(transferId);
        if (!offer) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);

        receiverTransferRef.current = {
          transferId,
          fileName: offer.fileName,
          fileSize: offer.fileSize,
          pc,
          chunks: [],
          received: 0,
        };

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            sendRef.current({
              type: "webrtc-signal",
              to: fromId,
              payload: {
                transferId,
                signal: {
                  type: "ice-candidate",
                  candidate: ev.candidate,
                },
              },
            });
          }
        };

        pc.ondatachannel = (ev) => {
          const channel = ev.channel;

          channel.onmessage = (e) => {
            if (typeof e.data === "string") {
              const parsed = JSON.parse(e.data);
              if (parsed.type === "done") {
                const rt = receiverTransferRef.current;
                if (rt) {
                  const blob = new Blob(rt.chunks);
                  onCompleteRef.current?.(rt.fileName, blob);
                  const u = new Map(incomingRef.current);
                  u.delete(transferId);
                  setIncomingTransfers(u);
                  incomingRef.current = u;
                  setTimeout(() => {
                    pc.close();
                    receiverTransferRef.current = null;
                  }, 2000);
                }
              }
              return;
            }

            // Binary chunk
            const rt = receiverTransferRef.current;
            if (rt) {
              rt.chunks.push(e.data);
              rt.received += (e.data as ArrayBuffer).byteLength;

              const u = new Map(incomingRef.current);
              u.set(transferId, {
                meta: { ...offer, fromPeerId: fromId, receivedAt: Date.now() },
                progress: { sent: rt.received, total: rt.fileSize },
              });
              setIncomingTransfers(u);
              incomingRef.current = u;
            }
          };
        };

        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp!))
          .then(() => pc.createAnswer())
          .then((a) => pc.setLocalDescription(a).then(() => a))
          .then((a) => {
            sendRef.current({
              type: "webrtc-signal",
              to: fromId,
              payload: {
                transferId,
                signal: { type: "answer", sdp: a },
              },
            });
          });
      } else if (signal.type === "answer") {
        // Sender side
        const st = senderTransferRef.current;
        if (st && st.transferId === transferId) {
          st.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp!));
        }
      } else if (signal.type === "ice-candidate") {
        // Either side
        const st = senderTransferRef.current;
        const rt = receiverTransferRef.current;
        const target =
          st && st.transferId === transferId
            ? st.pc
            : rt && rt.transferId === transferId
              ? rt.pc
              : null;
        if (target && signal.candidate) {
          target.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    });
  }, []);

  // --- file-reject (noop) ---
  useEffect(() => {
    return onMsgRef.current("file-reject", () => {});
  }, []);

  // --- file-cancel: remote side cancelled ---
  useEffect(() => {
    return onMsgRef.current("file-cancel", (msg) => {
      const { transferId } = msg.payload as { transferId: string };

      // Receiver: sender cancelled → clean up
      const rt = receiverTransferRef.current;
      if (rt && rt.transferId === transferId) {
        rt.pc.close();
        receiverTransferRef.current = null;
      }
      const u = new Map(incomingRef.current);
      u.delete(transferId);
      setIncomingTransfers(u);
      incomingRef.current = u;

      // Also remove offer if still pending
      setIncomingOffers((prev) =>
        prev.filter((o) => o.transferId !== transferId)
      );
    });
  }, []);

  // --- Actions ---

  const sendFile = useCallback((file: File) => {
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newMap = new Map(outgoingRef.current);
    newMap.set(transferId, { file, acceptedBy: [], progress: new Map() });
    setOutgoingTransfers(newMap);
    outgoingRef.current = newMap;
    sendRef.current({
      type: "file-offer",
      payload: {
        transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      },
    });
  }, []);

  const acceptFile = useCallback((transferId: string) => {
    const offer = offersMapRef.current.get(transferId);
    setIncomingOffers((prev) => prev.filter((o) => o.transferId !== transferId));
    sendRef.current({
      type: "file-accept",
      to: offer?.fromPeerId,
      payload: { transferId },
    });
  }, []);

  const rejectFile = useCallback((transferId: string) => {
    const offer = offersMapRef.current.get(transferId);
    setIncomingOffers((prev) => prev.filter((o) => o.transferId !== transferId));
    if (offer) {
      sendRef.current({
        type: "file-reject",
        to: offer.fromPeerId,
        payload: { transferId },
      });
    }
  }, []);

  const cancelSend = useCallback((transferId: string) => {
    // Close WebRTC if active
    const st = senderTransferRef.current;
    if (st && st.transferId === transferId) {
      st.channel.close();
      st.pc.close();
      senderTransferRef.current = null;
    }
    // Remove from outgoing
    const t = new Map(outgoingRef.current);
    t.delete(transferId);
    setOutgoingTransfers(t);
    outgoingRef.current = t;
    // Notify receivers
    sendRef.current({
      type: "file-cancel",
      payload: { transferId },
    });
  }, []);

  const cancelReceive = useCallback((transferId: string) => {
    // Close WebRTC
    const rt = receiverTransferRef.current;
    if (rt && rt.transferId === transferId) {
      rt.pc.close();
      receiverTransferRef.current = null;
    }
    // Remove from incoming
    const u = new Map(incomingRef.current);
    u.delete(transferId);
    setIncomingTransfers(u);
    incomingRef.current = u;
  }, []);

  return {
    incomingOffers,
    outgoingTransfers,
    incomingTransfers,
    sendFile,
    acceptFile,
    rejectFile,
    cancelSend,
    cancelReceive,
  };
}
