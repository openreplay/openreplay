import { makeAutoObservable } from "mobx";

import { notesService } from "App/services";
import { Note, NotesFilter, WriteNote, iTag } from 'App/services/NotesService';


export default class NotesStore {
  notes: Note[] = []
  sessionNotes: Note[] = []
  loading: boolean
  page = 1
  pageSize = 10
  activeTags: iTag[] = []
  sort = 'createdAt'
  order: 'DESC' | 'ASC' = 'DESC'
  ownOnly = false
  total = 0

  constructor() {
    makeAutoObservable(this)
  }

  setLoading(loading: boolean) {
    this.loading = loading
  }

  setNotes(notes: Note[]) {
    this.notes = notes
  }

  setTotal(total: number) {
    this.total = total
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

    this.setLoading(true)
    try {
      const { notes, count } = await notesService.fetchNotes(filter);
      this.setNotes(notes);
      this.setTotal(count)
      return notes;
    } catch (e) {
      console.error(e)
    } finally {
      this.setLoading(false)
    }
  }

  setSessionNotes(notes: Note[]) {
    this.sessionNotes = notes
  }

  appendNote(note: Note) {
    this.sessionNotes = [note, ...this.sessionNotes]
  }

  async fetchSessionNotes(sessionId: string) {
    this.setLoading(true)
    try {
      const notes = await notesService.getNotesBySessionId(sessionId)
      notes.forEach(note => note.time = note.timestamp)
      this.setSessionNotes(notes)
      return notes;
    } catch (e) {
      console.error(e)
    } finally {
      this.setLoading(false)
    }
  }

  async addNote(sessionId: string, note: WriteNote) {
    this.setLoading(true)
    try {
      const addedNote = await notesService.addNote(sessionId, note)
      this.appendNote(addedNote)
      return addedNote
    } catch (e) {
      console.error(e)
    } finally {
      this.setLoading(false)
    }
  }

  async deleteNote(noteId: number) {
    this.setLoading(true)
    try {
      const deleted = await notesService.deleteNote(noteId)
      return deleted
    } catch (e) {
      console.error(e)
    } finally {
      this.setLoading(false)
    }
  }

  async updateNote(noteId: string, note: WriteNote) {
    this.setLoading(true)
    try {
      const updated = await notesService.updateNote(noteId, note)
      return updated
    } catch (e) {
      console.error(e)
    } finally {
      this.setLoading(false)
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

  async sendMsTeamsNotification(noteId: string, webhook: string) {
    try {
      const resp = await notesService.sendMsTeamsNotification(noteId, webhook)
      return resp
    } catch (e) {
      console.error(e)
    }
  }
}
