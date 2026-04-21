import { Type, SkillCategory, Pokemon, Skill } from './types/index';

export interface AbilityParam {
  key: string;
  label: string;
  type: 'number' | 'select';
  min?: number;
  max?: number;
  default: number;
  options?: { value: number; label: string }[];
}

type AbilityCondition =
  | { type: 'turn_is_first' }
  | { type: 'turn_is_nth'; value: number }
  | { type: 'skill_type'; value: SkillCategory }
  | { type: 'skill_attribute'; value: Type }
  | { type: 'not_skill_attribute'; value: Type }
  | { type: 'pokemon_has_attribute'; value: Type }
  | { type: 'not_pokemon_has_attribute'; value: Type }
  | { type: 'skill_slot'; value: number[] }
  | { type: 'team_has_attribute'; value: Type }
  | { type: 'param_equals'; key: string; value: number };

export type { AbilityCondition };

export interface StatModifier {
  type: 'percentage' | 'fixed';
  value: string;
}

export interface AbilityEffect {
  conditions: AbilityCondition[];
  power?: StatModifier;
  attack?: StatModifier;
  sp_attack?: StatModifier;
  defense?: StatModifier;
  sp_defense?: StatModifier;
  damage_reducer?: StatModifier;
}

export interface AbilityConfig {
  id: string;
  name: string;
  description: string;
  side: 'attacker' | 'defender' | 'both';
  params: AbilityParam[];
  effects: AbilityEffect[];
  pokemons: string[];
}

export interface AbilityContext {
  pokemon: Pokemon;
  skill: Skill;
  turn: number;
  opponent: Pokemon;
  userParams: Record<string, number>;
  skillSlot?: number;
  teamAttributes?: Type[];
}

export interface AbilityResult {
  triggered: boolean;
  powerMultiplier: number;
  powerBonus: number;
  attackBonus: number;
  spAttackBonus: number;
  defenseBonus: number;
  spDefenseBonus: number;
  damageReduction: number;
  description: string;
}

export class SimpleExpressionParser {
  parse(expr: string, params: Record<string, number>): number {
    let parsedExpr = expr;
    for (const [key, value] of Object.entries(params)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      parsedExpr = parsedExpr.replace(new RegExp(`params\\.${escapedKey}`, 'g'), value.toString());
    }

    return this.evaluateArithmetic(parsedExpr);
  }

  private evaluateArithmetic(expr: string): number {
    try {
      return Function('"use strict"; return (' + expr + ')')();
    } catch (error) {
      console.error(`Failed to evaluate expression: ${expr}`, error);
      return 0;
    }
  }
}

export const ABILITY_CONFIGS: AbilityConfig[] = [
  {
    id: 'centripetal_force',
    name: '向心力',
    description: '前两个有伤技能威力 +30',
    side: 'attacker',
    params: [],
    effects: [
      {
        conditions: [
          { type: 'skill_slot', value: [1, 2] }
        ],
        power: { type: 'fixed', value: '30' }
      }
    ],
    pokemons: []
  },

  {
    id: 'fierce_doom',
    name: '凶煞',
    description: '队伍存在恶系时，双攻 +50%',
    side: 'attacker',
    params: [],
    effects: [
      {
        conditions: [
          { type: 'team_has_attribute', value: Type.DARK }
        ],
        attack: { type: 'percentage', value: '50' },
        sp_attack: { type: 'percentage', value: '50' }
      }
    ],
    pokemons: []
  },

  {
    id: 'empty_sight',
    name: '目空',
    description: '非光系技能威力 +25%',
    side: 'attacker',
    params: [],
    effects: [
      {
        conditions: [
          { type: 'not_skill_attribute', value: Type.PSYCHIC }
        ],
        power: { type: 'percentage', value: '25' }
      }
    ],
    pokemons: []
  },

  {
    id: 'focus_power',
    name: '专注力',
    description: '入场首回合，物攻技能威力 +100%',
    side: 'attacker',
    params: [],
    effects: [
      {
        conditions: [
          { type: 'turn_is_first' },
          { type: 'skill_type', value: SkillCategory.PHYSICAL }
        ],
        power: { type: 'percentage', value: '100' }
      }
    ],
    pokemons: ["音速犬"]
  },

  {
    id: 'magic_boost',
    name: '魔法增效',
    description: '魔攻技能威力 +70%',
    side: 'attacker',
    params: [],
    effects: [
      {
        conditions: [
          { type: 'skill_type', value: SkillCategory.MAGICAL }
        ],
        power: { type: 'percentage', value: '70' }
      }
    ],
    pokemons: []
  },

  {
    id: 'absolute_order',
    name: '绝对秩序',
    description: '受到非自身属性攻击时伤害 -50%',
    side: 'defender',
    params: [],
    effects: [
      {
        conditions: [
          { type: 'not_pokemon_has_attribute', value: Type.PSYCHIC }
        ],
        damage_reducer: { type: 'percentage', value: '50' }
      }
    ],
    pokemons: []
  }
];

export class AbilityParser {
  private configs: Map<string, AbilityConfig>;
  private expressionParser: SimpleExpressionParser;

  constructor() {
    this.configs = new Map();
    this.expressionParser = new SimpleExpressionParser();
    this.loadConfigs();
  }

  private loadConfigs(): void {
    ABILITY_CONFIGS.forEach(config => {
      this.configs.set(config.id, config);
    });
  }

  public getEffect(abilityId: string, context: AbilityContext): AbilityResult {
    const config = this.configs.get(abilityId);
    if (!config) return this.getDefaultEffect();

    const result: AbilityResult = {
      triggered: false,
      powerMultiplier: 1,
      powerBonus: 0,
      attackBonus: 0,
      spAttackBonus: 0,
      defenseBonus: 0,
      spDefenseBonus: 0,
      damageReduction: 0,
      description: ''
    };

    for (const effect of config.effects) {
      if (this.checkConditions(effect.conditions, context)) {
        result.triggered = true;
        this.applyEffect(effect, result, context);
      }
    }

    result.description = this.buildDescription(config, result);
    return result;
  }

  private checkConditions(conditions: AbilityCondition[], ctx: AbilityContext): boolean {
    return conditions.every(cond => this.checkSingleCondition(cond, ctx));
  }

  private checkSingleCondition(cond: AbilityCondition, ctx: AbilityContext): boolean {
    switch (cond.type) {
      case 'turn_is_first':
        return ctx.turn === 1;
      case 'turn_is_nth':
        return ctx.turn === cond.value;
      case 'skill_type':
        return ctx.skill.category === cond.value;
      case 'skill_attribute':
        return ctx.skill.skill_type === cond.value;
      case 'not_skill_attribute':
        return ctx.skill.skill_type !== cond.value;
      case 'pokemon_has_attribute':
        return ctx.pokemon.pokemon_type === cond.value ||
               ctx.pokemon.secondary_type === cond.value;
      case 'not_pokemon_has_attribute':
        return ctx.pokemon.pokemon_type !== cond.value &&
               ctx.pokemon.secondary_type !== cond.value;
      case 'skill_slot':
        if (!ctx.skillSlot) return false;
        return cond.value.includes(ctx.skillSlot);
      case 'team_has_attribute':
        if (!ctx.teamAttributes || ctx.teamAttributes.length === 0) return false;
        return ctx.teamAttributes.includes(cond.value);
      case 'param_equals':
        return ctx.userParams[cond.key] === cond.value;
      default:
        return false;
    }
  }

  private applyEffect(effect: AbilityEffect, result: AbilityResult, ctx: AbilityContext): void {
    const parseValue = (mod?: StatModifier): number => {
      if (!mod) return 0;
      const value = this.expressionParser.parse(mod.value, ctx.userParams);
      return mod.type === 'percentage' ? value / 100 : value;
    };

    if (effect.power) {
      const value = parseValue(effect.power);
      if (effect.power.type === 'percentage') {
        result.powerMultiplier *= (1 + value);
      } else {
        result.powerBonus += value;
      }
    }

    result.attackBonus += parseValue(effect.attack) || 0;
    result.spAttackBonus += parseValue(effect.sp_attack) || 0;
    result.defenseBonus += parseValue(effect.defense) || 0;
    result.spDefenseBonus += parseValue(effect.sp_defense) || 0;
    result.damageReduction += parseValue(effect.damage_reducer) || 0;
  }

  private buildDescription(config: AbilityConfig, result: AbilityResult): string {
    if (!result.triggered) return '';
    const parts: string[] = [];
    if (result.powerMultiplier !== 1) parts.push(`威力 × ${result.powerMultiplier}`);
    if (result.powerBonus !== 0) parts.push(`威力 ${result.powerBonus}`);
    if (result.attackBonus !== 0) parts.push(`物攻 ${result.attackBonus > 0 ? '+' : ''}${result.attackBonus * 100}%`);
    if (result.spAttackBonus !== 0) parts.push(`特攻 ${result.spAttackBonus > 0 ? '+' : ''}${result.spAttackBonus * 100}%`);
    if (result.defenseBonus !== 0) parts.push(`物防 ${result.defenseBonus > 0 ? '+' : ''}${result.defenseBonus * 100}%`);
    if (result.spDefenseBonus !== 0) parts.push(`特防 ${result.spDefenseBonus > 0 ? '+' : ''}${result.spDefenseBonus * 100}%`);
    if (result.damageReduction !== 0) parts.push(`减伤 ${result.damageReduction * 100}%`);
    return parts.length > 0 ? `${config.name}: ${parts.join(', ')}` : '';
  }

  private getDefaultEffect(): AbilityResult {
    return {
      triggered: false,
      powerMultiplier: 1,
      powerBonus: 0,
      attackBonus: 0,
      spAttackBonus: 0,
      defenseBonus: 0,
      spDefenseBonus: 0,
      damageReduction: 0,
      description: ''
    };
  }
}

export function mergeAbilityResults(a: AbilityResult, b: AbilityResult): AbilityResult {
  return {
    triggered: a.triggered || b.triggered,
    powerMultiplier: a.powerMultiplier * b.powerMultiplier,
    powerBonus: a.powerBonus + b.powerBonus,
    attackBonus: a.attackBonus + b.attackBonus,
    spAttackBonus: a.spAttackBonus + b.spAttackBonus,
    defenseBonus: a.defenseBonus + b.defenseBonus,
    spDefenseBonus: a.spDefenseBonus + b.spDefenseBonus,
    damageReduction: a.damageReduction + b.damageReduction,
    description: a.description + (a.description && b.description ? ' | ' : '') + b.description
  };
}

export function applyAbilitiesFromParser(
  attacker: Pokemon,
  defender: Pokemon,
  skill: Skill,
  turn: number,
  attackerAbilities: Record<string, { enabled: boolean; params: Record<string, number> }>,
  defenderAbilities: Record<string, { enabled: boolean; params: Record<string, number> }>
): {
  attackEffect: AbilityResult;
  defenseEffect: AbilityResult;
} {
  const defaultResult: AbilityResult = {
    triggered: false,
    powerMultiplier: 1,
    powerBonus: 0,
    attackBonus: 0,
    spAttackBonus: 0,
    defenseBonus: 0,
    spDefenseBonus: 0,
    damageReduction: 0,
    description: ''
  };

  const parser = new AbilityParser();

  let attackEffect = defaultResult;
  for (const [abilityId, config] of Object.entries(attackerAbilities)) {
    if (config.enabled) {
      const effect = parser.getEffect(abilityId, {
        pokemon: attacker,
        skill,
        turn,
        opponent: defender,
        userParams: config.params
      });
      attackEffect = mergeAbilityResults(attackEffect, effect);
    }
  }

  let defenseEffect = defaultResult;
  for (const [abilityId, config] of Object.entries(defenderAbilities)) {
    if (config.enabled) {
      const effect = parser.getEffect(abilityId, {
        pokemon: defender,
        skill,
        turn,
        opponent: attacker,
        userParams: config.params
      });
      defenseEffect = mergeAbilityResults(defenseEffect, effect);
    }
  }

  return { attackEffect, defenseEffect };
}

/**
 * 生成初始特性对象，所有特性默认不启用
 */
export function getInitialAbilities(): Record<string, { enabled: boolean; params: Record<string, number> }> {
  const result: Record<string, { enabled: boolean; params: Record<string, number> }> = {};

  ABILITY_CONFIGS.forEach(config => {
    result[config.id] = {
      enabled: false,
      params: {}
    };
  });

  return result;

}

/**
 * 为指定精灵生成特性配置，只启用该精灵拥有的特性
 * @param pokemonName 精灵名称
 * @param currentAbilities 当前特性配置（保留用户的手动配置）
 */
export function getInitialAbilitiesForPokemon(
  pokemonName: string,
  currentAbilities?: Record<string, { enabled: boolean; params: Record<string, number> }>
): Record<string, { enabled: boolean; params: Record<string, number> }> {
  const result: Record<string, { enabled: boolean; params: Record<string, number> }> = {};
  const availableAbilityIds = getAbilitiesForPokemon(pokemonName).map(config => config.id);

  ABILITY_CONFIGS.forEach(config => {
    const isAvailable = availableAbilityIds.includes(config.id);
    const current = currentAbilities?.[config.id];
    
    // 如果该特性对这个精灵可用，则默认启用（除非用户手动关闭了）
    const wasManuallyDisabled = current && isAvailable && !current.enabled;
    
    result[config.id] = {
      enabled: isAvailable && !wasManuallyDisabled,
      params: current?.params || {}
    };
  });

  return result;
}

/**
 * 获取指定精灵的可用特性
 */
export function getAbilitiesForPokemon(pokemonName: string): AbilityConfig[] {
  return ABILITY_CONFIGS.filter(config =>
    config.pokemons.includes(pokemonName)
  );
}
