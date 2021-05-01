import cn from 'classnames';
import stl from './content.css';

const Content = ({
  children,
  className,
  ...props
}) => (
  <div className={ cn(className, stl.content) } { ...props } >
    { children }
  </div>
);

Content.displayName = 'Content';

export default Content;
