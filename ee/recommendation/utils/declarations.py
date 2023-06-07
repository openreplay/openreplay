from pydantic import BaseModel, Field


class FeedbackRecommendation(BaseModel):
    viewerId: int = Field(...)
    sessionId: int = Field(...)
    projectId: int = Field(...)
    payload: dict = Field(default=dict())


class DeviceValue:
    device_types = ['other', 'desktop', 'mobile']

    def __init__(self, device_type):
        if isinstance(device_type, str):
            try:
                self.id = self.device_types.index(device_type)
            except ValueError:
                self.id = 0
            self.name = device_type
        elif isinstance(device_type, int):
            self.id = device_type
            self.name = self.device_types[device_type]

    def __repr__(self):
        return str(self.id)

    def __str__(self):
        return self.name

    def get_int_val(self):
        return self.id

    def get_str_val(self):
        return self.name


class CountryValue:
    countries = ['UN', 'RW', 'SO', 'YE', 'IQ', 'SA', 'IR', 'CY', 'TZ', 'SY', 'AM', 'KE', 'CD', 'DJ', 'UG', 'CF', 'SC', 'JO', 'LB', 'KW', 'OM', 'QA', 'BH', 'AE', 'IL', 'TR', 'ET', 'ER', 'EG', 'SD', 'GR', 'BI', 'EE', 'LV', 'AZ', 'LT', 'SJ', 'GE', 'MD', 'BY', 'FI', 'AX', 'UA', 'MK', 'HU', 'BG', 'AL', 'PL', 'RO', 'XK', 'ZW', 'ZM', 'KM', 'MW', 'LS', 'BW', 'MU', 'SZ', 'RE', 'ZA', 'YT', 'MZ', 'MG', 'AF', 'PK', 'BD', 'TM', 'TJ', 'LK', 'BT', 'IN', 'MV', 'IO', 'NP', 'MM', 'UZ', 'KZ', 'KG', 'TF', 'HM', 'CC', 'PW', 'VN', 'TH', 'ID', 'LA', 'TW', 'PH', 'MY', 'CN', 'HK', 'BN', 'MO', 'KH', 'KR', 'JP', 'KP', 'SG', 'CK', 'TL', 'RU', 'MN', 'AU', 'CX', 'MH', 'FM', 'PG', 'SB', 'TV', 'NR', 'VU', 'NC', 'NF', 'NZ', 'FJ', 'LY', 'CM', 'SN', 'CG', 'PT', 'LR', 'CI', 'GH', 'GQ', 'NG', 'BF', 'TG', 'GW', 'MR', 'BJ', 'GA', 'SL', 'ST', 'GI', 'GM', 'GN', 'TD', 'NE', 'ML', 'EH', 'TN', 'ES', 'MA', 'MT', 'DZ', 'FO', 'DK', 'IS', 'GB', 'CH', 'SE', 'NL', 'AT', 'BE', 'DE', 'LU', 'IE', 'MC', 'FR', 'AD', 'LI', 'JE', 'IM', 'GG', 'SK', 'CZ', 'NO', 'VA', 'SM', 'IT', 'SI', 'ME', 'HR', 'BA', 'AO', 'NA', 'SH', 'BV', 'BB', 'CV', 'GY', 'GF', 'SR', 'PM', 'GL', 'PY', 'UY', 'BR', 'FK', 'GS', 'JM', 'DO', 'CU', 'MQ', 'BS', 'BM', 'AI', 'TT', 'KN', 'DM', 'AG', 'LC', 'TC', 'AW', 'VG', 'VC', 'MS', 'MF', 'BL', 'GP', 'GD', 'KY', 'BZ', 'SV', 'GT', 'HN', 'NI', 'CR', 'VE', 'EC', 'CO', 'PA', 'HT', 'AR', 'CL', 'BO', 'PE', 'MX', 'PF', 'PN', 'KI', 'TK', 'TO', 'WF', 'WS', 'NU', 'MP', 'GU', 'PR', 'VI', 'UM', 'AS', 'CA', 'US', 'PS', 'RS', 'AQ', 'SX', 'CW', 'BQ', 'SS', 'BU', 'VD', 'YD', 'DD']

    def __init__(self, country):
        if isinstance(country, str):
            self.id = -128+self.countries.index(country)
            self.name = country
        elif isinstance(country, int):
            self.id = country
            self.name = self.countries[128+country]

    def __repr__(self):
        return str(self.id)

    def __str__(self):
        return self.name

    def get_int_val(self):
        return self.id

    def get_str_val(self):
        return self.name
