import React from 'react';
import { Popover, Button } from 'antd';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import InitORCard from '../InitORCard';
import SpotToOpenReplayPrompt from '../SpotToOpenReplayPrompt';

export default function SpotMenuItem({ isCollapsed }: any) {
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  return (
    <>
      <SpotToOpenReplayPrompt
        isVisible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
      />
      {isCollapsed ? (
        <Popover
          content={<InitORCard onOpenModal={() => setIsModalVisible(true)} />}
          trigger="hover"
          placement="right"
        >
          <Button type="text" className="ml-2 mt-2 py-2">
            <AnimatedSVG name={ICONS.LOGO_SMALL} size={20} />
          </Button>
        </Popover>
      ) : (
        <InitORCard onOpenModal={() => setIsModalVisible(true)} />
      )}
    </>
  );
}
