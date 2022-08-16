const regexIpAddress = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
export function validateIP(value) {
  return regexIpAddress.test(value);
}

export function validateURL(value) {
  if (typeof value !== 'string') return false;
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(value);
}

function escapeRegexp(s) {
  const e = /[-[\]/{}()*+?.\\^$|]/g; // TODO: use [] instead of |
  return s.replace(e, '\\$&');
}

const defaultOptions = {
  empty: true,
  spaces: true,
  diacritics: true,
  numbers: true,
  admissibleChars: '-_',
};
export function validateName(value, options) {
  const {
    admissibleChars,
    empty,
    spaces,
    diacritics,
    numbers,
  } = Object.assign({}, defaultOptions, options);

  if (typeof value !== 'string') return false; // throw Error?
  if (!empty && value && value.trim() === '') return false;

  const charsRegex = admissibleChars
    ? `|${ admissibleChars.split('').map(escapeRegexp).join('|') }`
    : '';
  const spaceRegex = spaces ? '| ' : '';

  const letters = `[A-Za-z${ numbers ? '0-9' : '' }${ diacritics ? 'À-žØ-öø-ÿ' : '' }]`;
  const regExp = `^(${ letters }${ spaceRegex }${ charsRegex })*$`;
  return new RegExp(regExp).test(value);
}

export function notEmptyString(value) {
  if (typeof value !== 'string') return false;
  if (value.trim() === '') return false;
  return true;
}

// eslint-disable-next-line complexity
export function validateKeyCode(keyCode, key, regex) {
  switch (keyCode) {
    case 8: // Backspace
    case 9: // Tab
    case 13: // Enter
    case 37: // Left
    case 38: // Up
    case 39: // Right
    case 40: // Down
      break;
    default:
      if (!regex.test(key)) return false;
  }

  return true;
}

export function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export function validateNumber(str, options = {}) {
  const {
    min,
    max,
  } = options;
  const n = Number(str);
  if (Number.isNaN(n)) return false;
  if (min && n < min) return false;
  if (max && n > max) return false;
  return true;
}
