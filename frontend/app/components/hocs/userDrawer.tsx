import React, { useState } from 'react';
import { Drawer, DrawerProps } from 'antd';


interface ExtendedDrawerProps extends DrawerProps {
  visible: boolean;
  onClose: any;
}

const DrawerComponent: React.FC<ExtendedDrawerProps> = ({
                                                          visible,
                                                          onClose,
                                                          title,
                                                          placement,
                                                          children
                                                        }) => {
  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      destroyOnClose
      width={400}
      maskClosable={false}
      title={title}
      placement={placement}
    >
      {children}
    </Drawer>
  );
};

const useDrawer = () => {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<React.ReactNode>(null);
  const [drawerProps, setDrawerProps] = useState<DrawerProps>({
    title: '',
    children: null,
    placement: 'right'
  });

  const showDrawer = (component: React.ReactNode, props: DrawerProps) => {
    setContent(component);
    setDrawerProps(props);
    setVisible(true);
  };


  const DrawerWrapper: React.FC = () => {
    return (
      <DrawerComponent
        visible={visible}
        onClose={() => setVisible(false)}
        {...drawerProps}
      >
        {content}
      </DrawerComponent>
    );
  };

  return {
    showDrawer,
    // hideDrawer,
    DrawerWrapper
  };
};

export default useDrawer;