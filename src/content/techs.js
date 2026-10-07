// Tech tree. `era` indexes ERAS; `req` lists prerequisite techs; `row` positions it in the tree view.

export const ERAS = [
  { id: 'stone',       name: 'Stone Age',        yearsPerSeason: 10 },
  { id: 'bronze',      name: 'Bronze Age',       yearsPerSeason: 6 },
  { id: 'iron',        name: 'Iron Age',         yearsPerSeason: 4 },
  { id: 'classical',   name: 'Classical Age',    yearsPerSeason: 3 },
  { id: 'medieval',    name: 'Medieval Age',     yearsPerSeason: 2 },
  { id: 'renaissance', name: 'Renaissance',      yearsPerSeason: 1 }
];

export const TECHS = {
  foraging:     { name: 'Foraging',          era: 0, row: 0, cost: 0,   req: [],                          desc: 'Gathering, hunting and fire. Known from the start.' },
  agriculture:  { name: 'Agriculture',       era: 0, row: 1, cost: 18,  req: ['foraging'],                desc: 'Farms on grassland and plains.' },
  woodworking:  { name: 'Woodworking',       era: 0, row: 2, cost: 20,  req: ['foraging'],                desc: 'Lumber camps and the workshop.' },
  pottery:      { name: 'Pottery',           era: 0, row: 3, cost: 22,  req: ['agriculture'],             desc: 'The granary, and the Rationing policy.' },
  mysticism:    { name: 'Mysticism',         era: 0, row: 4, cost: 24,  req: ['foraging'],                desc: 'Shrines, Festivals, and the Stone Circle wonder.' },
  masonry:      { name: 'Masonry',           era: 0, row: 5, cost: 28,  req: ['woodworking'],             desc: 'Quarries, walls and the Great Pyramid.' },

  bronze:       { name: 'Bronze Working',    era: 1, row: 0, cost: 45,  req: ['masonry'],                 desc: 'Mines, barracks and the Militia policy.' },
  husbandry:    { name: 'Animal Husbandry',  era: 1, row: 1, cost: 40,  req: ['agriculture'],             desc: 'Pastures for horses and herds.' },
  sailing:      { name: 'Sailing',           era: 1, row: 2, cost: 45,  req: ['woodworking'],             desc: 'Fishing boats, harbors, the Colossus.' },
  writing:      { name: 'Writing',           era: 1, row: 3, cost: 50,  req: ['pottery'],                 desc: 'Libraries, Scholarship, the Great Library.' },
  wheel:        { name: 'The Wheel',         era: 1, row: 4, cost: 45,  req: ['husbandry'],               desc: 'Carts: +10% gold and faster new settlements.' },
  trade:        { name: 'Trade',             era: 1, row: 5, cost: 60,  req: ['wheel', 'pottery'],        desc: 'Markets and the Open Markets policy.' },

  iron:         { name: 'Iron Working',      era: 2, row: 0, cost: 90,  req: ['bronze'],                  desc: 'The forge; stronger defenses (+2 everywhere).' },
  mathematics:  { name: 'Mathematics',       era: 2, row: 1, cost: 90,  req: ['writing'],                 desc: '+15% research.' },
  currency:     { name: 'Currency',          era: 2, row: 2, cost: 85,  req: ['trade'],                   desc: '+20% gold.' },
  philosophy:   { name: 'Philosophy',        era: 2, row: 3, cost: 110, req: ['mysticism', 'writing'],    desc: 'Temples and the Rule of Law policy.' },
  engineering:  { name: 'Engineering',       era: 2, row: 4, cost: 110, req: ['mathematics', 'masonry'],  desc: 'Aqueducts, Public Works, Hanging Gardens.' },

  construction: { name: 'Construction',      era: 3, row: 0, cost: 170, req: ['engineering'],             desc: 'The arena.' },
  medicine:     { name: 'Medicine',          era: 3, row: 1, cost: 170, req: ['philosophy'],              desc: 'Infirmaries; plagues are less deadly.' },
  astronomy:    { name: 'Astronomy',         era: 3, row: 2, cost: 190, req: ['mathematics'],             desc: 'The Sky Observatory wonder.' },
  law:          { name: 'Code of Laws',      era: 3, row: 3, cost: 180, req: ['philosophy', 'currency'],  desc: 'One more policy slot.' },

  feudalism:    { name: 'Feudalism',         era: 4, row: 0, cost: 280, req: ['law', 'iron'],             desc: 'The Great Cathedral; +3 defense everywhere.' },
  education:    { name: 'Education',         era: 4, row: 1, cost: 300, req: ['astronomy', 'philosophy'], desc: 'Universities.' },
  guilds:       { name: 'Guilds',            era: 4, row: 2, cost: 280, req: ['currency', 'construction'], desc: 'Guild halls.' },
  machinery:    { name: 'Machinery',         era: 4, row: 3, cost: 300, req: ['engineering', 'iron'],     desc: '+20% production everywhere.' },

  banking:      { name: 'Banking',           era: 5, row: 0, cost: 420, req: ['guilds'],                  desc: 'Banks.' },
  printing:     { name: 'Printing Press',    era: 5, row: 1, cost: 450, req: ['education', 'machinery'],  desc: 'The printing press.' },
  navigation:   { name: 'Navigation',        era: 5, row: 2, cost: 450, req: ['astronomy', 'sailing'],    desc: 'The House of Navigation wonder.' }
};

// Civilization-wide passive bonuses from techs (read by economy.js)
export const TECH_FX = {
  wheel: { goldPct: .1 },
  iron: { defense: 2 },
  mathematics: { knowledgePct: .15 },
  currency: { goldPct: .2 },
  medicine: { health: 10 },
  feudalism: { defense: 3 },
  machinery: { prodPct: .2 }
};

export const POLICIES = {
  council:     { name: 'Tribal Council', tech: null,          fx: { happy: 4 },                              desc: 'Elders speak for the clans. +4 happiness.' },
  rationing:   { name: 'Rationing',      tech: 'pottery',     fx: { foodUse: -.2, happy: -6 },               desc: 'Citizens eat 20% less; they are not pleased (−6 happiness).' },
  festivals:   { name: 'Festivals',      tech: 'mysticism',   fx: { happy: 10, gold: -1 },                   desc: '+10 happiness, costs 1 gold per settlement each season.' },
  militia:     { name: 'Militia',        tech: 'bronze',      fx: { defense: 4, prodPct: -.05 },             desc: '+4 defense everywhere; −5% production.' },
  scholarship: { name: 'Scholarship',    tech: 'writing',     fx: { knowledgePct: .25, goldPct: -.1 },       desc: '+25% research, −10% gold.' },
  openmarkets: { name: 'Open Markets',   tech: 'trade',       fx: { goldPct: .3, happy: -2 },                desc: '+30% gold; inequality grumbles (−2 happiness).' },
  ruleoflaw:   { name: 'Rule of Law',    tech: 'philosophy',  fx: { happy: 6, unrestShield: 1 },             desc: '+6 happiness; rebellions are much rarer.' },
  publicworks: { name: 'Public Works',   tech: 'engineering', fx: { buildSpeed: .3, gold: -1 },              desc: 'Builds 30% faster, costs 1 gold per settlement each season.' }
};

export const policySlots = (eraIdx, techs) => 1 + Math.floor(eraIdx / 2) + (techs.includes('law') ? 1 : 0);
