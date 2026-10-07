// Name generation and achievements.

const START = ['Ash', 'Bryn', 'Cal', 'Dun', 'El', 'Fen', 'Gar', 'Hal', 'Ir', 'Kel', 'Lor', 'Mar', 'Nor', 'Os', 'Pell', 'Quen', 'Ros', 'Sal', 'Tor', 'Ul', 'Vey', 'Wen', 'Yar', 'Zan', 'Ama', 'Bel', 'Cor', 'Del', 'Esk', 'Fal'];
const END = ['ford', 'mere', 'holt', 'stead', 'wick', 'den', 'reach', 'haven', 'moor', 'by', 'ton', 'vale', 'crest', 'hollow', 'gate', 'field', 'brook', 'stone', 'fall', 'march'];
export const CIV_NAMES = ['The Riverfolk', 'The Kin of Ash', 'The Hearth Clans', 'The Dawn People', 'The Stonewardens', 'The Free Valleys'];

export function townName(rand, used) {
  for (let i = 0; i < 40; i++) {
    const n = START[Math.floor(rand() * START.length)] + END[Math.floor(rand() * END.length)];
    if (!used.includes(n)) return n;
  }
  return 'New ' + START[Math.floor(rand() * START.length)];
}

// Achievements are checked by sim/score.js
export const ACHIEVEMENTS = {
  first_build:  { name: 'Hands at work',     desc: 'Finish your first building or improvement.', test: s => s.stats.built >= 1 },
  pop10:        { name: 'A real town',        desc: 'Reach 10 citizens in one settlement.', test: s => s.settlements.some(t => t.pop >= 10) },
  three_towns:  { name: 'Spreading roots',    desc: 'Govern three settlements.', test: s => s.settlements.length >= 3 },
  six_towns:    { name: 'A nation',           desc: 'Govern six settlements.', test: s => s.settlements.length >= 6 },
  pop50:        { name: 'Multitudes',         desc: 'Reach 50 citizens in total.', test: s => s.settlements.reduce((n, t) => n + t.pop, 0) >= 50 },
  first_wonder: { name: 'Wonder of the world', desc: 'Complete a wonder.', test: s => s.wonders.length >= 1 },
  bronze:       { name: 'Age of bronze',      desc: 'Enter the Bronze Age.', test: s => s.era >= 1 },
  classical:    { name: 'Classical glory',    desc: 'Enter the Classical Age.', test: s => s.era >= 3 },
  renaissance:  { name: 'Rebirth',            desc: 'Enter the Renaissance.', test: s => s.era >= 5 },
  defender:     { name: 'Shield wall',        desc: 'Repel five raids.', test: s => s.stats.raidsRepelled >= 5 },
  cleaner:      { name: 'Clear the wilds',    desc: 'Destroy three raider camps.', test: s => s.stats.campsCleared >= 3 },
  century:      { name: 'A century of peace', desc: 'Go 100 years without a successful raid.', test: s => s.year - s.stats.lastRaidYear >= 100 && s.tick > 40 },
  explorer:     { name: 'Cartographer',       desc: 'Reveal half of the world.', test: s => s.stats.seen >= s.tiles.length / 2 },
  scholar:      { name: 'House of wisdom',    desc: 'Research 15 technologies.', test: s => s.techs.length >= 15 }
};
