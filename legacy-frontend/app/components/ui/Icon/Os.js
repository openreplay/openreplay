import { osIcon } from 'App/iconNames';
import { Icon } from 'UI';

const OsIcon = ({ os, size="20", ...props }) => (
	<Icon name={ osIcon(os) } size={ size } { ...props } />
);

OsIcon.displayName = "OsIcon";

export default OsIcon;