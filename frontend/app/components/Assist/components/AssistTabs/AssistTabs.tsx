import { useModal } from 'App/components/Modal';
import React from 'react';
import SessionList from '../SessionList';
import stl from './assistTabs.module.css';

interface Props {
  userId: any;
}

const AssistTabs = (props: Props) => {
  const { showModal } = useModal();

  return (
    <div className="relative mr-4">
      <div className="flex items-center">
        {props.userId && (
          <div
            className={stl.btnLink}
            onClick={() =>
              showModal(<SessionList userId={props.userId} />, { right: true, width: 700 })
            }
          >
            Active Sessions
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistTabs;
