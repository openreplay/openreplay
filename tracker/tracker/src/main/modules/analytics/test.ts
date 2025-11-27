import Batcher from "./batcher.ts";
import People from "./people.ts";
import Events from "./events.ts";
import ConstantProperties from "./constantProperties.ts";

class MockStorage {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] || null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }

  removeItem(key: string): void {
    delete this.store[key]
  }
}

const constantProperties = new ConstantProperties(new MockStorage(), new MockStorage())
const batcher = new Batcher('http://localhost:3000', () => "test_token_123", async () => {})
const people = new People(
  constantProperties,
  () => Date.now(),
  () => {},
  batcher
)
const events = new Events(
  constantProperties,
  () => Date.now(),
  batcher
)

people.identify('user_123')
people.setProperties({ age: 30, country: 'USA' })
people.increment('age', 1)
people.setPropertiesOnce({ signup_date: '2024-01-01', country: 'FRANCE' })
// ignoring append for now
people.deleteUser()
people.identify('user_123_with_events')
events.sendEvent('test')
events.sendEvent('page_view', { url: '/home' })
events.setProperty('app_version', '1.0.0')
events.setPropertiesOnce({ platform: 'web', os: 'windows', app_version: '2.0.0' })
events.sendEvent('click', { page: 'landing' })
events.sendEvent('click', { page: 'checkout' })
events.sendEvent('button_click', { button_id: 'submit' }, { send_immediately: true })

console.log(batcher.getBatches())
