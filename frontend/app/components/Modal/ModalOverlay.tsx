import React from 'react';
import { useModal } from 'App/components/Modal';
import stl from './ModalOverlay.css'

function ModalOverlay({ children }) {
    let modal = useModal();
 
    return (
        <div className="fixed w-full h-screen" style={{ zIndex: '99999' }}>
            <div
                onClick={() => modal.hideModal()}
                className={stl.overlay}
                style={{ background: "rgba(0,0,0,0.5)" }}
            />
            <div className={stl.slide}>{children}</div>
        </div>
    );
}

export default ModalOverlay;