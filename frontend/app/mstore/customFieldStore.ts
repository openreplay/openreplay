import { makeAutoObservable } from 'mobx';
import { customFieldService, filterService } from 'App/services';
import {
  addElementToConditionalFiltersMap,
  addElementToMobileConditionalFiltersMap,
  addElementToFiltersMap,
  addElementToFlagConditionsMap,
  addElementToLiveFiltersMap,
  clearMetaFilters,
} from 'Types/filter/newFilter';
import { FilterCategory, FilterType } from 'Types/filter/filterType';
import CustomField from 'App/mstore/types/customField';
import filterOptions from 'App/constants';

class CustomFieldStore {
  isLoading: boolean = false;

  isAllLoading: boolean = false;

  isSaving: boolean = false;

  list: CustomField[] = [];

  allList: CustomField[] = [];

  instance: CustomField = new CustomField();

  sources: CustomField[] = [];

  fetchedMetadata: boolean = false;

  search: string = '';

  constructor() {
    makeAutoObservable(this);
  }

  edit = (field: Partial<CustomField>) => {
    Object.assign(this.instance!, field);
  };

  async fetchList(siteId?: string): Promise<any> {
    this.isLoading = true;
    try {
      const response = await customFieldService.get(siteId);
      this.list = response.map((item: any) => new CustomField(item));
    } finally {
      this.isLoading = false;
    }
  }

  async fetchListActive(siteId?: string): Promise<any> {
    this.isLoading = true;
    try {
      const response = await customFieldService.fetchList(siteId);
      clearMetaFilters();
      response.forEach((item: any) => {
        const calls = [
          addElementToFiltersMap,
          addElementToLiveFiltersMap,
          addElementToFlagConditionsMap,
          addElementToConditionalFiltersMap,
          addElementToMobileConditionalFiltersMap,
        ];
        calls.forEach((call) => {
          call(FilterCategory.METADATA, `_${item.key}`);
        });
      });
      this.list = response.map((item_1: any) => new CustomField(item_1));
      this.fetchedMetadata = true;
      // custom_event values fetcher; turned off for now; useful for later
      // filterService.fetchTopValues('custom', undefined).then((response: []) => {
      //   response.forEach((item: any) => {
      //     const calls = [
      //       addElementToFiltersMap,
      //       addElementToFlagConditionsMap,
      //       addElementToConditionalFiltersMap,
      //       addElementToMobileConditionalFiltersMap,
      //     ];
      //     calls.forEach((call) => {
      //       call(
      //         FilterCategory.EVENTS,
      //         '_' + item.value,
      //         FilterType.MULTIPLE,
      //         'is',
      //         filterOptions.stringOperators,
      //         'filters/custom',
      //         true
      //       );
      //     });
      //   });
      // });
    } finally {
      this.isLoading = false;
    }
  }

  async fetchSources(): Promise<any> {
    this.isLoading = true;
    try {
      const response = await customFieldService.get('/integration/sources');
      this.sources = response.map(
        ({ value, ...item }: any) =>
          new CustomField({
            label: value,
            key: value,
            ...item,
          }),
      );
    } finally {
      this.isLoading = false;
    }
  }

  async save(siteId: string, instance: CustomField): Promise<any> {
    this.isSaving = true;
    try {
      const wasCreating = !instance.exists();
      const response = wasCreating
        ? await customFieldService.create(siteId, instance.toData())
        : await customFieldService.update(siteId, instance.toData());
      const updatedInstance = new CustomField(response);

      if (wasCreating) {
        this.list.push(updatedInstance);
      } else {
        const index = this.list.findIndex(
          (item) => item.index === instance.index,
        );
        if (index >= 0) this.list[index] = updatedInstance;
      }
    } finally {
      this.isSaving = false;
    }
  }

  async remove(siteId: string, index: string): Promise<any> {
    this.isSaving = true;
    try {
      await customFieldService.delete(siteId, index);
      this.list = this.list.filter((item) => item.index !== index);
    } finally {
      this.isSaving = false;
    }
  }

  init(instance?: any) {
    // this.instance = new CustomField(instance);
    if (instance) {
      this.instance = new CustomField().fromJson(instance);
    } else {
      this.instance = new CustomField();
    }
  }
}

export default CustomFieldStore;
