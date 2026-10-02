import test from 'node:test'
import assert from 'node:assert/strict'
import { channelStatusUpdate, createChannelTopic } from '../src/online-room.js'

test('online rooms are isolated by arcade, game, and protocol version', () => {
  const config = {
    channelPrefix: 'arcade',
    appId: 'whale-run',
    protocolVersion: 1,
  }

  assert.equal(createChannelTopic('reef42', config), 'arcade:whale-run:v1:REEF42')
  assert.notEqual(
    createChannelTopic('reef42', config),
    createChannelTopic('reef42', { ...config, appId: 'harbor-race' }),
  )
  assert.notEqual(
    createChannelTopic('reef42', config),
    createChannelTopic('reef42', { ...config, protocolVersion: 2 }),
  )
})

test('channel status distinguishes a first connection from a reconnection', () => {
  assert.deepEqual(channelStatusUpdate('SUBSCRIBED'), {
    status: 'connected',
    reconnected: false,
    reason: null,
  })
  assert.deepEqual(channelStatusUpdate('SUBSCRIBED', { hasConnected: true }), {
    status: 'connected',
    reconnected: true,
    reason: null,
  })
  assert.deepEqual(channelStatusUpdate('CHANNEL_ERROR', { hasConnected: true }), {
    status: 'error',
    reconnected: false,
    reason: 'CHANNEL_ERROR',
  })
  assert.equal(channelStatusUpdate('CLOSED', { hasConnected: true, isClosing: true }), null)
})
