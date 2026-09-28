export const BOARD_SIZE = 8
export const MAX_WHALE_TURNS = 30
export const DEFAULT_MAX_MOVES = MAX_WHALE_TURNS * 2
export const DEFAULT_NO_PROGRESS_MOVES = 8

export const ROSTER = {
  tug: { id: 'tug', side: 'boats', name: 'Little Tug', description: 'Boat leader · one neighboring patch', movement: 'neighbor' },
  cutter: { id: 'cutter', side: 'boats', name: 'Swift Cutter', description: 'Any clear direction', movement: 'open-water' },
  dredger: { id: 'dredger', side: 'boats', name: 'Old Dredger', description: 'Straight channels only', movement: 'straight-water' },
  sloop: { id: 'sloop', side: 'boats', name: 'Lantern Sloop', description: 'Diagonal channels', movement: 'diagonal-water' },
  skiff: { id: 'skiff', side: 'boats', name: 'Pocket Submarine', description: 'Dives in a hooked turn', movement: 'hook-jump' },
  dinghy: { id: 'dinghy', side: 'boats', name: 'Little Dinghy', description: 'Drifts ahead · two patches from home', movement: 'forward-drift' },
  whale: { id: 'whale', side: 'animals', name: 'Blue Whale', description: 'Sea-life leader · one neighboring patch', movement: 'neighbor' },
  orca: { id: 'orca', side: 'animals', name: 'Orca', description: 'Any clear direction', movement: 'open-water' },
  shark: { id: 'shark', side: 'animals', name: 'Reef Shark', description: 'Straight channels only', movement: 'straight-water' },
  manta: { id: 'manta', side: 'animals', name: 'Manta Ray', description: 'Diagonal channels', movement: 'diagonal-water' },
  dolphin: { id: 'dolphin', side: 'animals', name: 'Dolphin', description: 'Leaps in a hooked turn', movement: 'hook-jump' },
  fish: { id: 'fish', side: 'animals', name: 'Silver Shoal', description: 'Swims ahead · two patches from home', movement: 'forward-drift' },
}

export const ROSTER_ORDER = {
  boats: ['tug', 'cutter', 'dredger', 'sloop', 'skiff', 'dinghy'],
  animals: ['whale', 'orca', 'shark', 'manta', 'dolphin', 'fish'],
}

const ALL_DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],             [0, 1],
  [1, -1],  [1, 0],   [1, 1],
]
const STRAIGHT_DIRECTIONS = [[-1, 0], [0, -1], [0, 1], [1, 0]]
const DIAGONAL_DIRECTIONS = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const HOOK_JUMPS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
]

function position(row, col) {
  return { row, col }
}

export function pieceType(pieceId) {
  if (ROSTER[pieceId]) return pieceId
  return Object.keys(ROSTER)
    .sort((a, b) => b.length - a.length)
    .find((type) => pieceId.startsWith(type)) || null
}

export function pieceDefinition(pieceId) {
  return ROSTER[pieceType(pieceId)] || null
}

function pieceSide(pieceId) {
  return pieceDefinition(pieceId)?.side || null
}

function defaultPieces(vessel) {
  return {
    tug: position(6, 2),
    [vessel]: position(5, 4),
    whale: position(1, 6),
  }
}

function defaultClockWinner(goal, gameBalance) {
  if (gameBalance === 'even') return null
  if (['animals-escape', 'collect-animals'].includes(goal)) return 'boats'
  return 'whale'
}

function defaultNoProgressWinner(goal, gameBalance) {
  if (gameBalance === 'even') return null
  return ['corner', 'boats-escort'].includes(goal) ? 'whale' : null
}

export function createRound(configuration = 'cutter') {
  const isShortcut = typeof configuration === 'string'
  const vessel = isShortcut ? configuration : configuration.vessel || 'cutter'
  const goal = isShortcut ? 'corner' : configuration.goal || 'corner'
  const gameBalance = isShortcut ? 'chase' : configuration.gameBalance || 'chase'
  const maxWhaleTurns = isShortcut
    ? MAX_WHALE_TURNS
    : configuration.maxWhaleTurns || MAX_WHALE_TURNS

  return {
    vessel,
    goal,
    gameBalance,
    clockWinner: isShortcut
      ? 'whale'
      : Object.hasOwn(configuration, 'clockWinner')
        ? configuration.clockWinner
        : defaultClockWinner(goal, gameBalance),
    noProgressWinner: isShortcut
      ? 'whale'
      : Object.hasOwn(configuration, 'noProgressWinner')
        ? configuration.noProgressWinner
        : defaultNoProgressWinner(goal, gameBalance),
    turn: isShortcut ? 'boats' : configuration.turn || 'boats',
    maxWhaleTurns,
    maxMoves: isShortcut
      ? DEFAULT_MAX_MOVES
      : configuration.maxMoves || maxWhaleTurns * 2,
    allowStalemate: isShortcut ? false : configuration.allowStalemate ?? false,
    whaleTurns: 0,
    moveCount: 0,
    noProgressMoves: 0,
    noProgressLimit: isShortcut
      ? DEFAULT_NO_PROGRESS_MOVES
      : configuration.noProgressLimit ?? DEFAULT_NO_PROGRESS_MOVES,
    selected: null,
    lastMove: null,
    result: null,
    pieces: isShortcut ? defaultPieces(vessel) : structuredClone(configuration.pieces),
  }
}

export function cloneState(state) {
  return structuredClone(state)
}

export function samePosition(a, b) {
  return Boolean(a && b && a.row === b.row && a.col === b.col)
}

export function isInside({ row, col }) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function pieceAt(state, target, ignoredPiece = null) {
  return Object.entries(state.pieces).find(
    ([id, piecePosition]) => id !== ignoredPiece && samePosition(piecePosition, target),
  )?.[0] ?? null
}

function stepMoves(state, pieceId, directions, canCapture = false) {
  const origin = state.pieces[pieceId]
  if (!origin) return []
  return directions
    .map(([rowDelta, colDelta]) => position(origin.row + rowDelta, origin.col + colDelta))
    .filter(isInside)
    .filter((target) => {
      const occupant = pieceAt(state, target, pieceId)
      return !occupant || (canCapture && pieceSide(occupant) !== pieceSide(pieceId))
    })
}

function rayMoves(state, pieceId, directions, canCapture = false) {
  const origin = state.pieces[pieceId]
  if (!origin) return []
  const moves = []
  for (const [rowDelta, colDelta] of directions) {
    let target = position(origin.row + rowDelta, origin.col + colDelta)
    while (isInside(target)) {
      const occupant = pieceAt(state, target, pieceId)
      if (occupant) {
        if (canCapture && pieceSide(occupant) !== pieceSide(pieceId)) moves.push(target)
        break
      }
      moves.push(target)
      target = position(target.row + rowDelta, target.col + colDelta)
    }
  }
  return moves
}

function hookMoves(state, pieceId, canCapture) {
  return stepMoves(state, pieceId, HOOK_JUMPS, canCapture)
}

function driftMoves(state, pieceId, canCapture) {
  const origin = state.pieces[pieceId]
  if (!origin) return []
  const side = pieceSide(pieceId)
  const direction = side === 'boats' ? -1 : 1
  const homeRow = side === 'boats' ? BOARD_SIZE - 2 : 1
  const moves = []
  const forward = position(origin.row + direction, origin.col)
  if (isInside(forward) && !pieceAt(state, forward, pieceId)) {
    moves.push(forward)
    const doubleForward = position(origin.row + direction * 2, origin.col)
    if (origin.row === homeRow && isInside(doubleForward) && !pieceAt(state, doubleForward, pieceId)) {
      moves.push(doubleForward)
    }
  }
  if (canCapture) {
    for (const colDelta of [-1, 1]) {
      const target = position(origin.row + direction, origin.col + colDelta)
      if (!isInside(target)) continue
      const occupant = pieceAt(state, target, pieceId)
      if (
        (occupant && pieceSide(occupant) !== side)
        || (!occupant && passingCapture(state, pieceId, target))
      ) moves.push(target)
    }
  }
  return moves
}

function passingCapture(state, pieceId, target) {
  const origin = state.pieces[pieceId]
  const candidate = state.lastMove?.doubleDrift
  if (!origin || !candidate || !state.pieces[candidate] || pieceAt(state, target, pieceId)) return null
  if (pieceDefinition(pieceId)?.movement !== 'forward-drift') return null
  if (pieceDefinition(candidate)?.movement !== 'forward-drift' || pieceSide(candidate) === pieceSide(pieceId)) return null
  const direction = pieceSide(pieceId) === 'boats' ? -1 : 1
  const candidatePosition = state.pieces[candidate]
  return target.row === origin.row + direction
    && Math.abs(target.col - origin.col) === 1
    && candidatePosition.row === origin.row
    && candidatePosition.col === target.col
    ? candidate
    : null
}

function capturedPieceForMove(state, pieceId, target) {
  return pieceAt(state, target, pieceId) || passingCapture(state, pieceId, target)
}

export function movementMoves(state, pieceId, { canCapture = true } = {}) {
  const movement = pieceDefinition(pieceId)?.movement
  if (!movement || !state.pieces[pieceId]) return []
  if (movement === 'neighbor') return stepMoves(state, pieceId, ALL_DIRECTIONS, canCapture)
  if (movement === 'open-water') return rayMoves(state, pieceId, ALL_DIRECTIONS, canCapture)
  if (movement === 'straight-water') return rayMoves(state, pieceId, STRAIGHT_DIRECTIONS, canCapture)
  if (movement === 'diagonal-water') return rayMoves(state, pieceId, DIAGONAL_DIRECTIONS, canCapture)
  if (movement === 'hook-jump') return hookMoves(state, pieceId, canCapture)
  if (movement === 'forward-drift') return driftMoves(state, pieceId, canCapture)
  return []
}

function attackTargets(state, pieceId) {
  const origin = state.pieces[pieceId]
  const movement = pieceDefinition(pieceId)?.movement
  if (!origin || !movement) return []
  if (movement === 'forward-drift') {
    const direction = pieceSide(pieceId) === 'boats' ? -1 : 1
    return [-1, 1]
      .map((colDelta) => position(origin.row + direction, origin.col + colDelta))
      .filter(isInside)
  }
  return movementMoves(state, pieceId, { canCapture: true })
}

export function threatenedBySide(state, target, side, pieces = state.pieces) {
  const nextState = pieces === state.pieces ? state : { ...state, pieces }
  return Object.keys(pieces)
    .filter((pieceId) => pieceSide(pieceId) === side)
    .some((pieceId) => attackTargets(nextState, pieceId).some((attack) => samePosition(attack, target)))
}

export function threatenedByBoats(state, target, pieces = state.pieces) {
  return threatenedBySide(state, target, 'boats', pieces)
}

function leaderId(state, side) {
  const leaderType = side === 'boats' ? 'tug' : 'whale'
  return Object.keys(state.pieces).find((pieceId) => pieceType(pieceId) === leaderType) || null
}

function leaderIsThreatened(state, side, pieces = state.pieces) {
  const nextState = pieces === state.pieces ? state : { ...state, pieces }
  const leader = leaderId(nextState, side)
  if (!leader) return false
  return threatenedBySide(
    nextState,
    pieces[leader],
    side === 'boats' ? 'animals' : 'boats',
    pieces,
  )
}

function piecesAfterMove(state, pieceId, target) {
  const pieces = structuredClone(state.pieces)
  const occupant = capturedPieceForMove(state, pieceId, target)
  if (occupant) delete pieces[occupant]
  pieces[pieceId] = { ...target }
  return pieces
}

function pseudoLegalMoves(state, pieceId) {
  const opposingLeaderType = pieceSide(pieceId) === 'boats' ? 'whale' : 'tug'
  return movementMoves(state, pieceId, { canCapture: true }).filter((target) => {
    const occupant = pieceAt(state, target, pieceId)
    return !occupant || pieceType(occupant) !== opposingLeaderType
  })
}

function wouldCauseChaseStalemate(state, pieceId, target) {
  if (state.allowStalemate || state.goal !== 'corner' || state.gameBalance !== 'chase' || pieceSide(pieceId) !== 'boats') return false
  const nextState = {
    ...state,
    pieces: piecesAfterMove(state, pieceId, target),
    turn: 'animals',
    selected: null,
    result: null,
  }
  const whale = leaderId(nextState, 'animals')
  return Boolean(whale && !leaderIsThreatened(nextState, 'animals') && !availablePieces(nextState, 'animals').length)
}

export function legalMoves(state, pieceId) {
  if (state.result || !state.pieces[pieceId] || !pieceDefinition(pieceId)) return []
  const side = pieceSide(pieceId)
  return pseudoLegalMoves(state, pieceId)
    .filter((target) => !leaderIsThreatened(state, side, piecesAfterMove(state, pieceId, target)))
    .filter((target) => !wouldCauseChaseStalemate(state, pieceId, target))
}

export function isSelectablePiece(state, pieceId) {
  return Boolean(
    typeof pieceId === 'string'
    && state.pieces[pieceId]
    && pieceSide(pieceId) === state.turn
    && !state.result
  )
}

export function availablePieces(state, side = state.turn) {
  return Object.keys(state.pieces).filter(
    (pieceId) => pieceSide(pieceId) === side && legalMoves(state, pieceId).length,
  )
}

function piecesForSide(state, side) {
  return Object.keys(state.pieces).filter((pieceId) => pieceSide(pieceId) === side)
}

function winnerToken(side) {
  return side === 'boats' ? 'boats' : 'whale'
}

function clockEnding(state, messages) {
  const winner = Object.hasOwn(state, 'clockWinner')
    ? state.clockWinner
    : defaultClockWinner(state.goal, state.gameBalance)
  return {
    winner,
    isDraw: winner === null,
    reason: 'move-limit',
    message: winner === 'boats'
      ? messages.boats
      : winner === 'whale' ? messages.whale : messages.draw,
  }
}

function drawEnding(reason, message) {
  return { winner: null, isDraw: true, reason, message }
}

function noProgressEnding(state, reason, drawMessage, winnerMessages) {
  const winner = Object.hasOwn(state, 'noProgressWinner')
    ? state.noProgressWinner
    : defaultNoProgressWinner(state.goal, state.gameBalance)
  if (winner === null) return drawEnding(reason, drawMessage)
  return {
    winner,
    isDraw: false,
    reason,
    message: winner === 'boats' ? winnerMessages.boats : winnerMessages.whale,
  }
}

export function canForceFinish(state, side) {
  const helpers = piecesForSide(state, side)
    .filter((pieceId) => pieceDefinition(pieceId)?.movement !== 'neighbor')
  const movements = helpers.map((pieceId) => pieceDefinition(pieceId)?.movement).filter(Boolean)
  if (movements.some((movement) => ['open-water', 'straight-water', 'forward-drift'].includes(movement))) return true
  const diagonalColors = new Set(helpers
    .filter((pieceId) => pieceDefinition(pieceId)?.movement === 'diagonal-water')
    .map((pieceId) => {
      const { row, col } = state.pieces[pieceId]
      return (row + col) % 2
    }))
  const jumperCount = movements.filter((movement) => movement === 'hook-jump').length
  return diagonalColors.size >= 2 || (diagonalColors.size >= 1 && jumperCount >= 1) || jumperCount >= 3
}

export function hasNoPossibleFinish(state) {
  return Boolean(
    leaderId(state, 'boats')
    && leaderId(state, 'animals')
    && !canForceFinish(state, 'boats')
    && !canForceFinish(state, 'animals')
  )
}

export function noProgressMoveLimit(state) {
  const onlyTwoLeadersRemain = Object.keys(state.pieces).length === 2
    && Boolean(leaderId(state, 'boats'))
    && Boolean(leaderId(state, 'animals'))
  const configuredLimit = state.noProgressLimit ?? DEFAULT_NO_PROGRESS_MOVES
  return onlyTwoLeadersRemain ? Math.min(4, configuredLimit) : configuredLimit
}

export function evaluateMaterialEnding(state) {
  const boatPieces = piecesForSide(state, 'boats')
  const animalPieces = piecesForSide(state, 'animals')
  const boatLeader = leaderId(state, 'boats')
  const animalLeader = leaderId(state, 'animals')

  if (!boatLeader && !animalLeader) {
    return drawEnding('forced-draw', 'No leaders remain. Draw.')
  }
  if (!boatLeader || boatPieces.length === 0) {
    return { winner: 'whale', reason: 'boats-cleared', message: 'The boat leader is gone. Sea life wins.' }
  }
  if (!animalLeader || animalPieces.length === 0) {
    return { winner: 'boats', reason: 'animals-cleared', message: 'The sea-life leader is gone. Boats win.' }
  }
  const extraMoves = noProgressMoveLimit(state)
  if (hasNoPossibleFinish(state) && state.noProgressMoves >= extraMoves) {
    return noProgressEnding(
      state,
      'forced-draw',
      `No crew could force a finish after ${extraMoves} moves. Draw.`,
      {
        boats: `No crew could force a finish after ${extraMoves} moves. Boats win this voyage.`,
        whale: `No crew could force a finish after ${extraMoves} moves. Sea life wins this voyage.`,
      },
    )
  }
  return null
}

function hasImmediateTacticalReply(state) {
  if (!state.lastMove?.captured && !state.lastMove?.promotedFrom && !state.lastMove?.doubleDrift) return false
  const movedPiece = state.lastMove.pieceId
  const landing = state.pieces[movedPiece]
  if (!landing) return false
  return piecesForSide(state, state.turn).some((pieceId) =>
    legalMoves(state, pieceId).some((target) =>
      samePosition(target, landing) || capturedPieceForMove(state, pieceId, target) === movedPiece))
}

export function evaluateRound(state) {
  const materialEnding = evaluateMaterialEnding(state)
  if (!leaderId(state, 'boats') && !leaderId(state, 'animals')) return materialEnding
  if (materialEnding && ['boats-cleared', 'animals-cleared'].includes(materialEnding.reason)) return materialEnding

  if (materialEnding) return materialEnding

  const movingSide = state.turn
  if (!availablePieces(state, movingSide).length) {
    if (leaderIsThreatened(state, movingSide)) {
      const winningSide = movingSide === 'boats' ? 'animals' : 'boats'
      return {
        winner: winnerToken(winningSide),
        reason: movingSide === 'animals' ? 'cornered' : 'boats-cornered',
        message: movingSide === 'animals'
          ? 'Every channel is closed. The cake is delivered.'
          : 'The tug has no safe channel. Sea life wins.',
      }
    }
    return noProgressEnding(
      state,
      'stalemate',
      'No legal moves remain. The leader escapes underwater. Draw.',
      {
        boats: 'No legal moves remain. The boats complete their mission and win.',
        whale: 'No legal moves remain. Sea life escapes underwater and wins.',
      },
    )
  }

  if (state.moveCount >= (state.maxMoves || DEFAULT_MAX_MOVES)) {
    const limit = state.maxMoves || DEFAULT_MAX_MOVES
    if (hasNoPossibleFinish(state)) {
      return noProgressEnding(
        state,
        'move-limit',
        `The tide clock reached ${limit}. Neither crew can force a finish. Draw.`,
        {
          boats: `The tide clock reached ${limit}. Boats win this voyage.`,
          whale: `The tide clock reached ${limit}. Sea life wins this voyage.`,
        },
      )
    }
    if (hasImmediateTacticalReply(state)) return null
    return clockEnding(state, {
      draw: `${limit} moves reached. Draw.`,
      whale: `Sea life lasted ${limit} moves and wins.`,
      boats: `No silver traveler escaped in ${limit} moves. Boats win.`,
    })
  }
  return null
}

function promotionId(pieces, promotedType) {
  let number = 1
  let id = `${promotedType}-promoted-${number}`
  while (pieces[id]) {
    number += 1
    id = `${promotedType}-promoted-${number}`
  }
  return id
}

export function makeMove(state, pieceId, target) {
  if (state.result || pieceSide(pieceId) !== state.turn) return state
  if (!legalMoves(state, pieceId).some((move) => samePosition(move, target))) return state

  const next = cloneState(state)
  const movingType = pieceType(pieceId)
  const movingSide = pieceSide(pieceId)
  const from = next.pieces[pieceId]
  const occupant = capturedPieceForMove(next, pieceId, target)
  const capturedAt = occupant ? { ...next.pieces[occupant] } : null
  if (occupant) delete next.pieces[occupant]
  next.pieces[pieceId] = { ...target }

  const reachedFarShore = movingType === 'dinghy' && target.row === 0
    ? 'boats'
    : movingType === 'fish' && target.row === BOARD_SIZE - 1 ? 'animals' : null
  next.lastMove = {
    pieceId,
    from,
    to: { ...target },
    captured: occupant,
    capturedAt,
    reachedFarShore,
    doubleDrift: ['dinghy', 'fish'].includes(movingType) && Math.abs(target.row - from.row) === 2
      ? pieceId
      : null,
  }

  if (reachedFarShore) {
    const promotedType = movingSide === 'boats' ? 'cutter' : 'orca'
    const promotedId = promotionId(next.pieces, promotedType)
    delete next.pieces[pieceId]
    next.pieces[promotedId] = { ...target }
    next.lastMove.pieceId = promotedId
    next.lastMove.promotedFrom = pieceId
  }

  next.moveCount += 1
  next.noProgressMoves = hasNoPossibleFinish(next)
    ? occupant ? 0 : (state.noProgressMoves || 0) + 1
    : 0
  next.selected = null
  if (movingType === 'whale') next.whaleTurns += 1
  next.turn = movingSide === 'boats' ? 'animals' : 'boats'
  next.result = evaluateRound(next)
  return next
}

export function stateFromPieces({
  vessel = 'cutter',
  goal = 'corner',
  gameBalance = 'chase',
  clockWinner,
  noProgressWinner,
  turn = 'boats',
  whaleTurns = 0,
  moveCount = 0,
  noProgressMoves = 0,
  noProgressLimit = DEFAULT_NO_PROGRESS_MOVES,
  maxMoves = DEFAULT_MAX_MOVES,
  allowStalemate = false,
  pieces,
}) {
  return {
    vessel,
    goal,
    gameBalance,
    clockWinner: clockWinner !== undefined
      ? clockWinner
      : defaultClockWinner(goal, gameBalance),
    noProgressWinner: noProgressWinner !== undefined
      ? noProgressWinner
      : defaultNoProgressWinner(goal, gameBalance),
    maxWhaleTurns: MAX_WHALE_TURNS,
    maxMoves,
    allowStalemate,
    turn,
    whaleTurns,
    moveCount,
    noProgressMoves,
    noProgressLimit,
    selected: null,
    lastMove: null,
    result: null,
    pieces: structuredClone(pieces),
  }
}
