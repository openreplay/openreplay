export const WATCHED_TAGS_KEY = '__or__watched_tags__'

class TagWatcher {
  intervals: Record<string, ReturnType<typeof setInterval>> = {}
  tags: { id: number; selector: string }[] = []
  observer: IntersectionObserver

  constructor(
    private readonly sessionStorage: Storage,
    private readonly errLog: (args: any[]) => void,
    private readonly onTag: (tag: number) => void,
  ) {
    const tags: { id: number; selector: string }[] = JSON.parse(
      sessionStorage.getItem(WATCHED_TAGS_KEY) ?? '[]',
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
    return fetch(`${ingest}/v1/web/tags`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then(({ tags }: { tags: { id: number; selector: string }[] }) => {
        if (tags && tags.length) {
          this.setTags(tags)
          const tagString = JSON.stringify(tags)
          this.sessionStorage.setItem(WATCHED_TAGS_KEY, tagString || '')
        }
      })
      .catch((e) => this.errLog(e))
  }

  setTags(tags: { id: number; selector: string }[]) {
    this.tags = tags
    this.intervals = {}
    tags.forEach((tag) => {
      this.intervals[tag.id] = setInterval(() => {
        const possibleEls = document.querySelectorAll(tag.selector)
        if (possibleEls.length > 0) {
          const el = possibleEls[0]
          // @ts-ignore
          el.__or_watcher_tagname = tag.id
          this.observer.observe(el)
        }
      }, 500)
    })
  }

  onTagRendered(tagId: number) {
    if (this.intervals[tagId]) {
      clearInterval(this.intervals[tagId])
    }
    this.onTag(tagId)
  }

  clear() {
    this.tags.forEach((tag) => {
      clearInterval(this.intervals[tag.id])
    })
    this.tags = []
    this.intervals = {}
    this.observer.disconnect()
  }
}

export default TagWatcher
