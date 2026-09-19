import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
}

export interface FridgeItem {
  id: string;
  name: string;
  category: string;
  quantity: string;
  expiresAt: string; // ISO string
  status: 'fresh' | 'expiring' | 'used';
  ownerId: string;
  ownerName: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
  ownerId: string;
  ownerName: string;
}

export interface CookingTask {
  stepNumber: number;
  instruction: string;
  assignedMemberName: string;
}

export interface Recipe {
  id: string;
  title: string;
  cookTime: string;
  ingredients: RecipeIngredient[];
  cookingTasks: CookingTask[];
  projectedImpact: {
    foodRescuedGrams: number;
    dollarsSaved: number;
  };
  rsvps: string[]; // array of user IDs
  createdAt: string;
  completed?: boolean;
}

export interface NewFridgeItemInput {
  name: string;
  category?: string;
  quantity?: string;
  shelfLifeHours: number;
}

interface AppContextType {
  currentUser: User;
  circleMembers: User[];
  fridgeItems: FridgeItem[];
  recipes: Recipe[];
  addFridgeItems: (items: NewFridgeItemInput[]) => void;
  removeItem: (id: string) => void;
  getCircleExpiringItems: (hoursThreshold?: number) => FridgeItem[];
  generatePotluckDinner: () => string;
  rsvpRecipe: (recipeId: string, userId: string) => void;
  getRecipe: (id: string) => Recipe | undefined;
}

const initialUser: User = { id: 'u1', name: 'Alex' };

const initialCircleMembers: User[] = [
  { id: 'u1', name: 'Alex' },
  { id: 'u2', name: 'Sam' },
  { id: 'u3', name: 'Jordan' },
];

const now = Date.now();
const hourMs = 36e5;

const initialFridgeItems: FridgeItem[] = [
  {
    id: 'item-1',
    name: 'Spinach',
    category: 'Produce',
    quantity: '1 bag',
    expiresAt: new Date(now + 24 * hourMs).toISOString(),
    status: 'expiring',
    ownerId: 'u1',
    ownerName: 'Alex',
  },
  {
    id: 'item-2',
    name: 'Garlic',
    category: 'Produce',
    quantity: '3 heads',
    expiresAt: new Date(now + 48 * hourMs).toISOString(),
    status: 'expiring',
    ownerId: 'u1',
    ownerName: 'Alex',
  },
  {
    id: 'item-3',
    name: 'Greek Yogurt',
    category: 'Dairy',
    quantity: '500g tub',
    expiresAt: new Date(now + 120 * hourMs).toISOString(),
    status: 'fresh',
    ownerId: 'u1',
    ownerName: 'Alex',
  },
  {
    id: 'item-4',
    name: 'Chicken Thighs',
    category: 'Meat',
    quantity: '500g',
    expiresAt: new Date(now + 36 * hourMs).toISOString(),
    status: 'expiring',
    ownerId: 'u2',
    ownerName: 'Sam',
  },
  {
    id: 'item-5',
    name: 'Bell Peppers',
    category: 'Produce',
    quantity: '2 pcs',
    expiresAt: new Date(now + 52 * hourMs).toISOString(),
    status: 'expiring',
    ownerId: 'u2',
    ownerName: 'Sam',
  },
  {
    id: 'item-6',
    name: 'Heavy Cream',
    category: 'Dairy',
    quantity: '250ml',
    expiresAt: new Date(now + 40 * hourMs).toISOString(),
    status: 'expiring',
    ownerId: 'u3',
    ownerName: 'Jordan',
  },
  {
    id: 'item-7',
    name: 'Mushrooms',
    category: 'Produce',
    quantity: '200g',
    expiresAt: new Date(now + 30 * hourMs).toISOString(),
    status: 'expiring',
    ownerId: 'u3',
    ownerName: 'Jordan',
  },
];

const initialRecipes: Recipe[] = [
  {
    id: 'rec-past-1',
    title: 'Rustic Skillet Chicken & Braised Greens',
    cookTime: '35 mins',
    ingredients: [
      { name: 'Chicken Breast', quantity: '400g', ownerId: 'u2', ownerName: 'Sam' },
      { name: 'Kale', quantity: '1 bunch', ownerId: 'u1', ownerName: 'Alex' },
      { name: 'Parmesan', quantity: '100g', ownerId: 'u3', ownerName: 'Jordan' },
    ],
    cookingTasks: [
      { stepNumber: 1, instruction: 'Chop kale and grate parmesan - Alex', assignedMemberName: 'Alex' },
      { stepNumber: 2, instruction: 'Pan-sear chicken with salt and pepper - Sam', assignedMemberName: 'Sam' },
      { stepNumber: 3, instruction: 'Deglaze pan and toss with cheese - Jordan', assignedMemberName: 'Jordan' },
    ],
    projectedImpact: {
      foodRescuedGrams: 950,
      dollarsSaved: 21.0,
    },
    rsvps: ['u1', 'u2', 'u3'],
    createdAt: new Date(now - 48 * hourMs).toISOString(),
    completed: true,
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser] = useState<User>(initialUser);
  const [circleMembers] = useState<User[]>(initialCircleMembers);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>(initialFridgeItems);
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);

  const addFridgeItems = (items: NewFridgeItemInput[]) => {
    const timestamp = Date.now();
    const newEntries: FridgeItem[] = items.map((item, index) => {
      const expiresAt = new Date(timestamp + item.shelfLifeHours * 36e5).toISOString();
      return {
        id: `item-${timestamp}-${index}`,
        name: item.name,
        category: item.category || 'General',
        quantity: item.quantity || '1 pack',
        expiresAt,
        status: item.shelfLifeHours <= 48 ? 'expiring' : 'fresh',
        ownerId: currentUser.id,
        ownerName: currentUser.name,
      };
    });

    setFridgeItems((prev) => [...newEntries, ...prev]);
  };

  const removeItem = (id: string) => {
    setFridgeItems((prev) => prev.filter((item) => item.id !== id));
  };

  const getCircleExpiringItems = (hoursThreshold: number = 72): FridgeItem[] => {
    const currentTime = Date.now();
    return fridgeItems.filter((item) => {
      const hoursRemaining = (new Date(item.expiresAt).getTime() - currentTime) / 36e5;
      return hoursRemaining > 0 && hoursRemaining < hoursThreshold;
    });
  };

  const generatePotluckDinner = (): string => {
    const expiring = getCircleExpiringItems(72);
    const recipeId = `rec-${Date.now()}`;
    const selectedItems = expiring.length > 0 ? expiring : fridgeItems.slice(0, 3);

    const ingredients: RecipeIngredient[] = selectedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      ownerId: item.ownerId,
      ownerName: item.ownerName,
    }));

    // Find present owners
    const presentOwners = Array.from(new Set(selectedItems.map((item) => item.ownerName)));
    if (presentOwners.length === 0) {
      presentOwners.push(currentUser.name);
    }

    const itemNames = selectedItems.map((i) => i.name);
    const mainIng1 = itemNames[0] || 'Market';
    const mainIng2 = itemNames[1] ? ` & ${itemNames[1]}` : '';
    const title = `One-Pan ${mainIng1}${mainIng2} Potluck Feast`;

    const instructionsTemplate = [
      (member: string, ing: string) => `Step 1: Wash, trim, and chop ${ing} - ${member}`,
      (member: string, ing: string) => `Step 2: Sauté ${ing} over medium heat with seasonings - ${member}`,
      (member: string, ing: string) => `Step 3: Combine remaining items and gently simmer - ${member}`,
      (member: string, _ing: string) => `Step 4: Plate family-style and toast the circle - ${member}`,
    ];

    const cookingTasks: CookingTask[] = instructionsTemplate.map((fn, idx) => {
      const assigned = presentOwners[idx % presentOwners.length];
      const ingredient = selectedItems[idx % selectedItems.length]?.name || 'ingredients';
      return {
        stepNumber: idx + 1,
        instruction: fn(assigned, ingredient),
        assignedMemberName: assigned,
      };
    });

    const foodRescuedGrams = Math.round(selectedItems.length * 320);
    const dollarsSaved = Number((selectedItems.length * 5.8).toFixed(2));

    const newRecipe: Recipe = {
      id: recipeId,
      title,
      cookTime: '30 mins',
      ingredients,
      cookingTasks,
      projectedImpact: {
        foodRescuedGrams,
        dollarsSaved,
      },
      rsvps: [currentUser.id],
      createdAt: new Date().toISOString(),
      completed: false,
    };

    setRecipes((prev) => [newRecipe, ...prev]);
    return recipeId;
  };

  const rsvpRecipe = (recipeId: string, userId: string) => {
    setRecipes((prev) =>
      prev.map((recipe) => {
        if (recipe.id !== recipeId) return recipe;
        const alreadyRsvpd = recipe.rsvps.includes(userId);
        return {
          ...recipe,
          rsvps: alreadyRsvpd
            ? recipe.rsvps.filter((id) => id !== userId)
            : [...recipe.rsvps, userId],
        };
      })
    );
  };

  const getRecipe = (id: string): Recipe | undefined => {
    return recipes.find((r) => r.id === id);
  };

  const value = useMemo(
    () => ({
      currentUser,
      circleMembers,
      fridgeItems,
      recipes,
      addFridgeItems,
      removeItem,
      getCircleExpiringItems,
      generatePotluckDinner,
      rsvpRecipe,
      getRecipe,
    }),
    [currentUser, circleMembers, fridgeItems, recipes]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
