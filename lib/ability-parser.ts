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

export { AbilityCondition };

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
