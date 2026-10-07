// Narrative events. Each offers choices; effects are applied by sim/events.js.
// `weight(s, ctx)` returns 0 when the event can't happen. ctx: { town, era, avgHappy, avgHealth, season }
// Choice effects: res {resource: delta} | pop (delta in the event's town) | mods [{key, value, ticks}] | chronicle text.
// `{town}` in text is replaced with the town's name.

export const EVENTS = [
  {
    id: 'drought', title: 'The rains fail', art: 'sun',
    text: 'For two seasons the sky over {town} has stayed empty. Wells are low and the fields are cracking.',
    weight: (s, c) => c.season === 1 ? 3 : 1,
    choices: [
      { label: 'Dig deeper wells', cost: { stone: 15, wood: 10 }, fx: { mods: [{ key: 'foodPct', value: -.15, ticks: 4 }] }, chronicle: '{town} dug deep wells through the great drought.' },
      { label: 'Ration the stores', fx: { mods: [{ key: 'foodPct', value: -.3, ticks: 6 }, { key: 'happy', value: -6, ticks: 6 }] }, chronicle: 'A hungry drought gripped the land; the elders rationed every grain.' },
      { label: 'Pray for rain', req: s => s.techs.includes('mysticism'), fx: { mods: [{ key: 'foodPct', value: -.25, ticks: 5 }, { key: 'happy', value: 4, ticks: 5 }] }, chronicle: 'Priests in {town} prayed for rain; the people took heart, if not water.' }
    ]
  },
  {
    id: 'plague', title: 'A sickness spreads', art: 'plague',
    text: 'Fever has come to {town}. Healers are overwhelmed and fear travels faster than the illness.',
    weight: (s, c) => c.town.pop >= 5 ? Math.max(0, (70 - c.avgHealth) / 10) + .5 : 0,
    choices: [
      { label: 'Quarantine the town', cost: { gold: 15 }, fx: { mods: [{ key: 'prodPct', value: -.25, ticks: 4 }] }, chronicle: '{town} closed its gates against the fever and outlasted it.' },
      { label: 'Gather healing herbs', cost: { food: 20 }, fx: { pop: -1 }, chronicle: 'Fever took lives in {town}, but herbalists saved many more.' },
      { label: 'Let it run its course', fx: { pop: -2, mods: [{ key: 'happy', value: -8, ticks: 6 }] }, chronicle: 'The fever of {town} was remembered with grief for a generation.' }
    ]
  },
  {
    id: 'comet', title: 'A fire in the sky', art: 'comet',
    text: 'A comet hangs over {town} night after night, its tail stretched like a torch. Everyone has an opinion about what it means.',
    weight: () => .6,
    choices: [
      { label: 'Declare it a good omen', fx: { mods: [{ key: 'happy', value: 10, ticks: 8 }] }, chronicle: 'A great comet blazed over {town}; the people called it a blessing.' },
      { label: 'Have scholars track it', req: s => s.techs.includes('writing'), fx: { res: { knowledge: 30 } }, chronicle: 'Scholars of {town} charted the comet\'s path night by night.' },
      { label: 'Ignore it', fx: {}, chronicle: 'A comet came and went over {town}.' }
    ]
  },
  {
    id: 'nomads', title: 'Wanderers at the gate', art: 'nomads',
    text: 'A band of nomads, thin from a hard road, asks to settle near {town}. They bring herds and strange songs.',
    weight: (s, c) => c.town.pop < c.town.housing ? 1.2 : .3,
    choices: [
      { label: 'Welcome them', fx: { pop: 2, mods: [{ key: 'happy', value: -4, ticks: 4 }] }, chronicle: 'Nomads joined {town}, and their songs became ours.' },
      { label: 'Trade, then send them on', fx: { res: { gold: 20, food: -10 } }, chronicle: 'Traders from the steppe passed through {town}.' },
      { label: 'Turn them away', fx: {}, chronicle: '{town} closed its gates to the wanderers.' }
    ]
  },
  {
    id: 'flood', title: 'The river rises', art: 'flood',
    text: 'Spring melt has swollen the river beside {town}. The water is creeping toward the fields.',
    weight: (s, c) => c.riverTown && c.season === 0 ? 2.5 : 0,
    choices: [
      { label: 'Build levees', cost: { wood: 25, stone: 15 }, fx: { mods: [{ key: 'foodPct', value: .2, ticks: 6 }] }, chronicle: '{town} raised levees; the flood left rich silt behind.' },
      { label: 'Evacuate the lowlands', fx: { res: { food: -25 } }, chronicle: 'The river took the lowland harvest of {town}.' }
    ]
  },
  {
    id: 'harvest', title: 'A golden harvest', art: 'wheat',
    text: 'The fields around {town} have never been so full. There is more grain than the stores can hold.',
    weight: (s, c) => c.season === 2 ? 1.5 : 0,
    choices: [
      { label: 'Hold a harvest feast', fx: { res: { food: 20 }, mods: [{ key: 'happy', value: 8, ticks: 4 }] }, chronicle: 'The great harvest feast of {town} lasted nine days.' },
      { label: 'Sell the surplus', fx: { res: { gold: 30 } }, chronicle: '{town} sold its golden harvest to distant buyers.' }
    ]
  },
  {
    id: 'ruins', title: 'Ruins in the hills', art: 'ruins',
    text: 'Hunters from {town} found worn stones and carved symbols older than any story we know.',
    weight: (s, c) => c.era <= 2 ? .8 : .2,
    choices: [
      { label: 'Study the carvings', fx: { res: { knowledge: 25 } }, chronicle: 'Ancient carvings found near {town} puzzled our wisest minds.' },
      { label: 'Salvage the stone', fx: { res: { stone: 40 } }, chronicle: '{town} built new homes from the stones of a forgotten people.' },
      { label: 'Leave them undisturbed', fx: { mods: [{ key: 'happy', value: 5, ticks: 6 }] }, chronicle: 'The old ruins near {town} were left in peace, and became a place of pilgrimage.' }
    ]
  },
  {
    id: 'lights', title: 'Strange lights', art: 'lights',
    text: 'For several nights, glowing orbs have drifted over the valley near {town}, hanging still and then racing away.',
    weight: () => .4,
    choices: [
      { label: 'Send observers', fx: { res: { knowledge: 15 } }, chronicle: 'Observers from {town} recorded the valley lights; no one agreed on what they were.' },
      { label: 'Call it a sign from the ancestors', fx: { mods: [{ key: 'happy', value: 6, ticks: 6 }] }, chronicle: 'The people of {town} believed the lights were their ancestors watching.' }
    ]
  },
  {
    id: 'rebellion', title: 'Unrest boils over', art: 'fist',
    text: 'Angry crowds fill the square in {town}. They say the leaders have forgotten them.',
    weight: (s, c) => c.town.happy < 30 ? (35 - c.town.happy) / 4 * (c.unrestShield ? .2 : 1) : 0,
    choices: [
      { label: 'Hear their grievances', cost: { gold: 25 }, fx: { mods: [{ key: 'happy', value: 12, ticks: 6 }] }, chronicle: 'The rulers listened to the people of {town}, and the square fell quiet.' },
      { label: 'Disperse the crowds', fx: { pop: -1, mods: [{ key: 'happy', value: -6, ticks: 8 }] }, chronicle: 'Blood was spilled in the square of {town}. It was not forgotten.' }
    ]
  },
  {
    id: 'scholar', title: 'A wandering scholar', art: 'scroll',
    text: 'A traveler with ink-stained hands arrives in {town}, offering to teach anyone who will feed her.',
    weight: (s, c) => c.era >= 1 ? 1 : .3,
    choices: [
      { label: 'Give her a home', cost: { food: 15 }, fx: { mods: [{ key: 'knowledgePct', value: .3, ticks: 10 }] }, chronicle: 'A wandering scholar settled in {town} and taught a generation.' },
      { label: 'Ask her to move on', fx: {}, chronicle: 'A scholar passed through {town} and was soon forgotten.' }
    ]
  },
  {
    id: 'wildfire', title: 'Forest fire', art: 'fire',
    text: 'A dry wind has carried flames into the woods near {town}.',
    weight: (s, c) => c.season === 1 ? .8 : .2,
    choices: [
      { label: 'Fight the fire', cost: { food: 10 }, fx: { res: { wood: -10 } }, chronicle: 'The people of {town} beat back the forest fire.' },
      { label: 'Let it burn out', fx: { res: { wood: -40 }, mods: [{ key: 'foodPct', value: .1, ticks: 6 }] }, chronicle: 'Fire swept the woods near {town}; the ash made the soil rich.' }
    ]
  },
  {
    id: 'caravan', title: 'A trade caravan', art: 'camel',
    text: 'Merchants with exotic goods have set up camp outside {town}.',
    weight: (s, c) => c.era >= 1 ? 1.2 : .2,
    choices: [
      { label: 'Buy exotic goods', cost: { gold: 20 }, fx: { mods: [{ key: 'happy', value: 10, ticks: 6 }] }, chronicle: 'Silks and spices reached {town} by caravan.' },
      { label: 'Sell them supplies', fx: { res: { food: -15, wood: -10, gold: 35 } }, chronicle: '{town} grew rich supplying a great caravan.' },
      { label: 'Tax their passage', fx: { res: { gold: 15 }, mods: [{ key: 'goldPct', value: -.1, ticks: 6 }] }, chronicle: '{town} taxed the caravan; merchants spoke of it bitterly.' }
    ]
  },
  {
    id: 'quake', title: 'The ground shakes', art: 'quake',
    text: 'An earthquake has cracked walls and toppled scaffolding in {town}.',
    weight: (s, c) => c.town.queue.length ? .5 : .2,
    choices: [
      { label: 'Rebuild at once', cost: { stone: 20, wood: 20 }, fx: {}, chronicle: '{town} rebuilt after the great earthquake.' },
      { label: 'Rebuild slowly', fx: { setback: 1, mods: [{ key: 'prodPct', value: -.15, ticks: 4 }] }, chronicle: 'The earthquake set back {town} by years.' }
    ]
  },
  {
    id: 'hunt', title: 'A great migration', art: 'deer',
    text: 'Vast herds are moving past {town}. The hunters are restless.',
    weight: (s, c) => c.era <= 1 ? 1 : .3,
    choices: [
      { label: 'Organize a hunt', fx: { res: { food: 35 } }, chronicle: 'The great hunt of {town} fed the people through winter.' },
      { label: 'Let the herds pass', fx: { mods: [{ key: 'happy', value: 3, ticks: 4 }] }, chronicle: 'The herds passed {town} untouched.' }
    ]
  }
];
