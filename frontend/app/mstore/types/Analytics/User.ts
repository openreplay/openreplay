import { UserResp } from '@/services/AnalyticsService';

const default_keys = [
  '$avatar',
  '$city',
  '$country',
  '$created_at',
  '$current_url',
  '$email',
  '$first_event_at',
  '$first_name',
  '$initial_referrer',
  '$last_name',
  '$last_seen',
  '$name',
  '$or_api_endpoint',
  '$phone',
  '$referring_domain',
  '$sdk_edition',
  '$sdk_version',
  '$state',
  '$timezone',
  '$user_id',
  'distinct_ids',
  'group_id1',
  'group_id2',
  'group_id3',
  'group_id4',
  'group_id5',
  'group_id6',
  'initial_utm_campaign',
  'initial_utm_medium',
  'initial_utm_source',
  'properties',
];

export const searchableColumns = [
  '$user_id',
  '$email',
  '$name',
  '$first_name',
  '$last_name',
  '$phone',
  '$avatar',
  '$created_at',
  '$country',
  '$state',
  '$city',
  '$timezone',
  '$first_event_at',
  '$last_seen',
  '$sdk_edition',
  '$sdk_version',
  '$current_url',
  '$initial_referrer',
  '$referring_domain',
  'initial_utm_source',
  'initial_utm_medium',
  'initial_utm_campaign',
  'properties',
];
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

  raw: UserResp;

  constructor(user: Record<string, any>) {
    this.avatarUrl = user.$avatar;
    this.raw = user as UserResp;
    this.name = user.$name ?? 'N/A';
    this.userId = user.$user_id ?? 'N/A';
    this.distinctId = user.distinct_ids ?? [];
    this.userLocation = `${user.$city || 'N/A'}, ${user.$state ? user.$state + ', ' : ''}${user.$country || 'N/A'}`;
    this.cohorts = []; // 1.24
    this.properties = user.properties ?? {};
    this.createdAt = user.$created_at ?? Date.now();
    this.lastSeen = user.$last_seen;
    this.email = user.$email;
  }

  toRespType = (): UserResp => {
    return this.raw;
  };
}
