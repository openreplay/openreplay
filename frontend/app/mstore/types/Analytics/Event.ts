const default_keys = [
  'event_id',
  'event_name',
  'created_at',
  'distinct_id',
  'session_id',
  'user_id',
  'device_id',
  'time',
  'source',
  'duration_s',
  'description',
  'auto_captured',
  'sdk_edition',
  'sdk_version',
  'os',
  'os_version',
  'browser',
  'browser_version',
  'device',
  'screen_height',
  'screen_width',
  'current_url',
  'current_path',
  'initial_referrer',
  'referring_domain',
  'referrer',
  'initial_referring_domain',
  'search_engine',
  'search_engine_keyword',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'country',
  'state',
  'city',
  'or_api_endpoint',
  'timezone',
  'issue_type',
  'issue_id',
  'error_id',
  'import',
];

export const listColumns = ['$city', '$os', '$auto_captured'];

export default class Event {
  /** TABLE DATA */
  event_name: string;
  event_id: string;
  created_at: number;
  distinct_id: string;
  city: string;
  environment: string;
  session_id: string;
  isAutoCapture: boolean = false;
  /** TABLE DATA */

  custom_properties: Record<string, any> = {};
  default_properties: Record<string, any> = {};

  constructor(event: Record<string, any>) {
    this.event_name = event.event_name || 'N/A';
    this.city = event.city || 'N/A';
    this.environment = event.os || 'N/A';
    this.event_id = event.event_id || 'N/A';
    this.created_at = event.created_at || Date.now();
    this.distinct_id = event.distinct_id || 'N/A';
    this.session_id = event.session_id || 'N/A';
    this.isAutoCapture = event.auto_captured || false;

    for (let key of default_keys) {
      if (event[key] !== undefined && event[key] !== '') {
        const isBoolean = typeof event[key] === 'boolean';
        if (isBoolean) {
          this.default_properties[key] = event[key] ? 'true' : 'false';
        } else {
          this.default_properties[key] = event[key];
        }
      }
    }
    const defaultVariableProps = Object.keys(event.$properties ?? {});
    for (let key of defaultVariableProps) {
      if (!default_keys.includes(key)) {
        this.default_properties[key] = event.$properties[key];
      }
    }
    this.custom_properties = event.properties ?? {};
  }

  toJSON() {
    const obj = this.toData();
    return JSON.stringify(obj, 2);
  }

  toData() {
    return this;
  }

  get defaultProps() {
    return {
      event_name: this.event_name,
      event_id: this.event_id,
      created_at: this.created_at,
      distinct_id: this.distinct_id,
      session_id: this.session_id,
      city: this.city,
      environment: this.environment,
      ...this.default_properties,
    };
  }

  get customProps() {
    return this.custom_properties;
  }

  get allProps() {
    return {
      ...this.defaultProps,
      ...this.customProps,
    };
  }
}
