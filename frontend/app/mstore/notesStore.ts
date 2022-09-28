import { makeAutoObservable } from "mobx"
import { notesService } from "App/services"
import { Note } from 'App/services/NotesService'

interface SessionNotes {
  [sessionId: string]: Note[]
}

export default class NotesStore {
  notes: Note[] = []
  sessionNotes: SessionNotes
  loading: boolean
  page = 1
  pageSize = 15


  constructor() {
    makeAutoObservable(this)
  }

  async fetchNotes() {
    this.loading = true
    try {
      const notes = await notesService.getNotes()
      this.notes = notes;
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
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }

  async addNote(sessionId: string, note: Note) {
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

  async deleteNote(noteId: string) {
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

  changePage(page: number) {
    this.page = page
  }
}
