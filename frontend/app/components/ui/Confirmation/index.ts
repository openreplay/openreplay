import {
  createConfirmationCreater,
  createReactTreeMounter,
  createMountPoint,
} from 'react-confirm';
import Confirmation from './Confirmation';

const mounter = createReactTreeMounter();
const createConfirmation = createConfirmationCreater(mounter);

export const MountPoint = createMountPoint(mounter);
export default createConfirmation(Confirmation);
