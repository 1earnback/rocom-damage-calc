# 魔能爆技能特殊实现文档

## 功能概述

为魔能爆技能添加了特殊计算逻辑，允许用户手动输入能量消耗，系统会自动计算对应的威力。

## 实现的模块

### 1. 类型定义 (`lib/types/index.ts`)

添加了特殊技能配置的类型：

```typescript
export interface SkillSpecialConfig {
  type: 'energy_to_power' | 'custom';
  userInput?: {
    label: string;
    placeholder: string;
    min: number;
    max: number;
    defaultValue: number;
  };
  powerMapping?: Record<number, number>;
}

export type SkillSpecialConfigs = Record<string, SkillSpecialConfig>;
```

### 2. 配置管理 (`lib/skill-config.ts`)

创建了专门的模块来管理特殊技能配置：

- `MAGIC_BURST_POWER_MAPPING`: 魔能爆的能量-威力映射表
- `SKILL_SPECIAL_CONFIGS`: 所有特殊技能的配置
- `getSkillSpecialConfig()`: 获取指定技能的配置
- `hasSpecialConfig()`: 检查技能是否有特殊配置
- `getPowerFromInput()`: 根据用户输入计算威力

### 3. 伤害计算集成 (`lib/damage-calc.ts`)

修改了 `calculateDamage` 函数，增加了 `specialSkillPower` 参数，支持传入特殊技能的威力。

### 4. UI 实现 (`app/page.tsx`)

- 添加了 `specialSkillInput` 状态来存储用户输入的值
- 在技能选择时自动检测是否有特殊配置
- 条件渲染输入框，仅在需要时显示
- 显示当前计算的威力
- 切换技能时自动重置输入值

## 魔能爆威力映射

| 能量消耗 | 威力 |
|---------|------|
| 0       | 45   |
| 1       | 70   |
| 2       | 90   |
| 3       | 110  |
| 4       | 135  |
| 5       | 155  |
| 6       | 165  |
| 7       | 180  |
| 8       | 190  |
| 9       | 200  |
| 10      | 210  |

## 扩展指南

### 为其他技能添加特殊逻辑

要为其他技能添加类似的特殊逻辑，只需在 `lib/skill-config.ts` 的 `SKILL_SPECIAL_CONFIGS` 中添加配置：

```typescript
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
    powerMapping: {
      0: 45,
      1: 70,
      // ... 其他映射
    },
  },
  '其他技能': {
    type: 'custom',
    userInput: {
      label: '自定义参数',
      placeholder: '输入参数',
      min: 0,
      max: 100,
      defaultValue: 50,
    },
    // 可以添加自定义的转换逻辑
  },
};
```

### 配置说明

- `type`: 配置类型，目前支持 'energy_to_power' 和 'custom'
- `userInput`: 用户输入配置
  - `label`: 输入框标签
  - `placeholder`: 输入框占位符
  - `min`/`max`: 输入范围
  - `defaultValue`: 默认值
- `powerMapping`: 威力映射表（可选）

## 设计优势

1. **模块化**: 特殊技能逻辑集中管理，与主要代码分离
2. **可扩展**: 只需添加配置，无需修改 UI 代码
3. **类型安全**: 使用 TypeScript 确保类型正确
4. **易于维护**: 配置清晰，修改方便
5. **自动检测**: UI 自动检测和显示特殊输入框

## 使用示例

1. 打开伤害计算器
2. 选择攻击方和防守方精灵
3. 在技能选择框中输入"魔能爆"
4. 下方会自动显示"能量消耗"输入框
5. 输入 0-10 之间的数字
6. 下方实时显示当前威力
7. 伤害结果会自动更新，使用特殊计算的威力
