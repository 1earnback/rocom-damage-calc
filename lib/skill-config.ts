import { SkillSpecialConfigs } from './types/index';

export const MAGIC_BURST_POWER_MAPPING: Record<number, number> = {
  0: 45,
  1: 70,
  2: 90,
  3: 110,
  4: 135,
  5: 155,
  6: 165,
  7: 180,
  8: 190,
  9: 200,
  10: 210,
};

// 彗星技能：基础威力240，每失去5%生命，威力减少10
export function calculateCometPower(currentHpPercentage: number): number {
  const clampedHp = Math.max(0, Math.min(100, currentHpPercentage));
  const hpLossPercentage = 100 - clampedHp;
  const reduction = Math.floor(hpLossPercentage / 5) * 10;
  return Math.max(0, 240 - reduction);
}

export const SKILL_SPECIAL_CONFIGS: SkillSpecialConfigs = {
  '魔能爆': {
    type: 'energy_to_power',
    userInput: {
      label: '能量消耗',
      placeholder: '输入 0-10 的数字',
      min: 0,
      max: 10,
      defaultValue: 0,
    },
    powerMapping: MAGIC_BURST_POWER_MAPPING,
  },
  '彗星': {
    type: 'hp_to_power',
    userInput: {
      label: '当前血量 (%)',
      placeholder: '输入 0-100 的数字',
      min: 0,
      max: 100,
      defaultValue: 100,
    },
    basePower: 240,
    reductionPerHpLoss: 10,
    hpLossInterval: 5,
  },
};

export function getSkillSpecialConfig(skillName: string): SkillSpecialConfigs[string] | null {
  return SKILL_SPECIAL_CONFIGS[skillName] || null;
}

export function hasSpecialConfig(skillName: string): boolean {
  return skillName in SKILL_SPECIAL_CONFIGS;
}

export function getPowerFromInput(skillName: string, inputValue: number): number {
  const config = getSkillSpecialConfig(skillName);
  if (!config) {
    return 0;
  }

  const clampedValue = Math.max(config.userInput?.min ?? 0, Math.min(config.userInput?.max ?? 10, inputValue));

  switch (config.type) {
    case 'energy_to_power':
      if (config.powerMapping) {
        return config.powerMapping[clampedValue] ?? config.powerMapping[0];
      }
      return 0;

    case 'hp_to_power':
      if (config.basePower !== undefined && config.reductionPerHpLoss !== undefined && config.hpLossInterval !== undefined) {
        const hpLossPercentage = 100 - clampedValue;
        const reduction = Math.floor(hpLossPercentage / config.hpLossInterval) * config.reductionPerHpLoss;
        return Math.max(0, config.basePower - reduction);
      }
      return config.basePower ?? 0;

    default:
      return 0;
  }
}
