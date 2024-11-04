import React from 'react'
import cn from 'classnames'
import stl from './ErrorBars.module.css'

const GOOD = 'Good'
const LESS_CRITICAL = 'Few Issues'
const CRITICAL = 'Many Issues'
const getErrorState = (count: number) => {
    if (count === 0) { return GOOD }
    if (count < 3) { return LESS_CRITICAL }
    return CRITICAL
}


interface Props {
    count?: number
}
export default function ErrorBars(props: Props) {
    const { count = 2 } = props
    const state = React.useMemo(() => getErrorState(count), [count])
    const isGood = state === GOOD
    const showFirstBar = (state === LESS_CRITICAL || state === CRITICAL)
    const showSecondBar = (state === CRITICAL)
    // const showThirdBar = (state === GOOD || state === CRITICAL);
    // const bgColor = { 'bg-red' : state === CRITICAL, 'bg-red2' : state === LESS_CRITICAL }
    const bgColor = 'bg-red2'
    return isGood ? <></> : (
        <div>
            <div className="relative" style={{ width: '100px' }}>
                <div className="grid grid-cols-3 gap-1 absolute inset-0" style={{ opacity: '1'}}>
                    { showFirstBar && <div className={cn("rounded-tl rounded-bl", bgColor, stl.bar)}></div> }
                    { showSecondBar && <div className={cn("rounded-tl rounded-bl", bgColor, stl.bar)}></div> }
                    {/* { showThirdBar && <div className={cn("rounded-tl rounded-bl", bgColor, stl.bar)}></div> } */}
                </div>
                <div className="grid grid-cols-3 gap-1" style={{ opacity: '0.3'}}>
                    <div className={cn("rounded-tl rounded-bl", bgColor, stl.bar)}></div>
                    <div className={cn(bgColor, stl.bar)}></div>
                    {/* <div className={cn("rounded-tr rounded-br", bgColor, stl.bar)}></div> */}
                </div>
            </div>
            <div className="mt-1 color-gray-medium text-sm">{state}</div>
        </div>
    )
}
