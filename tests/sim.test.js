// Run with: npm test   (node --test tests/*.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stateHash, townById } from '../src/sim/state.js';
import { tick } from '../src/sim/tick.js';
import { applyCommand } from '../src/sim/commands.js';
import { townReport } from '../src/sim/economy.js';
import { TERRAIN } from '../src/content/terrain.js';

/** A simple scripted player, so tests exercise real gameplay paths. */
function play(s, ticks) {
  for (let i = 0; i < ticks; i++) {
    const cap = s.settlements[0];
    if (!s.research) {
      const next = ['agriculture', 'pottery', 'woodworking', 'masonry', 'mysticism', 'writing', 'bronze'].find(t => !s.techs.includes(t));
      if (next) applyCommand(s, { type: 'research', tech: next });
    }
    if (s.pending) applyCommand(s, { type: 'choose', choice: s.pending ? 0 : 0 }).ok || applyCommand(s, { type: 'choose', choice: 1 }).ok || applyCommand(s, { type: 'choose', choice: 2 });
    applyCommand(s, { type: 'build', town: cap.id, id: 'houses' });
    applyCommand(s, { type: 'build', town: cap.id, id: 'granary' });
    const farmTile = s.tiles.findIndex((t, j) => t.own === cap.id && j !== cap.tile && !t.imp && (t.t === 'grass' || t.t === 'plains'));
    if (farmTile >= 0) applyCommand(s, { type: 'improve', tile: farmTile, id: 'farm' });
    tick(s);
  }
  return s;
}

test('world generation is deterministic and has land, water and a start town', () => {
  const a = createGame('alpha'), b = createGame('alpha'), c = createGame('beta');
  assert.equal(stateHash(a), stateHash(b));
  assert.notEqual(stateHash(a), stateHash(c));
  const land = a.tiles.filter(t => !TERRAIN[t.t].water).length;
  assert.ok(land > a.tiles.length * .25 && land < a.tiles.length * .8, `land ratio ${land / a.tiles.length}`);
  assert.equal(a.settlements.length, 1);
  assert.ok(!TERRAIN[a.tiles[a.settlements[0].tile].t].water);
});

test('same seed + same commands => identical state after 120 seasons', () => {
  const a = play(createGame('replay'), 120), b = play(createGame('replay'), 120);
  assert.equal(stateHash(a), stateHash(b));
});

test('a reasonably played civilization grows and advances', () => {
  const s = play(createGame('growth'), 160);
  const pop = s.settlements.reduce((n, t) => n + t.pop, 0);
  assert.ok(pop > 6, `population ${pop}`);
  assert.ok(s.techs.length >= 5, `techs ${s.techs.length}`);
  assert.ok(s.year > -4000);
  assert.ok(s.chronicle.length > 3);
});

test('commands are validated', () => {
  const s = createGame('rules');
  const cap = s.settlements[0];
  assert.equal(applyCommand(s, { type: 'build', town: cap.id, id: 'library' }).ok, false, 'needs Writing');
  assert.equal(applyCommand(s, { type: 'research', tech: 'writing' }).ok, false, 'needs Pottery first');
  assert.equal(applyCommand(s, { type: 'research', tech: 'agriculture' }).ok, true);
  s.res.wood = 0;
  assert.equal(applyCommand(s, { type: 'build', town: cap.id, id: 'houses' }).ok, false, 'cannot afford');
  assert.equal(applyCommand(s, { type: 'found', tile: cap.tile }).ok, false, 'too close');
  assert.equal(applyCommand(s, { type: 'nonsense' }).ok, false);
  assert.equal(applyCommand(s, { type: 'labor', weights: { food: 0 } }).ok, false);
});

test('food math: surplus = production - consumption', () => {
  const s = createGame('food');
  const r = townReport(s, townById(s, s.settlements[0].id));
  assert.equal(Math.round((r.yields.food - r.eat) * 10) / 10, r.surplus);
  assert.ok(r.eat === s.settlements[0].pop);
});

test('save → load round trip keeps the exact state', () => {
  const s = play(createGame('save'), 40);
  const copy = JSON.parse(JSON.stringify(s));
  assert.equal(stateHash(copy), stateHash(s));
  tick(s); tick(copy);
  assert.equal(stateHash(copy), stateHash(s));
});
