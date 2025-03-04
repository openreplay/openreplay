import React from 'react';

const Copyright = React.memo(() => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="fixed bottom-0 m-auto text-center mb-6 text-gray-500">
      © {currentYear} OpenReplay. All rights reserved.{' '}
      <a className="underline hover:text-gray-700" href="https://openreplay.com/privacy.html" target="_blank" rel="noopener noreferrer">Privacy</a> and{' '}
      <a className="underline hover:text-gray-700" href="https://openreplay.com/terms.html" target="_blank" rel="noopener noreferrer">Terms</a>.
    </footer>
  );
});

export default Copyright;
