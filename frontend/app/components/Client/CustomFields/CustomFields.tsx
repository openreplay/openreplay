import React, { useEffect, useState } from 'react';
import cn from 'classnames';
import withPageTitle from 'HOCs/withPageTitle';
import { Button, Loader, NoContent, Icon, Tooltip, Divider } from 'UI';
import SiteDropdown from 'Shared/SiteDropdown';
import styles from './customFields.module.css';
import CustomFieldForm from './CustomFieldForm';
import ListItem from './ListItem';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const CustomFields = () => {
  const { customFieldStore: store, projectsStore } = useStore();
  const sites = projectsStore.list;
  const [currentSite, setCurrentSite] = useState(sites[0]);
  const [deletingItem, setDeletingItem] = useState<number | null>(null);
  const { showModal, hideModal } = useModal();
  const fields = store.list;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const activeSite = sites[0];
    if (!activeSite) return;

    setCurrentSite(activeSite);

    setLoading(true);
    store.fetchList(activeSite.id).finally(() => {
      setLoading(false);
    });
  }, [sites]);

  const handleInit = (field?: any) => {
    store.init(field);
    showModal(<CustomFieldForm siteId={currentSite.id} />, {
      title: field ? 'Edit Metadata' : 'Add Metadata', right: true
    });
  };

  const onChangeSelect = ({ value }: { value: { value: number } }) => {
    const site = sites.find((s: any) => s.id === value.value);
    setCurrentSite(site);

    setLoading(true);
    store.fetchList(site.id).finally(() => {
      setLoading(false);
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <div className={cn(styles.tabHeader)}>
        <h3 className={cn(styles.tabTitle, 'text-2xl')}>{'Metadata'}</h3>
        <div style={{ marginRight: '15px' }}>
          <SiteDropdown value={currentSite && currentSite.id} onChange={onChangeSelect} />
        </div>
        <div className="ml-auto">
          <Tooltip title="You've reached the limit of 10 metadata." disabled={fields.length < 10}>
            <Button disabled={fields.length >= 10} variant="primary" onClick={() => handleInit()}>
              Add Metadata
            </Button>
          </Tooltip>
        </div>
      </div>
      <div className="text-base text-disabled-text flex px-5 items-center my-3">
        <Icon name="info-circle-fill" className="mr-2" size={16} />
        See additional user information in sessions.
        <a href="https://docs.openreplay.com/installation/metadata" className="link ml-1" target="_blank">
          Learn more
        </a>
      </div>

      <Loader loading={loading}>
        <NoContent
          title={
            <div className="flex flex-col items-center justify-center">
              <AnimatedSVG name={ICONS.NO_METADATA} size={60} />
              <div className="text-center my-4">None added yet</div>
            </div>
          }
          size="small"
          show={fields.length === 0}
        >
          <div className={styles.list}>
            {fields
              .filter((i: any) => i.index)
              .map((field: any) => (
                <>
                  <ListItem
                    disabled={deletingItem !== null && deletingItem === field.index}
                    key={field._key}
                    field={field}
                    onEdit={handleInit}
                  />
                  <Divider className="m-0" />
                </>
              ))}
          </div>
        </NoContent>
      </Loader>
    </div>
  );
};

export default withPageTitle('Metadata - OpenReplay Preferences')(observer(CustomFields));
