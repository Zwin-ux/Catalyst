// Database Connection
// Handles connection and queries to Supabase/PostgreSQL
import { createClient } from '@supabase/supabase-js';
import { User, Faction, DramaEvent } from './models';
import { CONFIG } from '../config';

// Import credentials from config.ts file
const supabaseUrl = CONFIG.SUPABASE_URL;
const supabaseKey = CONFIG.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not found in config.ts. Using fallback local storage.');
}

// Create Supabase client
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Log connection status
if (supabase) {
  console.log('✅ Connected to Supabase database');
} else {
  console.log('⚠️ Using local storage instead of Supabase');
}

// User operations
export async function getUser(userId: string): Promise<User | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  
  return data as User;
}

export async function saveUser(user: User): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('users')
    .upsert(user, { onConflict: 'id' });
  
  if (error) {
    console.error('Error saving user:', error);
    return false;
  }
  
  return true;
}

// Faction operations
export async function getFaction(factionId: string): Promise<Faction | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('factions')
    .select('*')
    .eq('id', factionId)
    .single();
  
  if (error) {
    console.error('Error fetching faction:', error);
    return null;
  }
  
  return data as Faction;
}

export async function saveFaction(faction: Faction): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('factions')
    .upsert(faction, { onConflict: 'id' });
  
  if (error) {
    console.error('Error saving faction:', error);
    return false;
  }
  
  return true;
}

// Drama events operations
export async function logDramaEvent(event: DramaEvent): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('drama_events')
    .insert(event);
  
  if (error) {
    console.error('Error logging drama event:', error);
    return false;
  }
  
  return true;
}

export async function getRecentDramaEvents(limit: number = 10): Promise<DramaEvent[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('drama_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching recent drama events:', error);
    return [];
  }
  
  return data as DramaEvent[];
}

// Fallback storage for development/testing without Supabase
const localStore = {
  users: new Map<string, User>(),
  factions: new Map<string, Faction>(),
  dramaEvents: [] as DramaEvent[]
};

// Fallback implementations when Supabase is not available
export async function getLocalUser(userId: string): Promise<User | null> {
  return localStore.users.get(userId) || null;
}

export async function saveLocalUser(user: User): Promise<boolean> {
  localStore.users.set(user.id, user);
  return true;
}

export async function getLocalFaction(factionId: string): Promise<Faction | null> {
  return localStore.factions.get(factionId) || null;
}

export async function saveLocalFaction(faction: Faction): Promise<boolean> {
  localStore.factions.set(faction.id, faction);
  return true;
}

export async function logLocalDramaEvent(event: DramaEvent): Promise<boolean> {
  localStore.dramaEvents.push(event);
  return true;
}

export async function getLocalRecentDramaEvents(limit: number = 10): Promise<DramaEvent[]> {
  return localStore.dramaEvents.slice(0, limit);
}

// Export unified functions that try Supabase first, then fall back to local
export const db = {
  getUser: async (userId: string) => await getUser(userId) || await getLocalUser(userId),
  saveUser: async (user: User) => await saveUser(user) || await saveLocalUser(user),
  getFaction: async (factionId: string) => await getFaction(factionId) || await getLocalFaction(factionId),
  saveFaction: async (faction: Faction) => await saveFaction(faction) || await saveLocalFaction(faction),
  logDramaEvent: async (event: DramaEvent) => await logDramaEvent(event) || await logLocalDramaEvent(event),
  getRecentDramaEvents: async (limit: number = 10) => 
    (await getRecentDramaEvents(limit)).length > 0 
      ? await getRecentDramaEvents(limit) 
      : await getLocalRecentDramaEvents(limit)
};
