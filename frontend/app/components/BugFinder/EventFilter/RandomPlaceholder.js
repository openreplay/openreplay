import React from 'react';
import { RandomElement } from 'UI';
import stl from './randomPlaceholder.css';
import Event, { TYPES } from 'Types/filter/event';
import CustomFilter, { KEYS } from 'Types/filter/customFilter';

const getLabel = (type) => {
  if (type === KEYS.MISSING_RESOURCE) return 'Missing Resource';
  if (type === KEYS.SLOW_SESSION) return 'Slow Sessions';
  if (type === KEYS.USER_COUNTRY) return 'Country';
  if (type === KEYS.USER_BROWSER) return 'Browser';
  if (type === KEYS.USERID) return 'User Id';
}

const getObject = (type, key) => {
  switch(type) {
    case TYPES.CLICK:
    case TYPES.INPUT:
    case TYPES.ERROR:
    case TYPES.LOCATION:
      return Event({ type, key: type });
    case KEYS.JOURNEY:
      return [
        Event({ type: TYPES.LOCATION, key: TYPES.LOCATION }),
        Event({ type: TYPES.LOCATION, key: TYPES.LOCATION }),
        Event({ type: TYPES.CLICK, key: TYPES.CLICK })
      ]
    
    case KEYS.USER_BROWSER:      
      return CustomFilter({type, key: type, isFilter: true, label: getLabel(type), value: ['Chrome'] });
    case TYPES.METADATA:
      return CustomFilter({type, key, isFilter: true, label: key });
    case TYPES.USERID:
      return CustomFilter({type, key, isFilter: true, label: key });
    case KEYS.USER_COUNTRY:
      return CustomFilter({type, key: type, isFilter: true, value: ['FR'], label: getLabel(type) });
    case KEYS.SLOW_SESSION:
    case KEYS.MISSING_RESOURCE:
      return CustomFilter({type, key: type, hasNoValue: true, isFilter: true, label: getLabel(type) });
  }
}

const getList = (onClick, appliedFilterKeys) => {
  let list = [
    {
      key: KEYS.CLICK,
      element: <div className={ stl.placeholder }>Find sessions with <span onClick={(e) => onClick(e, getObject(TYPES.CLICK))}>Click</span></div>
    },
    {
      key: KEYS.INPUT,
      element: <div className={ stl.placeholder }>Find sessions with <span onClick={(e) => onClick(e, getObject(TYPES.INPUT))}>Input</span></div>
    },
    {
      key: KEYS.ERROR,
      element: <div className={ stl.placeholder }>Find sessions with <span onClick={(e) => onClick(e, getObject(TYPES.ERROR))}>Errors</span></div>
    },
    {
      key: KEYS.LOCATION,
      element: <div className={ stl.placeholder }>Find sessions with <span onClick={(e) => onClick(e, getObject(TYPES.LOCATION))}>URL</span></div>
    },
    {
      key: TYPES.USERID,
      element: <div className={ stl.placeholder }>Find sessions with <span onClick={(e) => onClick(e, getObject(TYPES.USERID))}>User ID</span></div>
    },    
    {
      key: KEYS.JOURNEY,
      element: <div className={ stl.placeholder }>Find sessions in a <span onClick={(e) => onClick(e, getObject(KEYS.JOURNEY))}>Journey</span></div>
    },
    {
      key: KEYS.USER_COUNTRY,
      element: <div className={ stl.placeholder }>Find sessions from <span onClick={(e) => onClick(e, getObject(KEYS.USER_COUNTRY))}>France</span></div>
    },
    {
      key: KEYS.USER_BROWSER,
      element: <div className={ stl.placeholder }>Find sessions on <span onClick={(e) => onClick(e, getObject(KEYS.USER_BROWSER))}>Chrome</span></div>
    },
  ]
  
  return list.filter(({key}) => !appliedFilterKeys.includes(key))
}

const RandomPlaceholder = ({ onClick, appliedFilterKeys }) => {
  return (
    <RandomElement list={ getList(onClick, appliedFilterKeys) } />
  );
};

export default RandomPlaceholder;
