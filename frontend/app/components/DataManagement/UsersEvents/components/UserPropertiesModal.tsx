import React from 'react';
import { Input, Button } from 'antd';
import { Pencil, ArrowDownZA } from 'lucide-react';
import { TextEllipsis } from 'UI';
import { observer } from 'mobx-react-lite';
import usePropertyNames from 'App/components/DataManagement/Properties/usePropertyNames';
import { useTranslation } from 'react-i18next';

const caseInsensitiveMatch = (str: string, search: string) => {
  return str.toLowerCase().includes(search.toLowerCase());
};

function UserPropertiesModal({
  properties,
  rawProperties,
  onSave,
}: {
  properties: Record<string, string>;
  rawProperties: Record<string, any>;
  onSave: (path: string, key: string, value: string | number) => void;
}) {
  const { t } = useTranslation();
  const flatProperties = {
    city: rawProperties.$city,
    country: rawProperties.$country,
    email: rawProperties.$email,
    name: rawProperties.$name,
    last_name: rawProperties.$last_name,
    first_name: rawProperties.$first_name,
    avatar: rawProperties.$avatar,
  };
  // alphabetical sort state
  const [sort, setSort] = React.useState<'asc' | 'desc' | 'off'>('off');
  const [search, setSearch] = React.useState('');
  const [unifiedProps, setUnifiedProperties] = React.useState<any[]>([]);

  const handleSave = (key: string, value: string | number) => {
    if (key in flatProperties) {
      onSave('flat', key, value);
    } else {
      onSave('properties', key, value);
    }

    const newProps = unifiedProps.map(([k, v]) => {
      if (k === key) {
        return [k, value];
      }
      return [k, v];
    });
    setUnifiedProperties(newProps);
  };

  const allPropLength =
    Object.keys(properties).length + Object.keys(flatProperties).length;

  React.useEffect(() => {
    const flatEntries = Object.entries(flatProperties);
    const customEntries = Object.entries(properties);
    let allEntries = [...flatEntries, ...customEntries];
    if (sort !== 'off') {
      allEntries = allEntries.sort(([keyA], [keyB]) => {
        if (sort === 'asc') {
          return keyA.localeCompare(keyB);
        } else {
          return keyB.localeCompare(keyA);
        }
      });
    }
    if (search) {
      allEntries = allEntries.filter(
        ([key, value]) =>
          caseInsensitiveMatch(key, search) ||
          caseInsensitiveMatch(value.toString(), search),
      );
    }
    setUnifiedProperties(allEntries);
  }, [rawProperties, properties, search, sort]);

  const toggleSort = () => {
    const order = ['off', 'asc', 'desc'];
    const currentIndex = order.indexOf(sort);
    const nextIndex = (currentIndex + 1) % order.length;
    setSort(order[nextIndex] as 'asc' | 'desc' | 'off');
  };
  return (
    <div className="p-4 flex flex-col gap-4 h-screen w-full">
      <div className={'flex items-center gap-4'}>
        <div className="font-semibold text-xl">{t('All User Properties')}</div>
        <div className={'rounded-full px-2 bg-gray-lighter'}>
          {allPropLength}
        </div>
      </div>
      <div className={'flex items-center gap-1'}>
        <Input.Search
          size={'small'}
          placeholder="Search properties"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button size={'small'} onClick={toggleSort} type={'text'}>
          <div className={sort === 'off' ? 'fill-gray-medium' : 'fill-blue'}>
            <ArrowDownZA size={16} />
          </div>
        </Button>
      </div>
      <div
        className={'-mx-4'}
        style={{ maxHeight: 'calc(100vh - 50px - 2rem)', overflowY: 'auto' }}
      >
        {unifiedProps.map(([key, value]) => (
          <Property
            pkey={key}
            value={value}
            onSave={(k, v) => handleSave(k, v)}
          />
        ))}
      </div>
    </div>
  );
}

function Property({
  pkey,
  value,
  onSave,
}: {
  pkey: string;
  value: string | number;
  onSave?: (key: string, value: string | number) => void;
}) {
  const { t } = useTranslation();
  const { getDisplayName, isPending: isPropertyNamesPending } =
    usePropertyNames('users');
  const [strValue, setValue] = React.useState(value);
  const [isEdit, setIsEdit] = React.useState(false);

  const onSaveClick = () => {
    if (onSave) {
      const wasNumber = typeof value === 'number';
      // @ts-ignore
      onSave(pkey, wasNumber ? parseFloat(strValue) : strValue);
    }
    setIsEdit(false);
  };

  const onCancel = () => {
    setValue(value);
    setIsEdit(false);
  };
  console.log(pkey, getDisplayName(pkey));
  return (
    <div className="flex px-4 py-1 items-start border-b group w-full hover:bg-active-blue">
      <TextEllipsis
        text={getDisplayName(pkey)}
        maxWidth={'150'}
        className={'w-[150px]'}
      />
      {isEdit ? (
        <div className={'flex-1 flex flex-col gap-2'}>
          <Input
            size={'small'}
            autoFocus
            value={strValue}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveClick();
              }
            }}
          />
          <div className={'flex items-center gap-2 ml-auto'}>
            <Button type={'text'} onClick={onCancel} size={'small'}>
              {t('Cancel')}
            </Button>
            <Button type={'primary'} onClick={onSaveClick} size={'small'}>
              {t('Save')}
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={
            'flex-1 text-disabled-text flex justify-between items-start'
          }
        >
          <TextEllipsis
            text={value.toString()}
            maxWidth={'420'}
            className={'text-disabled-text flex-1'}
          />
          <div
            className={
              'hidden group-hover:block cursor-pointer color-blue ml-auto pt-1'
            }
            onClick={() => setIsEdit(true)}
          >
            <Pencil size={16} />
          </div>
        </div>
      )}
    </div>
  );
}

export default observer(UserPropertiesModal);
