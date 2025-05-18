declare module '@core/worldState' {
  export interface WorldStateUser {
    id: string;
    username: string;
    points: number;
    factionId?: string;
    // Add other user properties as needed
  }

  export interface Faction {
    id: string;
    name: string;
    description: string;
    leaderId: string;
    memberIds: string[];
    power: number;
    createdAt: Date;
  }

  export interface DramaEvent {
    id: string;
    title: string;
    description: string;
    participants: string[];
    startTime: Date;
    endTime: Date;
    isActive: boolean;
  }

  export class WorldStateManager {
    constructor();
    
    // User management
    getOrCreateUser(userId: string, username: string): Promise<WorldStateUser>;
    getUser(userId: string): Promise<WorldStateUser | null>;
    updateUser(user: WorldStateUser): Promise<void>;
    
    // Faction management
    createFaction(name: string, leaderId: string, description: string): Promise<Faction>;
    getFaction(factionId: string): Promise<Faction | null>;
    updateFaction(faction: Faction): Promise<void>;
    deleteFaction(factionId: string): Promise<void>;
    
    // Event management
    createEvent(event: Omit<DramaEvent, 'id' | 'isActive'>): Promise<DramaEvent>;
    getEvent(eventId: string): Promise<DramaEvent | null>;
    updateEvent(event: DramaEvent): Promise<void>;
    deleteEvent(eventId: string): Promise<void>;
    
    // Cleanup
    destroy(): Promise<void>;
  }
}
