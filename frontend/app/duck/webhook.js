import Webhook from 'Types/webhook';
import crudDuckGenerator from './tools/crudDuck';

const crudDuck = crudDuckGenerator('webhook', Webhook, { idKey: 'webhookId' });
export const { fetchList, init, edit, save, remove } = crudDuck.actions;

export default crudDuck.reducer;
