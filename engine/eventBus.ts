export type EngineEvent = { type: string; payload: any };
export type EventHandler = (event: EngineEvent) => void;

export class EventBus {
  private handlers: Record<string, EventHandler[]> = {};
  on(eventType: string, handler: EventHandler) {
    if (!this.handlers[eventType]) this.handlers[eventType] = [];
    this.handlers[eventType].push(handler);
  }
  emit(event: EngineEvent) {
    (this.handlers[event.type] || []).forEach(fn => fn(event));
  }
}
