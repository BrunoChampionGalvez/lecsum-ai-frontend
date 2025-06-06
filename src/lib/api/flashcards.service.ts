import { apiClient } from './client';

export enum FlashcardType {
  CLOZE = 'cloze',
  QA = 'qa'
}

export enum DifficultyLevel {
  EASY = 'easy',
  MODERATE = 'moderate',
  HARD = 'hard'
}

export interface Flashcard {
  id: string;
  type: FlashcardType;
  front: string;
  back: string;
  difficulty: DifficultyLevel;
  sourceMaterial?: {
    fileId: string;
    excerpt: string;
    location: string;
  };
  createdAt: string;
  updatedAt: string;
  courseId: string;
  deckId?: string;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  flashcards: Flashcard[];
  courseId: string;
  createdAt: string;
  fileIds: string[];
}

export interface GenerateFlashcardsParams {
  courseId: string;
  fileIds: string[];
  types: FlashcardType[];
  difficulty: DifficultyLevel;
  deckName: string;
  flashcardCount: number;
  folderIds: string[];
}

export const FlashcardsService = {
  async getFlashcardsByCourse(courseId: string): Promise<Flashcard[]> {
    return apiClient.get<Flashcard[]>(`/flashcards/course/${courseId}`);
  },

  async getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
    const res = await apiClient.get<{ flashcards: Flashcard[] }>(`/decks/${deckId}/flashcards`);
    return res.flashcards;
  },

  async getDeckById(deckId: string): Promise<Deck> {
    return apiClient.get<Deck>(`/flashcards/deck/${deckId}`);
  },

  // Fetch flashcard by reference ID - for references in chat messages
  async getFlashcardByReferenceId(flashcardId: string): Promise<Flashcard> {
    return apiClient.get<Flashcard>(`/flashcards/reference/${flashcardId}`);
  },

  async getFlashcardsBatch(flashcardIds: string[]): Promise<Record<string, Flashcard>> {
    return apiClient.post<Record<string, Flashcard>>('/flashcards/references/batch', { ids: flashcardIds });
  },

  async addFlashcardToDeck(deckId: string, data: Partial<Flashcard>): Promise<Flashcard> {
    return apiClient.post<Flashcard>(`/decks/${deckId}/flashcards`, data);
  },

  async updateFlashcard(deckId: string, flashcardId: string, data: Partial<Flashcard>): Promise<Flashcard> {
    return apiClient.put<Flashcard>(`/decks/${deckId}/flashcards/${flashcardId}`, data);
  },

  async deleteFlashcardFromDeck(deckId: string, flashcardId: string): Promise<void> {
    return apiClient.delete<void>(`/decks/${deckId}/flashcards/${flashcardId}`);
  },

  async getFlashcardById(id: string): Promise<Flashcard> {
    return apiClient.get<Flashcard>(`/flashcards/${id}`);
  },

  async generateFlashcards(params: GenerateFlashcardsParams): Promise<Flashcard[]> {
    return apiClient.post<Flashcard[]>('/flashcards/generate', params);
  },

  async deleteFlashcard(id: string): Promise<void> {
    return apiClient.delete<void>(`/flashcards/${id}`);
  },
};
