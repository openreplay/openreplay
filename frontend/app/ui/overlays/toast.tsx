import { cn } from '@/lib/utils';
import * as T from '@radix-ui/react-toast';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

type Kind = 'success' | 'info' | 'error' | 'warning';

export interface ToastApi {
  success: (text: ReactNode) => void;
  info: (text: ReactNode) => void;
  error: (text: ReactNode) => void;
}

interface ToastOptions {
  /** ms; `false` keeps it until dismissed */
  autoClose?: number | false;
  /** a second toast with the same id replaces the first */
  toastId?: string;
  type?: Kind | 'warn';
  [x: string]: unknown;
}

interface Item {
  id: number;
  key?: string;
  kind: Kind;
  text: ReactNode;
  duration: number;
}

const Ctx = createContext<ToastApi | null>(null);

const ICON: Record<Kind, { Icon: typeof Info; className: string }> = {
  success: { Icon: CheckCircle2, className: 'text-content-success' },
  info: { Icon: Info, className: 'text-content-accent' },
  error: { Icon: XCircle, className: 'text-content-danger' },
  warning: { Icon: AlertTriangle, className: 'text-content-warning' },
};

const STAY_MS = 3000;

let counter = 0;

/* Module-level bridge so stores and other non-React code can raise toasts. Calls made
   before the provider mounts are queued and replayed; ids are handed out here so a
   queued toast can still be dismissed (e.g. a pending toast.promise that settles first). */
type Push = (
  id: number,
  kind: Kind,
  text: ReactNode,
  opts?: ToastOptions,
) => void;
let bridge: { push: Push; remove: (id?: number) => void } | null = null;
let queued: Parameters<Push>[] = [];

const emit = (kind: Kind, text: ReactNode, opts?: ToastOptions) => {
  counter += 1;
  const id = counter;
  if (bridge) bridge.push(id, kind, text, opts);
  else queued.push([id, kind, text, opts]);
  return id;
};

const dismiss = (id?: number) => {
  queued = id == null ? [] : queued.filter(([q]) => q !== id);
  bridge?.remove(id);
};

const kindOf = (type?: ToastOptions['type']): Kind =>
  type === 'warn' ? 'warning' : (type ?? 'info');

/** Imperative toasts, react-toastify-shaped, for code outside components. */
export const toast = Object.assign(
  (text: ReactNode, opts?: ToastOptions) =>
    emit(kindOf(opts?.type), text, opts),
  {
    success: (text: ReactNode, opts?: ToastOptions) =>
      emit('success', text, opts),
    info: (text: ReactNode, opts?: ToastOptions) => emit('info', text, opts),
    error: (text: ReactNode, opts?: ToastOptions) => emit('error', text, opts),
    warn: (text: ReactNode, opts?: ToastOptions) => emit('warning', text, opts),
    warning: (text: ReactNode, opts?: ToastOptions) =>
      emit('warning', text, opts),
    dismiss,
    promise: <R,>(
      p: Promise<R>,
      msgs: { pending?: ReactNode; success?: ReactNode; error?: ReactNode },
    ): Promise<R> => {
      const id = msgs.pending
        ? emit('info', msgs.pending, { autoClose: false })
        : null;
      p.then(
        () => {
          if (id != null) dismiss(id);
          if (msgs.success) emit('success', msgs.success);
        },
        () => {
          if (id != null) dismiss(id);
          if (msgs.error) emit('error', msgs.error);
        },
      );
      return p;
    },
  },
);

const API: ToastApi = {
  success: (t) => emit('success', t),
  info: (t) => emit('info', t),
  error: (t) => emit('error', t),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);

  const push = useCallback<Push>((id, kind, text, opts) => {
    const item: Item = {
      id,
      key: opts?.toastId,
      kind,
      text,
      duration:
        opts?.autoClose === false
          ? Infinity
          : typeof opts?.autoClose === 'number'
            ? opts.autoClose
            : STAY_MS,
    };
    setItems((cur) => [
      ...cur.filter((i) => !item.key || i.key !== item.key),
      item,
    ]);
  }, []);
  const remove = useCallback(
    (id?: number) =>
      setItems((cur) => (id == null ? [] : cur.filter((i) => i.id !== id))),
    [],
  );

  useEffect(() => {
    bridge = { push, remove };
    const pending = queued;
    queued = [];
    pending.forEach((args) => push(...args));
    return () => {
      bridge = null;
    };
  }, [push, remove]);

  return (
    <T.Provider swipeDirection="up" duration={STAY_MS}>
      <Ctx.Provider value={API}>{children}</Ctx.Provider>
      {items.map((it) => {
        const { Icon, className } = ICON[it.kind];
        return (
          <T.Root
            key={it.id}
            data-slot="toast"
            data-kind={it.kind}
            duration={it.duration}
            onOpenChange={(o) => !o && remove(it.id)}
            className={cn(
              'm-toast pointer-events-auto flex min-h-[var(--m-control-height-md)] items-center gap-4 rounded-control py-2',
              'border border-border-subtle bg-surface-raised px-5 text-sm text-content-primary m-elevated',
            )}
          >
            <Icon
              size={14}
              className={cn('shrink-0', className)}
              aria-hidden="true"
            />
            <T.Description>{it.text}</T.Description>
          </T.Root>
        );
      })}
      <T.Viewport
        className={cn(
          'fixed left-1/2 top-5 z-[var(--m-z-toast)] flex w-max max-w-[calc(100vw-2rem)]',
          '-translate-x-1/2 flex-col items-center gap-3 outline-none',
        )}
      />
    </T.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used inside <ToastProvider>');
  return v;
}
