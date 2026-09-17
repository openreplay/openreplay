import BaseService from './BaseService';

export interface SpotInfo {
  name: string;
  duration: number;
  comments: SpotComment[];
  mobURL: string;
  videoURL: string;
  createdAt: string;
  userID: number;
}
export interface SpotComment {
  user: string;
  text: string;
  createdAt: string;
}

interface GetSpotResponse {
  spot: SpotInfo;
}

export interface UpdateSpotRequest {
  name?: string;
  /** timestamp of public key expiration */
  keyExpiration?: number;
}

interface AddCommentRequest {
  userName: string;
  comment: string;
}

interface GetSpotsResponse {
  spots: SpotInfo[];
  total: number;
  tenantHasSpots: boolean;
}

interface GetSpotsRequest {
  query?: string;
  filterBy: 'own' | 'all' | 'shared';
  /** @default desc, order by created date */
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

export default class SpotService extends BaseService {
  async fetchSpots(filters: GetSpotsRequest): Promise<GetSpotsResponse> {
    return this.client
      .get('/spot/spots', filters)
      .then((r) => r.json());
  }

  async fetchSpot(id: string, accessKey?: string): Promise<GetSpotResponse> {
    return this.client
      .get(`/spot/spots/${id}${accessKey ? `?key=${accessKey}` : ''}`)
      .then((r) => r.json());
  }

  async updateSpot(id: string, filter: UpdateSpotRequest) {
    // 200 with an empty body — parsing it would reject on a successful update.
    return this.client.patch(`/spot/spots/${id}`, filter).then(() => undefined);
  }

  async deleteSpot(spotIDs: string[]) {
    // 200 with an empty body — parsing it would reject on a successful delete.
    return this.client
      .delete('/spot/spots', {
        spotIDs,
      })
      .then(() => undefined);
  }

  async addComment(id: string, data: AddCommentRequest, accessKey?: string) {
    return this.client
      .post(
        `/spot/spots/${id}/comment${accessKey ? `?key=${accessKey}` : ''}`,
        data,
      )
      .then((r) => r.json());
  }

  async getVideo(id: string) {
    return this.client
      .get(`/spot/spots/${id}/video`)
      .then((r) => r.json());
  }

  /**
   * @param id - spot id string
   * @param expiration - in seconds, 0 if removing
   * */
  async generateKey(
    id: string,
    expiration: number,
  ): Promise<{ key: { value: string; expiration: number } }> {
    return this.client
      .patch(`/spot/spots/${id}/public-key`, { expiration })
      .then((r) => r.json());
  }

  async getKey(
    id: string,
  ): Promise<{ key: { value: string; expiration: number } }> {
    return this.client
      .get(`/spot/spots/${id}/public-key`)
      .then((r) => r.json());
  }

  async checkProcessingStatus(id: string, accessKey?: string) {
    return this.client
      .get(`/spot/spots/${id}/status${accessKey ? `?key=${accessKey}` : ''}`)
      .then((r) => r.json());
  }
}
