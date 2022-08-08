import React from 'react';
import { Checkbox } from 'UI';

const NETWORK = 'NETWORK';
const ERRORS = 'ERRORS';
const EVENTS = 'EVENTS';
const CLICKRAGE = 'CLICK RAGE';
const PERFORMANCE = 'PERFORMANCE';

interface Props {
    list: any[];
    updateList: any;
}
function FeatureSelection(props: Props) {
    const { list } = props;
    
    return (
        <React.Fragment>
            <Checkbox
                name="slack"
                className="mr-8"
                type="checkbox"
                checked={list.includes(NETWORK)}
                onClick={(e: any) => {
                    console.log(e);
                }}
                label={NETWORK}
            />
            <Checkbox
                name="slack"
                className="mr-8"
                type="checkbox"
                checked={list.includes(ERRORS)}
                onClick={(e: any) => {
                    console.log(e);
                }}
                label={ERRORS}
            />
            <Checkbox
                name="slack"
                className="mr-8"
                type="checkbox"
                checked={list.includes(EVENTS)}
                onClick={(e: any) => {
                    console.log(e);
                }}
                label={EVENTS}
            />
            <Checkbox
                name="slack"
                className="mr-8"
                type="checkbox"
                checked={list.includes(CLICKRAGE)}
                onClick={(e: any) => {
                    console.log(e);
                }}
                label={CLICKRAGE}
            />
            <Checkbox
                name="slack"
                className="mr-8"
                type="checkbox"
                checked={list.includes(PERFORMANCE)}
                onClick={(e: any) => {
                    console.log(e);
                }}
                label={PERFORMANCE}
            />
        </React.Fragment>
    );
}

export default FeatureSelection;
