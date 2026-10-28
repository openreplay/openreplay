import TagMatcher, { type Tag, matchesLocation } from './tagMatcher.js'

export const WATCHED_TAGS_KEY = '__or__watched_tags__'

class TagWatcher {
  private disposed = false
  private readonly abort = new AbortController()
  interval: ReturnType<typeof setInterval> | null = null
  tags: Tag[] = []
  readonly matcher: TagMatcher = new TagMatcher()
  observer: IntersectionObserver
  private readonly sessionStorage: Storage
  private readonly errLog: (args: any[]) => void
  private readonly onTag: (tag: number) => void

  constructor(params: {
    sessionStorage: Storage
    errLog: (args: any[]) => void
    onTag: (tag: number) => void
  }) {
    this.sessionStorage = params.sessionStorage
    this.errLog = params.errLog
    this.onTag = params.onTag
    // @ts-ignore
    const tags: Tag[] = JSON.parse(
      params.sessionStorage.getItem(WATCHED_TAGS_KEY) ?? '[]',
    )
    this.setTags(tags)
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target) {
            // @ts-ignore
            const tag = entry.target.__or_watcher_tagname as number
            if (tag) {
              this.onTagRendered(tag)
            }
            this.observer.unobserve(entry.target)
          }
        }
      })
    })
  }

  async fetchTags(ingest: string, token: string) {
    if (this.disposed) return
    return fetch(`${ingest}/v1/web/tags`, {
      method: 'GET',
      signal: this.abort.signal,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then(({ tags }: { tags: Tag[] }) => {
        if (this.disposed) return
        if (tags && tags.length) {
          this.setTags(tags)
          const tagString = JSON.stringify(tags)
          this.sessionStorage.setItem(WATCHED_TAGS_KEY, tagString || '')
        }
      })
      .catch((e) => { if (!this.disposed) this.errLog(e) })
  }

  setTags(tags: Tag[]) {
    if (this.disposed) return
    this.tags = tags
    this.matcher.setTags(tags)
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.interval = setInterval(() => {
      this.tags.forEach((tag) => {
        if (!matchesLocation(tag)) return
        const possibleEls = document.querySelectorAll(tag.selector)
        if (possibleEls.length > 0) {
          const el = possibleEls[0]
          // @ts-ignore
          el.__or_watcher_tagname = tag.id
          this.observer.observe(el)
        }
      })
    }, 500)
  }

  onTagRendered(tagId: number) {
    if (this.disposed) return
    const tag = this.tags.find(t => t.id === tagId)
    if (tag) {
      this.tags = this.tags.filter((t) => t.id !== tagId)
      if (!matchesLocation(tag)) return
    }
    this.onTag(tagId)
  }

  discard() {
    if (this.disposed) return
    this.disposed = true
    try { this.abort.abort() } finally { this.clear() }
  }

  clear() {
    this.tags = []
    this.matcher.clear()
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.observer.disconnect()
  }
}

export default TagWatcher
