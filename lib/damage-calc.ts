import { Pokemon, Skill, DamageResult, SkillCategory, Weather, Type, StatusType, PokemonConfig } from './types/index';
import { getTypeEffectiveness } from './type-chart';
import { applyAbilitiesFromParser } from './ability-parser';

export function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  skill: Skill,
  options: {
    counterPowerMult?: number;
    damageReductions?: number[];
    weather?: Weather;
    extraPowerBonus?: number;
    extraHitCount?: number;
    turn?: number;
    includeAbility?: boolean;
    attackerAbilities?: PokemonConfig['abilities'];
    defenderAbilities?: PokemonConfig['abilities'];
    attackerOriginalAbility?: string;
    defenderOriginalAbility?: string;
    specialSkillPower?: number;
  } = {}
): DamageResult {
  const {
    counterPowerMult = 1.0,
    damageReductions: initialDamageReductions = [],
    weather = Weather.NONE,
    extraPowerBonus = 0,
    extraHitCount = 0,
    turn = 1,
    includeAbility = true,
    attackerAbilities,
    defenderAbilities,
    attackerOriginalAbility,
    defenderOriginalAbility,
  } = options;

  let damageReductions = [...initialDamageReductions];
  let powerFromSpecialConfig = 0;

  if (options.specialSkillPower !== undefined) {
    powerFromSpecialConfig = options.specialSkillPower;
  }

  let effective_power = Math.max(0, skill.power * counterPowerMult + attacker.power_bonus + extraPowerBonus + powerFromSpecialConfig);

  const triggeredAbilities: string[] = [];
  const notTriggeredAbilities: string[] = [];

  if (includeAbility && attackerAbilities && defenderAbilities) {
    const { attackEffect, defenseEffect } = applyAbilitiesFromParser(
      attacker, defender, skill, turn, attackerAbilities, defenderAbilities
    );

    effective_power = effective_power * attackEffect.powerMultiplier + attackEffect.powerBonus;

    const totalAttackBonus = 1 + attackEffect.attackBonus + attackEffect.spAttackBonus;
    const totalDefenseBonus = 1 + defenseEffect.defenseBonus + defenseEffect.spDefenseBonus;

    if (totalAttackBonus !== 1 || totalDefenseBonus !== 1) {
      triggeredAbilities.push(attackEffect.description);
      notTriggeredAbilities.push(defenseEffect.description);
    }
  }

  if (effective_power <= 0) {
    return {
      damage: 0,
      damage_percentage: 0,
      effectiveness: 1.0,
      stab: false,
      weather_mult: 1.0,
      ability_level: 1.0,
      triggeredAbilities: [],
      notTriggeredAbilities: [],
    };
  }

  const atk_base = skill.category === SkillCategory.PHYSICAL ? attacker.attack : attacker.sp_attack;
  const def_base = skill.category === SkillCategory.PHYSICAL ? defender.defense : defender.sp_defense;

  const effective_def = Math.max(1, def_base);
  const base = (atk_base / effective_def) * 0.9 * effective_power;

  const my_atk_boost = skill.category === SkillCategory.PHYSICAL ? attacker.atk_boost : attacker.spatk_boost;
  const my_atk_reduce = skill.category === SkillCategory.PHYSICAL ? attacker.atk_reduce : attacker.spatk_reduce;
  const enemy_def_boost = skill.category === SkillCategory.PHYSICAL ? defender.def_boost : defender.spdef_boost;
  const enemy_def_reduce = skill.category === SkillCategory.PHYSICAL ? defender.def_reduce : defender.spdef_reduce;

  const numerator = 1.0 + my_atk_boost + enemy_def_reduce;
  const denominator = Math.max(0.1, 1.0 + my_atk_reduce + enemy_def_boost);
  const ability_level = numerator / denominator;

  const stab = skill.skill_type === attacker.pokemon_type || skill.skill_type === attacker.secondary_type;

  const eff1 = getTypeEffectiveness(skill.skill_type, defender.pokemon_type);
  let effectiveness: number;
  if (defender.secondary_type === null) {
    effectiveness = eff1;
  } else {
    const eff2 = getTypeEffectiveness(skill.skill_type, defender.secondary_type);
    if (eff1 === 0 || eff2 === 0) {
      effectiveness = 0.0;
    } else if (eff1 >= 2.0 && eff2 >= 2.0) {
      effectiveness = 3.0;
    } else if (eff1 <= 0.5 && eff2 <= 0.5) {
      effectiveness = 0.33;
    } else {
      effectiveness = eff1 * eff2;
    }
  }

  let weather_mult = 1.0;
  if (weather === Weather.RAIN && skill.skill_type === Type.WATER) {
    weather_mult = 1.5;
  }

  let reduction_mult = 1.0;
  for (const r of damageReductions) {
    reduction_mult *= (1.0 - r);
  }

  const single_hit = base * ability_level * (stab ? 1.25 : 1.0) * effectiveness * weather_mult * reduction_mult;
  const total = single_hit * (skill.hit_count + extraHitCount);

  const damage = Math.max(1, Math.floor(total));
  const damage_percentage = (damage / defender.hp) * 100;

  return {
    damage,
    damage_percentage: Math.min(100, damage_percentage),
    effectiveness,
    stab,
    weather_mult,
    ability_level,
    triggeredAbilities,
    notTriggeredAbilities,
  };
}

export function createDefaultPokemon(name: string): Pokemon {
  return {
    name,
    pokemon_type: Type.NORMAL,
    secondary_type: null,
    hp: 100,
    attack: 50,
    defense: 50,
    sp_attack: 50,
    sp_defense: 50,
    speed: 50,
    ability: '',
    skills: [],
    current_hp: 100,
    energy: 10,
    status: StatusType.NORMAL,
    atk_boost: 0,
    def_boost: 0,
    spatk_boost: 0,
    spdef_boost: 0,
    speed_boost: 0,
    atk_reduce: 0,
    def_reduce: 0,
    spatk_reduce: 0,
    spdef_reduce: 0,
    speed_reduce: 0,
    burn_stacks: 0,
    poison_stacks: 0,
    freeze_stacks: 0,
    parasited_by: null,
    power_bonus: 0,
  };
}

export function createDefaultSkill(): Skill {
  return {
    name: '普通攻击',
    skill_type: Type.NORMAL,
    category: SkillCategory.PHYSICAL,
    power: 40,
    energy_cost: 2,
    hit_count: 1,
    life_drain: 0,
    damage_reduction: 0,
    self_heal_hp: 0,
    self_heal_energy: 0,
    steal_energy: 0,
    enemy_lose_energy: 0,
    enemy_energy_cost_up: 0,
    priority_mod: 0,
    force_switch: false,
    agility: false,
    charge: false,
    self_atk: 0,
    self_def: 0,
    self_spatk: 0,
    self_spdef: 0,
    self_speed: 0,
    self_all_atk: 0,
    self_all_def: 0,
    enemy_atk: 0,
    enemy_def: 0,
    enemy_spatk: 0,
    enemy_spdef: 0,
    enemy_speed: 0,
    enemy_all_atk: 0,
    enemy_all_def: 0,
    poison_stacks: 0,
    burn_stacks: 0,
    freeze_stacks: 0,
    counter_physical_drain: 0,
    counter_physical_energy_drain: 0,
    counter_physical_self_atk: 0,
    counter_physical_enemy_def: 0,
    counter_physical_enemy_atk: 0,
    counter_physical_power_mult: 0,
    counter_defense_self_atk: 0,
    counter_defense_self_def: 0,
    counter_defense_enemy_def: 0,
    counter_defense_enemy_atk: 0,
    counter_defense_enemy_energy_cost: 0,
    counter_defense_power_mult: 0,
    counter_status_power_mult: 0,
    counter_status_enemy_lose_energy: 0,
    counter_status_poison_stacks: 0,
    counter_status_burn_stacks: 0,
    counter_status_freeze_stacks: 0,
    counter_skill_cooldown: 0,
    counter_damage_reflect: 0,
  };
}
