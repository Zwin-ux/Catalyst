// Progression system: XP, badges, hype, unlocks
import { WorldUser, WorldStateManager } from './worldState';

export class ProgressionSystem {
  static addXP(user: WorldUser, amount: number) {
    user.xp += amount;
    // TODO: Level up logic, badge unlocks
  }
  static addHype(user: WorldUser, amount: number) {
    user.hype = (user.hype || 0) + amount;
    // TODO: Hype-based unlocks
  }
  static unlockBadge(user: WorldUser, badge: string) {
    if (!user.badges.includes(badge)) user.badges.push(badge);
  }
  // ...more progression logic
}
