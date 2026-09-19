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

/**
 * Simulates LLM Dinner Party Recipe Generation.
 * Takes user-selected fridge items and invited friends to create a collaborative meal.
 */
export async function generateDinnerPartyRecipe(
  title: string,
  selectedItems: FridgeItemRow[],
  invitedFriends: ProfileRow[],
  currentUser: ProfileRow
): Promise<RecipeComposite> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const recipeId = `rec-party-${Date.now()}`;
  const focusItems = selectedItems.map((i) => i.name);
  const main1 = focusItems[0] || 'Market Fresh';
  const main2 = focusItems[1] ? ` & ${focusItems[1]}` : '';

  const recipeTitle =
    title && title.trim() ? title.trim() : `${main1}${main2} Dinner Party Feast`;

  const allAttendees = [currentUser, ...invitedFriends];
  const memberMap = new Map(allAttendees.map((m) => [m.id, m]));

  const ingredients: RecipeIngredientRow[] = selectedItems.map((item, idx) => {
    const owner = memberMap.get(item.user_id) || currentUser;
    return {
      id: `ing-${recipeId}-${idx}`,
      recipe_id: recipeId,
      item_name: item.name,
      quantity: item.quantity || '1 portion',
      owner_id: item.user_id,
      owner_name: owner.display_name,
      is_expiring_item: item.status === 'expiring',
    };
  });

  const taskTemplates = [
    (mName: string, ing: string) => `Wash, prep, and dice ${ing} - ${mName}`,
    (mName: string, ing: string) => `Sear ${ing} over medium-high heat with seasonings - ${mName}`,
    (mName: string, ing: string) => `Combine ingredients, simmer sauce, and reduce - ${mName}`,
    (mName: string, _ing: string) => `Plate family-style, pour drinks, and toast - ${mName}`,
  ];

  const cookingTasks: RecipeTaskRow[] = taskTemplates.map((template, idx) => {
    const assignedMember = allAttendees[idx % allAttendees.length];
    const ingName = selectedItems[idx % selectedItems.length]?.name || 'ingredients';
    return {
      id: `task-${recipeId}-${idx + 1}`,
      recipe_id: recipeId,
      step_number: idx + 1,
      instruction: template(assignedMember.display_name, ingName),
      assigned_to_id: assignedMember.id,
      assigned_to_name: assignedMember.display_name,
    };
  });

  const totalItemCost = selectedItems.reduce((sum, item) => sum + (item.price || 4.5), 0);
  const dollarsSaved = Number(totalItemCost.toFixed(2));
  const foodRescuedGrams = selectedItems.length * 310;

  return {
    id: recipeId,
    title: recipeTitle,
    cookTime: '35 mins',
    isCollaborative: true,
    circleId: null,
    circleName: 'Dinner Party',
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
 * Generates the top 5 solo recipes that utilize food that is expiring in the user's fridge.
 */
export async function generateTopSoloRecipes(
  expiringItems: FridgeItemRow[],
  currentUser: ProfileRow
): Promise<RecipeComposite[]> {
  const focusItems = expiringItems.map((i) => i.name);
  const primary1 = focusItems[0] || 'Market Fresh Produce';
  const primary2 = focusItems[1] || 'Garden Greens';
  const primary3 = focusItems[2] || 'Pantry Herbs';

  const templates = [
    {
      cookTime: '15 mins',
      title: `Quick ${primary1} & ${primary2} Skillet Hash`,
      tasks: [
        (name: string) => `Roughly chop ${primary1} and ${primary2} into uniform bite-sized pieces. - ${name}`,
        (name: string) => `Heat 1 tbsp olive oil in a skillet on medium-high and sear firmer vegetables for 4 minutes. - ${name}`,
        (name: string) => `Toss in remaining greens and seasonings, cooking until tender and golden crisp. - ${name}`,
      ],
    },
    {
      cookTime: '20 mins',
      title: `Rustic Farmhouse ${primary1} Frittata`,
      tasks: [
        (name: string) => `Whisk 3 eggs with a splash of milk, pinch of salt, and cracked pepper. - ${name}`,
        (name: string) => `Lightly sauté ${primary1} and ${primary3} in an oven-safe skillet until fragrant. - ${name}`,
        (name: string) => `Pour eggs over ingredients, cook on low until edges set, then broil 2 mins until golden. - ${name}`,
      ],
    },
    {
      cookTime: '25 mins',
      title: `Warm ${primary1} & ${primary2} Harvest Toss Bowl`,
      tasks: [
        (name: string) => `Warm pre-cooked grains (quinoa or rice) in a skillet with a dash of olive oil. - ${name}`,
        (name: string) => `Quick-roast ${primary1} and ${primary2} with garlic powder and herbs for 10 mins. - ${name}`,
        (name: string) => `Layer warm grains into a bowl, top with roasted veggies and a squeeze of lemon. - ${name}`,
      ],
    },
    {
      cookTime: '20 mins',
      title: `One-Pot Savory ${primary1} & Garlic Broth Simmer`,
      tasks: [
        (name: string) => `Sauté minced garlic in a medium pot with olive oil until lightly golden. - ${name}`,
        (name: string) => `Pour in vegetable or chicken stock and add ${primary1}; bring to a gentle simmer for 8 mins. - ${name}`,
        (name: string) => `Fold in delicate greens during the last 2 minutes and serve piping hot. - ${name}`,
      ],
    },
    {
      cookTime: '12 mins',
      title: `Toasted ${primary1} & Melted Cheese Artisanal Melt`,
      tasks: [
        (name: string) => `Slice and lightly season ${primary1} and ${primary2}. - ${name}`,
        (name: string) => `Layer onto sourdough with cheese slices and butter the outer crust. - ${name}`,
        (name: string) => `Griddle over medium heat until crust is crunchy golden and cheese is bubbling melted. - ${name}`,
      ],
    },
  ];

  const totalItemCost = expiringItems.reduce((sum, item) => sum + (item.price || 4.0), 0);
  const baseDollars = Number((totalItemCost > 0 ? totalItemCost : 8.5).toFixed(2));
  const baseGrams = expiringItems.length > 0 ? expiringItems.length * 240 : 500;

  // Simulate LLM latency
  await new Promise((resolve) => setTimeout(resolve, 350));

  return templates.map((tmpl, idx) => {
    const recipeId = `rec-solo-${Date.now()}-${idx}`;
    const ingredients: RecipeIngredientRow[] = expiringItems.map((item, iIdx) => ({
      id: `ing-${recipeId}-${iIdx}`,
      recipe_id: recipeId,
      item_name: item.name,
      quantity: item.quantity || '1 portion',
      owner_id: currentUser.id,
      owner_name: currentUser.display_name,
      is_expiring_item: true,
    }));

    ingredients.push({
      id: `ing-${recipeId}-pantry`,
      recipe_id: recipeId,
      item_name: 'Olive oil, salt, garlic & seasonings',
      quantity: 'To taste',
      owner_id: currentUser.id,
      owner_name: currentUser.display_name,
      is_expiring_item: false,
    });

    const cookingTasks: RecipeTaskRow[] = tmpl.tasks.map((taskFn, sIdx) => ({
      id: `task-${recipeId}-${sIdx + 1}`,
      recipe_id: recipeId,
      step_number: sIdx + 1,
      instruction: taskFn(currentUser.display_name),
      assigned_to_id: currentUser.id,
      assigned_to_name: currentUser.display_name,
    }));

    return {
      id: recipeId,
      title: tmpl.title,
      cookTime: tmpl.cookTime,
      isCollaborative: false,
      circleId: null,
      circleName: undefined,
      focusExpiringItems: focusItems.length > 0 ? focusItems : [primary1, primary2],
      ingredients,
      cookingTasks,
      projectedImpact: {
        foodRescuedGrams: Math.round(baseGrams * (1 - idx * 0.05)),
        dollarsSaved: Number((baseDollars * (1 - idx * 0.05)).toFixed(2)),
      },
      rsvps: [currentUser.id],
      createdAt: new Date().toISOString(),
    };
  });
}

/**
 * Generates the top 5 collaborative dinner party recipes pooling expiring food
 * from both the host's fridge and invited friends' fridges.
 */
export async function generateTopDinnerPartyRecipes(
  partyName: string,
  hostExpiringItems: FridgeItemRow[],
  friendsExpiringItems: FridgeItemRow[],
  invitedFriends: ProfileRow[],
  currentUser: ProfileRow
): Promise<RecipeComposite[]> {
  const allAttendees = [currentUser, ...invitedFriends];
  const memberMap = new Map(allAttendees.map((m) => [m.id, m]));

  const allItems = [...hostExpiringItems, ...friendsExpiringItems];
  const focusItems = allItems.map((i) => i.name);
  const main1 = focusItems[0] || 'Farmers Market Selection';
  const prefix =
    partyName && partyName.trim()
      ? partyName.trim()
      : `${currentUser.display_name}'s Dinner Party`;

  const templates = [
    {
      title: `${prefix}: One-Pot Community ${main1} Feast`,
      cookTime: '35 mins',
      taskDescriptions: [
        'Wash, dice, and prep all vegetables and proteins into shared prep bowls.',
        'Heat large Dutch oven, sear hearty ingredients with aromatics and seasonings.',
        'Pour in stock or sauce, combine remaining veggies, and simmer until rich and tender.',
        'Plate family-style onto platters, pour beverages, and toast to zero food waste!',
      ],
    },
    {
      title: `${prefix}: Family-Style Sheet-Pan ${main1} Roast`,
      cookTime: '30 mins',
      taskDescriptions: [
        'Preheat oven to 400°F (200°C) and line sheet pans with parchment.',
        'Toss pooled ingredients in olive oil, garlic, and fresh herbs.',
        'Roast until edges are caramelized and crisp (approx 20-25 mins).',
        'Garnish with fresh lemon zest and warm bread for everyone to share.',
      ],
    },
    {
      title: `${prefix}: Collaborative Tossed Pasta & ${main1} Medley`,
      cookTime: '25 mins',
      taskDescriptions: [
        'Boil large pot of salted water and cook artisanal pasta al dente.',
        'Sauté garlic, olive oil, and pooled ingredients in a wide skillet until tender.',
        'Toss drained pasta directly into the sauce with pasta water and parmesan.',
        'Serve in a massive bowl at the center of the table with cracked black pepper.',
      ],
    },
    {
      title: `${prefix}: Multi-Plate Tapas & Savory Bites`,
      cookTime: '30 mins',
      taskDescriptions: [
        'Divide into prep stations: grill toasts, slice fresh produce, and season dips.',
        'Sauté warm skewers and toppings over medium-high heat with smoked paprika.',
        'Assemble vibrant small plates featuring each friend’s brought ingredient.',
        'Pour drinks, pass plates around the table, and taste everything together!',
      ],
    },
    {
      title: `${prefix}: Sizzling Shared Stovetop Paella/Skillet`,
      cookTime: '40 mins',
      taskDescriptions: [
        'Melt butter or oil in a wide paella or cast iron pan over medium heat.',
        'Layer base grains and aromatics, then nestle pooled ingredients on top.',
        'Simmer without stirring to develop an incredible crispy caramelized crust.',
        'Bring the entire skillet directly to the table for family-style self-serving.',
      ],
    },
  ];

  const totalCost = allItems.reduce((sum, item) => sum + (item.price || 4.5), 0);
  const baseDollars = Number((totalCost > 0 ? totalCost : 22.5).toFixed(2));
  const baseGrams = allItems.length > 0 ? allItems.length * 300 : 1200;

  // Simulate LLM processing latency
  await new Promise((resolve) => setTimeout(resolve, 450));

  return templates.map((tmpl, idx) => {
    const recipeId = `rec-party-${Date.now()}-${idx}`;

    const ingredients: RecipeIngredientRow[] = allItems.map((item, iIdx) => {
      const owner = memberMap.get(item.user_id) || currentUser;
      return {
        id: `ing-${recipeId}-${iIdx}`,
        recipe_id: recipeId,
        item_name: item.name,
        quantity: item.quantity || '1 portion',
        owner_id: item.user_id,
        owner_name: owner.display_name,
        is_expiring_item: true,
      };
    });

    ingredients.push({
      id: `ing-${recipeId}-seasonings`,
      recipe_id: recipeId,
      item_name: 'Pantry olive oil, herbs & seasonings',
      quantity: 'To taste',
      owner_id: currentUser.id,
      owner_name: currentUser.display_name,
      is_expiring_item: false,
    });

    const cookingTasks: RecipeTaskRow[] = tmpl.taskDescriptions.map((desc, sIdx) => {
      const assigned = allAttendees[sIdx % allAttendees.length];
      return {
        id: `task-${recipeId}-${sIdx + 1}`,
        recipe_id: recipeId,
        step_number: sIdx + 1,
        instruction: `${desc} - ${assigned.display_name}`,
        assigned_to_id: assigned.id,
        assigned_to_name: assigned.display_name,
      };
    });

    return {
      id: recipeId,
      title: tmpl.title,
      cookTime: tmpl.cookTime,
      isCollaborative: true,
      circleId: null,
      circleName: partyName || 'Dinner Party',
      focusExpiringItems: focusItems.length > 0 ? focusItems : [main1],
      ingredients,
      cookingTasks,
      projectedImpact: {
        foodRescuedGrams: Math.round(baseGrams * (1 - idx * 0.04)),
        dollarsSaved: Number((baseDollars * (1 - idx * 0.04)).toFixed(2)),
      },
      rsvps: [currentUser.id],
      createdAt: new Date().toISOString(),
    };
  });
}

