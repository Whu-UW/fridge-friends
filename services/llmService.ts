/**
 * LLM Service Interface & Mock Scaffolding
 *
 * This service encapsulates all LLM intelligence:
 * 1. Expiration Date Estimation from Item Name + Date Bought
 * 2. Solo Waste-Reduction Recipe Suggestions
 * 3. Collaborative Circle Potluck Recipe Generation
 *
 * When ready, swap these mock functions with your LLM endpoint (OpenAI, Gemini, or Supabase Edge Functions).
 */

import { FridgeItemRow, ProfileRow, RecipeComposite, RecipeIngredientRow, RecipeTaskRow } from './supabase/types';

// Category / keyword heuristic database simulating LLM shelf life estimates
const SHELF_LIFE_KB: Record<string, number> = {
  spinach: 4,
  lettuce: 4,
  kale: 5,
  chicken: 3,
  poultry: 3,
  beef: 4,
  steak: 4,
  pork: 4,
  fish: 2,
  salmon: 2,
  shrimp: 2,
  milk: 7,
  cream: 8,
  yogurt: 10,
  cheese: 14,
  berries: 4,
  strawberries: 4,
  blueberries: 6,
  bananas: 5,
  avocado: 4,
  tomato: 6,
  mushrooms: 5,
  bread: 6,
  eggs: 21,
  tofu: 5,
  pasta: 180,
  rice: 365,
  canned: 365,
};

/**
 * Simulates LLM shelf life estimation.
 * In production: Send prompt to LLM:
 * "Estimate shelf life in days for item: [itemName], category: [category], bought on: [dateBought]."
 */
export async function estimateShelfLife(
  itemName: string,
  category: string,
  dateBoughtIso: string
): Promise<{ expiresAt: string; shelfLifeDays: number; notes: string }> {
  // Simulate network / LLM processing latency
  await new Promise((resolve) => setTimeout(resolve, 50));

  const lowerName = itemName.toLowerCase();
  let days = 7; // default estimate

  for (const [keyword, shelfDays] of Object.entries(SHELF_LIFE_KB)) {
    if (lowerName.includes(keyword)) {
      days = shelfDays;
      break;
    }
  }

  // Adjust default based on category if keyword not matched
  if (days === 7) {
    if (category.toLowerCase() === 'meat' || category.toLowerCase() === 'seafood') days = 3;
    else if (category.toLowerCase() === 'produce') days = 5;
    else if (category.toLowerCase() === 'dairy') days = 8;
    else if (category.toLowerCase() === 'bakery') days = 5;
    else if (category.toLowerCase() === 'pantry') days = 60;
  }

  const boughtTime = new Date(dateBoughtIso).getTime();
  const expiresAt = new Date(boughtTime + days * 24 * 36e5).toISOString();

  return {
    expiresAt,
    shelfLifeDays: days,
    notes: `LLM predicted ${days}-day shelf life from purchase date.`,
  };
}

/**
 * Simulates LLM Solo Waste-Reduction Recipe Generation.
 * Prioritizes near-expiration items to prevent food waste.
 */
export async function generateSoloWasteRecipe(
  expiringItems: FridgeItemRow[],
  currentUser: ProfileRow
): Promise<RecipeComposite> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const recipeId = `rec-${Date.now()}`;
  const focusItems = expiringItems.map((i) => i.name);
  const primaryName = focusItems[0] || 'Market Fresh';
  const secondaryName = focusItems[1] ? ` & ${focusItems[1]}` : ' Medley';

  const title = `Quick ${primaryName}${secondaryName} Zero-Waste Skillet`;

  const ingredients: RecipeIngredientRow[] = expiringItems.map((item, idx) => ({
    id: `ing-${recipeId}-${idx}`,
    recipe_id: recipeId,
    item_name: item.name,
    quantity: item.quantity || '1 portion',
    owner_id: currentUser.id,
    owner_name: currentUser.display_name,
    is_expiring_item: true,
  }));

  // Add default pantry seasoning
  ingredients.push({
    id: `ing-${recipeId}-oil`,
    recipe_id: recipeId,
    item_name: 'Olive Oil & Salt/Pepper',
    quantity: 'To taste',
    owner_id: currentUser.id,
    owner_name: currentUser.display_name,
    is_expiring_item: false,
  });

  const cookingTasks: RecipeTaskRow[] = [
    {
      id: `task-${recipeId}-1`,
      recipe_id: recipeId,
      step_number: 1,
      instruction: `Rinse, prep, and chop ${focusItems.join(', ')} to even bite-sized pieces.`,
      assigned_to_id: currentUser.id,
      assigned_to_name: currentUser.display_name,
    },
    {
      id: `task-${recipeId}-2`,
      recipe_id: recipeId,
      step_number: 2,
      instruction: `Heat 1 tbsp oil in a skillet. Sauté firmer ingredients first for 4-5 mins until tender.`,
      assigned_to_id: currentUser.id,
      assigned_to_name: currentUser.display_name,
    },
    {
      id: `task-${recipeId}-3`,
      recipe_id: recipeId,
      step_number: 3,
      instruction: `Toss in leafy greens and delicate items during the last 2 minutes until wilted. Season generously.`,
      assigned_to_id: currentUser.id,
      assigned_to_name: currentUser.display_name,
    },
  ];

  const totalItemCost = expiringItems.reduce((sum, item) => sum + (item.price || 4.5), 0);
  const dollarsSaved = Number(totalItemCost.toFixed(2));
  const foodRescuedGrams = expiringItems.length * 280;

  return {
    id: recipeId,
    title,
    cookTime: '20 mins',
    isCollaborative: false,
    circleId: null,
    focusExpiringItems: focusItems,
    ingredients,
    cookingTasks,
    projectedImpact: {
      foodRescuedGrams,
      dollarsSaved,
    },
    rsvps: [currentUser.id],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Simulates LLM Collaborative Circle Meal Generation.
 * Pools expiring items from circle members and divides duties.
 */
export async function generateCircleMealRecipe(
  circleId: string,
  circleName: string,
  circleExpiringItems: FridgeItemRow[],
  members: ProfileRow[],
  currentUser: ProfileRow
): Promise<RecipeComposite> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const recipeId = `rec-circle-${Date.now()}`;
  const focusItems = circleExpiringItems.map((i) => i.name);
  const main1 = focusItems[0] || 'Community';
  const main2 = focusItems[1] ? ` & ${focusItems[1]}` : '';

  const title = `${circleName} One-Pot ${main1}${main2} Feast`;

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const ingredients: RecipeIngredientRow[] = circleExpiringItems.map((item, idx) => {
    const owner = memberMap.get(item.user_id) || currentUser;
    return {
      id: `ing-${recipeId}-${idx}`,
      recipe_id: recipeId,
      item_name: item.name,
      quantity: item.quantity || '1 portion',
      owner_id: item.user_id,
      owner_name: owner.display_name,
      is_expiring_item: true,
    };
  });

  const memberList = members.length > 0 ? members : [currentUser];

  const taskTemplates = [
    (mName: string, ing: string) => `Wash, slice, and prep ${ing} - ${mName}`,
    (mName: string, ing: string) => `Sear and brown ${ing} in heavy pan - ${mName}`,
    (mName: string, ing: string) => `Combine ingredients, simmer sauce, and reduce - ${mName}`,
    (mName: string, _ing: string) => `Garnish, set the table, and serve circle style - ${mName}`,
  ];

  const cookingTasks: RecipeTaskRow[] = taskTemplates.map((template, idx) => {
    const assignedMember = memberList[idx % memberList.length];
    const ingName = circleExpiringItems[idx % circleExpiringItems.length]?.name || 'ingredients';
    return {
      id: `task-${recipeId}-${idx + 1}`,
      recipe_id: recipeId,
      step_number: idx + 1,
      instruction: template(assignedMember.display_name, ingName),
      assigned_to_id: assignedMember.id,
      assigned_to_name: assignedMember.display_name,
    };
  });

  const totalItemCost = circleExpiringItems.reduce((sum, item) => sum + (item.price || 5.0), 0);
  const dollarsSaved = Number(totalItemCost.toFixed(2));
  const foodRescuedGrams = circleExpiringItems.length * 320;

  return {
    id: recipeId,
    title,
    cookTime: '35 mins',
    isCollaborative: true,
    circleId,
    circleName,
    focusExpiringItems: focusItems,
    ingredients,
    cookingTasks,
    projectedImpact: {
      foodRescuedGrams,
      dollarsSaved,
    },
    rsvps: [currentUser.id],
    createdAt: new Date().toISOString(),
  };
}
