// DynamicEventGenerator: Schedules and triggers showdowns, spotlight challenges, and surprise creative events
import { WorldStateManager, DramaEvent } from './worldState';

export type DynamicEvent = {
  name: string;
  trigger: (state: WorldStateManager) => boolean;
  execute: (state: WorldStateManager) => DramaEvent;
  cooldown: number;
};

export class DynamicEventGenerator {
  private events: DynamicEvent[] = [];
  private lastTrigger: Record<string, number> = {};
  constructor(events: DynamicEvent[]) {
    this.events = events;
  }
  tryTriggerEvents(state: WorldStateManager) {
    const now = Date.now();
    this.events.forEach(event => {
      if (event.trigger(state) && (!this.lastTrigger[event.name] || now - this.lastTrigger[event.name] > event.cooldown)) {
        const drama = event.execute(state);
        state.addDramaEvent(drama);
        this.lastTrigger[event.name] = now;
      }
    });
  }
}

// Example event
export const SpotlightChallengeEvent: DynamicEvent = {
  name: 'Spotlight Challenge',
  trigger: (state) => Math.random() < 0.01, // 1% chance per check
  execute: (state) => ({
    id: 'spotlight-challenge-' + Date.now(),
    type: 'spotlight_challenge',
    timestamp: Date.now(),
    participants: [],
    description: 'A playful Spotlight Challenge shakes up the world! Factions compete for the spotlight with creativity and flair.',
    impact: 50
  }),
  cooldown: 1000 * 60 * 60 // 1 hour
};
