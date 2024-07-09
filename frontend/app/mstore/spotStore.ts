import { makeAutoObservable } from 'mobx';
import { Spot } from './types/spot'
import { spotService } from "App/services";

export default class SpotStore {
  isLoading: boolean = false;
  spots: Spot[] = [];
  currentSpot: Spot | null = null;
  page: number = 1;
  filter: 'all' | 'own' = 'all';
  query: string = '';
  total: number = 3;
  limit: number = 10;
  readonly order = 'desc'

  constructor() {
    makeAutoObservable(this)
  }

  withLoader<T>(fn: () => Promise<T>): Promise<T> {
    this.setLoading(true);
    return fn().finally(() => {
      this.setLoading(false);
    });
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

  async fetchSpots() {
    const filters = {
      page: this.page,
      filterBy: this.filter,
      query: this.query,
      order: this.order,
      limit: this.limit
    } as const

    const response = await this.withLoader(() =>
      spotService.fetchSpots(filters)
    );
    this.setSpots(response.spots.map((spot: any) => new Spot(spot)));
    this.setTotal(response.total);
  }

  async fetchSpotById(id: string) {
    const response = await this.withLoader(() =>
      spotService.fetchSpot(id)
    )

    this.setCurrentSpot(new Spot(response))
  }
}