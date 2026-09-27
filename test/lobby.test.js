import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assignLobbySeat,
  canStartLobbyGame,
  createLobby,
  deviceControlsSide,
  lobbyPlayers,
  playerForSeat,
  reconcileLobbyPresence,
  upsertLobbyDevice,
} from '../src/lobby.js'

test('one device may contribute one or two independently seatable players', () => {
  let lobby = createLobby({ roomCode: 'TIDE42', hostDeviceId: 'host', playerNames: ['Mara'] })
  lobby = upsertLobbyDevice(lobby, { deviceId: 'tablet', playerNames: ['Finn', 'Leo'] })
  assert.deepEqual(lobbyPlayers(lobby).map((player) => player.name), ['Mara', 'Finn', 'Leo'])

  lobby = assignLobbySeat(lobby, 'host', 'tablet:1', 'animals')
  assert.equal(playerForSeat(lobby, 'boats').name, 'Mara')
  assert.equal(playerForSeat(lobby, 'animals').name, 'Finn')
  assert.equal(canStartLobbyGame(lobby), true)
  assert.equal(deviceControlsSide(lobby, 'tablet', 'animals'), true)
})

test('a device roster is capped at two short display names', () => {
  const lobby = createLobby({
    roomCode: 'NAMES2',
    hostDeviceId: 'host',
    playerNames: ['  Captain Coral  ', 'A very long child player name', 'Third player'],
  })
  const players = lobbyPlayers(lobby)
  assert.equal(players.length, 2)
  assert.equal(players[0].name, 'Captain Coral')
  assert.equal(players[1].name, 'A very long child')
})

test('the host can move players into and out of either active seat', () => {
  let lobby = createLobby({ roomCode: 'WAVES7', hostDeviceId: 'host', playerNames: ['Mara', 'Finn'] })
  lobby = upsertLobbyDevice(lobby, { deviceId: 'phone', playerNames: ['Nico'] })
  lobby = assignLobbySeat(lobby, 'host', 'phone:1', 'boats')
  assert.equal(playerForSeat(lobby, 'boats').name, 'Nico')
  assert.equal(playerForSeat(lobby, 'animals').name, 'Finn')

  lobby = assignLobbySeat(lobby, 'host', 'phone:1', null)
  assert.equal(playerForSeat(lobby, 'boats'), null)
  assert.equal(playerByName(lobby, 'Nico').connected, true)
})

test('non-host devices cannot change active seats', () => {
  let lobby = createLobby({ roomCode: 'REEF88', hostDeviceId: 'host', playerNames: ['Mara'] })
  lobby = upsertLobbyDevice(lobby, { deviceId: 'guest', playerNames: ['Finn'] })
  assert.throws(() => assignLobbySeat(lobby, 'guest', 'guest:1', 'boats'), /Only the host/)
})

test('disconnected players remain visible but cannot start a game', () => {
  let lobby = createLobby({ roomCode: 'FOG123', hostDeviceId: 'host', playerNames: ['Mara'] })
  lobby = upsertLobbyDevice(lobby, { deviceId: 'guest', playerNames: ['Finn'] })
  lobby = assignLobbySeat(lobby, 'host', 'guest:1', 'animals')
  assert.equal(canStartLobbyGame(lobby), true)

  lobby = reconcileLobbyPresence(lobby, ['host'])
  assert.equal(playerForSeat(lobby, 'animals').connected, false)
  assert.equal(canStartLobbyGame(lobby), false)
})

function playerByName(lobby, name) {
  return lobbyPlayers(lobby).find((player) => player.name === name)
}
