import React from 'react';
import { Checkbox, Modal, Input } from 'antd';
import { useTranslation } from 'react-i18next';

function EditHlModal({
  open,
  onSave,
  onCancel,
  text,
  visible,
}: {
  open: boolean;
  onSave: (noteText: string, visible: boolean) => any;
  onCancel: () => any;
  text: string;
  visible: boolean;
}) {
  const { t } = useTranslation();
  const [noteText, setNoteText] = React.useState(text);
  const [checkboxVisible, setVisible] = React.useState(visible);

  React.useEffect(() => {
    setNoteText(text);
    setVisible(visible);
  }, [text, visible]);

  const onEdit = (val: string) => {
    if (val.length > 200) {
      return;
    }
    setNoteText(val);
  };
  if (!open) return null;

  return (
    <Modal
      title={t('Edit Highlight')}
      open={open}
      okText="Save"
      width={350}
      centered
      onOk={() => onSave(noteText, visible)}
      onCancel={() => onCancel()}
    >
      <div className="flex flex-col gap-2">
        <Input.TextArea
          placeholder={t('Highlight note')}
          onChange={(e) => onEdit(e.target.value)}
          maxLength={200}
          value={noteText}
        />
        <div>
          {noteText.length}
          {t('/200 Characters remaining')}
        </div>
        <Checkbox
          checked={checkboxVisible}
          onChange={(e) => setVisible(e.target.checked)}
        >
          {t('Team can see and edit this Highlight.')}
        </Checkbox>
      </div>
    </Modal>
  );
}

export default EditHlModal;
