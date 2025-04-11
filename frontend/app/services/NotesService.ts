import APIClient from 'App/api_client';

export const tagProps = {
  ISSUE: 'red',
  DESIGN: 'geekblue',
  NOTE: 'purple',
};

export type iTag = keyof typeof tagProps | 'ALL';

export const TAGS = Object.keys(
  tagProps,
) as unknown as (keyof typeof tagProps)[];

export interface WriteNote {
  message: string;
  tag: string;
  isPublic: boolean;
  timestamp?: number;
  startAt: number;
  endAt: number;
  thumbnail: string;
}

export interface Note {
  createdAt: string;
  deletedAt: string | null;
  isPublic: boolean;
  message: string;
  noteId: number;
  projectId: number;
  sessionId: string;
  tag: iTag;
  timestamp: number;
  userId: number;
  userName: string;
  startAt: number;
  endAt: number;
  thumbnail: string;
}

export interface NotesFilter {
  page: number;
  limit: number;
  sort: string;
  order: 'DESC' | 'ASC';
  tags: iTag[];
  sharedOnly: boolean;
  mineOnly: boolean;
  search: string;
}

export default class NotesService {
  private client: APIClient;

  constructor(client?: APIClient) {
    this.client = client || new APIClient();
  }

  initClient(client?: APIClient) {
    this.client = client || new APIClient();
  }

  fetchNotes(filter: NotesFilter): Promise<{ notes: Note[]; count: number }> {
    return this.client
      .post('/notes', filter)
      .then((r) => r.json().then((r) => r.data));
  }

  fetchNoteById(noteId: string): Promise<Note> {
    return this.client
      .get(`/notes/${noteId}`)
      .then((r) => r.json().then((r) => r.data));
  }

  getNotesBySessionId(sessionID: string): Promise<Note[]> {
    return this.client
      .get(`/sessions/${sessionID}/notes`)
      .then((r) => r.json().then((r) => r.data));
  }

  addNote(sessionID: string, note: WriteNote): Promise<Note> {
    return this.client
      .post(`/sessions/${sessionID}/notes`, note)
      .then((r) => r.json().then((r) => r.data));
  }

  updateNote(noteID: string, note: WriteNote): Promise<Note> {
    return this.client
      .post(`/notes/${noteID}`, note)
      .then((r) => r.json().then((r) => r.data));
  }

  deleteNote(noteID: number) {
    return this.client
      .delete(`/notes/${noteID}`)
      .then((r) => r.json().then((r) => r.data));
  }

  sendSlackNotification(noteId: string, webhook: string) {
    return this.client
      .get(`/notes/${noteId}/slack/${webhook}`)
      .then((r) => r.json().then((r) => r.data));
  }

  sendMsTeamsNotification(noteId: string, webhook: string) {
    return this.client
      .get(`/notes/${noteId}/msteams/${webhook}`)
      .then((r) => r.json().then((r) => r.data));
  }
}
