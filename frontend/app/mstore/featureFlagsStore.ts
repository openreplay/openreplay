import { makeAutoObservable } from "mobx";
import FeatureFlag from "./types/FeatureFlag";

export default class FeatureFlagsStore {
  currentFflag: FeatureFlag | null = null;
  isEditing: boolean = false;
  flags: FeatureFlag[] = [];
  isLoading: boolean = false;
  flagsSearch: string = '';
  sort = { order: 'desc' }
  page: number = 1;
  readonly pageSize: number = 10;

  constructor() {
    makeAutoObservable(this);
  }

  setFlagsSearch = (search: string) => {
    this.flagsSearch = search;
  }

  setPage = (page: number) => {
    this.page = page;
  }

  setEditing = (isEditing: boolean) => {
    this.isEditing = isEditing;
  }

  setList = (flags: FeatureFlag[]) => {
    this.flags = flags;
  }

  deleteFlag = (flag: FeatureFlag) => {
    this.flags = this.flags.filter(f => f.name !== flag.name);
  }

  addFlag = (flag: FeatureFlag) => {
    this.flags.push(flag);
  }

  getFlagById = (id: string) => {
    return this.flags.find(f => f.name === id);
  }

  setCurrentFlag = (flag: FeatureFlag | null) => {
    this.currentFflag = flag;
  }

  initNewFlag = () => {
    this.currentFflag = new FeatureFlag()
  }
}