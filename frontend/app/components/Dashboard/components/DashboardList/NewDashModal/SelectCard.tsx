import React, { useMemo, useState, useEffect } from 'react';
import { Button, Input, Segmented, Space } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { ArrowRight, Info } from 'lucide-react';
import { useStore } from 'App/mstore';
import CardsLibrary from 'Components/Dashboard/components/DashboardList/NewDashModal/CardsLibrary';
import { FUNNEL } from 'App/constants/card';
import { useHistory } from 'react-router';
import { FilterKey } from 'Types/filter/filterType';
import FilterSeries from '@/mstore/types/filterSeries';
import Option from './Option';
import { CARD_LIST, CARD_CATEGORIES, CardType } from './ExampleCards';
import { useTranslation } from 'react-i18next';

interface SelectCardProps {
  onClose: (refresh?: boolean) => void;
  onCard: () => void;
  isLibrary?: boolean;
  selected?: string;
  setSelectedCategory?: React.Dispatch<React.SetStateAction<string>>;
  isEnterprise?: boolean;
  isMobile?: boolean;
}

const SelectCard: React.FC<SelectCardProps> = (props: SelectCardProps) => {
  const {
    onCard,
    isLibrary = false,
    selected,
    setSelectedCategory,
    isEnterprise,
    isMobile,
  } = props;
  const { t } = useTranslation();
  const [selectedCards, setSelectedCards] = React.useState<number[]>([]);
  const { metricStore, dashboardStore } = useStore();
  const siteId: string = location.pathname.split('/')[1];
  const dashboardId = location.pathname.split('/')[3];
  const [libraryQuery, setLibraryQuery] = React.useState<string>('');
  const [headerText, setHeaderText] = useState<string>('');
  const isCreatingDashboard =
    !dashboardId && location.pathname.includes('dashboard');
  const [dashboardCreating, setDashboardCreating] = useState<boolean>(false);
  const [dashboardUpdating, setDashboardUpdating] = useState<boolean>(false);
  const history = useHistory();

  useEffect(() => {
    if (dashboardId) {
      setHeaderText(isLibrary ? t('Your Library') : t('Create Card'));
    } else {
      setHeaderText(t('Select a card template to start your dashboard'));
    }
  }, [dashboardId, isLibrary]);

  const createNewDashboard = async () => {
    setDashboardCreating(true);
    dashboardStore.initDashboard();
    await dashboardStore
      .save(dashboardStore.dashboardInstance)
      .then(async (syncedDashboard) => {
        dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
        history.push(`/${siteId}/dashboard/${syncedDashboard.dashboardId}`);
        // return syncedDashboard.dashboardId;
      })
      .finally(() => {
        setDashboardCreating(false);
      });
  };

  const handleCardSelection = (card: string) => {
    metricStore.init();
    const selectedCard = CARD_LIST(t).find((c) => c.key === card) as CardType;

    const cardData: any = {
      metricType: selectedCard.cardType,
      name: selectedCard.title,
      metricOf: selectedCard.metricOf,
    };

    if (selectedCard.filters) {
      cardData.series = [
        new FilterSeries().fromJson({
          name: 'Series 1',
          filter: {
            filters: selectedCard.filters,
          },
        }),
      ];
    }

    if (selectedCard.cardType === FUNNEL) {
      cardData.series = [];
      cardData.series.filter = [];
    }

    metricStore.merge(cardData);
    metricStore.instance.resetDefaults();
    onCard();
  };

  const cardItems = useMemo(
    () =>
      CARD_LIST(t)
        .filter(
          (card) =>
            card.category === selected &&
            (!card.isEnterprise || (card.isEnterprise && isEnterprise)) &&
            (!isMobile ||
              (isMobile && ![FilterKey.USER_BROWSER].includes(card.key))),
        )
        .map((card) => (
          <div
            key={card.key}
            className={card.width ? `col-span-${card.width}` : 'col-span-2'}
          >
            <card.example
              onCard={handleCardSelection}
              type={card.key}
              title={card.title}
              data={card.data}
              height={card.height}
              hideLegend={card.data?.hideLegend}
            />
          </div>
        )),
    [selected, isEnterprise, isMobile],
  );

  const onCardClick = (cardId: number) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter((id) => id !== cardId));
    } else {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const onAddSelected = () => {
    setDashboardUpdating(true);
    const dashboard = dashboardStore.getDashboard(dashboardId);
    dashboardStore
      .addWidgetToDashboard(dashboard!, selectedCards)
      .finally(() => {
        setDashboardUpdating(false);
        dashboardStore.fetch(dashboardId);
        props.onClose(true);
      });
  };

  return (
    <>
      <Space className="items-center justify-between px-2">
        <div className="text-xl leading-4 font-medium">
          {headerText}
          {headerText === 'Select a card template to start your dashboard' && (
            <div className="text-sm font-normal mt-3 text-gray-500 flex gap-2 items-center">
              <Info size={14} />{' '}
              {t(
                'Following card previews are based on mock data for illustrative purposes only.',
              )}
            </div>
          )}
        </div>
        {isCreatingDashboard && (
          <Button
            type="link"
            onClick={createNewDashboard}
            loading={dashboardCreating}
            className="gap-2"
          >
            <Space>
              {t('Create Blank')}
              <RightOutlined />
            </Space>
          </Button>
        )}
        {isLibrary && (
          <Space>
            {selectedCards.length > 0 && (
              <Button
                type="primary"
                onClick={onAddSelected}
                loading={dashboardUpdating}
              >
                {t('Add')}&nbsp;{selectedCards.length}&nbsp;{t('Selected')}
              </Button>
            )}
            <Input.Search
              placeholder="Find by card title"
              onChange={(value) => setLibraryQuery(value.target.value)}
              style={{ width: 200 }}
            />
          </Space>
        )}
      </Space>
      {!isLibrary && (
        <CategorySelector
          setSelected={setSelectedCategory}
          selected={selected}
        />
      )}
      {isLibrary ? (
        <CardsLibrary
          query={libraryQuery}
          selectedList={selectedCards}
          category={selected}
          onCard={onCardClick}
        />
      ) : (
        <ExampleCardsGrid items={cardItems} />
      )}
    </>
  );
};

interface CategorySelectorProps {
  setSelected?: React.Dispatch<React.SetStateAction<string>>;
  selected?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  setSelected,
  selected,
}) => (
  <Segmented
    options={CARD_CATEGORIES.map(({ key, label, icon }) => ({
      label: <Option key={key} label={label} Icon={icon} />,
      value: key,
    }))}
    value={selected}
    onChange={setSelected}
    className="w-fit shadow-sm"
  />
);

interface ExampleCardsGridProps {
  items: JSX.Element[];
}

const ExampleCardsGrid: React.FC<ExampleCardsGridProps> = ({ items }) => (
  <div
    className="w-full grid grid-cols-4 gap-4 overflow-scroll"
    style={{ maxHeight: 'calc(100vh - 100px)' }}
  >
    {items}
  </div>
);

export default SelectCard;
