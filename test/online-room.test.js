import test from 'node:test'
import assert from 'node:assert/strict'
import { createChannelTopic } from '../src/online-room.js'

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
