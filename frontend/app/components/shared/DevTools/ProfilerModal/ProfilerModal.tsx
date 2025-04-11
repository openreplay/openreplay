import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  profile: any;
}
function ProfilerModal(props: Props) {
  const { t } = useTranslation();
  const {
    profile: { name, args, result },
  } = props;

  return (
    <div className="bg-white overflow-y-auto h-screen p-5">
      <h5 className="mb-2 text-2xl">{name}</h5>
      <h5 className="py-3">{t('Arguments')}</h5>
      <ul className="color-gray-medium">
        {args.split(',').map((arg: any) => (
          <li> {`${arg}`} </li>
        ))}
      </ul>
      <h5 className="py-3">{t('Result')}</h5>
      <div className="color-gray-medium">{`${result}`}</div>
    </div>
  );
}

export default ProfilerModal;
