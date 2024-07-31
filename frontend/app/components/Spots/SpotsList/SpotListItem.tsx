import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  SlackOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Dropdown, Tooltip } from 'antd';
import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Spot } from 'App/mstore/types/spot';
import { spot as spotUrl, withSiteId } from 'App/routes';
import EditItemModal from "./EditItemModal";
import styles from './loader.module.css';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import {Link2} from 'lucide-react';

const backgroundUrl = '/assets/img/spotThumbBg.svg';

interface ISpotListItem {
  spot: Spot;
  onRename: (id: string, title: string) => void;
  onDelete: () => void;
  onVideo: (id: string) => Promise<{ url: string }>;
  onSelect: (selected: boolean) => void;
  isSelected: boolean;  // Add this prop
}

function SpotListItem({ spot, onRename, onDelete, onVideo, onSelect, isSelected }: ISpotListItem) {
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tooltipText, setTooltipText] = useState('Copy link to clipboard');
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
      key: 'report',
      label: 'Report Issue',
      icon: <ExclamationCircleOutlined />,
    },
    {
      key: 'slack',
      icon: <SlackOutlined />,
      label: 'Share via Slack',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
    }
  ];

  const onMenuClick = async ({ key }: any) => {
    switch (key) {
      case 'rename':
        return setIsEdit(true);
      case 'download':
        const { url } = await onVideo(spot.spotId);
        await downloadFile(url, `${spot.title}.webm`);
        return;
      case 'report':
        return window.open('mailto:support@openreplay.com');
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

  const copyToClipboard = () => {
    const spotLink = withSiteId(spotUrl(spot.spotId.toString()), siteId);
    const fullLink = `${window.location.origin}${spotLink}`;
    navigator.clipboard.writeText(fullLink)
      .then(() => {
        setTooltipText('Link copied to clipboard!');
        setTimeout(() => setTooltipText('Copy link to clipboard'), 2000); // Reset tooltip text after 2 seconds
      })
      .catch(() => {
        setTooltipText('Failed to copy URL');
        setTimeout(() => setTooltipText('Copy link to clipboard'), 2000); // Reset tooltip text after 2 seconds
      });
  };

  const onSave = (newName: string) => {
    onRename(spot.spotId, newName);
    setIsEdit(false);
  };

  return (
    <div
    className={`bg-white rounded-lg overflow-hidden shadow-sm border ${
      isSelected ? 'border-teal/30' : 'border-transparent'
    } transition flex flex-col items-start hover:border-teal`}
  >
      {isEdit ? (
        <EditItemModal onSave={onSave} onClose={() => setIsEdit(false)} itemName={spot.title} />
      ) : null}
      <div className='relative group overflow-hidden'
        style={{
          width: '100%',
          height: 180,
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatedSVG name={ICONS.LOADER} size={32} />
          </div>
        )}
        <div className='block w-full h-full cursor-pointer transition hover:bg-teal/70 relative' onClick={onSpotClick}>
          <img
            src={spot.thumbnail}
            alt={spot.title}
            className={'w-full h-full object-cover opacity-80'}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            style={{ display: loading ? 'none' : 'block' }}
          />
          <div className='absolute inset-0 flex items-center justify-center opacity-0 scale-75 transition-all hover:scale-100 hover:transition-all group-hover:opacity-100 transition-opacity '>
            <PlayCircleOutlined style={{ fontSize: '48px', color: 'white' }} />
          </div>
        </div>

        <div className='absolute left-0 bottom-8 flex relative gap-2 justify-end pe-2 pb-2 '>
          <Tooltip title={tooltipText}>
            <div
              className={
                'bg-black/70 text-white p-1 px-2 text-xs rounded-lg transition-transform transform translate-y-14 group-hover:translate-y-0 '
              }
              onClick={copyToClipboard}
              style={{ cursor: 'pointer' }}
            >
              <Link2 size={16} strokeWidth={1} />
              
            </div>
          </Tooltip>
          <div
            className={
              'bg-black/70 text-white p-1 px-2 text-xs rounded-lg flex items-center cursor-normal'
            }
          >
            {spot.duration}
          </div>
        </div>
      </div>
      <div className={'px-4 py-4 w-full border-t'}>
        <div className={'flex items-center gap-2'}>
          <Checkbox
            checked={isSelected}  // Use isSelected prop to control the checkbox state
            onChange={({ target: { checked } }) => onSelect(checked)} 
            className='flex cursor-pointer capitalize w-full'
          >
            <span className='capitalize w-full text-nowrap text-ellipsis overflow-hidden max-w-80 mb-0 block'>{spot.title}</span>
          </Checkbox>
        </div>
        <div className={'flex items-center gap-1 leading-4 text-xs opacity-50'}>
          <div>
            <UserOutlined />
          </div>
          <div>{spot.user}</div>
          <div className='ms-4'>
            <ClockCircleOutlined />
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
