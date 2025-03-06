import React from 'react';
import { CopyButton, CodeBlock } from 'UI';
import stl from './highlightCode.module.css';

function HighlightCode({ className = 'js', text = '' }) {
  return (
    <div className={stl.snippetWrapper}>
      <div className="absolute mt-1 mr-2 right-0">
        <CopyButton content={text} />
      </div>
      <CodeBlock code={text} language={className} />
    </div>
  );
}

export default HighlightCode;
