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

// Helper function to safely update a record
async function updateRecord<T extends { id: string }>(
  table: string, 
  id: string, 
  data: Partial<T>
): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id);
    
  if (error) {
    console.error(`Error updating ${table}:`, error);
    return false;
  }
  
  return true;
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

export async function updateUser(userId: string, data: Partial<User>): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('users')
    .update(data)
    .eq('id', userId);
    
  if (error) {
    console.error('Error updating user:', error);
    return false;
  }
  
  return true;
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

export async function updateFaction(factionId: string, data: Partial<Faction>): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('factions')
    .update(data)
    .eq('id', factionId);
    
  if (error) {
    console.error('Error updating faction:', error);
    return false;
  }
  
  return true;
}

export async function deleteFaction(factionId: string): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('factions')
    .delete()
    .eq('id', factionId);
    
  if (error) {
    console.error('Error deleting faction:', error);
    return false;
  }
  
  return true;
}

export async function getAllFactions(): Promise<Faction[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('factions')
    .select('*');
    
  if (error) {
    console.error('Error fetching all factions:', error);
    return [];
  }
  
  return data as Faction[];
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

export async function updateDramaEvent(event: DramaEvent): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('drama_events')
    .update(event)
    .eq('id', event.id);
    
  if (error) {
    console.error('Error updating drama event:', error);
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
interface LocalStore {
  users: Map<string, User>;
  factions: Map<string, Faction>;
  dramaEvents: Map<string, DramaEvent>;
  lastEventId: number;
}

const localStore: LocalStore = {
  users: new Map<string, User>(),
  factions: new Map<string, Faction>(),
  dramaEvents: new Map<string, DramaEvent>(),
  lastEventId: 0,
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
  try {
    // Ensure we're working with a proper DramaEvent object
    const dramaEvent: DramaEvent = {
      ...event,
      // Ensure timestamp is a Date object
      timestamp: event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp)
    };
    
    localStore.dramaEvents.set(dramaEvent.id, dramaEvent);
    localStore.lastEventId++;
    return true;
  } catch (error) {
    console.error('Error in logLocalDramaEvent:', error);
    return false;
  }
}

export async function getLocalRecentDramaEvents(limit: number = 10): Promise<DramaEvent[]> {
  // Convert Map values to array and sort by timestamp (newest first)
  return Array.from(localStore.dramaEvents.values())
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

// Export unified functions that try Supabase first, then fall back to local
export const db = {
  // User operations
  getUser: supabase ? getUser : getLocalUser,
  saveUser: supabase ? saveUser : saveLocalUser,
  updateUser: supabase ? updateUser : async (userId: string, data: Partial<User>) => {
    const user = await getLocalUser(userId);
    if (!user) return false;
    Object.assign(user, data);
    return saveLocalUser(user);
  },
  
  // Faction operations
  getFaction: supabase ? getFaction : getLocalFaction,
  saveFaction: supabase ? saveFaction : saveLocalFaction,
  updateFaction: supabase ? updateFaction : async (factionId: string, data: Partial<Faction>) => {
    const faction = await getLocalFaction(factionId);
    if (!faction) return false;
    Object.assign(faction, data);
    return saveLocalFaction(faction);
  },
  deleteFaction: supabase ? deleteFaction : async (factionId: string) => {
    localStore.factions.delete(factionId);
    return true;
  },
  getAllFactions: supabase ? getAllFactions : async () => {
    return Array.from(localStore.factions.values());
  },
  
  // Drama event operations
  logDramaEvent: supabase ? logDramaEvent : logLocalDramaEvent,
  getRecentDramaEvents: supabase ? getRecentDramaEvents : getLocalRecentDramaEvents,
  updateDramaEvent: supabase ? updateDramaEvent : async (event: DramaEvent) => {
    try {
      // Ensure we're working with a proper DramaEvent object
      const dramaEvent: DramaEvent = {
        ...event,
        // Ensure timestamp is a Date object
        timestamp: event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp)
      };
      
      localStore.dramaEvents.set(dramaEvent.id, dramaEvent);
      return true;
    } catch (error) {
      console.error('Error in updateDramaEvent:', error);
      return false;
    }
  },
};
