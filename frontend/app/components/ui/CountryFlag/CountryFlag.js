import React from 'react';
import cn from 'classnames';
import { countries } from 'App/constants';
import { Icon } from 'UI';
import stl from './countryFlag.module.css';

const CountryFlag = ({ country = '', className = '', style = {}, label = false }) => {
	const knownCountry = !!country && country !== 'UN';
  	const countryFlag = knownCountry ? country.toLowerCase() : '';
  	const countryName = knownCountry ? countries[ country ] : 'Unknown Country';

	return (
		<div className="flex items-center" style={style}>
			{knownCountry
				?  <div className={ cn(`flag flag-${ countryFlag }`, className, stl.default) } />
				: (
					<div className="flex items-center w-full">
						<Icon name="flag-na" size="22" className="" />
						<div className="ml-2 leading-none" style={{ whiteSpace: 'nowrap'}}>Unknown Country</div>
					</div>
			)}
			{ knownCountry && label && <div className={ cn(stl.label, 'ml-1') }>{ countryName }</div> }
		</div>
	);
}

CountryFlag.displayName = "CountryFlag";

export default React.memo(CountryFlag);
