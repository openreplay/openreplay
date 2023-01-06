import React from 'react';
import { Checkbox} from "UI";
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function ClickMapRagePicker() {
    const { metricStore } = useStore();

    const onToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        metricStore.setClickMaps(e.target.checked)
    }

    React.useEffect(() => {
        return () => {
            metricStore.setClickMaps(false)
        }
    }, [])

    return (
        <div className="mr-4 flex items-center cursor-pointer">
            <Checkbox
                onChange={onToggle}
                label="Include rage clicks"
            />
        </div>
    );
}

export default observer(ClickMapRagePicker);