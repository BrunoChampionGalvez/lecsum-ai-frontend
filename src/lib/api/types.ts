// Define custom types for our API responses

export interface APIFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  courseId: string;
  parentId?: string;
  children?: Folder[];
  files?: APIFile[];
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  question: string;
  answer: string;
  choices: string[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  createdAt: string;
  updatedAt: string;
}
