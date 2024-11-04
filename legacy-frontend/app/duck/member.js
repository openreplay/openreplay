import { Map } from 'immutable';
import Member from 'Types/member';
import crudDuckGenerator from './tools/crudDuck';
import { RequestTypes } from 'Duck/requestStateCreator';
import { reduceDucks } from 'Duck/tools';

const GENERATE_LINK = new RequestTypes('member/GENERATE_LINK');

const crudDuck = crudDuckGenerator('client/member', Member, { idKey: 'id' });
export const { fetchList, init, edit, remove, } = crudDuck.actions;

const initialState = Map({
  definedPercent: 0,
});

const reducer = (state = initialState, action = {}) => {
  switch (action.type) {
    case GENERATE_LINK.SUCCESS:      
      return state.update(
        'list',
        list => list
          .map(member => {
            if(member.id === action.id) {
              return Member({...member.toJS(), invitationLink: action.data.invitationLink })
            }
            return member
          })
      );
  }
  return state;
};

export function save(instance) {
  return {
    types: crudDuck.actionTypes.SAVE.toArray(),
    call: client => client.put( instance.id ? `/client/members/${ instance.id }` : '/client/members', instance.toData()),    
  };
}

export default reduceDucks(crudDuck, { initialState, reducer }).reducer;
