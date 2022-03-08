import React from 'react'
import { Icon } from 'UI'
import cn from 'classnames'

interface Props {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    limit?: number 
}
export default function Pagination(props: Props) {
    const { page, totalPages, onPageChange, limit = 5 } = props;
    return (
        <div className="flex items-center">
            <button
                className={cn("pagination-previous py-2 px-3", { "opacity-50": page === 1 })}
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
            >
                <Icon name="chevron-left" size="18" />
            </button>
            <span className="mr-2 color-gray-medium">Page</span>
            <input type="number" className="p-1 bg-white border rounded w-16" value={page} />
            <span className="mx-3 color-gray-medium">of</span>
            <span >{totalPages}</span>
            <button
                className="pagination-next py-2 px-3"
                disabled={page === totalPages}
                onClick={() => onPageChange(page + 1)}
            >
                <Icon name="chevron-right" size="18" />
            </button>
        </div>
    )
}
