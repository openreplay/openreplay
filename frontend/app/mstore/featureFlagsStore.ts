import { makeAutoObservable } from 'mobx';
import FeatureFlag from './types/FeatureFlag';
import { fflagsService } from 'App/services';

type All = '0'
type Active = '1'
type Inactive = '2'
export type Activity = All | Active | Inactive

export default class FeatureFlagsStore {
  currentFflag: FeatureFlag | null = null;
  isDescrEditing: boolean = false;
  isTitleEditing: boolean = false;
  flags: FeatureFlag[] = [];
  isLoading: boolean = false;
  flagsSearch: string = '';
  activity: Activity = '0';
  sort = { order: 'DESC', query: '' };
  page: number = 1;
  readonly pageSize: number = 10;

  constructor() {
    makeAutoObservable(this);
  }

  setFlagsSearch = (search: string) => {
    this.flagsSearch = search;
  };

  setPage = (page: number) => {
    this.page = page;
  };

  setEditing = ({ isDescrEditing = false, isTitleEditing = false }) => {
    this.isDescrEditing = isDescrEditing;
    this.isTitleEditing = isTitleEditing;
  };

  setList = (flags: FeatureFlag[]) => {
    this.flags = flags;
  };

  removeFromList = (id: FeatureFlag['featureFlagId']) => {
    this.flags = this.flags.filter((f) => f.featureFlagId !== id);
  };

  addFlag = (flag: FeatureFlag) => {
    this.flags.push(flag);
  };

  getFlagById = (id: string) => {
    return this.flags.find((f) => f.featureFlagId === parseInt(id, 10));
  };

  setCurrentFlag = (flag: FeatureFlag | null) => {
    this.currentFflag = flag;
  };

  initNewFlag = () => {
    this.currentFflag = new FeatureFlag();
  };

  setLoading = (isLoading: boolean) => {
    this.isLoading = isLoading;
  };

  setActivity = (activity: Activity) => {
    this.activity = activity;
  }

  setSort = (sort: { order: string, query: string }) => {
    this.sort = sort;
  }

  fetchFlags = async () => {
    this.setLoading(true);
    try {
      const filters = {
        limit: this.pageSize,
        page: this.page,
        order: this.sort.order,
        query: this.sort.query,
        isActive: this.activity === '0' ? undefined : this.activity === '1',
        // userId: 3,
      }
      const { list } = await fflagsService.fetchFlags(filters);
      const flags = list.map((record) => new FeatureFlag(record));
      this.setList(flags);
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  checkFlagForm = () => {
    if (!this.currentFflag) return 'Feature flag not initialized'
    if (this.currentFflag.flagKey === '') {
      return 'Feature flag must have a key'
    }
    if (this.currentFflag?.variants.findIndex((v) => v.value === '') !== -1) {
      return 'Variants must include key'
    }
    return null;
  }

  createFlag = async () => {
    if (this.currentFflag) {
      this.setLoading(true);
      try {
        // @ts-ignore
        const result = await fflagsService.createFlag(this.currentFflag.toJS());
        this.addFlag(new FeatureFlag(result));
      } catch (e) {
        console.error(e);
        throw e.response;
      } finally {
        this.setLoading(false);
      }
    }
  };

  updateFlag = async (flag?: FeatureFlag, skipLoader?: boolean) => {
    const usedFlag = flag || this.currentFflag;
    if (usedFlag) {
      if (!skipLoader) {
        this.setLoading(true);
      }
      try {
        // @ts-ignore
        const result = await fflagsService.updateFlag(usedFlag.toJS());
        if (!flag) this.setCurrentFlag(new FeatureFlag(result));
      } catch (e) {
        console.error('getting api error', e);
        throw e.response;
      } finally {
        this.setLoading(false);
      }
    }
  };

  deleteFlag = async (id: FeatureFlag['featureFlagId']) => {
    this.setLoading(true);
    try {
      await fflagsService.deleteFlag(id);
      this.removeFromList(id);
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  fetchFlag = async (id: FeatureFlag['featureFlagId']) => {
    this.setLoading(true);
    try {
      const result = await fflagsService.getFlag(id);
      this.setCurrentFlag(new FeatureFlag(result));
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };
}
