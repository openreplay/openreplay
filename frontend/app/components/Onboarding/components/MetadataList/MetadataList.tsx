import React, { useEffect } from 'react';
import { Button, TagBadge } from 'UI';
import CustomFieldForm from '../../../Client/CustomFields/CustomFieldForm';
import { confirm } from 'UI';
import { useModal } from 'App/components/Modal';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const MetadataList = () => {
  const { customFieldStore, projectsStore } = useStore();
  const site = projectsStore.instance;
  const fields = customFieldStore.list;

  const { showModal, hideModal } = useModal();

  useEffect(() => {
    customFieldStore.fetchList(site?.id);
  }, [site?.id]);

  const save = (field: any) => {
    if (!site) return;
    customFieldStore.save(site.id!, field).then((response) => {
      if (!response || !response.errors || response.errors.size === 0) {
        hideModal();
        toast.success('Metadata added successfully!');
      } else {
        toast.error(response.errors[0]);
      }
    });
  };

  const openModal = () => {
    showModal(<CustomFieldForm siteId={site.id} onClose={hideModal} onSave={save} />, { right: true });
  };

  const removeMetadata = async (field: { index: number }) => {
    if (
      await confirm({
        header: 'Metadata',
        confirmation: 'Are you sure you want to remove?'
      })
    ) {
      customFieldStore.remove(site.id, field.index + '');
    }
  };

  return (
    <div className="py-2 flex">
      <Button variant="outline" onClick={() => openModal()}>
        Add Metadata
      </Button>
      <div className="flex ml-2">
        {fields.map((f, index) => (
          <TagBadge key={index} text={f.key} onRemove={() => removeMetadata(f)} outline />
        ))}
      </div>
    </div>
  );
};

export default observer(MetadataList);
