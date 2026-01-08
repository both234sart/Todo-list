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
  [TaskCategory.GENERAL]: 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 dark:hover:bg-stone-700',
  [TaskCategory.WORK]: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/50',
  [TaskCategory.PERSONAL]: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/50',
  [TaskCategory.HEALTH]: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50',
  [TaskCategory.TREATS]: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800 dark:hover:bg-orange-900/50',
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