// Materials (physical behaviour) and voxel types (material + colour).
// A voxel is one byte: 0 = air, 1..127 = original voxel types, type|128 = the same type as loose rubble.

export const MAT = { AIR: 0, BEDROCK: 1, EARTH: 2, GLASS: 3, LEAF: 4, WOOD: 5, BRICK: 6, CONCRETE: 7, STEEL: 8, SHEET: 9, EXPLOSIVE: 10, FABRIC: 11 };

// strength: resistance to damage. density: mass per voxel. power: what one destroyed voxel is worth.
// sound: audio family. debris: share of destroyed voxels that fly off as loose cubes.
export const MATS = [
  { strength: 0, density: 0, power: 0, sound: 'none', debris: 0 },
  { strength: Infinity, density: 9, power: 0, sound: 'stone', debris: 0 },
  { strength: 4, density: 1.5, power: 0.15, sound: 'earth', debris: 0.5 },
  { strength: 0.8, density: 0.8, power: 1, sound: 'glass', debris: 1 },
  { strength: 0.8, density: 0.2, power: 0.5, sound: 'leaf', debris: 0.6 },
  { strength: 3, density: 0.7, power: 1, sound: 'wood', debris: 1 },
  { strength: 6, density: 1.8, power: 1.5, sound: 'stone', debris: 1 },
  { strength: 10, density: 2.4, power: 2, sound: 'stone', debris: 1 },
  { strength: 16, density: 5, power: 3, sound: 'metal', debris: 1 },
  { strength: 4, density: 1.2, power: 1.5, sound: 'metal', debris: 1 },
  { strength: 2, density: 1, power: 3, sound: 'metal', debris: 0.3 },
  { strength: 1.5, density: 0.3, power: 0.8, sound: 'leaf', debris: 0.8 },
];

export const F_TERRAIN = 1; // ground: anchors structures, is not counted as a building voxel
export const F_RUBBLE = 2;
export const RUBBLE = 128;

export const TYPE_MAT = new Uint8Array(256);
export const TYPE_RGBA = new Uint8Array(1024); // r, g, b, emissive
export const TYPE_FLAGS = new Uint8Array(256);

let nextType = 1;
function def(mat, hex, flags = 0, emissive = 0) {
  const id = nextType++;
  if (id > 124) throw new Error('too many voxel types'); // 125..127 would collide with SOOT, CHAR and EMBER as rubble twins
  TYPE_MAT[id] = mat;
  TYPE_FLAGS[id] = flags;
  TYPE_RGBA.set([(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, emissive], id * 4);
  return id;
}

export const T = {
  BEDROCK: def(MAT.BEDROCK, 0x4a4540, F_TERRAIN),
  DIRT: def(MAT.EARTH, 0x8a5f3c, F_TERRAIN),
  GRASS: def(MAT.EARTH, 0x6cc04a, F_TERRAIN),
  GRASS2: def(MAT.EARTH, 0x5fb142, F_TERRAIN),
  ROAD: def(MAT.EARTH, 0x4c4f58, F_TERRAIN),
  ROADLINE: def(MAT.EARTH, 0xf2f2e6, F_TERRAIN),
  SIDEWALK: def(MAT.EARTH, 0xb9b6ad, F_TERRAIN),
  SAND: def(MAT.EARTH, 0xe6d59a, F_TERRAIN),
  CARPET: def(MAT.EARTH, 0x4f8fd0, F_TERRAIN),
  CARPET2: def(MAT.EARTH, 0x64a0dc, F_TERRAIN),
  FLOOR: def(MAT.EARTH, 0xc99a62, F_TERRAIN),
  FLOOR2: def(MAT.EARTH, 0xbd8d57, F_TERRAIN),
  PAVE: def(MAT.EARTH, 0xc9c5ba, F_TERRAIN),
  PAVE2: def(MAT.EARTH, 0xb3aea2, F_TERRAIN),
  PAVE_RED: def(MAT.EARTH, 0xb9715e, F_TERRAIN),
  SCORCH: def(MAT.EARTH, 0x2b2622, F_TERRAIN), // ground that fire has passed over

  BRICK_RED: def(MAT.BRICK, 0xb5503c),
  BRICK_DARK: def(MAT.BRICK, 0x8f3f31),
  BRICK_YELLOW: def(MAT.BRICK, 0xd9b36a),
  PLASTER_WHITE: def(MAT.BRICK, 0xf0ebe0),
  PLASTER_YELLOW: def(MAT.BRICK, 0xf2d68a),
  PLASTER_BLUE: def(MAT.BRICK, 0xa9c9e8),
  PLASTER_PINK: def(MAT.BRICK, 0xeab0a8),
  PLASTER_GREEN: def(MAT.BRICK, 0xb6d7a8),
  ROOF_RED: def(MAT.BRICK, 0xc0392b),
  ROOF_DARK: def(MAT.BRICK, 0x5a4a52),
  ROOF_BROWN: def(MAT.BRICK, 0x8e5a3a),
  STONE: def(MAT.BRICK, 0x9a9a94),
  TILE_WHITE: def(MAT.BRICK, 0xf7f7f2),

  CONCRETE: def(MAT.CONCRETE, 0xb4b4b0),
  CONCRETE_DARK: def(MAT.CONCRETE, 0x8c8c8a),
  CONCRETE_LIGHT: def(MAT.CONCRETE, 0xd6d4cc),
  CONCRETE_BLUE: def(MAT.CONCRETE, 0x7f93ad),
  CONCRETE_TAN: def(MAT.CONCRETE, 0xc8b08c),
  GRANITE: def(MAT.CONCRETE, 0x5d5a5e),
  MARBLE: def(MAT.CONCRETE, 0xeeeae2),
  SANDSTONE: def(MAT.CONCRETE, 0xd8bf96),
  TERRACOTTA: def(MAT.CONCRETE, 0xb5654a),

  GLASS: def(MAT.GLASS, 0x9fdcf5),
  GLASS_DARK: def(MAT.GLASS, 0x5fa8d6),
  GLASS_GREEN: def(MAT.GLASS, 0xa8e6cf),
  GLASS_BRONZE: def(MAT.GLASS, 0xc79a5b),
  GLASS_BLACK: def(MAT.GLASS, 0x2f3d4d),
  GLASS_MIRROR: def(MAT.GLASS, 0xcfe6f2),
  LAMP: def(MAT.GLASS, 0xfff2a8, 0, 200),
  NEON_RED: def(MAT.GLASS, 0xff3b4a, 0, 230),
  NEON_BLUE: def(MAT.GLASS, 0x3fa9ff, 0, 230),
  NEON_GREEN: def(MAT.GLASS, 0x4dff88, 0, 230),
  NEON_PINK: def(MAT.GLASS, 0xff5fd2, 0, 230),
  NEON_YELLOW: def(MAT.GLASS, 0xffe14d, 0, 230),
  WATER: def(MAT.GLASS, 0x4fb6e8, 0, 60),
  HYDRANT: def(MAT.SHEET, 0xe0301e), // breaks into a fountain, see reactions.js

  WOOD: def(MAT.WOOD, 0xa9744a),
  WOOD_DARK: def(MAT.WOOD, 0x6e4a2e),
  WOOD_LIGHT: def(MAT.WOOD, 0xd9a86c),
  WOOD_WHITE: def(MAT.WOOD, 0xf2efe6),
  TRUNK: def(MAT.WOOD, 0x6b4a2f),
  TOY_RED: def(MAT.WOOD, 0xe53935),
  TOY_BLUE: def(MAT.WOOD, 0x2979ff),
  TOY_YELLOW: def(MAT.WOOD, 0xfdd835),
  TOY_GREEN: def(MAT.WOOD, 0x43a047),
  TOY_ORANGE: def(MAT.WOOD, 0xfb8c00),
  TOY_PURPLE: def(MAT.WOOD, 0x8e44ad),
  TOY_WHITE: def(MAT.WOOD, 0xfafafa),

  LEAF: def(MAT.LEAF, 0x3f9b3a),
  LEAF_LIGHT: def(MAT.LEAF, 0x67bf4e),
  LEAF_DARK: def(MAT.LEAF, 0x2f7d32),
  LEAF_AUTUMN: def(MAT.LEAF, 0xe08a2c),
  FLOWER_RED: def(MAT.LEAF, 0xe84a5f),
  FLOWER_YELLOW: def(MAT.LEAF, 0xffd54f),
  FLOWER_WHITE: def(MAT.LEAF, 0xffffff),

  STEEL: def(MAT.STEEL, 0x8d99a6),
  STEEL_DARK: def(MAT.STEEL, 0x55606b),
  STEEL_RED: def(MAT.STEEL, 0xc94f3d),
  STEEL_YELLOW: def(MAT.STEEL, 0xf2b632),

  SHEET_WHITE: def(MAT.SHEET, 0xe8ecef),
  SHEET_GREY: def(MAT.SHEET, 0x9aa5ad),
  SHEET_BLUE: def(MAT.SHEET, 0x4a7fb5),
  SHEET_GREEN: def(MAT.SHEET, 0x5c9c6b),
  CAR_RED: def(MAT.SHEET, 0xd63031),
  CAR_BLUE: def(MAT.SHEET, 0x0984e3),
  CAR_YELLOW: def(MAT.SHEET, 0xfdcb6e),
  CAR_WHITE: def(MAT.SHEET, 0xf5f6fa),
  CAR_GREEN: def(MAT.SHEET, 0x00b894),
  CAR_BLACK: def(MAT.SHEET, 0x2d3436),
  TIRE: def(MAT.SHEET, 0x1e1e1e),
  HEADLIGHT: def(MAT.GLASS, 0xfff7c2, 0, 160),

  BARREL: def(MAT.EXPLOSIVE, 0xe74c3c),
  TANK: def(MAT.EXPLOSIVE, 0xf39c12),
  GAS: def(MAT.EXPLOSIVE, 0x27ae60),

  FABRIC_RED: def(MAT.FABRIC, 0xc0392b),
  FABRIC_BLUE: def(MAT.FABRIC, 0x3d6fb4),
  FABRIC_WHITE: def(MAT.FABRIC, 0xf5f5f0),
  FABRIC_GREEN: def(MAT.FABRIC, 0x5a9a5a),
  FABRIC_YELLOW: def(MAT.FABRIC, 0xf2c94c),
};

// Rubble twins: same material, dustier colour.
for (let i = 1; i < 128; i++) {
  if (!TYPE_MAT[i]) continue;
  const r = i | RUBBLE;
  TYPE_MAT[r] = TYPE_MAT[i] === MAT.BEDROCK ? MAT.BRICK : TYPE_MAT[i];
  TYPE_FLAGS[r] = F_RUBBLE;
  for (let c = 0; c < 3; c++) TYPE_RGBA[r * 4 + c] = Math.round(TYPE_RGBA[i * 4 + c] * 0.74 + 22);
}

// Fire: a burning voxel glows as EMBER and ends as CHAR or nothing. Both are loose rubble, never counted.
export const EMBER = 255, CHAR = 254;
TYPE_MAT[EMBER] = MAT.WOOD; TYPE_FLAGS[EMBER] = F_RUBBLE; TYPE_RGBA.set([255, 120, 20, 255], EMBER * 4);
TYPE_MAT[CHAR] = MAT.LEAF; TYPE_FLAGS[CHAR] = F_RUBBLE; TYPE_RGBA.set([38, 34, 32, 0], CHAR * 4);
// SOOT: what heat leaves of things that cannot burn (stone, metal). Still solid, but no longer counted.
export const SOOT = 253;
TYPE_MAT[SOOT] = MAT.CONCRETE; TYPE_FLAGS[SOOT] = F_RUBBLE; TYPE_RGBA.set([46, 42, 40, 0], SOOT * 4);
// Flash point per material: how much heat a voxel has to take before it reacts (see fire.js).
// Leaves and cloth catch at the first spark, wood needs a real fire next to it, glass bursts,
// metal and stone never burn but turn black under a flame thrower. 0 = never reacts.
export const FLASH = [0, 0, 3, 4, 1, 2.5, 6, 7, 9, 5, 1, 1];
// Seconds a burning voxel lasts (minimum, random extra), the heat it gives off per spread attempt,
// how often a charred rest stays behind, and spread attempts per second. Leaves flare up and pass the
// fire on quickly, so a tree burns down; wood burns long but needs several flames next to it.
export const BURN = { [MAT.WOOD]: [4.5, 4.5, 1.5, 0.5, 0.9], [MAT.LEAF]: [1.1, 1.6, 1.1, 0.08, 2.6], [MAT.FABRIC]: [1.2, 1.5, 1.1, 0.05, 2] };
// Materials that catch fire.
export const flammable = (t) => t > 0 && t < 128 && (TYPE_MAT[t] === MAT.WOOD || TYPE_MAT[t] === MAT.LEAF || TYPE_MAT[t] === MAT.FABRIC);

export const isTerrain = (t) => (TYPE_FLAGS[t] & F_TERRAIN) !== 0;
// Counted voxels are the ones that belong to buildings and props.
export const isCounted = (t) => t > 0 && t < 128 && (TYPE_FLAGS[t] & F_TERRAIN) === 0;
