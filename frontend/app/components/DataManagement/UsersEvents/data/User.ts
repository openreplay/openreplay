export default class User {
  name: string;
  userId: string;
  distinctId: string[];
  userLocation: string;
  cohorts: string[];
  properties: Record<string, any>;
  updatedAt: number;

  constructor({
    name,
    userId,
    distinctId,
    userLocation,
    cohorts,
    properties,
    updatedAt
  }: {
    name: string;
    userId: string;
    distinctId: string[];
    userLocation: string;
    cohorts: string[];
    properties: Record<string, any>;
    updatedAt: number;
  }) {
    this.name = name;
    this.userId = userId;
    this.distinctId = distinctId;
    this.userLocation = userLocation;
    this.cohorts = cohorts;
    this.properties = properties;
    this.updatedAt = updatedAt;
  }
}
