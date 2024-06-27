import ExCard from '../ExCard'
import React from 'react'
import CardSessionsByList from "Components/Dashboard/Widgets/CardSessionsByList";

function ByComponent({title, rows, lineWidth, onCard, type}: {
    title: string
    rows: {
        label: string
        progress: number
        value: string
        icon: React.ReactNode
    }[]
    onCard: (card: string) => void
    type: string
    lineWidth: number
}) {
    const _rows = rows.map((r) => ({
        ...r,
        name: r.label,
        sessionCount: r.value,
    })).slice(0, 4)
    return (
        <ExCard
            title={title}
            onCard={onCard}
            type={type}
        >
            <div className={'flex gap-1 flex-col'}>
                <CardSessionsByList list={_rows} selected={''} onClickHandler={() => null}/>

                {/*{rows.map((r) => (*/}
                {/*    <div*/}
                {/*        className={*/}
                {/*            'flex items-center gap-2 border-b border-dotted py-2 last:border-0 first:pt-0 last:pb-0'*/}
                {/*        }*/}
                {/*    >*/}
                {/*        <div>{r.icon}</div>*/}
                {/*        <div>{r.label}</div>*/}
                {/*        <div*/}
                {/*            style={{marginLeft: 'auto', marginRight: 20, display: 'flex'}}*/}
                {/*        >*/}
                {/*            <div*/}
                {/*                style={{*/}
                {/*                    height: 2,*/}
                {/*                    width: lineWidth * (0.01 * r.progress),*/}
                {/*                    background: '#394EFF',*/}
                {/*                }}*/}
                {/*                className={'rounded-l'}*/}
                {/*            />*/}
                {/*            <div*/}
                {/*                style={{*/}
                {/*                    height: 2,*/}
                {/*                    width: lineWidth - lineWidth * (0.01 * r.progress),*/}
                {/*                    background: '#E2E4F6',*/}
                {/*                }}*/}
                {/*                className={'rounded-r'}*/}
                {/*            />*/}
                {/*        </div>*/}
                {/*        <div className={'min-w-8'}>{r.value}</div>*/}
                {/*    </div>*/}
                {/*))}*/}
            </div>
        </ExCard>
    )
}

export default ByComponent
