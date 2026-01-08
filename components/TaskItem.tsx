import React, { useState, useEffect } from 'react';
import { Todo, TaskCategory } from '../types';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../constants';
import { Check, Trash2, ChevronDown, ChevronUp, Sparkles, Loader2, Calendar, GripVertical } from 'lucide-react';
import { breakdownTask } from '../services/geminiService';
import confetti from 'canvas-confetti';

interface TaskItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newText: string) => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDragEnd?: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ 
  todo, 
  onToggle, 
  onDelete, 
  onUpdate,
  draggable,
  onDragStart,
  onDragEnter,
  onDragEnd
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);

  useEffect(() => {
    setEditText(todo.text);
  }, [todo.text]);

  const Icon = CATEGORY_ICONS[todo.category];
  const colorClass = CATEGORY_COLORS[todo.category] || 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700';

  const handleAiBreakdown = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (subtasks.length > 0) {
        setIsExpanded(!isExpanded);
        return;
    }

    setIsExpanded(true);
    setIsLoadingAi(true);
    const steps = await breakdownTask(todo.text);
    setSubtasks(steps);
    setIsLoadingAi(false);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todo.text) {
      onUpdate(todo.id, trimmed);
    } else {
      setEditText(todo.text); // Revert if empty or unchanged
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(todo.text); // Cancel
      setIsEditing(false);
    }
  };

  const handleToggle = () => {
    if (!todo.completed) {
      // Trigger confetti only when marking as complete
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFB74D', '#5D4037', '#FFCC80'], // Cat theme colors
        disableForReducedMotion: true
      });
    }
    onToggle(todo.id);
  };

  return (
    <div 
      className={`group bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-gray-100 dark:border-stone-800 transition-all duration-200 hover:shadow-md ${todo.completed ? 'opacity-60' : ''} ${draggable ? 'cursor-move' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="p-4 flex items-center gap-3">
        {draggable && (
           <div className="text-stone-300 hover:text-stone-500 dark:text-stone-600 dark:hover:text-stone-400 cursor-grab active:cursor-grabbing hidden group-hover:block transition-colors -ml-2">
               <GripVertical size={20} />
           </div>
        )}
        
        <button
          onClick={handleToggle}
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            todo.completed
              ? 'bg-cat-orange border-cat-orange text-white'
              : 'border-cat-gray dark:border-stone-600 text-transparent hover:border-cat-orange dark:hover:border-cat-orange'
          }`}
        >
          <Check size={14} strokeWidth={3} />
        </button>

        <div className="flex-grow min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
                {isEditing ? (
                  <input
                    autoFocus
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="flex-grow min-w-[150px] bg-stone-50 dark:bg-stone-800 border border-cat-accent dark:border-stone-600 rounded px-2 py-0.5 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-cat-orange/20"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    onClick={() => !todo.completed && setIsEditing(true)}
                    title="Click to edit"
                    className={`text-gray-800 dark:text-stone-200 font-medium truncate cursor-text hover:text-cat-brown dark:hover:text-cat-orange transition-colors ${todo.completed ? 'line-through text-gray-400 dark:text-stone-600 pointer-events-none' : ''}`}
                  >
                      {todo.text}
                  </span>
                )}
                
                <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass} font-medium flex items-center gap-1 flex-shrink-0`}>
                    <Icon size={10} />
                    {todo.category}
                </span>
                {todo.dueDate && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1 flex-shrink-0">
                    <Calendar size={10} />
                    {formatDate(todo.dueDate)}
                  </span>
                )}
            </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!todo.completed && (
                <button 
                    onClick={handleAiBreakdown}
                    className="p-2 text-cat-accent hover:text-cat-orange-dark hover:bg-orange-50 dark:hover:bg-stone-800 rounded-lg transition-colors"
                    title="Break down with AI"
                >
                    <Sparkles size={16} />
                </button>
            )}
            <button
                onClick={() => onDelete(todo.id)}
                className="p-2 text-gray-300 dark:text-stone-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
                <Trash2 size={16} />
            </button>
        </div>
      </div>

      {/* AI Subtasks Section */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-12">
            <div className="bg-orange-50/50 dark:bg-orange-900/10 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-cat-brown dark:text-cat-orange flex items-center gap-2">
                        <CatPawIcon />
                        Plan of Attack
                    </span>
                    {isLoadingAi && <Loader2 size={14} className="animate-spin text-cat-orange" />}
                </div>
                
                {subtasks.length > 0 ? (
                    <ul className="space-y-2">
                        {subtasks.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-stone-600 dark:text-stone-400">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cat-accent flex-shrink-0" />
                                {step}
                            </li>
                        ))}
                    </ul>
                ) : !isLoadingAi && (
                    <p className="text-stone-400 dark:text-stone-600 italic">No breakdown available.</p>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

// Simple SVG icon helper
const CatPawIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-cat-orange">
        <path d="M12 2C13.1 2 14 2.9 14 4S13.1 6 12 6 10 5.1 10 4 10.9 2 12 2M17 5C18.1 5 19 5.9 19 7S18.1 9 17 9 15 8.1 15 7 15.9 5 17 5M7 5C8.1 5 9 5.9 9 7S8.1 9 7 9 5 8.1 5 7 5.9 5 7 5M12 8C15.31 8 18 10.69 18 14H6C6 10.69 8.69 8 12 8M8.8 16C9.6 15.2 10.7 14.8 11.9 14.8C13.2 14.8 14.4 15.3 15.2 16.2C15.2 16.3 15.3 16.4 15.3 16.5C15.6 17.5 15.2 18.6 14.3 19.1C13.6 19.5 12.8 19.7 12 19.7C11.1 19.7 10.3 19.4 9.6 19C8.7 18.5 8.3 17.4 8.7 16.4C8.7 16.3 8.7 16.1 8.8 16Z" />
    </svg>
);

export default TaskItem;