import React from 'react'
import cn from 'classnames'

const GOOD = 'Good'
const LESS_CRITICAL = 'Less Critical'
const CRITICAL = 'Critical'
const getErrorState = (count: number) => {
    if (count === 0) { return GOOD }
    if (count < 2) { return LESS_CRITICAL }
    return CRITICAL
}


interface Props {
    count?: number
}
export default function ErrorBars(props: Props) {
    const { count = 2 } = props
    const state = React.useCallback(() => getErrorState(count), [count])()
    const bgColor = { 'bg-red' : state === CRITICAL, 'bg-green' : state === GOOD, 'bg-red2' : state === LESS_CRITICAL }
    return (
        <div className="relative" style={{ width: '80px' }}>
            <div className="grid grid-cols-3 gap-1 absolute inset-0" style={{ opacity: '1'}}>
                <div className={cn("h-1 rounded-tl rounded-bl", bgColor)}></div>
                { (state === GOOD || state === LESS_CRITICAL || state === CRITICAL) && <div className={cn("h-1 rounded-tl rounded-bl", bgColor)}></div> }
                { (state === GOOD || state === CRITICAL) && <div className={cn("h-1 rounded-tl rounded-bl", bgColor)}></div> }
            </div>
            <div className="grid grid-cols-3 gap-1" style={{ opacity: '0.3'}}>
                <div className={cn("h-1 rounded-tl rounded-bl", bgColor)}></div>
                <div className={cn("h-1", bgColor)}></div>
                <div className={cn("h-1 rounded-tr rounded-br", bgColor)}></div>
            </div>
            <div className="mt-2">{state}</div>
        </div>
    )
}
