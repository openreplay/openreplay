import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { useViewport } from '@/ui/layout/use-viewport';
import * as D from '@radix-ui/react-dialog';
import { ListFilter, X } from 'lucide-react';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import './phone-filters.css';

/**
 * At phone a page's filter controls are one Filters button and a bottom
 * drawer; wider, this is a fragment and the controls draw as usual. In the
 * drawer each control draws its roomy form (`useInFilterSheet`) and reports
 * what it narrows for the button's badge. Choices apply as they are made.
 *
 * The controls stay mounted in a hidden holder while the drawer is shut, so
 * they keep reporting their counts (Radix `forceMount` would keep the scroll
 * lock and aria-hidden on the page too).
 */

interface SheetCtx {
  report: (id: string, n: number) => void;
}
const Ctx = createContext<SheetCtx | null>(null);

export function useInFilterSheet(): boolean {
  return useContext(Ctx) != null;
}

/** What this control narrows (0 when nothing), summed on the button. */
export function useSheetCount(n: number) {
  const ctx = useContext(Ctx);
  const id = useId();
  useEffect(() => {
    ctx?.report(id, n);
    return () => ctx?.report(id, 0);
  }, [ctx, id, n]);
}

export function SheetSection({
  title,
  aside,
  first,
  count = 0,
  children,
}: {
  title: string;
  aside?: ReactNode;
  /** leads the drawer wherever its control sits */
  first?: boolean;
  /** for a section whose control does not count itself */
  count?: number;
  children: ReactNode;
}) {
  useSheetCount(count);
  return (
    <section className={`m-pf__section${first ? ' is-first' : ''}`}>
      <div className="m-pf__section-head">
        <h3 className="m-pf__section-title">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export interface PhoneFiltersProps {
  children: ReactNode;
  /** the footer's words for the list as it stands: "Show 107 sessions" */
  result?: string;
  /** puts every control back; absent, no Reset */
  onReset?: () => void;
  label?: string;
  /** the page's own door instead of the Filters button (Recordings' search) */
  trigger?: (p: { open: () => void; badge: number }) => ReactNode;
}

export function PhoneFilters(props: PhoneFiltersProps) {
  const phone = useViewport() === 'phone';
  if (!phone) return <>{props.children}</>;
  return <PhoneSheet {...props} />;
}

function PhoneSheet({
  children,
  result,
  onReset,
  label,
  trigger,
}: PhoneFiltersProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const report = useCallback((id: string, n: number) => {
    setCounts((c) =>
      c[id] === n || (n === 0 && !(id in c)) ? c : { ...c, [id]: n },
    );
  }, []);
  const ctx = useMemo(() => ({ report }), [report]);
  const badge = Object.values(counts).reduce((a, b) => a + b, 0);
  const title = label ?? t('Filters');

  return (
    <Ctx.Provider value={ctx}>
      {trigger ? (
        trigger({ open: () => setOpen(true), badge })
      ) : (
        <IconButton
          icon={<ListFilter size={15} />}
          label={title}
          count={badge}
          active={badge > 0}
          open={open}
          onClick={() => setOpen(true)}
        />
      )}
      {!open && (
        <div className="m-pf__holder" hidden>
          {children}
        </div>
      )}
      <SheetFrame
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        aside={
          onReset &&
          badge > 0 && (
            <Button variant="subtle" onClick={onReset}>
              {t('Reset')}
            </Button>
          )
        }
        foot={
          <Button
            variant="primary"
            size="lg"
            className="m-pf__apply"
            onClick={() => setOpen(false)}
          >
            {result ?? t('Done')}
          </Button>
        }
      >
        {open && children}
      </SheetFrame>
    </Ctx.Provider>
  );
}

/** A bottom sheet in the filter drawer's shape, for anything a phone reads in
    a drawer rather than a header (the replay's session details). */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <SheetFrame open={open} onClose={onClose} title={title}>
      {children}
    </SheetFrame>
  );
}

function SheetFrame({
  open,
  onClose,
  title,
  aside,
  foot,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  aside?: ReactNode;
  foot?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <D.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <D.Portal>
        <D.Overlay className="m-scrim m-pf__scrim" onClick={onClose} />
        {/* the sheet takes the focus, not its first control: a focused Close
            opened its tooltip the moment the sheet arrived */}
        <D.Content
          className="m-pf"
          aria-describedby={undefined}
          tabIndex={-1}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus?.();
          }}
        >
          <span className="m-pf__grip" aria-hidden="true" />
          <header className="m-pf__head">
            <D.Title className="m-pf__title">{title}</D.Title>
            <span className="m-pf__head-end">
              {aside}
              <D.Close asChild>
                <IconButton
                  icon={<X size={16} />}
                  label={t('Close')}
                  variant="ghost"
                />
              </D.Close>
            </span>
          </header>
          <div className="m-pf__body">{children}</div>
          {foot && <footer className="m-pf__foot">{foot}</footer>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
