import { makeAutoObservable } from 'mobx';
import FeatureFlag from './types/FeatureFlag';
import { fflagsService } from 'App/services';

export default class FeatureFlagsStore {
  currentFflag: FeatureFlag | null = null;
  isDescrEditing: boolean = false;
  isTitleEditing: boolean = false;
  flags: FeatureFlag[] = [];
  isLoading: boolean = false;
  flagsSearch: string = '';
  sort = { order: 'desc' };
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
    return this.flags.find((f) => f.name === id);
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

  fetchFlags = async () => {
    this.setLoading(true);
    try {
      const { records } = await fflagsService.fetchFlags();
      const flags = records.map((record) => new FeatureFlag(record));
      this.setList(flags);
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };

  createFlag = async () => {
    if (this.currentFflag) {
      this.setLoading(true);
      try {
        const result = await fflagsService.createFlag(this.currentFflag.toJS());
        this.setCurrentFlag(new FeatureFlag(result));
      } catch (e) {
        console.error(e);
      } finally {
        this.setLoading(false);
      }
    }
  };

  updateFlag = async () => {
    if (this.currentFflag) {
      this.setLoading(true);
      try {
        const result = await fflagsService.updateFlag(this.currentFflag.toJS());
        this.setCurrentFlag(new FeatureFlag(result));
      } catch (e) {
        console.error(e);
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
      const result = await fflagsService.fetchFlag(id);
      this.setCurrentFlag(new FeatureFlag(result));
    } catch (e) {
      console.error(e);
    } finally {
      this.setLoading(false);
    }
  };
}
