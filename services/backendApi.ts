/**
 * FastAPI Backend API Client & Data Adapters
 * Target Base URL: https://fridge-friends-be.fastapicloud.dev
 */

import { FridgeItemRow, ProfileRow } from './supabase/types';
import { FriendEntry } from '../context/AppContext';

export const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://fridge-friends-be.fastapicloud.dev';

/* ============================================================================
 * Backend Types (from OpenAPI 3.1.0 specification)
 * ============================================================================ */

export interface BackendUser {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface BackendGroceryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string | null;
  category: string | null;
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
  expires_on?: string | null;
  purchased_on?: string | null;
}

export interface BackendGroceryItemUpdate {
  name?: string;
  quantity?: number;
  unit?: string | null;
  category?: string | null;
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

export function toFrontendProfile(user: BackendUser): ProfileRow {
  const username = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
  return {
    id: String(user.id),
    email: user.email,
    username: username || `user_${user.id}`,
    display_name: user.name,
    avatar_url:
      USER_AVATARS[user.id] ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10B981&color=fff`,
    created_at: user.created_at,
  };
}

export function toFrontendFriend(backendFriend: BackendFriend): FriendEntry {
  const friendUser = backendFriend.friend;
  const username = friendUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');
  return {
    id: String(friendUser.id),
    email: friendUser.email,
    username: username || `user_${friendUser.id}`,
    display_name: friendUser.name,
    avatar_url:
      USER_AVATARS[friendUser.id] ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(friendUser.name)}&background=3B82F6&color=fff`,
    created_at: friendUser.created_at,
    status: backendFriend.status === 'accepted' ? 'accepted' : 'pending',
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
    ? new Date(`${backendItem.purchased_on}T00:00:00Z`).toISOString()
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
    price: 3.99, // default nominal price for rescued tracking
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
  quantityStr?: string
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
    purchased_on = new Date().toISOString().slice(0, 10);
  }

  return {
    name,
    quantity,
    unit,
    category: category || 'pantry',
    expires_on,
    purchased_on,
  };
}

/* ============================================================================
 * HTTP Client
 * ============================================================================ */

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
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const jsonErr = JSON.parse(text);
        if (jsonErr.detail) {
          errorMsg =
            typeof jsonErr.detail === 'string'
              ? jsonErr.detail
              : JSON.stringify(jsonErr.detail);
        }
      } catch {
        if (text) errorMsg = text.slice(0, 200);
      }
      throw new Error(errorMsg);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out to ${url}`);
    }
    throw err;
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
  async updateUser(userId: number, updates: { name?: string; email?: string }): Promise<BackendUser> {
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
   * Run full diagnostics audit to test connectivity
   */
  async runDiagnostics(userId = 14): Promise<ConnectionDiagnosticResult> {
    const start = Date.now();
    try {
      const health = await this.checkHealth();
      const users = await this.getUsers(10);
      const groceries = await this.getGroceryItems(userId);
      const friends = await this.getFriends(userId);

      return {
        connected: health.status === 'ok',
        latencyMs: Date.now() - start,
        health: health.status === 'ok',
        usersCount: users.length,
        groceriesCount: groceries.length,
        friendsCount: friends.length,
      };
    } catch (err: any) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        health: false,
        usersCount: 0,
        groceriesCount: 0,
        friendsCount: 0,
        error: err.message || 'Unknown network error',
      };
    }
  },
};
