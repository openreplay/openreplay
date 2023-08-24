import React from 'react';
import { hasFlag } from 'country-flag-icons';
import * as Flags from 'country-flag-icons/react/3x2';

interface CountryFlagProps {
  countryCode: string;
  style?: React.CSSProperties;
}

const CountryFlagIcon: React.FC<CountryFlagProps> = ({ countryCode, style }) => {
  if (!hasFlag(countryCode)) {
    return <div className='text-xs bg-gray-light px-1 rounded'>N/A</div>;
  }

  const FlagComponent = Flags[countryCode as keyof typeof Flags];
  if (!FlagComponent) {
    return <div className='text-xs bg-gray-light px-1 rounded'>N/A</div>;
  }

  return <FlagComponent style={style} />;
};

export default CountryFlagIcon;
