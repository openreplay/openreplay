import cn from "classnames";
import { Icon, Popup } from 'UI';

export default function QuestionMarkHint({ onHover = false, content, className, ...props }) {
	return (
		<Popup
      on={ onHover ? 'hover' : 'click'}
      content={ content }
      inverted      
      trigger={ 
        <Icon name="question-circle"  size="18" className={ cn("cursor-pointer", className) }/>
      }
      { ...props }
    />
	);
}