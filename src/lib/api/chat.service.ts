import { apiClient } from './client';

export enum MessageRole {
  USER = 'user',
  AI = 'ai'
}

export interface MessageCitation {
  fileId: string;
  fileName: string;
  excerpt: string;
}

// Define MentionedMaterial interface for selected materials
export interface MentionedMaterial {
  id: string;
  displayName: string;
  type: 'course' | 'folder' | 'file' | 'quiz' | 'flashcardDeck';
  originalName: string;
  courseId: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: MessageRole;
  createdAt: string;
  chatSessionId: string;
  citations?: MessageCitation[];
  selectedMaterials?: MentionedMaterial[];
}

export interface ChatSession {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  courseId?: string;
  contextFiles?: string[];
}

export interface CreateChatSessionRequest {
  name: string;
  courseId?: string;
  contextFiles?: string[];
}

export const ChatService = {
  async createSession(data: CreateChatSessionRequest): Promise<ChatSession> {
    return apiClient.post<ChatSession>('/chat/sessions', data);
  },
  
  async getSessionById(sessionId: string): Promise<ChatSession> {
    return apiClient.get<ChatSession>(`/chat/sessions/${sessionId}`);
  },
  
  async getSessions(): Promise<ChatSession[]> {
    return apiClient.get<ChatSession[]>('/chat/sessions');
  },
  
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return apiClient.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`);
  },
  
  async sendMessage(sessionId: string, content: string): Promise<ChatMessage> {
    return apiClient.post<ChatMessage>(`/chat/sessions/${sessionId}/messages`, { content });
  },
  
  async updateSession(sessionId: string, data: Partial<CreateChatSessionRequest>): Promise<ChatSession> {
    return apiClient.patch<ChatSession>(`/chat/sessions/${sessionId}`, data);
  },
  
  async deleteSession(sessionId: string): Promise<void> {
    return apiClient.delete<void>(`/chat/sessions/${sessionId}`);
  },
  
  async getReferencePath(type: string, id: string): Promise<string> {
    console.log('Inside getReferencePath Service');
    
    const response = await apiClient.get<{ path: string }>(`/chat/reference-path/${type}/${id}`);
    return response.path;
  },

  async searchReferenceAgain(messageId: string, textToSearch: string, chatMessage: string): Promise<string> {
    console.log('Inside searchReferenceAgain Service');
    
    const response = await apiClient.post<string>(`/chat/search-reference-again/${messageId}`, {
      textToSearch,
      chatMessage
    });
    
    return response;
  }
};
