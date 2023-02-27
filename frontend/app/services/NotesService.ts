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
  userName: string
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
      return r.json().then(r => r.data)
    })
  }

  getNotesBySessionId(sessionID: string): Promise<Note[]> {
    return this.client.get(`/sessions/${sessionID}/notes`)
      .then(r => {
        return r.json().then(r => r.data)
      })
  }

  addNote(sessionID: string, note: WriteNote): Promise<Note> {
    return this.client.post(`/sessions/${sessionID}/notes`, note)
      .then(r => {
        return r.json().then(r => r.data)
      })
  }

  updateNote(noteID: string, note: WriteNote): Promise<Note> {
    return this.client.post(`/notes/${noteID}`, note)
      .then(r => {
        return r.json().then(r => r.data)
      })
  }

  deleteNote(noteID: number) {
    return this.client.delete(`/notes/${noteID}`)
      .then(r => {
        return r.json().then(r => r.data)
      })
  }

  sendSlackNotification(noteId: string, webhook: string) {
    return this.client.get(`/notes/${noteId}/slack/${webhook}`)
      .then(r => {
        return r.json().then(r => r.data)
      })
  }

  sendMsTeamsNotification(noteId: string, webhook: string) {
    return this.client.get(`/notes/${noteId}/msteams/${webhook}`)
      .then(r => {
        return r.json().then(r => r.data)
      })
  }
}
