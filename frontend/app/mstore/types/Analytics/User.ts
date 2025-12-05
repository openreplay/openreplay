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

export const listColumns = ['$city', '$country', '$created_at', '$email', '$name'];

export default class User {
  name: string;
  userId: string;
  distinctId: string[];
  userLocation: string;
  cohorts: string[];
  properties: Record<string, any>;
  updatedAt: number;

  constructor(user: Record<string, any>) {
    this.name = user.$name ?? 'N/A';
    this.userId = user.$user_id ?? 'N/A';
    this.distinctId = user.distinct_ids ?? [];
    this.userLocation = `${user.$city ?? 'N/A'}, ${user.$country ?? 'N/A'}`;
    this.cohorts = []; // 1.24
    this.properties = user.properties ?? {};
    this.updatedAt = user.$created_at ?? Date.now();
  }
}
