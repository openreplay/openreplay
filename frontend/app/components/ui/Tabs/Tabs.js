import cn from 'classnames';
import stl from './tabs.css';

const Tabs = ({ tabs, active, onClick, border = true, className }) => (
  <div className={  cn(stl.tabs, className, { [ stl.bordered ]: border }) } role="tablist" >
    { tabs.map(({ key, text, hidden = false, disabled = false }) => (
      <div
        key={ key }
        className={ cn(stl.tab, { [ stl.active ]: active === key, [ stl.disabled ]: disabled }) }
        data-hidden={ hidden }
        onClick={ onClick && (() => onClick(key)) }
        role="tab"
        data-openreplay-label={text}
      >
        { text }
      </div>
    ))}
  </div>
);

Tabs.displayName = 'Tabs';

export default Tabs;