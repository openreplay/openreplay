import React from 'react'
import cn from 'classnames'
import { TextEllipsis } from 'UI'

interface Props {
    className?: string,
    label: string,
    value?: string,
}
export default function MetaItem(props: Props) {
    const { className = '', label, value } = props
    return (
        <div className={cn("flex items-center rounded", className)}>
            <span className="rounded-tl rounded-bl bg-gray-light-shade px-2 color-gray-medium capitalize" style={{ maxWidth: "150px"}}>
                <TextEllipsis text={label} className="p-0" popupProps={{ size: 'small', disabled: true }}  />
            </span>
            <span className="rounded-tr rounded-br bg-gray-lightest px-2 color-gray-dark" style={{ maxWidth: "150px"}}>
                <TextEllipsis text={value} className="p-0" popupProps={{ size: 'small', disabled: true }}  />
            </span>
        </div>
    )
}
