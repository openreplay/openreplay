import { type ReactNode, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
  type MenuItem,
} from './dropdown-menu';

/** A right-click menu: the kit dropdown, anchored where the pointer was. */
export function ContextMenu({
  items,
  children,
}: {
  items: readonly MenuItem[];
  children: ReactNode;
}) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  return (
    <>
      <div
        className="contents"
        onContextMenu={(e) => {
          e.preventDefault();
          setAt({ x: e.clientX, y: e.clientY });
        }}
      >
        {children}
      </div>
      <DropdownMenu
        open={at != null}
        onOpenChange={(open) => !open && setAt(null)}
        modal={false}
      >
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: at?.x ?? 0,
              top: at?.y ?? 0,
              width: 0,
              height: 0,
            }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={2}>
          <DropdownMenuItems items={items} />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
