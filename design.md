# 洛克王国伤害计算器 - 系统设计文档

## 1. 项目概述

### 1.1 项目简介
这是一个基于 Next.js 开发的洛克王国世界对战伤害计算器，纯前端实现，支持实时计算精灵伤害。灵感来源于 Pokemon Showdown 伤害计算器。

### 1.2 核心功能
- **精灵图鉴系统**：支持 461+ 只精灵数据，支持精灵名称搜索
- **精灵定制系统**：25 种性格选择、六维个体值配置、能力等级修正
- **伤害计算系统**：完整的伤害计算公式，支持属性克制、本系加成、能力等级修正
- **技能系统**：489 个技能数据，支持技能搜索和自动显示可学技能
- **特性系统**：支持部分战斗特性计算

### 1.3 项目状态
- 当前状态：已废弃
- 目标：在新项目中重写此代码
- 版本：v0.1.0

## 2. 技术栈

### 2.1 前端框架
- **React**：18.3.1
- **Next.js**：14.2.5 (App Router)
- **TypeScript**：5.x

### 2.2 样式方案
- **Tailwind CSS**：3.4.1
- **设计风格**：玻璃拟态设计（Glassmorphism）

### 2.3 构建工具
- **PostCSS**：8.5.8
- **Autoprefixer**：10.4.27

### 2.4 包管理
- **npm**（备用）

### 2.5 数据源
- **精灵数据**：`/data/sprites.json` (~10MB)
- **技能数据**：`/data/skills_all.csv` (~47KB)
- **来源**：[rocom-data](https://github.com/AofeiLi-code/rocom-data)

## 3. 项目架构

### 3.1 目录结构
```
rocom-damage-calc/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 主页（伤害计算器）
│   └── globals.css          # 全局样式
├── lib/                     # 核心逻辑
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── type-chart.ts        # 属性克制关系表
│   ├── skill.ts             # 技能解析
│   ├── skill-config.ts      # 特殊技能配置
│   ├── pokemon.ts           # 精灵数据处理
│   ├── ability.ts           # 特性系统
│   ├── damage-calc.ts       # 伤害计算核心逻辑
│   ├── worker.ts            # Web Worker（备用）
│   └── utils.ts             # 工具函数
├── components/              # React 组件
│   └── RadarChart.tsx       # 雷达图组件
├── public/                  # 静态资源
│   └── data/                # 数据文件
│       ├── sprites.json     # 精灵数据
│       └── skills_all.csv   # 技能数据
├── docs/                    # 文档
├── tailwind.config.js       # Tailwind 配置
├── tsconfig.json            # TypeScript 配置
└── package.json             # 项目配置
```

### 3.2 架构特点
- **纯前端实现**：所有计算在客户端完成，无需服务器支持
- **懒加载机制**：数据在页面加载时获取一次，后续使用缓存
- **响应式设计**：支持移动设备和桌面设备
- **类型安全**：完整的 TypeScript 类型定义

## 4. 核心类型定义

### 4.1 属性系统
```typescript
enum Type {
  NORMAL = 'normal',      // 普通系
  FIRE = 'fire',          // 火系
  WATER = 'water',        // 水系
  ELECTRIC = 'electric',  // 电系
  GRASS = 'grass',        // 草系
  ICE = 'ice',            // 冰系
  FIGHTING = 'fighting',  // 武系
  POISON = 'poison',      // 毒系
  GROUND = 'ground',      // 地系
  FLYING = 'flying',      // 翼系
  PSYCHIC = 'psychic',    // 幻系/光系
  BUG = 'bug',            // 虫系
  ROCK = 'rock',          // 岩系
  GHOST = 'ghost',        // 幽系
  DRAGON = 'dragon',      // 龙系
  DARK = 'dark',          // 恶系
  STEEL = 'steel',        // 机械系
  FAIRY = 'fairy',        // 萌系
}
```

### 4.2 技能分类
```typescript
enum SkillCategory {
  PHYSICAL = '物攻',   // 物理攻击
  MAGICAL = '魔攻',    // 魔法攻击
  DEFENSE = '防御',    // 防御类技能
  STATUS = '状态',     // 状态类技能
}
```

### 4.3 精灵数据结构
```typescript
interface PokemonData {
  no: number;                    // 编号
  name: string;                  // 名称
  form: string | null;           // 形态（null 表示最终形态）
  url: string;                   // 图片URL
  has_shiny: boolean;            // 是否有闪光
  attributes: string[];          // 属性列表（1-2个）
  stats: {
    hp: number;                  // 生命种族值
    atk: number;                 // 物攻种族值
    sp_atk: number;              // 特攻种族值
    def: number;                 // 物防种族值
    sp_def: number;              // 特防种族值
    spd: number;                 // 速度种族值
    total: number;               // 种族值总和
  };
  ability: {
    name: string;                // 特性名称
    description: string;         // 特性描述
  };
  type_matchup: TypeMatchup;     // 属性克制关系
  skills: SkillBasic[];          // 可学技能列表
}

interface SkillBasic {
  name: string;                  // 技能名称
  attribute: string;             // 技能属性
  category: string;              // 技能分类
  cost: number;                  // 能量消耗
  power: number;                 // 威力
  description: string;           // 效果描述
}
```

### 4.4 战斗精灵结构
```typescript
interface Pokemon {
  name: string;                  // 名称
  pokemon_type: Type;            // 主属性
  secondary_type: Type | null;   // 副属性
  hp: number;                    // 生命值（计算后）
  attack: number;                // 物攻（计算后）
  defense: number;               // 物防（计算后）
  sp_attack: number;             // 特攻（计算后）
  sp_defense: number;            // 特防（计算后）
  speed: number;                 // 速度（计算后）
  ability: string;               // 特性

  // 战斗状态
  current_hp: number;            // 当前生命值
  energy: number;                // 当前能量
  status: StatusType;            // 状态

  // 能力修正
  atk_boost: number;             // 物攻提升
  def_boost: number;             // 物防提升
  spatk_boost: number;           // 特攻提升
  spdef_boost: number;           // 特防提升
  speed_boost: number;           // 速度提升

  atk_reduce: number;            // 物攻降低
  def_reduce: number;            // 物防降低
  spatk_reduce: number;          // 特攻降低
  spdef_reduce: number;          // 特防降低
  speed_reduce: number;          // 速度降低

  // 状态层数
  burn_stacks: number;           // 灼烧层数
  poison_stacks: number;         // 中毒层数
  freeze_stacks: number;         // 冻结层数

  // 其他
  parasited_by: string | null;   // 寄生状态
  power_bonus: number;           // 威力加成
  skills: Skill[];               // 技能列表
}
```

### 4.5 技能完整结构
```typescript
interface Skill {
  name: string;                  // 技能名称
  skill_type: Type;              // 属性
  category: SkillCategory;       // 分类
  power: number;                 // 威力
  energy_cost: number;           // 能量消耗
  hit_count: number;             // 连击数

  // 治疗效果
  life_drain: number;            // 吸血百分比 (0-1)
  self_heal_hp: number;          // 回复生命百分比 (0-1)
  self_heal_energy: number;      // 回复能量值

  // 能量操作
  steal_energy: number;          // 偷取敌方能量
  enemy_lose_energy: number;     // 敌方失去能量
  enemy_energy_cost_up: number;  // 敌方能耗增加

  // 优先级
  priority_mod: number;          // 先手修正
  force_switch: boolean;         // 脱离
  agility: boolean;              // 迅捷
  charge: boolean;               // 蓄力

  // 自身能力修正
  self_atk: number;              // 物攻变化
  self_def: number;              // 物防变化
  self_spatk: number;            // 特攻变化
  self_spdef: number;            // 特防变化
  self_speed: number;            // 速度变化
  self_all_atk: number;          // 双攻变化
  self_all_def: number;          // 双防变化

  // 敌方能力修正
  enemy_atk: number;             // 敌方物攻变化
  enemy_def: number;             // 敌方物防变化
  enemy_spatk: number;           // 敌方特攻变化
  enemy_spdef: number;           // 敌方特防变化
  enemy_speed: number;           // 敌方速度变化
  enemy_all_atk: number;         // 敌方双攻变化
  enemy_all_def: number;         // 敌方双防变化

  // 状态效果
  poison_stacks: number;         // 中毒层数
  burn_stacks: number;           // 灼烧层数
  freeze_stacks: number;         // 冻结层数
  damage_reduction: number;      // 减伤百分比 (0-1)

  // 反击效果
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
  counter_defense_energy_cost: number;
  counter_defense_power_mult: number;
  counter_status_power_mult: number;
  counter_status_enemy_lose_energy: number;
  counter_status_poison_stacks: number;
  counter_status_burn_stacks: number;
  counter_status_freeze_stacks: number;
  counter_skill_cooldown: number;
  counter_damage_reflect: number;
}
```

### 4.6 配置结构
```typescript
interface PokemonConfig {
  nature: string;                // 性格
  ivs: {
    hp: number;                  // 生命个体值 (0-31)
    atk: number;                 // 物攻个体值
    spatk: number;               // 特攻个体值
    def: number;                 // 物防个体值
    spdef: number;               // 特防个体值
    speed: number;               // 速度个体值
  };
  buffs: {
    atk_boost: number;           // 物攻提升 (0-1)
    def_boost: number;           // 物防提升 (0-1)
    spatk_boost: number;         // 特攻提升 (0-1)
    spdef_boost: number;         // 特防提升 (0-1)
    speed_boost: number;         // 速度提升 (0-1)
  };
  debuffs: {
    atk_reduce: number;          // 物攻降低 (0-1)
    def_reduce: number;          // 物防降低 (0-1)
    spatk_reduce: number;        // 特攻降低 (0-1)
    spdef_reduce: number;        // 特防降低 (0-1)
    speed_reduce: number;        // 速度降低 (0-1)
  };
  abilities: {
    centripetalForce: boolean;   // 向心力
    fierceDoom: boolean;         // 凶煞
    emptySight: boolean;         // 目空
    focusPower: boolean;         // 专注力
    magicBoost: boolean;         // 魔法增效
    absoluteOrder: boolean;      // 绝对秩序
  };
}
```

### 4.7 伤害结果
```typescript
interface DamageResult {
  damage: number;                          // 伤害值
  damage_percentage: number;               // 伤害百分比
  effectiveness: number;                   // 属性克制倍率
  stab: boolean;                           // 本系加成
  weather_mult: number;                    // 天气倍率
  ability_level: number;                   // 能力等级修正
  triggeredAbilities: string[];            // 触发的特性
  notTriggeredAbilities: string[];         // 未触发的特性
}
```

## 5. 核心模块设计

### 5.1 伤害计算模块 (`lib/damage-calc.ts`)

#### 5.1.1 伤害计算公式
```
单次伤害 = (攻击裸值 / 防御裸值) × 0.9 × 有效威力 × 能力等级 × 本系加成 × 克制关系 × 天气影响 × 减伤系数
最终伤害 = 单次伤害 × 连击次数
```

#### 5.1.2 计算步骤
1. **威力计算**：
   - 基础威力 = 技能威力 × 对抗倍率 + 威力加成 + 特殊技能修正

2. **属性修正**：
   - 获取攻击方和防守方的属性
   - 计算克制关系

3. **能力等级计算**：
   ```
   能力等级 = (1 + 攻击提升 + 敌方防御降低) / (1 + 攻击降低 + 敌方防御提升)
   ```

4. **特性效果**：
   - 检查并应用攻击方的增益特性
   - 检查并应用防守方的减伤特性

5. **最终计算**：
   - 应用所有修正系数
   - 计算总伤害和伤害百分比

#### 5.1.3 函数签名
```typescript
function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  skill: Skill,
  options: {
    counterPowerMult?: number;         // 对抗倍率
    damageReductions?: number[];       // 减伤系数列表
    weather?: Weather;                 // 天气
    extraPowerBonus?: number;          // 额外威力加成
    extraHitCount?: number;            // 额外连击数
    turn?: number;                     // 当前回合
    includeAbility?: boolean;          // 是否包含特性
    attackerAbilities?: PokemonConfig['abilities'];
    defenderAbilities?: PokemonConfig['abilities'];
    attackerOriginalAbility?: string;  // 攻击方原始特性
    defenderOriginalAbility?: string;  // 防守方原始特性
    specialSkillPower?: number;        // 特殊技能威力
  }
): DamageResult
```

### 5.2 精灵数据模块 (`lib/pokemon.ts`)

#### 5.2.1 性格系统
支持 25 种性格，每种性格影响两个属性：
- 最高种族值属性：+20%
- 最低种族值属性：-10%
- 其余属性：不变化

#### 5.2.2 属性计算公式
```typescript
// 生命值计算
HP = [1.7 × 种族值 + 个体值 × 6 × 0.85 + 70] × (1 + 性格修正) + 50

// 其他属性计算
属性值 = [1.1 × 种族值 + 个体值 × 6 × 0.55 + 10] × (1 + 性格修正) + 50
```

#### 5.2.3 主要函数
- `loadPokemonData(jsonContent: string)`: 加载精灵数据
- `getPokemonData(name: string)`: 获取指定精灵数据
- `searchPokemonData(keyword: string)`: 搜索精灵
- `computeBattleStats(pokemonData: PokemonData, config: PokemonConfig)`: 计算战斗属性

### 5.3 技能解析模块 (`lib/skill.ts`)

#### 5.3.1 CSV 格式
```
技能名,属性,类型,威力,耗能,效果描述,所属精灵,数据来源,备注
```

#### 5.3.2 效果解析
使用正则表达式解析技能效果描述，支持的效果包括：
- 连击数：`(\d+)连击`
- 吸血：`吸血(\d+)%`
- 减伤：`减伤(\d+)%`
- 回复：`回复(\d+)%生命`
- 能量操作：`回复(\d+)能量`、`偷取敌方?(\d+)能量`
- 先手：`先手\+(\d+)`、`先手-(\d+)`
- 能力修正：各种 `获得/获得-/敌方获得-` 开头的效果
- 状态效果：`(\d+)层中毒`、`(\d+)层灼烧`、`(\d+)层冻结`
- 特殊标记：`脱离`、`迅捷`、`蓄力`

#### 5.3.3 主要函数
- `parseCSV(csvContent: string)`: 解析 CSV 文件
- `getSkill(name: string, skillDb: Record<string, Skill>)`: 获取技能

### 5.4 属性克制模块 (`lib/type-chart.ts`)

#### 5.4.1 克制关系
- 单克制：2.0x
- 单抵抗：0.5x
- 无效：0.0x
- 双弱点：3.0x
- 双抵抗：0.33x

#### 5.4.2 主要函数
- `getTypeEffectiveness(attackType: Type, defenseType: Type)`: 获取克制倍率
- `normalizeType(s: string)`: 规范化属性名称

### 5.5 特性系统模块 (`lib/ability.ts`)

#### 5.5.1 已实现的特性
| 特性名 | 效果 | 条件 |
|--------|------|------|
| 向心力 | 前2个有伤技能威力 +30 | 1号位和2号位技能 |
| 凶煞 | 队伍存在恶系时，双攻 +50% | 队伍中存在恶系精灵 |
| 目空 | 非光系技能威力 +25% | 技能属性不是光系 |
| 专注力 | 入场首回合，物攻技能威力 +100% | 第1回合且技能为物攻 |
| 魔法增效 | 魔攻技能威力 +70% | 技能为魔攻 |
| 绝对秩序 | 受到非自身属性攻击时伤害 -50% | 攻击属性与防守方属性不同 |

#### 5.5.2 主要函数
- `getAbilityEffect(pokemon: Pokemon, skill: Skill, turn?: number)`: 获取特性效果
- `getAbilityForPokemon(abilityString: string)`: 获取精灵特性信息
- `applyAbilityToDamage(...)`: 应用特性到伤害计算

### 5.6 特殊技能配置模块 (`lib/skill-config.ts`)

#### 5.6.1 支持的配置类型
- `energy_to_power`: 能量转威力
- `hp_to_power`: 血量转威力
- `custom`: 自定义

#### 5.6.2 已实现的特殊技能

**魔能爆**：
- 类型：`energy_to_power`
- 配置：用户输入 0-10 的能量消耗
- 威力映射：
  | 能量 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
  |------|---|---|---|---|---|---|---|---|---|---|---|
  | 威力 | 45 | 70 | 90 | 110 | 135 | 155 | 165 | 180 | 190 | 200 | 210 |

**彗星**：
- 类型：`hp_to_power`
- 配置：用户输入 0-100 的当前血量百分比
- 计算公式：
  ```
  实际威力 = 240 - floor((100 - 当前血量) / 5) × 10
  ```

#### 5.6.3 主要函数
- `getSkillSpecialConfig(skillName: string)`: 获取特殊技能配置
- `hasSpecialConfig(skillName: string)`: 检查是否有特殊配置
- `getPowerFromInput(skillName: string, inputValue: number)`: 根据输入计算威力

## 6. UI 设计

### 6.1 页面布局
采用三栏布局：
- **左侧**：攻击方配置
- **中间**：技能选择和伤害结果
- **右侧**：防守方配置

### 6.2 配置卡片
每个配置卡片包含：
- 精灵雷达图
- 精灵选择器（带搜索）
- 性格选择
- 个体值配置（支持开关）
- 能力修正（百分比输入）
- 战斗特性（复选框）

### 6.3 组件设计
- **ConfigCard**：精灵配置卡片组件
- **ResultCard**：伤害结果展示组件
- **RadarChart**：雷达图组件（显示精灵能力分布）

### 6.4 交互逻辑
- 数据加载时显示加载状态
- 加载失败时提供重试按钮
- 实时计算伤害（输入变化时自动更新）
- 技能选择时自动显示可学技能
- 特殊技能时显示额外输入框

## 7. 数据格式

### 7.1 精灵数据（JSON）
```json
{
  "no": 1,
  "name": "格里芬",
  "form": null,
  "url": "https://example.com/sprite1.png",
  "has_shiny": true,
  "attributes": ["普通系", "光系"],
  "stats": {
    "hp": 100,
    "atk": 80,
    "sp_atk": 90,
    "def": 70,
    "sp_def": 75,
    "spd": 85,
    "total": 500
  },
  "ability": {
    "name": "向心力:前两个有伤技能威力+30",
    "description": "前两个有伤技能威力+30"
  },
  "type_matchup": {
    "strong_against": ["火系"],
    "weak_to": ["水系"],
    "resists": ["草系"],
    "resisted_by": ["格系"]
  },
  "skills": [
    {
      "name": "普通攻击",
      "attribute": "普通系",
      "category": "物攻",
      "cost": 2,
      "power": 40,
      "description": "造成物伤"
    }
  ]
}
```

### 7.2 技能数据（CSV）
```
技能名,属性,类型,威力,耗能,效果描述,所属精灵,数据来源,备注
魔能爆,幻系,魔攻,0,0,造成魔伤，消耗所有能量，威力随能量增加，用户提供,
彗星,普通系,魔攻,240,0,造成魔伤，每失去5%生命，本次技能威力-10，使用后消耗全部生命,用户提供,
```

## 8. 性能优化

### 8.1 数据加载
- 使用 `fetchWithRetry` 实现重试机制（最多3次）
- 数据加载失败时提供手动重试按钮
- 使用懒加载减少初始加载时间

### 8.2 计算优化
- 数据缓存：精灵和技能数据只在页面加载时获取一次
- 实时计算：使用 React 的 `useEffect` 实现自动更新
- Web Worker 备用（`lib/worker.ts`）：可用于后台计算

### 8.3 渲染优化
- 使用函数组件和 Hooks
- 避免不必要的重新渲染
- 条件渲染特殊输入框

## 9. 待实现功能

### 9.1 高级特性
- 完整的特性系统（当前已实现6个，计划有更多）
- 特性与技能的联动
- 连击系统与特性的联动
- 天气系统（目前只支持雨天水系加成）

### 9.2 性能优化
- 数据分块加载
- 虚拟滚动优化长列表
- 更完善的 Web Worker 集成

### 9.3 UI 增强
- 属性克制关系颜色标注
- 配置保存功能（localStorage）
- 1对多配置计算
- 更丰富的可视化效果

## 10. 扩展指南

### 10.1 添加新特性
1. 在 `lib/ability.ts` 的 `getAbilityEffect` 函数中添加新的 case
2. 在 `lib/types/index.ts` 的 `PokemonConfig['abilities']` 中添加新的布尔字段
3. 在 UI 中添加对应的复选框
4. 更新伤害计算逻辑以支持新特性

### 10.2 添加特殊技能
1. 在 `lib/skill-config.ts` 的 `SKILL_SPECIAL_CONFIGS` 中添加配置
2. 根据需要扩展 `SkillSpecialConfig` 类型
3. 在 `getPowerFromInput` 函数中添加计算逻辑
4. UI 会自动检测并显示输入框

### 10.3 添加新属性
1. 在 `lib/types/index.ts` 的 `Type` 枚举中添加新属性
2. 在 `lib/type-chart.ts` 的 `TYPE_CHART` 中添加克制关系
3. 在 `TYPE_NAME_MAP` 中添加中英文映射
4. 更新数据文件

### 10.4 重构建议
1. **状态管理**：考虑使用 Zustand 或 Redux 管理复杂状态
2. **组件拆分**：将 `page.tsx` 拆分为更小的组件
3. **类型优化**：使用更严格的 TypeScript 类型
4. **测试覆盖**：添加单元测试和集成测试
5. **错误处理**：改进错误处理和用户体验
6. **国际化**：支持多语言
7. **主题切换**：支持深色/浅色主题

## 11. 注意事项

### 11.1 数据来源
- 本项目数据来源于 [rocom-data](https://github.com/AofeiLi-code/rocom-data)
- 仅供学习交流使用
- 请勿用于商业用途

### 11.2 免责声明
- 叠甲：AI vibecoding，自用程序
- 目前版本可能存在大量逻辑错误
- 欢迎在 issue 中反馈 bug

### 11.3 部署信息
- GitHub Pages 测试地址：https://1earnback.github.io/rocom-damage-calc/
- 使用 Next.js 的静态导出功能

## 12. 技术债务

### 12.1 已知问题
- Web Worker 未完全集成
- 部分特性效果可能不准确
- 技能解析使用正则表达式，可能不够健壮
- 缺少错误边界

### 12.2 改进建议
- 添加完整的错误处理
- 改进数据验证
- 添加性能监控
- 优化移动端体验
- 添加离线支持

## 13. 开发指南

### 13.1 开发环境
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

### 13.2 代码规范
- 使用 TypeScript 严格模式
- 遵循 React Hooks 最佳实践
- 使用函数组件而非类组件
- 保持代码简洁，避免不必要的注释

### 13.3 Git 工作流
- 使用 feature 分支开发新功能
- 提交前运行 `pnpm lint` 检查代码
- 使用清晰的 commit message

## 14. 参考资料

### 14.1 相关项目
- [Pokemon Showdown Damage Calculator](https://calc.pokemonshowdown.com/)
- [rocom-data](https://github.com/AofeiLi-code/rocom-data)

### 14.2 技术文档
- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)

## 15. 版本历史

- **v0.1.0**：初始版本
  - 基础伤害计算
  - 精灵数据系统
  - 技能数据系统
  - 部分特性支持
  - 特殊技能支持（魔能爆、彗星）

---

**文档版本**：1.0
**最后更新**：2026-04-20
**作者**：AI Generated
**项目状态**：已废弃，待重写
