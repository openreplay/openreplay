import Record from 'Types/Record';

const TargetCustom = Record({
  targetId: '',
  label: '',
  path: null,
  isCustom: true,
  location: '',
}, {
  fromJS: (target) => ({ 
    ...target,
    label: target.label || target.targetLabel,
    path: target.path || target.targetSelector,
  }),
  idKey: 'targetId',
});

export default TargetCustom;