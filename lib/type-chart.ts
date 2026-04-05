import { Type, SkillCategory } from './types/index';

export const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { ground: 0.5, ghost: 0.5, steel: 0.5 },
  grass: {
    water: 2,
    psychic: 2,
    ground: 2,
    fire: 0.5,
    dragon: 0.5,
    poison: 0.5,
    bug: 0.5,
    flying: 0.5,
    steel: 0.5,
  },
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, water: 0.5, ground: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, steel: 2, grass: 0.5, ice: 0.5, dragon: 0.5 },
  psychic: { ghost: 2, dark: 2, grass: 0.5, ice: 0.5 },
  ground: { fire: 2, ice: 2, electric: 2, poison: 2, grass: 0.5, fighting: 0.5 },
  ice: {
    grass: 2,
    ground: 2,
    dragon: 2,
    flying: 2,
    fire: 0.5,
    ice: 0.5,
    steel: 0.5,
  },
  dragon: { dragon: 2, steel: 0.5 },
  electric: {
    water: 2,
    flying: 2,
    grass: 0.5,
    ground: 0.5,
    dragon: 0.5,
    electric: 0.5,
  },
  poison: { grass: 2, fairy: 2, ground: 0.5, poison: 0.5, ghost: 0.5, steel: 0.5 },
  bug: {
    grass: 2,
    dark: 2,
    psychic: 2,
    fire: 0.5,
    poison: 0.5,
    fighting: 0.5,
    flying: 0.5,
    fairy: 0.5,
    ghost: 0.5,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ground: 2,
    ice: 2,
    dark: 2,
    steel: 2,
    poison: 0.5,
    bug: 0.5,
    flying: 0.5,
    fairy: 0.5,
    ghost: 0.5,
    psychic: 0.5,
  },
  flying: { grass: 2, bug: 2, fighting: 2, ground: 0.5, dragon: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { dragon: 2, fighting: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
  ghost: { psychic: 2, ghost: 2, normal: 0.5, dark: 0.5 },
  dark: { poison: 2, fairy: 2, ghost: 2, psychic: 0.5, fighting: 0.5, dark: 0.5 },
  steel: { ground: 2, ice: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  rock: {},
};

export const TYPE_NAME_MAP: Record<string, Type> = {
  普通系: Type.NORMAL,
  火系: Type.FIRE,
  水系: Type.WATER,
  电系: Type.ELECTRIC,
  草系: Type.GRASS,
  冰系: Type.ICE,
  武系: Type.FIGHTING,
  毒系: Type.POISON,
  地系: Type.GROUND,
  翼系: Type.FLYING,
  幻系: Type.PSYCHIC,
  虫系: Type.BUG,
  机械系: Type.STEEL,
  幽系: Type.GHOST,
  龙系: Type.DRAGON,
  恶系: Type.DARK,
  萌系: Type.FAIRY,
  光系: Type.PSYCHIC,
  岩系: Type.ROCK,
  普通: Type.NORMAL,
  火: Type.FIRE,
  水: Type.WATER,
  电: Type.ELECTRIC,
  草: Type.GRASS,
  冰: Type.ICE,
  武: Type.FIGHTING,
  毒: Type.POISON,
  地: Type.GROUND,
  翼: Type.FLYING,
  幻: Type.PSYCHIC,
  虫: Type.BUG,
  机械: Type.STEEL,
  幽: Type.GHOST,
  龙: Type.DRAGON,
  恶: Type.DARK,
  萌: Type.FAIRY,
  光: Type.PSYCHIC,
  岩: Type.ROCK,
};

export const CATEGORY_NAME_MAP: Record<string, SkillCategory> = {
  物攻: SkillCategory.PHYSICAL,
  魔攻: SkillCategory.MAGICAL,
  防御: SkillCategory.DEFENSE,
  变化: SkillCategory.STATUS,
  状态: SkillCategory.STATUS,
};

export function getTypeEffectiveness(attackType: Type, defenseType: Type): number {
  const chart = TYPE_CHART[attackType];
  if (!chart) return 1.0;
  return chart[defenseType] ?? 1.0;
}

export function normalizeType(s: string): Type {
  if (!s) return Type.NORMAL;
  const t = TYPE_NAME_MAP[s];
  if (t) return t;
  if (s.endsWith('系')) {
    const t2 = TYPE_NAME_MAP[s.slice(0, -1)];
    if (t2) return t2;
  }
  return Type.NORMAL;
}
