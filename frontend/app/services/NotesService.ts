

import APIClient from 'App/api_client';

export interface Note {
  message: string
  tags: string[]
  isPublic: boolean
  timestamp: number
  noteId?: string
  author?: string
}

export default class NotesService {
    private client: APIClient;

    constructor(client?: APIClient) {
        this.client = client ? client : new APIClient();
    }

    initClient(client?: APIClient) {
        this.client = client || new APIClient();
    }

    getNotes(): Promise<Note[]> {
      return this.client.get('/notes').then(r => {
        if (r.ok) {
          return r.json()
        } else {
          throw new Error('Error getting notes: ' + r.status)
        }
      })
    }

    getNotesBySessionId(sessionID: string): Promise<Note[]> {
      return this.client.get(`/sessions/${sessionID}/notes`)
        .then(r => r.json())
    }

    addNote(sessionID: string, note: Note): Promise<Note> {
      return this.client.post(`/sessions/${sessionID}/notes`, note)
        .then(r => r.json())
    }

    updateNote(noteID: string, note: Note): Promise<Note> {
      return this.client.post(`/notes/${noteID}`, note)
        .then(r => r.json())
    }

    deleteNote(noteID: string) {
      return this.client.delete(`/notes/${noteID}`)
        .then(r => r.json())
    }
}
