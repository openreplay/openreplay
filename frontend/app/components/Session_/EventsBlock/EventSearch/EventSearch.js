import React from 'react';
import { Input, Button, Tooltip } from 'antd';
import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { PlayerContext } from 'App/components/Session/playerContext';

function EventSearch(props) {
  const { player } = React.useContext(PlayerContext);

  const { onChange, value, header, setActiveTab, eventsText } = props;

  const toggleEvents = () => player.toggleEvents();

  return (
    <div className="flex items-center w-full relative">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center">
          <Input
            autoFocus
            type="text"
            placeholder={`Filter ${eventsText}`}
            className="w-full rounded-lg"
            name="query"
            value={value}
            onChange={onChange}
            prefix={<SearchOutlined />}
          />
        </div>
      </div>
    </div>
  );
}

export default EventSearch;
