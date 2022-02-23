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
            content={ 
                <div className="flex flex-col">
                    {list.slice(maxLength).map(({ label, value }, index) => (
                        <MetaItem key={index} label={label} value={value} className="mb-3" />
                    ))}
                </div>
            }
            on="click"
            position="center center"
            hideOnScroll
        />
    )
}
