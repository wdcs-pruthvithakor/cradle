// City buildings and wonders. Effect keys are read by sim/economy.js:
//   housing, storage, keepFood (fraction of growth box kept), foodPct, prodPct (wood/stone/ore),
//   knowledge (flat), knowledgePct, gold (flat), goldPct, happy, health, defense, seaFood, buildSpeed

export const BUILDINGS = {
  houses:    { name: 'Houses',      icon: '⌂', tech: null,          cost: { wood: 12 },                     time: 2, max: 6, fx: { housing: 3 },               desc: 'Room for three more citizens.' },
  granary:   { name: 'Granary',     icon: '◍', tech: 'pottery',     cost: { wood: 20, stone: 5 },           time: 3, fx: { storage: 60, keepFood: .4 },        desc: 'Stores food and keeps 40% of the harvest when the town grows.' },
  shrine:    { name: 'Shrine',      icon: '△', tech: 'mysticism',   cost: { wood: 12, stone: 8 },           time: 3, fx: { happy: 8 },                         desc: 'A place of gathering. +8 happiness.' },
  workshop:  { name: 'Workshop',    icon: '⚒', tech: 'woodworking', cost: { wood: 25, stone: 10 },          time: 4, fx: { prodPct: .2, buildSpeed: .25 },     desc: '+20% wood, stone and ore; builds faster.' },
  walls:     { name: 'Walls',       icon: '▥', tech: 'masonry',     cost: { stone: 40 },                    time: 5, fx: { defense: 6 },                       desc: 'Stone walls. +6 defense against raiders.' },
  library:   { name: 'Library',     icon: '❏', tech: 'writing',     cost: { wood: 30, stone: 20 },          time: 5, fx: { knowledge: 2, knowledgePct: .25 },  desc: '+2 knowledge and +25% research.' },
  barracks:  { name: 'Barracks',    icon: '⚔', tech: 'bronze',      cost: { wood: 25, ore: 15 },            time: 4, fx: { defense: 5 },                       desc: 'Trained guards. +5 defense.' },
  harbor:    { name: 'Harbor',      icon: '⚓', tech: 'sailing',     cost: { wood: 40, stone: 10 },          time: 5, coastal: true, fx: { seaFood: 1, gold: 1 }, desc: 'Every worked water tile gives +1 food. Needs a coastal town.' },
  market:    { name: 'Market',      icon: '⚖', tech: 'trade',       cost: { wood: 30, stone: 20, gold: 10 }, time: 5, fx: { gold: 2, goldPct: .25, happy: 4 }, desc: '+2 gold, +25% gold, a little cheer.' },
  forge:     { name: 'Forge',       icon: '♨', tech: 'iron',        cost: { stone: 30, ore: 20 },           time: 5, fx: { prodPct: .2 },                      desc: '+20% wood, stone and ore.' },
  temple:    { name: 'Temple',      icon: '⛩', tech: 'philosophy',  cost: { stone: 50, gold: 20 },          time: 6, fx: { happy: 12 },                        desc: '+12 happiness.' },
  aqueduct:  { name: 'Aqueduct',    icon: '≋', tech: 'engineering', cost: { stone: 60, ore: 10 },           time: 7, fx: { health: 20, housing: 6 },           desc: 'Clean water: +20 health and room for six more.' },
  arena:     { name: 'Arena',       icon: '◎', tech: 'construction', cost: { stone: 70, gold: 30 },         time: 7, fx: { happy: 15 },                        desc: 'Games and spectacle. +15 happiness.' },
  infirmary: { name: 'Infirmary',   icon: '✚', tech: 'medicine',    cost: { stone: 40, gold: 30 },          time: 6, fx: { health: 25 },                       desc: '+25 health; plagues spread less.' },
  university:{ name: 'University',  icon: '✎', tech: 'education',   cost: { stone: 80, gold: 60 },          time: 8, fx: { knowledge: 4, knowledgePct: .5 },   desc: '+4 knowledge and +50% research.' },
  guildhall: { name: 'Guild hall',  icon: '⚙', tech: 'guilds',      cost: { stone: 60, ore: 30, gold: 40 }, time: 7, fx: { prodPct: .3, gold: 2 },             desc: '+30% production, +2 gold.' },
  bank:      { name: 'Bank',        icon: '¤', tech: 'banking',     cost: { stone: 80, gold: 80 },          time: 8, fx: { goldPct: .5 },                      desc: '+50% gold.' },
  press:     { name: 'Printing press', icon: '▤', tech: 'printing', cost: { wood: 60, ore: 40, gold: 60 },  time: 8, fx: { knowledgePct: .5, happy: 5 },       desc: '+50% research; news and pamphlets.' }
};

// Wonders: one per world. Built like buildings, but enormous.
export const WONDERS = {
  stonecircle: { name: 'Stone Circle',      tech: 'mysticism',   cost: { stone: 60, wood: 30 },            time: 10, fx: { happy: 10 },                global: { happy: 5 },  desc: 'Standing stones aligned to the solstice. +5 happiness everywhere.' },
  pyramid:     { name: 'Great Pyramid',     tech: 'masonry',     cost: { stone: 150 },                     time: 16, fx: { prodPct: .15 },             global: { housing: 2 }, desc: '+2 housing in every settlement.' },
  library_w:   { name: 'Great Library',     tech: 'writing',     cost: { stone: 120, wood: 60, gold: 40 }, time: 16, fx: { knowledge: 6 },             global: { knowledgePct: .15 }, desc: '+15% research everywhere.' },
  colossus:    { name: 'Colossus',          tech: 'sailing',     cost: { ore: 60, stone: 80 },             time: 14, coastal: true, fx: { gold: 5 },   global: { goldPct: .1 }, desc: 'A bronze giant over the harbor. More trade.' },
  gardens:     { name: 'Hanging Gardens',   tech: 'engineering', cost: { stone: 160, wood: 80 },           time: 18, fx: { happy: 10, health: 10 },    global: { health: 10 }, desc: '+10 health everywhere.' },
  observatory: { name: 'Sky Observatory',   tech: 'astronomy',   cost: { stone: 140, ore: 60, gold: 80 },  time: 18, fx: { knowledge: 8 },             global: { knowledgePct: .2 }, desc: 'Charts the heavens. +20% research.' },
  cathedral:   { name: 'Great Cathedral',   tech: 'feudalism',   cost: { stone: 260, gold: 120 },          time: 22, fx: { happy: 20 },                global: { happy: 8 },  desc: '+8 happiness everywhere.' },
  compass:     { name: 'House of Navigation', tech: 'navigation', cost: { wood: 200, ore: 100, gold: 150 }, time: 22, coastal: true, fx: { gold: 10 }, global: { goldPct: .2 }, desc: 'Sea charts and far trade.' }
};
