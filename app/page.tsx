'use client';

import { useState, useEffect } from 'react';
import { Pokemon, Skill, DamageResult, PokemonConfig, Nature } from '@/lib/types/index';
import {
  loadPokemonData,
  getAllPokemonNames,
  searchPokemonData,
  NATURE_LIST,
  computeBattleStats,
  getPokemonData,
} from '@/lib/pokemon';
import { parseCSV, getSkill } from '@/lib/skill';
import { calculateDamage, createDefaultPokemon, createDefaultSkill } from '@/lib/damage-calc';
import RadarChart from '@/components/RadarChart';

export default function Home() {
  const [pokemonNames, setPokemonNames] = useState<string[]>([]);
  const [skillDb, setSkillDb] = useState<Record<string, Skill>>({});

  const [attackerName, setAttackerName] = useState('');
  const [defenderName, setDefenderName] = useState('');
  const [skillName, setSkillName] = useState('');

  const [attackerIvEnabled, setAttackerIvEnabled] = useState<{ [key: string]: boolean }>({
    hp: true, atk: false, spatk: false, def: false, spdef: false, speed: false,
  });
  const [defenderIvEnabled, setDefenderIvEnabled] = useState<{ [key: string]: boolean }>({
    hp: true, atk: false, spatk: false, def: false, spdef: false, speed: false,
  });

  const [attackerConfig, setAttackerConfig] = useState<PokemonConfig>({
    nature: '认真',
    ivs: { hp: 10, atk: 0, spatk: 0, def: 0, spdef: 0, speed: 0 },
    buffs: { atk_boost: 0, def_boost: 0, spatk_boost: 0, spdef_boost: 0, speed_boost: 0 },
    debuffs: { atk_reduce: 0, def_reduce: 0, spatk_reduce: 0, spdef_reduce: 0, speed_reduce: 0 },
    abilities: { centripetalForce: true, fierceDoom: true, emptySight: true, focusPower: true, magicBoost: true, absoluteOrder: true },
  });

  const [defenderConfig, setDefenderConfig] = useState<PokemonConfig>({
    nature: '认真',
    ivs: { hp: 10, atk: 0, spatk: 0, def: 0, spdef: 0, speed: 0 },
    buffs: { atk_boost: 0, def_boost: 0, spatk_boost: 0, spdef_boost: 0, speed_boost: 0 },
    debuffs: { atk_reduce: 0, def_reduce: 0, spatk_reduce: 0, spdef_reduce: 0, speed_reduce: 0 },
    abilities: { centripetalForce: true, fierceDoom: true, emptySight: true, focusPower: true, magicBoost: true, absoluteOrder: true },
  });

  const [damageResult, setDamageResult] = useState<DamageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [includeAbility, setIncludeAbility] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const pokemonResponse = await fetch('/data/sprites.json');
      const pokemonContent = await pokemonResponse.text();
      loadPokemonData(pokemonContent);

      const names = getAllPokemonNames();
      setPokemonNames(names);

      const skillResponse = await fetch('/data/skills_all.csv');
      const skillContent = await skillResponse.text();
      const skills = parseCSV(skillContent);
      setSkillDb(skills);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  const handleIvToggle = (key: keyof PokemonConfig['ivs'], isAttacker: boolean) => {
    const enabled = isAttacker ? attackerIvEnabled : defenderIvEnabled;
    const setEnabled = isAttacker ? setAttackerIvEnabled : setDefenderIvEnabled;
    const config = isAttacker ? attackerConfig : defenderConfig;
    const setConfig = isAttacker ? setAttackerConfig : setDefenderConfig;

    const newEnabled = { ...enabled, [key]: !enabled[key] };
    setEnabled(newEnabled);

    const newIvs = { ...config.ivs, [key]: !enabled[key] ? 10 : 0 };
    const newConfig = { ...config, ivs: newIvs };
    setConfig(newConfig);
  };

  const handleIvChange = (key: keyof PokemonConfig['ivs'], value: number, isAttacker: boolean) => {
    const config = isAttacker ? attackerConfig : defenderConfig;
    const newIvs = { ...config.ivs, [key]: value };
    const newConfig = { ...config, ivs: newIvs };

    if (isAttacker) {
      setAttackerConfig(newConfig);
    } else {
      setDefenderConfig(newConfig);
    }
  };

  const handleCombinedBuffChange = (key: keyof PokemonConfig['buffs'], value: number, isAttacker: boolean) => {
    const config = isAttacker ? attackerConfig : defenderConfig;
    const percentage = value / 100;
    
    let newBuffs, newDebuffs;
    if (value >= 0) {
      newBuffs = { ...config.buffs, [key]: percentage };
      newDebuffs = { ...config.debuffs, [key]: 0 };
    } else {
      newBuffs = { ...config.buffs, [key]: 0 };
      newDebuffs = { ...config.debuffs, [key]: -percentage };
    }

    const newConfig = { ...config, buffs: newBuffs, debuffs: newDebuffs };
    if (isAttacker) {
      setAttackerConfig(newConfig);
    } else {
      setDefenderConfig(newConfig);
    }
  };

  const handleNatureChange = (value: string, isAttacker: boolean) => {
    if (isAttacker) {
      setAttackerConfig({ ...attackerConfig, nature: value });
    } else {
      setDefenderConfig({ ...defenderConfig, nature: value });
    }
  };

  const getAvailableSkills = (pokemonName: string): string[] => {
    if (!pokemonName) return [];
    const pokemonData = getPokemonData(pokemonName);
    if (!pokemonData) return [];
    const damagingSkills = pokemonData.skills.filter(skill => skill.category === '物攻' || skill.category === '魔攻');
    return [...new Set(damagingSkills.map(skill => skill.name))];
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-white text-center mb-8">
            洛克王国世界-对战伤害计算器
          </h1>
          <div className="text-white text-center">加载数据中...</div>
        </div>
      </main>
    );
  }

  const availableSkills = getAvailableSkills(attackerName);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          洛克王国世界-对战伤害计算器
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <ConfigCard
            title="攻击方配置"
            pokemonName={attackerName}
            setPokemonName={setAttackerName}
            pokemonNames={pokemonNames}
            config={attackerConfig}
            isAttacker={true}
            ivEnabled={attackerIvEnabled}
            setIvEnabled={setAttackerIvEnabled}
            handleIvChange={(k, v) => handleIvChange(k, v, true)}
            handleIvToggle={(k) => handleIvToggle(k, true)}
            handleCombinedBuffChange={(k, v) => handleCombinedBuffChange(k, v, true)}
            handleNatureChange={(v) => handleNatureChange(v, true)}
            setConfig={setAttackerConfig}
            originalAbility={attackerName ? searchPokemonData(attackerName)[0]?.ability.name : null}
          />

          <div className="glass-card rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">技能选择</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">选择技能</label>
                <input
                  type="text"
                  list="skills"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  className="w-full p-3 text-gray-800 rounded-lg"
                  placeholder="搜索技能..."
                />
                <datalist id="skills">
                  {availableSkills.length > 0
                    ? availableSkills.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))
                    : Object.keys(skillDb).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                </datalist>
                {availableSkills.length > 0 && (
                  <div className="text-white text-xs mt-1">
                    显示 {availableSkills.length} 个可学伤害技能
                  </div>
                )}
              </div>

              {damageResult && (
                <ResultCard result={damageResult} />
              )}
            </div>
          </div>

          <ConfigCard
            title="防守方配置"
            pokemonName={defenderName}
            setPokemonName={setDefenderName}
            pokemonNames={pokemonNames}
            config={defenderConfig}
            isAttacker={false}
            ivEnabled={defenderIvEnabled}
            setIvEnabled={setDefenderIvEnabled}
            handleIvChange={(k, v) => handleIvChange(k, v, false)}
            handleIvToggle={(k) => handleIvToggle(k, false)}
            handleCombinedBuffChange={(k, v) => handleCombinedBuffChange(k, v, false)}
            handleNatureChange={(v) => handleNatureChange(v, false)}
            setConfig={setDefenderConfig}
            originalAbility={defenderName ? searchPokemonData(defenderName)[0]?.ability.name : null}
          />
        </div>
      </div>
    </main>
  );
}

function ConfigCard({
  title,
  pokemonName,
  setPokemonName,
  pokemonNames,
  config,
  isAttacker,
  ivEnabled,
  setIvEnabled,
  handleIvChange,
  handleIvToggle,
  handleCombinedBuffChange,
  handleNatureChange,
  setConfig,
  originalAbility,
}: {
  title: string;
  pokemonName: string;
  setPokemonName: (name: string) => void;
  pokemonNames: string[];
  config: PokemonConfig;
  isAttacker: boolean;
  ivEnabled: { [key: string]: boolean };
  setIvEnabled: (value: { [key: string]: boolean }) => void;
  handleIvChange: (key: keyof PokemonConfig['ivs'], value: number) => void;
  handleIvToggle: (key: keyof PokemonConfig['ivs']) => void;
  handleCombinedBuffChange: (key: keyof PokemonConfig['buffs'], value: number) => void;
  handleNatureChange: (value: string) => void;
  setConfig: (config: PokemonConfig) => void;
  originalAbility: string | null;
}) {
  const [pokemonStats, setPokemonStats] = useState({
    hp: 0,
    atk: 0,
    def: 0,
    spatk: 0,
    spdef: 0,
    speed: 0,
  });

  useEffect(() => {
    if (pokemonName) {
      const pokemonData = getPokemonData(pokemonName);
      if (pokemonData) {
        const pokemon = computeBattleStats(pokemonData, config);
        setPokemonStats({
          hp: pokemon.hp,
          atk: pokemon.attack,
          def: pokemon.defense,
          spatk: pokemon.sp_attack,
          spdef: pokemon.sp_defense,
          speed: pokemon.speed,
        });
      }
    }
  }, [pokemonName, config]);



  const getBuffValue = (key: keyof PokemonConfig['buffs']): number => {
    const buff = config.buffs[key];
    const debuff = config.debuffs[key as keyof PokemonConfig['debuffs']];
    if (buff > 0) return Math.round(buff * 100);
    if (debuff > 0) return -Math.round(debuff * 100);
    return 0;
  };

  const statNameMap: Record<string, string> = {
    hp: '生命',
    atk: '物攻',
    spatk: '特攻',
    def: '物防',
    spdef: '特防',
    speed: '速度',
  };

  const abilityList = [
    { key: 'centripetalForce' as const, name: '向心力', desc: '前两个有伤技能威力 +30' },
    { key: 'fierceDoom' as const, name: '凶煞', desc: '队伍存在恶系时，双攻 +50%' },
    { key: 'emptySight' as const, name: '目空', desc: '非光系技能威力 +25%' },
    { key: 'focusPower' as const, name: '专注力', desc: '入场首回合，物攻技能威力 +100%' },
    { key: 'magicBoost' as const, name: '魔法增效', desc: '魔攻技能威力 +70%' },
    { key: 'absoluteOrder' as const, name: '绝对秩序', desc: '受到非自身属性攻击时伤害 -50%' },
  ];

  const availableAbilities = abilityList.filter(ability => ability.name === originalAbility);

  const handleAbilityToggle = (key: keyof PokemonConfig['abilities']) => {
    const newAbilities = { ...config.abilities, [key]: !config.abilities[key] };
    setConfig({ ...config, abilities: newAbilities });
  };

  return (
    <div className="glass-card rounded-xl p-4 max-h-[80vh] overflow-y-auto">
      <h2 className="text-lg font-bold text-white mb-3 sticky top-0 bg-transparent py-1">{title}</h2>

      <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-start mb-3">
        <div className="min-w-[160px]">
          {pokemonName ? (
            <RadarChart
              stats={pokemonStats}
              size={160}
              className=""
            />
          ) : (
            <div className="w-[160px] h-[160px] bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-white/30 text-xs">精灵图</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-white text-xs mb-1">选择精灵</label>
            <input
              type="text"
              list={`pokemon-list-${isAttacker ? 'attacker' : 'defender'}`}
              value={pokemonName}
              onChange={(e) => setPokemonName(e.target.value)}
              className="w-full p-1.5 text-sm text-gray-800 rounded-lg"
              placeholder="搜索精灵..."
            />
            <datalist id={`pokemon-list-${isAttacker ? 'attacker' : 'defender'}`}>
              {pokemonNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-white text-xs mb-1">性格</label>
            <select
              value={config.nature}
              onChange={(e) => handleNatureChange(e.target.value)}
              className="w-full p-1.5 text-sm text-gray-800 rounded-lg"
            >
              {NATURE_LIST.map((nature) => (
                <option key={nature.name} value={nature.name}>
                  {nature.display}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-[80px]"></div>
      </div>

      <div>
        <h3 className="text-white text-sm font-bold mb-2">个体值 (0-10)</h3>
        <div className="grid grid-cols-3 gap-x-3 gap-y-1">
          {Object.entries(config.ivs).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={ivEnabled[key] || false}
                onChange={() => handleIvToggle(key as keyof PokemonConfig['ivs'])}
                className="w-3 h-3 min-w-[12px] rounded"
              />
              <label className="text-white text-xs whitespace-nowrap">{statNameMap[key] || key}</label>
              <input
                type="number"
                min="0"
                max="31"
                value={value}
                disabled={!ivEnabled[key]}
                onChange={(e) => handleIvChange(key as keyof PokemonConfig['ivs'], parseInt(e.target.value) || 0)}
                className={`w-12 p-1 text-xs text-gray-800 rounded ${ivEnabled[key] ? '' : 'opacity-50'}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-white text-sm font-bold mb-2">能力修正 (%)</h3>
        <div className="grid grid-cols-3 gap-x-3 gap-y-1">
          {Object.entries(config.buffs).map(([key]) => {
            const baseKey = key.replace('_boost', '');
            const buffValue = getBuffValue(key as keyof PokemonConfig['buffs']);
            return (
              <div key={key}>
                <label className="text-white text-xs">{statNameMap[baseKey]}</label>
                <input
                  type="number"
                  min="-100"
                  max="100"
                  value={buffValue}
                  onChange={(e) => handleCombinedBuffChange(key as keyof PokemonConfig['buffs'], parseFloat(e.target.value) || 0)}
                  className="w-full p-1 text-xs text-gray-800 rounded"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-white text-sm font-bold mb-2">战斗特性</h3>
        {availableAbilities.length > 0 ? (
          <div className="space-y-1">
            {availableAbilities.map((ability) => (
              <div key={ability.key} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id={`ability-${ability.key}-${isAttacker ? 'attacker' : 'defender'}`}
                  checked={config.abilities[ability.key]}
                  onChange={() => handleAbilityToggle(ability.key)}
                  className="w-3 h-3 min-w-[12px] rounded mt-0.5"
                />
                <div className="flex flex-col">
                  <label
                    htmlFor={`ability-${ability.key}-${isAttacker ? 'attacker' : 'defender'}`}
                    className="text-white text-xs font-medium cursor-pointer"
                  >
                    {ability.name}
                  </label>
                  <span className="text-white/60 text-xs">{ability.desc}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-white/60 text-xs">无可用战斗特性</div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: DamageResult }) {
  return (
    <div className="bg-white/20 rounded-lg p-4 space-y-2">
      <h3 className="text-lg font-bold text-white">伤害结果</h3>
      <div className="text-2xl font-bold text-yellow-300">{result.damage} 点</div>
      <div className="text-white">
        伤害占比: <span className="text-yellow-300">{result.damage_percentage.toFixed(1)}%</span>
      </div>
      <div className="text-white text-sm space-y-1">
        <div>属性克制: {result.effectiveness}x</div>
        <div>本系加成: {result.stab ? '是' : '否'}</div>
        <div>能力等级: {result.ability_level.toFixed(2)}x</div>
        <div>天气加成: {result.weather_mult}x</div>
      </div>

      {(result.triggeredAbilities.length > 0 || result.notTriggeredAbilities.length > 0) && (
        <div className="mt-3 pt-3 border-t border-white/20">
          <h4 className="text-white text-sm font-bold mb-2">战斗特性</h4>
          {result.triggeredAbilities.length > 0 && (
            <div className="space-y-1">
              <div className="text-green-400 text-xs">✓ 触发:</div>
              {result.triggeredAbilities.map((ability) => (
                <div key={ability} className="text-green-300 text-xs ml-2">{ability}</div>
              ))}
            </div>
          )}
          {result.notTriggeredAbilities.length > 0 && (
            <div className="space-y-1 mt-2">
              <div className="text-yellow-400 text-xs">✗ 未触发:</div>
              {result.notTriggeredAbilities.map((ability) => (
                <div key={ability} className="text-yellow-300 text-xs ml-2">{ability}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
