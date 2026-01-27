type Field = {
  value: string;
  readonly: boolean;
};

export const FieldNames = (field: string, type: 'user' | 'event' | 'distinct_event') => {
  switch (field) {
    case 'displayName':
      return 'Display Name';
    case 'description':
      return 'Description';
    case 'volume':
      if (type === 'distinct_event') {
        return '30-Day Volume';
      }
      return type === 'user'
        ? '# Users with property'
        : '# Events with property';
    case 'type':
      return 'Type';
    default:
      return field;
  }
};

export interface CommonEntry {
  name: string;
  fields: Record<string, Field>;
}

export interface CommonProp extends CommonEntry {
  status: string;
  fields: {
    displayName: Field;
    description: Field;
    volume: Field;
    type: Field;
  };
}
