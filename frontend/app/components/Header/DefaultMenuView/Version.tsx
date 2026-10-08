import React from 'react';

import ENV from '../../../../env';

/** SaaS replaces this file by path (returns null there). */
function Version() {
  return <p className="m-user-menu__version m-mono">v{ENV.VERSION}</p>;
}

export default Version;
