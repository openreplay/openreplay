import React from 'react';
import cn from 'classnames';
import { Popup, TextEllipsis } from 'UI';
import { Styles } from '../../Dashboard/Widgets/common';
import cls from './distributionBar.module.css';
import { colorScale } from 'App/utils';

function DistributionBar({ className, title, partitions }) {
    if (partitions.length === 0) {
        return null;
    }

    const values = Array(partitions.length)
        .fill()
        .map((element, index) => index + 0);
    const colors = colorScale(values, Styles.colors);

    return (
        <div className={className}>
            <div className="flex justify-between text-sm mb-1">
                <div className="capitalize">{title}</div>
                <div className="flex items-center">
                    <div className="font-thin capitalize" style={{ maxWidth: '80px', height: '19px' }}>
                        <TextEllipsis text={partitions[0].label} />
                    </div>
                    <div className="ml-2">{`${Math.round(partitions[0].prc)}% `}</div>
                </div>
            </div>
            <div className={cn('border-radius-3 overflow-hidden flex', cls.bar)}>
                {partitions.map((p, index) => (
                    <Popup
                        key={p.label}
                        content={
                            <div className="text-center">
                                <span className="capitalize">{p.label}</span>
                                <br />
                                {`${Math.round(p.prc)}%`}
                            </div>
                        }
                        style={{
                            marginLeft: '1px',
                            width: `${p.prc}%`,
							backgroundColor: colors(index),
                        }}
                    >
                        <div
                            className="h-full bg-tealx"
                            style={{
                                backgroundColor: colors(index),
                            }}
                        />
                    </Popup>
                ))}
            </div>
        </div>
    );
}

DistributionBar.displayName = 'DistributionBar';
export default DistributionBar;
