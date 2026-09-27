export const MAX_PLAYERS_PER_DEVICE = 2
export const ACTIVE_SEATS = ['boats', 'animals']

function cleanName(name, fallback) {
  const value = String(name || '').trim().slice(0, 18).trim()
  return value || fallback
}

export function devicePlayers(deviceId, names) {
  return names
    .slice(0, MAX_PLAYERS_PER_DEVICE)
    .map((name, index) => ({
      id: `${deviceId}:${index + 1}`,
      deviceId,
      name: cleanName(name, `Player ${index + 1}`),
    }))
}

export function createLobby({ roomCode, hostDeviceId, playerNames }) {
  const hostPlayers = devicePlayers(hostDeviceId, playerNames)
  return {
    roomCode,
    hostDeviceId,
    revision: 1,
    devices: {
      [hostDeviceId]: {
        id: hostDeviceId,
        isHost: true,
        connected: true,
        players: hostPlayers,
      },
    },
    seats: {
      boats: hostPlayers[0]?.id || null,
      animals: hostPlayers[1]?.id || null,
    },
  }
}

export function lobbyPlayers(lobby) {
  return Object.values(lobby.devices).flatMap((device) =>
    device.players.map((player) => ({
      ...player,
      connected: device.connected,
      isHostDevice: device.id === lobby.hostDeviceId,
    })))
}

export function playerById(lobby, playerId) {
  return lobbyPlayers(lobby).find((player) => player.id === playerId) || null
}

export function playerForSeat(lobby, seat) {
  return playerById(lobby, lobby.seats[seat])
}

export function upsertLobbyDevice(lobby, { deviceId, playerNames, connected = true }) {
  const next = structuredClone(lobby)
  const existing = next.devices[deviceId]
  next.devices[deviceId] = {
    id: deviceId,
    isHost: deviceId === next.hostDeviceId,
    connected,
    players: devicePlayers(deviceId, playerNames),
  }

  if (existing) {
    const currentIds = new Set(next.devices[deviceId].players.map((player) => player.id))
    for (const seat of ACTIVE_SEATS) {
      if (next.seats[seat]?.startsWith(`${deviceId}:`) && !currentIds.has(next.seats[seat])) {
        next.seats[seat] = null
      }
    }
  }
  next.revision += 1
  return next
}

export function setDeviceConnection(lobby, deviceId, connected) {
  if (!lobby.devices[deviceId] || lobby.devices[deviceId].connected === connected) return lobby
  const next = structuredClone(lobby)
  next.devices[deviceId].connected = connected
  next.revision += 1
  return next
}

export function assignLobbySeat(lobby, actorDeviceId, playerId, seat = null) {
  if (actorDeviceId !== lobby.hostDeviceId) throw new Error('Only the host can assign active players.')
  if (seat !== null && !ACTIVE_SEATS.includes(seat)) throw new Error('Unknown active seat.')
  if (playerId !== null && !playerById(lobby, playerId)) throw new Error('Player is not in this lobby.')

  const next = structuredClone(lobby)
  for (const activeSeat of ACTIVE_SEATS) {
    if (next.seats[activeSeat] === playerId) next.seats[activeSeat] = null
  }
  if (seat !== null) next.seats[seat] = playerId
  next.revision += 1
  return next
}

export function canStartLobbyGame(lobby) {
  const boats = playerForSeat(lobby, 'boats')
  const animals = playerForSeat(lobby, 'animals')
  return Boolean(
    boats
    && animals
    && boats.id !== animals.id
    && boats.connected
    && animals.connected
  )
}

export function deviceControlsSide(lobby, deviceId, side) {
  return playerForSeat(lobby, side)?.deviceId === deviceId
}

export function reconcileLobbyPresence(lobby, connectedDeviceIds) {
  const connected = new Set(connectedDeviceIds)
  let next = lobby
  for (const deviceId of Object.keys(lobby.devices)) {
    next = setDeviceConnection(next, deviceId, connected.has(deviceId))
  }
  return next
}
