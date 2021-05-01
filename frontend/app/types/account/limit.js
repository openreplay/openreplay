import Record from 'Types/Record';
import { Map } from 'immutable';

const defaultValues = Map({ limit: 0, remaining: 0 });
const Limit = Record({
  teamMember: defaultValues,
  sites: defaultValues
});

export default Limit;