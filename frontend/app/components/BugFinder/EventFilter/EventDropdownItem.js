import { TYPES } from 'Types/filter/event';
import cn from 'classnames';
import { Icon } from 'UI';
import cls from './eventDropdownItem.css';


const getText = (event) => {
  if (event.type === TYPES.METADATA) {
    return `${ event.key }: ${ event.value }`;
  }
  if (event.target) {
    return event.target.label || event.value;
  }
  return event.value; // both should be?
};

export default function EventDropdownItem({ event }) {
  return (
    <div className={ cn("flex items-center", cls.eventDropdownItem) }>
      <Icon name={ event.icon } size="14" marginRight="10" />
      <div 
        className={ cn(cls.values,{
          [ cls.inputType ]: event.type === TYPES.INPUT,
          [ cls.clickType ]: event.type === TYPES.CLICK,
          [ cls.consoleType ]: event.type === TYPES.CONSOLE,
        })} 
      >
        { getText(event) }
      </div>
    </div>
  );
}
