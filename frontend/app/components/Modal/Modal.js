import React from "react";
import ReactDOM from "react-dom";
import { ModalContext } from "./modalContext";
import ModalOverlay from "./ModalOverlay";

const Modal = () => {
  let { modalContent, handleModal, modal } = React.useContext(ModalContext);
  if (modal) {
    return ReactDOM.createPortal(
      <div
        className="fixed top-0 left-0 h-screen relative"
        style={{ background: "rgba(0,0,0,0.8)", zIndex: '9999' }}
      >
        <ModalOverlay handleModal={handleModal}>
          {modalContent}
        </ModalOverlay>
      </div>,
      document.querySelector("#modal-root")
    );
  } else return null;
};

export default Modal;
