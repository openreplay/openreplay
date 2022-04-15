import React from 'react';
import { Tooltip } from 'react-tippy';

function TemplateOverlay() {
    return (
        <div>
            <Tooltip
                title="Click to select"  
                trigger="mouseenter"
                hideOnClick={true}
                delay={300}
            >
                <div className="absolute inset-0 cursor-pointer z-10" />
            </Tooltip>
        </div>
    );
}

export default TemplateOverlay;