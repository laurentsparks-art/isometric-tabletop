const scoresOf = (overrides = {}) => ({
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...overrides,
});

const HIT_DIE = {
  barbarian: "d12", fighter: "d10", paladin: "d10", ranger: "d10",
  bard: "d8", cleric: "d8", druid: "d8", monk: "d8", rogue: "d8", warlock: "d8",
  artificer: "d8", sorcerer: "d6", wizard: "d6",
};

// A sheet payload with every required field, so a test states only what its
// rule is about. Nothing here is derived: a test that needs a real AC or a
// real slot table asks the engine for one.
export function heroInput(overrides = {}) {
  const level = overrides.level ?? 1;
  const classId = overrides.class ?? "fighter";
  const rest = Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== "level"));
  return {
    name: "Test Hero",
    race: "human",
    class: classId,
    subclass: "",
    background: "",
    alignment: "",
    gender: "",
    appearance: "",
    abilities: scoresOf(overrides.abilities),
    maxHp: 30,
    ac: 12,
    acOverride: true,
    speed: 30,
    hitDice: { die: HIT_DIE[classId] ?? "d8", total: level, spent: 0 },
    classes: [],
    hitDicePools: null,
    proficiencies: {
      saves: [], skills: [], expertise: [], languages: ["Common"],
      tools: [], armor: [], weapons: [],
    },
    equipment: [],
    gold: 0,
    copper: 0,
    feats: [],
    features: [],
    asiChoices: [],
    spellcasting: null,
    portrait: null,
    notes: "",
    backstory: "",
    ...rest,
    abilities: scoresOf(overrides.abilities),
  };
}

