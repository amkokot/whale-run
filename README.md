# Whale Run

Whale Run is a small two-player browser game for children. Working boats and sea creatures chase, escape, escort, and race across a paper-cut ocean board.

The game currently has 21 short voyages. They begin with three travelers and gradually introduce larger crews and trickier movement. The underlying movement is inspired by classic board-game puzzles, but the game itself uses no chess names or imagery.

**Play the prototype:** [amkokot.github.io/whale-run](https://amkokot.github.io/whale-run/)

## Playing

Click **Play game**, choose a voyage, and select local or online play.

- **Local:** two players share one device and switch sides after the first game.
- **Online:** one person hosts a room. Two named players take the active seats while everyone else watches. A device may add up to two players.

The host chooses the voyage and active players. The host also needs to stay connected while the room is running. Rooms are temporary and are not saved.

## Running it locally

Local two-player works by opening `index.html` directly. For online play or development, use Node.js 20 or newer:

```bash
npm run dev
```

Then open <http://localhost:4173>.

Before publishing a change, run:

```bash
npm run check
npm test
```

`npm run check` rebuilds `src/app.bundle.js`, which is the script loaded by the browser. Edit the source files rather than the generated bundle.

## Project map

- `src/game.js` contains movement and ending rules.
- `src/voyages.js` contains the voyage order and starting positions.
- `src/app.js` handles the board and menus.
- `src/lobby.js` and `src/online-room.js` handle online rooms.
- `src/styles.css` and `assets/` contain the visual presentation.
- `test/` covers the game, lobby, and room namespace.

The board art is built from layered HTML and CSS, with illustrated traveler cutouts in `assets/vessels/`.

## Online rooms

The site is static and hosted on GitHub Pages. Supabase Realtime carries room messages and presence updates; the prototype does not create player accounts or write room data to database tables.

To connect a fork to Supabase, add the project URL and a browser-safe **publishable key** to `src/online-config.js`, then rebuild the bundle. Never put a Supabase secret key or `service_role` key in this repository.

This prototype uses public Realtime channels. Room codes keep ordinary sessions separate, but they are not a security boundary. Use nicknames rather than personal information. Authentication and private-channel policies should be added before using the game outside a small, supervised setting.

Future games can share the same Supabase project by using a different `appId`. Whale Run topics follow this shape:

```text
arcade:whale-run:v1:ROOMCODE
```

That keeps room traffic separate, although all games still share the Supabase project's Realtime allowance.

## Current status

The local game, mobile layout, voyage library, host lobby, spectators, named players, draw agreements, and voyage-specific endings are working. This is still an early prototype, so online rooms favor a simple classroom setup over production-grade authentication or persistence.
