// Timeline & analytics: Visualizes drama, milestones, betrayals
import { WorldStateManager, DramaEvent } from './worldState';

export class TimelineAnalytics {
  static getRecentEvents(state: WorldStateManager, count = 10): DramaEvent[] {
    return state.getState().dramaTimeline.slice(-count);
  }
  static getTopSpotlightUsers(state: WorldStateManager, count = 5) {
    const users = Object.values(state.getState().users);
    return users.sort((a, b) => b.hype - a.hype).slice(0, count);
  }
  static getBiggestPlotTwists(state: WorldStateManager, count = 3) {
    return state.getState().dramaTimeline.filter(e => e.type === 'plot_twist').slice(-count);
  }
  // ...more analytics
}
