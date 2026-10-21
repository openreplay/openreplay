import { CopyButton } from '@/ui/actions/CopyButton';
import { IconButton } from '@/ui/actions/IconButton';
import { Timed } from 'Player';
import { ArrowDown, ArrowUp, ChevronLeft, X } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { durationFromMs } from 'App/date';
import { filterList } from 'App/utils';

import { Keyword, NoData } from '../PanelKit';
import './ws-panel.css';

type SocketMsg = Timed & {
  channelName: string;
  data: string;
  timestamp: number;
  dir: 'up' | 'down';
  messageType: string;
};

interface Props {
  socketMsgList: Array<SocketMsg>;
  onClose: () => void;
}

/** One WebSocket channel's frames, as a sheet over the network list; a frame opens its payload. */
function WSPanel({ socketMsgList, onClose }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<number | null>(null);
  const list = React.useMemo(
    () =>
      query
        ? filterList(socketMsgList, query, ['data', 'messageType'])
        : socketMsgList,
    [socketMsgList, query],
  );
  const msg = selected != null ? list[selected] : null;

  return (
    <div className="m-dt__sheet m-ws">
      <div className="m-dt__sheet-head">
        {msg ? (
          <>
            <IconButton
              icon={<ChevronLeft size={14} />}
              label={t('Back to frames')}
              variant="ghost"
              onClick={() => setSelected(null)}
            />
            <span className="m-dt__sheet-url m-truncate">
              {msg.messageType}
            </span>
            <CopyButton
              text={JSON.stringify(msg, null, 2)}
              label={t('Copy frame')}
              variant="ghost"
            />
          </>
        ) : (
          <>
            <span className="m-dt__sheet-url m-mono m-truncate">
              {socketMsgList[0]?.channelName}
            </span>
            <Keyword
              value={query}
              onChange={(v) => {
                setQuery(v);
                setSelected(null);
              }}
              placeholder={t('Filter frames')}
            />
          </>
        )}
        <IconButton
          icon={<X size={14} />}
          label={t('Close')}
          variant="ghost"
          onClick={onClose}
        />
      </div>
      <div className="m-dt__sheet-body">
        {msg ? (
          <pre className="m-ws__payload m-mono">{msg.data}</pre>
        ) : list.length === 0 ? (
          <NoData hint={t('No frame matches that.')} />
        ) : (
          <>
            <div className="m-ws__row m-ws__head">
              <span />
              <span>{t('Data')}</span>
              <span className="is-num">{t('Length')}</span>
              <span className="is-num">{t('Time')}</span>
            </div>
            {list.map((m, i) => (
              <button
                type="button"
                key={`${m.timestamp}_${i}`}
                className="m-ws__row"
                onClick={() => setSelected(i)}
              >
                {m.dir === 'up' ? (
                  <ArrowUp
                    size={12}
                    className="text-content-warning"
                    aria-label={t('Sent')}
                  />
                ) : (
                  <ArrowDown
                    size={12}
                    className="text-content-accent"
                    aria-label={t('Received')}
                  />
                )}
                <span className="m-ws__data">
                  {m.messageType && (
                    <span className="m-ws__type">{m.messageType}</span>
                  )}
                  <span className="m-mono m-truncate">{m.data}</span>
                </span>
                <span className="is-num">{m.data.length}</span>
                <span className="is-num">{durationFromMs(m.time, true)}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default WSPanel;
