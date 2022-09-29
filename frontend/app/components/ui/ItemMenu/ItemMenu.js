import React from 'react';
import { Icon } from 'UI';
import styles from './itemMenu.module.css';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import cn from 'classnames';

export default class ItemMenu extends React.PureComponent {
    state = {
        displayed: false,
    };

    handleEsc = (e) => e.key === 'Escape' && this.closeMenu();

    componentDidMount() {
        document.addEventListener('keydown', this.handleEsc, false);
    }
    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleEsc, false);
    }

    onClick = (callback) => (e) => {
        e.stopPropagation();
        callback(e);
    };

    toggleMenu = (e) => {
        this.setState({ displayed: !this.state.displayed });
    };

    closeMenu = () => this.setState({ displayed: false });

    render() {
        const { items, label = '', bold } = this.props;
        const { displayed } = this.state;
        const parentStyles = label ? 'rounded px-2 py-2 hover:bg-gray-light' : '';

        return (
            <div className={styles.wrapper}>
                <OutsideClickDetectingDiv onClickOutside={this.closeMenu}>
                    <div
                        onClick={this.toggleMenu}
                        className={cn('flex items-center cursor-pointer select-none', parentStyles, { 'bg-gray-light': displayed && label })}
                    >
                        {label && <span className={cn('mr-1', bold ? 'font-medium color-gray-darkest' : 'color-gray-medium')}>{label}</span>}
                        <div
                            ref={(ref) => {
                                this.menuBtnRef = ref;
                            }}
                            className={cn('rounded-full flex items-center justify-center', { 'bg-gray-light': displayed, 'w-10 h-10': !label })}
                            role="button"
                        >
                            <Icon name="ellipsis-v" size="16" />
                        </div>
                    </div>
                </OutsideClickDetectingDiv>
                <div className={cn(styles.menu, { [styles.menuDim]: !bold })} data-displayed={displayed}>
                    {items
                        .filter(({ hidden }) => !hidden)
                        .map(({ onClick, text, icon, disabled = false }) => (
                            <div
                                key={text}
                                onClick={!disabled ? this.onClick(onClick) : () => {}}
                                className={disabled ? 'cursor-not-allowed' : ''}
                                role="menuitem"
                            >
                                <div className={cn(styles.menuItem, 'text-neutral-700', { disabled: disabled })}>
                                    {icon && (
                                        <div className={styles.iconWrapper}>
                                            <Icon name={icon} size="13" color="gray-dark" />
                                        </div>
                                    )}
                                    <div>{text}</div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        );
    }
}
