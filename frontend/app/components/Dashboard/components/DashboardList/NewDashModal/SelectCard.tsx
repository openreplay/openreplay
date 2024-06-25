import React, {useMemo} from 'react';
import {Button, Segmented} from 'antd';
import {CARD_LIST, CARD_CATEGORIES, CardType} from './ExampleCards';
import {useStore} from 'App/mstore';
import Option from './Option';
import CardsLibrary from "Components/Dashboard/components/DashboardList/NewDashModal/CardsLibrary";

interface SelectCardProps {
    onClose: (refresh?: boolean) => void;
    onCard: () => void;
    isLibrary?: boolean;
}

const SelectCard: React.FC<SelectCardProps> = (props: SelectCardProps) => {
    const {onCard, isLibrary = false} = props;
    const [selected, setSelected] = React.useState<string>('product-analytics');
    const [selectedCards, setSelectedCards] = React.useState<number[]>([]);
    const {metricStore, dashboardStore} = useStore();
    const dashboardId = window.location.pathname.split('/')[3];


    const handleCardSelection = (card: string) => {
        const selectedCard = CARD_LIST.find((c) => c.key === card) as CardType;
        metricStore.merge({
            metricType: selectedCard.cardType,
            name: selectedCard.title,
            metricOf: selectedCard.metricOf,
        });
        onCard();
    };

    const cardItems = useMemo(() => {
        return CARD_LIST.filter((card) => card.category === selected).map((card) => (
            <div key={card.key}>
                <card.example onCard={handleCardSelection} type={card.key} title={card.title}/>
            </div>
        ));
    }, [selected]);

    const onCardClick = (cardId: number) => {
        if (selectedCards.includes(cardId)) {
            setSelectedCards(selectedCards.filter((id) => id !== cardId));
        } else {
            setSelectedCards([...selectedCards, cardId]);
        }
    }

    const onAddSelected = () => {
        const dashboard = dashboardStore.getDashboard(dashboardId);
        dashboardStore.addWidgetToDashboard(dashboard!, selectedCards).finally(() => {
            dashboardStore.fetch(dashboardId);
            props.onClose(true);
        });
    }

    return (
        <>
            <Header selectedCount={selectedCards.length} onAdd={onAddSelected}/>
            {!isLibrary && <CategorySelector setSelected={setSelected}/>}
            {isLibrary ? <CardsLibrary selectedList={selectedCards} category={selected} onCard={onCardClick}/> :
                <ExampleCardsGrid items={cardItems}/>}
        </>
    );
};

interface HeaderProps {
    selectedCount?: number,
    onAdd?: () => void;
}

const Header: React.FC<HeaderProps> = ({selectedCount = 0, onAdd = () => null}) => (
    <div className="flex items-center justify-between">
        <div className="text-2xl leading-4 font-semibold">
            Select your first card type to add to the dashboard
        </div>
        <div className="text-sm text-gray-500">
            {selectedCount > 0 ? (
                <Button type="link" onClick={onAdd}>
                    Add {selectedCount} Selected
                </Button>
            ) : ''}
        </div>
    </div>
);

interface CategorySelectorProps {
    setSelected: React.Dispatch<React.SetStateAction<string>>;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({setSelected}) => (
    <Segmented
        options={CARD_CATEGORIES.map(({key, label, icon}) => ({
            label: <Option key={key} label={label} Icon={icon}/>,
            value: key,
        }))}
        onChange={setSelected}
    />
);

interface ExampleCardsGridProps {
    items: JSX.Element[];
}

const ExampleCardsGrid: React.FC<ExampleCardsGridProps> = ({items}) => (
    <div
        className="w-full grid grid-cols-2 gap-4 overflow-scroll"
        style={{maxHeight: 'calc(100vh - 210px)'}}
    >
        {items}
    </div>
);

export default SelectCard;
