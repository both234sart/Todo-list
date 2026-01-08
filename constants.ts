import { TaskCategory } from './types';
import { Cat, Briefcase, User, Heart, Fish } from 'lucide-react';

export const CATEGORY_ICONS = {
  [TaskCategory.GENERAL]: Cat,
  [TaskCategory.WORK]: Briefcase,
  [TaskCategory.PERSONAL]: User,
  [TaskCategory.HEALTH]: Heart,
  [TaskCategory.TREATS]: Fish,
};

export const INITIAL_TASKS = [
  {
    id: '1',
    text: 'Buy more kibble',
    completed: false,
    category: TaskCategory.TREATS,
    createdAt: Date.now(),
  },
  {
    id: '2',
    text: 'Nap in the sunbeam',
    completed: true,
    category: TaskCategory.HEALTH,
    createdAt: Date.now() - 100000,
  }
];

export const MOCK_USER = {
  id: 'u_123',
  name: 'Cat Lover',
  email: 'meow@whiskerlist.com',
  avatarUrl: 'https://picsum.photos/100/100', // Placeholder
};
