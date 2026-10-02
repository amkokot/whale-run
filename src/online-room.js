import { ONLINE_CONFIG, onlineConfigured } from './online-config.js'

const FAILED_CHANNEL_STATUSES = ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']

export function createChannelTopic(roomCode, config = ONLINE_CONFIG) {
  const prefix = String(config.channelPrefix || 'arcade').trim().toLowerCase()
  const appId = String(config.appId || 'whale-run').trim().toLowerCase()
  const version = Number.isInteger(config.protocolVersion) ? config.protocolVersion : 1
  return `${prefix}:${appId}:v${version}:${roomCode.toUpperCase()}`
}

export function channelStatusUpdate(status, { hasConnected = false, isClosing = false } = {}) {
  if (status === 'SUBSCRIBED') {
    return { status: 'connected', reconnected: hasConnected, reason: null }
  }
  if (FAILED_CHANNEL_STATUSES.includes(status) && !isClosing) {
    return { status: 'error', reconnected: false, reason: status }
  }
  return null
}

export class RealtimeRoom {
  constructor({ roomCode, deviceId, playerNames, onMessage, onPresence, onStatus }) {
    this.roomCode = roomCode.toUpperCase()
    this.deviceId = deviceId
    this.playerNames = playerNames
    this.onMessage = onMessage
    this.onPresence = onPresence
    this.onStatus = onStatus
    this.client = null
    this.channel = null
    this.hasConnected = false
    this.isClosing = false
  }

  async connect() {
    if (!onlineConfigured()) throw new Error('Online play needs a Supabase URL and publishable key.')
    this.isClosing = false
    this.onStatus?.('connecting', { reconnected: false, reason: null })
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    this.client = createClient(ONLINE_CONFIG.supabaseUrl, ONLINE_CONFIG.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    this.channel = this.client.channel(createChannelTopic(this.roomCode), {
      config: {
        private: ONLINE_CONFIG.privateChannels,
        broadcast: { self: false, ack: true },
        presence: { key: this.deviceId },
      },
    })

    this.channel
      .on('broadcast', { event: 'room-event' }, ({ payload }) => this.onMessage?.(payload))
      .on('presence', { event: 'sync' }, () => {
        const presences = Object.values(this.channel.presenceState()).flat()
        this.onPresence?.(presences)
      })

    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        if (this.hasConnected || this.isClosing) return
        this.onStatus?.('error', { reconnected: false, reason: 'CONNECT_TIMEOUT' })
        reject(new Error('The room connection timed out.'))
      }, 12000)
      this.channel.subscribe(async (status) => {
        const update = channelStatusUpdate(status, {
          hasConnected: this.hasConnected,
          isClosing: this.isClosing,
        })
        if (!update) return

        if (update.status === 'connected') {
          window.clearTimeout(timeout)
          const trackResult = await this.channel.track({
            deviceId: this.deviceId,
            playerNames: this.playerNames,
            joinedAt: new Date().toISOString(),
          })
          if (trackResult !== 'ok') {
            this.onStatus?.('error', { reconnected: false, reason: `TRACK_${trackResult}` })
            if (!this.hasConnected) reject(new Error('The room could not announce this player.'))
            return
          }
          this.hasConnected = true
          this.onStatus?.('connected', update)
          resolve()
        } else {
          window.clearTimeout(timeout)
          this.onStatus?.('error', update)
          if (!this.hasConnected) {
            reject(new Error(`Room connection failed: ${status.toLowerCase().replaceAll('_', ' ')}`))
          }
        }
      })
    })
  }

  async send(type, payload = {}) {
    if (!this.channel) throw new Error('The room is not connected.')
    return this.channel.send({
      type: 'broadcast',
      event: 'room-event',
      payload: {
        type,
        appId: ONLINE_CONFIG.appId,
        protocolVersion: ONLINE_CONFIG.protocolVersion,
        roomCode: this.roomCode,
        deviceId: this.deviceId,
        payload,
      },
    })
  }

  async close() {
    if (!this.client || !this.channel) return
    this.isClosing = true
    await this.client.removeChannel(this.channel)
    this.channel = null
    this.client = null
    this.hasConnected = false
    this.onStatus?.('closed', { reconnected: false, reason: null })
  }
}

export function createRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export function currentDeviceId() {
  const storageKey = 'whale-run-device-id'
  const existing = sessionStorage.getItem(storageKey)
  if (existing) return existing
  const id = crypto.randomUUID()
  sessionStorage.setItem(storageKey, id)
  return id
}
