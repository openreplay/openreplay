import React, { useContext } from 'react';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { Switch, Tooltip, message } from 'antd';
import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons';
import './AutoplayToggle.css';

const AutoplayToggle: React.FC = () => {
  const { player, store } = useContext(PlayerContext);
  const { autoplay } = store.get();

  const handleToggle = () => {
    player.toggleAutoplay();
    if (!autoplay) {
      message.success('Autoplay is ON');
    } else {
      message.info('Autoplay is OFF');
    }
  };

  return (
    <Tooltip title="Toggle Autoplay" placement="bottom">
      <Switch
        className="custom-switch"
        onChange={handleToggle}
        checked={autoplay}
        checkedChildren={<CaretRightOutlined className="switch-icon" />}
        unCheckedChildren={<PauseOutlined className="switch-icon" />}
      />
    </Tooltip>
  );
};


export default observer(AutoplayToggle);
