import { Icon } from 'UI';

export default function CloseButton({ size, onClick, className = '', style }){
	return (
	  <button onClick={ onClick } className={ `${ className } cursor-pointer` } style={ style } >
	    <Icon name="close" size={ size } color="gray-medium"/>
	  </button>
	);
}
