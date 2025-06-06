import { apiClient } from './client';
import { Flashcard } from './types';

export interface Deck {
  id: string;
  name: string;
  description?: string;
  flashcards: Flashcard[];
  courseId: string;
  aiGenerated?: boolean;
  course?: {
    id: string;
    name: string;
    // add more if needed
  };
}

export const DecksService = {
  async getAll(): Promise<Deck[]> {
    return apiClient.get<Deck[]>('/decks');
  },
  async getById(id: string): Promise<Deck> {
    return apiClient.get<Deck>(`/decks/${id}`);
  },
  async create(data: Partial<Deck>): Promise<Deck> {
    return apiClient.post<Deck>('/decks', data);
  },
  async update(id: string, data: Partial<Deck>): Promise<Deck> {
    return apiClient.put<Deck>(`/decks/${id}`, data);
  },
  async remove(id: string): Promise<void> {
    return apiClient.delete<void>(`/decks/${id}`);
  },
};
