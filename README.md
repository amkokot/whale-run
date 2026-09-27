# Whale Run

A local or online multiplayer collection of nautical tactics games. Players guide working boats and sea creatures through chases, escorts, races, and small endgame-style puzzles. The movement system is inspired by classic spatial puzzles, but the child-facing game contains no chess terminology or imagery.

## Run locally

Double-click `index.html` to play locally in Chrome. No server is required for local multiplayer.

For development, use Node.js 20 or newer:

```bash
npm run dev
```

Open <http://localhost:4173>.

The browser loads `src/app.bundle.js` so direct `file://` pages work. After editing a source module, rebuild it with:

```bash
npm run build
```

## Tests

```bash
npm test
npm run check
```

## Voyage map

The child-facing progression lives in `src/voyages.js`. It contains 21 curated two-player games in complexity order across five sea regions: Calm Cove, Rolling Waters, Open Sea, Storm Waters, and Legendary Voyages. The first three positions use only three travelers. Later entries add more pieces or introduce harder interactions, ending with the 32-traveler Full Fleet starting formation.

All 21 voyages are playable. Their rules reuse six movement families on each side and add complete support for duplicate travelers, gentle captures, protected leaders, shore races, escort missions, collection missions, promotion, no-progress endings, and per-voyage move limits. Dinghies and Silver Shoals may move two clear patches from their home row and support the immediate passing capture that this opens. The mission labels suggest a plan without replacing the underlying tactics: reaching shore always promotes a Dinghy or Silver Shoal into a Swift Cutter or Orca, and play continues. Removing the last drifting traveler also leaves the opponent a reply.

Every voyage uses a two-game match: players swap roles after the first game, and the final log records each winner or draw and the total moves. Results follow the voyage: surviving or stopping an escort rewards sea life, stopping a fish escape rewards the boats, and even races or duels draw. Stalemate and no-progress endings use the same clear stakes in survival and escort voyages, but remain true draws in interception and even games. The tide clock waits for an immediate recapture or answer to a new promotion before settling the result. When only the two leaders remain, the game allows four exploration moves before judging the position; other positions without enough help retain the eight-move window. A visible “going in circles” countdown appears halfway through. The three simple direct chases use a shorter 35-move clock.

## Art direction

The board is a perspective ocean stage built from code-native layers rather than a flat tiled board. It includes an illustrated horizon, three independently moving paper-cut wave ribbons, fog, glints, a bobbing buoy, ship smoke, whale dive/spout animation, and a pocket submarine that dives through hooked routes with bubbles before resurfacing. Piece cutouts are kept within their water patches with a subtle near-to-far scale change. Captures use a gentle splash-and-bubbles transition. On a successful cornering finish, the actual traveler on the board slides from its final square to the whale’s square and delivers a paper-cut cake before the result panel appears. The result remains for 10 seconds after that delivery and includes a skip button. An allowed stalemate shows the whale diving underneath the boats and escaping.

## Expandable roster

The field guide includes six movement families on each side, giving the full voyage suite a complete crew without changing the visual language:

- Working boats: Little Tug, Swift Cutter, Old Dredger, Lantern Sloop, Pocket Submarine, and Little Dinghy.
- Sea life: Blue Whale, Orca, Reef Shark, Manta Ray, Dolphin, and Silver Shoal.

Each entry in `src/game.js` owns its child-facing name, movement description, side, and reusable movement-family identifier. `movementMoves()` provides the common destination generator for future puzzle modes.

## Multiplayer path

Local two-player lets both players take turns on one device, then swap roles after the first round. Online rooms use a host-and-lobby model: any number of devices can watch, every device can register one or two named players, and the host can move individual players into or out of the Boat Crew and Sea-life Crew seats at any time. Only the device containing the player currently assigned to a side can move or agree to a draw. Everyone else sees the live board as a spectator.

Each player has a named draw-agreement button; the round is declared drawn only after both players confirm, and either confirmation is cleared by the next move. Accidental stalemates are prevented by default in the introductory chase; an optional setup toggle restores them as underwater escapes. The voyage decides whether that escape is a defensive win or a true draw. Shared surround, stalemate, material, no-progress, agreement, and move-limit checks end every current game cleanly. The voyage map remains available during play. In a local match it starts a new two-game voyage; online, only the host can change the voyage and the new position is sent to the entire room.

## Enable online rooms

The GitHub Pages site remains entirely static. Supabase Realtime supplies the small room relay, so there is no custom server or npm dependency to deploy.

1. Create a Supabase project.
2. Open the project’s Connect dialog and copy the project URL and **publishable** key.
3. Paste those browser-safe values into `src/online-config.js`.
4. Leave `privateChannels: false` for the simple classroom prototype, then run `npm run dev` and test in two browser windows.
5. Publish the repository with GitHub Pages when ready.

Never place a Supabase secret key in the browser project. Public channels make setup simple but rely on hard-to-guess room codes and host-side validation; before using the game outside a supervised classroom, add authentication, switch to private channels, and configure Realtime Authorization policies.

The online transport uses Realtime Broadcast for authoritative lobby/game snapshots and Presence for connection status. `src/lobby.js` contains the testable player/device/seat model, while `src/online-room.js` is the transport adapter. This keeps the rules engine independent of networking.

The project can be shared with other small arcade games. Every channel topic is scoped as `arcade:<app-id>:v<protocol>:<room-code>`, so another game can reuse the same Supabase URL and publishable key by choosing a different `appId`. Increase `protocolVersion` only when a deployment introduces an incompatible room-message format. The games still share the Supabase project's Realtime quotas, so monitor project usage as the collection grows.

## Mobile layout

The game, setup flow, voyage map, lobby, and seat controls collapse to single-column layouts on small screens. Interactive controls retain touch-sized targets, dialogs use the dynamic viewport height, and a phone may contribute one or two named players just like a desktop browser.
