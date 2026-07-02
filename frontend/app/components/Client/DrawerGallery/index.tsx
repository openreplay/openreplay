import { Button, Drawer } from 'antd';
import { AlertTriangle, FolderPlus, Headphones } from 'lucide-react';
import React, { useState } from 'react';

import MockAssistStats from './MockAssistStats';
import MockErrorDetails from './MockErrorDetails';
import MockNewSiteForm from './MockNewSiteForm';

/** Reference gallery: static visual replicas of three existing OpenReplay drawers,
 *  so we can decide what to reuse for the Test Agents drawer without a live backend.
 *  No interaction inside the drawers — they're visual references only. */

type Key = 'site' | 'error' | 'assist' | null;

const ITEMS: {
  key: Exclude<Key, null>;
  title: string;
  width: number;
  icon: React.ReactNode;
  where: string;
}[] = [
  {
    key: 'site',
    title: 'New Project',
    width: 350,
    icon: <FolderPlus size={18} />,
    where: 'Preferences → Projects → Add Project. A compact create/edit form drawer.',
  },
  {
    key: 'error',
    title: 'Error Details',
    width: 1200,
    icon: <AlertTriangle size={18} />,
    where:
      'Session replay → DevTools → Console → click an error. The most-reused detail drawer (main + side sections).',
  },
  {
    key: 'assist',
    title: 'Co-browsing Reports',
    width: 960,
    icon: <Headphones size={18} />,
    where:
      'Co-Browse page → "Co-browsing Reports" (Enterprise + admin only). Stat cards + tables.',
  },
];

function DrawerGallery() {
  const [open, setOpen] = useState<Key>(null);
  const active = ITEMS.find((i) => i.key === open);

  return (
    <div className="bg-white rounded border p-6">
      <h2 className="text-2xl mb-1">Drawer Reference Gallery</h2>
      <p className="color-gray-medium mb-6 max-w-2xl">
        Static visual replicas of three existing OpenReplay drawers. These run on no
        backend so you can see the layouts here in the prototype. Reference only — the
        controls inside don't do anything.
      </p>

      <div className="flex flex-col gap-3 max-w-2xl">
        {ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-4 border rounded p-4 hover:bg-gray-lightest transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-tealx-lightest flex items-center justify-center text-tealx shrink-0">
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                {item.title}
                <span className="text-xs color-gray-medium font-normal">
                  {item.width}px
                </span>
              </div>
              <div className="text-sm color-gray-medium">{item.where}</div>
            </div>
            <Button type="primary" onClick={() => setOpen(item.key)}>
              Open
            </Button>
          </div>
        ))}
      </div>

      <Drawer
        open={open != null}
        placement="right"
        width={active?.width ?? 428}
        onClose={() => setOpen(null)}
        title={active?.title}
        styles={{ body: { padding: 0 } }}
      >
        {open === 'site' && <MockNewSiteForm />}
        {open === 'error' && <MockErrorDetails />}
        {open === 'assist' && <MockAssistStats />}
      </Drawer>
    </div>
  );
}

export default DrawerGallery;
