import {
  BOARD_SIZE,
  ROSTER,
  ROSTER_ORDER,
  createRound,
  isSelectablePiece,
  legalMoves,
  makeMove,
  noProgressMoveLimit,
  pieceAt,
  pieceDefinition,
  pieceType,
  samePosition,
  threatenedByBoats,
  threatenedBySide,
} from './game.js'
import {
  VOYAGE_CHAPTERS,
  VOYAGES,
  chapterFor,
  nextAvailableVoyage,
  voyageById,
} from './voyages.js'
import {
  assignLobbySeat,
  canStartLobbyGame,
  createLobby,
  deviceControlsSide,
  lobbyPlayers,
  playerForSeat,
  reconcileLobbyPresence,
  upsertLobbyDevice,
} from './lobby.js'
import { ONLINE_CONFIG, onlineConfigured } from './online-config.js'
import { RealtimeRoom, createRoomCode, currentDeviceId } from './online-room.js'

const assets = {
  tug: 'assets/vessels/tug.png',
  cutter: 'assets/vessels/cutter.png',
  dredger: 'assets/vessels/dredger.png',
  whale: 'assets/vessels/whale.png',
  sloop: 'assets/vessels/sloop.png',
  skiff: 'assets/vessels/submarine.png',
  dinghy: 'assets/vessels/dinghy.png',
  orca: 'assets/vessels/orca.png',
  shark: 'assets/vessels/shark.png',
  manta: 'assets/vessels/manta.png',
  dolphin: 'assets/vessels/dolphin.png',
  fish: 'assets/vessels/fish.png',
}

const elements = {
  board: document.querySelector('#board'),
  boardCaption: document.querySelector('#boardCaption'),
  beginMatchButton: document.querySelector('#beginMatchButton'),
  boatsSeatName: document.querySelector('#boatsSeatName'),
  crewCards: document.querySelector('#crewCards'),
  availableVoyageCount: document.querySelector('#availableVoyageCount'),
  changeVoyageButton: document.querySelector('#changeVoyageButton'),
  chosenVoyageChapter: document.querySelector('#chosenVoyageChapter'),
  chosenVoyageCopy: document.querySelector('#chosenVoyageCopy'),
  chosenVoyageNumber: document.querySelector('#chosenVoyageNumber'),
  chosenVoyageTitle: document.querySelector('#chosenVoyageTitle'),
  chosenVoyage: document.querySelector('#chosenVoyage'),
  closeLobbyButton: document.querySelector('#closeLobbyButton'),
  closeVoyageButton: document.querySelector('#closeVoyageButton'),
  driftNotice: document.querySelector('#driftNotice'),
  drawAgreement: document.querySelector('#drawAgreement'),
  helpButton: document.querySelector('#helpButton'),
  helpDialog: document.querySelector('#helpDialog'),
  matchSummary: document.querySelector('#matchSummary'),
  moveCount: document.querySelector('#moveCount'),
  moveLimit: document.querySelector('#moveLimit'),
  nextRoundButton: document.querySelector('#nextRoundButton'),
  outcomeBoardDelivery: document.querySelector('#outcomeBoardDelivery'),
  outcomeExplanation: document.querySelector('#outcomeExplanation'),
  outcomeBoat: document.querySelector('#outcomeBoat'),
  outcomeDeliveryPiece: document.querySelector('#outcomeDeliveryPiece'),
  outcomeCountdown: document.querySelector('#outcomeCountdown'),
  outcomeOverlay: document.querySelector('#outcomeOverlay'),
  outcomePlayerResult: document.querySelector('#outcomePlayerResult'),
  outcomeSkipButton: document.querySelector('#outcomeSkipButton'),
  outcomeTitle: document.querySelector('#outcomeTitle'),
  outcomeWinBadge: document.querySelector('#outcomeWinBadge'),
  playerOneInput: document.querySelector('#playerOneInput'),
  playerOneLabel: document.querySelector('#playerOneLabel'),
  playerOneDrawButton: document.querySelector('#playerOneDrawButton'),
  playerTwoInput: document.querySelector('#playerTwoInput'),
  playerTwoLabel: document.querySelector('#playerTwoLabel'),
  playerTwoDrawButton: document.querySelector('#playerTwoDrawButton'),
  restartButton: document.querySelector('#restartButton'),
  ruleToggle: document.querySelector('#ruleToggle'),
  rosterAnimals: document.querySelector('#rosterAnimals'),
  rosterBoats: document.querySelector('#rosterBoats'),
  rosterButton: document.querySelector('#rosterButton'),
  rosterDialog: document.querySelector('#rosterDialog'),
  resultCopy: document.querySelector('#resultCopy'),
  resultDialog: document.querySelector('#resultDialog'),
  resultKicker: document.querySelector('#resultKicker'),
  resultTitle: document.querySelector('#resultTitle'),
  roomCodeField: document.querySelector('#roomCodeField'),
  roomCodeInput: document.querySelector('#roomCodeInput'),
  roundScores: document.querySelector('#roundScores'),
  roundTag: document.querySelector('#roundTag'),
  setupCopy: document.querySelector('#setupCopy'),
  setupDialog: document.querySelector('#setupDialog'),
  setupCloseButton: document.querySelector('#setupCloseButton'),
  setupForm: document.querySelector('#setupForm'),
  setupTitle: document.querySelector('#setupTitle'),
  sideVoyageButton: document.querySelector('#sideVoyageButton'),
  sideVoyageCopy: document.querySelector('#sideVoyageCopy'),
  sideVoyageTitle: document.querySelector('#sideVoyageTitle'),
  soundButton: document.querySelector('#soundButton'),
  stalemateToggle: document.querySelector('#stalemateToggle'),
  startButton: document.querySelector('#startButton'),
  toast: document.querySelector('#toast'),
  turnAvatar: document.querySelector('#turnAvatar'),
  turnCard: document.querySelector('#turnCard'),
  turnCopy: document.querySelector('#turnCopy'),
  turnPlayer: document.querySelector('#turnPlayer'),
  turnTitle: document.querySelector('#turnTitle'),
  lobbyButton: document.querySelector('#lobbyButton'),
  lobbyConnectionStatus: document.querySelector('#lobbyConnectionStatus'),
  lobbyCount: document.querySelector('#lobbyCount'),
  lobbyDialog: document.querySelector('#lobbyDialog'),
  lobbyPlayers: document.querySelector('#lobbyPlayers'),
  lobbyRoomCode: document.querySelector('#lobbyRoomCode'),
  lobbyTitle: document.querySelector('#lobbyTitle'),
  copyRoomCodeButton: document.querySelector('#copyRoomCodeButton'),
  leaveLobbyButton: document.querySelector('#leaveLobbyButton'),
  onlineSetupNote: document.querySelector('#onlineSetupNote'),
  startOnlineGameButton: document.querySelector('#startOnlineGameButton'),
  animalsSeatName: document.querySelector('#animalsSeatName'),
  voyageButton: document.querySelector('#voyageButton'),
  voyageDialog: document.querySelector('#voyageDialog'),
  voyageJumps: document.querySelector('#voyageJumps'),
  voyageList: document.querySelector('#voyageList'),
  voyageSearch: document.querySelector('#voyageSearch'),
  wakeCount: document.querySelector('#wakeCount'),
  wakeTrack: document.querySelector('#wakeTrack'),
}

const storedVoyageId = localStorage.getItem('whale-run-voyage')
const initialVoyage = VOYAGES.find((voyage) => voyage.id === storedVoyageId && voyage.available) || VOYAGES[0]
const storedStalemateSetting = localStorage.getItem('whale-run-stalemates') === 'true'

const match = {
  phase: 'idle',
  mode: 'local',
  allowStalemate: storedStalemateSetting,
  players: ['Mara', 'Finn'],
  voyageId: initialVoyage.id,
  round: 1,
  scores: [null, null],
  roundResults: [null, null],
  drawAgreements: [false, false],
  state: null,
}

const online = {
  setupMode: 'local',
  role: null,
  deviceId: currentDeviceId(),
  roomCode: null,
  room: null,
  lobby: null,
  status: 'closed',
  gameRevision: 0,
  nameDrafts: {
    local: ['Mara', 'Finn'],
    online: ['Mara', ''],
  },
}

match.state = createRound({ ...voyageById(match.voyageId), allowStalemate: match.allowStalemate })
elements.stalemateToggle.checked = match.allowStalemate

let soundEnabled = false
let audioContext = null
let toastTimer = null
let returnToSetup = false
let outcomeTimers = []
let outcomeCountdownInterval = null
let outcomeSequenceCompleted = false

const OUTCOME_DURATION_MS = 10000
const SEA_MARKERS = ['glint', 'starfish', 'beachball', 'seaweed', 'buoy', 'shell', 'driftwood', 'foam']

function activeVoyage() {
  return voyageById(match.voyageId)
}

function rolePlayerIndex(side) {
  if (match.mode === 'online') return side === 'boats' ? 0 : 1
  const boatsPlayer = match.round === 1 ? 0 : 1
  return side === 'boats' ? boatsPlayer : 1 - boatsPlayer
}

function rolePlayer(side) {
  return match.players[rolePlayerIndex(side)]
}

function activeLongVessel() {
  return pieceType(match.state.vessel) || 'cutter'
}

function roundConfiguration() {
  return { ...activeVoyage(), allowStalemate: match.allowStalemate }
}

function showToast(message) {
  elements.toast.textContent = message
  elements.toast.classList.add('is-visible')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2200)
}

function setupPlayerNames() {
  const first = elements.playerOneInput.value.trim() || 'Player one'
  const second = elements.playerTwoInput.value.trim()
  return second ? [first, second] : [first]
}

function setSetupMode(mode) {
  const previousNameMode = online.setupMode === 'local' ? 'local' : 'online'
  online.nameDrafts[previousNameMode] = [elements.playerOneInput.value, elements.playerTwoInput.value]
  online.setupMode = mode
  const nextNameMode = mode === 'local' ? 'local' : 'online'
  ;[elements.playerOneInput.value, elements.playerTwoInput.value] = online.nameDrafts[nextNameMode]
  for (const button of document.querySelectorAll('[data-play-mode]')) {
    const selected = button.dataset.playMode === mode
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
    button.querySelector('.mode-status').textContent = selected
      ? 'Selected'
      : button.dataset.playMode === 'host' ? 'Host' : button.dataset.playMode === 'join' ? 'Join' : 'Local'
  }

  const isLocal = mode === 'local'
  const isJoin = mode === 'join'
  elements.setupTitle.textContent = isLocal ? 'Local multiplayer' : isJoin ? 'Join an online room' : 'Host an online room'
  elements.setupCopy.textContent = isLocal
    ? 'Take turns here. Swap crews after game one.'
    : isJoin
      ? 'Enter the room code. Add one or two players from this device.'
      : 'Create a room. Add up to two players here; others can watch.'
  elements.playerOneLabel.textContent = isLocal ? 'Player one' : 'Player 1 on this device'
  elements.playerTwoLabel.textContent = isLocal ? 'Player two' : 'Player 2 on this device (optional)'
  elements.chosenVoyage.hidden = isJoin
  elements.ruleToggle.hidden = isJoin
  elements.roomCodeField.hidden = !isJoin
  elements.beginMatchButton.textContent = isLocal ? 'Start' : isJoin ? 'Join room' : 'Create room'
  elements.onlineSetupNote.hidden = isLocal
  elements.onlineSetupNote.textContent = onlineConfigured()
    ? 'Up to two players per device. The host chooses who plays.'
    : 'Online play needs a Supabase URL and publishable key in src/online-config.js.'
}

function openSetup() {
  setSetupMode(match.mode === 'online' ? (online.role === 'host' ? 'host' : 'join') : 'local')
  elements.setupDialog.showModal()
}

function onlineHostDeviceId() {
  return online.lobby?.hostDeviceId || null
}

function messageCameFromHost(message) {
  return Boolean(onlineHostDeviceId() && message.deviceId === onlineHostDeviceId())
}

function updatePlayersFromLobby() {
  if (!online.lobby) return
  const boats = playerForSeat(online.lobby, 'boats')
  const animals = playerForSeat(online.lobby, 'animals')
  match.players = [boats?.name || 'Boat captain', animals?.name || 'Sea-life captain']
}

function renderLobby() {
  const lobby = online.lobby
  elements.lobbyRoomCode.textContent = online.roomCode || '------'
  elements.lobbyTitle.textContent = online.role === 'host' ? 'Your online room' : 'Online room'
  const statusCopy = {
    connecting: 'Connecting…',
    connected: online.role === 'host' ? 'You’re the host.' : 'The host chooses who plays.',
    error: 'Connection lost.',
    closed: 'Offline.',
  }
  elements.lobbyConnectionStatus.textContent = statusCopy[online.status] || statusCopy.closed

  if (!lobby) {
    elements.boatsSeatName.textContent = 'Waiting for the host'
    elements.animalsSeatName.textContent = 'Waiting for the host'
    elements.lobbyCount.textContent = '0 players'
    const waiting = document.createElement('p')
    waiting.className = 'lobby-empty'
    waiting.textContent = 'Waiting for the player list…'
    elements.lobbyPlayers.replaceChildren(waiting)
    elements.startOnlineGameButton.hidden = online.role !== 'host'
    elements.startOnlineGameButton.disabled = true
    return
  }

  const boats = playerForSeat(lobby, 'boats')
  const animals = playerForSeat(lobby, 'animals')
  const players = lobbyPlayers(lobby)
  elements.boatsSeatName.textContent = boats?.name || 'Waiting for a player'
  elements.animalsSeatName.textContent = animals?.name || 'Waiting for a player'
  elements.lobbyCount.textContent = `${players.length} ${players.length === 1 ? 'player' : 'players'}`
  elements.startOnlineGameButton.hidden = online.role !== 'host'
  elements.startOnlineGameButton.disabled = !canStartLobbyGame(lobby)
  elements.startOnlineGameButton.textContent = match.phase === 'playing' ? 'Return to game' : 'Start game'

  elements.lobbyPlayers.replaceChildren(...players.map((player) => {
    const row = document.createElement('article')
    const seat = lobby.seats.boats === player.id ? 'boats' : lobby.seats.animals === player.id ? 'animals' : null
    const onThisDevice = player.deviceId === online.deviceId
    const labels = [
      !player.connected ? 'Offline' : seat === 'boats' ? 'Boat crew' : seat === 'animals' ? 'Sea-life crew' : 'Spectator',
      player.isHostDevice ? 'host device' : onThisDevice ? 'this device' : 'online',
    ]
    row.className = `lobby-player${player.connected ? '' : ' is-disconnected'}`
    const copy = document.createElement('div')
    copy.className = 'lobby-player-copy'
    const name = document.createElement('strong')
    const detail = document.createElement('small')
    name.textContent = player.name
    detail.textContent = labels.join(' · ')
    copy.append(name, detail)
    row.append(copy)

    if (online.role === 'host') {
      const controls = document.createElement('div')
      controls.className = 'lobby-seat-controls'
      const options = [
        ['boats', 'Boats'],
        ['animals', 'Sea life'],
        [null, 'Watch'],
      ]
      for (const [targetSeat, label] of options) {
        const button = document.createElement('button')
        button.type = 'button'
        button.dataset.playerId = player.id
        button.dataset.seat = targetSeat || 'spectator'
        button.textContent = label
        button.disabled = !player.connected && targetSeat !== null
        button.classList.toggle('is-active', seat === targetSeat)
        controls.append(button)
      }
      row.append(controls)
    }
    return row
  }))
}

function openLobby() {
  renderLobby()
  if (!elements.lobbyDialog.open) elements.lobbyDialog.showModal()
}

async function broadcastLobbyState() {
  if (online.role !== 'host' || !online.room || !online.lobby) return
  renderLobby()
  await online.room.send('lobby_state', { lobby: online.lobby })
}

function gameSnapshot() {
  const state = structuredClone(match.state)
  return {
    hostDeviceId: onlineHostDeviceId(),
    revision: ++online.gameRevision,
    phase: match.phase,
    voyageId: match.voyageId,
    allowStalemate: match.allowStalemate,
    players: match.players,
    scores: match.scores,
    roundResults: match.roundResults,
    drawAgreements: match.drawAgreements,
    state,
  }
}

async function broadcastGameState() {
  if (online.role !== 'host' || !online.room || !online.lobby || !match.state) return
  await online.room.send('game_state', gameSnapshot())
}

async function broadcastFullRoomState() {
  await broadcastLobbyState()
  if (match.phase !== 'idle') await broadcastGameState()
}

function scheduleReplicaOutcome() {
  const result = match.state.result
  const outcomeDelay = result.reason === 'cornered'
    ? 900
    : match.state.lastMove?.captured ? 560 : 160
  outcomeTimers.push(window.setTimeout(() => showOutcomeAnimation(result), outcomeDelay))
}

function applyGameSnapshot(snapshot) {
  if (!snapshot || snapshot.hostDeviceId !== onlineHostDeviceId()) return
  if (!Number.isInteger(snapshot.revision) || snapshot.revision < 1) return
  if (!VOYAGES.some((voyage) => voyage.id === snapshot.voyageId && voyage.available)) return
  if (!snapshot.state?.pieces || !Array.isArray(snapshot.players) || snapshot.players.length !== 2) return
  if (!Array.isArray(snapshot.scores) || !Array.isArray(snapshot.roundResults) || !Array.isArray(snapshot.drawAgreements)) return
  if (snapshot.revision <= online.gameRevision) return
  const priorMoveCount = match.state?.moveCount
  const priorPhase = match.phase
  const priorVoyageId = match.voyageId
  online.gameRevision = snapshot.revision
  const boardChanged = priorMoveCount !== snapshot.state.moveCount || priorVoyageId !== snapshot.voyageId
  if (boardChanged || priorPhase !== snapshot.phase) clearOutcomeAnimation()
  match.mode = 'online'
  match.phase = snapshot.phase
  match.voyageId = snapshot.voyageId
  match.allowStalemate = snapshot.allowStalemate
  match.players = [...snapshot.players]
  match.scores = [...snapshot.scores]
  match.roundResults = structuredClone(snapshot.roundResults)
  match.drawAgreements = [...snapshot.drawAgreements]
  match.state = structuredClone(snapshot.state)
  localStorage.setItem('whale-run-voyage', match.voyageId)
  render({
    animateMove: priorVoyageId === match.voyageId && priorMoveCount !== undefined && match.state.moveCount > priorMoveCount,
    preserveBoard: !boardChanged && priorPhase === match.phase,
  })
  if (priorPhase !== 'playing' && match.phase === 'playing' && elements.lobbyDialog.open) {
    elements.lobbyDialog.close()
  }
  if (!boardChanged && priorPhase === match.phase && match.phase === 'playing') refreshBoardHighlights()
  renderLobby()
  if (priorPhase !== 'between' && match.phase === 'between' && match.state.result) scheduleReplicaOutcome()
}

function applyOnlineMove(pieceId, target) {
  if (match.phase !== 'playing' || match.state.result) return false
  if (typeof pieceId !== 'string') return false
  if (!target || !Number.isInteger(target.row) || !Number.isInteger(target.col)) return false
  if (pieceDefinition(pieceId)?.side !== match.state.turn) return false
  if (!legalMoves(match.state, pieceId).some((move) => samePosition(move, target))) return false
  match.state = makeMove(match.state, pieceId, target)
  resetDrawAgreement()
  playSound(['whale', 'skiff'].includes(pieceType(pieceId)) ? 'whale' : 'boat')
  render({ animateMove: true })
  if (match.state.lastMove?.promotedFrom) {
    const oldName = pieceDefinition(match.state.lastMove.promotedFrom).name
    const newName = pieceDefinition(match.state.lastMove.pieceId).name
    showToast(`${oldName} became a ${newName}.`)
  }
  if (match.state.result) finishRound()
  void broadcastGameState()
  return true
}

function applyOnlineSelection(pieceId) {
  if (match.phase !== 'playing' || match.state.result) return false
  if (pieceId !== null && !isSelectablePiece(match.state, pieceId)) return false
  match.state.selected = pieceId
  refreshBoardHighlights()
  renderStatus()
  void broadcastGameState()
  return true
}

function handleOnlineMessage(message) {
  if (
    !message
    || message.appId !== ONLINE_CONFIG.appId
    || message.protocolVersion !== ONLINE_CONFIG.protocolVersion
    || message.roomCode !== online.roomCode
    || message.deviceId === online.deviceId
  ) return
  const payload = message.payload || {}

  if (online.role === 'host') {
    if (message.type === 'join_request') {
      online.lobby = upsertLobbyDevice(online.lobby, {
        deviceId: message.deviceId,
        playerNames: payload.playerNames || [],
      })
      void broadcastFullRoomState()
      return
    }
    if (message.type === 'state_request') {
      void broadcastFullRoomState()
      return
    }
    if (message.type === 'move_request') {
      if (!deviceControlsSide(online.lobby, message.deviceId, match.state.turn)) return
      if (!applyOnlineMove(payload.pieceId, payload.target)) void broadcastGameState()
      return
    }
    if (message.type === 'selection_request') {
      if (!deviceControlsSide(online.lobby, message.deviceId, match.state.turn)) return
      if (!applyOnlineSelection(payload.pieceId)) void broadcastGameState()
      return
    }
    if (message.type === 'draw_agreement') {
      const playerIndex = Number(payload.playerIndex)
      const side = playerIndex === 0 ? 'boats' : playerIndex === 1 ? 'animals' : null
      if (!side || !deviceControlsSide(online.lobby, message.deviceId, side)) return
      applyDrawAgreement(playerIndex)
    }
    return
  }

  if (message.type === 'lobby_state') {
    const nextLobby = payload.lobby
    if (!nextLobby?.devices || !nextLobby?.seats || !Number.isInteger(nextLobby.revision)) return
    if (nextLobby.roomCode !== online.roomCode || nextLobby.hostDeviceId !== message.deviceId) return
    if (online.lobby && nextLobby.revision < online.lobby.revision) return
    online.lobby = structuredClone(nextLobby)
    updatePlayersFromLobby()
    renderLobby()
  } else if (message.type === 'game_state' && messageCameFromHost(message)) {
    applyGameSnapshot(payload)
  }
}

function handleOnlinePresence(presences) {
  const connectedDeviceIds = [...new Set(presences.map((presence) => presence.deviceId).filter(Boolean))]
  if (!online.lobby) return
  if (online.role === 'host') {
    const reconciled = reconcileLobbyPresence(online.lobby, connectedDeviceIds)
    const changed = reconciled.revision !== online.lobby.revision
    online.lobby = reconciled
    renderLobby()
    if (changed) void broadcastLobbyState()
  } else {
    renderLobby()
  }
  if (online.role !== 'host' && !connectedDeviceIds.includes(onlineHostDeviceId())) {
    elements.lobbyConnectionStatus.textContent = 'Host offline. Waiting to reconnect…'
  }
}

async function startOnlineRoom(role) {
  if (location.protocol === 'file:') {
    elements.onlineSetupNote.hidden = false
    elements.onlineSetupNote.textContent = 'Online rooms need localhost or GitHub Pages. Run npm run dev.'
    return
  }
  if (!onlineConfigured()) {
    elements.onlineSetupNote.hidden = false
    elements.onlineSetupNote.textContent = 'Add the Supabase URL and publishable key in src/online-config.js.'
    return
  }

  const playerNames = setupPlayerNames()
  const roomCode = role === 'host'
    ? createRoomCode()
    : elements.roomCodeInput.value.trim().toUpperCase().replace(/[^A-Z2-9]/g, '')
  if (roomCode.length !== 6) {
    elements.roomCodeInput.focus()
    elements.onlineSetupNote.hidden = false
    elements.onlineSetupNote.textContent = 'Enter the host’s six-character code.'
    return
  }

  elements.beginMatchButton.disabled = true
  elements.beginMatchButton.textContent = role === 'host' ? 'Creating room…' : 'Joining room…'
  try {
    await leaveOnlineRoom({ quiet: true })
    online.role = role
    online.roomCode = roomCode
    online.status = 'connecting'
    online.gameRevision = 0
    online.lobby = role === 'host'
      ? createLobby({ roomCode, hostDeviceId: online.deviceId, playerNames })
      : null
    online.room = new RealtimeRoom({
      roomCode,
      deviceId: online.deviceId,
      playerNames,
      onMessage: handleOnlineMessage,
      onPresence: handleOnlinePresence,
      onStatus: (status) => {
        online.status = status
        renderLobby()
      },
    })
    await online.room.connect()
    match.mode = 'online'
    match.phase = 'idle'
    match.scores = [0, 0]
    match.roundResults = [null, null]
    resetDrawAgreement()
    if (role === 'host') {
      updatePlayersFromLobby()
      await broadcastLobbyState()
    } else {
      await online.room.send('join_request', { playerNames })
      await online.room.send('state_request')
    }
    elements.setupDialog.close()
    render()
    if (match.phase !== 'playing') openLobby()
  } catch (error) {
    console.error(error)
    elements.onlineSetupNote.hidden = false
    elements.onlineSetupNote.textContent = error.message || 'Could not connect.'
    await leaveOnlineRoom({ quiet: true })
  } finally {
    elements.beginMatchButton.disabled = false
    setSetupMode(online.setupMode)
  }
}

async function leaveOnlineRoom({ quiet = false } = {}) {
  const room = online.room
  online.room = null
  if (room) await room.close()
  online.role = null
  online.roomCode = null
  online.lobby = null
  online.status = 'closed'
  online.gameRevision = 0
  if (elements.lobbyDialog.open) elements.lobbyDialog.close()
  if (match.mode === 'online') {
    match.mode = 'local'
    match.phase = 'idle'
    match.players = ['Mara', 'Finn']
    match.scores = [null, null]
    match.roundResults = [null, null]
    resetDrawAgreement()
    match.state = createRound(roundConfiguration())
    render()
  }
  if (!quiet) showToast('You left the room.')
}

function playSound(kind) {
  if (!soundEnabled) return
  audioContext ??= new AudioContext()
  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  oscillator.connect(gain)
  gain.connect(audioContext.destination)

  const settings = {
    boat: [110, 80, 0.28],
    cornered: [392, 587, 0.5],
    select: [420, 520, 0.08],
    whale: [190, 310, 0.25],
  }[kind] || [260, 320, 0.12]

  oscillator.type = kind === 'boat' ? 'triangle' : 'sine'
  oscillator.frequency.setValueAtTime(settings[0], now)
  oscillator.frequency.exponentialRampToValueAtTime(settings[1], now + settings[2])
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + settings[2])
  oscillator.start(now)
  oscillator.stop(now + settings[2] + 0.02)
}

function createPiece(pieceId, row, animateMove = false) {
  const type = pieceType(pieceId)
  const piece = document.createElement('div')
  const moved = animateMove && match.state.lastMove?.pieceId === pieceId
  const didCapture = moved && Boolean(match.state.lastMove?.captured)
  const didPromote = moved && Boolean(match.state.lastMove?.promotedFrom)
  piece.className = `piece piece-${type}${moved ? ' just-moved' : ''}${didCapture ? ' did-capture' : ''}${didPromote ? ' did-promote' : ''}`
  piece.dataset.piece = pieceId
  piece.style.setProperty('--piece-depth', (0.79 + row * 0.035).toFixed(3))

  if (moved) {
    const { from, to } = match.state.lastMove
    piece.style.setProperty('--move-x', `${(from.col - to.col) * 100}%`)
    piece.style.setProperty('--move-y', `${(from.row - to.row) * 100}%`)
    piece.style.setProperty('--move-x-mid', `${(from.col - to.col) * 42}%`)
    piece.style.setProperty('--move-y-mid', `${(from.row - to.row) * 42}%`)
    piece.style.setProperty('--move-x-dive', `${(from.col - to.col) * 85}%`)
    piece.style.setProperty('--move-y-dive', `${(from.row - to.row) * 85}%`)
    piece.style.setProperty('--move-x-rise', `${(from.col - to.col) * 32}%`)
    piece.style.setProperty('--move-y-rise', `${(from.row - to.row) * 32}%`)
  }

  const image = document.createElement('img')
  image.src = assets[type]
  image.alt = pieceDefinition(pieceId).name
  image.draggable = false
  piece.append(image)

  if (['tug', 'dredger'].includes(type)) {
    const smoke = document.createElement('span')
    smoke.className = `smoke smoke-${type}`
    smoke.setAttribute('aria-hidden', 'true')
    smoke.innerHTML = '<i></i><i></i><i></i>'
    piece.append(smoke)
  }

  if (type === 'whale') {
    const spout = document.createElement('span')
    spout.className = 'water-spout'
    spout.setAttribute('aria-hidden', 'true')
    spout.innerHTML = '<i></i><i></i><i></i><b></b>'
    piece.append(spout)
  }

  if (type === 'skiff') {
    const bubbles = document.createElement('span')
    bubbles.className = 'submarine-bubbles'
    bubbles.setAttribute('aria-hidden', 'true')
    bubbles.innerHTML = '<i></i><i></i><i></i><i></i>'
    piece.append(bubbles)
  }

  const foregroundWave = document.createElement('span')
  foregroundWave.className = 'piece-wave'
  foregroundWave.setAttribute('aria-hidden', 'true')
  piece.append(foregroundWave)
  return piece
}

function createCaptureEffect(pieceId) {
  const type = pieceType(pieceId)
  const effect = document.createElement('span')
  effect.className = 'capture-splash'
  effect.setAttribute('aria-hidden', 'true')

  const image = document.createElement('img')
  image.src = assets[type]
  image.alt = ''
  effect.append(image)

  for (let index = 0; index < 4; index += 1) {
    const bubble = document.createElement('i')
    effect.append(bubble)
  }
  return effect
}

function cellLabel(row, col, pieceId) {
  const patch = `Water patch ${row + 1}, ${col + 1}`
  if (!pieceId) return patch
  return `${patch}: ${pieceDefinition(pieceId).name}`
}

function createSeaMarker(row, col) {
  const checkerIndex = row * 4 + Math.floor(col / 2)
  const markerIndex = (checkerIndex * 5 + row * 3) % SEA_MARKERS.length
  const marker = document.createElement('span')
  marker.className = `sea-marker marker-${SEA_MARKERS[markerIndex]}`
  marker.style.setProperty('--marker-x', `${17 + ((row * 29 + col * 17) % 66)}%`)
  marker.style.setProperty('--marker-y', `${19 + ((row * 13 + col * 31) % 61)}%`)
  marker.style.setProperty('--marker-turn', `${-28 + ((row * 23 + col * 19) % 57)}deg`)
  marker.style.setProperty('--marker-delay', `${-((row * 7 + col * 11) % 28) / 10}s`)
  marker.setAttribute('aria-hidden', 'true')
  marker.append(document.createElement('i'))
  return marker
}

function isActiveCrewDanger(state, target, pieceId) {
  if (pieceId) return false
  const opposingSide = state.turn === 'boats' ? 'animals' : 'boats'
  return threatenedBySide(state, target, opposingSide)
}

function renderBoard({ animateMove = false } = {}) {
  const selectedMoves = match.state.selected ? legalMoves(match.state, match.state.selected) : []
  elements.board.replaceChildren()

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const target = { row, col }
      const pieceId = pieceAt(match.state, target)
      const cell = document.createElement('button')
      const isLegal = selectedMoves.some((move) => samePosition(move, target))
      const isSelected = pieceId && pieceId === match.state.selected
      const isThreatened = isActiveCrewDanger(match.state, target, pieceId)
      const isTideMarked = (row + col) % 2 === 1
      const markerSeed = ((row + 1) * 13) ^ ((col + 1) * 7)
      const hasSeaMarker = !isTideMarked && markerSeed % 11 < 4

      cell.type = 'button'
      cell.className = [
        'water-cell',
        `water-${(row * 3 + col * 5) % 7}`,
        isTideMarked ? 'is-tide-marked' : '',
        pieceId ? 'has-piece' : '',
        isLegal ? 'is-legal' : '',
        isSelected ? 'is-selected' : '',
        isThreatened ? 'is-danger' : '',
      ].filter(Boolean).join(' ')
      cell.dataset.row = row
      cell.dataset.col = col
      cell.style.setProperty('--row-depth', (0.76 + row * 0.034).toFixed(3))
      cell.setAttribute('role', 'gridcell')
      cell.setAttribute('aria-label', `${cellLabel(row, col, pieceId)}${isLegal ? ': legal destination' : ''}${isThreatened ? ': watched by the other crew' : ''}`)
      cell.addEventListener('click', () => handleCellClick(target))

      const ripple = document.createElement('span')
      ripple.className = 'cell-ripple'
      ripple.setAttribute('aria-hidden', 'true')
      if (hasSeaMarker) cell.append(createSeaMarker(row, col))
      cell.append(ripple)
      if (
        animateMove &&
        match.state.lastMove?.captured &&
        samePosition(match.state.lastMove.capturedAt || match.state.lastMove.to, target)
      ) {
        cell.append(createCaptureEffect(match.state.lastMove.captured))
      }
      if (pieceId) cell.append(createPiece(pieceId, row, animateMove))
      elements.board.append(cell)
    }
  }
}

function refreshBoardHighlights() {
  const selectedMoves = match.state.selected ? legalMoves(match.state, match.state.selected) : []

  for (const cell of elements.board.children) {
    const target = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }
    const pieceId = pieceAt(match.state, target)
    const isLegal = selectedMoves.some((move) => samePosition(move, target))
    const isSelected = Boolean(pieceId && pieceId === match.state.selected)
    const isThreatened = isActiveCrewDanger(match.state, target, pieceId)

    cell.classList.toggle('is-legal', isLegal)
    cell.classList.toggle('is-selected', isSelected)
    cell.classList.toggle('is-danger', isThreatened)
    cell.setAttribute('aria-label', `${cellLabel(target.row, target.col, pieceId)}${isLegal ? ': legal destination' : ''}${isThreatened ? ': watched by the other crew' : ''}`)
  }
}

function renderCrew() {
  const groups = Object.keys(match.state.pieces).reduce((entries, pieceId) => {
    const type = pieceType(pieceId)
    const existing = entries.find((entry) => entry.type === type)
    if (existing) existing.count += 1
    else entries.push({ pieceId, type, count: 1 })
    return entries
  }, [])
  elements.crewCards.replaceChildren(...groups.map(({ pieceId, type, count }) => {
    const card = document.createElement('article')
    const definition = pieceDefinition(pieceId)
    const isActive = definition.side === match.state.turn && match.phase === 'playing'
    card.className = `crew-card${isActive ? ' is-active' : ''}`
    card.innerHTML = `
      <div class="crew-thumb"><img src="${assets[type]}" alt="" /></div>
      <div><strong>${count > 1 ? `${count} × ` : ''}${definition.name}</strong></div>
      <span class="crew-status">${isActive ? 'Moving' : ''}</span>
    `
    return card
  }))
}

function renderWake() {
  elements.wakeCount.textContent = match.state.moveCount
  elements.moveCount.textContent = match.state.moveCount
  elements.moveLimit.textContent = match.state.maxMoves
  const maxTurns = match.state.maxMoves
  const wakeMarkers = Array.from({ length: 10 }, (_, index) => {
    const marker = document.createElement('span')
    const threshold = Math.ceil(((index + 1) / 10) * maxTurns)
    marker.className = match.state.moveCount >= threshold ? 'is-filled' : ''
    return marker
  })
  elements.wakeTrack.replaceChildren(...wakeMarkers)

  const noProgressLimit = noProgressMoveLimit(match.state)
  const noticeStartsAt = Math.ceil(noProgressLimit / 2)
  const showDriftNotice = match.phase === 'playing'
    && !match.state.result
    && match.state.noProgressMoves >= noticeStartsAt
  elements.driftNotice.hidden = !showDriftNotice
  if (showDriftNotice) {
    const remaining = noProgressLimit - match.state.noProgressMoves
    elements.driftNotice.textContent = `No progress · draw in ${remaining} ${remaining === 1 ? 'move' : 'moves'}`
  }
}

function renderVoyageSummary() {
  const voyage = activeVoyage()
  const chapter = chapterFor(voyage)
  elements.chosenVoyageNumber.textContent = String(voyage.order).padStart(2, '0')
  elements.chosenVoyageChapter.textContent = chapter.title
  elements.chosenVoyageTitle.textContent = voyage.title
  elements.chosenVoyageCopy.textContent = voyage.strapline
  elements.sideVoyageTitle.textContent = voyage.title
  elements.sideVoyageCopy.textContent = `Voyage ${voyage.order} · ${chapter.title}`
}

function difficultyDots(level) {
  return Array.from({ length: 5 }, (_, index) => `<i class="${index < level ? 'is-filled' : ''}"></i>`).join('')
}

function renderVoyageLibrary(query = '') {
  const normalized = query.trim().toLowerCase()
  const groups = VOYAGE_CHAPTERS.map((chapter) => {
    const voyages = VOYAGES.filter((voyage) => voyage.chapterId === chapter.id).filter((voyage) => {
      if (!normalized) return true
      return [voyage.title, voyage.strapline, voyage.story, voyage.objective, voyage.lesson, chapter.title, `${voyage.pieceCount} travelers`]
        .some((value) => value.toLowerCase().includes(normalized))
    })
    return { chapter, voyages }
  }).filter(({ voyages }) => voyages.length)

  elements.voyageJumps.replaceChildren(...groups.map(({ chapter }) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.chapterId = chapter.id
    button.textContent = `${chapter.number} · ${chapter.title}`
    return button
  }))

  elements.voyageList.replaceChildren(...groups.map(({ chapter, voyages }) => {
    const section = document.createElement('details')
    section.className = 'voyage-chapter'
    section.dataset.chapterId = chapter.id
    section.open = true
    section.innerHTML = `
      <summary>
        <span class="chapter-number">${chapter.number}</span>
        <span><strong>${chapter.title}</strong><small>${chapter.description}</small></span>
        <span class="chapter-count">${voyages.length}</span>
      </summary>
      <div class="voyage-cards"></div>
    `
    const container = section.querySelector('.voyage-cards')
    container.replaceChildren(...voyages.map((voyage) => {
      const selected = voyage.id === match.voyageId
      const actionLabel = match.phase === 'idle'
        ? selected ? 'Selected' : 'Choose'
        : selected ? 'Restart' : 'Switch'
      const card = document.createElement('article')
      card.className = `voyage-card${selected ? ' is-selected' : ''}${voyage.available ? '' : ' is-charted'}`
      card.innerHTML = `
        <div class="voyage-card-number">${String(voyage.order).padStart(2, '0')}</div>
        <div class="voyage-card-copy">
          <div class="voyage-card-topline"><span>${voyage.pieceCount} travelers · ${voyage.lesson}</span><span class="difficulty-dots" aria-label="Difficulty ${voyage.difficulty} of 5">${difficultyDots(voyage.difficulty)}</span></div>
          <strong>${voyage.title}</strong>
          <p>${voyage.story}</p>
        </div>
        ${voyage.available
          ? `<button class="choose-voyage" type="button" data-voyage-id="${voyage.id}">${actionLabel}</button>`
          : '<span class="charted-label">Coming later</span>'}
      `
      return card
    }))
    return section
  }))

  if (!groups.length) {
    const empty = document.createElement('div')
    empty.className = 'voyage-empty'
    empty.textContent = 'No matching voyages.'
    elements.voyageList.append(empty)
  }
}

function renderScores() {
  if (match.phase === 'idle') {
    elements.roundScores.replaceChildren()
    return
  }

  elements.roundScores.replaceChildren(...match.players.map((player, index) => {
    const card = document.createElement('div')
    const score = match.scores[index]
    card.className = 'round-score'
    const name = document.createElement('span')
    const value = document.createElement('strong')
    const label = document.createElement('small')
    name.textContent = player
    value.textContent = score === null ? '—' : score
    label.textContent = score === null ? 'waiting' : score === 1 ? 'win' : 'wins'
    card.append(name, value, label)
    return card
  }))
}

function renderDrawAgreement() {
  const isPlaying = match.phase === 'playing' && !match.state.result
  elements.drawAgreement.hidden = !isPlaying
  const buttons = [elements.playerOneDrawButton, elements.playerTwoDrawButton]
  buttons.forEach((button, index) => {
    const agreed = match.drawAgreements[index]
    const side = index === 0 ? 'boats' : 'animals'
    const canAgree = match.mode !== 'online' || Boolean(online.lobby && deviceControlsSide(online.lobby, online.deviceId, side))
    button.textContent = agreed ? `✓ ${match.players[index]} agrees` : `${match.players[index]} agrees`
    button.setAttribute('aria-pressed', String(agreed))
    button.classList.toggle('is-agreed', agreed)
    button.disabled = !canAgree
    button.title = canAgree ? '' : `${match.players[index]} must agree from their device.`
  })
}

function resetDrawAgreement() {
  match.drawAgreements = [false, false]
}

function renderRoster() {
  const renderGroup = (ids) => ids.map((pieceId) => {
    const item = document.createElement('article')
    item.className = 'roster-item'
    item.innerHTML = `
      <div class="roster-art"><img src="${assets[pieceId]}" alt="" loading="lazy" /></div>
      <div><strong>${ROSTER[pieceId].name}</strong><span>${ROSTER[pieceId].description}</span></div>
    `
    return item
  })

  elements.rosterBoats.replaceChildren(...renderGroup(ROSTER_ORDER.boats))
  elements.rosterAnimals.replaceChildren(...renderGroup(ROSTER_ORDER.animals))
}

function renderStatus() {
  const state = match.state
  const voyage = activeVoyage()
  const chapter = chapterFor(voyage)
  elements.startButton.hidden = match.phase !== 'idle' || match.mode === 'online'
  elements.lobbyButton.hidden = match.mode !== 'online'
  elements.restartButton.hidden = match.phase === 'idle' || (match.mode === 'online' && online.role !== 'host')
  elements.roundTag.textContent = match.phase === 'idle'
    ? match.mode === 'online' ? `Online room ${online.roomCode || ''}` : `Local two-player · Voyage ${voyage.order}`
    : match.mode === 'online'
      ? `Room ${online.roomCode} · ${online.lobby ? lobbyPlayers(online.lobby).length : 0} players`
      : `Local two-player · Round ${match.round} of 2`

  if (match.phase === 'idle') {
    elements.turnTitle.textContent = match.mode === 'online' ? 'Waiting in the harbor' : voyage.title
    elements.turnCopy.textContent = match.mode === 'online'
      ? online.role === 'host' ? 'Choose two players, then start.' : 'Waiting for the host.'
      : voyage.story
    elements.turnPlayer.textContent = match.mode === 'online' ? 'Lobby' : 'Waiting'
    elements.turnAvatar.textContent = '≈'
    elements.turnCard.dataset.side = 'waiting'
    elements.boardCaption.textContent = match.mode === 'online'
      ? 'The game will appear here.'
      : 'Ready when you are.'
    return
  }

  const isBoats = state.turn === 'boats'
  const player = rolePlayer(state.turn)
  const controlsTurn = match.mode !== 'online' || Boolean(online.lobby && deviceControlsSide(online.lobby, online.deviceId, state.turn))
  const inDanger = threatenedByBoats(state, state.pieces.whale)
  elements.turnPlayer.textContent = player
  elements.turnAvatar.textContent = isBoats ? '⚓' : '◖'
  elements.turnCard.dataset.side = state.turn

  if (isBoats) {
    elements.turnTitle.textContent = `${player}: Boat crew`
    elements.turnCopy.textContent = controlsTurn
      ? 'Choose a boat, then a glowing patch.'
      : `Watching ${player}.`
    elements.boardCaption.textContent = state.selected
      ? `${pieceDefinition(state.selected).name} selected.`
      : 'Choose a boat.'
  } else {
    elements.turnTitle.textContent = inDanger ? `${player}: Find safe water` : `${player}: Sea-life crew`
    elements.turnCopy.textContent = !controlsTurn
      ? `Watching ${player}.`
      : inDanger
      ? 'Move the whale out of danger.'
      : 'Choose a traveler, then a glowing patch.'
    elements.boardCaption.textContent = state.selected
      ? `${pieceDefinition(state.selected).name} selected.`
      : 'Choose a sea traveler.'
  }
}

function render({ animateMove = false, preserveBoard = false } = {}) {
  if (!preserveBoard) renderBoard({ animateMove })
  renderCrew()
  renderWake()
  renderScores()
  renderDrawAgreement()
  renderStatus()
  renderVoyageSummary()
}

function clearOutcomeAnimation() {
  outcomeTimers.forEach((timer) => window.clearTimeout(timer))
  outcomeTimers = []
  if (outcomeCountdownInterval !== null) {
    window.clearInterval(outcomeCountdownInterval)
    outcomeCountdownInterval = null
  }
  elements.outcomeOverlay.hidden = true
  elements.outcomeOverlay.removeAttribute('data-reason')
  elements.outcomeOverlay.removeAttribute('data-winner')
  elements.outcomeOverlay.removeAttribute('data-final-mover')
  elements.board.querySelectorAll('.is-outcome-source').forEach((piece) => piece.classList.remove('is-outcome-source'))
  for (const property of [
    '--delivery-start-x', '--delivery-start-y', '--delivery-end-x', '--delivery-end-y',
    '--delivery-facing', '--delivery-depth', '--delivery-whale-x', '--delivery-whale-y',
    '--delivery-whale-depth', '--delivery-cake-x', '--delivery-cake-y',
  ]) {
    elements.outcomeBoardDelivery.style.removeProperty(property)
  }
}

function prepareCakeDelivery() {
  const moverId = match.state.lastMove?.pieceId
  const moverPosition = moverId ? match.state.pieces[moverId] || match.state.lastMove?.to : null
  const whaleEntry = Object.entries(match.state.pieces).find(([pieceId]) => pieceType(pieceId) === 'whale')
  if (!moverId || !moverPosition || !whaleEntry) return false

  const [whaleId, whalePosition] = whaleEntry
  const rowDelta = whalePosition.row - moverPosition.row
  const colDelta = whalePosition.col - moverPosition.col
  const distance = Math.max(1, Math.hypot(rowDelta, colDelta))
  const deliveryRatio = Math.max(0, (distance - 0.82) / distance)
  const cakeRatio = Math.max(0, (distance - 0.38) / distance)
  const startX = ((moverPosition.col + 0.5) / BOARD_SIZE) * 100
  const startY = ((moverPosition.row + 0.5) / BOARD_SIZE) * 100
  const endX = ((moverPosition.col + colDelta * deliveryRatio + 0.5) / BOARD_SIZE) * 100
  const endY = ((moverPosition.row + rowDelta * deliveryRatio + 0.5) / BOARD_SIZE) * 100
  const whaleX = ((whalePosition.col + 0.5) / BOARD_SIZE) * 100
  const whaleY = ((whalePosition.row + 0.5) / BOARD_SIZE) * 100
  const cakeX = ((moverPosition.col + colDelta * cakeRatio + 0.5) / BOARD_SIZE) * 100
  const cakeY = ((moverPosition.row + rowDelta * cakeRatio + 0.5) / BOARD_SIZE) * 100
  const stage = elements.outcomeBoardDelivery

  stage.style.setProperty('--delivery-start-x', `${startX}%`)
  stage.style.setProperty('--delivery-start-y', `${startY}%`)
  stage.style.setProperty('--delivery-end-x', `${endX}%`)
  stage.style.setProperty('--delivery-end-y', `${endY}%`)
  stage.style.setProperty('--delivery-facing', colDelta < 0 ? '-1' : '1')
  stage.style.setProperty('--delivery-depth', (0.79 + moverPosition.row * 0.035).toFixed(3))
  stage.style.setProperty('--delivery-whale-x', `${whaleX}%`)
  stage.style.setProperty('--delivery-whale-y', `${whaleY}%`)
  stage.style.setProperty('--delivery-whale-depth', (0.79 + whalePosition.row * 0.035).toFixed(3))
  stage.style.setProperty('--delivery-cake-x', `${cakeX}%`)
  stage.style.setProperty('--delivery-cake-y', `${cakeY}%`)
  elements.outcomeDeliveryPiece.src = assets[pieceType(moverId)]

  for (const piece of elements.board.querySelectorAll('.piece')) {
    if ([moverId, whaleId].includes(piece.dataset.piece)) piece.classList.add('is-outcome-source')
  }
  return true
}

function showOutcomeAnimation(result) {
  const isTrueDraw = result.winner === null
  const roundResult = match.roundResults[match.round - 1]
  const winnerName = roundResult.winnerIndex === null ? null : match.players[roundResult.winnerIndex]
  const finalMoverType = pieceType(match.state.lastMove?.pieceId || '') || activeLongVessel()
  const presentations = {
    cornered: {
      title: 'A cake for the whale!',
      explanation: 'The boats closed every channel and delivered the cake.',
    },
    'boats-cornered': {
      title: 'The tug is trapped',
      explanation: 'Sea life covered every safe channel.',
    },
    stalemate: {
      title: isTrueDraw
        ? 'No moves: draw'
        : result.winner === 'boats' ? 'The boats win' : 'Sea life escapes',
      explanation: result.message,
    },
    fog: {
      title: 'The whale reached the fog',
      explanation: `The whale escaped after ${match.state.whaleTurns} turns.`,
    },
    'move-limit': {
      title: isTrueDraw
        ? 'Tide clock: draw'
        : result.winner === 'boats' ? 'The boats win on time' : 'Sea life wins on time',
      explanation: result.message,
    },
    'forced-draw': {
      title: isTrueDraw
        ? 'No progress: draw'
        : result.winner === 'boats' ? 'The boats win' : 'Sea life wins',
      explanation: result.message,
    },
    'agreed-draw': {
      title: 'Draw agreed',
      explanation: result.message,
    },
    'boats-cleared': {
      title: 'The whale cleared the water',
      explanation: 'No boats remain.',
    },
    'animals-cleared': {
      title: 'The boats cleared the water',
      explanation: 'No sea travelers remain.',
    },
  }
  const presentation = presentations[result.reason] || {
    title: 'Voyage complete',
    explanation: result.message,
  }

  elements.outcomeOverlay.dataset.reason = result.reason
  elements.outcomeOverlay.dataset.winner = result.winner || 'draw'
  elements.outcomeOverlay.dataset.finalMover = finalMoverType
  if (result.reason === 'cornered') prepareCakeDelivery()
  elements.outcomeWinBadge.textContent = winnerName ? `${winnerName} wins!` : 'Draw!'
  elements.outcomePlayerResult.textContent = winnerName
    ? `${winnerName} won this game.`
    : 'This game is a draw.'
  elements.outcomeBoat.src = assets[result.reason === 'cornered' ? finalMoverType : activeLongVessel()]
  elements.outcomeTitle.textContent = presentation.title
  elements.outcomeExplanation.textContent = presentation.explanation
  outcomeSequenceCompleted = false
  const deliveryDuration = result.reason === 'cornered' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 2800
    : 0
  const victoryAt = Date.now() + deliveryDuration
  const finishAt = victoryAt + OUTCOME_DURATION_MS
  const updateCountdown = () => {
    const now = Date.now()
    if (now < victoryAt) {
      elements.outcomeCountdown.textContent = 'Delivering cake…'
      return
    }
    const seconds = Math.max(0, Math.ceil((finishAt - now) / 1000))
    elements.outcomeCountdown.textContent = `Continue in ${seconds}s`
  }
  updateCountdown()
  outcomeCountdownInterval = window.setInterval(updateCountdown, 250)
  elements.outcomeOverlay.hidden = false
  outcomeTimers.push(window.setTimeout(completeOutcomeSequence, OUTCOME_DURATION_MS + deliveryDuration))
}

function handleCellClick(target) {
  if (match.phase !== 'playing' || match.state.result) return
  if (
    match.mode === 'online'
    && (!online.lobby || !deviceControlsSide(online.lobby, online.deviceId, match.state.turn))
  ) {
    showToast(`Watching ${rolePlayer(match.state.turn)}.`)
    return
  }
  const clickedPiece = pieceAt(match.state, target)
  const clickedSide = clickedPiece ? pieceDefinition(clickedPiece).side : null

  if (match.state.selected) {
    const possible = legalMoves(match.state, match.state.selected)
    if (possible.some((move) => samePosition(move, target))) {
      const movingPiece = match.state.selected
      if (match.mode === 'online' && online.role !== 'host') {
        match.state.selected = null
        refreshBoardHighlights()
        void online.room.send('move_request', { pieceId: movingPiece, target })
        showToast('Move sent.')
      } else {
        applyOnlineMove(movingPiece, target)
      }
      return
    }
  }

  if (clickedPiece && clickedSide === match.state.turn) {
    const selectedPiece = match.state.selected === clickedPiece ? null : clickedPiece
    match.state.selected = selectedPiece
    playSound('select')
    refreshBoardHighlights()
    renderStatus()
    if (match.mode === 'online') {
      if (online.role === 'host') {
        void broadcastGameState()
      } else {
        void online.room.send('selection_request', { pieceId: selectedPiece })
      }
    }
    return
  }

  if (clickedPiece) {
    showToast(`It’s ${rolePlayer(match.state.turn)}’s turn.`)
  } else {
    showToast('Choose your crew first.')
  }
}

function renderMatchSummary() {
  const reasonLabels = {
    cornered: 'Surprise delivered',
    'boats-cornered': 'Harbor closed',
    stalemate: 'Underwater escape',
    fog: 'Reached the fog',
    'move-limit': 'Reached the move limit',
    'forced-draw': 'No progress',
    'agreed-draw': 'Both captains agreed',
    'boats-cleared': 'All boats removed',
    'animals-cleared': 'All sea travelers removed',
  }

  const rows = match.roundResults.map((roundResult, index) => {
    const row = document.createElement('article')
    const heading = document.createElement('span')
    const result = document.createElement('strong')
    const details = document.createElement('small')

    heading.textContent = `Game ${index + 1}`
    result.textContent = roundResult.winnerIndex === null
      ? 'Draw'
      : `${match.players[roundResult.winnerIndex]} wins`
    const role = roundResult.winnerSide === null
      ? 'No winning crew'
      : roundResult.winnerSide === 'boats' ? 'Boat crew' : 'Sea-life crew'
    const moveLabel = roundResult.moves === 1 ? 'move' : 'moves'
    details.textContent = `${roundResult.moves} ${moveLabel} · ${role} · ${reasonLabels[roundResult.reason] || 'Complete'}`
    row.append(heading, result, details)
    return row
  })

  elements.matchSummary.replaceChildren(...rows)
  elements.matchSummary.hidden = false
}

function showRoundResultDialog() {
  const roundResult = match.roundResults[match.round - 1]
  const winnerIndex = roundResult.winnerIndex
  if (match.mode === 'online') {
    elements.matchSummary.hidden = true
    elements.resultKicker.textContent = 'Game over'
    elements.resultTitle.textContent = winnerIndex === null
      ? 'Draw'
      : `${match.players[winnerIndex]} wins`
    elements.resultCopy.textContent = `${match.state.moveCount} moves. Return to the lobby to play again.`
    elements.nextRoundButton.textContent = 'Return to lobby'
    elements.resultDialog.showModal()
    return
  }
  if (match.round === 1) {
    elements.matchSummary.hidden = true
    const resultTitles = {
      cornered: 'The cake reached the whale',
      'boats-cornered': 'The tug is trapped',
      stalemate: match.state.result.winner === null
        ? 'No legal moves: draw'
        : 'The whale escaped',
      fog: 'The whale reached the fog',
      'move-limit': match.state.result.winner === null
        ? 'Move limit: draw'
        : match.state.result.winner === 'boats'
          ? 'The boats win on time'
          : 'Sea life wins on time',
      'forced-draw': match.state.result.winner === null
        ? 'No progress: draw'
        : match.state.result.winner === 'boats'
          ? 'The boats win'
          : 'Sea life wins',
      'agreed-draw': 'Draw agreed',
      'boats-cleared': 'The whale cleared the water',
      'animals-cleared': 'The boats cleared the water',
    }
    elements.resultKicker.textContent = 'Game one complete'
    elements.resultTitle.textContent = resultTitles[match.state.result.reason] || 'Voyage complete'
    elements.resultCopy.textContent = match.state.result.winner === null
      ? `${match.state.moveCount} moves. Switch crews for game two.`
      : `${match.players[winnerIndex]} won in ${match.state.moveCount} moves. Switch crews for game two.`
    elements.nextRoundButton.textContent = 'Switch sides'
  } else {
    const wins = [0, 0]
    const draws = match.roundResults.filter((result) => result.winnerIndex === null).length
    match.roundResults.forEach((result) => {
      if (result.winnerIndex !== null) wins[result.winnerIndex] += 1
    })
    const matchWinnerIndex = wins[0] === wins[1] ? null : wins[0] > wins[1] ? 0 : 1
    elements.resultKicker.textContent = 'Voyage complete'
    elements.resultTitle.textContent = matchWinnerIndex === null
      ? draws === 2 ? 'Voyage drawn' : 'One win each'
      : `${match.players[matchWinnerIndex]} wins`
    elements.resultCopy.textContent = matchWinnerIndex === null
      ? draws === 2
        ? 'Both games were draws.'
        : 'One win each.'
      : draws === 1
        ? 'One win and one draw.'
        : `${match.players[matchWinnerIndex]} won both games.`
    renderMatchSummary()
    elements.nextRoundButton.textContent = 'New match'
  }
  elements.resultDialog.showModal()
}

function completeOutcomeSequence() {
  if (outcomeSequenceCompleted || match.phase !== 'between') return
  outcomeSequenceCompleted = true
  clearOutcomeAnimation()
  showRoundResultDialog()
}

function finishRound() {
  match.phase = 'between'
  const winnerSide = match.state.result.winner === null
    ? null
    : match.state.result.winner === 'boats' ? 'boats' : 'animals'
  const winnerIndex = winnerSide === null ? null : rolePlayerIndex(winnerSide)
  if (winnerIndex !== null) match.scores[winnerIndex] += 1
  match.roundResults[match.round - 1] = {
    moves: match.state.moveCount,
    reason: match.state.result.reason,
    winnerIndex,
    winnerSide,
  }
  render({ preserveBoard: true })
  playSound(match.state.result.winner === null ? 'select' : match.state.result.winner === 'boats' ? 'cornered' : 'whale')

  const result = match.state.result
  const outcomeDelay = result.reason === 'cornered'
    ? 900
    : match.state.lastMove?.captured ? 560 : 160
  outcomeTimers.push(window.setTimeout(() => showOutcomeAnimation(result), outcomeDelay))
}

function startRound(round) {
  clearOutcomeAnimation()
  match.round = round
  match.phase = 'playing'
  resetDrawAgreement()
  match.state = createRound(roundConfiguration())
  render()
  showToast(match.mode === 'online'
    ? `Boats: ${rolePlayer('boats')} · Sea life: ${rolePlayer('animals')}`
    : `Round ${round} · Boats: ${rolePlayer('boats')}`)
}

function startMatch() {
  const playerOne = elements.playerOneInput.value.trim() || 'Player one'
  const playerTwo = elements.playerTwoInput.value.trim() || 'Player two'
  match.mode = 'local'
  match.players = [playerOne, playerTwo]
  match.allowStalemate = elements.stalemateToggle.checked
  localStorage.setItem('whale-run-stalemates', String(match.allowStalemate))
  match.scores = [0, 0]
  match.roundResults = [null, null]
  resetDrawAgreement()
  elements.matchSummary.replaceChildren()
  elements.matchSummary.hidden = true
  startRound(1)
}

function startOnlineGame() {
  if (online.role !== 'host' || !online.lobby) return
  if (match.phase === 'playing') {
    elements.lobbyDialog.close()
    return
  }
  if (!canStartLobbyGame(online.lobby)) {
    showToast('Choose two online players.')
    return
  }
  updatePlayersFromLobby()
  match.allowStalemate = elements.stalemateToggle.checked
  localStorage.setItem('whale-run-stalemates', String(match.allowStalemate))
  match.mode = 'online'
  match.round = 1
  match.scores = [0, 0]
  match.roundResults = [null, null]
  elements.matchSummary.replaceChildren()
  elements.matchSummary.hidden = true
  startRound(1)
  elements.lobbyDialog.close()
  void broadcastGameState()
}

elements.startButton.addEventListener('click', openSetup)
elements.outcomeSkipButton.addEventListener('click', completeOutcomeSequence)
elements.helpButton.addEventListener('click', () => elements.helpDialog.showModal())
elements.rosterButton.addEventListener('click', () => elements.rosterDialog.showModal())
elements.voyageButton.addEventListener('click', () => openVoyageLibrary(false))
elements.sideVoyageButton.addEventListener('click', () => openVoyageLibrary(false))
elements.changeVoyageButton.addEventListener('click', () => openVoyageLibrary(true))
elements.playerOneDrawButton.addEventListener('click', () => handleDrawAgreement(0))
elements.playerTwoDrawButton.addEventListener('click', () => handleDrawAgreement(1))
elements.setupForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (online.setupMode === 'local') {
    startMatch()
    elements.setupDialog.close()
  } else {
    await startOnlineRoom(online.setupMode)
  }
})
elements.setupCloseButton.addEventListener('click', () => elements.setupDialog.close())
document.querySelector('.play-mode-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-play-mode]')
  if (button) setSetupMode(button.dataset.playMode)
})

elements.restartButton.addEventListener('click', () => {
  if (!window.confirm('Restart this game?')) return
  clearOutcomeAnimation()
  resetDrawAgreement()
  match.state = createRound(roundConfiguration())
  match.phase = 'playing'
  render()
  if (match.mode === 'online') void broadcastGameState()
})

elements.nextRoundButton.addEventListener('click', () => {
  elements.resultDialog.close()
  if (match.mode === 'online') {
    openLobby()
    return
  }
  if (match.round === 1) {
    startRound(2)
  } else {
    const nextVoyage = nextAvailableVoyage(match.voyageId)
    match.phase = 'idle'
    match.round = 1
    match.scores = [null, null]
    if (nextVoyage) selectVoyage(nextVoyage.id, { closeLibrary: false })
    match.state = createRound(roundConfiguration())
    render()
    if (nextVoyage) {
      elements.setupDialog.showModal()
    } else {
      openVoyageLibrary(false)
    }
  }
})

function openVoyageLibrary(fromSetup) {
  returnToSetup = fromSetup
  if (fromSetup && elements.setupDialog.open) elements.setupDialog.close()
  elements.voyageSearch.value = ''
  renderVoyageLibrary()
  elements.voyageDialog.showModal()
  window.setTimeout(() => {
    elements.voyageSearch.focus()
    const selectedVoyage = elements.voyageList.querySelector('.voyage-card.is-selected')
    if (selectedVoyage) scrollVoyageElementIntoView(selectedVoyage, 'auto')
  }, 80)
}

function scrollVoyageElementIntoView(element, behavior = 'smooth') {
  const listBounds = elements.voyageList.getBoundingClientRect()
  const elementBounds = element.getBoundingClientRect()
  const top = elements.voyageList.scrollTop + elementBounds.top - listBounds.top - 8
  elements.voyageList.scrollTo({ top, behavior })
}

function closeVoyageLibrary() {
  elements.voyageDialog.close()
  if (returnToSetup) {
    returnToSetup = false
    elements.setupDialog.showModal()
  }
}

function selectVoyage(voyageId, { closeLibrary = true } = {}) {
  const voyage = voyageById(voyageId)
  if (!voyage.available) return
  if (match.mode === 'online' && online.role !== 'host') {
    showToast('Only the host can choose a voyage.')
    return
  }
  const switchingActiveVoyage = match.phase !== 'idle'
  match.voyageId = voyage.id
  localStorage.setItem('whale-run-voyage', voyage.id)
  if (switchingActiveVoyage) {
    clearOutcomeAnimation()
    if (elements.resultDialog.open) elements.resultDialog.close()
    if (elements.voyageDialog.open) elements.voyageDialog.close()
    returnToSetup = false
    match.scores = [0, 0]
    match.roundResults = [null, null]
    elements.matchSummary.replaceChildren()
    elements.matchSummary.hidden = true
    startRound(1)
    showToast(match.mode === 'online'
      ? `Switched to ${voyage.title}.`
      : `Switched to ${voyage.title}.`)
    if (match.mode === 'online') void broadcastGameState()
    return
  }
  match.state = createRound({ ...voyage, allowStalemate: match.allowStalemate })
  render()
  renderVoyageLibrary(elements.voyageSearch.value)
  if (match.mode === 'online') void broadcastGameState()
  if (closeLibrary && elements.voyageDialog.open) closeVoyageLibrary()
}

function applyDrawAgreement(playerIndex) {
  if (match.phase !== 'playing' || match.state.result) return
  match.drawAgreements[playerIndex] = !match.drawAgreements[playerIndex]
  renderDrawAgreement()
  if (!match.drawAgreements.every(Boolean)) {
    if (match.mode === 'online') void broadcastGameState()
    return
  }

  match.state.result = {
    winner: null,
    isDraw: true,
    reason: 'agreed-draw',
    message: 'Both players agreed to a draw.',
  }
  finishRound()
  if (match.mode === 'online') void broadcastGameState()
}

function handleDrawAgreement(playerIndex) {
  if (match.phase !== 'playing' || match.state.result) return
  if (match.mode !== 'online') {
    applyDrawAgreement(playerIndex)
    return
  }
  const side = playerIndex === 0 ? 'boats' : 'animals'
  if (!online.lobby || !deviceControlsSide(online.lobby, online.deviceId, side)) {
    showToast(`${match.players[playerIndex]} must agree from their device.`)
    return
  }
  if (online.role === 'host') {
    applyDrawAgreement(playerIndex)
  } else {
    void online.room.send('draw_agreement', { playerIndex })
    showToast('Draw choice sent.')
  }
}

elements.voyageList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-voyage-id]')
  if (button) selectVoyage(button.dataset.voyageId)
})
elements.voyageJumps.addEventListener('click', (event) => {
  const button = event.target.closest('[data-chapter-id]')
  if (!button) return
  const chapter = elements.voyageList.querySelector(`.voyage-chapter[data-chapter-id="${button.dataset.chapterId}"]`)
  if (!chapter) return
  chapter.open = true
  scrollVoyageElementIntoView(chapter)
})
elements.voyageSearch.addEventListener('input', () => renderVoyageLibrary(elements.voyageSearch.value))
elements.closeVoyageButton.addEventListener('click', closeVoyageLibrary)
elements.voyageDialog.addEventListener('cancel', (event) => {
  if (!returnToSetup) return
  event.preventDefault()
  closeVoyageLibrary()
})

elements.lobbyButton.addEventListener('click', openLobby)
elements.closeLobbyButton.addEventListener('click', () => elements.lobbyDialog.close())
elements.startOnlineGameButton.addEventListener('click', startOnlineGame)
elements.leaveLobbyButton.addEventListener('click', () => void leaveOnlineRoom())
elements.lobbyPlayers.addEventListener('click', (event) => {
  const button = event.target.closest('[data-player-id][data-seat]')
  if (!button || online.role !== 'host' || !online.lobby) return
  const seat = button.dataset.seat === 'spectator' ? null : button.dataset.seat
  try {
    online.lobby = assignLobbySeat(online.lobby, online.deviceId, button.dataset.playerId, seat)
    updatePlayersFromLobby()
    renderLobby()
    render()
    void broadcastLobbyState()
    if (match.phase !== 'idle') void broadcastGameState()
  } catch (error) {
    showToast(error.message)
  }
})
elements.copyRoomCodeButton.addEventListener('click', async () => {
  if (!online.roomCode) return
  try {
    await navigator.clipboard.writeText(online.roomCode)
    showToast('Room code copied.')
  } catch {
    showToast(`Room code: ${online.roomCode}`)
  }
})
elements.roomCodeInput.addEventListener('input', () => {
  elements.roomCodeInput.value = elements.roomCodeInput.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6)
})

elements.soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled
  elements.soundButton.setAttribute('aria-pressed', String(soundEnabled))
  elements.soundButton.setAttribute('aria-label', `Turn sound ${soundEnabled ? 'off' : 'on'}`)
  elements.soundButton.classList.toggle('is-on', soundEnabled)
  if (soundEnabled) playSound('select')
})

renderRoster()
elements.availableVoyageCount.textContent = VOYAGES.filter((voyage) => voyage.available).length
setSetupMode('local')
renderVoyageLibrary()
render()
