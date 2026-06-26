import { Avatar } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { CAT_AVATAR_COLOR, CAT_ICON, type CategoryName } from './model';

/* Category as the teal circle + icon used on the Cards list: an antd Avatar
   with the tealx-lightest fill and a tealx icon. */
export default function CategoryLabel({ cat }: { cat: CategoryName }) {
  const { t } = useTranslation();
  const Ic = CAT_ICON[cat];
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar
        size="default"
        className="bg-tealx-lightest"
        icon={
          <Ic size={16} strokeWidth={2} style={{ color: CAT_AVATAR_COLOR }} />
        }
      />
      <span className="text-sm color-gray-darkest">{t(cat)}</span>
    </span>
  );
}
