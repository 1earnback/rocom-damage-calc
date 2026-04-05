import { PokemonData, Pokemon, PokemonConfig, Nature, StatusType } from './types/index';
import { normalizeType } from './type-chart';

const SPEED_MEDIAN = 84;

export const NATURES: Record<string, { boost_stat: string | null; reduce_stat: string | null }> = {
  胆小: { boost_stat: 'speed', reduce_stat: 'atk' },
  急躁: { boost_stat: 'speed', reduce_stat: 'def' },
  天真: { boost_stat: 'speed', reduce_stat: 'spdef' },
  开朗: { boost_stat: 'speed', reduce_stat: 'spatk' },
  固执: { boost_stat: 'atk', reduce_stat: 'spatk' },
  勇敢: { boost_stat: 'atk', reduce_stat: 'speed' },
  调皮: { boost_stat: 'atk', reduce_stat: 'spdef' },
  孤独: { boost_stat: 'atk', reduce_stat: 'def' },
  保守: { boost_stat: 'spatk', reduce_stat: 'atk' },
  冷静: { boost_stat: 'spatk', reduce_stat: 'speed' },
  马虎: { boost_stat: 'spatk', reduce_stat: 'spdef' },
  稳重: { boost_stat: 'spatk', reduce_stat: 'def' },
  淘气: { boost_stat: 'def', reduce_stat: 'spatk' },
  大胆: { boost_stat: 'def', reduce_stat: 'atk' },
  悠闲: { boost_stat: 'def', reduce_stat: 'speed' },
  沉着: { boost_stat: 'spdef', reduce_stat: 'atk' },
  慎重: { boost_stat: 'spdef', reduce_stat: 'spatk' },
  温顺: { boost_stat: 'spdef', reduce_stat: 'def' },
  狂妄: { boost_stat: 'spdef', reduce_stat: 'speed' },
  认真: { boost_stat: null, reduce_stat: null },
  实干: { boost_stat: null, reduce_stat: null },
  坦率: { boost_stat: null, reduce_stat: null },
  害羞: { boost_stat: null, reduce_stat: null },
  浮躁: { boost_stat: null, reduce_stat: null },
};

export const NATURE_LIST = Object.entries(NATURES).map(([name, stats]) => {
  const statNames: Record<string, string> = {
    hp: '生命',
    atk: '物攻',
    spatk: '特攻',
    def: '物防',
    spdef: '特防',
    speed: '速度',
  };

  if (stats.boost_stat === null) {
    return { name, display: `${name}（无变化）`, boost_stat: null, reduce_stat: null };
  }

  return {
    name,
    display: `${name}（${statNames[stats.boost_stat]}↑${statNames[stats.reduce_stat!]}↓）`,
    boost_stat: stats.boost_stat,
    reduce_stat: stats.reduce_stat,
  };
});

let _pokemon_db: Record<string, PokemonData> = {};

export function loadPokemonData(jsonContent: string): Record<string, PokemonData> {
  const sprites: PokemonData[] = JSON.parse(jsonContent);
  const db: Record<string, PokemonData> = {};

  const final_nos: Set<string> = new Set();
  for (const sprite of sprites) {
    if (sprite.form === null) {
      final_nos.add(String(sprite.no));
    }
  }

  for (const sprite of sprites) {
    const name = sprite.name;
    if (!name) continue;

    const no_str = String(sprite.no);
    const form = sprite.form;

    const stage = form === null ? '最终形态' : '非最终';

    const existing = db[name];
    if (existing && existing.form === null && form !== null) {
      continue;
    }

    db[name] = sprite;
  }

  console.log(`[OK] 精灵数据库已加载: ${Object.keys(db).length} 只精灵`);
  _pokemon_db = db;
  return db;
}

export function getPokemonData(name: string): PokemonData | null {
  if (_pokemon_db[name]) return _pokemon_db[name];

  for (const key of Object.keys(_pokemon_db)) {
    if (name.includes(key) || key.includes(name)) {
      return _pokemon_db[key];
    }
  }

  const base_name = name.split('（')[0];
  for (const key of Object.keys(_pokemon_db)) {
    const key_base = key.split('（')[0];
    if (base_name === key_base) {
      return _pokemon_db[key];
    }
  }

  return null;
}

export function searchPokemonData(keyword: string): PokemonData[] {
  const results: PokemonData[] = [];
  for (const key of Object.keys(_pokemon_db)) {
    if (key.includes(keyword)) {
      results.push(_pokemon_db[key]);
    }
  }
  return results.slice(0, 20);
}

export function getAllPokemonNames(): string[] {
  return Object.keys(_pokemon_db);
}

function calcHp(race: number, iv: number, nature_mod: number): number {
  return Math.floor((1.7 * race + iv * 6 * 0.85 + 70) * (1 + nature_mod) + 100);
}

function calcStat(race: number, iv: number, nature_mod: number): number {
  return Math.floor((1.1 * race + iv * 6 * 0.55 + 10) * (1 + nature_mod) + 50);
}

export function computeBattleStats(pokemonData: PokemonData, config: PokemonConfig): Pokemon {
  const stats = pokemonData.stats;
  const race = {
    hp: stats.hp,
    atk: stats.atk,
    spatk: stats.sp_atk,
    def: stats.def,
    spdef: stats.sp_def,
    speed: stats.spd,
  };

  const stat_names = ['hp', 'atk', 'spatk', 'def', 'spdef', 'speed'];
  const iv: Record<string, number> = { hp: config.ivs.hp, atk: config.ivs.atk, spatk: config.ivs.spatk, def: config.ivs.def, spdef: config.ivs.spdef, speed: config.ivs.speed };

  const nature: Record<string, number> = { hp: 0, atk: 0, spatk: 0, def: 0, spdef: 0, speed: 0 };
  const nature_info = NATURES[config.nature];
  if (nature_info && nature_info.boost_stat) {
    nature[nature_info.boost_stat] = 0.2;
    if (nature_info.reduce_stat) {
      nature[nature_info.reduce_stat] = -0.1;
    }
  }

  const pokemon: Pokemon = {
    name: pokemonData.name,
    pokemon_type: normalizeType(pokemonData.attributes[0]),
    secondary_type: pokemonData.attributes.length > 1 ? normalizeType(pokemonData.attributes[1]) : null,
    hp: calcHp(race.hp, iv.hp, nature.hp),
    attack: calcStat(race.atk, iv.atk, nature.atk),
    defense: calcStat(race.def, iv.def, nature.def),
    sp_attack: calcStat(race.spatk, iv.spatk, nature.spatk),
    sp_defense: calcStat(race.spdef, iv.spdef, nature.spdef),
    speed: calcStat(race.speed, iv.speed, nature.speed),
    ability: pokemonData.ability.name,
    skills: [],
    current_hp: calcHp(race.hp, iv.hp, nature.hp),
    energy: 10,
    status: StatusType.NORMAL,
    atk_boost: config.buffs.atk_boost,
    def_boost: config.buffs.def_boost,
    spatk_boost: config.buffs.spatk_boost,
    spdef_boost: config.buffs.spdef_boost,
    speed_boost: config.buffs.speed_boost,
    atk_reduce: config.debuffs.atk_reduce,
    def_reduce: config.debuffs.def_reduce,
    spatk_reduce: config.debuffs.spatk_reduce,
    spdef_reduce: config.debuffs.spdef_reduce,
    speed_reduce: config.debuffs.speed_reduce,
    burn_stacks: 0,
    poison_stacks: 0,
    freeze_stacks: 0,
    parasited_by: null,
    power_bonus: 0,
  };

  return pokemon;
}
