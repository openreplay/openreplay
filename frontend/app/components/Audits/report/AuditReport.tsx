import { useCopy } from '@/lib/use-copy';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Loader } from '@/ui/feedback/Loader';
import { SearchField } from '@/ui/inputs/SearchField';
import { Segmented } from '@/ui/inputs/toggle-group';
import { Drawer } from '@/ui/overlays/drawer';
import { layerRoot } from '@/ui/overlays/layer-root';
import { PopoverPanel } from '@/ui/overlays/popover';
import { useToast } from '@/ui/overlays/toast';
import * as D from '@radix-ui/react-dialog';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ChevronRight as Fold,
  Link2,
  Presentation,
  TableOfContents,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { SectionIcon } from '../SectionIcon';
import { errorStatus } from '../api';
import { CHAPTERS, reportLink } from '../model';
import { useAuditReport } from '../queries';
import { ReportSlide } from './ReportSlide';
import { addTextLayer } from './pdfText';
import './report.css';
import { type Slide, buildDeck, chapterName, pad2 } from './slides';

const SLIDE_W = 1600;
const SLIDE_H = 900;

type Theme = 'light' | 'dark';

export interface AuditReportProps {
  auditId: string;
  /** the list row's name and scope line, while the report loads */
  title: string;
  scope: string;
  /** 0-based */
  initialSlide?: number;
  /** make the PDF as soon as the slides are drawn */
  exportOnOpen?: boolean;
  onExportStart?: () => void;
  onSlide?: (index: number) => void;
  onClose: () => void;
}

function AuditReport({
  auditId,
  title,
  scope,
  initialSlide = 0,
  exportOnOpen = false,
  onExportStart,
  onSlide,
  onClose,
}: AuditReportProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const report = useAuditReport(auditId);
  const deck = useMemo(
    () => (report.data ? buildDeck(report.data, title) : null),
    [report.data, title],
  );
  const slides = deck?.slides ?? [];
  const [index, setIndex] = useState(initialSlide);
  const [tocOpen, setTocOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  const [scale, setScale] = useState(0.5);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const exportBox = useRef<HTMLDivElement>(null);

  const last = Math.max(0, slides.length - 1);
  const at = Math.min(Math.max(0, index), last);
  const go = useCallback(
    (i: number) => setIndex(Math.min(Math.max(0, i), last)),
    [last],
  );

  useEffect(() => {
    if (slides.length) onSlide?.(at);
  }, [at, slides.length]);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(
        Math.max(
          0.1,
          Math.min((width - 48) / SLIDE_W, (height - 48) / SLIDE_H),
        ),
      );
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tocOpen || shareOpen || exportOpen || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, [contenteditable="true"]'))
        return;
      // Space presses a focused control
      if (e.key === ' ' && target?.closest?.('button, a, [role="button"]'))
        return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        go(at + 1);
      } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        go(at - 1);
      } else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(last);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, at, last, shareOpen, tocOpen, exportOpen]);

  const exportPdf = () => {
    if (printing || !slides.length) return;
    setExportOpen(false);
    toast.info(t('Making the PDF, {{n}} slides…', { n: slides.length }));
    setPrinting(true);
  };

  const wantsExport = useRef(exportOnOpen);
  useEffect(() => {
    if (wantsExport.current && slides.length) {
      wantsExport.current = false;
      onExportStart?.();
      exportPdf();
    }
  }, [slides.length]);

  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    (async () => {
      const [{ toJpeg, getFontEmbedCSS }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);
      await document.fonts.ready;
      await new Promise((r) => window.setTimeout(r, 120));
      const pages = Array.from(
        exportBox.current?.querySelectorAll<HTMLElement>('section.m-rep-s') ??
          [],
      );
      if (!pages.length || cancelled) return;
      const bg = getComputedStyle(pages[0]!).backgroundColor;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [SLIDE_W, SLIDE_H],
        hotfixes: ['px_scaling'],
        compress: true,
      });
      // computed SVG paint inlined: the rasteriser doesn't see stylesheet rules on SVG
      exportBox.current?.querySelectorAll<SVGElement>('svg *').forEach((el) => {
        const cs = getComputedStyle(el);
        for (const prop of [
          'fill',
          'stroke',
          'stroke-width',
          'vector-effect',
          'opacity',
          'fill-opacity',
          'stroke-opacity',
          'stroke-linecap',
          'stroke-linejoin',
          'display',
          'visibility',
        ]) {
          const v = cs.getPropertyValue(prop);
          if (v) el.style.setProperty(prop, v);
        }
        el.style.setProperty('animation', 'none');
      });
      const fontEmbedCSS = await getFontEmbedCSS(pages[0]!);
      for (let i = 0; i < pages.length; i++) {
        if (cancelled) return;
        const img = await toJpeg(pages[i]!, {
          width: SLIDE_W,
          height: SLIDE_H,
          pixelRatio: 1.5,
          backgroundColor: bg,
          quality: 0.92,
          fontEmbedCSS,
        });
        if (i > 0) pdf.addPage([SLIDE_W, SLIDE_H], 'landscape');
        pdf.addImage(img, 'JPEG', 0, 0, SLIDE_W, SLIDE_H, undefined, 'FAST');
        addTextLayer(pdf, pages[i]!);
      }
      const name = (title || deck?.meta.title || '')
        .replace(/[^\w\s,.-]+/g, '')
        .trim();
      pdf.save(`${name || 'Audit report'}.pdf`);
      toast.success(t('PDF downloaded'));
    })()
      .catch(() => toast.error(t('The PDF could not be made. Try again.')))
      .finally(() => !cancelled && setPrinting(false));
    return () => {
      cancelled = true;
    };
  }, [printing]);

  const slide = slides[at];
  const scheme = `m-scheme-${theme}`;

  const body = () => {
    if (report.isPending)
      return (
        <div className="m-rep__state">
          <Loader />
        </div>
      );
    if (report.isError) {
      const status = errorStatus(report.error);
      return (
        <div className="m-rep__state">
          <div className="m-rep__notice">
            <b>
              {status === 409
                ? t('The report isn’t ready yet')
                : status === 404
                  ? t('This audit no longer exists')
                  : t('The report could not be loaded')}
            </b>
            <span>
              {status === 409
                ? t('It opens here once the audit is ready.')
                : status === 404
                  ? t('It may have been deleted.')
                  : report.error.message}
            </span>
            {status !== 409 && status !== 404 && (
              <Button onClick={() => void report.refetch()}>
                {t('Retry')}
              </Button>
            )}
          </div>
        </div>
      );
    }
    if (!slide || !deck) return null;
    return (
      <div
        className="m-rep__rail"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <div className={scheme}>
          <ReportSlide
            slide={slide}
            index={at}
            slides={slides}
            meta={deck.meta}
            onGo={go}
          />
        </div>
      </div>
    );
  };

  // a modal dialog: focus moves in, stays in, and goes back to the list on close
  return (
    <D.Root open onOpenChange={(open) => !open && onClose()}>
      <D.Portal container={layerRoot()}>
        <D.Content
          ref={root}
          className="m-rep"
          tabIndex={-1}
          aria-describedby={undefined}
          // focus on the dialog itself: the first button's tooltip would open on focus
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            root.current?.focus();
          }}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <D.Title className="sr-only">
            {t('{{title}} report', { title })}
          </D.Title>
          <header className="m-rep__bar">
            <IconButton
              icon={<TableOfContents size={15} />}
              label={t('Show contents')}
              variant="ghost"
              disabled={!slides.length}
              onClick={() => setTocOpen(true)}
            />
            <Button variant="subtle" size="sm" onClick={onClose}>
              <ArrowLeft size={14} />
              {t('Audits')}
            </Button>
            <span className="m-rep__sep" aria-hidden="true" />
            <div className="m-rep__name">
              <b>{title}</b>
              <span>
                {deck?.meta.period
                  ? `${scope.split(' · ')[0]} · ${deck.meta.period}`
                  : scope}
              </span>
            </div>
            <div className="m-rep__verbs">
              <PopoverPanel
                open={shareOpen}
                onOpenChange={setShareOpen}
                placement="bottomRight"
                className="m-rep__share"
                content={
                  <SharePanel
                    auditId={auditId}
                    index={at}
                    slideName={slide?.short ?? ''}
                  />
                }
              >
                <Button
                  variant="subtle"
                  size="sm"
                  aria-expanded={shareOpen}
                  disabled={!slides.length}
                >
                  <Link2 size={14} />
                  {t('Share')}
                </Button>
              </PopoverPanel>
              <PopoverPanel
                open={exportOpen}
                onOpenChange={setExportOpen}
                placement="bottomRight"
                className="m-rep__share"
                content={
                  <ExportPanel
                    busy={printing}
                    theme={theme}
                    onTheme={setTheme}
                    onExport={exportPdf}
                  />
                }
              >
                <Button
                  variant="secondary"
                  size="sm"
                  aria-expanded={exportOpen}
                  disabled={printing || !slides.length}
                >
                  <Download size={14} />
                  {printing ? t('Making the PDF…') : t('Export PDF')}
                </Button>
              </PopoverPanel>
            </div>
          </header>

          <div className="m-rep__stage" ref={stage}>
            {body()}
          </div>

          {printing && deck && (
            <div
              className={`m-rep__export ${scheme}`}
              ref={exportBox}
              aria-hidden="true"
            >
              {slides.map((s, i) => (
                <ReportSlide
                  key={i}
                  slide={s}
                  index={i}
                  slides={slides}
                  meta={deck.meta}
                  onGo={go}
                />
              ))}
            </div>
          )}

          <footer className="m-rep__pager">
            <IconButton
              icon={<ChevronLeft size={15} />}
              label={t('Previous slide')}
              variant="ghost"
              disabled={at === 0 || !slides.length}
              onClick={() => go(at - 1)}
            />
            <span>
              {pad2(slides.length ? at + 1 : 0)}
              <span className="w">/</span>
              {pad2(slides.length)}
            </span>
            <IconButton
              icon={<ChevronRight size={15} />}
              label={t('Next slide')}
              variant="ghost"
              disabled={at >= last}
              onClick={() => go(at + 1)}
            />
          </footer>

          <ContentsDrawer
            open={tocOpen}
            onClose={() => setTocOpen(false)}
            slides={slides}
            current={at}
            onGo={(i) => {
              go(i);
              setTocOpen(false);
            }}
          />
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

function SharePanel({
  auditId,
  index,
  slideName,
}: {
  auditId: string;
  index: number;
  slideName: string;
}) {
  const { t } = useTranslation();
  const report = useCopy();
  const slide = useCopy();
  const rows = [
    {
      key: 'report',
      copier: report,
      title: t('Copy link to the report'),
      hint: t('Opens on the cover'),
      url: () => reportLink(auditId),
    },
    {
      key: 'slide',
      copier: slide,
      title: t('Copy link to this slide'),
      hint: `${pad2(index + 1)} · ${slideName}`,
      url: () => reportLink(auditId, index + 1),
    },
  ];
  return (
    <>
      <div className="m-rep__share-head">
        <b>{t('Share')}</b>
        <span>{t('Anyone on the project can open the link.')}</span>
      </div>
      {rows.map((r) => (
        <button
          key={r.key}
          type="button"
          className={`m-rep__share-row${r.copier.done ? ' is-done' : ''}`}
          onClick={() => void r.copier.copy(r.url())}
        >
          <span className="m-rep__share-ic">
            {r.key === 'report' ? (
              <Presentation size={15} />
            ) : (
              <Link2 size={15} />
            )}
          </span>
          <span>
            <b>{r.copier.done ? t('Link copied') : r.title}</b>
            <small>{r.hint}</small>
          </span>
          {r.copier.done ? <Check size={15} /> : <Copy size={15} />}
        </button>
      ))}
    </>
  );
}

function ExportPanel({
  busy,
  theme,
  onTheme,
  onExport,
}: {
  busy: boolean;
  theme: Theme;
  onTheme: (t: Theme) => void;
  onExport: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="m-rep-x">
      <div className="m-rep-x__head">
        <b>{t('Export PDF')}</b>
        <span>
          {t(
            'The theme changes the slides here and in the file. One slide a page, 16:9.',
          )}
        </span>
      </div>
      <div className="m-rep-x__row">
        <span className="m-rep-x__label">{t('Theme')}</span>
        <Segmented<Theme>
          value={theme}
          onChange={onTheme}
          ariaLabel={t('Theme')}
          options={[
            { value: 'light', label: t('Light') },
            { value: 'dark', label: t('Dark') },
          ]}
        />
      </div>
      <Button variant="primary" disabled={busy} onClick={onExport}>
        <Download size={14} />
        {t('Export PDF')}
      </Button>
    </div>
  );
}

function ContentsDrawer({
  open,
  onClose,
  slides,
  current,
  onGo,
}: {
  open: boolean;
  onClose: () => void;
  slides: Slide[];
  current: number;
  onGo: (i: number) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [shut, setShut] = useState<Set<string>>(() => new Set());
  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const keys: Slide['section'][] = [
      'intro',
      ...CHAPTERS.map((c) => c.key),
      'notes',
    ];
    return keys
      .map((key) => ({
        key,
        ...chapterName(key, slides),
        pages: slides
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => s.section === key)
          .filter(
            ({ s }) =>
              !q ||
              `${s.short} ${s.title} ${chapterName(key, slides).name}`
                .toLowerCase()
                .includes(q),
          ),
      }))
      .filter((g) => g.pages.length > 0);
  }, [slides, q]);
  const toggle = (key: string) =>
    setShut((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      label={t('Contents')}
      side="left"
      className="m-rep__toc-sheet"
      header={
        <>
          <IconButton
            icon={<X size={15} />}
            label={t('Hide contents')}
            variant="ghost"
            onClick={onClose}
          />
          <SearchField
            placeholder={t('Search pages')}
            value={query}
            onChange={setQuery}
          />
        </>
      }
    >
      <nav className="m-rep__toc" aria-label={t('Report contents')}>
        {groups.length === 0 && (
          <p className="m-rep__toc-none">{t('No pages match.')}</p>
        )}
        {groups.map((g) => {
          const expanded = q !== '' || !shut.has(g.key);
          const chapter = g.key !== 'intro' && g.key !== 'notes' ? g.key : null;
          return (
            <div key={g.key} className="m-rep__toc-sec">
              <button
                type="button"
                className="m-rep__toc-head"
                aria-expanded={expanded}
                onClick={() => toggle(g.key)}
              >
                <Fold size={14} />
                {chapter ? (
                  <SectionIcon section={chapter} className="m-rep__toc-ic" />
                ) : (
                  <span className="m-rep__toc-ic" />
                )}
                <span>{g.name}</span>
              </button>
              {expanded && (
                <div className="m-rep__toc-pages">
                  {g.pages.map(({ s, i }) => (
                    <button
                      key={i}
                      type="button"
                      className={`m-rep__toc-page${i === current ? ' is-on' : ''}`}
                      aria-current={i === current ? 'page' : undefined}
                      onClick={() => onGo(i)}
                    >
                      <span>{s.short}</span>
                      <span className="p">{pad2(i + 1)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </Drawer>
  );
}

export default AuditReport;
