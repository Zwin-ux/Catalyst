export interface Tournament {
  id: string;
  name: string;
  startDate: Date;
  participants: string[]; // userIds
}
