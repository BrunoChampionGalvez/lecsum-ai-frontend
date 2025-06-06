import { apiClient } from './client';

export enum FileType {
  PDF = 'pdf',
  DOCX = 'docx',
  TEXT = 'text'
}

export interface AppFile {
  id: string;
  name: string;
  type: FileType;
  path: string;
  size: number;
  content?: string;
  processed: boolean;
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
  async getFilesByCourse(courseId: string): Promise<AppFile[]> {
    // Add a timestamp to prevent browser caching (304 Not Modified responses)
    const timestamp = new Date().getTime();
    console.log(`Getting files for course: ${courseId}`);
    const files = await apiClient.get<AppFile[]>(`/files/course/${courseId}?t=${timestamp}`);
    console.log(`Retrieved ${files.length} files for course ${courseId}:`, files);
    return files;
  },
  
  async getFilesByFolder(folderId: string): Promise<AppFile[]> {
    // Add a timestamp to prevent browser caching (304 Not Modified responses)
    const timestamp = new Date().getTime();
    return apiClient.get<AppFile[]>(`/files/folder/${folderId}?t=${timestamp}`);
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
