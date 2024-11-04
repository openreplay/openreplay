import React from 'react'
import cn from 'classnames'

function LoadMoreButton({className = '', totalCount, displayedCount, onClick, loading, description = false}) {
  return (
    <div className={ cn("flex flex-col items-center", className)}>
      <div className="color-gray-medium text-sm">
        Showing <span className="font-bold">{ displayedCount }</span> of <span className="font-bold">{ totalCount }</span>
      </div>
      { totalCount > displayedCount &&
        <a
          className="color-teal uppercase mt-1 cursor-pointer"
          onClick={ onClick }
          disabled={ loading }
        >
          { 'Load more' }
        </a>
      }
      { description && (
        <div>{ description }</div>
      )}
    </div>
  )
}

export default LoadMoreButton
