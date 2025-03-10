import {
  ClockCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  SlackOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Dropdown, Tooltip } from 'antd';
import copy from 'copy-to-clipboard';
import { Link2 } from 'lucide-react';
import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { TextEllipsis } from 'UI';

import { Spot } from 'App/mstore/types/spot';
import { spot as spotUrl, withSiteId } from 'App/routes';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

import EditItemModal from './EditItemModal';
import { useTranslation } from 'react-i18next';

const backgroundUrl = '/assets/img/spotThumbBg.svg';

interface ISpotListItem {
  spot: Spot;
  onRename: (id: string, title: string) => void;
  onDelete: () => void;
  onVideo: (id: string) => Promise<{ url: string }>;
  onSelect: (selected: boolean) => void;
  isSelected: boolean;
}

function SpotListItem({
  spot,
  onRename,
  onDelete,
  onVideo,
  onSelect,
  isSelected,
}: ISpotListItem) {
  const { t } = useTranslation();
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tooltipText, setTooltipText] = useState(t('Copy link to clipboard'));
  const history = useHistory();
  const { siteId } = useParams<{ siteId: string }>();

  const menuItems = [
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: t('Rename'),
    },
    {
      key: 'download',
      label: t('Download Video'),
      icon: <DownloadOutlined />,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: t('Delete'),
    },
  ];

  React.useEffect(() => {
    menuItems.splice(1, 0, {
      key: 'slack',
      icon: <SlackOutlined />,
      label: t('Share via Slack'),
    });
  }, []);
  const onMenuClick = async ({ key }: any) => {
    switch (key) {
      case 'rename':
        return setIsEdit(true);
      case 'download':
        const { url } = await onVideo(spot.spotId);
        await downloadFile(url, `${spot.title}.webm`);
        return;
      case 'copy':
        copy(
          `${window.location.origin}${withSiteId(
            spotUrl(spot.spotId.toString()),
            siteId,
          )}`,
        );
        return toast.success(t('Spot URL copied to clipboard'));
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
    navigator.clipboard
      .writeText(fullLink)
      .then(() => {
        setTooltipText(t('Link copied to clipboard!'));
        setTimeout(() => setTooltipText(t('Copy link to clipboard')), 2000); // Reset tooltip text after 2 seconds
      })
      .catch(() => {
        setTooltipText(t('Failed to copy URL'));
        setTimeout(() => setTooltipText(t('Copy link to clipboard')), 2000); // Reset tooltip text after 2 seconds
      });
  };

  const onSave = (newName: string) => {
    onRename(spot.spotId, newName);
    setIsEdit(false);
  };

  return (
    <>
      {isEdit ? (
        <EditItemModal
          onSave={onSave}
          onClose={() => setIsEdit(false)}
          itemName={spot.title}
        />
      ) : null}
      <GridItem
        modifier={
          <div className="absolute left-0 bottom-8 flex relative gap-2 justify-end pe-2 pb-2 ">
            <Tooltip title={tooltipText} className="capitalize">
              <div
                className="bg-black/70 text-white p-1 px-2 text-xs rounded-lg transition-transform transform translate-y-14 group-hover:translate-y-0 "
                onClick={copyToClipboard}
                style={{ cursor: 'pointer' }}
              >
                <Link2 size={16} strokeWidth={1} />
              </div>
            </Tooltip>
            <div className="bg-black/70 text-white p-1 px-2 text-xs rounded-lg flex items-center cursor-normal">
              {spot.duration}
            </div>
          </div>
        }
        onSave={onSave}
        setIsEdit={setIsEdit}
        isEdit={isEdit}
        title={spot.title}
        onItemClick={onSpotClick}
        thumbnail={spot.thumbnail}
        setLoading={setLoading}
        loading={loading}
        isSelected={isSelected}
        tooltipText={tooltipText}
        copyToClipboard={copyToClipboard}
        duration={spot.duration}
        onSelect={onSelect}
        user={spot.user}
        createdAt={spot.createdAt}
        menuItems={menuItems}
        onMenuClick={onMenuClick}
      />
    </>
  );
}

export function GridItem({
  title,
  onItemClick,
  thumbnail,
  setLoading,
  loading,
  isSelected,
  onSelect,
  user,
  createdAt,
  menuItems,
  onMenuClick,
  modifier,
}: {
  title: string;
  onItemClick: () => void;
  thumbnail: string;
  setLoading: (loading: boolean) => void;
  loading?: boolean;
  isSelected?: boolean;
  copyToClipboard: () => void;
  onSelect?: (selected: boolean) => void;
  user: string;
  createdAt: string;
  menuItems: any[];
  onMenuClick: (key: any) => void;
  modifier: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-lg overflow-hidden shadow-sm border ${
        isSelected ? 'border-teal/30' : 'border-transparent'
      } transition flex flex-col items-start hover:border-teal`}
    >
      <div
        className="relative group overflow-hidden"
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
        <div
          className="block w-full h-full cursor-pointer transition hover:bg-teal/70 relative"
          onClick={onItemClick}
        >
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover opacity-80"
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            style={{ display: loading ? 'none' : 'block' }}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 transition-all hover:scale-100 hover:transition-all group-hover:opacity-100 transition-opacity ">
            <PlayCircleOutlined
              style={{ fontSize: '48px', color: 'white' }}
              className="bg-teal/50 rounded-full"
            />
          </div>
        </div>

        {modifier}
      </div>
      <div className="w-full border-t">
        <div className="flex items-center gap-2">
          {onSelect ? (
            <div className="px-3 pt-2">
              <Checkbox
                checked={isSelected}
                onChange={({ target: { checked } }) => onSelect(checked)}
                className={`flex cursor-pointer w-full hover:text-teal ${
                  isSelected ? 'text-teal' : ''
                }`}
              >
                <TextEllipsis text={title} className="w-full" />
              </Checkbox>
            </div>
          ) : (
            <div className="bg-yellow/50 mx-2 mt-2 px-2 w-full rounded ">
              <TextEllipsis text={title} className="capitalize" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 leading-4 text-xs opacity-50 p-3">
          <div>
            <UserOutlined />
          </div>
          <TextEllipsis text={user} className="capitalize" />
          <div className="ml-auto">
            <ClockCircleOutlined />
          </div>
          <div>{createdAt}</div>
          <div>
            <Dropdown
              menu={{ items: menuItems, onClick: onMenuClick }}
              trigger={['click']}
            >
              <Button type="text" icon={<MoreOutlined />} size="small" />
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
