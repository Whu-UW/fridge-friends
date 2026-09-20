import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
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
  generateDinnerPartyRecipe,
  generateTopSoloRecipes as llmGenerateTopSoloRecipes,
  generateTopDinnerPartyRecipes as llmGenerateTopDinnerPartyRecipes,
} from '../services/llmService';
import { ScannedReceiptResult } from '../services/receiptOcrService';
import {
  backendApi,
  toFrontendFridgeItem,
  toBackendGroceryItemCreate,
  toFrontendProfile,
  toFrontendFriend,
  BackendUser,
  ConnectionDiagnosticResult,
} from '../services/backendApi';

export interface FriendEntry extends ProfileRow {
  status: 'accepted' | 'pending';
}

export interface FeastFriendStatus {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  status: 'accepted' | 'pending' | 'declined';
}

export interface FeastCandidateRecipe {
  recipe: RecipeComposite;
  votes: string[]; // array of userIds who voted for this candidate recipe
}

export interface FeastInvite {
  id: string;
  partyName: string;
  hostId: string;
  hostName: string;
  candidateRecipes: FeastCandidateRecipe[];
  selectedRecipeId?: string; // Confirmed winning recipe ID
  recipeId: string;
  recipeTitle: string;
  cookTime: string;
  foodRescuedGrams: number;
  dollarsSaved: number;
  invitedFriends: FeastFriendStatus[];
  status: 'voting' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

interface AppContextType {
  currentUser: ProfileRow;
  friends: FriendEntry[];
  feasts: FeastInvite[];
  followingFriendIds: string[];
  circles: CircleComposite[];
  fridgeItems: FridgeItemRow[];
  shoppingTrips: ShoppingTripRow[];
  recipes: RecipeComposite[];
  // Backend State & Data Source Tracking
  backendConnected: boolean;
  isSyncing: boolean;
  backendSyncAttempted: boolean;
  backendLatency: number | null;
  backendError: string | null;
  activeBackendUserId: number;
  availableBackendUsers: BackendUser[];
  isPantryHardcoded: boolean;
  isFriendsHardcoded: boolean;
  isFeastsHardcoded: boolean;
  isRecipesHardcoded: boolean;
  switchBackendUser: (userId: number) => Promise<void>;
  refreshBackendData: (targetUserId?: number) => Promise<void>;
  testBackendDiagnostics: () => Promise<ConnectionDiagnosticResult>;
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
  addFriend: (username: string, displayName?: string) => void;
  acceptFriendRequest: (friendId: string) => void;
  removeFriend: (friendId: string) => void;
  createDinnerPartyRecipe: (
    title: string,
    selectedItemIds: string[],
    invitedFriendIds: string[]
  ) => Promise<string>;
  createCircle: (name: string, memberIds: string[]) => CircleComposite;
  getFriendFridgeItems: (friendId: string) => FridgeItemRow[];
  getUserExpiringItems: (hoursThreshold?: number) => FridgeItemRow[];
  getCircleExpiringItems: (circleId: string, hoursThreshold?: number) => FridgeItemRow[];
  generateSoloWasteRecipe: () => Promise<string>;
  generateCircleMealRecipe: (circleId: string) => Promise<string>;
  generateTopSoloRecipes: () => Promise<RecipeComposite[]>;
  generateTopDinnerPartyRecipes: (
    partyName: string,
    invitedFriendIds: string[]
  ) => Promise<RecipeComposite[]>;
  createFeastInvite: (
    recipes: RecipeComposite[] | RecipeComposite,
    partyName: string,
    invitedFriendIds: string[]
  ) => FeastInvite;
  voteOnFeastRecipe: (feastId: string, recipeId: string, userId: string) => void;
  simulateFriendVote: (feastId: string, friendId: string, recipeId: string) => void;
  confirmFeastRecipe: (feastId: string, recipeId: string) => void;
  reopenFeastVoting: (feastId: string) => void;
  toggleFeastFriendRsvp: (feastId: string, friendId: string) => void;
  cancelFeastInvite: (feastId: string) => void;
  updateProfile: (updates: {
    display_name?: string;
    avatar_url?: string;
    email?: string;
    username?: string;
  }) => void;
  rsvpRecipe: (recipeId: string, userId: string) => void;
  getRecipe: (id: string) => RecipeComposite | undefined;
}

const CURRENT_USER_ID = '14'; // Sam Perera (Default Backend User ID)
const NADIA_ID = '15';
const THEO_ID = '16';
const MEI_ID = '17';
const OBI_ID = '18';
const SAM_ID = CURRENT_USER_ID;
const JORDAN_ID = THEO_ID;
const TAYLOR_ID = OBI_ID;

const initialCurrentUser: ProfileRow = {
  id: CURRENT_USER_ID,
  email: 'sam@grocerydemo.dev',
  username: 'sam_perera',
  display_name: 'Sam Perera',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
  created_at: new Date(Date.now() - 60 * 24 * 36e5).toISOString(),
};

const initialFriends: FriendEntry[] = [
  {
    id: NADIA_ID,
    email: 'nadia@grocerydemo.dev',
    username: 'nadia_khan',
    display_name: 'Nadia Khan',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
    created_at: new Date(Date.now() - 50 * 24 * 36e5).toISOString(),
    status: 'accepted',
  },
  {
    id: THEO_ID,
    email: 'theo@grocerydemo.dev',
    username: 'theo_alvarez',
    display_name: 'Theo Alvarez',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    created_at: new Date(Date.now() - 40 * 24 * 36e5).toISOString(),
    status: 'accepted',
  },
  {
    id: OBI_ID,
    email: 'obi@grocerydemo.dev',
    username: 'obi_nwachukwu',
    display_name: 'Obi Nwachukwu',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
    created_at: new Date(Date.now() - 30 * 24 * 36e5).toISOString(),
    status: 'pending',
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
  {
    id: 'rec-sample-2',
    title: 'Herb-Seared Salmon with Wilted Greens',
    cookTime: '20 mins',
    isCollaborative: true,
    circleId: 'circle-1',
    circleName: 'Pine Street Supper Club',
    focusExpiringItems: ['Atlantic Salmon Fillet', 'Fresh Basil Bunch', 'Organic Baby Spinach'],
    ingredients: [
      {
        id: 'ing-201',
        recipe_id: 'rec-sample-2',
        item_name: 'Atlantic Salmon Fillet',
        quantity: '0.8 lbs',
        owner_id: JORDAN_ID,
        owner_name: 'Theo',
        is_expiring_item: true,
      },
      {
        id: 'ing-202',
        recipe_id: 'rec-sample-2',
        item_name: 'Organic Baby Spinach',
        quantity: '1 bag',
        owner_id: CURRENT_USER_ID,
        owner_name: 'Sam',
        is_expiring_item: true,
      },
      {
        id: 'ing-203',
        recipe_id: 'rec-sample-2',
        item_name: 'Fresh Basil Bunch',
        quantity: '1 bunch',
        owner_id: JORDAN_ID,
        owner_name: 'Theo',
        is_expiring_item: true,
      },
    ],
    cookingTasks: [
      {
        id: 'task-201',
        recipe_id: 'rec-sample-2',
        step_number: 1,
        instruction: 'Sear salmon fillet in cast iron skillet - Theo',
        assigned_to_id: JORDAN_ID,
        assigned_to_name: 'Theo',
      },
      {
        id: 'task-202',
        recipe_id: 'rec-sample-2',
        step_number: 2,
        instruction: 'Sauté baby spinach with garlic and olive oil - Sam',
        assigned_to_id: CURRENT_USER_ID,
        assigned_to_name: 'Sam',
      },
      {
        id: 'task-203',
        recipe_id: 'rec-sample-2',
        step_number: 3,
        instruction: 'Garnish with fresh torn basil leaves - Nadia',
        assigned_to_id: NADIA_ID,
        assigned_to_name: 'Nadia',
      },
    ],
    projectedImpact: {
      foodRescuedGrams: 750,
      dollarsSaved: 16.48,
    },
    rsvps: [CURRENT_USER_ID, NADIA_ID],
    createdAt: new Date(now - 1 * dayMs).toISOString(),
  },
];

const initialFeasts: FeastInvite[] = [
  {
    id: 'feast-init-1',
    partyName: "Sam's Friday Feast Mode",
    hostId: CURRENT_USER_ID,
    hostName: 'Sam Perera',
    candidateRecipes: [
      {
        recipe: initialRecipes[0],
        votes: [CURRENT_USER_ID, NADIA_ID],
      },
      {
        recipe: initialRecipes[1],
        votes: [THEO_ID],
      },
    ],
    selectedRecipeId: undefined,
    recipeId: initialRecipes[0].id,
    recipeTitle: initialRecipes[0].title,
    cookTime: initialRecipes[0].cookTime,
    foodRescuedGrams: initialRecipes[0].projectedImpact.foodRescuedGrams,
    dollarsSaved: initialRecipes[0].projectedImpact.dollarsSaved,
    invitedFriends: [
      {
        id: NADIA_ID,
        name: 'Nadia Khan',
        username: 'nadia_khan',
        avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
        status: 'accepted',
      },
      {
        id: THEO_ID,
        name: 'Theo Alvarez',
        username: 'theo_alvarez',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        status: 'pending',
      },
    ],
    status: 'voting',
    createdAt: new Date(Date.now() - 4 * 36e5).toISOString(),
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ProfileRow>(initialCurrentUser);
  const [friends, setFriends] = useState<FriendEntry[]>(initialFriends);
  const [feasts, setFeasts] = useState<FeastInvite[]>(initialFeasts);
  const [followingFriendIds, setFollowingFriendIds] = useState<string[]>([SAM_ID, JORDAN_ID]);
  const [circles, setCircles] = useState<CircleComposite[]>(initialCircles);
  const [fridgeItems, setFridgeItems] = useState<FridgeItemRow[]>(initialFridgeItems);
  const [shoppingTrips, setShoppingTrips] = useState<ShoppingTripRow[]>(initialShoppingTrips);
  const [recipes, setRecipes] = useState<RecipeComposite[]>(initialRecipes);

  // Backend Live State
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [backendSyncAttempted, setBackendSyncAttempted] = useState<boolean>(false);
  const [backendLatency, setBackendLatency] = useState<number | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [activeBackendUserId, setActiveBackendUserId] = useState<number>(14); // Default to Sam Perera (ID 14)
  const [availableBackendUsers, setAvailableBackendUsers] = useState<BackendUser[]>([]);

  // Computed Data Source Flags
  const isPantryHardcoded = !backendConnected;
  const isFriendsHardcoded = !backendConnected;
  const isFeastsHardcoded = true; // Backend database currently has no feasts table
  const isRecipesHardcoded = true; // Recipes are generated on-the-fly via LLM

  /**
   * Sync data from FastAPI backend
   */
  const refreshBackendData = async (targetUserId: number = activeBackendUserId) => {
    setIsSyncing(true);
    try {
      const health = await backendApi.checkHealth();
      setBackendConnected(health.status === 'ok');
      setBackendLatency(health.latencyMs);
      setBackendError(null);

      // 1. Fetch available users
      const users = await backendApi.getUsers(20);
      setAvailableBackendUsers(users);

      // 2. Bind current user profile
      const foundUser = users.find((u) => u.id === targetUserId) || users[0];
      if (foundUser) {
        setCurrentUser(toFrontendProfile(foundUser));
        targetUserId = foundUser.id;
        setActiveBackendUserId(foundUser.id);
      }

      // 3. Fetch pantry items for user ONLY from database
      const userGroceries = await backendApi.getGroceryItems(targetUserId);
      const mappedGroceries = userGroceries.map(toFrontendFridgeItem);

      // 4. Fetch collaborative expiring items for friends
      try {
        const expiringWithFriends = await backendApi.getExpiringItems(targetUserId, 14, true);
        const friendItems = expiringWithFriends
          .filter((item) => item.owner_id !== targetUserId)
          .map(toFrontendFridgeItem);

        const allItemsMap = new Map<string, FridgeItemRow>();
        mappedGroceries.forEach((item) => allItemsMap.set(item.id, item));
        friendItems.forEach((item) => allItemsMap.set(item.id, item));
        setFridgeItems(Array.from(allItemsMap.values()));
      } catch {
        setFridgeItems(mappedGroceries);
      }

      // 5. Fetch friends ONLY from database
      const backendFriends = await backendApi.getFriends(targetUserId);
      if (backendFriends && backendFriends.length > 0) {
        const mappedFriends = backendFriends.map(toFrontendFriend);
        setFriends(mappedFriends);
        setFollowingFriendIds(
          mappedFriends.filter((f) => f.status === 'accepted').map((f) => f.id)
        );
      }
    } catch (err: any) {
      console.warn('Backend sync warning (fallback to offline hardcoded state):', err.message);
      setBackendConnected(false);
      setBackendError(err.message || 'Could not connect to backend');
      // If database not accessible, keep hardcoded fallback
      setFridgeItems(initialFridgeItems);
      setFriends(initialFriends);
    } finally {
      setIsSyncing(false);
      setBackendSyncAttempted(true);
    }
  };

  useEffect(() => {
    refreshBackendData(activeBackendUserId);
  }, [activeBackendUserId]);

  const switchBackendUser = async (userId: number) => {
    setActiveBackendUserId(userId);
    await refreshBackendData(userId);
  };

  const testBackendDiagnostics = async () => {
    return await backendApi.runDiagnostics(activeBackendUserId);
  };

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

    // Backend sync: persist items to backend
    if (backendConnected && activeBackendUserId) {
      for (const item of receipt.items) {
        try {
          const payload = toBackendGroceryItemCreate(
            item.name,
            item.category,
            undefined,
            receipt.tripDate,
            item.quantity
          );
          await backendApi.createGroceryItem(activeBackendUserId, payload);
        } catch (err) {
          console.warn('Error syncing receipt item to backend:', err);
        }
      }
    }
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
      id: `temp-${Date.now()}`,
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

    // Backend sync: persist to backend
    if (backendConnected && activeBackendUserId) {
      try {
        const payload = toBackendGroceryItemCreate(
          name,
          category,
          expiresAt,
          dateBoughtIso,
          '1 item'
        );
        const created = await backendApi.createGroceryItem(activeBackendUserId, payload);
        // Replace temp item ID with backend ID
        setFridgeItems((prev) =>
          prev.map((it) => (it.id === newItem.id ? toFrontendFridgeItem(created) : it))
        );
      } catch (err) {
        console.warn('Could not persist grocery item to backend:', err);
      }
    }
  };

  const removeFridgeItem = (id: string) => {
    setFridgeItems((prev) => prev.filter((item) => item.id !== id));
    // If item has numeric backend ID, delete from database
    if (!isNaN(Number(id)) && backendConnected) {
      backendApi.deleteGroceryItem(Number(id)).catch((err) => {
        console.warn('Could not delete item from backend:', err);
      });
    }
  };

  const toggleFollowFriend = (friendId: string) => {
    setFollowingFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const addFriend = (usernameOrId: string, displayName?: string) => {
    const numericTargetId = Number(usernameOrId);
    if (!isNaN(numericTargetId) && backendConnected) {
      backendApi
        .addFriend(activeBackendUserId, numericTargetId)
        .then((added) => {
          const mapped = toFrontendFriend(added);
          setFriends((prev) => [...prev.filter((f) => f.id !== mapped.id), mapped]);
        })
        .catch((err) => {
          console.warn('Error adding friend on backend:', err);
        });
      return;
    }

    const cleanUsername = usernameOrId.trim().toLowerCase().replace('@', '');
    if (!cleanUsername) return;

    // Check if matching backend user exists
    const matchingBackendUser = availableBackendUsers.find(
      (u) =>
        u.email.toLowerCase().includes(cleanUsername) ||
        u.name.toLowerCase().includes(cleanUsername)
    );
    if (matchingBackendUser && backendConnected) {
      backendApi
        .addFriend(activeBackendUserId, matchingBackendUser.id)
        .then((added) => {
          const mapped = toFrontendFriend(added);
          setFriends((prev) => [...prev.filter((f) => f.id !== mapped.id), mapped]);
        })
        .catch((err) => {
          console.warn('Backend add friend fallback:', err);
        });
      return;
    }

    const newFriendId = `friend-${Date.now()}`;
    const newFriend: FriendEntry = {
      id: newFriendId,
      email: `${cleanUsername}@example.com`,
      username: cleanUsername,
      display_name:
        displayName && displayName.trim()
          ? displayName.trim()
          : cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1),
      avatar_url:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    setFriends((prev) => [...prev, newFriend]);
    setFollowingFriendIds((prev) => [...prev, newFriendId]);
  };

  const acceptFriendRequest = (friendId: string) => {
    setFriends((prev) =>
      prev.map((f) =>
        f.id === friendId ? { ...f, status: 'accepted' as const } : f
      )
    );
    setFollowingFriendIds((prev) => Array.from(new Set([...prev, friendId])));

    if (!isNaN(Number(friendId)) && backendConnected) {
      backendApi
        .updateFriendship(activeBackendUserId, Number(friendId), 'accepted')
        .catch((err) => {
          console.warn('Could not accept friend on backend:', err);
        });
    }
  };

  const removeFriend = (friendId: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
    setFollowingFriendIds((prev) => prev.filter((id) => id !== friendId));

    if (!isNaN(Number(friendId)) && backendConnected) {
      backendApi.removeFriend(activeBackendUserId, Number(friendId)).catch((err) => {
        console.warn('Could not remove friend from backend:', err);
      });
    }
  };

  const createFeastInvite = (
    recipesOrRecipe: RecipeComposite[] | RecipeComposite,
    partyName: string,
    invitedFriendIds: string[]
  ): FeastInvite => {
    const inviteId = `feast-${Date.now()}`;
    const invitedFriendsList: FeastFriendStatus[] = friends
      .filter((f) => invitedFriendIds.includes(f.id))
      .map((f) => ({
        id: f.id,
        name: f.display_name,
        username: f.username,
        avatarUrl: f.avatar_url || '',
        status: 'pending' as const,
      }));

    const recipeList: RecipeComposite[] = Array.isArray(recipesOrRecipe)
      ? recipesOrRecipe
      : [recipesOrRecipe];

    const candidateRecipes: FeastCandidateRecipe[] = recipeList.map((rec) => ({
      recipe: rec,
      votes: [],
    }));

    const primaryRecipe = recipeList[0];

    const newFeast: FeastInvite = {
      id: inviteId,
      partyName:
        partyName && partyName.trim()
          ? partyName.trim()
          : `${currentUser.display_name}'s Feast Mode`,
      hostId: currentUser.id,
      hostName: currentUser.display_name,
      candidateRecipes,
      selectedRecipeId: undefined,
      recipeId: primaryRecipe?.id || '',
      recipeTitle: primaryRecipe?.title || 'Feast Recipes to Vote On',
      cookTime: primaryRecipe?.cookTime || '25-30 mins',
      foodRescuedGrams: primaryRecipe?.projectedImpact?.foodRescuedGrams || 0,
      dollarsSaved: primaryRecipe?.projectedImpact?.dollarsSaved || 0,
      invitedFriends: invitedFriendsList,
      status: 'voting',
      createdAt: new Date().toISOString(),
    };

    setFeasts((prev) => [newFeast, ...prev]);

    // Ensure all candidate recipes are available in recipes array for /recipe/[id] lookup
    setRecipes((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const missing = recipeList.filter((r) => !existingIds.has(r.id));
      return missing.length > 0 ? [...missing, ...prev] : prev;
    });

    return newFeast;
  };

  const voteOnFeastRecipe = (feastId: string, recipeId: string, userId: string) => {
    setFeasts((prev) =>
      prev.map((feast) => {
        if (feast.id !== feastId) return feast;

        const candidateTarget = feast.candidateRecipes.find(
          (c) => c.recipe.id === recipeId
        );
        const alreadyVoted = candidateTarget?.votes.includes(userId);

        const updatedCandidates = feast.candidateRecipes.map((cand) => {
          if (cand.recipe.id === recipeId) {
            return {
              ...cand,
              votes: alreadyVoted
                ? cand.votes.filter((id) => id !== userId)
                : Array.from(new Set([...cand.votes, userId])),
            };
          } else {
            return {
              ...cand,
              votes: cand.votes.filter((id) => id !== userId),
            };
          }
        });

        return {
          ...feast,
          candidateRecipes: updatedCandidates,
        };
      })
    );
  };

  const simulateFriendVote = (feastId: string, friendId: string, recipeId: string) => {
    voteOnFeastRecipe(feastId, recipeId, friendId);
  };

  const confirmFeastRecipe = (feastId: string, recipeId: string) => {
    setFeasts((prev) =>
      prev.map((feast) => {
        if (feast.id !== feastId) return feast;
        const candidate = feast.candidateRecipes.find((c) => c.recipe.id === recipeId);
        const chosenRecipe = candidate ? candidate.recipe : recipes.find((r) => r.id === recipeId);

        return {
          ...feast,
          selectedRecipeId: recipeId,
          recipeId: recipeId,
          recipeTitle: chosenRecipe?.title || feast.recipeTitle,
          cookTime: chosenRecipe?.cookTime || feast.cookTime,
          foodRescuedGrams: chosenRecipe?.projectedImpact?.foodRescuedGrams ?? feast.foodRescuedGrams,
          dollarsSaved: chosenRecipe?.projectedImpact?.dollarsSaved ?? feast.dollarsSaved,
          status: 'confirmed',
        };
      })
    );
  };

  const reopenFeastVoting = (feastId: string) => {
    setFeasts((prev) =>
      prev.map((feast) => {
        if (feast.id !== feastId) return feast;
        return {
          ...feast,
          selectedRecipeId: undefined,
          status: 'voting',
        };
      })
    );
  };

  const toggleFeastFriendRsvp = (feastId: string, friendId: string) => {
    setFeasts((prev) =>
      prev.map((f) => {
        if (f.id !== feastId) return f;
        const updatedFriends = f.invitedFriends.map((friend) => {
          if (friend.id !== friendId) return friend;
          const nextStatus =
            friend.status === 'accepted' ? 'pending' : 'accepted';
          return { ...friend, status: nextStatus as 'accepted' | 'pending' };
        });
        return {
          ...f,
          invitedFriends: updatedFriends,
        };
      })
    );
  };

  const cancelFeastInvite = (feastId: string) => {
    setFeasts((prev) => prev.filter((f) => f.id !== feastId));
  };

  const updateProfile = (updates: {
    display_name?: string;
    avatar_url?: string;
    email?: string;
    username?: string;
  }) => {
    setCurrentUser((prev) => ({
      ...prev,
      ...updates,
    }));

    if (backendConnected && activeBackendUserId) {
      backendApi
        .updateUser(activeBackendUserId, {
          name: updates.display_name,
          email: updates.email,
        })
        .catch((err) => {
          console.warn('Could not update user on backend:', err);
        });
    }
  };

  const createDinnerPartyRecipe = async (
    title: string,
    selectedItemIds: string[],
    invitedFriendIds: string[]
  ): Promise<string> => {
    const selectedItems = fridgeItems.filter((i) =>
      selectedItemIds.includes(i.id)
    );
    const invitedFriends = friends.filter((f) =>
      invitedFriendIds.includes(f.id)
    );

    const recipe = await generateDinnerPartyRecipe(
      title,
      selectedItems.length > 0
        ? selectedItems
        : fridgeItems.filter((i) => i.user_id === currentUser.id).slice(0, 3),
      invitedFriends,
      currentUser
    );

    setRecipes((prev) => [recipe, ...prev]);
    return recipe.id;
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

  const generateTopSoloRecipes = async (): Promise<RecipeComposite[]> => {
    const expiring = getUserExpiringItems(72);
    const itemsToUse =
      expiring.length > 0
        ? expiring
        : fridgeItems.filter((i) => i.user_id === currentUser.id).slice(0, 4);

    const generated = await llmGenerateTopSoloRecipes(itemsToUse, currentUser);
    setRecipes((prev) => [...generated, ...prev]);
    return generated;
  };

  const generateTopDinnerPartyRecipes = async (
    partyName: string,
    invitedFriendIds: string[]
  ): Promise<RecipeComposite[]> => {
    const userExpiring = getUserExpiringItems(72);
    const hostItems =
      userExpiring.length > 0
        ? userExpiring
        : fridgeItems.filter((i) => i.user_id === currentUser.id).slice(0, 3);

    const invitedFriends = friends.filter((f) => invitedFriendIds.includes(f.id));
    const friendsExpiring: FridgeItemRow[] = [];

    invitedFriends.forEach((friend) => {
      const friendItems = fridgeItems.filter((i) => i.user_id === friend.id);
      const expiring = friendItems.filter((i) => {
        const hours = (new Date(i.expires_at).getTime() - Date.now()) / 36e5;
        return hours <= 72 || i.status === 'expiring';
      });
      if (expiring.length > 0) {
        friendsExpiring.push(...expiring);
      } else if (friendItems.length > 0) {
        friendsExpiring.push(...friendItems.slice(0, 2));
      }
    });

    const generated = await llmGenerateTopDinnerPartyRecipes(
      partyName,
      hostItems,
      friendsExpiring,
      invitedFriends,
      currentUser
    );

    setRecipes((prev) => [...generated, ...prev]);
    return generated;
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
      feasts,
      backendConnected,
      isSyncing,
      backendSyncAttempted,
      backendLatency,
      backendError,
      activeBackendUserId,
      availableBackendUsers,
      isPantryHardcoded,
      isFriendsHardcoded,
      isFeastsHardcoded,
      isRecipesHardcoded,
      switchBackendUser,
      refreshBackendData,
      testBackendDiagnostics,
      addShoppingTripFromReceipt,
      addManualFridgeItem,
      removeFridgeItem,
      toggleFollowFriend,
      addFriend,
      acceptFriendRequest,
      removeFriend,
      createDinnerPartyRecipe,
      createCircle,
      getFriendFridgeItems,
      getUserExpiringItems,
      getCircleExpiringItems,
      generateSoloWasteRecipe,
      generateCircleMealRecipe,
      generateTopSoloRecipes,
      generateTopDinnerPartyRecipes,
      createFeastInvite,
      voteOnFeastRecipe,
      simulateFriendVote,
      confirmFeastRecipe,
      reopenFeastVoting,
      toggleFeastFriendRsvp,
      cancelFeastInvite,
      updateProfile,
      rsvpRecipe,
      getRecipe,
    }),
    [
      currentUser,
      friends,
      feasts,
      followingFriendIds,
      circles,
      fridgeItems,
      shoppingTrips,
      recipes,
      backendConnected,
      isSyncing,
      backendSyncAttempted,
      backendLatency,
      backendError,
      activeBackendUserId,
      availableBackendUsers,
      isPantryHardcoded,
      isFriendsHardcoded,
      isFeastsHardcoded,
      isRecipesHardcoded,
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
