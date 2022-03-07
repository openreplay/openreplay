
import React from 'react'
import { Icon, Popup } from 'UI'

interface Props {
    text: string,
    className?: string,
    position?: string,
}
export default function HelpText(props: Props) {
    const { text, className = '', position = 'top center' } = props
    return (
        <div>
            <Popup
                trigger={<div className={className}><Icon name="question-circle" size={16} /></div>}
                content={text}
                inverted
                position={position}
            />
        </div>
    )
}
