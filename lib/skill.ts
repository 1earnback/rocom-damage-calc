import { Skill, Type, SkillCategory } from './types/index';
import { TYPE_NAME_MAP, CATEGORY_NAME_MAP, normalizeType } from './type-chart';

let _skill_db: Record<string, Skill> = {};

function parseEffect(skill: Skill, desc: string): Skill {
  const d = desc.replace('，', ',').replace('。', '').replace('：', ':');

  const matchers = {
    '(\d+)连击': (m: RegExpExecArray) => { skill.hit_count = parseInt(m[1]); },
    '吸血(\d+)%': (m: RegExpExecArray) => { skill.life_drain = parseInt(m[1]) / 100; },
    '减伤(\d+)%': (m: RegExpExecArray) => { skill.damage_reduction = parseInt(m[1]) / 100; },
    '回复(\d+)%生命': (m: RegExpExecArray) => { skill.self_heal_hp = parseInt(m[1]) / 100; },
    '回复(\d+)能量': (m: RegExpExecArray) => { skill.self_heal_energy = parseInt(m[1]); },
    '偷取敌方?(\d+)能量': (m: RegExpExecArray) => { skill.steal_energy = parseInt(m[1]); },
    '敌方失去(\d+)能量': (m: RegExpExecArray) => { skill.enemy_lose_energy = parseInt(m[1]); },
    '先手\+(\d+)': (m: RegExpExecArray) => { skill.priority_mod = parseInt(m[1]); },
    '先手-(\d+)': (m: RegExpExecArray) => { skill.priority_mod = -parseInt(m[1]); },
    '获得物攻\+(\d+)%': (m: RegExpExecArray) => { skill.self_atk = parseInt(m[1]) / 100; },
    '获得魔攻\+(\d+)%': (m: RegExpExecArray) => { skill.self_spatk = parseInt(m[1]) / 100; },
    '获得物防\+(\d+)%': (m: RegExpExecArray) => { skill.self_def = parseInt(m[1]) / 100; },
    '获得魔防\+(\d+)%': (m: RegExpExecArray) => { skill.self_spdef = parseInt(m[1]) / 100; },
    '获得速度\+(\d+)': (m: RegExpExecArray) => { skill.self_speed = parseInt(m[1]) / 100; },
    '获得速度-(\d+)': (m: RegExpExecArray) => { skill.self_speed = -parseInt(m[1]) / 100; },
    '双攻\+(\d+)%': (m: RegExpExecArray) => {
      const v = parseInt(m[1]) / 100;
      skill.self_atk += v;
      skill.self_spatk += v;
    },
    '双攻-(\d+)%': (m: RegExpExecArray) => {
      const v = parseInt(m[1]) / 100;
      skill.self_atk -= v;
      skill.self_spatk -= v;
    },
    '双防\+(\d+)%': (m: RegExpExecArray) => {
      const v = parseInt(m[1]) / 100;
      skill.self_def += v;
      skill.self_spdef += v;
    },
    '双防-(\d+)%': (m: RegExpExecArray) => {
      const v = parseInt(m[1]) / 100;
      skill.self_def -= v;
      skill.self_spdef -= v;
    },
    '获得技能威力\+(\d+)': (m: RegExpExecArray) => { skill.power += parseInt(m[1]); },
    '全技能威力\+(\d+)': (m: RegExpExecArray) => { skill.power += parseInt(m[1]); },
    '敌方获得物攻-(\d+)%': (m: RegExpExecArray) => { skill.enemy_atk = -parseInt(m[1]) / 100; },
    '敌方获得魔攻-(\d+)%': (m: RegExpExecArray) => { skill.enemy_spatk = -parseInt(m[1]) / 100; },
    '敌方获得物防-(\d+)%': (m: RegExpExecArray) => { skill.enemy_def = -parseInt(m[1]) / 100; },
    '敌方获得魔防-(\d+)%': (m: RegExpExecArray) => { skill.enemy_spdef = -parseInt(m[1]) / 100; },
    '敌方获得双攻-(\d+)%': (m: RegExpExecArray) => {
      const v = -parseInt(m[1]) / 100;
      skill.enemy_all_atk = v;
    },
    '敌方获得双防-(\d+)%': (m: RegExpExecArray) => {
      const v = -parseInt(m[1]) / 100;
      skill.enemy_all_def = v;
    },
    '(\d+)层中毒': (m: RegExpExecArray) => { skill.poison_stacks = parseInt(m[1]); },
    '(\d+)层灼烧': (m: RegExpExecArray) => { skill.burn_stacks = parseInt(m[1]); },
    '(\d+)层冻结': (m: RegExpExecArray) => { skill.freeze_stacks = parseInt(m[1]); },
    '敌方获得全技能能耗\+(\d+)': (m: RegExpExecArray) => { skill.enemy_energy_cost_up = parseInt(m[1]); },
  };

  for (const [pattern, handler] of Object.entries(matchers)) {
    const regex = new RegExp(pattern);
    const match = regex.exec(d);
    if (match) {
      handler(match);
    }
  }

  if (d.includes('脱离')) skill.force_switch = true;
  if (d.includes('迅捷')) skill.agility = true;
  if (d.includes('蓄力')) skill.charge = true;

  return skill;
}

function parseCSVRow(row: string[]): Skill | null {
  const name = row[0].trim();
  if (!name) return null;

  const skill_type = normalizeType(row[1].trim());
  const category = CATEGORY_NAME_MAP[row[2].trim()] || SkillCategory.PHYSICAL;

  let power = 0;
  try {
    power = parseInt(row[3].trim());
  } catch (e) {}

  let energy = 0;
  try {
    energy = parseInt(row[4].trim());
  } catch (e) {}

  const desc = row[5] ? row[5].trim() : '';

  const skill: Skill = {
    name,
    skill_type,
    category,
    power,
    energy_cost: energy,
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

  if (desc) {
    parseEffect(skill, desc);
  }

  return skill;
}

export function parseCSV(csvContent: string): Record<string, Skill> {
  const lines = csvContent.trim().split('\n');
  const skills: Record<string, Skill> = {};

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;

    const columns = row.split(',');
    const skill = parseCSVRow(columns);
    if (skill) {
      skills[skill.name] = skill;
    }
  }

  console.log(`[OK] 已加载 ${Object.keys(skills).length} 个技能`);
  return skills;
}

export function getSkill(name: string, skillDb: Record<string, Skill>): Skill {
  if (skillDb[name]) {
    return { ...skillDb[name] };
  }

  return {
    name,
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
