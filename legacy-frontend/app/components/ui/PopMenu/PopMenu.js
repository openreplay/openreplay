import React, { useState } from 'react';
import cn from 'classnames';
import { Icon, Tooltip } from 'UI';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import cls from './popMenu.module.css';

export default React.memo(function PopMenu({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <OutsideClickDetectingDiv className={cls.wrapper} onClickOutside={() => setOpen(false)}>
      {open && (
        <div className={cls.menuItems}>
          {items.map((item) => (
            <button
              key={item.label}
              onClick={(e) => {
                item.onClick(e);
                setOpen(false);
              }}
              className={cn(
                'flex items-center justify-end color-green bg-white uppercase overflow-hidden',
                cls.menuItemButton
              )}
            >
              <div className={cls.buttonLabel}>{item.label}</div>
              <Icon name={item.icon} size="18" className={cls.icon} color="teal" />
            </button>
          ))}
        </div>
      )}
      <Tooltip title="Add Step">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn('bg-teal flex items-center justify-center', cls.addStepButton, {
            [cls.openMenuBtn]: open,
          })}
        >
          <Icon name="plus" size="18" className={cls.plusIcon} color="white" />
        </button>
      </Tooltip>
    </OutsideClickDetectingDiv>
  );
});
