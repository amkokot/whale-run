import test from 'node:test'
import assert from 'node:assert/strict'
import {
  availablePieces,
  canForceFinish,
  createRound,
  evaluateMaterialEnding,
  evaluateRound,
  legalMoves,
  makeMove,
  movementMoves,
  pieceType,
  ROSTER,
  samePosition,
  stateFromPieces,
  threatenedByBoats,
  threatenedBySide,
} from '../src/game.js'
import { VOYAGES } from '../src/voyages.js'

function includes(moves, row, col) {
  return moves.some((move) => samePosition(move, { row, col }))
}

test('new rounds have a playable position', () => {
  const state = createRound('cutter')
  assert.equal(state.turn, 'boats')
  assert.ok(legalMoves(state, 'tug').length > 0)
  assert.ok(legalMoves(state, 'cutter').length > 0)
})

test('the tug moves one neighboring patch and never beside the whale', () => {
  const state = stateFromPieces({
    pieces: { tug: { row: 4, col: 4 }, cutter: { row: 7, col: 7 }, whale: { row: 2, col: 4 } },
  })
  const moves = legalMoves(state, 'tug')
  assert.ok(includes(moves, 5, 5))
  assert.equal(includes(moves, 3, 4), false)
})

test('the cutter crosses straight and diagonal open water but not through a piece', () => {
  const state = stateFromPieces({
    pieces: { tug: { row: 7, col: 7 }, cutter: { row: 4, col: 4 }, whale: { row: 1, col: 1 } },
  })
  const moves = legalMoves(state, 'cutter')
  assert.ok(includes(moves, 4, 0))
  assert.ok(includes(moves, 6, 2))
  assert.equal(includes(moves, 0, 0), false)
})

test('the dredger only travels through straight channels', () => {
  const state = stateFromPieces({
    vessel: 'dredger',
    pieces: { tug: { row: 7, col: 7 }, dredger: { row: 4, col: 4 }, whale: { row: 1, col: 1 } },
  })
  const moves = legalMoves(state, 'dredger')
  assert.ok(includes(moves, 4, 0))
  assert.equal(includes(moves, 6, 2), false)
})

test('future crews have distinct reusable movement families', () => {
  assert.equal(ROSTER.skiff.name, 'Pocket Submarine')
  assert.match(ROSTER.skiff.description, /dives/i)

  const boatState = stateFromPieces({
    pieces: {
      sloop: { row: 4, col: 4 },
      skiff: { row: 4, col: 2 },
      dinghy: { row: 6, col: 6 },
      whale: { row: 0, col: 7 },
    },
  })
  assert.ok(includes(movementMoves(boatState, 'sloop'), 1, 1))
  assert.equal(includes(movementMoves(boatState, 'sloop'), 4, 1), false)
  assert.ok(includes(movementMoves(boatState, 'skiff'), 2, 1))
  assert.ok(includes(movementMoves(boatState, 'dinghy'), 5, 6))

  const animalState = stateFromPieces({
    turn: 'animals',
    pieces: {
      dolphin: { row: 3, col: 3 },
      fish: { row: 1, col: 1 },
      tug: { row: 7, col: 7 },
    },
  })
  assert.ok(includes(movementMoves(animalState, 'dolphin'), 5, 4))
  assert.ok(includes(movementMoves(animalState, 'fish'), 2, 1))
})

test('drifting travelers may move two clear patches from their home row', () => {
  const state = stateFromPieces({
    pieces: {
      tug: { row: 7, col: 7 },
      dinghy: { row: 6, col: 3 },
      whale: { row: 0, col: 0 },
      fish: { row: 1, col: 4 },
    },
  })
  assert.ok(includes(movementMoves(state, 'dinghy'), 5, 3))
  assert.ok(includes(movementMoves(state, 'dinghy'), 4, 3))
  assert.ok(includes(movementMoves(state, 'fish'), 2, 4))
  assert.ok(includes(movementMoves(state, 'fish'), 3, 4))

  const advanced = { ...state, pieces: { ...state.pieces, dinghy: { row: 5, col: 3 } } }
  assert.ok(includes(movementMoves(advanced, 'dinghy'), 4, 3))
  assert.equal(includes(movementMoves(advanced, 'dinghy'), 3, 3), false)

  const blocked = { ...state, pieces: { ...state.pieces, dredger: { row: 5, col: 3 } } }
  assert.equal(includes(movementMoves(blocked, 'dinghy'), 5, 3), false)
  assert.equal(includes(movementMoves(blocked, 'dinghy'), 4, 3), false)
})

test('a two-patch drift permits one immediate passing capture', () => {
  const state = stateFromPieces({
    turn: 'animals',
    gameBalance: 'even',
    pieces: {
      tug: { row: 7, col: 7 },
      dinghy: { row: 3, col: 3 },
      whale: { row: 0, col: 0 },
      fish: { row: 1, col: 4 },
    },
  })
  const afterDoubleDrift = makeMove(state, 'fish', { row: 3, col: 4 })
  assert.equal(afterDoubleDrift.lastMove.doubleDrift, 'fish')
  assert.ok(includes(legalMoves(afterDoubleDrift, 'dinghy'), 2, 4))

  const capturedInPassing = makeMove(afterDoubleDrift, 'dinghy', { row: 2, col: 4 })
  assert.equal(capturedInPassing.pieces.fish, undefined)
  assert.deepEqual(capturedInPassing.pieces.dinghy, { row: 2, col: 4 })
  assert.deepEqual(capturedInPassing.lastMove.capturedAt, { row: 3, col: 4 })
})

test('duplicate travelers share their movement family', () => {
  const state = stateFromPieces({
    pieces: {
      tug: { row: 7, col: 7 },
      dredger: { row: 4, col: 1 },
      dredger2: { row: 4, col: 5 },
      whale: { row: 0, col: 0 },
    },
  })
  assert.equal(pieceType('dredger2'), 'dredger')
  assert.ok(includes(movementMoves(state, 'dredger2'), 1, 5))
  assert.equal(includes(movementMoves(state, 'dredger2'), 2, 3), false)
})

test('shore arrivals promote in every voyage and play continues', () => {
  const race = stateFromPieces({
    goal: 'race',
    gameBalance: 'even',
    pieces: {
      tug: { row: 7, col: 7 },
      dinghy: { row: 1, col: 3 },
      whale: { row: 0, col: 7 },
      fish: { row: 6, col: 4 },
    },
  })
  const racePromotion = makeMove(race, 'dinghy', { row: 0, col: 3 })
  assert.equal(racePromotion.pieces.dinghy, undefined)
  assert.ok(racePromotion.pieces['cutter-promoted-1'])
  assert.equal(racePromotion.lastMove.promotedFrom, 'dinghy')
  assert.equal(racePromotion.result, null)

  const escort = stateFromPieces({
    goal: 'boats-escort',
    pieces: {
      tug: { row: 7, col: 7 },
      dinghy: { row: 1, col: 3 },
      whale: { row: 0, col: 7 },
    },
  })
  const escortPromotion = makeMove(escort, 'dinghy', { row: 0, col: 3 })
  assert.ok(escortPromotion.pieces['cutter-promoted-1'])
  assert.equal(escortPromotion.result, null)

  const escape = stateFromPieces({
    goal: 'animals-escape',
    turn: 'animals',
    pieces: {
      tug: { row: 7, col: 7 },
      whale: { row: 0, col: 0 },
      fish: { row: 6, col: 4 },
    },
  })
  const escapePromotion = makeMove(escape, 'fish', { row: 7, col: 4 })
  assert.equal(escapePromotion.pieces.fish, undefined)
  assert.ok(escapePromotion.pieces['orca-promoted-1'])
  assert.equal(escapePromotion.result, null)
})

test('taking the last traveler leaves the opponent a tactical reply', () => {
  const collection = stateFromPieces({
    vessel: 'dredger',
    goal: 'collect-animals',
    pieces: {
      tug: { row: 7, col: 7 },
      dredger: { row: 3, col: 3 },
      whale: { row: 2, col: 4 },
      fish: { row: 3, col: 4 },
    },
  })

  const collected = makeMove(collection, 'dredger', { row: 3, col: 4 })
  assert.equal(collected.pieces.fish, undefined)
  assert.equal(collected.result, null)
  assert.ok(includes(legalMoves(collected, 'whale'), 3, 4))

  const recaptured = makeMove(collected, 'whale', { row: 3, col: 4 })
  assert.equal(recaptured.pieces.dredger, undefined)
  assert.equal(recaptured.result, null)
  const eventualEnding = evaluateMaterialEnding({ ...recaptured, noProgressMoves: 4 })
  assert.equal(eventualEnding.reason, 'forced-draw')
  assert.equal(eventualEnding.winner, null)
})

test('the tide clock waits for an immediate recapture and scores the exchange correctly', () => {
  const collection = stateFromPieces({
    vessel: 'dredger',
    goal: 'collect-animals',
    maxMoves: 1,
    pieces: {
      tug: { row: 7, col: 7 },
      dredger: { row: 3, col: 3 },
      whale: { row: 2, col: 4 },
      fish: { row: 3, col: 4 },
    },
  })

  const collectedAtTheBell = makeMove(collection, 'dredger', { row: 3, col: 4 })
  assert.equal(collectedAtTheBell.moveCount, 1)
  assert.equal(collectedAtTheBell.result, null)

  const recaptured = makeMove(collectedAtTheBell, 'whale', { row: 3, col: 4 })
  assert.equal(recaptured.moveCount, 2)
  assert.equal(recaptured.result.reason, 'move-limit')
  assert.equal(recaptured.result.winner, null)
})

test('a newly promoted traveler can still be captured on the next move', () => {
  const escort = stateFromPieces({
    goal: 'boats-escort',
    pieces: {
      tug: { row: 7, col: 7 },
      dinghy: { row: 1, col: 3 },
      whale: { row: 1, col: 2 },
    },
  })

  const promoted = makeMove(escort, 'dinghy', { row: 0, col: 3 })
  assert.equal(promoted.result, null)
  assert.ok(includes(legalMoves(promoted, 'whale'), 0, 3))

  const captured = makeMove(promoted, 'whale', { row: 0, col: 3 })
  assert.equal(captured.pieces['cutter-promoted-1'], undefined)
  assert.equal(captured.result, null)
})

test('drifting travelers promote in channel games', () => {
  const state = stateFromPieces({
    gameBalance: 'even',
    pieces: {
      tug: { row: 7, col: 7 },
      dinghy: { row: 1, col: 3 },
      whale: { row: 0, col: 7 },
      shark: { row: 5, col: 5 },
    },
  })
  const promoted = makeMove(state, 'dinghy', { row: 0, col: 3 })
  assert.equal(promoted.pieces.dinghy, undefined)
  assert.ok(promoted.pieces['cutter-promoted-1'])
  assert.equal(promoted.lastMove.promotedFrom, 'dinghy')
})

test('the whale cannot enter water guarded by either boat', () => {
  const state = stateFromPieces({
    turn: 'animals',
    pieces: { tug: { row: 5, col: 5 }, cutter: { row: 3, col: 0 }, whale: { row: 3, col: 3 } },
  })
  const moves = legalMoves(state, 'whale')
  assert.equal(includes(moves, 3, 2), false)
  assert.equal(includes(moves, 4, 4), false)
})

test('danger squares can be calculated symmetrically for either active crew', () => {
  const state = stateFromPieces({
    pieces: {
      tug: { row: 7, col: 7 },
      cutter: { row: 4, col: 1 },
      whale: { row: 0, col: 0 },
      shark: { row: 2, col: 5 },
    },
  })
  assert.equal(threatenedBySide(state, { row: 4, col: 4 }, 'boats'), true)
  assert.equal(threatenedBySide(state, { row: 5, col: 5 }, 'animals'), true)
})

test('capturing an unguarded large boat starts the exploration window, then sea life wins the chase', () => {
  const state = stateFromPieces({
    turn: 'animals',
    pieces: { tug: { row: 7, col: 7 }, cutter: { row: 3, col: 3 }, whale: { row: 2, col: 2 } },
  })
  assert.ok(includes(legalMoves(state, 'whale'), 3, 3))
  const next = makeMove(state, 'whale', { row: 3, col: 3 })
  assert.equal(next.pieces.cutter, undefined)
  assert.equal(next.result, null)
  const eventualEnding = evaluateMaterialEnding({ ...next, noProgressMoves: 4 })
  assert.equal(eventualEnding.reason, 'forced-draw')
  assert.equal(eventualEnding.winner, 'whale')
})

test('a guarded large boat cannot be bumped', () => {
  const state = stateFromPieces({
    turn: 'animals',
    pieces: { tug: { row: 4, col: 4 }, cutter: { row: 3, col: 3 }, whale: { row: 2, col: 2 } },
  })
  assert.equal(includes(legalMoves(state, 'whale'), 3, 3), false)
})

test('a threatened whale with no safe water is cornered', () => {
  const state = stateFromPieces({
    turn: 'animals',
    pieces: { tug: { row: 2, col: 2 }, cutter: { row: 1, col: 1 }, whale: { row: 0, col: 0 } },
  })
  assert.equal(threatenedByBoats(state, state.pieces.whale), true)
  assert.equal(legalMoves(state, 'whale').length, 0)
  assert.equal(evaluateRound(state).reason, 'cornered')
})

test('the stalemate toggle controls underwater escape wins', () => {
  const pieces = {
    tug: { row: 7, col: 7 },
    cutter: { row: 2, col: 2 },
    whale: { row: 0, col: 0 },
  }

  const blocked = stateFromPieces({ pieces, allowStalemate: false })
  assert.equal(includes(legalMoves(blocked, 'cutter'), 2, 1), false)

  const allowed = stateFromPieces({ pieces, allowStalemate: true })
  assert.equal(includes(legalMoves(allowed, 'cutter'), 2, 1), true)
  const escaped = makeMove(allowed, 'cutter', { row: 2, col: 1 })
  assert.equal(escaped.result.reason, 'stalemate')
  assert.equal(escaped.result.winner, 'whale')
})

test('forced material endings stop empty crews immediately and allow an exploration window otherwise', () => {
  const empty = stateFromPieces({ pieces: {} })
  assert.equal(evaluateMaterialEnding(empty).reason, 'forced-draw')
  assert.equal(evaluateMaterialEnding(empty).winner, null)
  assert.equal(evaluateRound(empty).reason, 'forced-draw')

  const leadersOnly = stateFromPieces({ pieces: {
    tug: { row: 7, col: 7 },
    whale: { row: 0, col: 0 },
  } })
  assert.equal(evaluateMaterialEnding(leadersOnly), null)
  assert.equal(evaluateMaterialEnding({ ...leadersOnly, noProgressMoves: 3 }), null)
  assert.equal(evaluateMaterialEnding({ ...leadersOnly, noProgressMoves: 4 }).reason, 'forced-draw')
  assert.equal(evaluateMaterialEnding({ ...leadersOnly, noProgressMoves: 4 }).winner, 'whale')

  const loneLantern = stateFromPieces({ vessel: 'sloop', pieces: {
    tug: { row: 7, col: 7 },
    sloop: { row: 5, col: 5 },
    whale: { row: 0, col: 0 },
  } })
  assert.equal(evaluateMaterialEnding(loneLantern), null)
  assert.equal(evaluateMaterialEnding({ ...loneLantern, noProgressMoves: 8 }).reason, 'forced-draw')

  const coordinatedPair = stateFromPieces({ vessel: 'sloop', pieces: {
    tug: { row: 7, col: 7 },
    sloop: { row: 5, col: 5 },
    skiff: { row: 6, col: 4 },
    whale: { row: 0, col: 0 },
  } })
  assert.equal(evaluateMaterialEnding(coordinatedPair), null)

  const noAnimals = stateFromPieces({ pieces: { tug: { row: 7, col: 7 } } })
  assert.equal(evaluateMaterialEnding(noAnimals).winner, 'boats')

  const noBoats = stateFromPieces({ pieces: { whale: { row: 0, col: 0 } } })
  assert.equal(evaluateMaterialEnding(noBoats).winner, 'whale')
})

test('the overall move limit ends a chase with a whale win', () => {
  const state = stateFromPieces({
    maxMoves: 1,
    pieces: {
      tug: { row: 6, col: 1 },
      cutter: { row: 6, col: 5 },
      whale: { row: 1, col: 3 },
    },
  })
  const finished = makeMove(state, 'tug', legalMoves(state, 'tug')[0])
  assert.equal(finished.moveCount, 1)
  assert.equal(finished.result.reason, 'move-limit')
  assert.equal(finished.result.winner, 'whale')
})

test('draw endings in even-sided games are recorded without a winner', () => {
  const moveLimit = stateFromPieces({
    gameBalance: 'even',
    moveCount: 12,
    maxMoves: 12,
    pieces: {
      tug: { row: 6, col: 1 },
      cutter: { row: 6, col: 5 },
      whale: { row: 1, col: 3 },
    },
  })
  assert.equal(evaluateRound(moveLimit).reason, 'move-limit')
  assert.equal(evaluateRound(moveLimit).winner, null)

  const insufficient = stateFromPieces({
    gameBalance: 'even',
    noProgressMoves: 4,
    pieces: {
      tug: { row: 7, col: 7 },
      whale: { row: 0, col: 0 },
    },
  })
  assert.equal(evaluateRound(insufficient).reason, 'forced-draw')
  assert.equal(evaluateRound(insufficient).winner, null)
})

test('the no-progress clock advances only while neither crew can finish', () => {
  const quiet = stateFromPieces({
    gameBalance: 'even',
    pieces: {
      tug: { row: 7, col: 7 },
      whale: { row: 0, col: 0 },
    },
  })
  const afterOne = makeMove(quiet, 'tug', { row: 6, col: 7 })
  assert.equal(afterOne.noProgressMoves, 1)
  assert.equal(afterOne.result, null)

  const nearlyDone = stateFromPieces({
    gameBalance: 'even',
    turn: 'boats',
    noProgressMoves: 3,
    pieces: {
      tug: { row: 7, col: 7 },
      whale: { row: 0, col: 0 },
    },
  })
  const finished = makeMove(nearlyDone, 'tug', { row: 6, col: 7 })
  assert.equal(finished.noProgressMoves, 4)
  assert.equal(finished.result.reason, 'forced-draw')
  assert.equal(finished.result.winner, null)

  const finishStillPossible = stateFromPieces({
    noProgressMoves: 5,
    pieces: {
      tug: { row: 7, col: 7 },
      cutter: { row: 6, col: 5 },
      whale: { row: 0, col: 0 },
    },
  })
  const reset = makeMove(finishStillPossible, 'tug', { row: 6, col: 7 })
  assert.equal(reset.noProgressMoves, 0)

  const captureIsProgress = stateFromPieces({
    vessel: 'sloop',
    noProgressMoves: 5,
    pieces: {
      tug: { row: 7, col: 7 },
      sloop: { row: 4, col: 4 },
      whale: { row: 0, col: 0 },
      dolphin: { row: 3, col: 3 },
    },
  })
  const afterCapture = makeMove(captureIsProgress, 'sloop', { row: 3, col: 3 })
  assert.equal(afterCapture.pieces.dolphin, undefined)
  assert.equal(afterCapture.noProgressMoves, 0)
  assert.equal(afterCapture.result, null)
})

test('same-channel lantern boats cannot force a finish, but opposite channels can', () => {
  const sameChannel = stateFromPieces({
    vessel: 'sloop',
    pieces: {
      tug: { row: 7, col: 7 },
      sloop: { row: 4, col: 4 },
      sloop2: { row: 2, col: 2 },
      whale: { row: 0, col: 0 },
    },
  })
  assert.equal(canForceFinish(sameChannel, 'boats'), false)

  const oppositeChannels = {
    ...sameChannel,
    pieces: { ...sameChannel.pieces, sloop2: { row: 2, col: 3 } },
  }
  assert.equal(canForceFinish(oppositeChannels, 'boats'), true)
})

test('each mission clock rewards the crew that completed its defensive job', () => {
  const sharedPieces = {
    tug: { row: 7, col: 7 },
    cutter: { row: 6, col: 5 },
    whale: { row: 0, col: 0 },
    fish: { row: 2, col: 3 },
    dinghy: { row: 5, col: 2 },
  }

  const escapeExpired = stateFromPieces({
    goal: 'animals-escape',
    moveCount: 20,
    maxMoves: 20,
    pieces: sharedPieces,
  })
  assert.equal(evaluateRound(escapeExpired).reason, 'move-limit')
  assert.equal(evaluateRound(escapeExpired).winner, 'boats')

  const escortExpired = stateFromPieces({
    goal: 'boats-escort',
    moveCount: 20,
    maxMoves: 20,
    pieces: sharedPieces,
  })
  assert.equal(evaluateRound(escortExpired).winner, 'whale')

  const evenRaceExpired = stateFromPieces({
    goal: 'race',
    gameBalance: 'even',
    moveCount: 20,
    maxMoves: 20,
    pieces: sharedPieces,
  })
  assert.equal(evaluateRound(evenRaceExpired).winner, null)
})

test('a blocked interception position remains a true draw', () => {
  const blockedEscape = stateFromPieces({
    goal: 'animals-escape',
    turn: 'animals',
    pieces: {
      tug: { row: 7, col: 7 },
      cutter: { row: 2, col: 1 },
      dinghy: { row: 7, col: 0 },
      whale: { row: 0, col: 0 },
      fish: { row: 6, col: 0 },
    },
  })
  assert.equal(availablePieces(blockedEscape).length, 0)
  assert.equal(evaluateRound(blockedEscape).reason, 'stalemate')
  assert.equal(evaluateRound(blockedEscape).winner, null)
})

test('moving alternates crews and counts whale wakes', () => {
  let state = createRound('cutter')
  state = makeMove(state, 'tug', legalMoves(state, 'tug')[0])
  assert.equal(state.turn, 'animals')
  assert.equal(state.moveCount, 1)
  state = makeMove(state, 'whale', legalMoves(state, 'whale')[0])
  assert.equal(state.turn, 'boats')
  assert.equal(state.whaleTurns, 1)
  assert.equal(state.moveCount, 2)
})

test('every playable voyage creates a legal, distinct starting round', () => {
  const playable = VOYAGES.filter((voyage) => voyage.available)
  assert.equal(playable.length, 21)

  for (const voyage of playable) {
    const state = createRound(voyage)
    assert.equal(state.vessel, voyage.vessel)
    assert.equal(state.maxMoves, voyage.maxMoves)
    assert.ok(Object.hasOwn(voyage, 'clockWinner'), `${voyage.title} needs an explicit clock result`)
    assert.equal(state.clockWinner, voyage.clockWinner)
    assert.ok(Object.hasOwn(voyage, 'noProgressWinner'), `${voyage.title} needs an explicit no-progress result`)
    assert.equal(state.noProgressWinner, voyage.noProgressWinner)
    assert.equal(Object.keys(state.pieces).length, voyage.pieceCount, `${voyage.title} piece count`)
    assert.ok(state.pieces.tug, `${voyage.title} needs a tug`)
    assert.ok(state.pieces.whale, `${voyage.title} needs a whale`)
    assert.ok(availablePieces(state).length > 0, `${voyage.title} needs a legal opening move`)
    assert.equal(evaluateRound(state), null, `${voyage.title} must not start finished`)

    const occupied = Object.values(state.pieces).map(({ row, col }) => `${row},${col}`)
    assert.equal(new Set(occupied).size, occupied.length, `${voyage.title} cannot overlap travelers`)
    assert.ok(Object.values(state.pieces).every(({ row, col }) => row >= 0 && row < 8 && col >= 0 && col < 8), `${voyage.title} must stay on the board`)
  }
})

test('late voyages open with choices instead of immediate helper captures', () => {
  const fogLine = createRound(VOYAGES.find((voyage) => voyage.id === 'fog-line'))
  assert.equal(Math.abs(fogLine.pieces.fish.col - fogLine.pieces.fish2.col), 1)

  for (const fishId of ['fish', 'fish2']) {
    const advance = legalMoves(fogLine, fishId).find((move) => move.row === fogLine.pieces[fishId].row + 1)
    assert.ok(advance, `${fishId} needs a protected advance`)
    const afterAdvance = makeMove(fogLine, fishId, advance)
    assert.equal(threatenedBySide(afterAdvance, advance, 'animals'), true)
  }

  const duel = createRound(VOYAGES.find((voyage) => voyage.id === 'cutter-against-dredger'))
  assert.equal(legalMoves(duel, 'cutter').some((move) => samePosition(move, duel.pieces.orca)), false)
  assert.equal(legalMoves(duel, 'orca').some((move) => samePosition(move, duel.pieces.cutter)), false)
})

test('every voyage clock and objective agree with its game type', () => {
  const expectedClockWinner = {
    'animals-escape': 'boats',
    'boats-escort': 'whale',
    'collect-animals': 'boats',
  }

  for (const voyage of VOYAGES) {
    const expectedWinner = voyage.gameBalance === 'even'
      ? null
      : expectedClockWinner[voyage.goal] ?? 'whale'
    assert.equal(voyage.clockWinner, expectedWinner, `${voyage.title} clock winner`)
    const expectedNoProgressWinner = voyage.gameBalance !== 'even'
      && ['corner', 'boats-escort'].includes(voyage.goal)
      ? 'whale'
      : null
    assert.equal(voyage.noProgressWinner, expectedNoProgressWinner, `${voyage.title} no-progress winner`)

    const timedOut = createRound(voyage)
    timedOut.moveCount = timedOut.maxMoves
    const ending = evaluateRound(timedOut)
    assert.equal(ending.reason, 'move-limit', `${voyage.title} clock reason`)
    assert.equal(ending.winner, expectedWinner, `${voyage.title} clock result`)

    const namesBothJobs = voyage.objective.startsWith('Either crew:')
      || (voyage.objective.includes('Boats:') && /(Sea life|Whale):/.test(voyage.objective))
    assert.equal(namesBothJobs, true, `${voyage.title} needs a child-readable job for both crews`)
  }
})

test('a dead position reached on the tide clock uses the voyage result', () => {
  const leaders = {
    tug: { row: 7, col: 7 },
    whale: { row: 0, col: 0 },
  }
  const survival = stateFromPieces({
    goal: 'corner',
    moveCount: 35,
    maxMoves: 35,
    pieces: leaders,
  })
  assert.equal(evaluateRound(survival).reason, 'move-limit')
  assert.equal(evaluateRound(survival).winner, 'whale')

  const interception = stateFromPieces({
    goal: 'collect-animals',
    moveCount: 35,
    maxMoves: 35,
    pieces: leaders,
  })
  assert.equal(evaluateRound(interception).reason, 'move-limit')
  assert.equal(evaluateRound(interception).winner, null)

  const even = stateFromPieces({
    goal: 'corner',
    gameBalance: 'even',
    moveCount: 35,
    maxMoves: 35,
    pieces: leaders,
  })
  assert.equal(evaluateRound(even).reason, 'move-limit')
  assert.equal(evaluateRound(even).winner, null)
})

test('the voyage map is ordered and begins with sparse positions', () => {
  assert.equal(VOYAGES.length, 21)
  assert.deepEqual(VOYAGES.map((voyage) => voyage.order), Array.from({ length: 21 }, (_, index) => index + 1))
  assert.ok(VOYAGES.slice(0, 3).every((voyage) => voyage.pieceCount === 3))
  assert.ok(VOYAGES.slice(0, 7).every((voyage) => voyage.pieceCount <= 6))
  assert.equal(VOYAGES[0].title, 'The Great Whale Chase')
  assert.equal(VOYAGES.at(-1).title, 'Full Fleet')
  assert.equal(VOYAGES.at(-1).pieceCount, 32)
  assert.equal(VOYAGES.at(-1).difficulty, 5)

  const fullFleet = createRound(VOYAGES.at(-1))
  assert.equal(Object.keys(fullFleet.pieces).filter((pieceId) => pieceType(pieceId) === 'dinghy').length, 8)
  assert.equal(Object.keys(fullFleet.pieces).filter((pieceId) => pieceType(pieceId) === 'fish').length, 8)
  assert.ok(includes(legalMoves(fullFleet, 'dinghy'), 4, 0))
  assert.ok(includes(legalMoves(fullFleet, 'fish'), 3, 0))
})
