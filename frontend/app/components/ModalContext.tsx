import { EntityDrawer } from '@/ui/overlays/EntityDrawer';
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface ModalConfig {
  title?: string;
  /** kept for callers; the kit drawer always opens on the right */
  placement?: 'top' | 'right' | 'bottom' | 'left';
  width?: number;
}

interface ModalContextType {
  openModal: (content: ReactNode, config?: ModalConfig) => void;
  closeModal: () => void;
}

const defaultConfig: ModalConfig = {
  title: '',
  placement: 'right',
  width: 428,
};

const ModalContext = createContext<ModalContextType>({
  openModal: () => {},
  closeModal: () => {},
});

export const useModal = () => useContext(ModalContext);

/** A right-hand drawer any component can open with arbitrary content. */
export function ModalProvider({ children }: { children: ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode>(null);
  const [modalConfig, setModalConfig] = useState<ModalConfig>(defaultConfig);
  // clears the content after the close animation; a reopen within it cancels
  const clearTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(clearTimer.current), []);

  const openModal = (
    content: ReactNode,
    config: ModalConfig = defaultConfig,
  ) => {
    clearTimeout(clearTimer.current);
    setModalContent(content);
    setModalConfig(config);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => {
      setModalContent(null);
      setModalConfig(defaultConfig);
    }, 200);
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <EntityDrawer
        open={showModal}
        onClose={closeModal}
        title={modalConfig.title ?? ''}
        size={(modalConfig.width ?? 0) > 560 ? 'wide' : 'form'}
      >
        <div className="px-6 py-5">{modalContent}</div>
      </EntityDrawer>
    </ModalContext.Provider>
  );
}
