import React, {useMemo} from 'react';
import {Button, Input, Segmented, Space} from 'antd';
import {CARD_LIST, CARD_CATEGORIES, CardType} from './ExampleCards';
import {useStore} from 'App/mstore';
import Option from './Option';
import CardsLibrary from "Components/Dashboard/components/DashboardList/NewDashModal/CardsLibrary";
import {FUNNEL} from "App/constants/card";

interface SelectCardProps {
    onClose: (refresh?: boolean) => void;
    onCard: () => void;
    isLibrary?: boolean;
    selected?: string;
    setSelectedCategory?: React.Dispatch<React.SetStateAction<string>>;
}

const SelectCard: React.FC<SelectCardProps> = (props: SelectCardProps) => {
    const {onCard, isLibrary = false, selected, setSelectedCategory} = props;
    const [selectedCards, setSelectedCards] = React.useState<number[]>([]);
    const {metricStore, dashboardStore} = useStore();
    const dashboardId = window.location.pathname.split('/')[3];
    const [libraryQuery, setLibraryQuery] = React.useState<string>('');

    const handleCardSelection = (card: string) => {
        metricStore.init();
        const selectedCard = CARD_LIST.find((c) => c.key === card) as CardType;

        const cardData: any = {
            metricType: selectedCard.cardType,
            name: selectedCard.title,
            metricOf: selectedCard.metricOf,
        };

        if (selectedCard.cardType === FUNNEL) {
            cardData.series = []
            cardData.series.filter = []
        }

        metricStore.merge(cardData);
        metricStore.instance.resetDefaults();
        onCard();
    };

    const cardItems = useMemo(() => {
        return CARD_LIST.filter((card) => card.category === selected).map((card) => (
            <div key={card.key} className={card.width ? `col-span-${card.width}` : 'col-span-2'}>
                <card.example onCard={handleCardSelection}
                              type={card.key}
                              title={card.title}
                              data={card.data}
                              height={card.height}/>
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
            <Space className="items-center justify-between">
                <div className="text-xl leading-4 font-medium">
                    {dashboardId ? (isLibrary ? "Your Library" : "Create Card") : "Select a template to create a card"}
                </div>
                {isLibrary && (
                    <Space>
                        {selectedCards.length > 0 ? (
                            <Button type="primary" onClick={onAddSelected}>
                                Add {selectedCards.length} Selected
                            </Button>
                        ) : ''}

                        <Input.Search
                            placeholder="Find by card title"
                            onChange={(value) => setLibraryQuery(value.target.value)}
                            style={{width: 200}}
                        />
                    </Space>
                )}
            </Space>

            {!isLibrary && <CategorySelector setSelected={setSelectedCategory} selected={selected}/>}

            {isLibrary ?
                <CardsLibrary query={libraryQuery}
                              selectedList={selectedCards}
                              category={selected}
                              onCard={onCardClick}/> :
                <ExampleCardsGrid items={cardItems}/>}
        </>
    );
};

interface CategorySelectorProps {
    setSelected?: React.Dispatch<React.SetStateAction<string>>;
    selected?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({setSelected, selected}) => (
    <Segmented
        options={CARD_CATEGORIES.map(({key, label, icon}) => ({
            label: <Option key={key} label={label} Icon={icon}/>,
            value: key,
        }))}
        value={selected}
        onChange={setSelected}
        className='w-fit'
    />
);

interface ExampleCardsGridProps {
    items: JSX.Element[];
}

const ExampleCardsGrid: React.FC<ExampleCardsGridProps> = ({items}) => (
    <div
        className="w-full grid grid-cols-4 gap-4 overflow-scroll"
        style={{maxHeight: 'calc(100vh - 100px)'}}
    >
        {items}
    </div>
);

export default SelectCard;
