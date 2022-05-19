import React from 'react';
import { useModal } from 'App/components/Modal';
import stl from './ModalOverlay.module.css'
import cn from 'classnames';

function ModalOverlay({ children, left = false, right = false }) {
    let modal = useModal();
 
    return (
        <div className="fixed w-full h-screen" style={{ zIndex: 999 }}>
            <div
                onClick={() => modal.hideModal()}
                className={stl.overlay}
                style={{ background: "rgba(0,0,0,0.5)" }}
            />
            <div className={cn(stl.slide, { [stl.slideLeft] : left, [stl.slideRight] : right })}>{children}</div>
        </div>
    );
}

export default ModalOverlay;