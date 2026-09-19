import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import {
  ProfileRow,
  FridgeItemRow,
  ShoppingTripRow,
  RecipeComposite,
  CircleComposite,
} from '../services/supabase/types';
import {
  estimateShelfLife,
  generateSoloWasteRecipe as llmGenerateSoloRecipe,
  generateCircleMealRecipe as llmGenerateCircleMealRecipe,
} from '../services/llmService';
import { ScannedReceiptResult } from '../services/receiptOcrService';

interface AppContextType {
  currentUser: ProfileRow;
  friends: ProfileRow[];
  followingFriendIds: string[];
  circles: CircleComposite[];
  fridgeItems: FridgeItemRow[];
  shoppingTrips: ShoppingTripRow[];
  recipes: RecipeComposite[];
  // Actions
  addShoppingTripFromReceipt: (receipt: ScannedReceiptResult) => Promise<void>;
  addManualFridgeItem: (
    name: string,
    price: number,
    dateBoughtIso: string,
    category?: string,
    customShelfLifeDays?: number
  ) => Promise<void>;
  removeFridgeItem: (id: string) => void;
  toggleFollowFriend: (friendId: string) => void;
  createCircle: (name: string, memberIds: string[]) => CircleComposite;
  getFriendFridgeItems: (friendId: string) => FridgeItemRow[];
  getUserExpiringItems: (hoursThreshold?: number) => FridgeItemRow[];
  getCircleExpiringItems: (circleId: string, hoursThreshold?: number) => FridgeItemRow[];
  generateSoloWasteRecipe: () => Promise<string>;
  generateCircleMealRecipe: (circleId: string) => Promise<string>;
  rsvpRecipe: (recipeId: string, userId: string) => void;
  getRecipe: (id: string) => RecipeComposite | undefined;
}

const CURRENT_USER_ID = '00000000-0000-0000-0000-000000000001';
const SAM_ID = '00000000-0000-0000-0000-000000000002';
const JORDAN_ID = '00000000-0000-0000-0000-000000000003';
const TAYLOR_ID = '00000000-0000-0000-0000-000000000004';

const initialCurrentUser: ProfileRow = {
  id: CURRENT_USER_ID,
  email: 'alex@example.com',
  username: 'alex_saves',
  display_name: 'Alex',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
  created_at: new Date(Date.now() - 60 * 24 * 36e5).toISOString(),
};

const initialFriends: ProfileRow[] = [
  {
    id: SAM_ID,
    email: 'sam@example.com',
    username: 'sam_cooks',
    display_name: 'Sam',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
    created_at: new Date(Date.now() - 50 * 24 * 36e5).toISOString(),
  },
  {
    id: JORDAN_ID,
    email: 'jordan@example.com',
    username: 'jordan_eats',
    display_name: 'Jordan',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    created_at: new Date(Date.now() - 40 * 24 * 36e5).toISOString(),
  },
  {
    id: TAYLOR_ID,
    email: 'taylor@example.com',
    username: 'taylor_chef',
    display_name: 'Taylor',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    created_at: new Date(Date.now() - 30 * 24 * 36e5).toISOString(),
  },
];

const now = Date.now();
const hourMs = 36e5;
const dayMs = 24 * hourMs;

const initialShoppingTrips: ShoppingTripRow[] = [
  {
    id: 'trip-1',
    user_id: CURRENT_USER_ID,
    store_name: 'Costco Wholesale',
    trip_date: new Date(now - 17 * dayMs).toISOString(),
    total_cost: 68.45,
    item_count: 5,
    created_at: new Date(now - 17 * dayMs).toISOString(),
  },
  {
    id: 'trip-2',
    user_id: CURRENT_USER_ID,
    store_name: 'Trader Joe’s',
    trip_date: new Date(now - 10 * dayMs).toISOString(),
    total_cost: 42.18,
    item_count: 4,
    created_at: new Date(now - 10 * dayMs).toISOString(),
  },
  {
    id: 'trip-3',
    user_id: CURRENT_USER_ID,
    store_name: 'Whole Foods Market',
    trip_date: new Date(now - 3 * dayMs).toISOString(),
    total_cost: 29.85,
    item_count: 4,
    created_at: new Date(now - 3 * dayMs).toISOString(),
  },
];

const initialFridgeItems: FridgeItemRow[] = [
  // Alex's items
  {
    id: 'item-alex-1',
    user_id: CURRENT_USER_ID,
    shopping_trip_id: 'trip-3',
    name: 'Organic Baby Spinach',
    category: 'Produce',
    price: 2.99,
    quantity: '1 bag',
    date_bought: new Date(now - 3 * dayMs).toISOString(),
    expires_at: new Date(now + 22 * hourMs).toISOString(), // ~22h left
    shelf_life_days: 4,
    status: 'expiring',
    created_at: new Date(now - 3 * dayMs).toISOString(),
  },
  {
    id: 'item-alex-2',
    user_id: CURRENT_USER_ID,
    shopping_trip_id: 'trip-3',
    name: 'Boneless Chicken Thighs',
    category: 'Meat',
    price: 7.49,
    quantity: '1.2 lbs',
    date_bought: new Date(now - 2 * dayMs).toISOString(),
    expires_at: new Date(now + 18 * hourMs).toISOString(), // ~18h left
    shelf_life_days: 3,
    status: 'expiring',
    created_at: new Date(now - 2 * dayMs).toISOString(),
  },
  {
    id: 'item-alex-3',
    user_id: CURRENT_USER_ID,
    shopping_trip_id: 'trip-3',
    name: 'Heavy Whipping Cream',
    category: 'Dairy',
    price: 3.69,
    quantity: '1 pint',
    date_bought: new Date(now - 3 * dayMs).toISOString(),
    expires_at: new Date(now + 38 * hourMs).toISOString(), // ~38h left
    shelf_life_days: 5,
    status: 'expiring',
    created_at: new Date(now - 3 * dayMs).toISOString(),
  },
  {
    id: 'item-alex-4',
    user_id: CURRENT_USER_ID,
    shopping_trip_id: 'trip-2',
    name: 'Greek Yogurt Plain',
    category: 'Dairy',
    price: 5.49,
    quantity: '32 oz',
    date_bought: new Date(now - 10 * dayMs).toISOString(),
    expires_at: new Date(now + 5 * dayMs).toISOString(),
    shelf_life_days: 15,
    status: 'fresh',
    created_at: new Date(now - 10 * dayMs).toISOString(),
  },
  {
    id: 'item-alex-5',
    user_id: CURRENT_USER_ID,
    shopping_trip_id: 'trip-2',
    name: 'Sourdough Bread',
    category: 'Bakery',
    price: 4.25,
    quantity: '1 loaf',
    date_bought: new Date(now - 2 * dayMs).toISOString(),
    expires_at: new Date(now + 4 * dayMs).toISOString(),
    shelf_life_days: 6,
    status: 'fresh',
    created_at: new Date(now - 2 * dayMs).toISOString(),
  },

  // Sam's items (for friend fridge & circles)
  {
    id: 'item-sam-1',
    user_id: SAM_ID,
    shopping_trip_id: null,
    name: 'Crimini Mushrooms',
    category: 'Produce',
    price: 3.29,
    quantity: '8 oz',
    date_bought: new Date(now - 3 * dayMs).toISOString(),
    expires_at: new Date(now + 24 * hourMs).toISOString(),
    shelf_life_days: 4,
    status: 'expiring',
    created_at: new Date(now - 3 * dayMs).toISOString(),
  },
  {
    id: 'item-sam-2',
    user_id: SAM_ID,
    shopping_trip_id: null,
    name: 'Red Bell Peppers',
    category: 'Produce',
    price: 2.89,
    quantity: '2 pcs',
    date_bought: new Date(now - 4 * dayMs).toISOString(),
    expires_at: new Date(now + 42 * hourMs).toISOString(),
    shelf_life_days: 6,
    status: 'expiring',
    created_at: new Date(now - 4 * dayMs).toISOString(),
  },
  {
    id: 'item-sam-3',
    user_id: SAM_ID,
    shopping_trip_id: null,
    name: 'Sharp Cheddar Cheese',
    category: 'Dairy',
    price: 4.99,
    quantity: '1 block',
    date_bought: new Date(now - 5 * dayMs).toISOString(),
    expires_at: new Date(now + 12 * dayMs).toISOString(),
    shelf_life_days: 20,
    status: 'fresh',
    created_at: new Date(now - 5 * dayMs).toISOString(),
  },

  // Jordan's items
  {
    id: 'item-jordan-1',
    user_id: JORDAN_ID,
    shopping_trip_id: null,
    name: 'Fresh Basil Bunch',
    category: 'Produce',
    price: 2.49,
    quantity: '1 bunch',
    date_bought: new Date(now - 2 * dayMs).toISOString(),
    expires_at: new Date(now + 28 * hourMs).toISOString(),
    shelf_life_days: 3,
    status: 'expiring',
    created_at: new Date(now - 2 * dayMs).toISOString(),
  },
  {
    id: 'item-jordan-2',
    user_id: JORDAN_ID,
    shopping_trip_id: null,
    name: 'Atlantic Salmon Fillet',
    category: 'Meat',
    price: 9.99,
    quantity: '0.8 lbs',
    date_bought: new Date(now - 1 * dayMs).toISOString(),
    expires_at: new Date(now + 30 * hourMs).toISOString(),
    shelf_life_days: 2,
    status: 'expiring',
    created_at: new Date(now - 1 * dayMs).toISOString(),
  },
];

const initialCircles: CircleComposite[] = [
  {
    id: 'circle-1',
    name: 'Pine Street Supper Club',
    createdBy: CURRENT_USER_ID,
    memberIds: [CURRENT_USER_ID, SAM_ID, JORDAN_ID],
    members: [initialCurrentUser, initialFriends[0], initialFriends[1]],
  },
];

const initialRecipes: RecipeComposite[] = [
  {
    id: 'rec-sample-1',
    title: 'Creamy Skillet Chicken & Braised Greens',
    cookTime: '25 mins',
    isCollaborative: true,
    circleId: 'circle-1',
    circleName: 'Pine Street Supper Club',
    focusExpiringItems: ['Organic Baby Spinach', 'Boneless Chicken Thighs', 'Crimini Mushrooms'],
    ingredients: [
      {
        id: 'ing-1',
        recipe_id: 'rec-sample-1',
        item_name: 'Organic Baby Spinach',
        quantity: '1 bag',
        owner_id: CURRENT_USER_ID,
        owner_name: 'Alex',
        is_expiring_item: true,
      },
      {
        id: 'ing-2',
        recipe_id: 'rec-sample-1',
        item_name: 'Boneless Chicken Thighs',
        quantity: '1.2 lbs',
        owner_id: CURRENT_USER_ID,
        owner_name: 'Alex',
        is_expiring_item: true,
      },
      {
        id: 'ing-3',
        recipe_id: 'rec-sample-1',
        item_name: 'Crimini Mushrooms',
        quantity: '8 oz',
        owner_id: SAM_ID,
        owner_name: 'Sam',
        is_expiring_item: true,
      },
    ],
    cookingTasks: [
      {
        id: 'task-1',
        recipe_id: 'rec-sample-1',
        step_number: 1,
        instruction: 'Wash and slice mushrooms and spinach - Alex',
        assigned_to_id: CURRENT_USER_ID,
        assigned_to_name: 'Alex',
      },
      {
        id: 'task-2',
        recipe_id: 'rec-sample-1',
        step_number: 2,
        instruction: 'Sear chicken thighs with olive oil and garlic - Sam',
        assigned_to_id: SAM_ID,
        assigned_to_name: 'Sam',
      },
      {
        id: 'task-3',
        recipe_id: 'rec-sample-1',
        step_number: 3,
        instruction: 'Stir in heavy cream and wilt spinach - Jordan',
        assigned_to_id: JORDAN_ID,
        assigned_to_name: 'Jordan',
      },
    ],
    projectedImpact: {
      foodRescuedGrams: 980,
      dollarsSaved: 13.77,
    },
    rsvps: [CURRENT_USER_ID, SAM_ID],
    createdAt: new Date(now - 2 * dayMs).toISOString(),
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser] = useState<ProfileRow>(initialCurrentUser);
  const [friends] = useState<ProfileRow[]>(initialFriends);
  const [followingFriendIds, setFollowingFriendIds] = useState<string[]>([SAM_ID, JORDAN_ID]);
  const [circles, setCircles] = useState<CircleComposite[]>(initialCircles);
  const [fridgeItems, setFridgeItems] = useState<FridgeItemRow[]>(initialFridgeItems);
  const [shoppingTrips, setShoppingTrips] = useState<ShoppingTripRow[]>(initialShoppingTrips);
  const [recipes, setRecipes] = useState<RecipeComposite[]>(initialRecipes);

  /**
   * Receipt Scanning Intake:
   * Adds trip, estimates expiration for every item via LLM, and populates fridge.
   */
  const addShoppingTripFromReceipt = async (receipt: ScannedReceiptResult) => {
    const tripId = `trip-${Date.now()}`;
    const newTrip: ShoppingTripRow = {
      id: tripId,
      user_id: currentUser.id,
      store_name: receipt.storeName,
      trip_date: receipt.tripDate,
      total_cost: receipt.totalCost,
      item_count: receipt.items.length,
      created_at: new Date().toISOString(),
    };

    // Calculate LLM expiration estimation for each item in parallel
    const newItems: FridgeItemRow[] = await Promise.all(
      receipt.items.map(async (item, idx) => {
        const { expiresAt, shelfLifeDays } = await estimateShelfLife(
          item.name,
          item.category,
          receipt.tripDate
        );
        const hoursLeft = (new Date(expiresAt).getTime() - Date.now()) / 36e5;
        const status: 'fresh' | 'expiring' = hoursLeft <= 48 ? 'expiring' : 'fresh';

        return {
          id: `item-${Date.now()}-${idx}`,
          user_id: currentUser.id,
          shopping_trip_id: tripId,
          name: item.name,
          category: item.category,
          price: item.price,
          quantity: item.quantity || '1 pack',
          date_bought: receipt.tripDate,
          expires_at: expiresAt,
          shelf_life_days: shelfLifeDays,
          status,
          created_at: new Date().toISOString(),
        };
      })
    );

    setShoppingTrips((prev) => [newTrip, ...prev]);
    setFridgeItems((prev) => [...newItems, ...prev]);
  };

  /**
   * Quick Manual Item Add:
   * Uses LLM to estimate expiration if not manually specified.
   */
  const addManualFridgeItem = async (
    name: string,
    price: number,
    dateBoughtIso: string,
    category: string = 'General',
    customShelfLifeDays?: number
  ) => {
    let shelfLifeDays = customShelfLifeDays || 0;
    let expiresAt: string;

    if (shelfLifeDays > 0) {
      expiresAt = new Date(
        new Date(dateBoughtIso).getTime() + shelfLifeDays * dayMs
      ).toISOString();
    } else {
      const estimate = await estimateShelfLife(name, category, dateBoughtIso);
      shelfLifeDays = estimate.shelfLifeDays;
      expiresAt = estimate.expiresAt;
    }

    const hoursLeft = (new Date(expiresAt).getTime() - Date.now()) / 36e5;

    const newItem: FridgeItemRow = {
      id: `item-${Date.now()}`,
      user_id: currentUser.id,
      shopping_trip_id: null,
      name,
      category,
      price: price > 0 ? price : 3.50,
      quantity: '1 item',
      date_bought: dateBoughtIso,
      expires_at: expiresAt,
      shelf_life_days: shelfLifeDays,
      status: hoursLeft <= 48 ? 'expiring' : 'fresh',
      created_at: new Date().toISOString(),
    };

    setFridgeItems((prev) => [newItem, ...prev]);
  };

  const removeFridgeItem = (id: string) => {
    setFridgeItems((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleFollowFriend = (friendId: string) => {
    setFollowingFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const createCircle = (name: string, memberIds: string[]): CircleComposite => {
    const circleId = `circle-${Date.now()}`;
    const allMemberIds = Array.from(new Set([currentUser.id, ...memberIds]));
    const memberProfiles = [
      currentUser,
      ...friends.filter((f) => allMemberIds.includes(f.id)),
    ];

    const newCircle: CircleComposite = {
      id: circleId,
      name,
      createdBy: currentUser.id,
      memberIds: allMemberIds,
      members: memberProfiles,
    };

    setCircles((prev) => [newCircle, ...prev]);
    return newCircle;
  };

  const getFriendFridgeItems = (friendId: string): FridgeItemRow[] => {
    return fridgeItems.filter((item) => item.user_id === friendId);
  };

  const getUserExpiringItems = (hoursThreshold: number = 72): FridgeItemRow[] => {
    const currentTime = Date.now();
    return fridgeItems.filter((item) => {
      if (item.user_id !== currentUser.id) return false;
      const hours = (new Date(item.expires_at).getTime() - currentTime) / 36e5;
      return hours > 0 && hours <= hoursThreshold;
    });
  };

  const getCircleExpiringItems = (
    circleId: string,
    hoursThreshold: number = 72
  ): FridgeItemRow[] => {
    const circle = circles.find((c) => c.id === circleId);
    if (!circle) return [];

    const currentTime = Date.now();
    return fridgeItems.filter((item) => {
      if (!circle.memberIds.includes(item.user_id)) return false;
      const hours = (new Date(item.expires_at).getTime() - currentTime) / 36e5;
      return hours > 0 && hours <= hoursThreshold;
    });
  };

  /**
   * LLM Solo Waste-Reduction Recipe Trigger
   */
  const generateSoloWasteRecipe = async (): Promise<string> => {
    const expiring = getUserExpiringItems(72);
    const itemsToUse = expiring.length > 0 ? expiring : fridgeItems.filter((i) => i.user_id === currentUser.id).slice(0, 3);
    const recipe = await llmGenerateSoloRecipe(itemsToUse, currentUser);
    setRecipes((prev) => [recipe, ...prev]);
    return recipe.id;
  };

  /**
   * LLM Circle Meal Recipe Trigger
   */
  const generateCircleMealRecipe = async (circleId: string): Promise<string> => {
    const circle = circles.find((c) => c.id === circleId);
    const circleName = circle ? circle.name : 'Potluck Circle';
    const members = circle ? circle.members : [currentUser];

    const expiring = getCircleExpiringItems(circleId, 72);
    const itemsToUse = expiring.length > 0 ? expiring : fridgeItems.filter((i) => circle?.memberIds.includes(i.user_id)).slice(0, 4);

    const recipe = await llmGenerateCircleMealRecipe(
      circleId,
      circleName,
      itemsToUse,
      members,
      currentUser
    );

    setRecipes((prev) => [recipe, ...prev]);
    return recipe.id;
  };

  const rsvpRecipe = (recipeId: string, userId: string) => {
    setRecipes((prev) =>
      prev.map((recipe) => {
        if (recipe.id !== recipeId) return recipe;
        const already = recipe.rsvps.includes(userId);
        return {
          ...recipe,
          rsvps: already
            ? recipe.rsvps.filter((id) => id !== userId)
            : [...recipe.rsvps, userId],
        };
      })
    );
  };

  const getRecipe = (id: string): RecipeComposite | undefined => {
    return recipes.find((r) => r.id === id);
  };

  const value = useMemo(
    () => ({
      currentUser,
      friends,
      followingFriendIds,
      circles,
      fridgeItems,
      shoppingTrips,
      recipes,
      addShoppingTripFromReceipt,
      addManualFridgeItem,
      removeFridgeItem,
      toggleFollowFriend,
      createCircle,
      getFriendFridgeItems,
      getUserExpiringItems,
      getCircleExpiringItems,
      generateSoloWasteRecipe,
      generateCircleMealRecipe,
      rsvpRecipe,
      getRecipe,
    }),
    [
      currentUser,
      friends,
      followingFriendIds,
      circles,
      fridgeItems,
      shoppingTrips,
      recipes,
    ]
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
