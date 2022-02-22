import React from 'react'
import { Icon, Popup } from 'UI'
import cn from 'classnames'

interface Props {
    sortOrder: string,
    onChange?: (sortOrder: string) => void,
}
export default React.memo(function SortOrderButton(props: Props) {
    const { sortOrder, onChange = () => null } = props
    const isAscending = sortOrder === 'asc'

    return (
        <div className="flex items-center border">
            <Popup
                inverted
                size="mini"
                trigger={
                    <div
                        className={cn("p-1 hover:bg-active-blue", { 'cursor-pointer bg-white' : !isAscending, 'bg-active-blue' : isAscending })}
                        onClick={() => onChange('asc')}
                    >
                        <Icon name="arrow-up" size="14" color={isAscending ? 'teal' : 'gray-medium'} />
                    </div>
                }
                content={'Ascending'}
            />

            <Popup
                inverted
                size="mini"
                trigger={
                    <div
                        className={cn("p-1 hover:bg-active-blue border-l", { 'cursor-pointer bg-white' : isAscending, 'bg-active-blue' : !isAscending })}
                        onClick={() => onChange('desc')}
                    >
                        <Icon name="arrow-down" size="14" color={!isAscending ? 'teal' : 'gray-medium'} />
                    </div>
                }
                content={'Descending'}
            />
        </div>
    )
})
