import { TaskCategory } from './types';
import { Cat, Briefcase, User, Heart, Fish } from 'lucide-react';

export const CATEGORY_ICONS = {
  [TaskCategory.GENERAL]: Cat,
  [TaskCategory.WORK]: Briefcase,
  [TaskCategory.PERSONAL]: User,
  [TaskCategory.HEALTH]: Heart,
  [TaskCategory.TREATS]: Fish,
};

export const CATEGORY_COLORS = {
  [TaskCategory.GENERAL]: 'bg-gray-100 text-gray-700 border-gray-200',
  [TaskCategory.WORK]: 'bg-sky-50 text-sky-700 border-sky-200',
  [TaskCategory.PERSONAL]: 'bg-purple-50 text-purple-700 border-purple-200',
  [TaskCategory.HEALTH]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [TaskCategory.TREATS]: 'bg-orange-50 text-orange-700 border-orange-200',
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