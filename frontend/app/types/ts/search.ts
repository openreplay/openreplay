export interface SavedSearch {
    count: number;
    createdAt: number;
    filter: Record<string, any>;
    isPublic: boolean;
    key: string;
    name: string;
    projectId: number;
    searchId: number;
    userId: number;
}
