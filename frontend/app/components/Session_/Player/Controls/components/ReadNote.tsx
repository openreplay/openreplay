import React from 'react';
import { Icon } from 'UI';
import { Button, Tag } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { tagProps, Note } from 'App/services/NotesService';
import { formatTimeOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { TeamBadge } from 'Shared/SessionsTabOverview/components/Notes';
import { useTranslation } from 'react-i18next';

interface Props {
  note?: Note;
  notFound?: boolean;
  onClose: () => void;
}

function ReadNote(props: Props) {
  const { t } = useTranslation();
  const { settingsStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;

  if (props.notFound || props.note === undefined) {
    return (
      <div
        style={{ position: 'absolute', top: '45%', left: 'calc(50% - 200px)' }}
      >
        <div
          className="flex items-start flex-col p-4 border gap-2 rounded-lg"
          style={{ background: '#FFFEF5', width: 400 }}
        >
          <div className="flex items-start font-semibold w-full text-xl">
            <div style={{ flex: 9 }}>
              {t('You do not have access to this note.')} <br />{' '}
              {t('Or it’s deleted.')}
            </div>
            <div
              style={{ flex: 1 }}
              className="cursor-pointer ml-auto"
              onClick={props.onClose}
            >
              <Icon name="close" size={18} />
            </div>
          </div>
          <div
            onClick={props.onClose}
            className="rounded py-2 px-4 mt-2 flex items-center text-blue gap-2 cursor-pointer hover:bg-active-blue"
          >
            <Icon size={20} name="play-fill" color="main" />
            <span>{t('Play Session')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
      }}
      className="flex items-center justify-center"
    >
      <div
        className="flex items-start !text-lg flex-col p-4 border gap-2 rounded-lg bg-amber-50"
        style={{ width: 500 }}
      >
        <div className="flex items-center w-full">
          <div className="p-2 bg-gray-light rounded-full">
            <Icon name="quotes" color="main" size={16} />
          </div>
          <div className="ml-2">
            <div className="text-base">{props.note.userName}</div>
            <div className="text-disabled-text text-sm">
              {formatTimeOrDate(
                props.note.createdAt as unknown as number,
                timezone,
              )}
            </div>
          </div>
          <div
            className="ml-auto cursor-pointer self-start"
            onClick={props.onClose}
          >
            <Icon name="close" size={18} />
          </div>
        </div>
        <div
          className="text-xl py-3 overflow-y-auto capitalize-first"
          style={{ maxHeight: 400 }}
        >
          {props.note.message}
        </div>
        <div className="w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1 items-center">
              {props.note.tag ? (
                <Tag
                  color={tagProps[props.note.tag]}
                  className="border-0 rounded-lg"
                >
                  {props.note.tag}
                </Tag>
              ) : null}

              <Tag bordered={false}>
                {!props.note.isPublic ? null : <TeamBadge />}
              </Tag>
            </div>

            <Button
              onClick={props.onClose}
              icon={<PlayCircleOutlined />}
              type="default"
            >
              {t('Play Session')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default observer(ReadNote);
