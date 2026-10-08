// Compat for the saas overlay, which still imports these from 'UI'. FOSS code imports the kit
// directly (@/ui/<group>/<file>); delete this folder once saas migrates (REDESIGN.md → SaaS repo handoff).
export { default as Form } from './Form';
export { default as Input } from './Input';
export { default as Message } from './Message';
export { default as Tooltip } from './Tooltip';
export { Icon } from '@/ui/icons/Icon';
export { Loader } from '@/ui/feedback/Loader';
export { NoContent } from '@/ui/feedback/NoContent';
export { confirm } from '@/ui/overlays/confirm';
export { default as Link } from 'Shared/Link/Link';
