import { makeAutoObservable } from 'mobx';

import { spotService } from 'App/services';
import { UpdateSpotRequest } from 'App/services/spotService';

import { Spot } from './types/spot';

export default class SpotStore {
  isLoading: boolean = false;

  spots: Spot[] = [];

  currentSpot: Spot | null = null;

  page: number = 1;

  filter: 'all' | 'own' = 'all';

  query: string = '';

  total: number = 0;

  limit: number = 9;

  accessKey: string | undefined = undefined;

  pubKey: { value: string; expiration: number } | null = null;

  readonly order = 'desc';

  accessError = false;

  tenantHasSpots = false;

  constructor() {
    makeAutoObservable(this);
  }

  setAccessError(error: boolean) {
    this.accessError = error;
  }

  clearCurrent = () => {
    this.currentSpot = null;
    this.pubKey = null;
    this.accessKey = undefined;
  };

  withLoader<T>(fn: () => Promise<T>): Promise<T> {
    this.setLoading(true);
    return fn().finally(() => {
      this.setLoading(false);
    });
  }

  setAccessKey(key: string) {
    this.accessKey = key;
  }

  setSpots(spots: Spot[]) {
    this.spots = spots;
  }

  setCurrentSpot(spot: Spot) {
    this.currentSpot = spot;
  }

  setFilter(filter: 'all' | 'own') {
    this.filter = filter;
  }

  setQuery(query: string) {
    this.query = query;
  }

  setPage(page: number) {
    this.page = page;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setTotal(total: number) {
    this.total = total;
  }

  fetchSpots = async () => {
    const filters = {
      page: this.page,
      filterBy: this.filter,
      query: this.query,
      order: this.order,
      limit: this.limit,
    } as const;

    const { spots, tenantHasSpots, total } = await this.withLoader(() =>
      spotService.fetchSpots(filters),
    );
    this.setSpots(spots.map((spot: any) => new Spot(spot)));
    this.setTotal(total);
    this.setTenantHasSpots(tenantHasSpots);
  };

  setTenantHasSpots(hasSpots: boolean) {
    this.tenantHasSpots = hasSpots;
  }

  async fetchSpotById(id: string) {
    try {
      const response = await this.withLoader(() =>
        spotService.fetchSpot(id, this.accessKey),
      );

      const spotInst = new Spot({ ...response.spot, id });
      this.setCurrentSpot(spotInst);

      return spotInst;
    } catch (e) {
      if (e.response.status === 401 || e.response.status === 403) {
        this.setAccessError(true);
      }
      throw e;
    }
  }

  async addComment(spotId: string, comment: string, userName: string) {
    await this.withLoader(async () => {
      await spotService.addComment(
        spotId,
        { comment, userName },
        this.accessKey,
      );
      const spot = this.currentSpot;
      if (spot) {
        spot.comments!.push({
          text: comment,
          user: userName,
          createdAt: new Date().toISOString(),
        });
        this.setCurrentSpot(spot);
      }
    });
  }

  async deleteSpot(spotIds: string[]) {
    await this.withLoader(() => spotService.deleteSpot(spotIds));
    this.spots = this.spots.filter(
      (spot) => spotIds.findIndex((s) => s === spot.spotId) === -1,
    );
    this.total -= spotIds.length;
    await this.fetchSpots();
  }

  async updateSpot(spotId: string, data: UpdateSpotRequest) {
    await this.withLoader(() => spotService.updateSpot(spotId, data));
    if (data.name !== undefined) {
      const updatedSpots = this.spots.map((s) => {
        if (s.spotId === spotId) {
          s.title = data.name!;
        }
        return s;
      });
      this.setSpots(updatedSpots);
    }
  }

  async getVideo(id: string) {
    return await this.withLoader(() => spotService.getVideo(id));
  }

  setPubKey(key: { value: string; expiration: number }) {
    this.pubKey = key;
  }

  /**
   * @param expiration - in seconds
   * @param id - spot id string
   * */
  generateKey = async (id: string, expiration: number) => {
    try {
      const { key } = await this.withLoader(() =>
        spotService.generateKey(id, expiration),
      );
      this.setPubKey(key);
      return key;
    } catch (e) {
      console.error('couldnt generate pubkey');
    }
  };

  getPubKey = async (id: string) => {
    try {
      const { key } = await this.withLoader(() => spotService.getKey(id));
      this.setPubKey(key);
    } catch (e) {
      console.error('no pubkey', e);
    }
  };

  checkIsProcessed = async (id: string) => {
    try {
      const { status } = await this.withLoader(() =>
        spotService.checkProcessingStatus(id, this.accessKey),
      );

      return status === 'processed';
    } catch (e) {
      console.error('couldnt check status', e);
      return false;
    }
  };
}
