import React from 'react'
import { Icon } from 'UI'
import cn from 'classnames'
import { debounce } from 'App/utils';
import { Tooltip } from 'react-tippy';
interface Props {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    limit?: number
    debounceRequest?: number
}
export default function Pagination(props: Props) {
    const { page, totalPages, onPageChange, limit = 5, debounceRequest = 0 } = props;
    const [currentPage, setCurrentPage] = React.useState(page);
    React.useMemo(
        () => setCurrentPage(page), 
        [page],
    );

    const debounceChange = React.useCallback(debounce(onPageChange, debounceRequest), []);

    const changePage = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
            debounceChange(page);
        }
    }
    
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage === totalPages;
    return (
        <div className="flex items-center">
            <Tooltip
                arrow
                sticky
                title="Previous Page"  
                trigger="mouseenter"
                hideOnClick={true}
            >
                <button
                    className={cn("py-2 px-3", { "opacity-50 cursor-default": isFirstPage })}
                    disabled={isFirstPage}
                    onClick={() => changePage(currentPage - 1)}
                >
                    <Icon name="chevron-left" size="18" color={isFirstPage ? 'gray-medium' : 'teal'} />
                </button>
            </Tooltip>
            <span className="mr-2 color-gray-medium">Page</span>
            <input
                type="number"
                className={cn("py-1 px-2 bg-white border border-gray-light rounded w-16", { "opacity-50 cursor-default": totalPages === 1 })}
                value={currentPage}
                min={1}
                max={totalPages}
                onChange={(e) => changePage(parseInt(e.target.value))}
            />
            <span className="mx-3 color-gray-medium">of</span>
            <span >{totalPages}</span>
            <Tooltip
                arrow
                sticky
                title="Next Page"
                trigger="mouseenter"
                hideOnClick={true}
            >
                <button
                    className={cn("py-2 px-3", { "opacity-50 cursor-default": isLastPage })}
                    disabled={isLastPage}
                    onClick={() => changePage(currentPage + 1)}
                >
                    <Icon name="chevron-right" size="18" color={isLastPage ? 'gray-medium' : 'teal'} />
                </button>
            </Tooltip>
        </div>
    )
}
