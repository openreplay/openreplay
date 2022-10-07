import { makeAutoObservable } from "mobx"
import { notesService } from "App/services"
import { Note, WriteNote, iTag, NotesFilter } from 'App/services/NotesService'

interface SessionNotes {
  [sessionId: string]: Note[]
}

export default class NotesStore {
  notes: Note[] = []
  sessionNotes: SessionNotes = {}
  loading: boolean
  page = 1
  pageSize = 15
  activeTags: iTag[] = []
  sort = 'createdAt'
  order: 'DESC' | 'ASC' = 'DESC'
  ownOnly = false

  constructor() {
    makeAutoObservable(this)
  }

  async fetchNotes() {
    const filter: NotesFilter = {
      page: this.page,
      limit: this.pageSize,
      sort: this.sort,
      order: this.order,
      tags: this.activeTags,
      mineOnly: this.ownOnly,
      sharedOnly: false
    }

    this.loading = true
    try {
      const notes = await notesService.fetchNotes(filter)
      this.notes = notes;
      return notes;
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  async fetchSessionNotes(sessionId: string) {
    this.loading = true
    try {
      const notes = await notesService.getNotesBySessionId(sessionId)
      this.sessionNotes[sessionId] = notes
      return notes;
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  async addNote(sessionId: string, note: WriteNote) {
    this.loading = true
    try {
      const addedNote = await notesService.addNote(sessionId, note)
      return addedNote
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  async deleteNote(noteId: number) {
    this.loading = true
    try {
      const deleted = await notesService.deleteNote(noteId)
      return deleted
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  async updateNote(noteId: string, note: WriteNote) {
    this.loading = true
    try {
      const updated = await notesService.updateNote(noteId, note)
      return updated
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  getNoteById(noteId: number, notes?: Note[]) {
    const notesSource = notes ? notes : this.notes

    return notesSource.find(note => note.noteId === noteId)
  }

  changePage(page: number) {
    this.page = page
  }

  toggleTag(tag?: iTag) {
    if (!tag) {
      this.activeTags = []
      this.fetchNotes()
    } else {
      this.activeTags = [tag]
      this.fetchNotes()
    }
  }

  toggleShared(ownOnly: boolean) {
    this.ownOnly = ownOnly
    this.fetchNotes()
  }

  toggleSort(sort: string) {
    const sortOrder = sort.split('-')[1]
    // @ts-ignore
    this.order = sortOrder

    this.fetchNotes()
  }

  async sendSlackNotification(noteId: string, webhook: string) {
    try {
      const resp = await notesService.sendSlackNotification(noteId, webhook)
      return resp
    } catch (e) {
      console.error(e)
    }
  }
}
