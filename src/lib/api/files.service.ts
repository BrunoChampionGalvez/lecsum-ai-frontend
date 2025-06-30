import { apiClient } from './client';

export enum FileType {
  PDF = 'pdf',
  DOCX = 'docx',
  TEXT = 'text'
}

// Import pagination options from folders service or define it here
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedFilesResponse {
  files: AppFile[];
  total: number;
}

export interface AppFile {
  id: string;
  name: string;
  type: FileType;
  path: string;
  size: number;
  content?: string;
  processed: boolean;
  textExtracted: boolean;
  createdAt: string;
  updatedAt: string;
  courseId: string;
  folderId?: string | null; // Add folderId to match backend entity
}

export const FilesService = {
  async getFileContentById(id: string): Promise<{ content: string; name: string; path: string }> {
    console.log(`Getting file content by ID: ${id}`);
    return apiClient.get<{ content: string; name: string; path: string }>(`/files/content/id/${id}`);
  },
  async getFilesByCourse(courseId: string, options?: PaginationOptions): Promise<PaginatedFilesResponse> {
    // Add a timestamp to prevent browser caching (304 Not Modified responses)
    const timestamp = new Date().getTime();
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    
    console.log(`Getting files for course: ${courseId} (page ${page}, limit ${limit})`);
    const response = await apiClient.get<PaginatedFilesResponse>(
      `/files/course/${courseId}?page=${page}&limit=${limit}&t=${timestamp}`
    );
    
    // Handle both new paginated response format and old array format for backwards compatibility
    if ('files' in response && 'total' in response) {
      console.log(`Retrieved ${response.files.length} files (of ${response.total} total) for course ${courseId}`);
      return response;
    } else {
      // Legacy support - cast to array type first to avoid TypeScript errors
      const responseArray = response as unknown as AppFile[];
      console.log(`Retrieved ${responseArray.length} files for course ${courseId} (legacy format)`);
      return { 
        files: responseArray, 
        total: responseArray.length 
      };
    }
  },
  
  async getFilesByFolder(folderId: string, options?: PaginationOptions): Promise<PaginatedFilesResponse> {
    // Add a timestamp to prevent browser caching (304 Not Modified responses)
    const timestamp = new Date().getTime();
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    
    console.log(`Getting files for folder: ${folderId} (page ${page}, limit ${limit})`);
    const response = await apiClient.get<PaginatedFilesResponse | AppFile[]>(
      `/files/folder/${folderId}?page=${page}&limit=${limit}&t=${timestamp}`
    );
    
    // Handle both new paginated response format and old array format for backwards compatibility
    if (Array.isArray(response)) {
      // Legacy support - convert array response to paginated format
      console.log(`Retrieved ${response.length} files for folder ${folderId} (legacy format)`);
      return { 
        files: response, 
        total: response.length 
      };
    } else {
      console.log(`Retrieved ${response.files.length} files (of ${response.total} total) for folder ${folderId}`);
      return response;
    }
  },
  
  async getFileById(id: string): Promise<AppFile> {
    return apiClient.get<AppFile>(`/files/${id}`);
  },
  
  async uploadPdfFile(courseId: string, file: File, folderId?: string | null): Promise<AppFile> {
    console.log('Frontend: uploading PDF file to folder:', folderId);
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folderId', folderId);
      console.log('Frontend: appended folderId to form data:', folderId);
    }
    
    return apiClient.post<AppFile>(`/files/upload/pdf/${courseId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  async uploadDocxFile(courseId: string, file: File, folderId?: string | null): Promise<AppFile> {
    console.log('Frontend: uploading DOCX file to folder:', folderId);
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folderId', folderId);
      console.log('Frontend: appended folderId to form data:', folderId);
    }
    
    return apiClient.post<AppFile>(`/files/upload/docx/${courseId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  async uploadTextFile(courseId: string, file: File, folderId?: string | null): Promise<AppFile> {
    console.log('Frontend: uploading Text file to folder:', folderId);
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folderId', folderId);
      console.log('Frontend: appended folderId to form data:', folderId);
    }
    
    return apiClient.post<AppFile>(`/files/upload/text/${courseId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  async saveTextContent(courseId: string, name: string, content: string, folderId?: string | null): Promise<AppFile> {
    return apiClient.post<AppFile>(`/files/text/${courseId}`, { name, content, folderId });
  },
  
  async deleteFile(id: string): Promise<void> {
    return apiClient.delete(`/files/${id}`);
  },

  async moveFile(fileId: string, folderId: string | null): Promise<AppFile> {
    return apiClient.patch<AppFile>(`/files/${fileId}/move`, { folderId });
  },
};
