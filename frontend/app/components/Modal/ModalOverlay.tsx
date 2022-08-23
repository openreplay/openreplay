import React from 'react';
import stl from './ModalOverlay.module.css';
import cn from 'classnames';

function ModalOverlay({ hideModal, children, left = false, right = false }: any) {
    return (
        <div className="fixed w-full h-screen" style={{ zIndex: 9999 }}>
            <div onClick={hideModal} className={stl.overlay} style={{ background: 'rgba(0,0,0,0.5)' }} />
            <div className={cn(stl.slide, { [stl.slideLeft]: left, [stl.slideRight]: right })}>{children}</div>
        </div>
    );
}

export default ModalOverlay;
