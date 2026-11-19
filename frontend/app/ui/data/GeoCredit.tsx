import { Tooltip } from '@/ui/overlays/tooltip';
import { Info } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import './geo-credit.css';

export const DBIP_URL = 'https://db-ip.com';
export const DBIP_LABEL = 'IP Geolocation by DB-IP';

/** DB-IP's licence asks for this link wherever an IP-derived location shows. */
export function GeoCredit() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Tooltip
      open={open}
      onOpenChange={setOpen}
      title={
        <a
          className="m-geocredit__link"
          href={DBIP_URL}
          target="_blank"
          rel="noreferrer"
        >
          {DBIP_LABEL}
        </a>
      }
    >
      <span
        className="m-geocredit"
        role="button"
        tabIndex={0}
        aria-label={`${t('Location from the IP address.')} ${DBIP_LABEL}`}
        // a touch has no hover: a tap opens it (preventDefault skips Radix's close-on-click)
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Info size={12} aria-hidden="true" />
      </span>
    </Tooltip>
  );
}

/** For a popover holding a credit: focus the panel on open, not the credit,
 *  whose tooltip would otherwise pop up with it. */
export function focusPanelOnOpen(e: Event) {
  e.preventDefault();
  (e.currentTarget as HTMLElement | null)?.focus();
}

export function GeoPlace({ children }: { children: ReactNode }) {
  return (
    <span className="m-geocredit__place">
      <span className="m-truncate">{children}</span>
      <GeoCredit />
    </span>
  );
}
