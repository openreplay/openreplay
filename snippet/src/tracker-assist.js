import trackerAssist from '@openreplay/tracker-assist';
import initTracker from './init'


const openReplay = initTracker();
openReplay.use(trackerAssist());
