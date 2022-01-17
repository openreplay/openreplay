import React from 'react';

interface Props {
  
}
function EventSearchInput(props) {
  return (
    <div>
      <input
        className="border rounded p-1"
        type="text" placeholder="Search for an event"
      />
    </div>
  );
}

export default EventSearchInput;