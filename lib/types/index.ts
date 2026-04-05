export enum Type {
  NORMAL = 'normal',
  FIRE = 'fire',
  WATER = 'water',
  ELECTRIC = 'electric',
  GRASS = 'grass',
  ICE = 'ice',
  FIGHTING = 'fighting',
  POISON = 'poison',
  GROUND = 'ground',
  FLYING = 'flying',
  PSYCHIC = 'psychic',
  BUG = 'bug',
  ROCK = 'rock',
  GHOST = 'ghost',
  DRAGON = 'dragon',
  DARK = 'dark',
  STEEL = 'steel',
  FAIRY = 'fairy',
}

export enum SkillCategory {
  PHYSICAL = '物攻',
  MAGICAL = '魔攻',
  DEFENSE = '防御',
  STATUS = '状态',
}

export enum StatusType {
  NORMAL = 'normal',
  POISONED = 'poisoned',
  BURNED = 'burned',
  PARALYZED = 'paralyzed',
  FROZEN = 'frozen',
  SLEEP = 'sleep',
  CONFUSED = 'confused',
  FAINTED = 'fainted',
}

export enum Weather {
  NONE = 'none',
  SNOW = 'snow',
  SANDSTORM = 'sandstorm',
  RAIN = 'rain',
}

export interface Skill {
  name: string;
  skill_type: Type;
  category: SkillCategory;
  power: number;
  energy_cost: number;
  hit_count: number;
  life_drain: number;
  damage_reduction: number;
  self_heal_hp: number;
  self_heal_energy: number;
  steal_energy: number;
  enemy_lose_energy: number;
  enemy_energy_cost_up: number;
  priority_mod: number;
  force_switch: boolean;
  agility: boolean;
  charge: boolean;
  self_atk: number;
  self_def: number;
  self_spatk: number;
  self_spdef: number;
  self_speed: number;
  self_all_atk: number;
  self_all_def: number;
  enemy_atk: number;
  enemy_def: number;
  enemy_spatk: number;
  enemy_spdef: number;
  enemy_speed: number;
  enemy_all_atk: number;
  enemy_all_def: number;
  poison_stacks: number;
  burn_stacks: number;
  freeze_stacks: number;
  counter_physical_drain: number;
  counter_physical_energy_drain: number;
  counter_physical_self_atk: number;
  counter_physical_enemy_def: number;
  counter_physical_enemy_atk: number;
  counter_physical_power_mult: number;
  counter_defense_self_atk: number;
  counter_defense_self_def: number;
  counter_defense_enemy_def: number;
  counter_defense_enemy_atk: number;
  counter_defense_enemy_energy_cost: number;
  counter_defense_power_mult: number;
  counter_status_power_mult: number;
  counter_status_enemy_lose_energy: number;
  counter_status_poison_stacks: number;
  counter_status_burn_stacks: number;
  counter_status_freeze_stacks: number;
  counter_skill_cooldown: number;
  counter_damage_reflect: number;
}

export interface PokemonData {
  no: number;
  name: string;
  form: string | null;
  url: string;
  has_shiny: boolean;
  attributes: string[];
  stats: {
    hp: number;
    atk: number;
    sp_atk: number;
    def: number;
    sp_def: number;
    spd: number;
    total: number;
  };
  ability: {
    name: string;
    description: string;
  };
  type_matchup: TypeMatchup;
  skills: SkillBasic[];
}

export interface SkillBasic {
  name: string;
  attribute: string;
  category: string;
  cost: number;
  power: number;
  description: string;
}

export interface TypeMatchup {
  strong_against: string[];
  weak_to: string[];
  resists: string[];
  resisted_by: string[];
}

export interface Pokemon {
  name: string;
  pokemon_type: Type;
  secondary_type: Type | null;
  hp: number;
  attack: number;
  defense: number;
  sp_attack: number;
  sp_defense: number;
  speed: number;
  ability: string;
  skills: Skill[];

  current_hp: number;
  energy: number;
  status: StatusType;

  atk_boost: number;
  def_boost: number;
  spatk_boost: number;
  spdef_boost: number;
  speed_boost: number;

  atk_reduce: number;
  def_reduce: number;
  spatk_reduce: number;
  spdef_reduce: number;
  speed_reduce: number;

  burn_stacks: number;
  poison_stacks: number;
  freeze_stacks: number;
  parasited_by: string | null;
  power_bonus: number;
}

export interface PokemonConfig {
  nature: string;
  ivs: {
    hp: number;
    atk: number;
    spatk: number;
    def: number;
    spdef: number;
    speed: number;
  };
  buffs: {
    atk_boost: number;
    def_boost: number;
    spatk_boost: number;
    spdef_boost: number;
    speed_boost: number;
  };
  debuffs: {
    atk_reduce: number;
    def_reduce: number;
    spatk_reduce: number;
    spdef_reduce: number;
    speed_reduce: number;
  };
  abilities: {
    centripetalForce: boolean;  // 向心力
    fierceDoom: boolean;       // 凶煞
    emptySight: boolean;       // 目空
    focusPower: boolean;       // 专注力
    magicBoost: boolean;       // 魔法增效
    absoluteOrder: boolean;    // 绝对秩序
  };
}

export interface DamageResult {
  damage: number;
  damage_percentage: number;
  effectiveness: number;
  stab: boolean;
  weather_mult: number;
  ability_level: number;
  triggeredAbilities: string[];
  notTriggeredAbilities: string[];
}

export interface Nature {
  name: string;
  display: string;
  boost_stat: string | null;
  reduce_stat: string | null;
}
