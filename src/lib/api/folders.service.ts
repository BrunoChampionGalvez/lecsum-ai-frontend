import { apiClient } from './client';
import { Folder } from './types';

export interface CreateFolderData {
  name: string;
  parentId?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedFolderResponse {
  folders: Folder[];
  total: number;
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

  static async getFolderContents(folderId: string, options?: PaginationOptions): Promise<PaginatedFolderResponse> {
    // Add a timestamp to prevent browser caching (304 Not Modified responses)
    const timestamp = new Date().getTime();
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    
    return apiClient.get<PaginatedFolderResponse>(`/folders/${folderId}/contents?page=${page}&limit=${limit}&t=${timestamp}`);
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
