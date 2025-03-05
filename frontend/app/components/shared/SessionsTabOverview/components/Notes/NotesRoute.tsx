import React from 'react';
import NotesList from './NoteList';
import NoteTags from './NoteTags';
import { useTranslation } from 'react-i18next';

function NotesRoute() {
  const { t } = useTranslation();

  return (
    <div className="mb-5 w-full mx-auto" style={{ maxWidth: '1360px' }}>
      <div className="widget-wrapper">
        <div className="flex items-center px-4 py-2 justify-between w-full border-b">
          <div className="flex items-center justify-end w-full">
            <h2 className="text-2xl capitalize mr-4">{t('Notes')}</h2>
            <NoteTags />
          </div>
        </div>
        <NotesList />
      </div>
    </div>
  );
}

export default NotesRoute;
