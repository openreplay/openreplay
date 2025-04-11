import React from 'react';
import { tagProps } from 'App/services/NotesService';
import { GridItem } from 'App/components/Spots/SpotsList/SpotListItem';
import { confirm } from 'UI';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import copy from 'copy-to-clipboard';
import { Eye, Link } from 'lucide-react';
import { toast } from 'react-toastify';
import { resentOrDate } from 'App/date';
import { noNoteMsg } from 'App/mstore/notesStore';
import { useTranslation } from 'react-i18next';

function HighlightClip({
  note = 'Highlight note',
  tag = 'ISSUE',
  user = 'user@openreplay.com',
  createdAt = '12/12/2025',
  hId = 1234,
  thumbnail = undefined,
  openEdit = () => undefined,
  onItemClick = () => undefined,
  onDelete = () => undefined,
  canEdit = false,
}: {
  note: string | null;
  tag: string;
  user: string;
  createdAt: string;
  hId: number;
  thumbnail?: string;
  openEdit: (id: any) => any;
  onItemClick: (id: any) => any;
  onDelete: (id: any) => any;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const noteMsg = note || noNoteMsg;
  const copyToClipboard = () => {
    const currUrl = window.location.href;
    const hUrl = `${currUrl}?highlight=${hId}`;
    copy(hUrl);
  };

  const menuItems = [
    {
      key: 'copy',
      icon: <Link size={14} strokeWidth={1} />,
      label: t('Copy Link'),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: t('Edit'),
      disabled: !canEdit,
    },
    {
      key: 'visibility',
      icon: <Eye strokeWidth={1} size={14} />,
      label: t('Visibility'),
      disabled: !canEdit,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: t('Delete'),
      disabled: !canEdit,
    },
  ];

  const onMenuClick = async ({ key }: any) => {
    switch (key) {
      case 'edit':
        return openEdit();
      case 'copy':
        copyToClipboard();
        toast.success(t('Highlight link copied to clipboard'));
        return;
      case 'delete':
        const res = await confirm({
          header: t('Are you sure delete this Highlight?'),
          confirmation:
            t('Deleting a Highlight will only remove this instance and its associated note. It will not affect the original session.'),
          confirmButton: t('Yes, Delete'),
        });
        if (res) {
          onDelete();
        }
        return;
      case 'visibility':
        return openEdit();
      default:
        break;
    }
  };
  return (
    <GridItem
      title={noteMsg}
      onItemClick={onItemClick}
      thumbnail={thumbnail}
      setLoading={() => null}
      loading={false}
      copyToClipboard={copyToClipboard}
      user={user}
      createdAt={resentOrDate(createdAt, true)}
      menuItems={menuItems}
      onMenuClick={onMenuClick}
      modifier={
        tag ? (
          <div className="left-0 bottom-8 flex relative gap-2 justify-end pe-2 pb-2 ">
            <Tag
              color={tagProps[tag]}
              className="border-0 rounded-lg hover:inherit gap-2 text-center capitalize"
              bordered={false}
            >
              {t(tag.toLowerCase())}
            </Tag>
          </div>
        ) : null
      }
    />
  );
}

export default HighlightClip;
