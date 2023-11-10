import React from 'react';
import { hasFlag } from 'country-flag-icons';
import * as Flags from 'country-flag-icons/react/3x2';

interface CountryFlagProps {
  countryCode: string;
  style?: React.CSSProperties;
}

const CountryFlagIcon: React.FC<CountryFlagProps> = ({ countryCode, style }) => {
  const FlagComponent = Flags[countryCode as keyof typeof Flags];

  return hasFlag(countryCode) && FlagComponent ? (
    <FlagComponent style={style} />
  ) : (
    <div className='text-xs bg-gray-light px-1 rounded'>N/A</div>
  );
};

export default CountryFlagIcon;
