export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: TaskCategory;
  createdAt: number;
}

export enum TaskCategory {
  GENERAL = 'General',
  WORK = 'Work',
  PERSONAL = 'Personal',
  HEALTH = 'Health',
  TREATS = 'Treats' // Cat themed category
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface AiSuggestion {
  text: string;
  type: 'motivation' | 'breakdown' | 'pun';
}
