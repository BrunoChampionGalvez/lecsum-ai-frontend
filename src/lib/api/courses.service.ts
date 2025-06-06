import { apiClient } from './client';
import { APIFile, Quiz, Flashcard } from './types';

export interface Course {
  id: string;
  name: string;
  description?: string;
  isArchived: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  files?: APIFile[];
  quizzes?: Quiz[];
  flashcards?: Flashcard[];
}

export interface CreateCourseData {
  name: string;
  description?: string;
}

export interface UpdateCourseData {
  name?: string;
  description?: string;
}

export const CoursesService = {
  async getAllCourses(): Promise<Course[]> {
    return apiClient.get<Course[]>('/courses');
  },
  
  async getCourseById(id: string): Promise<Course> {
    return apiClient.get<Course>(`/courses/${id}`);
  },
  
  async createCourse(data: CreateCourseData): Promise<Course> {
    return apiClient.post<Course>('/courses', data);
  },
  
  async updateCourse(id: string, data: UpdateCourseData): Promise<Course> {
    return apiClient.patch<Course>(`/courses/${id}`, data);
  },
  
  async deleteCourse(id: string): Promise<void> {
    return apiClient.delete<void>(`/courses/${id}`);
  },
};
