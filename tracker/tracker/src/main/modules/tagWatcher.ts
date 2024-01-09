export const WATCHED_TAGS_KEY = '__or__watched_tags__'

class TagWatcher {
  intervals: Record<string, ReturnType<typeof setInterval>> = {}
  tags: string[] = []

  constructor(
    private readonly sessionStorage: Storage,
    private readonly errLog: (args: any[]) => void,
    private readonly onTag: (tag: string) => void,
  ) {
    const tags = sessionStorage.getItem(WATCHED_TAGS_KEY)?.split(',') || []
    this.setTags(tags)
  }

  async fetchTags() {
    return fetch('https://api.openreplay.com/tags')
      .then((r) => r.json())
      .then((tags: string[]) => {
        this.setTags(tags)
        this.sessionStorage.setItem(WATCHED_TAGS_KEY, tags.join(',') || '')
      })
      .catch((e) => this.errLog(e))
  }

  setTags(tags: string[]) {
    this.tags = tags
    this.intervals = {}
    tags.forEach((tag) => {
      this.intervals[tag] = setInterval(() => {
        const possibleEls = document.querySelectorAll(tag)
        if (possibleEls.length > 0) {
          this.onTagRendered(tag)
        }
      }, 500)
    })
  }

  onTagRendered(tag: string) {
    if (this.intervals[tag]) {
      clearInterval(this.intervals[tag])
    }
    this.onTag(tag)
  }

  clear() {
    this.tags.forEach((tag) => {
      clearInterval(this.intervals[tag])
    })
    this.tags = []
    this.intervals = {}
  }
}

export default TagWatcher
