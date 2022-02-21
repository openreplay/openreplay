import cn from 'classnames';
import { countries } from 'App/constants';
import { Popup } from 'UI';
import stl from './countryFlag.css';

const CountryFlag = React.memo(({ country, className, style = {}, label = false }) => {
	const knownCountry = !!country && country !== 'UN';
  	const countryFlag = knownCountry ? country.toLowerCase() : '';
  	const countryName = knownCountry ? countries[ country ] : 'Unknown Country';
	
	return (
		<div className="flex items-center" style={style}>
			<Popup
				trigger={ knownCountry 
				?  <div className={ cn(`flag flag-${ countryFlag }`, className, stl.default) } />
				: <div className={ cn('text-sm', className) }>{ "N/A" }</div>
				}
				content={ countryName }
				inverted
				size="tiny"
			/>
			{ knownCountry && label && <div className={ stl.label }>{ countryName }</div> }
		</div>
	);
})

CountryFlag.displayName = "CountryFlag";

export default CountryFlag;