import { defineConfig } from "cypress";
import {addMatchImageSnapshotPlugin} from 'cypress-image-snapshot/plugin';

const data = {}

export default defineConfig({
  e2e: {
    viewportHeight: 900,
    viewportWidth: 1400,
    baseUrl: 'http://0.0.0.0:3333/',
    setupNodeEvents(on, config) {
      // implement node event listeners here
      addMatchImageSnapshotPlugin(on, config)
        on('task', {
          setValue({key, value}) {
            data[key] = value
            return null
          },
          getValue(key) {
            return data[key] || null
          },
        })
    },
  }
});
