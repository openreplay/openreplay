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
    case 'Democratic Republic of the Congo':
    case 'Republic of the Congo':
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
    case 'Micronesia, Federated States Of':
      return 'FSM';
    case 'Moldova, Republic Of':
      return 'MDA';
    case 'Macedonia, The Former Yugoslav Republic Of':
      return 'Macedonia';
    case 'Lao People\'s Democratic Republic':
      return 'LAO';
    case 'Korea, Republic Of':
    case 'Korea, Democratic People\'s Republic Of':
      return 'PRK';
    case 'Iran, Islamic Republic Of':
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
    case 'Palestine, State Of':
      return 'PSE';
    case 'Saint Kitts and Nevis':
      return 'KNA';
    case 'Saint Pierre and Miquelon':
      return 'SPM';
    case 'Sao Tome and Principe':
      return 'STP';
    case 'Svalbard and Jan Mayen':
      return 'SJM';
    case 'United Republic of Tanzania':
    case 'Tanzania, United Republic Of':
      return 'TZA';
    case 'United States Minor Outlying Islands':
      return 'UMI';
    case 'Wallis and Futuna':
      return 'WLF';
    case 'US Virgin Islands':
      return 'VIR';
    case 'Venezuela, Bolivarian Republic Of':
      return 'Venezuela';
    case 'Bolivia, Plurinational State Of':
      return 'Bolivia';
    case 'French Polynesia':
      return 'PYF';
    default:
      return countryName;
  }
};
