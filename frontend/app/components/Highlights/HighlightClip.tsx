import React from 'react';
import { tagProps } from "App/services/NotesService";
import { GridItem } from 'App/components/Spots/SpotsList/SpotListItem';
import { confirm } from "UI";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Tag } from "antd";
import copy from "copy-to-clipboard";
import { Eye, Link } from "lucide-react";
import { toast } from "react-toastify";
import { resentOrDate } from 'App/date'

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
}: {
  note: string;
  tag: string;
  user: string;
  createdAt: string;
  hId: number;
  thumbnail?: string;
  openEdit: (id: any) => any;
  onItemClick: (id: any) => any;
  onDelete: (id: any) => any;
}) {
  const copyToClipboard = () => {
    const currUrl = window.location.href;
    const hUrl = `${currUrl}?highlight=${hId}`;
    copy(hUrl);
  };

  const menuItems = [
    {
      key: 'copy',
      icon: <Link size={14} strokeWidth={1} />,
      label: 'Copy Link',
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit',
    },
    {
      key: 'visibility',
      icon: <Eye strokeWidth={1} size={14} />,
      label: 'Visibility',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
    },
  ];

  const onMenuClick = async ({ key }: any) => {
    switch (key) {
      case 'edit':
        return openEdit();
      case 'copy':
        copyToClipboard();
        toast.success('Highlight link copied to clipboard');
        return
      case 'delete':
        const res = await confirm({
          header: 'Are you sure delete this Highlight?',
          confirmation:
            'Deleting a Highlight will only remove this instance and its associated note. It will not affect the original session.',
          confirmButton: 'Yes, Delete',
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
      title={note}
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
        tag ? <div className="left-0 bottom-8 flex relative gap-2 justify-end pe-2 pb-2 ">
          <Tag
            color={tagProps[tag]}
            className="border-0 rounded-lg hover:inherit gap-2 w-14 text-center capitalize"
            bordered={false}
          >
            {tag.toLowerCase()}
          </Tag>
        </div> : null
      }
    />
  );
}

export default HighlightClip;