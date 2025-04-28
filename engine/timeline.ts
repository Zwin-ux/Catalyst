// Timeline & analytics: Visualizes drama, milestones, betrayals
import { WorldStateManager, DramaEvent } from './worldState';

export class TimelineAnalytics {
  static getRecentEvents(state: WorldStateManager, count = 10): DramaEvent[] {
    return state.getState().dramaTimeline.slice(-count);
  }
  static getTopDramaUsers(state: WorldStateManager, count = 5) {
    const users = Object.values(state.getState().users);
    return users.sort((a, b) => b.dramaPoints - a.dramaPoints).slice(0, count);
  }
  static getBiggestBetrayals(state: WorldStateManager, count = 3) {
    return state.getState().dramaTimeline.filter(e => e.type === 'betrayal').slice(-count);
  }
  // ...more analytics
}
