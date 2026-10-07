// Terrain, tile resources and improvements. Yields are per worked tile, per season.

export const TERRAIN = {
  ocean:    { name: 'Ocean',     water: true,  yields: { food: 1 },                       color: '#3f7f9e' },
  coast:    { name: 'Coast',     water: true,  yields: { food: 1.5 },                     color: '#69aab9' },
  grass:    { name: 'Grassland', water: false, yields: { food: 2 },                       color: '#8fb35c' },
  plains:   { name: 'Plains',    water: false, yields: { food: 1, wood: .5 },             color: '#c2b766' },
  forest:   { name: 'Forest',    water: false, yields: { food: .5, wood: 2 },             color: '#5d8a4a' },
  hills:    { name: 'Hills',     water: false, yields: { food: .5, stone: 1.5, ore: .5 }, color: '#a89565' },
  mountain: { name: 'Mountains', water: false, yields: { stone: 1, ore: 1 },              color: '#8e8577', impassable: true },
  desert:   { name: 'Desert',    water: false, yields: { stone: .5, gold: .5 },           color: '#e0c98d' },
  tundra:   { name: 'Tundra',    water: false, yields: { food: .5, wood: .5 },            color: '#b9bfae' }
};

export const RIVER_BONUS = { food: 1, gold: .5 };

export const RESOURCES = {
  wheat:  { name: 'Wheat',  on: ['grass', 'plains'],           yields: { food: 1 } },
  fish:   { name: 'Fish',   on: ['coast'],                     yields: { food: 2 } },
  game:   { name: 'Game',   on: ['forest', 'tundra'],          yields: { food: 1, wood: .5 } },
  stone:  { name: 'Marble', on: ['hills', 'desert', 'plains'], yields: { stone: 1.5 } },
  ore:    { name: 'Copper', on: ['hills', 'mountain'],         yields: { ore: 1.5 } },
  horses: { name: 'Horses', on: ['plains', 'grass'],           yields: { food: .5, gold: 1 } },
  gems:   { name: 'Gems',   on: ['hills', 'desert', 'mountain'], yields: { gold: 2 } }
};

// Improvements are built on tiles inside your territory.
export const IMPROVEMENTS = {
  farm:   { name: 'Farm',         tech: 'agriculture',  cost: { wood: 10 },           time: 3, on: ['grass', 'plains', 'desert'], needs: t => t.t !== 'desert' || t.riv, yields: { food: 2 } },
  pasture:{ name: 'Pasture',      tech: 'husbandry',    cost: { wood: 12 },           time: 3, on: ['plains', 'grass', 'tundra'], needs: t => t.res === 'horses' || t.t === 'tundra', yields: { food: 1, gold: 1 } },
  camp:   { name: 'Lumber camp',  tech: 'woodworking',  cost: { wood: 6 },            time: 3, on: ['forest'], yields: { wood: 2 } },
  quarry: { name: 'Quarry',       tech: 'masonry',      cost: { wood: 15 },           time: 4, on: ['hills', 'mountain', 'desert'], yields: { stone: 2 } },
  mine:   { name: 'Mine',         tech: 'bronze',       cost: { wood: 20, stone: 10 }, time: 5, on: ['hills', 'mountain'], yields: { ore: 2, gold: .5 } },
  boats:  { name: 'Fishing boats', tech: 'sailing',     cost: { wood: 15 },           time: 3, on: ['coast'], yields: { food: 2 } }
};
