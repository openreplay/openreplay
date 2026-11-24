import { pluginDoc } from '../../PluginDoc';

export default pluginDoc({
  title: 'NgRx',
  icon: 'integrations/ngrx',
  docs: 'https://docs.openreplay.com/plugins/ngrx',
  pkg: '@openreplay/tracker-ngrx',
  blurb: (t) =>
    t('NgRx actions and the state they produce, to read back inside a replay.'),
  hint: (t) =>
    t(
      'Add the generated meta-reducer into your imports. See NgRx documentation for more details.',
    ),
  usage: (projectKey) => `import { StoreModule } from '@ngrx/store';
import { reducers } from './reducers';
import { tracker } from '@openreplay/tracker';
import trackerNgRx from '@openreplay/tracker-ngrx';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
tracker.start()
//...
const metaReducers = [tracker.use(trackerNgRx(<options>))]; // check list of available options below
//...
@NgModule({
  imports: [StoreModule.forRoot(reducers, { metaReducers })]
})
export class AppModule {}`,
  usageCjs: (projectKey) => `import { StoreModule } from '@ngrx/store';
import { reducers } from './reducers';
import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope
import trackerNgRx from '@openreplay/tracker-ngrx/cjs';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
//...
function SomeFunctionalComponent() {
  useEffect(() => { // or componentDidMount in case of Class approach
    tracker.start()
  }, [])
//...
const metaReducers = [tracker.use(trackerNgRx(<options>))]; // check list of available options below
//...
  @NgModule({
    imports: [StoreModule.forRoot(reducers, { metaReducers })]
  })
  export class AppModule {}
}`,
});
