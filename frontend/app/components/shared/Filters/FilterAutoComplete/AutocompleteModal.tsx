import React, { useRef, useState, useEffect } from 'react';
import { Button, Checkbox, Input, Tooltip } from 'antd';
import { RedoOutlined, CloseCircleFilled } from '@ant-design/icons';
import cn from 'classnames';
import { Loader } from 'UI';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import { useTranslation } from 'react-i18next';
import { VList } from 'virtua';

function TruncatedText({
  text,
  maxWidth,
}: {
  text?: string;
  maxWidth?: string;
}) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.offsetWidth);
    }
  }, [text]);

  return (
    <Tooltip title={isTruncated ? text : ''}>
      <div
        ref={textRef}
        className="truncate"
        style={{
          maxWidth,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text}
      </div>
    </Tooltip>
  );
}

export function AutocompleteModal({
  onClose,
  onApply,
  values,
  handleFocus,
  loadOptions,
  options,
  isLoading,
  placeholder,
  commaQuery,
  isOpen,
}: {
  values: string[];
  onClose: () => void;
  onApply: (values: string[]) => void;
  handleFocus?: () => void;
  loadOptions: (query: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  isLoading?: boolean;
  commaQuery?: boolean;
  isOpen?: boolean;
}) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState('');
  const [selectedValues, setSelectedValues] = React.useState<string[]>(
    values.filter((i) => i && i.length > 0),
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    loadOptions(value);
  };
  const onSelectOption = (item: { value: string; label: string }) => {
    const selected = isSelected(item);
    if (!selected) {
      setSelectedValues([...selectedValues, item.value]);
    } else {
      setSelectedValues(selectedValues.filter((i) => i !== item.value));
    }
  };
  const isSelected = (item: { value: string; label: string }) =>
    selectedValues.includes(item.value);

  const applyValues = () => {
    onApply(selectedValues);
  };

  const applyQuery = () => {
    const vals = commaQuery ? query.split(',').map((i) => i.trim()) : [query];
    // onApply(vals);
    const merged = Array.from(new Set([...selectedValues, ...vals]));
    onApply(merged);
  };

  const clearSelection = () => {
    setSelectedValues([]);
  };

  const sortedOptions = React.useMemo(() => {
    const withSelected = [...options];
    selectedValues.forEach((val) => {
      if (!options.find((i) => i.value === val)) {
        withSelected.unshift({ value: val, label: val });
      }
    });
    if (values[0] && values[0].length) {
      const sorted = withSelected.sort((a, b) =>
        values.includes(a.value) ? -1 : 1,
      );
      return sorted;
    }
    return withSelected;
  }, [options, values]);

  const queryBlocks = commaQuery ? query.split(',') : [query];
  const blocksAmount = queryBlocks.length;
  const queryStr = React.useMemo(() => {
    let str = '';
    queryBlocks.forEach((block, index) => {
      if (index === blocksAmount - 1 && blocksAmount > 1) {
        str += ' and ';
      }
      str += block.trim();
      if (index < blocksAmount - 2) {
        str += ', ';
      }
    });
    return str;
  }, [query]);

  React.useEffect(() => {
    if (modalRef.current) {
      const modalRect = modalRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      if (modalRect.right > viewportWidth) {
        modalRef.current.style.left = 'unset';
        modalRef.current.style.right = '0';
      }
    }
  }, [isOpen]);

  return (
    <OutsideClickDetectingDiv
      onClickOutside={() => {
        onClose();
      }}
    >
      <div
        className={cn(
          'absolute left-0 mt-2 p-4 bg-white rounded-xl shadow border-gray-light z-10',
        )}
        ref={modalRef}
        style={{ width: 360, minHeight: 100, top: '100%' }}
      >
        <Input.Search
          value={query}
          onFocus={handleFocus}
          loading={isLoading}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-lg"
          autoFocus
          allowClear
        />
        <Loader loading={isLoading}>
          <>
            <div
              className="flex flex-col gap-2 overflow-y-auto py-2 overflow-x-hidden text-ellipsis"
              style={{ height: Math.min(sortedOptions.length * 32, 240) }}
            >
              <VList count={sortedOptions.length} itemSize={18}>
                {sortedOptions.map((item) => (
                  <div
                    key={item.value}
                    onClick={() => onSelectOption(item)}
                    className="cursor-pointer w-full py-1 hover:bg-active-blue rounded px-2"
                  >
                    <Checkbox checked={isSelected(item)} /> {item.label}
                  </div>
                ))}
              </VList>
            </div>
            {query.length ? (
              <div className="border-y border-y-gray-light py-2">
                <div
                  className="whitespace-nowrap truncate w-full rounded cursor-pointer text-teal hover:bg-active-blue px-2 py-1"
                  onClick={applyQuery}
                >
                  {t('Apply')}&nbsp;<span className='font-semibold'>{queryStr}</span>
                </div>
              </div>
            ) : null}
          </>
        </Loader>
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2 items-center">
            <Button
              type="primary"
              onClick={applyValues}
              className="btn-apply-event-value"
            >
              {t('Apply')}
            </Button>
          </div>

          <Tooltip title={t('Clear all selection')}>
            <Button
              onClick={clearSelection}
              type="text"
              className="btn-clear-selection"
              disabled={selectedValues.length === 0}
            >
              <RedoOutlined />
            </Button>
          </Tooltip>
        </div>
      </div>
    </OutsideClickDetectingDiv>
  );
}

interface Props {
  value: string[];
  params?: any;
  onApplyValues: (values: string[]) => void;
  modalRenderer: (props: any) => React.ReactElement;
  placeholder?: string;
  modalProps?: any;
  mapValues?: (value: string) => string;
  isAutoOpen?: boolean;
}

export function AutoCompleteContainer(props: Props) {
  const { t } = useTranslation();
  const filterValueContainer = useRef<HTMLDivElement>(null);
  const [showValueModal, setShowValueModal] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isEmpty = props.value.length === 0 || !props.value[0];

  React.useEffect(() => {
    if (props.isAutoOpen) {
      setTimeout(() => {
        setShowValueModal(true);
      }, 1);
    }
  }, [props.isAutoOpen]);

  const onClose = () => setShowValueModal(false);
  const onApply = (values: string[]) => {
    setTimeout(() => {
      props.onApplyValues(values);
      setShowValueModal(false);
    }, 100);
  };

  const onClearClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    props.onApplyValues([]);
    setShowValueModal(false);
  };

  const handleContainerClick = (event: React.MouseEvent) => {
    if (
      event.target === event.currentTarget ||
      event.currentTarget.contains(event.target as Node)
    ) {
      setTimeout(() => {
        setShowValueModal(true);
      }, 0);
    }
  };

  return (
    <div
      className="rounded-lg border border-gray-light px-2 relative w-full pr-4 whitespace-nowrap flex items-center bg-white hover:border-neutral-400"
      style={{ height: 26 }}
      ref={filterValueContainer}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleContainerClick}
    >
      <div
        onClick={() => setTimeout(() => setShowValueModal(true), 0)}
        className="flex items-center gap-2 cursor-pointer pr-4"
      >
        {!isEmpty ? (
          <>
            <TruncatedText
              text={
                props.mapValues
                  ? props.mapValues(props.value[0])
                  : props.value[0]
              }
              maxWidth="8rem"
            />
            {props.value.length > 1 && (
              <>
                <span className="text-neutral-500/90">{t('or')}</span>
                <TruncatedText
                  text={
                    props.mapValues
                      ? props.mapValues(props.value[1])
                      : props.value[1]
                  }
                  maxWidth="8rem"
                />
                {props.value.length > 2 && (
                  <TruncatedText
                    text={`+ ${props.value.length - 2} More`}
                    maxWidth="8rem"
                  />
                )}
              </>
            )}
          </>
        ) : (
          <div className="text-neutral-500/90">
            {props.placeholder ? props.placeholder : 'Select value(s)'}
          </div>
        )}
        {!isEmpty && hovered && (
          <div
            className="absolute right-2 cursor-pointer flex items-center justify-center"
            onClick={onClearClick}
          >
            <CloseCircleFilled className="text-neutral-200" />
          </div>
        )}
      </div>
      {showValueModal ? (
        <props.modalRenderer
          {...props.modalProps}
          params={props.params}
          onClose={onClose}
          onApply={onApply}
          values={props.value}
          isOpen={showValueModal}
        />
      ) : null}
    </div>
  );
}
