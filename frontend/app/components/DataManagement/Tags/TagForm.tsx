import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { StatTile } from '@/ui/data/StatTile';
import { Input } from '@/ui/inputs/input';
import { Segmented } from '@/ui/inputs/toggle-group';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import {
  DrawerFooter,
  EntityDrawer,
  Field,
  Section,
} from '@/ui/overlays/EntityDrawer';
import { useToast } from '@/ui/overlays/toast';
import { Trash2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import {
  TAG_NAME_MAX,
  type Tag,
  isValidTagName,
} from 'App/services/TagWatchService';

type Scope = 'entire' | 'location';

interface Props {
  tag: Tag;
  open: boolean;
  onClose: () => void;
  projectId: number;
}

/** Edit one tagged element; keyed by tag id, so the draft is per tag. */
function TagForm({ tag, open, onClose, projectId }: Props) {
  const { t } = useTranslation();
  const { tagWatchStore } = useStore();
  const [name, setName] = React.useState(tag.name);
  const toast = useToast();
  // the API updates a tag's name only; scope and page are shown, not edited
  const scope: Scope = tag.location ? 'location' : 'entire';
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const dirty = name.trim() !== tag.name;
  const valid = isValidTagName(name.trim());

  const save = () => {
    setSaving(true);
    tagWatchStore
      .updateTag(tag.tagId, { name: name.trim() }, projectId)
      .then(onClose)
      .catch(() => toast.error(t('Could not rename the feature')))
      .finally(() => setSaving(false));
  };

  return (
    <>
      <EntityDrawer
        open={open}
        onClose={onClose}
        eyebrow={t('Feature')}
        title={tag.name}
        footer={
          <DrawerFooter
            left={
              <IconButton
                icon={<Trash2 size={14} />}
                label={t('Remove feature')}
                variant="ghost"
                onClick={() => setRemoving(true)}
              />
            }
            right={
              <>
                <Button variant="subtle" onClick={onClose}>
                  {t('Cancel')}
                </Button>
                <Button
                  variant="primary"
                  disabled={!dirty || !valid || saving}
                  onClick={save}
                >
                  {t('Update')}
                </Button>
              </>
            }
          />
        }
      >
        <Section title={t('Tagged element')}>
          <Field
            label={t('Name')}
            error={
              name.trim() && !valid
                ? t('Letters, digits, spaces, hyphens and quotes only.')
                : undefined
            }
          >
            <Input
              value={name}
              maxLength={TAG_NAME_MAX}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label={t('Selector')}>
            <Input
              value={tag.selector}
              disabled
              readOnly
              className="m-dmg__mono"
            />
          </Field>
          <Field label={t('Scope')}>
            <Segmented
              block
              value={scope}
              onChange={() => {}}
              ariaLabel={t('Scope')}
              options={[
                { value: 'entire', label: t('Entire app'), disabled: true },
                {
                  value: 'location',
                  label: t('Specific page'),
                  disabled: true,
                },
              ]}
            />
          </Field>
          {scope === 'location' && (
            <Field label={t('Page')}>
              <Input value={tag.location ?? ''} disabled readOnly />
            </Field>
          )}
        </Section>
        <Section title={t('Metrics')} hint={t('Last 24 hours')}>
          <div className="m-fdrawer__tiles">
            <StatTile
              value={(tag.users ?? 0).toLocaleString()}
              label={t('Unique users')}
            />
            <StatTile
              value={(tag.volume ?? 0).toLocaleString()}
              label={t('Total interactions')}
              tone="accent"
            />
          </div>
        </Section>
      </EntityDrawer>
      <ConfirmDialog
        open={removing}
        title={t('Remove this feature?')}
        okText={t('Remove')}
        danger
        onCancel={() => setRemoving(false)}
        onOk={() => {
          setRemoving(false);
          tagWatchStore
            .deleteTag(tag.tagId, projectId)
            .then(onClose)
            .catch(() => toast.error(t('Could not remove the feature')));
        }}
      >
        {t(
          '{{name}} stops being watched. The element itself is untouched; you can tag it again from any recording.',
          { name: tag.name },
        )}
      </ConfirmDialog>
    </>
  );
}

export default TagForm;
