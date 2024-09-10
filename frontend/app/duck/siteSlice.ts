import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Site, { ISite } from "Types/site";
import GDPR, { IGDPR } from 'Types/site/gdpr';
import { apiClient } from 'App/api_client';

import { GLOBAL_HAS_NO_RECORDINGS, SITE_ID_STORAGE_KEY } from "../constants/storageKeys";
import { array } from "./funcTools/tools";


const storedSiteId = localStorage.getItem(SITE_ID_STORAGE_KEY);

interface SiteState {
  list: ISite[];
  instance: ISite | null;
  remainingSites?: number;
  siteId?: number;
  active: ISite | null;
}

const initialState: SiteState = {
  list: [],
  instance: null,
  remainingSites: undefined,
  siteId: undefined,
  active: null,
};

const siteSlice = createSlice({
  name: 'site',
  initialState,
  reducers: {
    init: (state, action: PayloadAction<ISite>) => {
      state.instance = action.payload;
    },
    editGDPR(state, action: PayloadAction<IGDPR>) {
      state.instance = {
        ...state.instance!,
        gdpr: action.payload,
      }
    },
    setSiteId(state, action: PayloadAction<string>) {
      const siteId = action.payload;
      const site = state.list.find((s) => s.id === parseInt(siteId));
      if (site) {
        state.siteId = siteId;
        state.active = site;
        localStorage.setItem(SITE_ID_STORAGE_KEY, siteId);
      }
    },
    updateProjectRecordingStatus(state, action: PayloadAction<{ siteId: string; status: boolean }>) {
      const { siteId, status } = action.payload;
      const site = state.list.find((s) => s.id === parseInt(siteId));
      if (site) {
        site.recorded = status;
      }
    },
    fetchGDPRSuccess(state, action: { data: IGDPR }) {
      state.instance = {
        ...state.instance!,
        gdpr: GDPR(action.data),
      }
    },
    saveSiteSuccess(state, action: { data: ISite }) {
      const newSite = Site(action.data);
      state.siteId = newSite.id;
      state.instance = newSite;
      state.active = newSite;
    },
    saveGDPRSuccess(state, action: { data: IGDPR }) {
      const gdpr = GDPR(action.data);
      state.instance = {
        ...state.instance!,
        gdpr: gdpr,
      }
    },
    fetchListSuccess(state, action: { data: ISite[], siteIdFromPath: number }) {
      const siteId = state.siteId;
      const ids = action.data.map(s => parseInt(s.projectId))
      const siteExists = ids.includes(parseInt(siteId!));
      if (action.siteIdFromPath && ids.includes(parseInt(action.siteIdFromPath))) {
        state.siteId = action.siteIdFromPath;
      } else if (!siteId || !siteExists) {
        state.siteId = ids.includes(parseInt(storedSiteId!))
                       ? storedSiteId
                       : action.data[0].projectId;
      }
      const list = action.data.map(Site);
      const hasRecordings = list.some(s => s.recorded);
      if (!hasRecordings) {
        localStorage.setItem(GLOBAL_HAS_NO_RECORDINGS, 'true');
      } else {
        localStorage.removeItem(GLOBAL_HAS_NO_RECORDINGS);
      }

      state.list = list;
      state.active = list.find(s => parseInt(s.id) === parseInt(state.siteId!));
    }
  },
})

export function save(site: ISite) {
  return {
    types: ['sites/saveSiteRequest', 'sites/saveSiteSuccess', 'sites/saveSiteFail'],
    call: (client) => client.post(`/projects`, site),
  };
}

export function fetchGDPR(siteId: number) {
  return {
    types: ['sites/fetchGDPRRequest', 'sites/fetchGDPRSuccess', 'sites/fetchGDPRFail'],
    call: (client) => client.get(`/${siteId}/gdpr`),
  };
}

export const saveGDPR = (siteId: number) => (dispatch, getState) => {
  const g = getState().site.instance.gdpr;
  return dispatch({
    types: ['sites/saveGDPRRequest', 'sites/saveGDPRSuccess', 'sites/saveGDPRFail'],
    call: client => client.post(`/${siteId}/gdpr`, g)
  });
};

export function fetchList(siteId: number) {
  return {
    types: ['sites/fetchListRequest', 'sites/fetchListSuccess', 'sites/fetchListFail'],
    call: client => client.get('/projects'),
    siteIdFromPath: siteId
  };
}