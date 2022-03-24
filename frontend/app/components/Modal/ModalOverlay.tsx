import React from 'react';
import { ModalContext } from "App/components/Modal/modalContext";
import useModal from 'App/components/Modal/useModal';

function ModalOverlay({ children }) {
    let modal = useModal();
    // console.log('m', m);
 
    return (
        <div onClick={() => modal.handleModal(false)} style={{ background: "rgba(0,0,0,0.8)", zIndex: '9999' }}>
            {children}
        </div>
    );
}

export default ModalOverlay;