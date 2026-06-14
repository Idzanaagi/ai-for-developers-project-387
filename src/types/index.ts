export interface Booking {
  id: string;
  guestName: string;
  guestEmail: string;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
}

export interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}
