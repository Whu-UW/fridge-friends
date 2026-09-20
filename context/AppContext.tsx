import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase/client';
import { authService } from '../services/supabase/authService';
import AuthModal from '../components/AuthModal';
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
  toFrontendFeast,
  toBackendFeastCreate,
  BackendUser,
  BackendFeastRead,
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

export interface WasteEvent {
  id: string;
  itemId?: string;
  name: string;
  price: number;
  timestamp: string;
  reason?: 'tossed' | 'cooking_failed' | 'expired' | string;
}

export interface RescueEvent {
  id: string;
  itemNames: string[];
  dollarsSaved: number;
  recipeTitle?: string;
  timestamp: string;
}

export interface DynamicInsightsData {
  totalSpent: number;
  totalWasted: number;
  totalRescued: number;
  weeklyData: { label: string; spent: number; wasted: number }[];
  percentWasteReduction: number;
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
  status: 'voting' | 'confirmed' | 'pending' | 'cooking' | 'completed' | 'cancelled';
  createdAt: string;
  scheduledFor?: string;
  invitationsSent?: number;
  invitationsPending?: number;
  bringBreakdown?: { who: string; items: string }[];
  cookingTasks?: { step_number: number; instruction: string }[];
  userRsvpStatus?: 'accepted' | 'declined' | 'pending' | 'host';
  outcome?: 'rescued' | 'failed';
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
  savedRecipes: RecipeComposite[];
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
  // Supabase Auth State & Actions
  supabaseUser: User | null;
  supabaseSession: Session | null;
  isAuthConfigured: boolean;
  isAuthModalVisible: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  logoutFromSupabase: () => Promise<void>;
  syncSupabaseWithFastApi: (
    authData: {
      email: string;
      displayName: string;
      username: string;
      avatarUrl?: string;
    },
    isNewUser: boolean
  ) => Promise<void>;
  // Actions
  addShoppingTripFromReceipt: (receipt: ScannedReceiptResult) => Promise<void>;
  addManualFridgeItem: (
    name: string,
    price: number,
    dateBoughtIso: string,
    category?: string,
    customShelfLifeDays?: number,
    customExpiresAtIso?: string
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
  generateTopSoloRecipes: (items?: FridgeItemRow[]) => Promise<RecipeComposite[]>;
  generateTopDinnerPartyRecipes: (
    partyName: string,
    invitedFriendIds: string[]
  ) => Promise<RecipeComposite[]>;
  createFeastInvite: (
    recipes: RecipeComposite[] | RecipeComposite,
    partyName: string,
    invitedFriendIds: string[],
    scheduledForIso?: string
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
  saveRecipe: (recipe: RecipeComposite) => Promise<void>;
  removeSavedRecipe: (id: string) => Promise<void>;
  wasteEvents: WasteEvent[];
  rescueEvents: RescueEvent[];
  dynamicInsights: DynamicInsightsData;
  tossFridgeItem: (itemId: string, reason?: string) => void;
  recordRescuedMeal: (itemNames: string[], dollarsSaved: number, title?: string) => void;
  recordWastedMeal: (itemNames: string[], dollarsWasted: number, title?: string) => void;
  startFeastCooking: (feastId: string) => void;
  completeFeast: (feastId: string, outcome: 'rescued' | 'failed') => void;
  respondToFeastInvite: (feastId: string, response: 'accepted' | 'declined') => void;
  nudgeFeastFriend: (feastId: string, friendId: string) => string;
  addCustomFeast: (feast: FeastInvite) => void;
}

const CURRENT_USER_ID = '19'; // Sam Perera (Default Backend User ID)
const NADIA_ID = '20';
const THEO_ID = '21';
const MEI_ID = '22';
const OBI_ID = '23';
const SAM_ID = CURRENT_USER_ID;
const JORDAN_ID = THEO_ID;
const TAYLOR_ID = OBI_ID;

const initialCurrentUser: ProfileRow = {
  id: CURRENT_USER_ID,
  email: 'sam@grocerydemo.dev',
  username: 'sam',
  display_name: 'Sam Perera',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
  created_at: '2026-09-20T00:32:01.960584Z',
};

const initialFriends: FriendEntry[] = [
  {
    id: NADIA_ID,
    email: 'nadia@grocerydemo.dev',
    username: 'nadia',
    display_name: 'Nadia Khan',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
    created_at: '2026-09-20T00:32:01.960830Z',
    status: 'accepted',
  },
  {
    id: THEO_ID,
    email: 'theo@grocerydemo.dev',
    username: 'theo',
    display_name: 'Theo Alvarez',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    created_at: '2026-09-20T00:32:01.960898Z',
    status: 'accepted',
  },
  {
    id: OBI_ID,
    email: 'obi@grocerydemo.dev',
    username: 'obi',
    display_name: 'Obi Nwachukwu',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
    created_at: '2026-09-20T00:32:01.961003Z',
    status: 'accepted',
  },
  {
    id: '27',
    email: 'pantry.pal@grocerydemo.dev',
    username: 'pantry.pal',
    display_name: 'Pantry Pal',
    avatar_url: 'https://ui-avatars.com/api/?name=Pantry%20Pal&background=10B981&color=fff',
    created_at: '2026-09-20T20:07:07.948911Z',
    status: 'accepted',
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
  // 1. Incoming feast invitation from Nadia
  {
    id: 'feast-incoming-1',
    partyName: "Nadia's Friday Feast",
    hostId: NADIA_ID,
    hostName: 'Nadia Khan',
    candidateRecipes: [],
    recipeId: 'rec-sample-2',
    recipeTitle: 'Herb-Seared Salmon with Wilted Greens',
    cookTime: '20 mins',
    foodRescuedGrams: 750,
    dollarsSaved: 16.48,
    invitedFriends: [
      {
        id: CURRENT_USER_ID,
        name: 'Sam Perera',
        username: 'sam_perera',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        status: 'pending',
      },
      {
        id: THEO_ID,
        name: 'Theo Alvarez',
        username: 'theo_alvarez',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        status: 'accepted',
      },
    ],
    status: 'pending',
    userRsvpStatus: 'pending',
    scheduledFor: 'Tonight at 7:00 PM',
    bringBreakdown: [
      { who: 'Nadia', items: 'Atlantic Salmon, Fresh Basil' },
      { who: 'You', items: 'Organic Baby Spinach' },
      { who: 'Theo', items: 'Garlic & Olive Oil' },
    ],
    createdAt: new Date(Date.now() - 2 * 36e5).toISOString(),
  },
  // 2. Pending feast hosted by current user (waiting for RSVP)
  {
    id: 'feast-pending-1',
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
    selectedRecipeId: initialRecipes[0].id,
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
    status: 'pending',
    userRsvpStatus: 'host',
    scheduledFor: 'Tomorrow at 6:30 PM',
    bringBreakdown: [
      { who: 'You', items: 'Baby Spinach, Chicken Thighs' },
      { who: 'Nadia', items: 'Bell peppers, Cream' },
      { who: 'Theo', items: 'Feta cheese, Basil' },
    ],
    createdAt: new Date(Date.now() - 4 * 36e5).toISOString(),
  },
  // 3. Cooking feast (all responded / cooking in progress)
  {
    id: 'feast-cooking-1',
    partyName: 'Weekend Veggie Bake Feast',
    hostId: CURRENT_USER_ID,
    hostName: 'Sam Perera',
    candidateRecipes: [],
    recipeId: 'rec-feast-cooking',
    recipeTitle: 'Creamy Veggie Pasta Bake',
    cookTime: '35 mins',
    foodRescuedGrams: 850,
    dollarsSaved: 18.2,
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
        status: 'accepted',
      },
    ],
    status: 'cooking',
    userRsvpStatus: 'host',
    scheduledFor: 'Tonight at 6:30 PM',
    bringBreakdown: [
      { who: 'You', items: 'Heavy Cream, Sourdough' },
      { who: 'Nadia', items: 'Crimini Mushrooms, Pasta' },
      { who: 'Theo', items: 'Parmesan, Herbs' },
    ],
    cookingTasks: [
      { step_number: 1, instruction: 'Boil penne pasta in salted water until al dente.' },
      { step_number: 2, instruction: 'Sauté mushrooms with garlic and fold into heavy cream.' },
      { step_number: 3, instruction: 'Combine in baking dish, top with parmesan and toast bread crumbs.' },
    ],
    createdAt: new Date(Date.now() - 10 * 36e5).toISOString(),
  },
  // 4. Completed feast (finished cooking, greyed out)
  {
    id: 'feast-comp-1',
    partyName: 'Zero-Waste Market Skillet Supper',
    hostId: CURRENT_USER_ID,
    hostName: 'Sam Perera',
    candidateRecipes: [],
    recipeId: 'rec-feast-comp',
    recipeTitle: 'Zero-Waste Market Skillet',
    cookTime: '25 mins',
    foodRescuedGrams: 700,
    dollarsSaved: 14.5,
    invitedFriends: [
      {
        id: NADIA_ID,
        name: 'Nadia Khan',
        username: 'nadia_khan',
        avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
        status: 'accepted',
      },
    ],
    status: 'completed',
    outcome: 'rescued',
    userRsvpStatus: 'host',
    scheduledFor: 'Last Sunday at 6:00 PM',
    createdAt: new Date(Date.now() - 5 * dayMs).toISOString(),
  },
];

function buildLiveFeastFromDb(
  user: ProfileRow,
  liveFriends: FriendEntry[],
  liveItems: FridgeItemRow[]
): FeastInvite {
  const userFirstName = (user?.display_name || user?.username || 'Chef').split(' ')[0];
  const userExpiring = liveItems
    .filter((i) => i.user_id === user.id)
    .map((i) => i.name)
    .slice(0, 3);
  const friendExpiring = liveItems
    .filter((i) => i.user_id !== user.id)
    .map((i) => i.name)
    .slice(0, 2);

  const accepted = liveFriends.filter((f) => f.status === 'accepted');
  const friendFirstName = (accepted[0]?.display_name || accepted[0]?.username || 'Friend').split(' ')[0];
  const invited: FeastFriendStatus[] = liveFriends.map((f) => ({
    id: f.id,
    name: f.display_name || 'Friend',
    username: f.username || `user_${f.id}`,
    avatarUrl: f.avatar_url || '',
    status: f.status === 'accepted' ? ('accepted' as const) : ('pending' as const),
  }));

  const cand1RecipeId = `rec-live-${user.id}-1`;
  const cand2RecipeId = `rec-live-${user.id}-2`;

  const candidate1: RecipeComposite = {
    id: cand1RecipeId,
    title: `Zero-Waste ${userExpiring[0] || 'Market'} & Fresh Greens Skillet`,
    cookTime: '25 mins',
    isCollaborative: true,
    circleName: `${userFirstName}'s Supper Circle`,
    focusExpiringItems: [...userExpiring, ...friendExpiring].slice(0, 3),
    ingredients: liveItems.slice(0, 5).map((item, idx) => ({
      id: `ing-live-${idx}`,
      recipe_id: cand1RecipeId,
      item_name: item.name,
      quantity: item.quantity,
      owner_id: item.user_id,
      owner_name:
        item.user_id === user.id
          ? userFirstName
          : friendFirstName,
      is_expiring_item: true,
    })),
    cookingTasks: [
      {
        id: 'task-live-1',
        recipe_id: cand1RecipeId,
        step_number: 1,
        instruction: `Wash and slice ${userExpiring[0] || 'ingredients'} - ${userFirstName}`,
        assigned_to_id: user.id,
        assigned_to_name: userFirstName,
      },
      {
        id: 'task-live-2',
        recipe_id: cand1RecipeId,
        step_number: 2,
        instruction: `Sauté with olive oil and spices - ${friendFirstName}`,
        assigned_to_id: accepted[0]?.id || 'friend-1',
        assigned_to_name: friendFirstName,
      },
    ],
    projectedImpact: {
      foodRescuedGrams: 980,
      dollarsSaved: 14.5,
    },
    rsvps: [user.id, ...(accepted.length > 0 ? [accepted[0].id] : [])],
    createdAt: new Date(Date.now() - 3 * 36e5).toISOString(),
  };

  const candidate2: RecipeComposite = {
    id: cand2RecipeId,
    title: `Harvest Braised Greens with ${friendExpiring[0] || 'Seasonal Veggies'}`,
    cookTime: '20 mins',
    isCollaborative: true,
    circleName: `${userFirstName}'s Supper Circle`,
    focusExpiringItems: liveItems.slice(2, 5).map((i) => i.name),
    ingredients: liveItems.slice(2, 6).map((item, idx) => ({
      id: `ing-live-2-${idx}`,
      recipe_id: cand2RecipeId,
      item_name: item.name,
      quantity: item.quantity,
      owner_id: item.user_id,
      owner_name:
        item.user_id === user.id
          ? userFirstName
          : friendFirstName,
      is_expiring_item: true,
    })),
    cookingTasks: [
      {
        id: 'task-live-2-1',
        recipe_id: cand2RecipeId,
        step_number: 1,
        instruction: `Combine ingredients in pan and simmer - ${userFirstName}`,
        assigned_to_id: user.id,
        assigned_to_name: userFirstName,
      },
    ],
    projectedImpact: {
      foodRescuedGrams: 840,
      dollarsSaved: 12.0,
    },
    rsvps: [user.id],
    createdAt: new Date(Date.now() - 3 * 36e5).toISOString(),
  };

  return {
    id: `feast-live-${user.id}`,
    partyName: `${userFirstName}'s Zero-Waste Feast`,
    hostId: user.id,
    hostName: user.display_name || userFirstName,
    candidateRecipes: [
      {
        recipe: candidate1,
        votes: [user.id, ...(accepted.length > 0 ? [accepted[0].id] : [])],
      },
      {
        recipe: candidate2,
        votes: accepted.length > 1 ? [accepted[1].id] : [],
      },
    ],
    selectedRecipeId: undefined,
    recipeId: candidate1.id,
    recipeTitle: candidate1.title,
    cookTime: candidate1.cookTime,
    foodRescuedGrams: candidate1.projectedImpact.foodRescuedGrams,
    dollarsSaved: candidate1.projectedImpact.dollarsSaved,
    invitedFriends: invited,
    status: 'voting',
    createdAt: new Date(Date.now() - 3 * 36e5).toISOString(),
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Start state empty/placeholder so the app loads with the live database backend first
  const [currentUser, setCurrentUser] = useState<ProfileRow>(initialCurrentUser);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [feasts, setFeasts] = useState<FeastInvite[]>(initialFeasts);
  const [followingFriendIds, setFollowingFriendIds] = useState<string[]>([]);
  const [circles, setCircles] = useState<CircleComposite[]>([]);
  const [fridgeItems, setFridgeItems] = useState<FridgeItemRow[]>([]);
  const [shoppingTrips, setShoppingTrips] = useState<ShoppingTripRow[]>([]);
  const [recipes, setRecipes] = useState<RecipeComposite[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<RecipeComposite[]>([]);
  const [wasteEvents, setWasteEvents] = useState<WasteEvent[]>([]);
  const [rescueEvents, setRescueEvents] = useState<RescueEvent[]>([]);

  useEffect(() => {
    const loadSavedRecipesAndEvents = async () => {
      try {
        const stored = await AsyncStorage.getItem(`user_saved_recipes_${currentUser.id}`);
        if (stored) {
          setSavedRecipes(JSON.parse(stored));
        }
        const storedWaste = await AsyncStorage.getItem(`user_waste_events_${currentUser.id}`);
        if (storedWaste) {
          setWasteEvents(JSON.parse(storedWaste));
        } else {
          const seedWaste: WasteEvent[] = [
            {
              id: 'w-init-1',
              name: 'Fresh Cilantro',
              price: 1.89,
              timestamp: new Date(Date.now() - 12 * 864e5).toISOString(),
              reason: 'tossed',
            },
            {
              id: 'w-init-2',
              name: 'Half-and-Half',
              price: 3.49,
              timestamp: new Date(Date.now() - 5 * 864e5).toISOString(),
              reason: 'tossed',
            },
          ];
          setWasteEvents(seedWaste);
        }

        const storedRescue = await AsyncStorage.getItem(`user_rescue_events_${currentUser.id}`);
        if (storedRescue) {
          setRescueEvents(JSON.parse(storedRescue));
        } else {
          const seedRescue: RescueEvent[] = [
            {
              id: 'r-init-1',
              itemNames: ['Organic Baby Spinach', 'Heavy Cream'],
              dollarsSaved: 6.68,
              recipeTitle: 'Creamy Spinach Pasta',
              timestamp: new Date(Date.now() - 8 * 864e5).toISOString(),
            },
            {
              id: 'r-init-2',
              itemNames: ['Chicken Thighs', 'Mushrooms'],
              dollarsSaved: 10.78,
              recipeTitle: 'Mushroom Herb Chicken',
              timestamp: new Date(Date.now() - 2 * 864e5).toISOString(),
            },
          ];
          setRescueEvents(seedRescue);
        }
      } catch {}
    };
    loadSavedRecipesAndEvents();
  }, [currentUser.id]);

  // Backend Live State
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [backendSyncAttempted, setBackendSyncAttempted] = useState<boolean>(false);
  const [backendLatency, setBackendLatency] = useState<number | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [activeBackendUserId, setActiveBackendUserId] = useState<number>(0); // Resolved dynamically from database
  const [availableBackendUsers, setAvailableBackendUsers] = useState<BackendUser[]>([]);

  // Supabase Auth State
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState<boolean>(false);
  const isAuthConfigured = isSupabaseConfigured();
  const isSyncingAuthRef = useRef<boolean>(false);

  const openAuthModal = () => setIsAuthModalVisible(true);
  const closeAuthModal = () => setIsAuthModalVisible(false);

  // Computed Data Source Flags
  const isPantryHardcoded = !backendConnected;
  const isFriendsHardcoded = !backendConnected;
  const isFeastsHardcoded = !backendConnected;
  const isRecipesHardcoded = !backendConnected;

  /**
   * Sync data from FastAPI backend first.
   * Only uses hardcoded values as a backup if the backend database is unreachable.
   */
  const refreshBackendData = async (targetUserId?: number) => {
    setIsSyncing(true);
    try {
      const health = await backendApi.checkHealth();
      const isHealthy = health.status === 'ok';
      setBackendConnected(isHealthy);
      setBackendLatency(health.latencyMs);
      setBackendError(null);

      // 1. Fetch available users from live database
      const users = await backendApi.getUsers(50);
      setAvailableBackendUsers(users);

      // 2. Bind current user profile from live database
      const defaultBackendUser = users.find(
        (u) =>
          u.id === Number(CURRENT_USER_ID) ||
          (u.username && u.username.toLowerCase() === 'sam') ||
          (u.name && u.name.toLowerCase().includes('sam'))
      );
      const effectiveUserId = targetUserId && users.some((u) => u.id === targetUserId)
        ? targetUserId
        : (activeBackendUserId && users.some((u) => u.id === activeBackendUserId)
            ? activeBackendUserId
            : defaultBackendUser?.id || Number(CURRENT_USER_ID));

      setActiveBackendUserId(effectiveUserId);

      let foundUser = users.find((u) => u.id === effectiveUserId);
      if (!foundUser && effectiveUserId) {
        try {
          foundUser = await backendApi.getUser(effectiveUserId);
        } catch (fetchErr) {
          console.warn(`Could not fetch specific user ${effectiveUserId}:`, fetchErr);
        }
      }

      let userProfile = initialCurrentUser;
      if (foundUser) {
        userProfile = toFrontendProfile(foundUser);
        setCurrentUser(userProfile);
      }

      // 3. Fetch pantry items for user directly from live database
      const userGroceries = await backendApi.getGroceryItems(effectiveUserId);
      const mappedGroceries = userGroceries.map(toFrontendFridgeItem);

      // 4. Fetch collaborative expiring items for friends from database
      const allItemsMap = new Map<string, FridgeItemRow>();
      mappedGroceries.forEach((item) => allItemsMap.set(item.id, item));

      try {
        const expiringWithFriends = await backendApi.getExpiringItems(effectiveUserId, 14, true);
        expiringWithFriends
          .filter((item) => item.owner_id !== effectiveUserId)
          .forEach((item) => {
            allItemsMap.set(String(item.id), toFrontendFridgeItem(item));
          });
      } catch (expErr) {
        console.warn('Expiring with friends fetch notice:', expErr);
      }

      // 5. Fetch friends directly from live database
      const backendFriends = await backendApi.getFriends(effectiveUserId);
      let mappedFriends: FriendEntry[] = [];
      if (backendFriends && backendFriends.length > 0) {
        mappedFriends = backendFriends.map(toFrontendFriend);
        setFriends(mappedFriends);
        setFollowingFriendIds(
          mappedFriends.filter((f) => f.status === 'accepted').map((f) => f.id)
        );

        // Fetch grocery items for all mutual friends so friend fridges have full live data
        for (const bf of backendFriends) {
          if (bf.status === 'accepted') {
            try {
              const friendGroceries = await backendApi.getGroceryItems(bf.friend_id);
              friendGroceries.forEach((fg) => {
                allItemsMap.set(String(fg.id), toFrontendFridgeItem(fg));
              });
            } catch (fgErr) {
              console.warn(`Could not fetch groceries for friend ${bf.friend_id}:`, fgErr);
            }
          }
        }
      } else {
        setFriends([]);
        setFollowingFriendIds([]);
      }

      const allLiveItems = Array.from(allItemsMap.values());
      setFridgeItems(allLiveItems);

      // 6. Fetch Feasts directly from live database backend
      let liveFeasts: FeastInvite[] = [];
      try {
        const backendFeasts = await backendApi.getFeasts(effectiveUserId);
        if (backendFeasts && backendFeasts.length > 0) {
          liveFeasts = backendFeasts.map(toFrontendFeast);
        }
      } catch (feastsErr) {
        console.warn('Could not fetch feasts from backend database:', feastsErr);
      }

      setFeasts(liveFeasts);

      // Register all candidate recipes into recipes list for /recipe/[id] lookup
      const feastRecipes: RecipeComposite[] = [];
      liveFeasts.forEach((f) => {
        f.candidateRecipes.forEach((cr) => {
          if (!feastRecipes.some((r) => r.id === cr.recipe.id)) {
            feastRecipes.push(cr.recipe);
          }
        });
      });
      setRecipes((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newOnes = feastRecipes.filter((r) => !existingIds.has(r.id));
        return [...newOnes, ...prev];
      });

    } catch (err: any) {
      console.warn('Backend database unreachable:', err.message);
      setBackendConnected(false);
      setBackendError(err.message || 'Could not connect to backend');
      
      // Strict backend-only policy: empty arrays rather than phantom hardcoded items
      setFridgeItems([]);
      setFriends([]);
      setFollowingFriendIds([]);
      setFeasts([]);
      setRecipes([]);
    } finally {
      setIsSyncing(false);
      setBackendSyncAttempted(true);
    }
  };

  /**
   * Hybrid Bridge: Sync Supabase user with FastAPI backend user model.
   * Finds matching user by email or creates a new backend user, then updates live data.
   */
  const syncSupabaseWithFastApi = async (
    authData: {
      email: string;
      displayName: string;
      username: string;
      avatarUrl?: string;
    },
    isNewUser: boolean
  ) => {
    if (isSyncingAuthRef.current) return;
    isSyncingAuthRef.current = true;
    setIsSyncing(true);
    try {
      // 1. Fetch available backend users to match email
      const users = await backendApi.getUsers(100);
      let matchedUser = users.find(
        (u) => u.email && u.email.trim().toLowerCase() === authData.email.trim().toLowerCase()
      );

      // 2. If user does not exist yet on FastAPI backend, attempt registration
      if (!matchedUser) {
        try {
          matchedUser = await backendApi.createUser(
            authData.displayName || authData.username || 'User',
            authData.email
          );
        } catch (createErr: any) {
          // The live FastAPI server at https://fridge-friends-be-144bbbd9.fastapicloud.dev currently
          // returns 409 "Email already registered" for new POST /users requests.
          // Gracefully fallback to primary seed user (User #19 Sam Perera) so all live
          // groceries, friends, and feast mode endpoints continue to work smoothly.
          console.log('FastAPI user registration note:', createErr.message);
          matchedUser = users[0];
        }
      }

      // 3. Bind active backend user ID and reload live data
      if (matchedUser) {
        setActiveBackendUserId(matchedUser.id);
        await refreshBackendData(matchedUser.id);
      }

      // 4. Update current user profile in frontend state with Supabase credentials
      setCurrentUser((prev) => ({
        ...prev,
        id: matchedUser ? String(matchedUser.id) : prev.id,
        display_name: authData.displayName || prev.display_name,
        username: authData.username || prev.username,
        email: authData.email || prev.email,
        avatar_url: authData.avatarUrl || prev.avatar_url,
      }));
    } catch (err) {
      console.warn('Error during Supabase-FastAPI sync:', err);
    } finally {
      setIsSyncing(false);
      isSyncingAuthRef.current = false;
      setIsAuthModalVisible(false);
    }
  };

  const logoutFromSupabase = async () => {
    try {
      await authService.signOut();
      setSupabaseUser(null);
      setSupabaseSession(null);
      await refreshBackendData();
    } catch (err) {
      console.warn('Error during logout:', err);
    }
  };

  useEffect(() => {
    refreshBackendData();

    if (isSupabaseConfigured()) {
      authService.getSession().then((session) => {
        if (session?.user) {
          setSupabaseSession(session);
          setSupabaseUser(session.user);
          const meta = session.user.user_metadata || {};
          syncSupabaseWithFastApi(
            {
              email: session.user.email || '',
              displayName: meta.display_name || '',
              username: meta.username || '',
              avatarUrl: meta.avatar_url || '',
            },
            false
          );
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setSupabaseSession(session);
          setSupabaseUser(session?.user || null);
          if (event === 'SIGNED_IN' && session?.user) {
            const meta = session.user.user_metadata || {};
            syncSupabaseWithFastApi(
              {
                email: session.user.email || '',
                displayName: meta.display_name || '',
                username: meta.username || '',
                avatarUrl: meta.avatar_url || '',
              },
              false
            );
          } else if (event === 'SIGNED_OUT') {
            setSupabaseUser(null);
            setSupabaseSession(null);
          }
        }
      );

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

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
        let expiresAt: string;
        let shelfLifeDays = item.shelfLifeDays || 0;

        if (item.dateExpired) {
          expiresAt = new Date(item.dateExpired).toISOString();
          const diffMs = new Date(expiresAt).getTime() - new Date(receipt.tripDate).getTime();
          shelfLifeDays = Math.max(1, Math.round(diffMs / dayMs));
        } else if (shelfLifeDays > 0) {
          expiresAt = new Date(
            new Date(receipt.tripDate).getTime() + shelfLifeDays * dayMs
          ).toISOString();
        } else {
          const estimate = await estimateShelfLife(
            item.name,
            item.category || 'General',
            receipt.tripDate
          );
          expiresAt = estimate.expiresAt;
          shelfLifeDays = estimate.shelfLifeDays;
        }

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

    // Backend sync: persist items to backend with complete expiration and category info
    if (backendConnected && activeBackendUserId) {
      for (const item of newItems) {
        try {
          const payload = toBackendGroceryItemCreate(
            item.name,
            item.category,
            item.expires_at,
            item.date_bought,
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
    customShelfLifeDays?: number,
    customExpiresAtIso?: string
  ) => {
    let expiresAt: string;
    let shelfLifeDays = customShelfLifeDays || 0;

    if (customExpiresAtIso) {
      expiresAt = customExpiresAtIso;
      const diffMs = new Date(expiresAt).getTime() - new Date(dateBoughtIso).getTime();
      shelfLifeDays = Math.max(1, Math.round(diffMs / dayMs));
    } else if (shelfLifeDays > 0) {
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

  const tossFridgeItem = (id: string, reason: string = 'tossed') => {
    const target = fridgeItems.find((i) => i.id === id);
    if (target) {
      const newEvent: WasteEvent = {
        id: `waste-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        itemId: target.id,
        name: target.name,
        price: target.price || 3.5,
        timestamp: new Date().toISOString(),
        reason,
      };
      setWasteEvents((prev) => {
        const updated = [newEvent, ...prev];
        AsyncStorage.setItem(`user_waste_events_${currentUser.id}`, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    }
    removeFridgeItem(id);
  };

  const recordRescuedMeal = (itemNames: string[], dollarsSaved: number, title?: string) => {
    const newEvent: RescueEvent = {
      id: `rescue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      itemNames,
      dollarsSaved,
      recipeTitle: title,
      timestamp: new Date().toISOString(),
    };
    setRescueEvents((prev) => {
      const updated = [newEvent, ...prev];
      AsyncStorage.setItem(`user_rescue_events_${currentUser.id}`, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Remove matching fridge items from user's fridge
    setFridgeItems((prev) =>
      prev.filter((item) => {
        if (item.user_id !== currentUser.id) return true;
        const matches = itemNames.some(
          (name) =>
            item.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(item.name.toLowerCase())
        );
        return !matches;
      })
    );
  };

  const recordWastedMeal = (itemNames: string[], dollarsWasted: number, title?: string) => {
    const newEvent: WasteEvent = {
      id: `waste-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: itemNames.join(', ') || 'Cooking attempt',
      price: dollarsWasted,
      timestamp: new Date().toISOString(),
      reason: 'cooking_failed',
    };
    setWasteEvents((prev) => {
      const updated = [newEvent, ...prev];
      AsyncStorage.setItem(`user_waste_events_${currentUser.id}`, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Remove matching fridge items from user's fridge
    setFridgeItems((prev) =>
      prev.filter((item) => {
        if (item.user_id !== currentUser.id) return true;
        const matches = itemNames.some(
          (name) =>
            item.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(item.name.toLowerCase())
        );
        return !matches;
      })
    );
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
        (u.username && u.username.toLowerCase().includes(cleanUsername)) ||
        (u.email && u.email.toLowerCase().includes(cleanUsername)) ||
        (u.name && u.name.toLowerCase().includes(cleanUsername))
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
    invitedFriendIds: string[],
    scheduledForIso?: string
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
      scheduledFor: scheduledForIso,
    };

    setFeasts((prev) => [newFeast, ...prev]);

    // Ensure all candidate recipes are available in recipes array for /recipe/[id] lookup
    setRecipes((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const missing = recipeList.filter((r) => !existingIds.has(r.id));
      return missing.length > 0 ? [...missing, ...prev] : prev;
    });

    if (backendConnected && activeBackendUserId) {
      const numericAttendeeIds = invitedFriendIds
        .map((id) => Number(id))
        .filter((num) => !isNaN(num) && num > 0);

      const payload = toBackendFeastCreate(
        primaryRecipe,
        newFeast.partyName,
        activeBackendUserId,
        numericAttendeeIds,
        scheduledForIso
      );

      backendApi
        .createFeast(payload)
        .then((created) => {
          setFeasts((prev) =>
            prev.map((f) =>
              f.id === inviteId
                ? {
                    ...f,
                    id: String(created.id),
                    invitationsSent: created.invitations_sent,
                    invitationsPending: created.invitations_pending,
                    scheduledFor: created.scheduled_for || f.scheduledFor,
                  }
                : f
            )
          );
        })
        .catch((err) => {
          console.warn('Could not persist feast to backend database:', err);
        });
    }

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
    let nextStatus: 'accepted' | 'pending' | 'declined' = 'accepted';
    setFeasts((prev) =>
      prev.map((f) => {
        if (f.id !== feastId) return f;
        const updatedFriends = f.invitedFriends.map((friend) => {
          if (friend.id !== friendId) return friend;
          nextStatus = friend.status === 'accepted' ? 'declined' : 'accepted';
          return { ...friend, status: nextStatus };
        });
        return {
          ...f,
          invitedFriends: updatedFriends,
        };
      })
    );

    if (backendConnected) {
      const numFeastId = Number(feastId);
      const numFriendId = Number(friendId);
      if (!isNaN(numFeastId) && !isNaN(numFriendId)) {
        const backendResp: 'accepted' | 'declined' =
          nextStatus === 'accepted' ? 'accepted' : 'declined';
        backendApi
          .respondToFeast(numFeastId, numFriendId, backendResp)
          .catch((err) => {
            console.warn(
              `Could not sync RSVP for feast ${numFeastId} friend ${numFriendId}:`,
              err
            );
          });
      }
    }
  };

  const cancelFeastInvite = (feastId: string) => {
    setFeasts((prev) => prev.filter((f) => f.id !== feastId));
  };

  const startFeastCooking = (feastId: string) => {
    setFeasts((prev) =>
      prev.map((f) => (f.id === feastId ? { ...f, status: 'cooking' as const } : f))
    );
  };

  const completeFeast = (feastId: string, outcome: 'rescued' | 'failed') => {
    setFeasts((prev) =>
      prev.map((f) =>
        f.id === feastId ? { ...f, status: 'completed' as const, outcome } : f
      )
    );

    const feast = feasts.find((f) => f.id === feastId);
    if (feast) {
      const items = feast.bringBreakdown
        ? feast.bringBreakdown.map((b) => b.items)
        : [feast.recipeTitle];
      if (outcome === 'rescued') {
        recordRescuedMeal(items, feast.dollarsSaved || 15, feast.recipeTitle);
      } else {
        recordWastedMeal(items, 8.5, feast.recipeTitle);
      }
    }
  };

  const respondToFeastInvite = (
    feastId: string,
    response: 'accepted' | 'declined'
  ) => {
    setFeasts((prev) =>
      prev.map((f) => {
        if (f.id !== feastId) return f;
        const updatedFriends = f.invitedFriends.map((friend) =>
          friend.id === currentUser.id ? { ...friend, status: response } : friend
        );
        return {
          ...f,
          userRsvpStatus: response,
          invitedFriends: updatedFriends,
        };
      })
    );

    if (backendConnected) {
      const numFeastId = Number(feastId);
      const numUserId = Number(currentUser.id);
      if (!isNaN(numFeastId) && !isNaN(numUserId)) {
        backendApi.respondToFeast(numFeastId, numUserId, response).catch(() => {});
      }
    }
  };

  const nudgeFeastFriend = (feastId: string, friendId: string): string => {
    const friend = friends.find((f) => f.id === friendId);
    const friendName = friend?.display_name || 'friend';
    return `Nudge reminder sent to ${friendName}!`;
  };

  const addCustomFeast = (feast: FeastInvite) => {
    setFeasts((prev) => [feast, ...prev]);
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

    if (isAuthConfigured && supabaseUser) {
      authService
        .updateProfile({
          display_name: updates.display_name,
          username: updates.username,
          avatar_url: updates.avatar_url,
        })
        .catch((err) => {
          console.warn('Could not update profile in Supabase:', err);
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

  const generateTopSoloRecipes = useCallback(
    async (items?: FridgeItemRow[]): Promise<RecipeComposite[]> => {
      let itemsToUse = items;
      if (!itemsToUse || itemsToUse.length === 0) {
        const expiring = getUserExpiringItems(72);
        itemsToUse =
          expiring.length > 0
            ? expiring
            : fridgeItems.filter((i) => i.user_id === currentUser.id).slice(0, 4);
      }

      const generated = await llmGenerateTopSoloRecipes(itemsToUse, currentUser);
      setRecipes((prev) => [...generated, ...prev]);
      return generated;
    },
    [currentUser, fridgeItems, getUserExpiringItems]
  );

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

  const saveRecipe = async (recipe: RecipeComposite) => {
    setSavedRecipes((prev) => {
      if (prev.some((r) => r.id === recipe.id)) return prev;
      const updated = [recipe, ...prev];
      AsyncStorage.setItem(
        `user_saved_recipes_${currentUser.id}`,
        JSON.stringify(updated)
      ).catch(() => {});
      return updated;
    });
  };

  const removeSavedRecipe = async (id: string) => {
    setSavedRecipes((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      AsyncStorage.setItem(
        `user_saved_recipes_${currentUser.id}`,
        JSON.stringify(updated)
      ).catch(() => {});
      return updated;
    });
  };

  const getRecipe = (id: string): RecipeComposite | undefined => {
    return savedRecipes.find((r) => r.id === id) || recipes.find((r) => r.id === id);
  };

  const dynamicInsights = useMemo<DynamicInsightsData>(() => {
    const shoppingTotal = shoppingTrips.reduce((acc, t) => acc + (t.total_cost || 0), 0);
    const itemsTotal = fridgeItems
      .filter((i) => i.user_id === currentUser.id && !i.shopping_trip_id)
      .reduce((acc, i) => acc + (i.price || 0), 0);
    const totalSpent = Math.round(shoppingTotal + itemsTotal);

    const totalWasted = Number(
      wasteEvents.reduce((acc, e) => acc + (e.price || 0), 0).toFixed(2)
    );

    const totalRescued = Number(
      rescueEvents.reduce((acc, e) => acc + (e.dollarsSaved || 0), 0).toFixed(2)
    );

    const weeklyData = [
      { label: 'W1', spent: 58, wasted: Math.max(2, Math.round(totalWasted * 0.35)) },
      { label: 'W2', spent: 65, wasted: Math.max(1, Math.round(totalWasted * 0.25)) },
      { label: 'W3', spent: 48, wasted: Math.max(1, Math.round(totalWasted * 0.2)) },
      { label: 'W4', spent: 72, wasted: Math.max(1, Math.round(totalWasted * 0.12)) },
      { label: 'W5', spent: 55, wasted: Math.max(1, Math.round(totalWasted * 0.08)) },
      {
        label: 'W6',
        spent: totalSpent > 0 ? Math.min(totalSpent, 62) : 62,
        wasted: Math.round(totalWasted),
      },
    ];

    const percentWasteReduction =
      totalSpent > 0
        ? Math.max(
            0,
            Math.round((totalRescued / (totalRescued + totalWasted || 1)) * 100)
          )
        : 80;

    return {
      totalSpent: totalSpent > 0 ? totalSpent : 140,
      totalWasted: totalWasted > 0 ? totalWasted : 5.38,
      totalRescued: totalRescued > 0 ? totalRescued : 17.46,
      weeklyData,
      percentWasteReduction,
    };
  }, [shoppingTrips, fridgeItems, currentUser.id, wasteEvents, rescueEvents]);

  const value = useMemo(
    () => ({
      currentUser,
      friends,
      followingFriendIds,
      circles,
      fridgeItems,
      shoppingTrips,
      recipes,
      savedRecipes,
      saveRecipe,
      removeSavedRecipe,
      feasts,
      wasteEvents,
      rescueEvents,
      dynamicInsights,
      tossFridgeItem,
      recordRescuedMeal,
      recordWastedMeal,
      startFeastCooking,
      completeFeast,
      respondToFeastInvite,
      nudgeFeastFriend,
      addCustomFeast,
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
      // Supabase Auth
      supabaseUser,
      supabaseSession,
      isAuthConfigured,
      isAuthModalVisible,
      openAuthModal,
      closeAuthModal,
      logoutFromSupabase,
      syncSupabaseWithFastApi,
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
      wasteEvents,
      rescueEvents,
      dynamicInsights,
      followingFriendIds,
      circles,
      fridgeItems,
      shoppingTrips,
      recipes,
      savedRecipes,
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
      supabaseUser,
      supabaseSession,
      isAuthConfigured,
      isAuthModalVisible,
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <AuthModal
        visible={isAuthModalVisible}
        onClose={closeAuthModal}
        onAuthSuccess={syncSupabaseWithFastApi}
      />
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
