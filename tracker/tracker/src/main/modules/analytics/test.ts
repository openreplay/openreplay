import Batcher from "./batcher.ts";
import People from "./people.ts";
import SharedProperties from "./sharedProperties.ts";

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

const sharedProperties = new SharedProperties(new MockStorage(), new MockStorage())
const batcher = new Batcher('http://localhost:3000', () => "test_token_123", async () => {})
const people = new People(
  sharedProperties,
  () => Date.now(),
  () => {},
  batcher
)

people.identify('user_123')
people.setProperties({ age: 30, country: 'USA' })
people.increment('age', 1)
people.setPropertiesOnce({ signup_date: '2024-01-01', country: 'FRANCE' })
// ignoring append for now
people.deleteUser()

console.log(batcher.getBatches())
