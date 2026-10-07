# Cradle — grow a civilization

A single-player civilization game in the browser. You settle a hand-painted island, grow towns through six ages from the Stone Age to the Renaissance, and your people's history is written into a chronicle as you play.

```sh
python3 -m http.server 8000     # then open http://localhost:8000
npm test                        # simulation tests (Node 18+, no dependencies)
```

ES modules don't load from `file://`, so serve the folder rather than double-clicking `index.html`. There is no build step, and it deploys to GitHub Pages as-is.

## How it plays

- **Time**: 1 tick is one season. Pause with Space, and switch speed with 1, 2 or 3. The year advances faster in early ages.
- **Settlements**: people need food, housing, health and happiness. Towns grow from their food surplus, borders expand at 5 and 10 people, and towns with 4+ people can send settlers to found new towns.
- **Economy**: there are six resources: food, wood, stone, ore, knowledge and gold. Work priorities in the **Council** tab decide which tiles get worked. Food and materials have storage limits.
- **Building**: 18 buildings, 8 one-of-a-kind wonders, and 6 tile improvements (farm, pasture, lumber camp, quarry, mine and fishing boats).
- **Research**: a 28-tech tree across six ages. The tree view opens with `T`.
- **Policies**: Rationing, Festivals, Militia, Scholarship and more. Policy slots grow with each age.
- **Events**: droughts, plagues, comets, nomads, floods, strange lights and more, each a choice with consequences.
- **Raiders**: camps appear in the wilds and raid nearby towns. Build walls or barracks, or send an expedition to clear them.
- **Chronicle and milestones**: an automatically written history of your civilization (exportable as text) and 14 achievements.
- **Saving**: autosave, 3 save slots, and JSON export/import. A world seed recreates the same world.

## Architecture: ready for a shared world later

```
src/sim/      pure, deterministic simulation — no DOM, no Date.now, no Math.random
  state.js      createGame(seed), helpers, stateHash
  tick.js       one season: production, growth, building, research, events, raids, score
  commands.js   applyCommand(state, cmd) — every player action is a validated JSON command
  economy.js    townReport / civReport (used by both the sim and the UI)
  events.js threats.js score.js world-gen.js hex.js rng.js
src/content/  game data: terrain, buildings, techs, policies, events, names/achievements
src/render/   canvas renderer: painted terrain cache, fog of war, towns, smoke, seasons
src/ui/       HUD, panels, sidebar, tech tree, event cards, menu, tutorial, sound
src/main.js   controller: fixed-rate ticks, input, saving
```

All state is plain JSON, and all randomness comes from a seeded RNG stored inside that state. The UI never changes state directly; it sends commands such as `{ type: 'build', town: 1, id: 'granary' }`.

To turn this into **one shared world that many players manage**, the plan is:
1. Run the same `src/sim` on a server, in Node or ported to Rust, as the single source of truth for `tick()`.
2. Have clients send commands over WebSocket instead of calling `applyCommand` locally.
3. Use `stateHash()` to detect desync, broadcast state diffs or command logs, and add roles and voting on top of commands.

The tests already confirm that the same seed and the same commands always produce the same state.
