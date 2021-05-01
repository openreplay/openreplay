import cn from 'classnames';
import { countries } from 'App/constants';
import { Popup } from 'UI';
import stl from './countryFlag.css';

const CountryFlag = ({ country, className }) => {
	const knownCountry = !!country && country !== 'UN';
  const countryFlag = knownCountry ? country.toLowerCase() : '';
  const countryName = knownCountry ? countries[ country ] : 'Unknown Country';
	return (
		<Popup
	    trigger={ knownCountry 
	      ?  <span className={ cn(`flag flag-${ countryFlag }`, className, stl.default) } />
	      : <span className={ className } >{ "N/A" }</span>
	    }
	    content={ countryName }
	    inverted
	    size="tiny"
	  />
	);
}

CountryFlag.displayName = "CountryFlag";

export default CountryFlag;