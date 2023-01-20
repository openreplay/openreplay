import Record from 'Types/Record';
import { Map } from 'immutable';

interface ILimitValue {
  limit: number
  remaining: number
}

export interface ILimits {
  teamMember: ILimitValue
  sites: ILimitValue
}

const defaultValues = Map({ limit: 0, remaining: 0 });
const Limit = Record({
  teamMember: defaultValues,
  sites: defaultValues
});

export default Limit;