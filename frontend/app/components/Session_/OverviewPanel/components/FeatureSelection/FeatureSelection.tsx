import React from 'react';
import { Checkbox } from 'UI';

const NETWORK = 'NETWORK';
const ERRORS = 'ERRORS';
const EVENTS = 'EVENTS';
const CLICKRAGE = 'CLICKRAGE';
const PERFORMANCE = 'PERFORMANCE';

interface Props {
    list: any[];
    updateList: any;
}
function FeatureSelection(props: Props) {
    const { list } = props;
    const features = [NETWORK, ERRORS, EVENTS, CLICKRAGE, PERFORMANCE];
    const disabled = list.length >= 3;

    return (
        <React.Fragment>
            {features.map((feature, index) => {
                const checked = list.includes(feature);
                const _disabled = disabled && !checked;
                return (
                    <Checkbox
                        key={index}
                        label={feature}
                        checked={checked}
                        className="mx-4"
                        disabled={_disabled}
                        onClick={() => {
                            if (checked) {
                                props.updateList(list.filter((item: any) => item !== feature));
                            } else {
                                props.updateList([...list, feature]);
                            }
                        }}
                    />
                );
            })}
        </React.Fragment>
    );
}

export default FeatureSelection;
