// Progression system: XP, badges, drama points, unlocks
import { WorldUser, WorldStateManager } from './worldState';

export class ProgressionSystem {
  static addXP(user: WorldUser, amount: number) {
    user.xp += amount;
    // TODO: Level up logic, badge unlocks
  }
  static addDramaPoints(user: WorldUser, amount: number) {
    user.dramaPoints += amount;
    // TODO: Drama-based unlocks
  }
  static unlockBadge(user: WorldUser, badge: string) {
    if (!user.badges.includes(badge)) user.badges.push(badge);
  }
  // ...more progression logic
}
