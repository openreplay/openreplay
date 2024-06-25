import React from "react";
import {Button, Tooltip} from "UI";
import AddCardSelectionModal from "Components/Dashboard/components/AddCardSelectionModal";
import {useStore} from "App/mstore";

const MAX_CARDS = 29;

function CreateCardButton() {
    const [open, setOpen] = React.useState(false);
    const {dashboardStore} = useStore();
    const dashboard: any = dashboardStore.selectedDashboard;
    const canAddMore: boolean = dashboard?.widgets?.length <= MAX_CARDS;

    return <>
        <Tooltip delay={0} disabled={canAddMore}
                 title="The number of cards in one dashboard is limited to 30.">
            <Button
                disabled={!canAddMore}
                variant="primary"
                onClick={() => setOpen(true)}
                icon="plus"
                iconSize={24}
            >
                Add Card
            </Button>
        </Tooltip>
        <AddCardSelectionModal open={open} onClose={() => setOpen(false)}/>
    </>;
}

export default CreateCardButton;
