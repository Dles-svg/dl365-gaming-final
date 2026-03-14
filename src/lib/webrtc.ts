const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export interface WebRTCConfig {
  iceServers: RTCIceServer[]
  enableTurn?: boolean
  turnServer?: {
    urls: string
    username?: string
    credential?: string
  }
}

export const defaultWebRTCConfig: WebRTCConfig = {
  iceServers: STUN_SERVERS,
  enableTurn: false
}

export function getWebRTCConfig(customConfig?: Partial<WebRTCConfig>): WebRTCConfig {
  const config = { ...defaultWebRTCConfig, ...customConfig }

  const iceServers = [...STUN_SERVERS]

  if (config.enableTurn && config.turnServer) {
    iceServers.push(config.turnServer)
  }

  return {
    ...config,
    iceServers
  }
}

export class WebRTCBroadcaster {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private dataChannel: RTCDataChannel | null = null
  private onIceCandidateCallback: ((candidate: RTCIceCandidate) => void) | null = null
  private onOfferCallback: ((offer: RTCSessionDescriptionInit) => void) | null = null
  private onRemoteInputCallback: ((inputData: any) => void) | null = null

  async startBroadcastWithStream(stream: MediaStream): Promise<void> {
    try {
      this.localStream = stream

      this.peerConnection = new RTCPeerConnection(defaultWebRTCConfig)

      this.dataChannel = this.peerConnection.createDataChannel('remoteControl')
      this.setupDataChannel(this.dataChannel)

      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!)
      })

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.onIceCandidateCallback) {
          this.onIceCandidateCallback(event.candidate)
        }
      }

      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      if (this.onOfferCallback) {
        this.onOfferCallback(offer)
      }
    } catch (error) {
      console.error('Error starting broadcast with stream:', error)
      throw error
    }
  }

  async startBroadcast(videoElement: HTMLVideoElement, streamType: 'screen' | 'camera'): Promise<void> {
    try {
      if (streamType === 'screen') {
        this.localStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080 },
          audio: true
        })
      } else {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        })
      }

      videoElement.srcObject = this.localStream
      videoElement.muted = true
      await videoElement.play()

      this.peerConnection = new RTCPeerConnection(defaultWebRTCConfig)

      this.dataChannel = this.peerConnection.createDataChannel('remoteControl')
      this.setupDataChannel(this.dataChannel)

      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!)
      })

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.onIceCandidateCallback) {
          this.onIceCandidateCallback(event.candidate)
        }
      }

      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      if (this.onOfferCallback) {
        this.onOfferCallback(offer)
      }
    } catch (error) {
      console.error('Error starting broadcast:', error)
      throw error
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('Data channel opened')
    }

    channel.onmessage = (event) => {
      try {
        const inputData = JSON.parse(event.data)
        if (this.onRemoteInputCallback) {
          this.onRemoteInputCallback(inputData)
        }
      } catch (error) {
        console.error('Error parsing remote input:', error)
      }
    }

    channel.onclose = () => {
      console.log('Data channel closed')
    }
  }

  onRemoteInput(callback: (inputData: any) => void): void {
    this.onRemoteInputCallback = callback
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }

  onIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
    this.onIceCandidateCallback = callback
  }

  onOffer(callback: (offer: RTCSessionDescriptionInit) => void): void {
    this.onOfferCallback = callback
  }

  stopBroadcast(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState ?? null
  }
}

export class WebRTCViewer {
  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private onIceCandidateCallback: ((candidate: RTCIceCandidate) => void) | null = null
  private onAnswerCallback: ((answer: RTCSessionDescriptionInit) => void) | null = null

  async startViewing(videoElement: HTMLVideoElement, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      this.peerConnection = new RTCPeerConnection(defaultWebRTCConfig)

      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel
        this.setupDataChannel(this.dataChannel)
      }

      this.peerConnection.ontrack = (event) => {
        videoElement.srcObject = event.streams[0]
        videoElement.play()
      }

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.onIceCandidateCallback) {
          this.onIceCandidateCallback(event.candidate)
        }
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      if (this.onAnswerCallback) {
        this.onAnswerCallback(answer)
      }
    } catch (error) {
      console.error('Error starting viewer:', error)
      throw error
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('Data channel opened (viewer)')
    }

    channel.onclose = () => {
      console.log('Data channel closed (viewer)')
    }
  }

  sendInput(inputData: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(inputData))
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }

  onIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
    this.onIceCandidateCallback = callback
  }

  onAnswer(callback: (answer: RTCSessionDescriptionInit) => void): void {
    this.onAnswerCallback = callback
  }

  stopViewing(): void {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState ?? null
  }
}
