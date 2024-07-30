import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  CopyOutlined,
  GlobalOutlined,
  MessageOutlined,
  MoreOutlined,
  SlackOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Dropdown } from 'antd';
import React from 'react';
import { useHistory, useParams } from 'react-router-dom';
import copy from 'copy-to-clipboard';
import { Spot } from 'App/mstore/types/spot';
import { spot as spotUrl, withSiteId } from 'App/routes';
import EditItemModal from "./EditItemModal";
import { toast } from 'react-toastify';

interface ISpotListItem {
  spot: Spot;
  onRename: (id: string, title: string) => void;
  onDelete: () => void;
  onVideo: (id: string) => Promise<{ url: string }>;
  onSelect: (selected: boolean) => void;
}

function SpotListItem({ spot, onRename, onDelete, onVideo, onSelect }: ISpotListItem) {
  const [isEdit, setIsEdit] = React.useState(false)
  const history = useHistory();
  const { siteId } = useParams<{ siteId: string }>();
  const menuItems = [
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: 'Rename',
    },
    {
      key: 'download',
      label: 'Download Video',
      icon: <DownloadOutlined />,
    },
    {
      key: 'copy',
      label: 'Copy Spot URL',
      icon: <CopyOutlined />,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
    },
  ];
  React.useEffect(() => {
    menuItems.splice(1, 0, {
      key: 'slack',
      icon: <SlackOutlined />,
      label: 'Share via Slack',
    });
  }, []);
  const onMenuClick = async ({ key }: any) => {
    switch (key) {
      case 'rename':
        return setIsEdit(true)
      case 'download':
        const { url } = await onVideo(spot.spotId)
        await downloadFile(url, `${spot.title}.webm`)
        return;
      case 'copy':
        copy(withSiteId(spotUrl(spot.spotId.toString()), siteId));
        return toast.success('Spot URL copied to clipboard');
      case 'delete':
        return onDelete();
      case 'slack':
        break;
      default:
        break;
    }
  };
  const onSpotClick = (e: any) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      const spotLink = withSiteId(spotUrl(spot.spotId.toString()), siteId);
      const fullLink = `${window.location.origin}${spotLink}`;
      window.open(fullLink, '_blank');
    } else {
      history.push(withSiteId(spotUrl(spot.spotId.toString()), siteId));
    }
  };

  const onSave = (newName: string) => {
    onRename(spot.spotId, newName);
    setIsEdit(false);
  }
  return (
    <div
      className={
        'border rounded-xl overflow-hidden flex flex-col items-start hover:shadow'
      }
    >
      {isEdit ? (
        <EditItemModal onSave={onSave} onClose={() => setIsEdit(false)} itemName={spot.title} />
      ) : null}
      <div style={{ cursor: 'pointer', width: '100%', height: 180, position: 'relative' }} onClick={onSpotClick}>
        <img
          src={spot.thumbnail}
          alt={spot.title}
          className={'w-full h-full object-cover'}
        />
        <div
          className={
            'absolute bottom-4 right-4 bg-black text-white p-1 rounded'
          }
        >
          {spot.duration}
        </div>
      </div>
      <div className={'px-2 py-4 w-full'}>
        <div className={'flex items-center gap-2'}>
          <div>
            <Checkbox onChange={({ target: { checked }}) => onSelect(checked)} />
          </div>
          <div className={'cursor-pointer'} onClick={onSpotClick}>{spot.title}</div>
        </div>
        <div
          className={'flex items-center gap-2 text-disabled-text leading-4'}
          style={{ fontSize: 12 }}
        >
          <div>
            <GlobalOutlined />
          </div>
          <div>{spot.user}</div>
          <div>
            <MessageOutlined />
          </div>
          <div>{spot.createdAt}</div>
          <div className={'ml-auto'}>
            <Dropdown
              menu={{ items: menuItems, onClick: onMenuClick }}
              trigger={['click']}
            >
              <Button type="text" icon={<MoreOutlined />} size={'small'} />
            </Dropdown>
          </div>
        </div>
      </div>
    </div>
  );
}

async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
  }
}

export default SpotListItem;
