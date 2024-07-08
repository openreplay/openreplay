import BaseService from "./BaseService";

interface SpotInfo {
  name: string;
  duration: number;
  comments: SpotComment[];
  mobURL: string;
  videoURL: string;
  createdAt: string;
  userID: number;
}
interface SpotComment {
  user: string;
  text: string;
  createdAt: string;
}

interface GetSpotResponse {
  spot: SpotInfo;
}

interface UpdateSpotRequest {
  name: string;
  /** timestamp of public key expiration */
  keyExpiration: number;
}

interface AddCommentRequest {
  userName: string;
  comment: string;
}

interface GetSpotsResponse {
  spots: SpotInfo[];
  total: number;
}

interface GetSpotsRequest {
  query?: string;
  filterBy: "own" | "all" | "shared";
  /** @default desc, order by created date */
  order: "asc" | "desc";
  page: number;
  limit: number;
}

export default class SpotService extends BaseService {
  async fetchSpots(filters: GetSpotsRequest): Promise<GetSpotsResponse> {
    return this.client.get('/spot/v1/spots', filters)
      .then(r => r.json())
      .catch(console.error)
  }

  async fetchSpot(id: string): Promise<GetSpotResponse> {
    return this.client.get(`/spot/v1/spots/${id}`)
      .then(r => r.json())
      .catch(console.error)
  }

  async updateSpot(id: number, filter: UpdateSpotRequest) {
    return this.client.patch(`/spot/v1/spots/${id}`, filter)
      .then(r => r.json())
      .catch(console.error)
  }

  async deleteSpot(spotIDs: string[]) {
    return this.client.delete(`/spot/v1/spots`, {
      spotIDs
    })
      .then(r => r.json())
      .catch(console.error)
  }

  async addComment(id: string, data: AddCommentRequest) {
    return this.client.post(`/spot/v1/spots/${id}/comment`, data)
      .then(r => r.json())
      .catch(console.error)
  }
}