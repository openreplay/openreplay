import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from 'react';
import { debounceCall } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { searchService } from 'App/services';
import {
  Button,
  Checkbox,
  Input,
  Tooltip,
  Popover,
  Spin,
  Typography,
  Divider,
  Space,
} from 'antd';
import { RedoOutlined, CloseCircleFilled } from '@ant-design/icons';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { TopValue } from '@/mstore/filterStore';
import { mobileScreen } from 'App/utils/isMobile';
import { VList } from 'virtua';
const { Text } = Typography;
import OutsideClickDetectingDiv from 'Shared//OutsideClickDetectingDiv';

interface FilterParams {
  id: string;
  type: string;
  name?: string;
  autoCaptured?: boolean;
  isPredefined?: boolean;
  possibleValues?: Array<any>;
  [key: string]: any;
}

interface OptionType {
  value?: string;
  percentage?: number;
  label?: string;
}

interface Props {
  initialValues: string[];
  params: FilterParams;
  onApplyValues: (values: string[]) => void;
  placeholder?: string;
  mapValues?: (value: string) => string;
  isAutoOpen?: boolean;
  commaQuery?: boolean;
  isDisabled?: boolean;
  isLive?: boolean;
}

const OptionItem = memo(
  ({
    item,
    isSelected,
    onSelect,
  }: {
    item: OptionType;
    isSelected: boolean;
    onSelect: (item: OptionType) => void;
  }) => (
    <div
      onClick={() => onSelect(item)}
      className={cn(
        'cursor-pointer w-full py-1 hover:bg-active-blue rounded px-2 relative',
        { 'bg-active-blue-faded': isSelected },
      )}
      role="option"
      aria-selected={isSelected}
      style={{ padding: '4px 8px', height: '32px' }}
    >
      <Space>
        <Checkbox checked={isSelected} tabIndex={-1} />
        <Text
          ellipsis={{
            tooltip: {
              title: item.label,
              placement: 'topLeft',
              mouseEnterDelay: 0.5,
            },
          }}
          style={{ maxWidth: 'calc(360px - 80px)' }}
        >
          {item.label}
        </Text>
      </Space>
      <div
        className="absolute bg-main bottom-0 left-0 rounded"
        style={{ width: `${Math.round(item.percentage ?? 0)}%`, height: 2 }}
      />
    </div>
  ),
);

const ValueAutoComplete = observer(
  ({
    initialValues,
    params,
    onApplyValues,
    placeholder = 'Select value(s)',
    mapValues,
    isAutoOpen = false,
    commaQuery = false,
    isDisabled = false,
    isLive = false,
  }: Props) => {
    const predefinedValues = params.isPredefined
      ? (params.possibleValues ?? []).map((v) => ({
          value: v.value,
          label: v.label || v.value,
        }))
      : [];

    const valueToLabelMap = useMemo(() => {
      const map: Record<string, string> = {};
      if (params.isPredefined && params.possibleValues) {
        params.possibleValues.forEach((v: any) => {
          map[v.value] = v.label || v.value;
        });
      }
      return map;
    }, [params.isPredefined, params.possibleValues]);

    const getDisplayLabel = (val: string) => {
      if (params.isPredefined && valueToLabelMap[val]) {
        return valueToLabelMap[val];
      }
      return val;
    };

    const { t } = useTranslation();
    const { filterStore, projectsStore } = useStore();
    const [showValueModal, setShowValueModal] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [options, setOptions] = useState<OptionType[]>(predefinedValues);
    const [loadingTopValues, setLoadingTopValues] = useState(false);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedValues, setSelectedValues] = useState<string[]>([]);
    const triggerRef = useRef<HTMLButtonElement>(null); // Ref for the main trigger button

    const filterKey = useMemo(() => {
      if (!projectsStore.siteId || !params.id) return null;
      return `${projectsStore.siteId}_${params.id}`;
    }, [projectsStore.siteId, params.id]);

    const topValues: TopValue[] = filterStore.topValues[params.id] || [];

    const mappedTopValues: OptionType[] = useMemo(() => {
      return topValues
        .filter(
          (i): i is { value: string; rowPercentage: number } =>
            typeof i.value === 'string',
        )
        .sort((a, b) => (b.rowPercentage ?? 0) - (a.rowPercentage ?? 0))
        .map((i) => ({
          value: i.value,
          label: i.value,
          percentage: i.rowPercentage,
        }));
    }, [topValues]);

    useEffect(() => {
      setSelectedValues(initialValues.filter((i) => i && i.length > 0));
    }, [initialValues]);

    useEffect(() => {
      if (params.isPredefined) {
        return;
      }
      if (
        showValueModal &&
        !params.isEvent &&
        filterKey &&
        !filterStore.topValues[filterKey]
      ) {
        setLoadingTopValues(true);
        filterStore
          .fetchTopValues(params.id, isLive)
          .catch((error) => console.error('Failed to load top values', error))
          .finally(() => setLoadingTopValues(false));
      }
    }, [
      showValueModal,
      filterKey,
      params.id,
      params.name,
      projectsStore.siteId,
      filterStore,
    ]);

    useEffect(() => {
      if (isAutoOpen && !isDisabled) {
        setTimeout(() => {
          setShowValueModal(true);
        }, 0);
      }
    }, [isAutoOpen, isDisabled]);

    useEffect(() => {
      if (loadingTopValues) return;
      if (showValueModal) {
        setSelectedValues(initialValues.filter((i) => i && i.length > 0));
        setQuery('');
        if (!params.isPredefined) {
          setOptions(mappedTopValues.length > 0 ? mappedTopValues : []);
        }
        setLoadingSearch(false);
      }
    }, [showValueModal, loadingTopValues]);

    const loadOptions = useCallback(
      async (inputValue: string) => {
        const trimmedQuery = inputValue.trim();
        if (!trimmedQuery.length) {
          setOptions(mappedTopValues);
          setLoadingSearch(false);
          return;
        }

        setLoadingSearch(true);
        try {
          const searchType = params.name;
          if (!searchType) {
            console.warn('Search type (params.name) is missing.');
            setOptions([]);
            return;
          }

          const autoCompleteParams: any = {
            q: trimmedQuery,
            ac: params.autoCaptured,
            live: isLive,
          };

          if (params.propertyName) {
            autoCompleteParams.propertyName = params.propertyName;
          }

          if (params.eventName) {
            autoCompleteParams.eventName = params.eventName;
          }

          const data: { events?: any[] } | any[] =
            await searchService.fetchAutoCompleteValues(autoCompleteParams);
          const safeData = Array.isArray(data) ? data : data.events || [];
          const _options =
            safeData.map((i: any) => ({
              value: i.value,
              label: i.value,
              percentage: i.rowPercentage ?? 0,
            })) || [];
          setOptions(_options);
        } catch (e) {
          console.error('Failed to fetch autocomplete values:', e);
          setOptions(mappedTopValues);
        } finally {
          setLoadingSearch(false);
        }
      },
      [mappedTopValues, params.name, searchService],
    );

    const debouncedLoadOptions = useMemo(
      () => debounceCall(loadOptions, 500),
      [loadOptions],
    );

    const handleInputChange = (value: string) => {
      setQuery(value);
      if (params.isPredefined) return;
      debouncedLoadOptions(value);
    };

    const onSelectOption = useCallback((item: OptionType) => {
      if (!item.value) return;
      setSelectedValues((prev) => {
        const currentlySelected = prev.includes(item.value!);
        if (!currentlySelected) {
          return [...prev, item.value!];
        } else {
          return prev.filter((i) => i !== item.value);
        }
      });
    }, []);

    const isSelected = useCallback(
      (item: OptionType) =>
        item.value ? selectedValues.includes(item.value) : false,
      [selectedValues],
    );

    const applySelectedValues = () => {
      onApplyValues(selectedValues);
      setShowValueModal(false);
    };

    const applyQuery = () => {
      const vals = commaQuery
        ? query
            .split(',')
            .map((i) => i.trim())
            .filter(Boolean)
        : [query.trim()].filter(Boolean);
      if (vals.length > 0) {
        const merged = Array.from(new Set([...selectedValues, ...vals]));
        onApplyValues(merged);
        setShowValueModal(false);
      }
    };

    const clearSelection = () => {
      setSelectedValues([]);
    };

    const sortedOptions = useMemo(() => {
      if (!options.length) return [];
      const currentOptionsWithValue = [...options];
      selectedValues.forEach((val) => {
        if (!currentOptionsWithValue.find((i) => i.value === val)) {
          currentOptionsWithValue.unshift({ value: val, label: val });
        }
      });

      if ('percentage' in currentOptionsWithValue[0]) {
        return currentOptionsWithValue.sort((a, b) => {
          return (b.percentage || 0) - (a.percentage || 0);
        });
      }

      currentOptionsWithValue.sort((a, b) => {
        const aIsSelected = selectedValues.includes(a.value);
        const bIsSelected = selectedValues.includes(b.value);

        if (aIsSelected && !bIsSelected) return -1;
        if (!aIsSelected && bIsSelected) return 1;
        return a.label.localeCompare(b.label);
      });

      return currentOptionsWithValue;
    }, [options, selectedValues]);

    const filteredOptions = useMemo(
      () =>
        params.isPredefined
          ? sortedOptions.filter(
              (opt) =>
                opt.label &&
                opt.label.toLowerCase().includes(query.toLowerCase()),
            )
          : sortedOptions,
      [params.isPredefined, sortedOptions, query],
    );

    const queryBlocks = commaQuery
      ? query
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [query.trim()].filter(Boolean);
    const blocksAmount = queryBlocks.length;
    const queryStr = useMemo(() => {
      return queryBlocks
        .map((block) => `"${block}"`)
        .join(blocksAmount > 1 ? ' OR ' : '');
    }, [queryBlocks]);

    const onClearClick = (event: React.MouseEvent | React.KeyboardEvent) => {
      event.stopPropagation(); // Prevent popover toggle
      onApplyValues([]);
      setShowValueModal(false);
      console.trace('clear click');
    };

    const handleOpenChange = (visible: boolean) => {
      if (isDisabled) return;
      if (visible) setShowValueModal(visible);
    };

    const isEmpty = initialValues[0] === '' || initialValues.length === 0;

    const popoverContent = (
      <div style={{ width: 360 }} onClick={(e) => e.stopPropagation()}>
        <Input.Search
          value={query}
          loading={loadingSearch}
          onChange={(e) => {
            e.stopPropagation();
            handleInputChange(e.target.value);
          }}
          placeholder={placeholder}
          className="mb-2" // Antd margin class
          autoFocus
          allowClear
        />
        <Spin spinning={loadingTopValues && query.length === 0}>
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-gray-400">
              {t(
                loadingSearch || loadingTopValues
                  ? 'Loading...'
                  : query.length > 0
                    ? 'No results found'
                    : 'No options available',
              )}
            </div>
          ) : (
            <VList
              style={{
                height: Math.min(filteredOptions.length * 32, 200),
                marginBottom: query.trim().length > 0 && !loadingSearch ? 8 : 0,
              }}
              data={filteredOptions}
            >
              {(item) => (
                <OptionItem
                  key={item.value}
                  item={item}
                  isSelected={isSelected(item)}
                  onSelect={onSelectOption}
                />
              )}
            </VList>
          )}
          {query.trim().length > 0 && !loadingSearch ? (
            <>
              <Divider style={{ margin: '8px 0' }} />
              <Button
                type="link"
                onClick={applyQuery}
                style={{
                  paddingLeft: 8,
                  whiteSpace: 'normal',
                  height: 'auto',
                  lineHeight: 'inherit',
                }}
              >
                <div className={'text-black'}>
                  {t('Apply search')}: {queryStr}
                </div>
              </Button>
            </>
          ) : null}
        </Spin>
        <Divider style={{ margin: '12px 0' }} />
        <div className="flex justify-between items-center">
          <Button
            type="primary"
            onClick={applySelectedValues}
            disabled={selectedValues.length === 0 && initialValues.length === 0}
          >
            {t('Apply')}
          </Button>
          <Tooltip title={t('Clear all selection')}>
            <Button
              onClick={clearSelection}
              type="text"
              disabled={selectedValues.length === 0}
              icon={<RedoOutlined />}
              aria-label={t('Clear all selection')}
            />
          </Tooltip>
        </div>
      </div>
    );
    return (
      <OutsideClickDetectingDiv onClickOutside={() => setShowValueModal(false)}>
        <Popover
          content={popoverContent}
          trigger="click"
          open={showValueModal && !isDisabled}
          onOpenChange={handleOpenChange}
          placement={mobileScreen ? 'bottom' : 'bottomLeft'}
          arrow={false}
        >
          <Button
            className="pr-8"
            size="small"
            ref={triggerRef}
            disabled={isDisabled}
            onMouseEnter={() => !isDisabled && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <Space size={4} wrap className="w-full overflow-hidden">
              {!isEmpty ? (
                <>
                  <Text
                    ellipsis={{
                      tooltip: {
                        title: mapValues
                          ? mapValues(initialValues[0])
                          : getDisplayLabel(initialValues[0]),
                        placement: 'topLeft',
                        mouseEnterDelay: 0.5,
                      },
                    }}
                    style={{ maxWidth: '8rem' }}
                  >
                    {mapValues
                      ? mapValues(initialValues[0])
                      : getDisplayLabel(initialValues[0])}
                  </Text>
                  {initialValues.length > 1 && (
                    <>
                      <Text type="secondary" className="flex-shrink-0">
                        {t('or')}
                      </Text>
                      <Text
                        ellipsis={{
                          tooltip: {
                            title: mapValues
                              ? mapValues(initialValues[1])
                              : getDisplayLabel(initialValues[1]),
                            placement: 'topLeft',
                            mouseEnterDelay: 0.5,
                          },
                        }}
                        style={{ maxWidth: '8rem' }}
                      >
                        {mapValues
                          ? mapValues(initialValues[1])
                          : getDisplayLabel(initialValues[1])}
                      </Text>
                      {initialValues.length > 2 && (
                        <Text type="secondary" className="flex-shrink-0">
                          {`+ ${initialValues.length - 2}`}
                        </Text>
                      )}
                    </>
                  )}
                </>
              ) : (
                <Text
                  type={'secondary'}
                  className={cn({ 'text-disabled': isDisabled })}
                >
                  {placeholder}
                </Text>
              )}
            </Space>

            {!isEmpty && hovered && !isDisabled && (
              <span
                role="button"
                aria-label={t('Clear selection')}
                onClick={onClearClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onClearClick(e);
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                tabIndex={0} // Make it focusable if needed
                className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-neutral-400 hover:text-neutral-600"
                style={{
                  height: '100%',
                  cursor: 'pointer',
                  zIndex: 1,
                  padding: '0 4px',
                }}
              >
                <CloseCircleFilled />
              </span>
            )}
          </Button>
        </Popover>
      </OutsideClickDetectingDiv>
    );
  },
);

export default ValueAutoComplete;
