import React from 'react';
import cn from 'classnames';
import { countries } from 'App/constants';
import { Icon } from 'UI';
import stl from './countryFlag.module.css';

const CountryFlag = ({
  userCity = '',
  userState = '',
  country = '',
  className = '',
  style = {},
  label = false,
  width = 22,
  height = 15,
}) => {
  const knownCountry = !!country && country !== 'UN';
  const countryFlag = knownCountry ? country.toLowerCase() : '';
  const countryName = knownCountry ? countries[country] : 'Unknown Country';

  return (
    <div className="flex items-center" style={style}>
      {knownCountry ? (
        <div
          className={cn(`flag flag-${countryFlag}`, className)}
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      ) : (
        <div className="flex items-center w-full">
          <Icon name="flag-na" size="22" className="" />
          <div className="ml-2 leading-none" style={{ whiteSpace: 'nowrap' }}>
            Unknown Country
          </div>
        </div>
      )}
      {userCity && <span className="mx-1">{userCity},</span>}
      {userState && <span className="mr-1">{userState},</span>}
      {knownCountry && label && <div className={cn(stl.label, 'ml-1')}>{countryName}</div>}
    </div>
  );
};

CountryFlag.displayName = 'CountryFlag';

export default React.memo(CountryFlag);
