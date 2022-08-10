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
            className="p-0"
            theme="light"
            content={ 
                <div className="text-sm grid grid-col p-4 gap-3" style={{ maxHeight: '200px', overflowY: 'auto'}}>
                    {list.slice(maxLength).map(({ label, value }, index) => (
                        <MetaItem key={index} label={label} value={value} />
                    ))}
                </div>
            }
            on="click"
            position="center center"
        >
            <div className=" flex items-center">
                    <span className="rounded bg-active-blue color-teal p-2 color-gray-dark cursor-pointer whitespace-nowrap">
                        +{list.length - maxLength} More
                    </span>
                </div>
        </Popup>
    )
}
