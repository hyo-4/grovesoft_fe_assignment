export type Reward = {
  id: number;
  name: string;
  image: string;
};

export type EventResponse = {
  id: number;
  title: string;
  endDate: string;
  description: string;
  rewards: Reward[];
};
