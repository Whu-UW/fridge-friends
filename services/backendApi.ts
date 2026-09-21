/**
 * FastAPI Backend API Client & Data Adapters
 * Target Base URL: https://fridge-friends-be-144bbbd9.fastapicloud.dev
 */

import {
  FridgeItemRow,
  ProfileRow,
  RecipeComposite,
  RecipeIngredientRow,
  RecipeTaskRow,
} from './supabase/types';
import type { FriendEntry, FeastInvite, FeastFriendStatus } from '../context/AppContext';
import { getLocalDateString } from '../utils/dateUtils';

const rawBackendUrl =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://fridge-friends-be-144bbbd9.fastapicloud.dev';

export const BACKEND_BASE_URL = rawBackendUrl.replace(/\/+$/, '');

/* ============================================================================
 * Backend Types (from OpenAPI 3.1.0 specification)
 * ============================================================================ */

export type BackendBuddy = 'sammy' | 'milo' | 'eddie' | 'carl' | 'bella';

export interface BackendUser {
  id: number;
  username?: string | null;
  email: string | null;
  name: string;
  buddy?: BackendBuddy;
  diets?: string[];
  avoid_allergens?: string[];
  favorite_cuisines?: string[];
  created_at: string;
}

export interface BackendStatsBucket {
  label: string;
  starts_on: string;
  ends_on: string;
  spent: number;
  wasted: number;
  spent_and_used: number;
  rescued: number;
  items_wasted: number;
  items_rescued: number;
}

export interface BackendStats {
  user_id: number;
  period: 'weeks' | 'months';
  buckets: BackendStatsBucket[];
  spent: number;
  wasted: number;
  rescued: number;
  waste_percent_first: number;
  waste_percent_last: number;
  summary: string;
  priced_items: number;
  unpriced_items: number;
}

export interface BackendGroceryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string | null;
  category: string | null;
  price?: number | null;
  outcome?: 'on_shelf' | 'used' | 'wasted';
  rescued?: boolean;
  expires_on: string | null; // YYYY-MM-DD
  purchased_on: string | null; // YYYY-MM-DD
  consumed: boolean;
  owner_id: number;
  created_at: string;
}

export interface BackendExpiringItem extends BackendGroceryItem {
  owner_name: string;
  days_until_expiry: number;
  expired: boolean;
}

export interface BackendGroceryItemCreate {
  name: string;
  quantity?: number;
  unit?: string | null;
  category?: string | null;
  price?: number | null;
  expires_on?: string | null;
  purchased_on?: string | null;
}

export interface BackendGroceryItemUpdate {
  name?: string;
  quantity?: number;
  unit?: string | null;
  category?: string | null;
  price?: number | null;
  expires_on?: string | null;
  purchased_on?: string | null;
  consumed?: boolean;
}

export interface BackendFriend {
  id: number;
  user_id: number;
  friend_id: number;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  friend: BackendUser;
}

export interface BackendAttendeeRead {
  user_id: number;
  username?: string;
  name: string;
  email: string | null;
  response: 'invited' | 'accepted' | 'declined';
  responded_at: string | null;
  is_host: boolean;
}

export interface BackendRecipeIngredient {
  name: string;
  expiring?: boolean;
  from_users?: string[];
}

export interface BackendRecipeRead {
  rank: number;
  rank_reason: string;
  name: string;
  cuisine?: string | null;
  uses?: BackendRecipeIngredient[];
  missing?: string[];
  uses_expiring?: string[];
  prep_minutes?: number | null;
  cook_minutes?: number | null;
  total_minutes?: number | null;
  contributors?: string[];
  why?: string | null;
  liked_by?: string[];
  is_liked: boolean;
}

export interface BackendFeastRead {
  id: number;
  name: string;
  host_id: number;
  host_name: string;
  scheduled_for: string | null;
  recipe: BackendRecipeRead;
  attendees: BackendAttendeeRead[];
  invitations_sent: number;
  invitations_pending: number;
  created_at: string;
}

export interface BackendFeastCreate {
  name: string;
  host_id: number;
  recipe: BackendRecipeRead;
  attendee_ids: number[];
  scheduled_for?: string | null;
}

export interface BackendNotificationRead {
  id: number;
  user_id: number;
  kind: string;
  title: string;
  body: string;
  feast_id?: number | null;
  delivery_status: 'pending' | 'sent' | 'failed';
  delivery_error?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface BackendHealthResponse {
  status: string;
}

export interface ConnectionDiagnosticResult {
  connected: boolean;
  latencyMs: number;
  health: boolean;
  usersCount: number;
  groceriesCount: number;
  friendsCount: number;
  feastsCount: number;
  error?: string;
}

/* ============================================================================
 * Schema Adapters (Backend <-> Frontend)
 * ============================================================================ */

// User avatars for seeded backend users to keep UI beautiful
const USER_AVATARS: Record<number, string> = {
  14: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', // Sam
  15: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100', // Nadia
  16: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', // Theo
  17: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', // Mei
  18: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', // Obi
};

export function getUserAvatar(userId: number, name: string): string {
  if (USER_AVATARS[userId]) return USER_AVATARS[userId];
  const lower = name.toLowerCase();
  if (lower.includes('sam')) return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
  if (lower.includes('nadia')) return 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100';
  if (lower.includes('theo')) return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100';
  if (lower.includes('mei')) return 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100';
  if (lower.includes('obi')) return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10B981&color=fff`;
}

export function toFrontendProfile(user: BackendUser): ProfileRow {
  const name = user.name || 'User';
  return {
    id: String(user.id),
    email: user.email ?? '',
    username: user.username || `user_${user.id}`,
    display_name: name,
    avatar_url: getUserAvatar(user.id, name),
    created_at: user.created_at,
  };
}

export function toFrontendFriend(
  backendFriend: BackendFriend,
  currentUserId?: number
): FriendEntry {
  const friendUser = backendFriend.friend;
  const friendId = friendUser?.id || backendFriend.friend_id;
  const friendName = friendUser?.name || 'Friend';
  return {
    id: String(friendId),
    email: friendUser?.email ?? '',
    username: friendUser?.username || `user_${friendId}`,
    display_name: friendName,
    avatar_url: getUserAvatar(friendId, friendName),
    created_at: friendUser?.created_at || backendFriend.created_at,
    status: backendFriend.status === 'accepted' ? 'accepted' : 'pending',
    // The row is directional: whoever created it (user_id) is the requester.
    direction:
      currentUserId !== undefined && backendFriend.user_id === currentUserId
        ? 'outgoing'
        : 'incoming',
  };
}

export function toFrontendFridgeItem(backendItem: BackendGroceryItem): FridgeItemRow {
  const now = Date.now();
  let expiresAtIso = new Date(now + 3 * 864e5).toISOString();
  let shelfLifeDays = 3;

  if (backendItem.expires_on) {
    const expDate = new Date(`${backendItem.expires_on}T23:59:59Z`);
    if (!isNaN(expDate.getTime())) {
      expiresAtIso = expDate.toISOString();
      const diffDays = Math.ceil((expDate.getTime() - now) / 864e5);
      shelfLifeDays = Math.max(0, diffDays);
    }
  }

  const purchasedAtIso = backendItem.purchased_on
    ? `${backendItem.purchased_on}T12:00:00.000Z`
    : backendItem.created_at;

  const isExpiring = shelfLifeDays <= 2;
  const status: 'fresh' | 'expiring' | 'used' = backendItem.consumed
    ? 'used'
    : isExpiring
    ? 'expiring'
    : 'fresh';

  const quantityLabel = backendItem.unit
    ? `${backendItem.quantity} ${backendItem.unit}`
    : `${backendItem.quantity}`;

  return {
    id: String(backendItem.id),
    user_id: String(backendItem.owner_id),
    shopping_trip_id: null,
    name: backendItem.name,
    category: backendItem.category || 'Other',
    price: backendItem.price ?? 0,
    quantity: quantityLabel,
    date_bought: purchasedAtIso,
    expires_at: expiresAtIso,
    shelf_life_days: shelfLifeDays,
    status,
    created_at: backendItem.created_at,
  };
}

export function toBackendGroceryItemCreate(
  name: string,
  category?: string,
  expiresAtIso?: string,
  dateBoughtIso?: string,
  quantityStr?: string,
  price?: number
): BackendGroceryItemCreate {
  let quantity = 1;
  let unit: string | null = null;

  if (quantityStr) {
    const match = quantityStr.match(/^([\d.]+)\s*(.*)$/);
    if (match) {
      const parsedNum = parseFloat(match[1]);
      if (!isNaN(parsedNum)) quantity = parsedNum;
      if (match[2].trim()) unit = match[2].trim();
    }
  }

  let expires_on: string | null = null;
  if (expiresAtIso) {
    expires_on = expiresAtIso.slice(0, 10);
  }

  let purchased_on: string | null = null;
  if (dateBoughtIso) {
    purchased_on = dateBoughtIso.slice(0, 10);
  } else {
    purchased_on = getLocalDateString();
  }

  return {
    name,
    quantity,
    unit,
    category: category || 'pantry',
    // Without a price an item is left out of waste and spending entirely
    price: price && price > 0 ? price : null,
    expires_on,
    purchased_on,
  };
}

export function toFrontendRecipeFromBackend(
  backendRecipe: BackendRecipeRead,
  fallbackId?: string
): RecipeComposite {
  const recipeId =
    fallbackId ||
    `backend-rec-${backendRecipe.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const totalMinutes =
    backendRecipe.total_minutes ||
    (backendRecipe.prep_minutes || 0) + (backendRecipe.cook_minutes || 25);
  const cookTimeStr = `${totalMinutes || 25} mins`;

  const uses = backendRecipe.uses || [];
  const ingredients: RecipeIngredientRow[] = uses.map((u, idx) => ({
    id: `${recipeId}-ing-${idx}`,
    recipe_id: recipeId,
    item_name: u.name,
    quantity: '1 serving',
    owner_id: u.from_users && u.from_users[0] ? u.from_users[0] : 'shared',
    owner_name: u.from_users && u.from_users[0] ? u.from_users[0] : 'Party Host',
    is_expiring_item:
      Boolean(u.expiring) || (backendRecipe.uses_expiring || []).includes(u.name),
  }));

  const cookingTasks: RecipeTaskRow[] = [
    {
      id: `${recipeId}-task-1`,
      recipe_id: recipeId,
      step_number: 1,
      instruction: `Prep ingredients: ${
        uses.map((u) => u.name).slice(0, 4).join(', ') || 'wash and chop all produce'
      }.`,
      assigned_to_id: 'host',
      assigned_to_name: 'Host & Helpers',
    },
    {
      id: `${recipeId}-task-2`,
      recipe_id: recipeId,
      step_number: 2,
      // Not rank_reason: that says why this recipe was suggested, which is no
      // use to someone stood at a stove — and it carries whatever text the
      // suggester happened to write.
      instruction: `Cook ${backendRecipe.name}: combine everything in a pan over medium heat and season to taste.`,
      assigned_to_id: 'host',
      assigned_to_name: 'Cooking Crew',
    },
    {
      id: `${recipeId}-task-3`,
      recipe_id: recipeId,
      step_number: 3,
      instruction: 'Garnish, plate, and serve fresh while hot!',
      assigned_to_id: 'host',
      assigned_to_name: 'Everyone',
    },
  ];

  const foodRescuedGrams = Math.max(
    300,
    (backendRecipe.uses_expiring?.length || 1) * 220
  );
  const dollarsSaved = parseFloat(
    ((backendRecipe.uses_expiring?.length || 1) * 4.5).toFixed(2)
  );

  return {
    id: recipeId,
    title: backendRecipe.name,
    cookTime: cookTimeStr,
    isCollaborative: true,
    circleId: null,
    circleName: 'Dinner Party Feast',
    focusExpiringItems: backendRecipe.uses_expiring || [],
    ingredients,
    cookingTasks,
    projectedImpact: {
      foodRescuedGrams,
      dollarsSaved,
    },
    rsvps: backendRecipe.liked_by || [],
    createdAt: new Date().toISOString(),
  };
}

export function toFrontendFeast(
  backendFeast: BackendFeastRead,
  currentUserId?: number
): FeastInvite {
  const feastId = String(backendFeast.id);
  const primaryRecipe = toFrontendRecipeFromBackend(
    backendFeast.recipe,
    `feast-rec-${backendFeast.id}`
  );

  const invitedFriends: FeastFriendStatus[] = backendFeast.attendees
    .filter((a) => !a.is_host)
    .map((attendee) => {
      const status: 'accepted' | 'pending' | 'declined' =
        attendee.response === 'accepted'
          ? 'accepted'
          : attendee.response === 'declined'
          ? 'declined'
          : 'pending';

      return {
        id: String(attendee.user_id),
        name: attendee.name,
        username: attendee.username || `user_${attendee.user_id}`,
        avatarUrl: getUserAvatar(attendee.user_id, attendee.name),
        status,
      };
    });

  // The signed-in user's own RSVP, so Meals can show invites awaiting a reply
  const isHost = currentUserId !== undefined && backendFeast.host_id === currentUserId;
  const ownAttendee =
    currentUserId === undefined
      ? undefined
      : backendFeast.attendees.find((a) => a.user_id === currentUserId);
  const userRsvpStatus: FeastInvite['userRsvpStatus'] = isHost
    ? 'host'
    : ownAttendee
    ? ownAttendee.response === 'accepted'
      ? 'accepted'
      : ownAttendee.response === 'declined'
      ? 'declined'
      : 'pending'
    : undefined;

  // Who is bringing what, grouped by contributor
  const bringMap = new Map<string, string[]>();
  (backendFeast.recipe?.uses || []).forEach((use) => {
    const who = use.from_users && use.from_users[0] ? use.from_users[0] : 'Party Host';
    bringMap.set(who, [...(bringMap.get(who) || []), use.name]);
  });
  const bringBreakdown = Array.from(bringMap.entries()).map(([who, items]) => ({
    who: currentUserId !== undefined && who === backendFeast.host_name && isHost ? 'You' : who,
    items: items.join(', '),
  }));

  const candidateRecipes = [
    {
      recipe: primaryRecipe,
      votes: backendFeast.attendees
        .filter((a) => a.response === 'accepted')
        .map((a) => String(a.user_id)),
    },
  ];

  return {
    id: feastId,
    partyName: backendFeast.name,
    hostId: String(backendFeast.host_id),
    hostName: backendFeast.host_name,
    candidateRecipes,
    selectedRecipeId: primaryRecipe.id,
    recipeId: primaryRecipe.id,
    recipeTitle: primaryRecipe.title,
    cookTime: primaryRecipe.cookTime,
    foodRescuedGrams: primaryRecipe.projectedImpact.foodRescuedGrams,
    dollarsSaved: primaryRecipe.projectedImpact.dollarsSaved,
    invitedFriends,
    status: 'confirmed',
    userRsvpStatus,
    bringBreakdown,
    cookingTasks: primaryRecipe.cookingTasks.map((task) => ({
      step_number: task.step_number,
      instruction: task.instruction,
    })),
    createdAt: backendFeast.created_at,
    scheduledFor: backendFeast.scheduled_for || undefined,
    invitationsSent: backendFeast.invitations_sent,
    invitationsPending: backendFeast.invitations_pending,
  };
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * Turn a label like "Tonight at 6:30 PM" or "Friday at 7:00 PM" into an ISO
 * datetime the backend accepts. Anything unrecognised returns null, so an odd
 * label leaves the feast undated instead of failing the whole request.
 */
/** "Sat 21 Sep at 6:30 PM" from an ISO datetime; anything else passes through. */
export function formatScheduledFor(value?: string | null): string {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
}

export function toBackendScheduledFor(label?: string): string | null {
  if (!label) return null;

  const trimmed = label.trim();
  // Already a date or datetime
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  const when = new Date();

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  let hours = 19;
  let minutes = 0;
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10) % 12;
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (timeMatch[3] === 'pm') hours += 12;
  }

  if (lower.includes('tomorrow')) {
    when.setDate(when.getDate() + 1);
  } else {
    const weekdayIndex = WEEKDAYS.findIndex((day) => lower.includes(day));
    if (weekdayIndex >= 0) {
      // The next time that weekday comes round
      const delta = (weekdayIndex - when.getDay() + 7) % 7 || 7;
      when.setDate(when.getDate() + delta);
    } else if (!lower.includes('tonight') && !lower.includes('today')) {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
      return null;
    }
  }

  when.setHours(hours, minutes, 0, 0);
  return when.toISOString();
}

export function toBackendFeastCreate(
  recipe: RecipeComposite,
  partyName: string,
  hostId: number,
  attendeeIds: number[],
  scheduledForIso?: string
): BackendFeastCreate {
  const recipeTitle = recipe?.title || `${partyName} Chef's Special`;
  const uses = (recipe?.ingredients || []).map((ing) => ({
    name: ing.item_name,
    expiring: Boolean(ing.is_expiring_item),
    from_users: ing.owner_name ? [ing.owner_name] : ['Party Host'],
  }));

  const uniqueContributors = Array.from(
    new Set(
      (recipe?.ingredients || [])
        .map((i) => i.owner_name)
        .filter(Boolean)
    )
  );

  const backendRecipe: BackendRecipeRead = {
    rank: 1,
    rank_reason: `Curated dinner party recipe for ${partyName}`,
    name: recipeTitle,
    cuisine: recipe?.circleName ? 'Circle Special' : 'Fusion',
    uses: uses.length > 0 ? uses : [{ name: 'Fresh Ingredients', expiring: true, from_users: ['Host'] }],
    missing: [],
    uses_expiring: recipe?.focusExpiringItems || [],
    prep_minutes: 10,
    cook_minutes: parseInt(recipe?.cookTime || '20', 10) || 20,
    total_minutes: parseInt(recipe?.cookTime || '30', 10) || 30,
    contributors: uniqueContributors.length > 0 ? uniqueContributors : [recipe?.circleName || 'Host'],
    why: 'Zero-waste collaborative meal pooling expiring ingredients',
    liked_by: recipe?.rsvps || [],
    is_liked: false,
  };

  return {
    name: partyName,
    host_id: hostId,
    recipe: backendRecipe,
    attendee_ids: attendeeIds,
    scheduled_for: toBackendScheduledFor(scheduledForIso),
  };
}

/* ============================================================================
 * HTTP Client
 * ============================================================================ */

const GENERIC_ERROR = 'Something went wrong. Please try again.';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BACKEND_BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();

      // Only a plain `detail` string is written for a person to read ("That
      // User ID is taken"). Everything else here — status lines, validation
      // dumps, HTML error pages — describes our plumbing, so it is logged and
      // a neutral message is thrown in its place.
      let errorMsg = GENERIC_ERROR;
      try {
        const jsonErr = JSON.parse(text);
        if (typeof jsonErr.detail === 'string' && jsonErr.detail.trim()) {
          errorMsg = jsonErr.detail;
        }
      } catch {
        // Not JSON; nothing safe to show
      }

      console.warn(`Request failed: ${res.status} ${path} — ${text.slice(0, 200)}`);
      throw new Error(errorMsg);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn(`Request timed out: ${url}`);
      throw new Error('That took too long. Please check your connection and try again.');
    }
    // A fetch failure carries the host and port in its message; keep that in
    // the log and hand the caller something showable.
    console.warn(`Request error: ${url} — ${err?.message}`);
    throw new Error(GENERIC_ERROR);
  }
}

/* ============================================================================
 * API Service Methods
 * ============================================================================ */

export const backendApi = {
  /**
   * Health check
   */
  async checkHealth(): Promise<{ status: string; latencyMs: number }> {
    const start = Date.now();
    const res = await request<BackendHealthResponse>('/health');
    const latencyMs = Date.now() - start;
    return { status: res.status, latencyMs };
  },

  /**
   * List all users
   */
  async getUsers(limit = 50, offset = 0): Promise<BackendUser[]> {
    return request<BackendUser[]>(`/users?limit=${limit}&offset=${offset}`);
  },

  /**
   * Get user by ID
   */
  async getUser(userId: number): Promise<BackendUser> {
    return request<BackendUser>(`/users/${userId}`);
  },

  /**
   * Sign up with a User ID (username), password and buddy
   */
  async signup(
    username: string,
    password: string,
    buddy: BackendBuddy
  ): Promise<BackendUser> {
    return request<BackendUser>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password, buddy }),
    });
  },

  /**
   * Log in with User ID (username) and password
   */
  async login(username: string, password: string): Promise<BackendUser> {
    return request<BackendUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  /**
   * Replace the user's taste profile (diets, allergens, cuisines)
   */
  async setTasteProfile(
    userId: number,
    profile: { diets: string[]; avoid_allergens: string[]; favorite_cuisines: string[] }
  ): Promise<void> {
    await request(`/users/${userId}/taste-profile`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  /**
   * Change password (requires the current password)
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    await request(`/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },

  /**
   * Waste & spending stats, bucketed by week or month
   */
  async getStats(
    userId: number,
    period: 'weeks' | 'months',
    buckets = 6
  ): Promise<BackendStats> {
    return request<BackendStats>(`/users/${userId}/stats?period=${period}&buckets=${buckets}`);
  },

  /**
   * Create a new user
   */
  async createUser(name: string, email: string): Promise<BackendUser> {
    return request<BackendUser>('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
  },

  /**
   * Update user details (name, email)
   */
  async updateUser(
    userId: number,
    updates: { name?: string; email?: string; username?: string; buddy?: BackendBuddy }
  ): Promise<BackendUser> {
    return request<BackendUser>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Get grocery items for a user
   */
  async getGroceryItems(
    userId: number,
    options?: { category?: string; consumed?: boolean }
  ): Promise<BackendGroceryItem[]> {
    let query = '';
    const params: string[] = [];
    if (options?.category) params.push(`category=${encodeURIComponent(options.category)}`);
    if (options?.consumed !== undefined) params.push(`consumed=${options.consumed}`);
    if (params.length > 0) query = `?${params.join('&')}`;

    return request<BackendGroceryItem[]>(`/users/${userId}/grocery-items${query}`);
  },

  /**
   * Create a new grocery item for a user
   */
  async createGroceryItem(
    userId: number,
    item: BackendGroceryItemCreate
  ): Promise<BackendGroceryItem> {
    return request<BackendGroceryItem>(`/users/${userId}/grocery-items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  /**
   * Update a grocery item
   */
  async updateGroceryItem(
    itemId: number,
    updates: BackendGroceryItemUpdate
  ): Promise<BackendGroceryItem> {
    return request<BackendGroceryItem>(`/grocery-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete a grocery item
   */
  async deleteGroceryItem(itemId: number): Promise<boolean> {
    await request<void>(`/grocery-items/${itemId}`, {
      method: 'DELETE',
    });
    return true;
  },

  /**
   * List expiring items (with optional friend inclusion)
   */
  async getExpiringItems(
    userId: number,
    withinDays = 7,
    includeFriends = true
  ): Promise<BackendExpiringItem[]> {
    return request<BackendExpiringItem[]>(
      `/users/${userId}/grocery-items/expiring?within_days=${withinDays}&include_friends=${includeFriends}`
    );
  },

  /**
   * List friends for a user
   */
  async getFriends(
    userId: number,
    status?: 'pending' | 'accepted' | 'blocked'
  ): Promise<BackendFriend[]> {
    const query = status ? `?status=${status}` : '';
    return request<BackendFriend[]>(`/users/${userId}/friends${query}`);
  },

  /**
   * Add / request a friend
   */
  async addFriend(userId: number, friendId: number): Promise<BackendFriend> {
    return request<BackendFriend>(`/users/${userId}/friends`, {
      method: 'POST',
      body: JSON.stringify({ friend_id: friendId }),
    });
  },

  /**
   * Invite someone by username
   */
  async inviteFriend(userId: number, username: string): Promise<BackendFriend> {
    return request<BackendFriend>(`/users/${userId}/friends/invite`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  /**
   * Update friendship status (accept or block)
   */
  async updateFriendship(
    userId: number,
    friendId: number,
    status: 'accepted' | 'blocked'
  ): Promise<BackendFriend> {
    return request<BackendFriend>(`/users/${userId}/friends/${friendId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Remove / delete friendship
   */
  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    await request<void>(`/users/${userId}/friends/${friendId}`, {
      method: 'DELETE',
    });
    return true;
  },

  /**
   * List feasts for a user (as host or attendee)
   */
  async getFeasts(userId: number): Promise<BackendFeastRead[]> {
    return request<BackendFeastRead[]>(`/users/${userId}/feasts`);
  },

  /**
   * Get single feast by ID
   */
  async getFeast(feastId: number): Promise<BackendFeastRead> {
    return request<BackendFeastRead>(`/feasts/${feastId}`);
  },

  /**
   * Create a new feast party
   */
  async createFeast(feast: BackendFeastCreate): Promise<BackendFeastRead> {
    return request<BackendFeastRead>('/feasts', {
      method: 'POST',
      body: JSON.stringify(feast),
    });
  },

  /**
   * Respond / RSVP to feast party
   */
  async respondToFeast(
    feastId: number,
    userId: number,
    response: 'accepted' | 'declined'
  ): Promise<BackendFeastRead> {
    return request<BackendFeastRead>(`/feasts/${feastId}/respond/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    });
  },

  /**
   * Resend feast invitations
   */
  async resendFeastInvitations(feastId: number): Promise<BackendFeastRead> {
    return request<BackendFeastRead>(`/feasts/${feastId}/resend-invitations`, {
      method: 'POST',
    });
  },

  /**
   * Update a feast (e.g. change scheduled time). Gracefully returns null
   * if the backend does not support PATCH yet.
   */
  async updateFeast(
    feastId: number,
    data: { scheduled_for?: string | null }
  ): Promise<BackendFeastRead | null> {
    try {
      return await request<BackendFeastRead>(`/feasts/${feastId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn('updateFeast not supported by backend yet:', err);
      return null;
    }
  },

  /**
   * Register an Expo push token for a user so the backend can send
   * push notifications. Returns true on success.
   */
  async registerPushToken(userId: number, token: string): Promise<boolean> {
    try {
      await request(`/users/${userId}/push-token`, {
        method: 'POST',
        body: JSON.stringify({ expo_push_token: token }),
      });
      return true;
    } catch (err) {
      console.warn('Could not register push token:', err);
      return false;
    }
  },

  /**
   * Take an item off the shelf as eaten (`used`) or binned (`wasted`).
   * This is what the waste-and-spending screen counts, so items are resolved
   * rather than deleted.
   */
  async resolveGroceryItem(
    itemId: number,
    outcome: 'used' | 'wasted',
    resolvedOn?: string
  ): Promise<BackendGroceryItem> {
    return request<BackendGroceryItem>(`/grocery-items/${itemId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ outcome, resolved_on: resolvedOn ?? null }),
    });
  },

  async markNotificationRead(notificationId: number): Promise<BackendNotificationRead> {
    return request<BackendNotificationRead>(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: number,
    options?: { unreadOnly?: boolean }
  ): Promise<BackendNotificationRead[]> {
    const query = options?.unreadOnly ? '?unread_only=true' : '';
    return request<BackendNotificationRead[]>(`/users/${userId}/notifications${query}`);
  },

  /**
   * Run full diagnostics audit to test connectivity
   */
  async runDiagnostics(userId = 14): Promise<ConnectionDiagnosticResult> {
    const start = Date.now();
    try {
      const health = await this.checkHealth();
      const users = await this.getUsers(10);
      const groceries = await this.getGroceryItems(userId);
      const friends = await this.getFriends(userId);
      let feastsCount = 0;
      try {
        const userFeasts = await this.getFeasts(userId);
        feastsCount = userFeasts.length;
      } catch (fErr) {
        console.warn('Diagnostics feasts fetch note:', fErr);
      }

      return {
        connected: health.status === 'ok',
        latencyMs: Date.now() - start,
        health: health.status === 'ok',
        usersCount: users.length,
        groceriesCount: groceries.length,
        friendsCount: friends.length,
        feastsCount,
      };
    } catch (err: any) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        health: false,
        usersCount: 0,
        groceriesCount: 0,
        friendsCount: 0,
        feastsCount: 0,
        error: err.message || 'Unknown network error',
      };
    }
  },
};
