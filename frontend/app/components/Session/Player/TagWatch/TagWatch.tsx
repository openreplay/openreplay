import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { Field } from '@/ui/inputs/Field';
import { Input } from '@/ui/inputs/input';
import { Segmented } from '@/ui/inputs/toggle-group';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { DrawerFooter } from '@/ui/overlays/EntityDrawer';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import copy from 'copy-to-clipboard';
import {
  ChevronLeft,
  Copy,
  MousePointerSquareDashed,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { sessions, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { tagWatchService } from 'App/services';
import { type TagItem, isValidTagName } from 'App/services/TagWatchService';
import { FilterKey } from 'App/types/filter/filterType';
import { addOptionsToFilter } from 'App/types/filter/newFilter';
import { TYPES } from 'App/types/session/event';
import { PanelBar } from 'Components/Session/ReplayScreen/PanelBar';
import 'Components/Session/ReplayScreen/activity-panel.css';
import { PlayerContext } from 'Components/Session/playerContext';

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

/** A tag without a location is watched everywhere; `:id` in one is a pattern. */
function onThesePages(
  tag: { location?: string | null },
  paths: ReadonlySet<string>,
) {
  if (!tag.location) return true;
  if (paths.has(tag.location)) return true;
  if (tag.location.includes(':')) {
    const head = tag.location.split('/:')[0];
    return [...paths].some((p) => p === head || p.startsWith(`${head}/`));
  }
  return false;
}

/** The side panel's Features tab: tagged elements on this session's pages; a row opens it, + tags a new one. */
function TagWatch() {
  const { t } = useTranslation();
  const history = useHistory();
  const { projectsStore, searchStore, sessionStore } = useStore();
  const { player } = React.useContext(PlayerContext);
  const [editing, setEditing] = React.useState<TagItem | 'new' | null>(null);
  const [q, setQ] = React.useState('');
  const projectId = projectsStore.active?.projectId;

  const { data: tags = [] } = useQuery({
    queryKey: ['tags', projectId],
    queryFn: async () =>
      (await tagWatchService.getTags(projectId!, 1, 200)).tags ?? [],
    enabled: !!projectId,
  });

  const paths = React.useMemo(
    () =>
      new Set(
        (sessionStore.current.events ?? [])
          .filter((e: any) => e.type === TYPES.LOCATION)
          .map((e: any) => pathOf(e.url ?? '')),
      ),
    [sessionStore.current.events],
  );
  const needle = q.trim().toLowerCase();
  const onPages = tags.filter((tag) => onThesePages(tag, paths));
  const rows = needle
    ? onPages.filter((tag) =>
        `${tag.name} ${tag.selector}`.toLowerCase().includes(needle),
      )
    : onPages;

  const findSessions = (tagId: number) => {
    searchStore.addFilterByKeyAndValue('tag', tagId.toString());
    history.push(withSiteId(sessions(), projectsStore.getSiteId() as any));
  };

  if (editing != null) {
    return (
      <TagForm
        key={editing === 'new' ? 'new' : editing.tagId}
        tag={editing === 'new' ? undefined : editing}
        onDone={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="m-feat">
      <PanelBar
        find={{ value: q, onChange: setQ, placeholder: t('Find a feature') }}
      >
        <IconButton
          icon={<Plus size={14} />}
          label={t('Tag an element')}
          variant="ghost"
          onClick={() => setEditing('new')}
        />
      </PanelBar>
      {rows.length === 0 ? (
        <p className="m-spanel__none">
          {onPages.length === 0
            ? t(
                'Tag an element in the recording to watch how many people use it.',
              )
            : t('No feature matches that.')}
        </p>
      ) : (
        <ul className="m-spanel__list" aria-label={t('Features')}>
          {rows.map((tag) => (
            <li
              key={tag.tagId}
              className="m-spanel__row m-feat__row"
              onPointerEnter={() => player.markBySelector(tag.selector)}
              onPointerLeave={() => player.markBySelector('')}
            >
              <button
                type="button"
                className="m-spanel__cell"
                onClick={() => setEditing(tag)}
                aria-label={t('Edit {{name}}', { name: tag.name })}
              >
                <span className="m-spanel__glyph" aria-hidden="true">
                  <MousePointerSquareDashed size={12} />
                </span>
                <span className="m-spanel__body">
                  <span className="m-spanel__line">
                    <span className="m-spanel__label m-truncate">
                      {tag.name}
                    </span>
                    <span className="m-spanel__tail">
                      {!tag.users && !tag.volume
                        ? t('new')
                        : t('{{n}} users', {
                            n: (tag.users ?? 0).toLocaleString(),
                          })}
                    </span>
                  </span>
                  <span
                    className="m-spanel__sub m-mono m-truncate"
                    title={tag.selector}
                  >
                    {tag.selector}
                  </span>
                </span>
              </button>
              <span className="m-spanel__verb">
                <IconButton
                  icon={<Search size={12} />}
                  label={t('Find sessions that used {{name}}', {
                    name: tag.name,
                  })}
                  variant="ghost"
                  onClick={() => findSessions(tag.tagId)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tags a new element, or (with `tag`) renames / removes one: the API only updates a tag's name. */
const TagForm = observer(
  ({ tag, onDone }: { tag?: TagItem; onDone: () => void }) => {
    const { t } = useTranslation();
    const toast = useToast();
    const queryClient = useQueryClient();
    const { tagWatchStore } = useStore();
    const { store, player } = React.useContext(PlayerContext);
    const { tagSelector, location: rawLocation } = store.get();
    const [selector, setSelector] = React.useState(tag?.selector ?? '');
    const [name, setName] = React.useState(tag?.name ?? '');
    const [rage, setRage] = React.useState(tag?.ignoreClickRage ?? false);
    const [dead, setDead] = React.useState(tag?.ignoreDeadClick ?? false);
    const [scope, setScope] = React.useState<'entire' | 'location'>(
      tag?.location ? 'location' : 'entire',
    );
    const [saving, setSaving] = React.useState(false);
    const [removing, setRemoving] = React.useState(false);
    const nameRef = React.useRef<HTMLInputElement>(null);
    const location = tag
      ? (tag.location ?? undefined)
      : rawLocation
        ? pathOf(rawLocation)
        : undefined;

    React.useEffect(() => {
      nameRef.current?.focus();
      if (tag) {
        nameRef.current?.select();
        player.markBySelector(tag.selector);
        return () => player.markBySelector('');
      }
      player.pause();
      player.toggleInspectorMode(true);
      player.scale();
      return () => {
        player.toggleInspectorMode(false);
        player.scale();
      };
    }, []);

    React.useEffect(() => {
      if (!tag && tagSelector && tagSelector !== selector)
        setSelector(tagSelector);
    }, [tagSelector]);

    React.useEffect(() => {
      if (!tag && selector !== tagSelector) player.markBySelector(selector);
    }, [selector]);

    const nameOk = isValidTagName(name.trim());
    const canSave =
      nameOk &&
      selector.trim() !== '' &&
      !saving &&
      (!tag || name.trim() !== tag.name);
    const element =
      selector
        .trim()
        .split(/\s*>\s*|\s+/)
        .pop() || selector;

    const refresh = async () => {
      const tags = await tagWatchStore.getTags();
      if (tags) {
        addOptionsToFilter(
          FilterKey.TAGGED_ELEMENT,
          tags.map((x) => ({ label: x.name, value: x.tagId.toString() })),
        );
      }
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    };

    const save = async () => {
      if (!canSave) return;
      setSaving(true);
      try {
        if (tag) {
          await tagWatchStore.updateTag(tag.tagId, { name: name.trim() });
        } else {
          await tagWatchStore.createTag({
            name,
            selector,
            ignoreClickRage: rage,
            ignoreDeadClick: dead,
            location: scope === 'location' ? location : undefined,
          });
        }
        await refresh();
        toast.success(tag ? t('Feature saved') : t('Feature created'));
        onDone();
      } catch {
        toast.error(
          tag ? t('Failed to save feature') : t('Failed to create feature'),
        );
      } finally {
        setSaving(false);
      }
    };

    const remove = async () => {
      if (!tag) return;
      setRemoving(false);
      try {
        await tagWatchStore.deleteTag(tag.tagId);
      } catch {
        toast.error(t('Could not remove the feature'));
        return;
      }
      await refresh();
      toast.success(t('Feature removed'));
      onDone();
    };

    return (
      <div className="m-feat m-feat--form">
        <div className="m-feat__formhead">
          <IconButton
            icon={<ChevronLeft size={14} />}
            label={t('Back to the features')}
            variant="ghost"
            onClick={onDone}
          />
          <span className="m-truncate">
            {tag ? tag.name : t('Tag an element')}
          </span>
        </div>

        <div className="m-feat__form">
          <Field
            label={t('Name')}
            htmlFor="m-feat-name"
            error={
              name.trim() && !nameOk
                ? t('Letters, digits, spaces, hyphens and quotes only.')
                : undefined
            }
          >
            <Input
              ref={nameRef}
              id="m-feat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Buy now button')}
            />
          </Field>

          <Field
            label={t('Element')}
            note={
              tag
                ? t('Only the name changes once an element is tagged.')
                : undefined
            }
          >
            {selector ? (
              <span className="m-feat__picked">
                <span className="m-feat__picked-glyph" aria-hidden="true">
                  <MousePointerSquareDashed size={13} />
                </span>
                <span className="m-feat__picked-text">
                  <span className="m-feat__picked-name m-truncate">
                    {element}
                  </span>
                  <span className="m-feat__picked-sel m-mono m-truncate">
                    {selector}
                  </span>
                </span>
                <Tooltip title={t('Copy')}>
                  <button
                    type="button"
                    className="m-feat__picked-act"
                    aria-label={t('Copy the selector')}
                    onClick={() => {
                      copy(selector);
                      toast.success(t('Copied'));
                    }}
                  >
                    <Copy size={12} aria-hidden="true" />
                  </button>
                </Tooltip>
                {tag ? null : (
                  <Tooltip title={t('Pick another')}>
                    <button
                      type="button"
                      className="m-feat__picked-act"
                      aria-label={t('Pick another element')}
                      onClick={() => setSelector('')}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </Tooltip>
                )}
              </span>
            ) : (
              <span className="m-feat__await">
                <MousePointerSquareDashed size={14} aria-hidden="true" />
                {t('Click a part of the recording')}
              </span>
            )}
          </Field>

          {!selector && (
            <details className="m-feat__byhand">
              <summary>{t('Type a selector')}</summary>
              <Input
                className="m-mono"
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
                placeholder=".btn-primary"
                aria-label={t('Selector')}
              />
            </details>
          )}

          <Field label={t('Ignore')}>
            <div className="m-feat__opts">
              <CheckRow
                boxed
                disabled={!!tag}
                on={rage}
                onToggle={() => setRage((v) => !v)}
              >
                {t('Click rage')}
              </CheckRow>
              <CheckRow
                boxed
                disabled={!!tag}
                on={dead}
                onToggle={() => setDead((v) => !v)}
              >
                {t('Dead click')}
              </CheckRow>
            </div>
          </Field>

          {location || tag ? (
            <Field label={t('Watch')}>
              <span className="m-feat__scope">
                <Segmented
                  value={scope}
                  ariaLabel={t('Where it is watched')}
                  onChange={(v) => setScope(v)}
                  options={[
                    {
                      value: 'entire',
                      label: t('Everywhere'),
                      disabled: !!tag,
                    },
                    {
                      value: 'location',
                      label: t('This page'),
                      disabled: !!tag || !location,
                    },
                  ]}
                />
                {scope === 'location' && (
                  <span className="m-feat__scope-at m-mono m-truncate">
                    {location}
                  </span>
                )}
              </span>
            </Field>
          ) : null}
        </div>

        <div className="m-feat__foot">
          <DrawerFooter
            left={
              tag ? (
                <IconButton
                  icon={<Trash2 size={14} />}
                  label={t('Remove feature')}
                  variant="ghost"
                  onClick={() => setRemoving(true)}
                />
              ) : undefined
            }
            right={
              <>
                <Button size="sm" onClick={onDone}>
                  {t('Cancel')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!canSave}
                  onClick={() => void save()}
                >
                  {t('Save')}
                </Button>
              </>
            }
          />
        </div>
        {tag ? (
          <ConfirmDialog
            open={removing}
            title={t('Remove this feature?')}
            okText={t('Remove')}
            danger
            onCancel={() => setRemoving(false)}
            onOk={() => void remove()}
          >
            {t(
              '{{name}} stops being watched. The element itself is untouched; you can tag it again from any recording.',
              { name: tag.name },
            )}
          </ConfirmDialog>
        ) : null}
      </div>
    );
  },
);

export default observer(TagWatch);
