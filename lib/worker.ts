let pokemonData: any[] | null = null;
let skillDb: Record<string, any> | null = null;

self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'LOAD_POKEMON_DATA':
      loadPokemonData(data);
      break;
    case 'LOAD_SKILL_DATA':
      loadSkillData(data);
      break;
    case 'SEARCH_POKEMON':
      searchPokemon(data);
      break;
    case 'CALCULATE_DAMAGE':
      calculateDamage(data);
      break;
    case 'GET_DATA_STATUS':
      getDataStatus();
      break;
    default:
      console.error('Unknown message type:', type);
  }
};

function loadPokemonData(jsonContent: string) {
  try {
    const startTime = performance.now();
    pokemonData = JSON.parse(jsonContent);
    const endTime = performance.now();

    self.postMessage({
      type: 'POKEMON_DATA_LOADED',
      data: {
        success: true,
        count: pokemonData?.length || 0,
        loadTime: endTime - startTime,
      },
    });
  } catch (error) {
    self.postMessage({
      type: 'POKEMON_DATA_LOADED',
      data: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

function loadSkillData(csvContent: string) {
  try {
    const startTime = performance.now();
    const lines = csvContent.trim().split('\n');
    const skills: Record<string, any> = {};

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].trim();
      if (!row) continue;

      const columns = row.split(',');
      const name = columns[0].trim();

      if (name) {
        skills[name] = {
          name,
          attribute: columns[1].trim(),
          category: columns[2].trim(),
          power: parseInt(columns[3]) || 0,
          cost: parseInt(columns[4]) || 0,
          description: columns[5] || '',
        };
      }
    }

    skillDb = skills;
    const endTime = performance.now();

    self.postMessage({
      type: 'SKILL_DATA_LOADED',
      data: {
        success: true,
        count: Object.keys(skills).length,
        loadTime: endTime - startTime,
      },
    });
  } catch (error) {
    self.postMessage({
      type: 'SKILL_DATA_LOADED',
      data: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

function searchPokemon(keyword: string) {
  if (!pokemonData) {
    self.postMessage({
      type: 'POKEMON_SEARCH_RESULT',
      data: {
        results: [],
        error: 'Pokemon data not loaded',
      },
    });
    return;
  }

  const results = pokemonData.filter((p: any) =>
    p.name.includes(keyword) || keyword.includes(p.name)
  ).slice(0, 20);

  self.postMessage({
    type: 'POKEMON_SEARCH_RESULT',
    data: {
      results,
      count: results.length,
    },
  });
}

function calculateDamage(data: {
  attacker: any;
  defender: any;
  skill: any;
}) {
  try {
    const { attacker, defender, skill } = data;

    const atk_base = skill.category === '物攻' ? attacker.attack : attacker.sp_attack;
    const def_base = skill.category === '物攻' ? defender.defense : defender.sp_defense;

    const effective_def = Math.max(1, def_base);
    const effective_power = Math.max(0, skill.power);

    const base = (atk_base / effective_def) * 0.9 * effective_power;

    const attackMod = skill.category === '物攻' ? attacker.atk : attacker.spatk;
    const defenseMod = skill.category === '物攻' ? defender.def : defender.spdef;

    const ability_level = (1 + attackMod + defenseMod) / (1 + 0 + 0);

    const stab = skill.attribute === attacker.pokemon_type || skill.attribute === attacker.secondary_type;

    const effectiveness = 1.0;

    const single_hit = base * ability_level * (stab ? 1.25 : 1.0) * effectiveness;
    const total = single_hit * (skill.hit_count || 1);

    const damage = Math.max(1, Math.floor(total));
    const damage_percentage = (damage / defender.hp) * 100;

    self.postMessage({
      type: 'DAMAGE_CALCULATED',
      data: {
        success: true,
        damage,
        damagePercentage: Math.min(100, damage_percentage),
        effectiveness,
        stab,
        abilityLevel: ability_level,
      },
    });
  } catch (error) {
    self.postMessage({
      type: 'DAMAGE_CALCULATED',
      data: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

function getDataStatus() {
  self.postMessage({
    type: 'DATA_STATUS',
    data: {
      pokemonLoaded: pokemonData !== null,
      pokemonCount: pokemonData ? pokemonData.length : 0,
      skillsLoaded: skillDb !== null,
      skillCount: skillDb ? Object.keys(skillDb).length : 0,
    },
  });
}
