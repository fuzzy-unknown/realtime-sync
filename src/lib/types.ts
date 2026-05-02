export interface SignalingMessage {
  type: string
  from: string
  to?: string
  payload: unknown
}

export interface PeerIdPayload {
  id: string
}

export interface PeersPayload {
  ids: string[]
}

export interface PeerEventPayload {
  id: string
}

export interface TextUpdatePayload {
  text: string
}

export interface FileOfferPayload {
  transferId: string
  fileName: string
  fileSize: number
  fileType: string
}

export interface FileAcceptPayload {
  transferId: string
}

export interface FileRejectPayload {
  transferId: string
}

export interface FileCancelPayload {
  transferId: string
}

export interface RtcOfferPayload {
  sdp: RTCSessionDescriptionInit
  transferId: string
}

export interface RtcAnswerPayload {
  sdp: RTCSessionDescriptionInit
  transferId: string
}

export interface RtcCandidatePayload {
  candidate: RTCIceCandidateInit
  transferId: string
}

export interface FileOffer {
  transferId: string
  fileName: string
  fileSize: number
  fileType: string
  fromPeerId: string
  receivedAt: number
}

export interface TransferProgress {
  sent: number
  total: number
}
