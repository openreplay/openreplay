import cn from 'classnames';
import stl from './bottomBlock.css';

const BottomBlock = ({
  children,
  className,
  additionalHeight,
  ...props
}) => (
  <div className={ cn(stl.wrapper, "flex flex-col mb-2") } { ...props } >
    { children }
  </div>
);

BottomBlock.displayName = 'BottomBlock';

export default BottomBlock;
