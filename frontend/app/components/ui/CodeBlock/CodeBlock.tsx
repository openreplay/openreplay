import React, { useEffect } from 'react';

export default function CodeBlock({ code, language = 'javascript' }) {
  useEffect(() => {
    setTimeout(() => {
      if (window.Prism) {
        Prism.highlightAll();
      }
    }, 0)
  }, [code, language]);

  return (
    <pre className='rounded-lg'>
      <code className={`language-${language}`}>
        {code}
      </code>
    </pre>
  );
}
