/**
 * Supabase Database Schema Types
 *
 * Direct 1:1 mapping to Supabase PostgreSQL tables:
 * - profiles
 * - fridge_items
 * - shopping_trips
 * - friendships
 * - circles
 * - circle_members
 * - recipes
 * - recipe_ingredients
 * - recipe_tasks
 * - recipe_rsvps
 */

export interface ProfileRow {
  id: string; // UUID references auth.users
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface FridgeItemRow {
  id: string; // UUID
  user_id: string; // UUID references profiles.id
  shopping_trip_id: string | null; // UUID references shopping_trips.id
  name: string;
  category: string;
  price: number; // numeric(10, 2)
  quantity: string;
  date_bought: string; // timestamptz (ISO 8601)
  expires_at: string; // timestamptz (ISO 8601) - LLM predicted or user override
  shelf_life_days: number; // calculated by LLM
  status: 'fresh' | 'expiring' | 'used';
  created_at: string;
}

export interface ShoppingTripRow {
  id: string; // UUID
  user_id: string; // UUID references profiles.id
  store_name: string;
  trip_date: string; // timestamptz (ISO 8601)
  total_cost: number; // numeric(10, 2)
  item_count: number;
  created_at: string;
}

export interface FriendshipRow {
  id: string; // UUID
  user_id: string; // UUID references profiles.id
  friend_id: string; // UUID references profiles.id
  status: 'following' | 'mutual';
  created_at: string;
}

export interface CircleRow {
  id: string; // UUID
  name: string;
  created_by: string; // UUID references profiles.id
  created_at: string;
}

export interface CircleMemberRow {
  circle_id: string; // UUID references circles.id
  user_id: string; // UUID references profiles.id
  joined_at: string;
}

export interface RecipeRow {
  id: string; // UUID
  created_by: string; // UUID references profiles.id
  circle_id: string | null; // UUID references circles.id
  title: string;
  cook_time: string;
  dollars_saved: number;
  food_rescued_grams: number;
  is_collaborative: boolean;
  created_at: string;
}

export interface RecipeIngredientRow {
  id: string;
  recipe_id: string;
  item_name: string;
  quantity: string;
  owner_id: string;
  owner_name: string;
  is_expiring_item: boolean;
}

export interface RecipeTaskRow {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
  assigned_to_id: string;
  assigned_to_name: string;
}

export interface RecipeRsvpRow {
  recipe_id: string;
  user_id: string;
  rsvp_at: string;
}

/** Full composite Recipe entity used in UI */
export interface RecipeComposite {
  id: string;
  title: string;
  cookTime: string;
  isCollaborative: boolean;
  circleId?: string | null;
  circleName?: string;
  focusExpiringItems: string[];
  ingredients: RecipeIngredientRow[];
  cookingTasks: RecipeTaskRow[];
  projectedImpact: {
    foodRescuedGrams: number;
    dollarsSaved: number;
  };
  rsvps: string[]; // user IDs
  createdAt: string;
}

/** Full Circle entity used in UI */
export interface CircleComposite {
  id: string;
  name: string;
  createdBy: string;
  memberIds: string[];
  members: ProfileRow[];
}
