import React from 'react';
import { iTag, TAGS } from 'App/services/NotesService';
import { SortDropdown } from 'Components/shared/SessionsTabOverview/components/SessionSort/SessionSort';
import { Input, Segmented } from 'antd';
import { useTranslation } from 'react-i18next';

function HighlightsListHeader({
  activeTags,
  ownOnly,
  toggleShared,
  toggleTag,
  query,
  onSearch,
  handleInputChange,
}: {
  activeTags: iTag[];
  ownOnly: boolean;
  toggleShared: (value: boolean) => void;
  toggleTag: (value?: iTag) => void;
  query: string;
  onSearch: (value: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex p-2 px-4 w-full border-b gap-4 items-center">
      <h1 className="text-2xl capitalize mr-2">{t('Highlights')}</h1>
      <Segmented
        size="small"
        options={[
          {
            value: 'ALL',
            label: (
              <div
                className={
                  activeTags.includes('ALL') || activeTags.length === 0
                    ? 'text-main'
                    : ''
                }
              >
                {t('All')}
              </div>
            ),
          },
          ...TAGS.map((tag: iTag) => ({
            value: tag,
            label: (
              <div
                className={
                  activeTags.includes(tag)
                    ? 'text-main capitalize'
                    : 'capitalize'
                }
              >
                {(t(tag.toLowerCase()))}
              </div>
            ),
          })),
        ]}
        onChange={(value: iTag) =>
          toggleTag(value === 'ALL' ? undefined : value)
        }
      />
      <div className="ml-auto">
        <SortDropdown
          sortOptions={[
            {
              key: 'own',
              label: t('Personal'),
            },
            {
              key: 'team',
              label: t('Team'),
            },
          ]}
          onSort={({ key }) => {
            toggleShared(key === 'own');
          }}
          current={ownOnly ? t('Personal') : t('Team')}
        />
      </div>
      <div className="w-56">
        <Input.Search
          defaultValue={query}
          allowClear
          name="spot-search"
          placeholder={t('Filter by title')}
          onChange={handleInputChange}
          onSearch={onSearch}
          className="rounded-lg"
          size="small"
        />
      </div>
    </div>
  );
}

export default HighlightsListHeader;
