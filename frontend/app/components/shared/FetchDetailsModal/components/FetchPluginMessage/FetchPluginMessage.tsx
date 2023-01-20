import React from 'react';
import { Icon } from 'UI';

function FetchPluginMessage() {
  return (
    <div className="bg-active-blue rounded p-3 mt-4">
      <div className="mb-2 flex items-center">
        <Icon name="lightbulb" size="18" />
        <span className="ml-2 font-medium">Get more out of network requests</span>
      </div>
      <ul className="list-disc ml-5">
        <li>
          Integrate{' '}
          <a href="https://docs.openreplay.com/plugins/fetch" className="link" target="_blank">
            Fetch plugin
          </a>{' '}
          to capture fetch payloads.
        </li>
        <li>
          Find a detailed{' '}
          <a href="https://www.youtube.com/watch?v=YFCKstPZzZg" className="link" target="_blank">
            video tutorial
          </a>{' '}
          to understand practical example of how to use fetch plugin.
        </li>
      </ul>
    </div>
  );
}

export default FetchPluginMessage;
