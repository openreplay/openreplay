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

export default class AnalyticsService extends BaseService {
  getEvents = async (payload: EventsPayload): Promise<EventsResponse> => {
    const r = await this.client.post('/PROJECT_ID/events', payload);
    const { data } = await r.json();
    return data;
  };

  getEvent = async (eventId: string): Promise<EventResp> => {
    const r = await this.client.get(`/PROJECT_ID/events/${eventId}`);
    const data = await r.json();
    return data;
  };
}
