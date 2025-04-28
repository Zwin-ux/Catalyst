export interface PointEvent {
  id: string;
  userId: string;
  type: 'voiceTime' | 'vote' | 'topicStart';
  points: number;
  timestamp: Date;
}
