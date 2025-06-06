import { apiClient } from './client';
import { Folder } from './types';

export interface CreateFolderData {
  name: string;
  parentId?: string;
}

export class FoldersService {
  static async getFoldersByCourseid(courseId: string): Promise<Folder[]> {
    // Add a timestamp to prevent browser caching
    const timestamp = new Date().getTime();
    console.log(`Getting folders for course: ${courseId}`);
    const folders = await apiClient.get<Folder[]>(`/folders/course/${courseId}?t=${timestamp}`);
    console.log(`Retrieved ${folders.length} folders for course ${courseId}:`, folders);
    return folders;
  }

  static async getFolderContents(folderId: string): Promise<Folder[]> {
    // Add a timestamp to prevent browser caching (304 Not Modified responses)
    const timestamp = new Date().getTime();
    return apiClient.get<Folder[]>(`/folders/${folderId}/contents?t=${timestamp}`);
  }

  static async createFolder(courseId: string, data: CreateFolderData): Promise<Folder> {
    return apiClient.post<Folder>(`/folders/course/${courseId}`, data);
  }

  static async deleteFolder(folderId: string): Promise<void> {
    return apiClient.delete(`/folders/${folderId}`);
  }

  static async moveFolder(folderId: string, newParentId: string | null): Promise<Folder> {
    return apiClient.patch<Folder>(`/folders/${folderId}/move`, { parentId: newParentId });
  }
}
