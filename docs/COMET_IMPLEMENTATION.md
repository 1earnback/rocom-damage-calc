# 彗星技能特殊实现文档

## 功能概述

为彗星技能添加了特殊计算逻辑，允许用户手动输入当前血量百分比，系统会自动计算对应的威力。

## 技能描述

**彗星** (普通系魔攻):
- 基础威力: 240
- 耗能: 0
- 效果: 造成魔伤，每失去 5% 生命，本次技能威力 -10，使用后消耗全部生命

## 计算逻辑

```
实际威力 = 240 - floor(失去生命百分比 / 5) × 10
```

### 威力计算示例

| 当前血量 | 失去生命 | 威力减少 | 实际威力 |
|---------|---------|---------|---------|
| 100%    | 0%      | 0       | 240     |
| 95%     | 5%      | 10      | 230     |
| 90%     | 10%     | 20      | 220     |
| 75%     | 25%     | 50      | 190     |
| 50%     | 50%     | 100     | 140     |
| 25%     | 75%     | 150     | 90      |
| 5%      | 95%     | 190     | 50      |
| 0%      | 100%    | 200     | 40      |

## 实现的模块

### 1. 类型定义 (`lib/types/index.ts`)

扩展了 `SkillSpecialConfig` 接口，支持基于血量的威力计算：

```typescript
export interface SkillSpecialConfig {
  type: 'energy_to_power' | 'hp_to_power' | 'custom';
  userInput?: {
    label: string;
    placeholder: string;
    min: number;
    max: number;
    defaultValue: number;
  };
  powerMapping?: Record<number, number>;
  basePower?: number;              // 基础威力
  reductionPerHpLoss?: number;     // 每 X% 生命损失减少的威力
  hpLossInterval?: number;         // 生命损失的计算间隔
}
```

### 2. 配置管理 (`lib/skill-config.ts`)

添加了彗星技能的特殊配置：

```typescript
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
}
```

增强了 `getPowerFromInput` 函数，支持新的 `hp_to_power` 类型计算：

```typescript
case 'hp_to_power':
  if (config.basePower !== undefined && config.reductionPerHpLoss !== undefined && config.hpLossInterval !== undefined) {
    const hpLossPercentage = 100 - clampedValue;
    const reduction = Math.floor(hpLossPercentage / config.hpLossInterval) * config.reductionPerHpLoss;
    return Math.max(0, config.basePower - reduction);
  }
  return config.basePower ?? 0;
```

### 3. UI 实现 (`app/page.tsx`)

- 统一了威力显示逻辑，对所有特殊技能都显示当前计算的威力
- 自动检测彗星技能的特殊配置
- 条件渲染输入框，仅在需要时显示
- 默认值设为 100%（满血）

## 使用示例

1. 打开伤害计算器
2. 选择攻击方和防守方精灵
3. 在技能选择框中输入"彗星"
4. 下方会自动显示"当前血量 (%)"输入框
5. 输入 0-100 之间的数字（默认值为 100）
6. 下方实时显示当前威力
7. 伤害结果会自动更新，使用特殊计算的威力

## 设计优势

1. **遵循现有模式**: 完全基于魔能爆的实现模式，保持代码一致性
2. **参数化配置**: 通过配置文件管理计算参数，易于维护
3. **类型安全**: 使用 TypeScript 确保类型正确
4. **自动检测**: UI 自动检测和显示特殊输入框
5. **计算灵活**: 支持不同的血量-威力计算规则

## 扩展指南

### 为其他血量依赖技能添加配置

要为其他类似的血量依赖技能添加特殊逻辑，只需在 `lib/skill-config.ts` 中添加配置：

```typescript
'其他技能': {
  type: 'hp_to_power',
  userInput: {
    label: '当前血量 (%)',
    placeholder: '输入 0-100 的数字',
    min: 0,
    max: 100,
    defaultValue: 100,
  },
  basePower: 基础威力,
  reductionPerHpLoss: 每 X% 生命损失减少的威力,
  hpLossInterval: 生命损失的计算间隔,
}
```

### 配置说明

- `type`: 配置类型，支持 'energy_to_power'（能量换算）或 'hp_to_power'（血量换算）
- `userInput`: 用户输入配置
  - `label`: 输入框标签
  - `placeholder`: 输入框占位符
  - `min`/`max`: 输入范围（通常为 0-100）
  - `defaultValue`: 默认值
- `basePower`: 技能的基础威力
- `reductionPerHpLoss`: 每达到一个间隔减少的威力值
- `hpLossInterval`: 计算威力的血量损失间隔（如 5 表示每失去 5% 计算一次）

## 技能特性说明

**彗星** 是一个牺牲技能，具有以下特点：
- 使用后消耗使用者的全部生命
- 生命力越满，威力越高；生命值越低，威力越低
- 满血时威力为 240，濒死时（0%生命）威力为 40
- 该设计鼓励在血量较高时使用，以获得最大伤害
