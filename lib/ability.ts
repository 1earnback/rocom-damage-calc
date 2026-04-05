import { Pokemon, Skill, Type, SkillCategory } from './types/index';

export interface AbilityEffect {
  name: string;
  powerMultiplier: number;
  powerBonus: number;
  defenseReduction: number;
  description: string;
}

export function getAbilityEffect(
  pokemon: Pokemon,
  skill: Skill,
  turn: number = 1
): AbilityEffect {
  const abilityName = pokemon.ability.split(':')[0].trim();

  switch (abilityName) {
    case '向心力':
      return {
        name: '向心力',
        powerMultiplier: 1.0,
        powerBonus: 30,
        defenseReduction: 0,
        description: '前两个有伤技能威力 +30',
      };

    case '凶煞':
      return {
        name: '凶煞',
        powerMultiplier: 1.5,
        powerBonus: 0,
        defenseReduction: 0,
        description: '队伍存在恶系时，双攻 +50%',
      };

    case '目空':
      const isPsychic = skill.skill_type === Type.PSYCHIC;
      return {
        name: '目空',
        powerMultiplier: isPsychic ? 1.0 : 1.25,
        powerBonus: 0,
        defenseReduction: 0,
        description: '非光系技能威力 +25%',
      };

    case '专注力':
      const isFirstTurn = turn === 1;
      const isPhysical = skill.category === SkillCategory.PHYSICAL;
      return {
        name: '专注力',
        powerMultiplier: isFirstTurn && isPhysical ? 2.0 : 1.0,
        powerBonus: 0,
        defenseReduction: 0,
        description: '入场首回合，物攻技能威力 +100%',
      };

    case '魔法增效':
      const isMagical = skill.category === SkillCategory.MAGICAL;
      return {
        name: '魔法增效',
        powerMultiplier: isMagical ? 1.7 : 1.0,
        powerBonus: 0,
        defenseReduction: 0,
        description: '魔攻技能威力 +70%',
      };

    case '绝对秩序':
      return {
        name: '绝对秩序',
        powerMultiplier: 1.0,
        powerBonus: 0,
        defenseReduction: 0.5,
        description: '受到非自身属性攻击时伤害 -50%',
      };

    default:
      return {
        name: abilityName || '无特性',
        powerMultiplier: 1.0,
        powerBonus: 0,
        defenseReduction: 0,
        description: '无特殊效果',
      };
  }
}

export function getAbilityForPokemon(abilityString: string): {
  name: string;
  description: string;
} {
  if (!abilityString) {
    return { name: '无特性', description: '无特殊效果' };
  }

  const abilityName = abilityString.split(':')[0].trim();
  const abilityDesc = abilityString.split(':')[1]?.trim() || '';

  return {
    name: abilityName,
    description: abilityDesc,
  };
}

export function applyAbilityToDamage(
  attackEffect: AbilityEffect,
  defendEffect: AbilityEffect,
  basePower: number,
  skillType: Type,
  defenderType: Type
): {
  modifiedPower: number;
  attackMultiplier: number;
  defenseMultiplier: number;
  description: string;
} {
  let modifiedPower = basePower;
  const descriptions: string[] = [];

  modifiedPower += attackEffect.powerBonus;
  if (attackEffect.powerBonus > 0) {
    descriptions.push(`${attackEffect.name}: 威力 +${attackEffect.powerBonus}`);
  }

  const attackMultiplier = attackEffect.powerMultiplier;
  if (attackEffect.powerMultiplier !== 1.0) {
    descriptions.push(
      `${attackEffect.name}: 威力 × ${attackEffect.powerMultiplier}`
    );
  }

  let defenseMultiplier = 1.0;
  if (defendEffect.defenseReduction > 0) {
    defenseMultiplier = 1.0 - defendEffect.defenseReduction;
    descriptions.push(
      `${defendEffect.name}: 减伤 ${Math.round(defendEffect.defenseReduction * 100)}%`
    );
  }

  return {
    modifiedPower,
    attackMultiplier,
    defenseMultiplier,
    description: descriptions.join(' | ') || '无特性影响',
  };
}

export const KNOWN_ABILITIES = [
  { name: '向心力', description: '前两个有伤技能威力 +30' },
  { name: '凶煞', description: '队伍存在恶系时，双攻 +50%' },
  { name: '目空', description: '非光系技能威力 +25%' },
  { name: '专注力', description: '入场首回合，物攻技能威力 +100%' },
  { name: '魔法增效', description: '魔攻技能威力 +70%' },
  { name: '绝对秩序', description: '受到非自身属性攻击时伤害 -50%' },
];
