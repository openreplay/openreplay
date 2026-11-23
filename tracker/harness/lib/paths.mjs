import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
/** the tracker workspace (tracker/), as checked out here */
export const WORKSPACE = path.resolve(HARNESS, '..')
export const REPO = path.resolve(WORKSPACE, '..')
export const CACHE = path.join(HARNESS, '.cache')
export const RESULTS = path.join(HARNESS, 'results')

/** the tracker package inside a workspace checkout */
export const trackerPackage = (workspace) => path.join(workspace, 'tracker')
