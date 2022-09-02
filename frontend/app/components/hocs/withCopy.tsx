import React from 'react';
import copy from 'copy-to-clipboard';
import { Tooltip } from 'react-tippy';

const withCopy = (WrappedComponent: React.ComponentType) => {
    const ComponentWithCopy = (props: any) => {
        const [copied, setCopied] = React.useState(false);
        const { value, tooltip } = props;
        const copyToClipboard = (text: string) => {
            copy(text);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
            }, 1000);
        };
        return (
            <div onClick={() => copyToClipboard(value)} className="w-fit">
                <Tooltip delay={0} arrow animation="fade" hideOnClick={false} title={copied ? tooltip : 'Click to copy'}>
                    <WrappedComponent {...props} copyToClipboard={copyToClipboard} />
                </Tooltip>
            </div>
        );
    };
    return ComponentWithCopy;
};

export default withCopy;
