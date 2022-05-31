import React, { useEffect } from 'react';
import cn from 'classnames';

interface Props {
    children: React.ReactNode;
    open?: boolean;
    size ?: 'tiny' | 'small' | 'large' | 'fullscreen';
}
function Modal(props: Props) {
    const { children, open = false, size = 'small' } = props;

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }, [open]);

    const style: any = {};
    if (size === 'tiny') {
        style.width = '300px';
    } else if (size === 'small') {
        style.width = '400px';
    } else if (size === 'large') {
        style.width = '700px';
    } else if (size === 'fullscreen') {
        style.width = '100%';
    }

    return open ? (
        <div className="fixed inset-0 flex items-center justify-center box-shadow animate-fade-in" style={{ zIndex: '999', backgroundColor: 'rgba(0, 0, 0, 0.2)'}}>
            <div className="absolute z-10 bg-white rounded border" style={style}>
                {children}
            </div>
        </div>
    ) : null;
}

interface ModalContentProps {
    children: React.ReactNode;
    className?: string;
}

function ModalContent (props: ModalContentProps) {
    const { children, className } = props;
    return (
        <div className={cn("p-5", className)}>
            {children}
        </div>
    );
}


interface ModalHeaderProps {
    children: React.ReactNode;
    className?: string;
}
function ModalHeader (props: ModalHeaderProps) {
    const { children, className = '' } = props;
    return (
        <div className={cn("p-5 flex items-center justify-between text-2xl border-b", className)}>
            {children}
        </div>
    );
}

interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
}
function ModalFooter (props: ModalFooterProps) {
    const { children, className = '' } = props;
    return (
        <div className={cn("p-5", className)}>
            {children}
        </div>
    );
}

Modal.Header = ModalHeader;
Modal.Footer = ModalFooter;
Modal.Content = ModalContent;

export default Modal;