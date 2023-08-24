import React, { FC, CSSProperties, memo } from 'react';
import cn from 'classnames';
import { Icon, TextEllipsis } from 'UI';
import { Tooltip } from 'antd';
import { countries } from 'App/constants';
import CountryFlagIcon from 'Shared/CountryFlagIcon';

interface CountryFlagProps {
  userCity?: string;
  userState?: string;
  country?: string;
  className?: string;
  style?: CSSProperties;
  width?: number;
  height?: number;
  showLabel?: boolean;
}


const CountryFlag: FC<CountryFlagProps> = ({
                                             userCity = '',
                                             userState = '',
                                             country = '',
                                             className = '',
                                             style = {},
                                             width = 22,
                                             height = 15,
                                             showLabel = false
                                           }) => {
  const knownCountry = !!country && country !== 'UN';
  const countryFlag = knownCountry ? country.toLowerCase() : '';
  const countryName = knownCountry ? countries[country] : 'Unknown Country';


  const displayGeoInfo = userCity || userState || countryName;

  // display full geo info, check each part if not null, display as string
  const fullGeoInfo = [userCity, userState, countryName].filter(Boolean).join(', ');

  const renderUnknownCountry = (
    <div className='flex items-center w-full'>
      <Icon name='flag-na' size={22} className='' />
      <div className='ml-2 leading-none' style={{ whiteSpace: 'nowrap' }}>
        Unknown Country
      </div>
    </div>
  );

  const renderGeoInfo = displayGeoInfo && (
    <span className='mx-1'>
      <TextEllipsis text={displayGeoInfo} maxWidth='150px' />
    </span>
  );

  return (
    <div className='flex items-center' style={style}>
      {knownCountry ? (
        <Tooltip title={fullGeoInfo}>
          <div>
            <CountryFlagIcon countryCode={countryFlag.toUpperCase()}
                             style={{ width: `${width}px`, borderRadius: '2px' }} />
          </div>
        </Tooltip>
      ) : (
        renderUnknownCountry
      )}
      {showLabel && renderGeoInfo}
    </div>
  );
};

CountryFlag.displayName = 'CountryFlag';

export default memo(CountryFlag);
