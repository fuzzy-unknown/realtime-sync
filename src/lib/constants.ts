export const WS_URL = 'ws://localhost:3002/ws'

export const CHUNK_SIZE = 16384 // 16KB

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export const OFFER_TIMEOUT_MS = 30_000 // 30 seconds

export const TEXT_DEBOUNCE_MS = 150

export const BUFFER_THRESHOLD = 1_048_576 // 1MB
