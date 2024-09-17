import React, { useEffect } from 'react';
import { Button, TagBadge } from 'UI';
import { connect } from 'react-redux';
import CustomFieldForm from '../../../Client/CustomFields/CustomFieldForm';
import { confirm } from 'UI';
import { useModal } from 'App/components/Modal';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';

interface MetadataListProps {
  site: { id: string };
}

const MetadataList: React.FC<MetadataListProps> = (props) => {
  const { site } = props;
  const { customFieldStore } = useStore();
  const fields = customFieldStore.list;

  const { showModal, hideModal } = useModal();

  useEffect(() => {
    customFieldStore.fetchList(site.id);
  }, [site.id]);

  const save = (field: any) => {
    customFieldStore.save(site.id, field).then((response) => {
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

export default connect(
  (state: any) => ({
    site: state.getIn(['site', 'instance']),
    fields: state.getIn(['customFields', 'list']).sortBy((i: any) => i.index),
    field: state.getIn(['customFields', 'instance']),
    loading: state.getIn(['customFields', 'fetchRequest', 'loading'])
  })
)(MetadataList);
