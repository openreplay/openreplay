declare global {
  interface Window {
    env: {
      NODE_ENV: string
      ORIGIN: string
      ASSETS_HOST: string
      API_EDP: string
      VERSION: string
      TRACKER_VERSION: string
      TRACKER_HOST: string
      SOURCEMAP: boolean
    }
  }
}
