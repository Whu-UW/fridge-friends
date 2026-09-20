/**
 * Food to Character & Category Lookup Engine
 * Implements category rules and freshness formulas from handover.md and characters.json
 */

export type FoodCategory = 'hardExpiry' | 'gradual' | 'shelfStable';
export type CharacterKey =
  | 'spinach'
  | 'milk'
  | 'egg'
  | 'pepper'
  | 'can'
  | 'pasta'
  | 'eggplant'
  | 'salmon'
  | 'lemon';

export type CharacterMood =
  | 'happy'
  | 'uneasy'
  | 'nervous'
  | 'wilting'
  | 'toxic'
  | 'done'
  | 'joy'
  | 'scared';

export interface FoodLookupResult {
  characterKey: CharacterKey;
  buddyName: string | null;
  category: FoodCategory;
  categoryLabel: string;
  defaultShelfLifeDays: number;
  displayName: string;
}

// Starter Buddies from Screen 1
export const STARTER_BUDDIES = [
  { key: 'spinach' as CharacterKey, name: 'Sammy', food: 'spinach', desc: 'Sammy the spinach' },
  { key: 'milk' as CharacterKey, name: 'Milo', food: 'milk', desc: 'Milo the milk' },
  { key: 'egg' as CharacterKey, name: 'Eddie', food: 'eggs', desc: 'Eddie the egg' },
  { key: 'can' as CharacterKey, name: 'Carl', food: 'canned tomatoes', desc: 'Carl the canned tomatoes' },
  { key: 'pepper' as CharacterKey, name: 'Bella', food: 'bell pepper', desc: 'Bella the bell pepper' },
];

/**
 * Classifies any grocery food name into one of the 9 character bodies and 3 degradation categories.
 */
export function lookupFoodCharacter(foodName: string): FoodLookupResult {
  const lower = foodName.toLowerCase().trim();

  // 1. Dairy & Liquid Hard Expiries -> Milo the Milk
  if (
    lower.includes('milk') ||
    lower.includes('yogurt') ||
    lower.includes('cream') ||
    lower.includes('dairy') ||
    lower.includes('cheese') ||
    lower.includes('butter')
  ) {
    return {
      characterKey: 'milk',
      buddyName: 'Milo',
      category: 'hardExpiry',
      categoryLabel: 'Hard expiry',
      defaultShelfLifeDays: 10,
      displayName: 'Milk',
    };
  }

  // 2. Eggs -> Eddie the Egg
  if (lower.includes('egg')) {
    return {
      characterKey: 'egg',
      buddyName: 'Eddie',
      category: 'hardExpiry',
      categoryLabel: 'Hard expiry',
      defaultShelfLifeDays: 21,
      displayName: 'Eggs',
    };
  }

  // 3. Meats & Fish -> Salmon
  if (
    lower.includes('salmon') ||
    lower.includes('fish') ||
    lower.includes('tuna') && !lower.includes('canned') ||
    lower.includes('chicken') ||
    lower.includes('beef') ||
    lower.includes('pork') ||
    lower.includes('steak') ||
    lower.includes('meat') ||
    lower.includes('shrimp') ||
    lower.includes('seafood')
  ) {
    return {
      characterKey: 'salmon',
      buddyName: null,
      category: 'hardExpiry',
      categoryLabel: 'Hard expiry',
      defaultShelfLifeDays: 3,
      displayName: 'Salmon',
    };
  }

  // 4. Leafy Greens & Herbs -> Sammy the Spinach
  if (
    lower.includes('spinach') ||
    lower.includes('lettuce') ||
    lower.includes('kale') ||
    lower.includes('herb') ||
    lower.includes('basil') ||
    lower.includes('cilantro') ||
    lower.includes('parsley') ||
    lower.includes('salad') ||
    lower.includes('greens') ||
    lower.includes('arugula')
  ) {
    return {
      characterKey: 'spinach',
      buddyName: 'Sammy',
      category: 'gradual',
      categoryLabel: 'Gradual decline',
      defaultShelfLifeDays: 7,
      displayName: 'Spinach',
    };
  }

  // 5. Peppers, Tomatoes & Vibrant Veggies -> Bella the Bell Pepper
  if (
    lower.includes('pepper') ||
    lower.includes('capsicum') ||
    lower.includes('tomato') && !lower.includes('can') ||
    lower.includes('avocado') ||
    lower.includes('zucchini') ||
    lower.includes('cucumber')
  ) {
    return {
      characterKey: 'pepper',
      buddyName: 'Bella',
      category: 'gradual',
      categoryLabel: 'Gradual decline',
      defaultShelfLifeDays: 8,
      displayName: 'Bell pepper',
    };
  }

  // 6. Dense Vegetables & Nightshades -> Eggplant
  if (
    lower.includes('eggplant') ||
    lower.includes('mushroom') ||
    lower.includes('broccoli') ||
    lower.includes('carrot') ||
    lower.includes('potato') ||
    lower.includes('onion') ||
    lower.includes('garlic') ||
    lower.includes('cauliflower')
  ) {
    return {
      characterKey: 'eggplant',
      buddyName: null,
      category: 'gradual',
      categoryLabel: 'Gradual decline',
      defaultShelfLifeDays: 7,
      displayName: 'Eggplant',
    };
  }

  // 7. Citrus & Fresh Fruits -> Lemon
  if (
    lower.includes('lemon') ||
    lower.includes('lime') ||
    lower.includes('orange') ||
    lower.includes('apple') ||
    lower.includes('berry') ||
    lower.includes('berries') ||
    lower.includes('banana') ||
    lower.includes('fruit')
  ) {
    return {
      characterKey: 'lemon',
      buddyName: null,
      category: 'gradual',
      categoryLabel: 'Gradual decline',
      defaultShelfLifeDays: 14,
      displayName: 'Lemon',
    };
  }

  // 8. Canned Goods, Sauces & Preserves -> Carl Canned Tomatoes
  if (
    lower.includes('can') ||
    lower.includes('canned') ||
    lower.includes('soup') ||
    lower.includes('beans') ||
    lower.includes('chickpea') ||
    lower.includes('sauce') ||
    lower.includes('jar')
  ) {
    return {
      characterKey: 'can',
      buddyName: 'Carl',
      category: 'shelfStable',
      categoryLabel: 'Shelf-stable',
      defaultShelfLifeDays: 730,
      displayName: 'Canned tomatoes',
    };
  }

  // 9. Grains, Pasta, Pantry & Bakery -> Pasta Box
  if (
    lower.includes('pasta') ||
    lower.includes('rice') ||
    lower.includes('noodle') ||
    lower.includes('cereal') ||
    lower.includes('oats') ||
    lower.includes('flour') ||
    lower.includes('bread') ||
    lower.includes('tortilla') ||
    lower.includes('grain')
  ) {
    return {
      characterKey: 'pasta',
      buddyName: null,
      category: 'shelfStable',
      categoryLabel: 'Shelf-stable',
      defaultShelfLifeDays: 365,
      displayName: 'Pasta',
    };
  }

  // Fallback: Default to gradual decline with spinach body
  return {
    characterKey: 'spinach',
    buddyName: 'Sammy',
    category: 'gradual',
    categoryLabel: 'Gradual decline',
    defaultShelfLifeDays: 7,
    displayName: foodName || 'Ingredient',
  };
}

/**
 * Calculates remaining days from now until expiresAt.
 */
export function getDaysLeft(expiresAtIso: string): number {
  if (!expiresAtIso) return 5;
  const clean = expiresAtIso.trim();
  let expDate: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-').map(Number);
    expDate = new Date(y, m - 1, d, 23, 59, 59);
  } else {
    expDate = new Date(clean);
  }
  if (isNaN(expDate.getTime())) return 5;

  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 36e5));
}

/**
 * Computes freshness score (0.0 to 1.0) and character mood based on handover spec.
 */
export function computeFreshnessAndMood(
  category: FoodCategory,
  daysLeft: number,
  shelfLifeDays: number = 7
): { freshness: number; mood: CharacterMood; motion: string } {
  const safeShelfLife = shelfLifeDays > 0 ? shelfLifeDays : 7;

  if (category === 'hardExpiry') {
    // Hard expiry formula:
    // 1.0 with > 3 days left
    // 0.35 with 1 to 3 days left
    // 0 on and after the expiry date
    if (daysLeft > 3) {
      return { freshness: 1.0, mood: 'happy', motion: 'bob' };
    } else if (daysLeft >= 1) {
      return { freshness: 0.35, mood: 'uneasy', motion: 'blink' };
    } else {
      return { freshness: 0.0, mood: 'toxic', motion: 'rage' };
    }
  }

  if (category === 'shelfStable') {
    // Shelf-stable formula:
    // days left / shelf life clamped 0..1
    const rawFreshness = Math.max(0, Math.min(1, daysLeft / safeShelfLife));
    if (rawFreshness >= 0.5) {
      return { freshness: rawFreshness, mood: 'happy', motion: 'roll' };
    } else if (rawFreshness >= 0.15) {
      return { freshness: rawFreshness, mood: 'uneasy', motion: 'blink' };
    } else {
      return { freshness: rawFreshness, mood: 'done', motion: 'none' };
    }
  }

  // Gradual decline formula:
  // days left / shelf life clamped 0..1
  const rawFreshness = Math.max(0, Math.min(1, daysLeft / safeShelfLife));
  if (rawFreshness >= 0.75) {
    return { freshness: rawFreshness, mood: 'happy', motion: 'bob' };
  } else if (rawFreshness >= 0.5) {
    return { freshness: rawFreshness, mood: 'uneasy', motion: 'blink' };
  } else if (rawFreshness >= 0.25) {
    return { freshness: rawFreshness, mood: 'nervous', motion: 'jitter' };
  } else if (rawFreshness >= 0.05) {
    return { freshness: rawFreshness, mood: 'wilting', motion: 'sob' };
  } else {
    return { freshness: rawFreshness, mood: 'done', motion: 'none' };
  }
}

/**
 * Status chips on the shelf come from days left:
 * - Green (Fresh): > 5 days left
 * - Yellow (Use soon): 3 to 5 days left
 * - Red (Use now): <= 2 days left
 */
export function getStatusUrgency(daysLeft: number): {
  status: 'fresh' | 'soon' | 'now';
  label: string;
  needsRescue: boolean;
} {
  if (daysLeft > 5) {
    return { status: 'fresh', label: 'Fresh', needsRescue: false };
  }
  if (daysLeft >= 3) {
    return { status: 'soon', label: 'Use soon', needsRescue: true }; // rescue list includes yellow & red
  }
  return { status: 'now', label: 'Use now', needsRescue: true };
}

/**
 * Formats remaining days into clean shelf display strings (e.g. "12 days", "3 weeks", "2 years").
 */
export function formatShelfTimeLeft(daysLeft: number): string {
  if (daysLeft < 0) {
    return 'Expired';
  }
  if (daysLeft === 0) {
    return 'Today';
  }
  if (daysLeft === 1) {
    return '1 day';
  }
  if (daysLeft < 14) {
    return `${daysLeft} days`;
  }
  if (daysLeft < 60) {
    const weeks = Math.round(daysLeft / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  if (daysLeft < 365) {
    const months = Math.round(daysLeft / 30);
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  const years = Math.round(daysLeft / 365);
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}
