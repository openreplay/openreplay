// this can be reducer level to call it once and optimize the performance.
export default (countryName) => {
  switch (countryName) {
    case 'United States':
      return 'USA';
    case 'United Arab Emirates':
      return 'UAE';
    case 'United Kingdom':
      return 'UK';
    case 'Russian Federation':
      return 'RU';
    case 'Trinidad and Tobago':
      return 'TTO';
    case 'Bosnia and Herzegovina':
      return 'BIH';
    case 'British Indian Ocean Territory':
      return 'IOT';
    case 'Brunei Darussalam':
      return 'BRN';
    case 'Central African Republic':
      return 'CAF';
    case 'Congo':
    case 'Congo':
      return 'Congo';
    case 'Dominican Republic':
      return 'DOM';
    case 'Equatorial Guinea':
      return 'GNQ';
    case 'Turks and Caicos Islands':
      return 'TCA';
    case 'British Virgin Islands':
      return 'VGB';
    case 'South Georgia and the South Sandwich Islands':
      return 'SGS';
    case 'Saint Vincent and the Grenadines':
      return 'VCT';
    case 'Papua New Guinea':
      return 'PNG';
    case 'Northern Mariana Islands':
      return 'NMI';
    case 'New Caledonia':
      return 'NCL';
    case 'Micronesia':
      return 'FSM';
    case 'Moldova':
      return 'MDA';
    case 'Macedonia':
      return 'Macedonia';
    case 'Laos':
      return 'LAO';
    case 'Korea':
    case 'Korea':
      return 'PRK';
    case 'Iran':
      return 'Iran';
    case 'Heard Island and McDonald Islands':
      return 'HMD';
    case 'French Southern Territories':
      return 'ATF';
    case 'Falkland Islands':
      return 'FLK';
    case 'Antigua and Barbuda':
      return 'ATG';
    case 'American Samoa':
      return 'ASM';
    case 'Brunei Darussalam':
      return 'BRN';
    case 'Palestine':
      return 'PSE';
    case 'Saint Kitts and Nevis':
      return 'KNA';
    case 'Saint Pierre and Miquelon':
      return 'SPM';
    case 'Sao Tome and Principe':
      return 'STP';
    case 'Svalbard and Jan Mayen':
      return 'SJM';
    case 'Tanzania':
    case 'Tanzania':
      return 'TZA';
    case 'United States Minor Outlying Islands':
      return 'UMI';
    case 'Wallis and Futuna':
      return 'WLF';
    case 'US Virgin Islands':
      return 'VIR';
    case 'Venezuela':
      return 'Venezuela';
    case 'Bolivia':
      return 'Bolivia';
    case 'French Polynesia':
      return 'PYF';
    default:
      return countryName;
  }
};
