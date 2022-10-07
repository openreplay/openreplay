import APIClient from 'App/api_client';


export const tagProps = {
  'ISSUE': '#CC0000',
  'QUERY': '#3EAAAF',
  'TASK': '#7986CB',
  'OTHER': 'rgba(0, 0, 0, 0.6)',
}

export type iTag = keyof typeof tagProps | "ALL"

export const TAGS = Object.keys(tagProps) as unknown as (keyof typeof tagProps)[]

export interface WriteNote {
  message: string
  tag: iTag
  isPublic: boolean
  timestamp: number
  noteId?: string
  author?: string
}

export interface Note {
  createdAt: string
  deletedAt: string | null
  isPublic: boolean
  message: string
  noteId: number
  projectId: number
  sessionId: string
  tag: iTag
  timestamp: number
  userId: number
}

export interface NotesFilter {
  page: number
  limit: number
  sort: string
  order: 'DESC' | 'ASC'
  tags: iTag[]
  sharedOnly: boolean
  mineOnly: boolean
}

export default class NotesService {
    private client: APIClient;

    constructor(client?: APIClient) {
        this.client = client ? client : new APIClient();
    }

    initClient(client?: APIClient) {
        this.client = client || new APIClient();
    }

    fetchNotes(filter: NotesFilter): Promise<Note[]> {
      return this.client.post('/notes', filter).then(r => {
        if (r.ok) {
          return r.json().then(r => r.data)
        } else {
          throw new Error('Error getting notes: ' + r.status)
        }
      })
    }

    getNotesBySessionId(sessionID: string): Promise<Note[]> {
      return this.client.get(`/sessions/${sessionID}/notes`)
      .then(r => {
        if (r.ok) {
          return r.json().then(r => r.data)
        } else {
          throw new Error('Error getting notes for ' +sessionID + ' cuz: ' + r.status)
        }
      })
    }

    addNote(sessionID: string, note: WriteNote): Promise<Note> {
      return this.client.post(`/sessions/${sessionID}/notes`, note)
      .then(r => {
        if (r.ok) {
          return r.json().then(r => r.data)
        } else {
          throw new Error('Error adding note: ' + r.status)
        }
      })
    }

    updateNote(noteID: string, note: WriteNote): Promise<Note> {
      return this.client.post(`/notes/${noteID}`, note)
      .then(r => {
        if (r.ok) {
          return r.json().then(r => r.data)
        } else {
          throw new Error('Error updating note: ' + r.status)
        }
      })
    }

    deleteNote(noteID: number) {
      return this.client.delete(`/notes/${noteID}`)
      .then(r => {
        if (r.ok) {
          return r.json().then(r => r.data)
        } else {
          throw new Error('Error deleting note: ' + r.status)
        }
      })
    }

    sendSlackNotification(noteId: number, webhook: string) {
      return this.client.get(`/notes/${noteId}/slack/${webhook}`)
      .then(r => {
        if (r.ok) {
          return r.json().then(r => r.data)
        } else {
          throw new Error('Error sending slack notif: ' + r.status)
        }
      })
    }
}
