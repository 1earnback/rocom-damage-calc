# 特性解析器系统设计

**日期**: 2026-04-20
**状态**: 设计阶段
**目标**: 重写基于配置的声明式特性系统，替代现有的硬编码特性实现

## 1. 背景与目标

### 1.1 当前问题
- 现有特性系统采用硬编码实现（`lib/ability.ts`），每添加新特性需要修改代码
- 特性逻辑分散在多处，难以维护和扩展
- 缺乏用户可配置的动态参数支持

### 1.2 设计目标
- 通过声明式配置定义特性，无需修改代码即可添加新特性
- 支持简单的条件判断（10种以内）
- 支持用户可配置的动态参数（如buff层数）
- 支持简单数值加成、防御属性变化等效果类型
- 完全替换现有的6个硬编码特性

## 2. 核心数据结构

### 2.1 类型定义

```typescript
// 特性参数定义
interface AbilityParam {
  key: string;
  label: string;
  type: 'number' | 'select';
  min?: number;
  max?: number;
  default: number;
  options?: { value: number; label: string }[];
}

// 条件类型（简单条件列表）
type AbilityCondition =
  | { type: 'turn_is_first' }                    // 首回合
  | { type: 'turn_is_nth'; value: number }       // 第N回合
  | { type: 'skill_type'; value: SkillCategory }  // 技能类型物攻/魔攻
  | { type: 'skill_attribute'; value: Type }      // 技能属性
  | { type: 'not_skill_attribute'; value: Type }  // 技能属性排除
  | { type: 'pokemon_has_attribute'; value: Type } // 精灵具备该属性
  | { type: 'not_pokemon_has_attribute'; value: Type } // 精灵不具备该属性
  | { type: 'skill_slot'; value: number[] }        // 技能位置（如[1,2]代表前两个技能）
  | { type: 'team_has_attribute'; value: Type }    // 队伍存在某属性精灵
  | { type: 'param_equals'; key: string; value: number }; // 参数等于某值

// 属性修正类型
interface StatModifier {
  type: 'percentage' | 'fixed';
  value: string;  // 表达式，如 "5" 或 "params.stacks * 20"
}

// 效果定义
interface AbilityEffect {
  conditions: AbilityCondition[];  // 空数组表示无条件
  power?: StatModifier;           // 威力修正
  attack?: StatModifier;          // 物攻修正
  sp_attack?: StatModifier;       // 特攻修正
  defense?: StatModifier;         // 物防修正
  sp_defense?: StatModifier;      // 特防修正
  damage_reducer?: StatModifier;  // 最终伤害减伤
}

// 完整特性配置
interface AbilityConfig {
  id: string;
  name: string;
  description: string;
  side: 'attacker' | 'defender' | 'both';  // 应用对象
  params: AbilityParam[];                   // 用户可配置参数
  effects: AbilityEffect[];                 // 效果列表
}

// 特性上下文（运行时传递的数据）
interface AbilityContext {
  pokemon: Pokemon;                         // 应用特性的精灵
  skill: Skill;                            // 当前使用的技能
  turn: number;                            // 当前回合
  opponent: Pokemon;                       // 对手精灵
  userParams: Record<string, number>;      // 用户输入的参数值
}

// 特性计算结果
interface AbilityResult {
  triggered: boolean;
  powerMultiplier: number;  // 威力倍率修正
  powerBonus: number;       // 威力固定修正
  attackBonus: number;      // 物攻修正（小数代表百分比）
  spAttackBonus: number;    // 特攻修正（小数代表百分比）
  defenseBonus: number;     // 物防修正（小数代表百分比）
  spDefenseBonus: number;   // 特防修正（小数代表百分比）
  damageReduction: number;  // 伤害减伤（小数代表百分比）
  description: string;
}
```

### 2.2 配置示例

```typescript
// 助燃特性示例
const ZHURAN_CONFIG: AbilityConfig = {
  id: 'zhuran',
  name: '助燃',
  description: '火神特性：每层助燃buff双攻+20%',
  side: 'attacker',
  params: [
    {
      key: 'stacks',
      label: 'Buff层数',
      type: 'number',
      min: 0,
      max: 10,
      default: 0
    }
  ],
  effects: [
    {
      conditions: [],
      attack: { type: 'percentage', value: 'params.stacks * 20' },
      sp_attack: { type: 'percentage', value: 'params.stacks * 20' }
    }
  ]
};

// 专注力特性示例
const FOCUS_POWER_CONFIG: AbilityConfig = {
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
  ]
};

// 绝对秩序特性示例
const ABSOLUTE_ORDER_CONFIG: AbilityConfig = {
  id: 'absolute_order',
  name: '绝对秩序',
  description: '受到非自身属性攻击时伤害 -50%',
  side: 'defender',
  params: [],
  effects: [
    {
      conditions: [
        { type: 'not_pokemon_has_attribute', value: Type.PSYCHIC } // 假设防守方为光系
      ],
      damage_reducer: { type: 'percentage', value: '50' }
    }
  ]
};
```

## 3. 表达式解析器

### 3.1 设计思路
- 支持简单的四则运算：数字、params.X、加减乘除、括号
- 安全性：仅允许数字和运算符，不执行任意代码
- 用途：将配置中的表达式（如 "params.stacks * 20"）解析为数值

### 3.2 实现方案

```typescript
class SimpleExpressionParser {
  parse(expr: string, params: Record<string, number>): number {
    // 1. 替换 params.X 为实际数值
    let parsedExpr = expr;
    for (const [key, value] of Object.entries(params)) {
      parsedExpr = parsedExpr.replace(new RegExp(`params\\.${key}`, 'g'), value.toString());
    }

    // 2. 安全的四则运算（仅限数字和运算符）
    return this.evaluateArithmetic(parsedExpr);
  }

  private evaluateArithmetic(expr: string): number {
    // 使用 Function 构造器，但在全局作用域中不暴露任何变量
    return Function('"use strict"; return (' + expr + ')')();
  }
}
```

### 3.3 支持的表达式示例
- `"5"` → 5
- `"params.stacks"` → stacks 参数的值
- `"params.stacks * 20"` → stacks × 20
- `"(params.stacks + 1) * 10"` → (stacks + 1) × 10
- `"params.a + params.b - params.c"` → a + b - c

## 4. 特性解析器

### 4.1 核心类

```typescript
class AbilityParser {
  private configs: Map<string, AbilityConfig>;
  private expressionParser: SimpleExpressionParser;

  constructor() {
    this.configs = new Map();
    this.expressionParser = new SimpleExpressionParser();
    this.loadConfigs();
  }

  // 加载所有特性配置
  private loadConfigs(): void {
    ABILITY_CONFIGS.forEach(config => {
      this.configs.set(config.id, config);
    });
  }

  // 获取特性效果（主入口）
  getEffect(abilityId: string, context: AbilityContext): AbilityResult {
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

  // 条件判断
  private checkConditions(conditions: AbilityCondition[], ctx: AbilityContext): boolean {
    return conditions.every(cond => this.checkSingleCondition(cond, ctx));
  }

  // 单个条件检查
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
        // 需要额外传递技能位置信息
        return true; // 待实现
      case 'team_has_attribute':
        // 需要队伍信息，暂时默认true
        return true; // 待实现
      case 'param_equals':
        return ctx.userParams[cond.key] === cond.value;
      default:
        return false;
    }
  }

  // 应用效果
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

  // 构建描述
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

  // 默认效果（无效特性）
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
```

## 5. UI集成

### 5.1 组件设计

```typescript
// 特性参数输入组件
interface AbilityParamInputProps {
  param: AbilityParam;
  value: number;
  onChange: (value: number) => void;
}

function AbilityParamInput({ param, value, onChange }: AbilityParamInputProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <label className="text-white text-xs">{param.label}:</label>
      {param.type === 'number' ? (
        <input
          type="number"
          min={param.min}
          max={param.max}
          value={value}
          onChange={(e) => onChange(
            Math.max(param.min || 0, Math.min(param.max || 100, parseInt(e.target.value) || param.default))
          )}
          className="w-24 p-1 text-xs text-gray-800 rounded"
        />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-24 p-1 text-xs text-gray-800 rounded"
        >
          {param.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// 特性配置卡片组件
function AbilityConfigCard({
  abilityId,
  config,
  params,
  onParamChange,
  enabled,
  onToggle
}: {
  abilityId: string;
  config: AbilityConfig;
  params: Record<string, number>;
  onParamChange: (key: string, value: number) => void;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`p-3 rounded ${enabled ? 'bg-white/10' : 'bg-white/5 opacity-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          className="w-3 h-3"
        />
        <span className="text-white text-sm font-medium">{config.name}</span>
      </div>

      <p className="text-white/60 text-xs mb-2">{config.description}</p>

      {enabled && config.params.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          {config.params.map(param => (
            <AbilityParamInput
              key={param.key}
              param={param}
              value={params[param.key] || param.default}
              onChange={(v) => onParamChange(param.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 5.2 PokemonConfig 更新

```typescript
// 全局配置更新
interface PokemonConfig {
  nature: string;
  ivs: { hp: number; atk: number; spatk: number; def: number; spdef: number; speed: number };
  buffs: { atk_boost: number; def_boost: number; spatk_boost: number; spdef_boost: number; speed_boost: number };
  debuffs: { atk_reduce: number; def_reduce: number; spatk_reduce: number; spdef_reduce: number; speed_reduce: number };
  abilities: Record<string, { enabled: boolean; params: Record<string, number> }>;  // 修改
  // 示例:
  // abilities: {
  //   centripetal_force: { enabled: true, params: {} },
  //   zhuran: { enabled: true, params: { stacks: 3 } }
  // }
}
```

## 6. 与现有系统集成

### 6.1 伤害计算集成

```typescript
// lib/damage-calc.ts 修改

// 在 calculateDamage 函数中替换旧的特性逻辑
function applyAbilitiesFromParser(
  attacker: Pokemon,
  defender: Pokemon,
  skill: Skill,
  turn: number,
  attackerAbilities: PokemonConfig['abilities'],
  defenderAbilities: PokemonConfig['abilities']
): {
  attackEffect: AbilityResult;
  defenseEffect: AbilityResult;
} {
  const parser = new AbilityParser();

  // 处理攻击方特性
  let attackEffect = parser.getDefaultEffect();
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

  // 处理防守方特性
  let defenseEffect = parser.getDefaultEffect();
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

// 合并特性效果
function mergeAbilityResults(a: AbilityResult, b: AbilityResult): AbilityResult {
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

// 应用特性到伤害计算
function calculateDamage(...) {
  // ... 现有代码 ...

  // 替换旧的特性逻辑
  const { attackEffect, defenseEffect } = applyAbilitiesFromParser(
    attacker, defender, skill, turn, attackerAbilities, defenderAbilities
  );

  // 应用特性效果
  basePower = basePower * attackEffect.powerMultiplier + attackEffect.powerBonus;

  // 应用攻防属性修正
  effectiveAttack = effectiveAttack * (1 + attackEffect.attackBonus);
  effectiveAttack = effectiveAttack * (1 + attackEffect.spAttackBonus);
  effectiveDefense = effectiveDefense * (1 + defenseEffect.defenseBonus);
  effectiveDefense = effectiveDefense * (1 + defenseEffect.spDefenseBonus);

  // 应用减伤
  finalDamage = finalDamage * (1 - defenseEffect.damageReduction);

  // ... 现有代码 ...
}
```

## 7. 完整特性配置示例

### 7.1 现有6个特性的配置

```typescript
const ABILITY_CONFIGS: AbilityConfig[] = [
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
  }
];
```

### 7.2 新增特性示例

```typescript
// 示例：助燃特性（带参数）
const ZHURAN_CONFIG: AbilityConfig = {
  id: 'zhuran',
  name: '助燃',
  description: '火神特性：每层助燃buff双攻+20%',
  side: 'attacker',
  params: [
    {
      key: 'stacks',
      label: 'Buff层数',
      type: 'number',
      min: 0,
      max: 10,
      default: 0
    }
  ],
  effects: [
    {
      conditions: [],
      attack: { type: 'percentage', value: 'params.stacks * 20' },
      sp_attack: { type: 'percentage', value: 'params.stacks * 20' }
    }
  ]
};

// 示例：多重条件组合
const COMPLEX_ABILITY_CONFIG: AbilityConfig = {
  id: 'complex_example',
  name: '复杂特性示例',
  description: '示例：前3回合，物攻技能，且有Abuff时，威力+50',
  side: 'attacker',
  params: [
    {
      key: 'buff_a',
      label: 'Abuff层数',
      type: 'number',
      min: 0,
      max: 5,
      default: 0
    }
  ],
  effects: [
    {
      conditions: [
        { type: 'turn_is_nth', value: 1 },
        { type: 'skill_type', value: SkillCategory.PHYSICAL },
        { type: 'param_equals', key: 'buff_a', value: 1 }
      ],
      power: { type: 'percentage', value: '50' }
    },
    {
      conditions: [
        { type: 'turn_is_nth', value: 2 },
        { type: 'skill_type', value: SkillCategory.PHYSICAL },
        { type: 'param_equals', key: 'buff_a', value: 1 }
      ],
      power: { type: 'percentage', value: '50' }
    },
    {
      conditions: [
        { type: 'turn_is_nth', value: 3 },
        { type: 'skill_type', value: SkillCategory.PHYSICAL },
        { type: 'param_equals', key: 'buff_a', value: 1 }
      ],
      power: { type: 'percentage', value: '50' }
    }
  ]
};
```

## 8. 项目结构

```
lib/
├── ability-parser.ts          # 新增：特性解析器主文件
│   ├── AbilityConfig 类型
│   ├── AbilityParam 类型
│   ├── AbilityCondition 类型
│   ├── AbilityEffect 类型
│   ├── AbilityContext 类型
│   ├── AbilityResult 类型
│   ├── SimpleExpressionParser 类
│   ├── AbilityParser 类
│   └── ABILITY_CONFIGS 配置数组
├── ability-conditions.ts      # 可选：条件类型定义和验证工具
├── damage-calc.ts             # 修改：集成新的特性系统
│   ├── applyAbilitiesFromParser 函数
│   ├── mergeAbilityResults 函数
│   └── calculateDamage 函数修改
├── types/
│   └── index.ts               # 修改：更新 PokemonConfig 类型
└── ability.ts                 # 待删除：旧的硬编码特性系统

components/
└── AbilityConfigCard.tsx      # 新增：特性配置卡片组件
    ├── AbilityParamInput 组件
    └── AbilityConfigCard 组件

app/
└── page.tsx                   # 修改：集成新的特性配置UI
    ├── 更新 PokemonConfig 状态
    ├── 更新 ConfigCard 组件
    └── 更新特性参数处理逻辑
```

## 9. 数据流

```
用户输入特性参数（通过UI）
    ↓
PokemonConfig.abilities = {
  'zhuran': { enabled: true, params: { stacks: 3 } }
}
    ↓
calculateDamage() 函数调用
    ↓
applyAbilitiesFromParser()
    ↓
AbilityParser.getEffect(abilityId, context)
    ├─ 获取特性配置 (AbilityConfig)
    ├─ 遍历 effects 数组
    ├─ 检查条件 (checkConditions)
    │   └─ checkSingleCondition (每个条件类型)
    ├─ 应用效果 (applyEffect)
    │   ├─ SimpleExpressionParser.parse (解析表达式)
    │   └─ 计算修正值
    └─ 构建描述 (buildDescription)
    ↓
返回 AbilityResult
    ↓
合并多个特性效果 (mergeAbilityResults)
    ↓
应用到伤害计算
    ↓
最终伤害结果
```

## 10. 迁移计划

### 10.1 阶段一：核心功能实现
1. 创建 `lib/ability-parser.ts`，实现核心数据结构和解析逻辑
2. 创建 `lib/ability-conditions.ts`，实现条件检查（可选，内联到ability-parser也可以）
3. 编写单元测试覆盖核心功能

### 10.2 阶段二：UI实现
1. 创建 `components/AbilityConfigCard.tsx`，实现参数输入UI
2. 更新 `app/page.tsx`，集成新的特性配置组件
3. 更新 `lib/types/index.ts`，修改 `PokemonConfig` 类型

### 10.3 阶段三：伤害计算集成
1. 修改 `lib/damage-calc.ts`，替换旧的特性逻辑
2. 实现特性效果到伤害计算的映射
3. 更新 DamageResult 类型，兼容新的特性结果

### 10.4 阶段四：迁移和清理
1. 将现有6个特性转换为配置格式
2. 删除 `lib/ability.ts` 旧代码
3. 更新文档和注释

### 10.5 阶段五：测试和验证
1. 对比新旧特性的伤害计算结果
2. 验证所有现有特性效果一致
3. 测试新特性添加流程

## 11. 风险和注意事项

### 11.1 已知限制
- 条件类型 `skill_slot` 和 `team_has_attribute` 需要额外的上下文信息，需要扩展 AbilityContext
- 条件中暂不支持 AND/OR 逻辑组合，需要多个效果配置实现
- 表达式解析器使用 `Function` 构造器，需确保输入安全性

### 11.2 待扩展功能
- 支持更多条件类型（如技能威力范围、血量条件等）
- 支持更复杂的效果类型（如吸血、回血、状态效果等）
- 优化表达式解析器，提供更好的错误提示
- 添加特性配置的验证和测试工具

### 11.3 性能考虑
- 特性解析在每次伤害计算时执行，需要考虑性能优化
- 可以缓存特性解析结果（在相同配置下）
- 表达式解析结果可以缓存，避免重复计算

## 12. 总结

本设计通过声明式配置实现了灵活的特性系统，具有以下优势：

1. **可扩展性**：添加新特性只需添加配置，无需修改代码
2. **可维护性**：特性逻辑集中管理，清晰易懂
3. **灵活性**：支持条件判断和动态参数，满足复杂需求
4. **类型安全**：完整的 TypeScript 类型定义
5. **渐进式迁移**：可与现有系统并存，逐步替换

该设计已获用户确认，可以进入实现阶段。
