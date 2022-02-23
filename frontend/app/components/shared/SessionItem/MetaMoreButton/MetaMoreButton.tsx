import React from 'react'
import { Popup } from 'UI'
import MetaItem from '../MetaItem'

interface Props {
    list: any[],
    maxLength: number,
}
export default function MetaMoreButton(props: Props) {
    const { list, maxLength } = props
    return (
        <Popup
            trigger={ (
                <div className="flex items-center">
                <span className="rounded bg-active-blue color-teal px-2 color-gray-dark cursor-pointer">
                    +{list.length - maxLength} More
                </span>
                </div>
            ) }
            className="p-0"
            content={ 
                <div className="text-sm grid grid-col p-4 gap-3" style={{ maxHeight: '200px', overflowY: 'auto'}}>
                    {list.slice(maxLength).map(({ label, value }, index) => (
                        <MetaItem key={index} label={label} value={value} />
                    ))}
                </div>
            }
            on="click"
            position="center center"
        />
    )
}
