import { apiClient } from './client';
import { DifficultyLevel } from './flashcards.service';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
  sourceMaterial?: {
    fileId: string;
    excerpt: string;
    location: string;
  };
  createdAt: string;
  updatedAt: string;
  quizId: string;
}

export interface  Quiz {
  id: string;
  title: string;
  difficulty: DifficultyLevel;
  questionCount: number;
  completed: boolean;
  lastScore?: number;
  createdAt: string;
  updatedAt: string;
  courseId: string;
  questions?: QuizQuestion[];
  aiGenerated?: boolean;
}

export interface GenerateQuizParams {
  courseId: string;
  fileIds: string[];
  folderIds?: string[];
  questionCount: number;
  difficulty: string | DifficultyLevel;
  title?: string;
}

export interface SubmitQuizAnswerParams {
  answers: {
    questionId: string;
    answer: string;
  }[];
}

export const QuizzesService = {
  async createQuiz(data: { title: string; courseId: string; questions: { question: string; correctAnswer: string; options: string[] }[] }): Promise<Quiz> {
    return apiClient.post<Quiz>('/quizzes', data);
  },

  async getQuestionById(id: string): Promise<QuizQuestion> {
    return apiClient.get<QuizQuestion>(`/quizzes/question/${id}`);
  },

  async getQuestionsBatch(ids: string[]): Promise<Record<string, QuizQuestion>> {
    return apiClient.post<Record<string, QuizQuestion>>('/quizzes/questions/batch', { ids });
  },
  async getQuizzesByCourse(courseId: string): Promise<Quiz[]> {
    return apiClient.get<Quiz[]>(`/quizzes/course/${courseId}`);
  },
  
  async getQuizById(id: string): Promise<Quiz> {
    return apiClient.get<Quiz>(`/quizzes/${id}`);
  },
  
  async generateQuiz(params: GenerateQuizParams): Promise<Quiz> {
    return apiClient.post<Quiz>('/quizzes/generate', params);
  },

  async updateQuiz(id: string, data: Partial<Quiz>): Promise<Quiz> {
    return apiClient.put<Quiz>(`/quizzes/${id}`, data);
  },

  async submitQuizAnswers(quizId: string, answers: SubmitQuizAnswerParams): Promise<Quiz> {
    return apiClient.post<Quiz>(`/quizzes/${quizId}/submit`, answers);
  },
  
  async deleteQuiz(id: string): Promise<void> {
    return apiClient.delete<void>(`/quizzes/${id}`);
  },

  async getAll(): Promise<Quiz[]> {
    return apiClient.get<Quiz[]>(`/quizzes`);
  },
};
