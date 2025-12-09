import BaseService from 'App/services/BaseService';
import { Filter } from '@/mstore/types/filterConstants';

export interface EventsPayload {
  filters: Filter[];
  sortOrder: 'asc' | 'desc';
  sortBy: string;
  limit: number;
  startTimestamp: number;
  endTimestamp: number;
  columns: string[];
  page: number;
}

export interface EventResp {
  $properties: Record<string, any>;
  auto_captured: true;
  browser: string;
  browser_version: string;
  city: string;
  country: string;
  created_at: number;
  current_path: string;
  current_url: string;
  description: string;
  device: string;
  device_id: string;
  distinct_id: string;
  duration_s: number;
  error_id: string;
  event_id: string;
  event_name: string;
  group_id1: string[];
  group_id2: string[];
  group_id3: string[];
  group_id4: string[];
  group_id5: string[];
  group_id6: string[];
  import: boolean;
  initial_referrer: string;
  initial_referring_domain: string;
  issue_id: string;
  issue_type: string;
  or_api_endpoint: string;
  os: string;
  os_version: string;
  properties: Record<string, any>;
  referrer: string;
  referring_domain: string;
  screen_height: 0;
  screen_width: 0;
  sdk_edition: string;
  sdk_version: string;
  search_engine: string;
  search_engine_keyword: string;
  session_id: string;
  source: string;
  state: string;
  tags: string[];
  time: number;
  timezone: number;
  user_id: string;
  utm_campaign: string;
  utm_medium: string;
  utm_source: string;
}

export interface SingleEvent {
  event_id: string;
  event_name: string;
  created_at: string;
  distinct_id: string;
  session_id: string;
  os: string;
  browser: string;
  city: string;
}

export interface EventsResponse {
  total: number;
  events: SingleEvent[];
}

export interface UsersPayload {
  filters: Filter[];
  sortOrder: 'asc' | 'desc';
  sortBy: string;
  limit: number;
  startTimestamp: number;
  endTimestamp: number;
  columns: string[];
  page: number;
}

export interface UserResp {
  $avatar: string;
  $city: string;
  $country: string;
  $created_at: 0;
  $current_url: string;
  $email: string;
  $first_event_at: 0;
  $first_name: string;
  $initial_referrer: string;
  $last_name: string;
  $last_seen: 0;
  $name: string;
  $or_api_endpoint: string;
  $phone: string;
  $referring_domain: string;
  $sdk_edition: string;
  $sdk_version: string;
  $state: string;
  $timezone: 0;
  $user_id: string;
  distinct_ids: string[];
  group_id1: string[];
  group_id2: string[];
  group_id3: string[];
  group_id4: string[];
  group_id5: string[];
  group_id6: string[];
  initial_utm_campaign: string;
  initial_utm_medium: string;
  initial_utm_source: string;
  properties: Record<string, any>;
}

export interface UsersResponse {
  total: number;
  users: UserResp[];
}

export interface ActivityPayload {
  endTimestamp: number;
  hideEvents: string[];
  limit: number;
  page: number;
  sortBy: string;
  sortOrder: string;
  startTimestamp: number;
}

export default class AnalyticsService extends BaseService {
  getEvents = async (payload: EventsPayload): Promise<EventsResponse> => {
    const r = await this.client.post('/PROJECT_ID/events', payload);
    const { data } = await r.json();
    return data;
  };

  getEvent = async (eventId: string): Promise<EventResp> => {
    const r = await this.client.get(`/PROJECT_ID/events/${eventId}`);
    const { data } = await r.json();
    return data;
  };

  getUsers = async (
    payload: UsersPayload & { query: string },
  ): Promise<UsersResponse> => {
    const r = await this.client.post('/PROJECT_ID/users', payload);
    const { data } = await r.json();
    return data;
  };

  getUser = async (userId: string): Promise<UserResp> => {
    const r = await this.client.get(`/PROJECT_ID/users/${userId}`);
    const { data } = await r.json();
    return data;
  };

  getUserActivity = async (
    userId: string,
    payload: ActivityPayload,
  ): Promise<EventsResponse> => {
    const r = await this.client.post(
      `/PROJECT_ID/users/${userId}/activity`,
      payload,
    );
    const data = await r.json();
    return data;
  };

  deleteUser = async (userId: string): Promise<void> => {
    await this.client.delete(`/PROJECT_ID/users/${userId}`);
  };

  updateUser = async (
    userId: string,
    /** can be partial user data */
    user: Partial<UserResp>,
  ): Promise<void> => {
    await this.client.put(`/PROJECT_ID/users/${userId}`, user);
  };
}
