import { Record, List, Set, isImmutable } from 'immutable';
import { TYPES as EVENT_TYPES } from 'Types/session/event';

export const CUSTOM = 'custom';
export const CLICK = 'click';
export const INPUT = 'input';
export const NAVIGATE = 'navigate';
export const TEST = 'test';

export const TYPES = {
  CLICK,
  INPUT,
  CUSTOM,
  NAVIGATE,
  TEST,
};


const Step = defaultValues => class extends Record({
  key: undefined,
  name: '',
  imported: false,
  isDisabled: false,
  importTestId: undefined,
  ...defaultValues,
}) {
  hasTarget() {
    return this.type === CLICK || this.type === INPUT;
  }

  isTest() {
    return this.type === TEST;
  }

  getEventType() {
    switch (this.type) {
      case INPUT:
        return EVENT_TYPES.INPUT;
      case CLICK:
        return EVENT_TYPES.CLICK;
      case NAVIGATE:
        return EVENT_TYPES.LOCATION;
      default:
        return null;
    }
  }

  validate() {
    const selectorsOK = this.selectors && this.selectors.size > 0;
    const valueOK = this.value && this.value.trim().length > 0;
    switch (this.type) {
      case INPUT:
        return selectorsOK;
      case CLICK:
        return selectorsOK;
      case NAVIGATE:
        return valueOK;
      case CUSTOM:
        // if (this.name.length === 0) return false;
        /* if (window.JSHINT) {
          window.JSHINT(this.code, { esversion: 6 });
          const noErrors = window.JSHINT.errors.every(({ code }) => code && code.startsWith('W'));
          return noErrors;
        } */
        return this.code && this.code.length > 0;
      default:
        return true;
    }
  }

  toData() {
    const {
      value,
      ...step
    } = this.toJS();
    delete step.key;
    return {
      values: value && [ value ],
      ...step,
    };
  }
};

const Custom = Step({
  type: CUSTOM,
  code: '',
  framework: 'any',
  template: '',
});

const Click = Step({
  type: CLICK,
  selectors: List(),
  customSelector: true,
});

const Input = Step({
  type: INPUT,
  selectors: List(),
  value: '',
  customSelector: true,
});

const Navigate = Step({
  type: NAVIGATE,
  value: '',
});

const TestAsStep = Step({
  type: TEST,
  testId: '',
  name: '',
  stepsCount: '',
  steps: List(),
});

const EmptyStep = Step();

let uniqueKey = 0xff;
function nextKey() {
  uniqueKey += 1;
  return `${ uniqueKey }`;
}

function fromJS(initStep = {}) {
  // TODO: more clear
  if (initStep.importTestId) return new TestAsStep(initStep).set('steps', List(initStep.steps ? initStep.steps : initStep.test.steps).map(fromJS));
  // todo: ?
  if (isImmutable(initStep)) return initStep.set('key', nextKey());

  const values = initStep.values && initStep.values.length > 0 && initStep.values[ 0 ];

  // bad code
  const step = {
    ...initStep,
    selectors: Set(initStep.selectors).toList(), // to List not nrcrssary. TODO: check
    value: initStep.value ? [initStep.value] : values,
    key: nextKey(),
    isDisabled: initStep.disabled
  };
  // bad code

  if (step.type === CUSTOM) return new Custom(step);
  if (step.type === CLICK) return new Click(step);
  if (step.type === INPUT) return new Input(step);
  if (step.type === NAVIGATE) return new Navigate(step);

  return new EmptyStep();
  // throw new Error(`Unknown step type: ${step.type}`);
}

export default fromJS;
