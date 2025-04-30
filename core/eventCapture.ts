/**
 * Event Capture Engine
 * --------------------
 * Centralises all Discord gateway events (messageCreate, reactionAdd, voiceStateUpdate, etc.)
 * and re-emits them on an internal typed EventEmitter so downstream modules
 * such as DramaAnalytics, FactionSystem or plugins can subscribe without
 * being tightly coupled to the Discord.js client.
 */

import { Client, Message, PartialMessage, MessageReaction, PartialMessageReaction, User, PartialUser, VoiceState } from 'discord.js';
import { EventEmitter } from 'events';

// ------- Internal Event Types ------------------------------------------- //
export interface CatalystEvents {
  /** New user message */
  message: [Message];
  /** Reaction added */
  reactionAdd: [MessageReaction | PartialMessageReaction, User | PartialUser];
  /** Reaction removed */
  reactionRemove: [MessageReaction | PartialMessageReaction, User | PartialUser];
  /** Voice state update */
  voiceStateUpdate: [VoiceState, VoiceState];
}

// Shortcut overload helper derived from CatalystEvents keys
export type CatalystEventName = keyof CatalystEvents;

// Create a strongly-typed EventEmitter by extending Node.js EventEmitter
class TypedEmitter extends EventEmitter {
  override on<E extends CatalystEventName>(event: E, listener: (...args: CatalystEvents[E]) => void): this {
    return super.on(event, listener);
  }
  override once<E extends CatalystEventName>(event: E, listener: (...args: CatalystEvents[E]) => void): this {
    return super.once(event, listener);
  }
  override emit<E extends CatalystEventName>(event: E, ...args: CatalystEvents[E]): boolean {
    return super.emit(event, ...args);
  }
}

class EventCaptureEngine {
  private static _instance: EventCaptureEngine;
  private emitter: TypedEmitter = new TypedEmitter();
  private initialised = false;

  /** Singleton accessor */
  public static get instance(): EventCaptureEngine {
    if (!EventCaptureEngine._instance) {
      EventCaptureEngine._instance = new EventCaptureEngine();
    }
    return EventCaptureEngine._instance;
  }

  /** Initialise with Discord client – should be called once after login */
  public init(client: Client): void {
    if (this.initialised) return;
    this.initialised = true;

    // ----- Gateway hooks -------------------------------------------------- //
    client.on('messageCreate', (msg) => this.emitter.emit('message', msg));

    client.on('messageReactionAdd', (reaction, user) =>
      this.emitter.emit('reactionAdd', reaction, user)
    );
    client.on('messageReactionRemove', (reaction, user) =>
      this.emitter.emit('reactionRemove', reaction, user)
    );

    client.on('voiceStateUpdate', (oldState, newState) =>
      this.emitter.emit('voiceStateUpdate', oldState, newState)
    );

    console.log('[EventCapture] Engine initialised – forwarding gateway events');
  }

  /** Subscribe to an internal event */
  public on<E extends CatalystEventName>(event: E, listener: (...args: CatalystEvents[E]) => void): void {
    this.emitter.on(event, listener);
  }

  /** Unsubscribe */
  public off<E extends CatalystEventName>(event: E, listener: (...args: CatalystEvents[E]) => void): void {
    this.emitter.off(event, listener);
  }
}

// Export singleton
export const eventCapture = EventCaptureEngine.instance;
