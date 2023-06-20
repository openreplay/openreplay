import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';

const CountryFlag = ({
  userCity = '',
  country = '',
  className = '',
  style = {},
  width = 22,
  height = 15,
}) => {
  const knownCountry = !!country && country !== 'UN';
  const countryFlag = knownCountry ? country.toLowerCase() : '';

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
      {userCity && <span className="mx-1">{userCity}</span>}
    </div>
  );
};

CountryFlag.displayName = 'CountryFlag';

export default React.memo(CountryFlag);
