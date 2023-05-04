import React from 'react';
import { Icon } from 'UI';
import SupportList from './components/SupportList';

function SupportCallout() {
  return (
    <div className="group transition-all">
      <div className="invisible fixed bottom-0 left-0 pb-20 ml-4 group-hover:visible">
        <SupportList />
      </div>
      <div className="fixed z-50 left-0 bottom-0 m-4">
        <div className="w-12 h-12 cursor-pointer bg-white border rounded-full flex items-center border-teal justify-center group-hover:shadow-lg group-hover:!bg-active-blue">
          <Icon name="question-lg" size={30} color="teal" />
        </div>
      </div>
    </div>
  );
}

export default SupportCallout;
