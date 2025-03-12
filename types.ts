export type AccessGrantedEventUser = {
  id: number;
  firstName: string;
  lastName: string;
  surname: string;
  fullName: string;
};
export type AccessGrantedEventDoor = {
  id: number;
  name: string;
  side: "Enter" | "Exit";
};
export type AccessGrantedEvent = {
  scannerId: number;
  eventDate: string;
  user: AccessGrantedEventUser;
  door: AccessGrantedEventDoor;
  tags: string[];
};
