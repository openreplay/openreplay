import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { DisplayShell, MenuSelect } from '@/ui/filters/DisplayMenu';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { SearchField } from '@/ui/inputs/SearchField';
import { Checkbox } from '@/ui/inputs/checkbox';
import { CardGrid } from '@/ui/layout/CardGrid';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard } from '@/ui/layout/PageCard';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { useToast } from '@/ui/overlays/toast';
import withPageTitle from 'HOCs/withPageTitle';
import copy from 'copy-to-clipboard';
import {
  Disc,
  Download,
  Link2,
  Puzzle,
  RotateCw,
  SquareArrowOutUpRight,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import withPermissions from 'App/components/hocs/withPermissions';
import { useStore } from 'App/mstore';
import type { Spot } from 'App/mstore/types/spot';
import { spot as spotUrl, withSiteId } from 'App/routes';
import { useHistory, useParams } from 'App/routing';
import { debounce } from 'App/utils';

import { StartPath } from 'Shared/StartPath/StartPath';

import InstallCTA, { STORE_URL } from './InstallCTA';
import { SpotCard } from './SpotCard';
import './spot-page.css';

type SpotRef = Pick<Spot, 'spotId' | 'title'>;

function SpotsList() {
  const { t } = useTranslation();
  const toast = useToast();
  const history = useHistory();
  const { siteId } = useParams<{ siteId: string }>();
  const { spotStore } = useStore();
  // id → title, so a selection spanning pages can still be downloaded and named
  const [selected, setSelected] = React.useState<Map<string, string>>(
    () => new Map(),
  );
  // the last card touched; a shift-click selects from it through the clicked one
  const anchor = React.useRef<string | null>(null);
  const [renaming, setRenaming] = React.useState<Spot | null>(null);
  const [deleting, setDeleting] = React.useState<SpotRef[] | null>(null);

  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    void spotStore.fetchSpots().finally(() => setLoaded(true));
  }, []);

  const debouncedFetch = React.useMemo(
    () => debounce(spotStore.fetchSpots, 250),
    [],
  );
  // a new question is read from the top
  const refetchFromStart = () => {
    spotStore.setPage(1);
    void spotStore.fetchSpots();
  };
  const linkOf = (s: Spot) =>
    `${window.location.origin}${withSiteId(spotUrl(s.spotId.toString()), siteId)}`;

  const open = (s: Spot, e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) window.open(linkOf(s), '_blank');
    else history.push(withSiteId(spotUrl(s.spotId.toString()), siteId));
  };

  const download = async (s: SpotRef) => {
    try {
      const { url } = await spotStore.getVideo(s.spotId);
      const blob = await (await fetch(url)).blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${s.title}.webm`;
      a.click();
      // revoking right after click() can cancel the download in Firefox / Safari
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch {
      toast.error(t('Error downloading file.'));
    }
  };

  const downloadOne = (s: Spot) => {
    toast.info(t('Retrieving Spot video...'));
    void download(s);
  };

  const selectedRefs = (): SpotRef[] =>
    [...selected].map(([spotId, title]) => ({ spotId, title }));

  const clearSelection = () => {
    anchor.current = null;
    setSelected(new Map());
  };

  const downloadSelected = async () => {
    const picked = selectedRefs();
    toast.info(t('Downloading {{n}} videos', { n: picked.length }));
    clearSelection();
    for (const s of picked) await download(s);
  };

  const withRefs = (refs: SpotRef[], on: boolean) =>
    setSelected((prev) => {
      const next = new Map(prev);
      refs.forEach((r) =>
        on ? next.set(r.spotId, r.title) : next.delete(r.spotId),
      );
      return next;
    });

  const toggleSelected = (s: Spot, extend: boolean) => {
    const from = anchor.current;
    anchor.current = s.spotId;
    const page = spotStore.spots;
    const a = from == null ? -1 : page.findIndex((x) => x.spotId === from);
    const b = page.indexOf(s);
    const span =
      extend && a >= 0 && a !== b
        ? page.slice(Math.min(a, b), Math.max(a, b) + 1)
        : [s];
    withRefs(span, !selected.has(s.spotId));
  };

  const selectedOnPage = spotStore.spots.filter((s) =>
    selected.has(s.spotId),
  ).length;
  const selectAll = async () => {
    try {
      const all = await spotStore.fetchAllSpotRefs();
      setSelected(new Map(all.map((s) => [s.id, s.title])));
    } catch {
      toast.error(t('Failed to load Spots'));
    }
  };

  const remove = async (refs: SpotRef[]) => {
    setDeleting(null);
    try {
      await spotStore.deleteSpot(refs.map((r) => r.spotId));
    } catch {
      toast.error(t('Failed to delete Spot'));
      return;
    }
    anchor.current = null;
    withRefs(refs, false);
    // a delete can empty the last page out from under you
    const pages = Math.max(1, Math.ceil(spotStore.total / spotStore.limit));
    if (spotStore.page > pages) {
      spotStore.setPage(pages);
      await spotStore.fetchSpots();
    }
    toast.success(
      refs.length > 1
        ? t('{{n}} Spots deleted', { n: refs.length })
        : t('Spot successfully deleted'),
    );
  };

  const rename = (title: string) => {
    if (renaming) {
      spotStore
        .updateSpot(renaming.spotId, { name: title })
        .then(() => toast.success(t('Spot renamed')))
        .catch(() => toast.error(t('Failed to rename Spot')));
    }
    setRenaming(null);
  };

  const firstRun = (
    <EmptyState
      art="spot"
      title={t('No Spots yet')}
      hint={t(
        'A Spot is a short screen recording with the console and network attached, made from a Chrome extension. Record one, share the link.',
      )}
      action={
        <Button asChild>
          <a href={STORE_URL} target="_blank" rel="noreferrer">
            {t('Get the extension')}
            <SquareArrowOutUpRight size={13} aria-hidden="true" />
          </a>
        </Button>
      }
    >
      <StartPath
        steps={[
          {
            icon: <Puzzle />,
            label: t('Install the extension'),
            hint: t('Chrome, one click'),
          },
          {
            icon: <Disc />,
            label: t('Record a tab'),
            hint: t('Or the whole screen'),
          },
          {
            icon: <Link2 />,
            label: t('Share the link'),
            hint: t('It lands here too'),
          },
        ]}
      />
    </EmptyState>
  );

  const filtered = spotStore.query !== '' || spotStore.filter !== 'all';
  const noneAtAll = !spotStore.tenantHasSpots && !filtered;
  const { isLoading, spots } = spotStore;
  const picked = selected.size;

  const question = (
    <>
      <FilterStrip
        label={t('Filter by owner')}
        items={[
          { key: 'all', label: t('All Spots') },
          { key: 'own', label: t('My Spots') },
        ]}
        selected={[spotStore.filter]}
        onSelect={(key) => {
          spotStore.setFilter(key as 'all' | 'own');
          refetchFromStart();
        }}
      />
      <span className="m-spots__display">
        <DisplayShell
          changeCount={spotStore.order === 'desc' ? 0 : 1}
          onReset={() => {
            spotStore.setOrder('desc');
            refetchFromStart();
          }}
          rows={[
            {
              id: 'sp-sort',
              label: t('Order'),
              control: (
                <MenuSelect<'asc' | 'desc'>
                  id="sp-sort"
                  value={spotStore.order}
                  choices={[
                    { value: 'desc', label: t('Newest first') },
                    { value: 'asc', label: t('Oldest first') },
                  ]}
                  onChange={(order) => {
                    spotStore.setOrder(order);
                    refetchFromStart();
                  }}
                />
              ),
            },
          ]}
        />
      </span>
    </>
  );

  const selection = (
    <div className="m-spots__bulk">
      <Checkbox
        checked={
          spots.length > 0 && selectedOnPage === spots.length
            ? true
            : selectedOnPage > 0
              ? 'indeterminate'
              : false
        }
        aria-label={t('Select every Spot on this page')}
        onCheckedChange={(v) => withRefs(spots, v === true)}
      />
      <span className="m-spots__count">
        {t('{{n}} selected', { n: picked })}
      </span>
      {picked < spotStore.total && (
        <Button variant="subtle" onClick={() => void selectAll()}>
          {t('Select all {{n}}', { n: spotStore.total })}
        </Button>
      )}
      <span className="m-spots__bulk-verbs">
        <Button variant="subtle" onClick={() => void downloadSelected()}>
          <Download size={13} aria-hidden="true" />
          {t('Download')}
        </Button>
        <Button
          variant="danger-outline"
          onClick={() => setDeleting(selectedRefs())}
        >
          <Trash2 size={13} aria-hidden="true" />
          {t('Delete')}
        </Button>
        <Button variant="subtle" onClick={clearSelection}>
          {t('Cancel')}
        </Button>
      </span>
    </div>
  );

  return (
    <PageCard
      title={t('Spot')}
      subtitle={t('Screen recordings captured with the Spot extension.')}
      actions={
        <>
          {noneAtAll ? null : (
            <SearchField
              placeholder={t('Search Spots')}
              value={spotStore.query}
              onChange={(v) => {
                spotStore.setQuery(v);
                spotStore.setPage(1);
                debouncedFetch();
              }}
            />
          )}
          <IconButton
            icon={<RotateCw size={14} />}
            label={t('Refresh')}
            variant="ghost"
            onClick={() => void spotStore.fetchSpots()}
          />
        </>
      }
      toolbar={noneAtAll ? undefined : picked > 0 ? selection : question}
    >
      <InstallCTA />
      {!loaded || (isLoading && spots.length === 0) ? (
        <CardGrid>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="m-spot-card m-spot-card--skeleton" />
          ))}
        </CardGrid>
      ) : noneAtAll ? (
        firstRun
      ) : spots.length === 0 ? (
        <EmptyState
          art="search"
          title={t('Nothing matches')}
          hint={t('Clear the search, or switch back to all Spots.')}
          action={
            <Button
              onClick={() => {
                spotStore.setQuery('');
                spotStore.setFilter('all');
                refetchFromStart();
              }}
            >
              {t('Show all Spots')}
            </Button>
          }
        />
      ) : (
        <>
          <CardGrid>
            {spots.map((s) => (
              <SpotCard
                key={s.spotId}
                spot={s}
                selected={selected.has(s.spotId)}
                onToggleSelect={(extend) => toggleSelected(s, extend)}
                onOpen={(e) => open(s, e)}
                onRename={() => setRenaming(s)}
                onCopy={() => {
                  copy(linkOf(s));
                  toast.success(t('Spot URL copied to clipboard'));
                }}
                onDownload={() => downloadOne(s)}
                onDelete={() => setDeleting([s])}
              />
            ))}
          </CardGrid>
          <ListFooter
            page={spotStore.page}
            pageSize={spotStore.limit}
            total={spotStore.total}
            noun={[t('Spot'), t('Spots')]}
            onPage={(page) => {
              spotStore.setPage(page);
              void spotStore.fetchSpots();
            }}
          />
        </>
      )}

      <RenameDialog
        open={renaming != null}
        title={t('Rename Spot')}
        value={renaming?.title ?? ''}
        onCancel={() => setRenaming(null)}
        onOk={rename}
      />
      <ConfirmDialog
        open={deleting != null}
        title={
          (deleting?.length ?? 0) > 1
            ? t('Delete {{n}} Spots?', { n: deleting?.length })
            : t('Delete this Spot?')
        }
        okText={t('Delete')}
        danger
        onCancel={() => setDeleting(null)}
        onOk={() => deleting && void remove(deleting)}
      >
        {(deleting?.length ?? 0) > 1 ? (
          t(
            'The clips and their comments go with them, including for anyone holding a public link.',
          )
        ) : (
          <>
            <span className="m-dlg__subject">{deleting?.[0]?.title}</span>{' '}
            {t(
              'and its comments are gone for good, including for anyone holding its public link.',
            )}
          </>
        )}
      </ConfirmDialog>
    </PageCard>
  );
}

export default withPermissions(['SPOT'])(
  withPageTitle('Spot List - OpenReplay')(observer(SpotsList)),
);
