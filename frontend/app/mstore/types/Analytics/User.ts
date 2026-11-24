import { UserResp } from '@/services/AnalyticsService';
export const listColumns = [
  '$avatar',
  '$email',
  '$state',
  '$city',
  '$country',
  '$created_at',
  '$email',
  '$name',
  '$last_seen',
  // '$distinct_ids',
];

export const getSortingName = (field: string) => {
  if (field === 'userId') return '$user_id';
  if (field === 'name') return '$name';
  if (field === 'userLocation') return '$city';
  if (field === 'lastSeen') return '$last_seen';
  if (field === 'createdAt') return '$created_at';
  return field;
};

export default class User {
  name: string;
  userId: string;
  distinctId: string[];
  userLocation: string;
  cohorts: string[];
  properties: Record<string, any>;
  createdAt: number;
  avatarUrl?: string;
  lastSeen?: number;
  email?: string;
  city?: string;
  state?: string;
  country?: string;

  raw: UserResp;

  constructor(user: Record<string, any>) {
    this.avatarUrl = user.$avatar;
    this.raw = user as UserResp;
    this.name = user.$name ?? 'N/A';
    this.userId = user.$user_id ?? 'N/A';
    this.distinctId = user.distinct_ids ?? [];
    this.userLocation = `${user.$city || 'N/A'}, ${user.$state ? user.$state + ', ' : ''}${user.$country || 'N/A'}`;
    this.city = user.$city;
    this.state = user.$state;
    this.country = user.$country;
    this.cohorts = []; // 1.24
    this.properties = user.properties ?? {};
    this.createdAt = user.$created_at ?? Date.now();
    this.lastSeen = user.$last_seen;
    this.email = user.$email;
  }
}
