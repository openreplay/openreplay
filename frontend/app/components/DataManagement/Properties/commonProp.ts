type Field = {
  value: string;
  readonly: boolean;
};

export const FieldNames = (field: string, type: 'user' | 'event') => {
  switch (field) {
    case 'displayName':
      return 'Display Name';
    case 'description':
      return 'Description';
    case 'volume':
      return type === 'user'
        ? '# Users with property'
        : '# Events with property';
    case 'type':
      return 'Type';
    default:
      return field;
  }
};

export interface CommonProp {
  id: string;
  name: string;
  fields: {
    displayName: Field;
    description: Field;
    volume: Field;
    type: Field;
  };
}
