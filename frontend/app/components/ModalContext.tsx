import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Drawer } from 'antd';

interface ModalConfig {
  title?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  width?: number;
}

interface ModalContextType {
  openModal: (content: ReactNode, config?: ModalConfig) => void;
  closeModal: () => void;
}

const defaultConfig: ModalConfig = {
  title: 'Modal Title',
  placement: 'right',
  width: 428,
};

const ModalContext = createContext<ModalContextType>({
  openModal: () => {},
  closeModal: () => {},
});

export const useModal = () => useContext(ModalContext);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode>(null);
  const [modalConfig, setModalConfig] = useState<ModalConfig>(defaultConfig);

  const openModal = (
    content: ReactNode,
    config: ModalConfig = defaultConfig,
  ) => {
    setModalContent(content);
    setModalConfig(config);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setModalContent(null);
      setModalConfig(defaultConfig);
    }, 200);
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <Drawer
        open={showModal}
        closeIcon={null}
        title={modalConfig.title}
        placement={modalConfig.placement}
        onClose={closeModal}
        width={modalConfig.width}
      >
        {modalContent}
      </Drawer>
    </ModalContext.Provider>
  );
}
