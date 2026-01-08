import React, { useState, useEffect } from 'react';
import { Todo, TaskCategory, User } from '../types';
import TaskItem from './TaskItem';
import { Plus, Cat, LogOut, Search, SortAsc, SortDesc, MessageCircle, Sparkles, X, Loader2, Calendar } from 'lucide-react';
import { getCatMotivation, suggestCatTasks } from '../services/geminiService';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [filter, setFilter] = useState<'All' | TaskCategory>('All');
  
  // Sorting State
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Input State
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>(TaskCategory.GENERAL);
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  
  // AI State
  const [motivation, setMotivation] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const isGuest = user.id === 'guest';
  const GUEST_STORAGE_KEY = 'whiskerlist_guest_tasks';

  useEffect(() => {
    fetchTasks();
    handleNewMotivation();
  }, [user.id]);

  const fetchTasks = async () => {
    try {
        setIsLoadingTasks(true);

        if (isGuest) {
            // Guest Mode: Fetch from LocalStorage
            const stored = localStorage.getItem(GUEST_STORAGE_KEY);
            if (stored) {
                setTasks(JSON.parse(stored));
            } else {
                setTasks([]);
            }
            setIsLoadingTasks(false);
            return;
        }

        // Supabase Mode
        const { data, error } = await supabase
            .from('todos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
            const mappedTasks: Todo[] = data.map((item: any) => ({
                id: item.id,
                text: item.text,
                completed: item.completed,
                category: item.category as TaskCategory,
                createdAt: new Date(item.created_at).getTime(),
                dueDate: item.due_date ? new Date(item.due_date).getTime() : undefined
            }));
            setTasks(mappedTasks);
        }
    } catch (error) {
        console.error("Error fetching tasks:", error);
    } finally {
        setIsLoadingTasks(false);
    }
  };

  const handleNewMotivation = async () => {
    setIsAiLoading(true);
    const quote = await getCatMotivation();
    setMotivation(quote);
    setIsAiLoading(false);
  };

  const addTask = async () => {
    if (!newTaskText.trim()) return;

    try {
        const tempId = isGuest ? `guest-${Date.now()}` : Date.now().toString();
        const dueDateTimestamp = newTaskDueDate ? new Date(newTaskDueDate).getTime() : undefined;
        
        const newTask: Todo = {
            id: tempId,
            text: newTaskText,
            completed: false,
            category: newTaskCategory,
            createdAt: Date.now(),
            dueDate: dueDateTimestamp
        };
        
        if (isGuest) {
            const updatedTasks = [newTask, ...tasks];
            setTasks(updatedTasks);
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updatedTasks));
            setNewTaskText('');
            setNewTaskDueDate('');
            return;
        }

        // Optimistic update for Supabase
        setTasks([newTask, ...tasks]);
        setNewTaskText('');
        setNewTaskDueDate('');

        const { data, error } = await supabase
            .from('todos')
            .insert([{
                text: newTaskText,
                category: newTaskCategory,
                completed: false,
                user_id: user.id,
                created_at: new Date().toISOString(),
                due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null
            }])
            .select()
            .single();

        if (error) throw error;

        // Replace optimistic task with real one
        if (data) {
            setTasks(prev => prev.map(t => t.id === tempId ? {
                id: data.id,
                text: data.text,
                completed: data.completed,
                category: data.category as TaskCategory,
                createdAt: new Date(data.created_at).getTime(),
                dueDate: data.due_date ? new Date(data.due_date).getTime() : undefined
            } : t));
        }

    } catch (error) {
        console.error("Error adding task:", error);
        if (!isGuest) fetchTasks(); 
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = !task.completed;
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, completed: newStatus } : t);
    setTasks(updatedTasks);

    if (isGuest) {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updatedTasks));
        return;
    }

    try {
        const { error } = await supabase
            .from('todos')
            .update({ completed: newStatus })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error updating task:", error);
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !newStatus } : t));
    }
  };

  const updateTaskText = async (id: string, newText: string) => {
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, text: newText } : t);
    setTasks(updatedTasks);

    if (isGuest) {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updatedTasks));
        return;
    }

    try {
        const { error } = await supabase
            .from('todos')
            .update({ text: newText })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error updating task text:", error);
        fetchTasks(); 
    }
  };

  const deleteTask = async (id: string) => {
    const originalTasks = [...tasks];
    const newTasks = tasks.filter(t => t.id !== id);
    setTasks(newTasks);

    if (isGuest) {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(newTasks));
        return;
    }

    try {
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting task:", error);
        setTasks(originalTasks);
    }
  };

  const handleAiSuggestions = async () => {
      setIsAiLoading(true);
      try {
          const suggestions = await suggestCatTasks();
          if(suggestions.length > 0) {
              if (isGuest) {
                   const mappedNewTasks = suggestions.map((t, idx) => ({
                       id: `guest-ai-${Date.now()}-${idx}`,
                       text: t.text,
                       completed: false,
                       category: t.category,
                       createdAt: Date.now(),
                       dueDate: undefined
                   }));
                   const updatedTasks = [...mappedNewTasks, ...tasks];
                   setTasks(updatedTasks);
                   localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updatedTasks));
              } else {
                  // Prepare tasks for DB insertion
                  const dbTasks = suggestions.map(t => ({
                      text: t.text,
                      category: t.category,
                      completed: false,
                      user_id: user.id,
                      created_at: new Date().toISOString(),
                      due_date: null 
                  }));

                  const { data, error } = await supabase
                      .from('todos')
                      .insert(dbTasks)
                      .select();

                  if (error) throw error;

                  if (data) {
                      const mappedNewTasks: Todo[] = data.map((item: any) => ({
                        id: item.id,
                        text: item.text,
                        completed: item.completed,
                        category: item.category as TaskCategory,
                        createdAt: new Date(item.created_at).getTime(),
                        dueDate: item.due_date ? new Date(item.due_date).getTime() : undefined
                    }));
                    setTasks(prev => [...mappedNewTasks, ...prev]);
                  }
              }
          }
      } catch (error) {
          console.error("Error adding AI tasks:", error);
      } finally {
          setIsAiLoading(false);
          setShowAiModal(false);
      }
  }

  // Filtering and Sorting Logic
  const filteredAndSortedTasks = tasks
    .filter(t => filter === 'All' || t.category === filter)
    .sort((a, b) => {
        const dateA = a.dueDate ?? (sortOrder === 'asc' ? 8640000000000000 : 0);
        const dateB = b.dueDate ?? (sortOrder === 'asc' ? 8640000000000000 : 0);

        if (dateA !== dateB) {
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }
        return b.createdAt - a.createdAt;
    });

  return (
    <div className="min-h-screen bg-cat-cream pb-12">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-cat-orange p-1.5 rounded-lg">
              <Cat className="text-white" size={20} />
            </div>
            <span className="font-bold text-cat-brown text-xl hidden sm:inline">WhiskerList</span>
          </div>

          <div className="flex items-center gap-4">
            {isGuest && (
                 <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded uppercase tracking-wide">Guest Mode</span>
            )}
            <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
                <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full" />
                <span className="text-sm font-medium text-stone-600 hidden sm:inline">{user.name}</span>
            </div>
            <button 
                onClick={onLogout}
                className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                title="Sign out"
            >
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Welcome & Motivation */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-cat-brown mb-2">Hello, {user.name.split(' ')[0]}! 🐾</h1>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-start gap-4">
                <div className="bg-cat-accent/20 p-2 rounded-full flex-shrink-0">
                    <MessageCircle size={24} className="text-cat-orange-dark" />
                </div>
                <div className="flex-grow">
                    <p className="text-stone-600 italic">"{motivation}"</p>
                    <button 
                        onClick={handleNewMotivation}
                        disabled={isAiLoading}
                        className="text-xs text-cat-orange-dark font-semibold mt-2 hover:underline disabled:opacity-50"
                    >
                        {isAiLoading ? "Thinking..." : "New Purr-spective"}
                    </button>
                </div>
            </div>
        </div>

        {/* Input Area */}
        <div className="bg-white p-2 rounded-2xl shadow-lg border border-stone-100 mb-8 flex flex-col sm:flex-row gap-2">
            <div className="flex-grow relative">
                <input 
                    type="text" 
                    placeholder="What needs doing right meow?" 
                    className="w-full h-12 pl-4 pr-12 rounded-xl bg-transparent outline-none text-stone-700 placeholder:text-stone-400"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTask()}
                />
                <button 
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-cat-gray hover:text-cat-orange transition-colors"
                    onClick={() => setShowAiModal(true)}
                    title="Get AI Suggestions"
                >
                    <Sparkles size={18} />
                </button>
            </div>
            
            <div className="flex items-center gap-2 px-2 sm:px-0">
                 {/* Date Picker Input */}
                <div className="relative">
                    <input 
                        type="date" 
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="h-10 px-3 rounded-lg bg-stone-100 border-none text-xs font-medium text-stone-600 outline-none cursor-pointer hover:bg-stone-200 transition-colors w-32"
                    />
                </div>

                <select 
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                    className="h-10 px-3 rounded-lg bg-stone-100 border-none text-xs font-medium text-stone-600 outline-none cursor-pointer hover:bg-stone-200 transition-colors"
                >
                    {Object.values(TaskCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <button 
                    onClick={addTask}
                    disabled={isLoadingTasks}
                    className="h-10 px-4 sm:px-6 bg-cat-brown text-white rounded-xl font-medium hover:bg-stone-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 duration-200 disabled:opacity-70"
                >
                    {isLoadingTasks ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    <span className="hidden sm:inline">Add</span>
                </button>
            </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-grow">
                <button
                    onClick={() => setFilter('All')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        filter === 'All' 
                        ? 'bg-cat-brown text-white shadow-md' 
                        : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-200'
                    }`}
                >
                    All Tasks
                </button>
                {Object.values(TaskCategory).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            filter === cat 
                            ? 'bg-cat-brown text-white shadow-md' 
                            : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-200'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-stone-600 font-medium text-sm border border-stone-200 hover:bg-stone-50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
                {sortOrder === 'asc' ? (
                    <>
                        <SortAsc size={16} />
                        <span>Date: Asc</span>
                    </>
                ) : (
                    <>
                        <SortDesc size={16} />
                        <span>Date: Desc</span>
                    </>
                )}
            </button>
        </div>

        {/* Task List */}
        <div className="space-y-3">
            {isLoadingTasks ? (
                 <div className="text-center py-12">
                     <Loader2 className="animate-spin mx-auto text-cat-orange mb-2" size={32} />
                     <p className="text-stone-400 text-sm">Hunting for tasks...</p>
                 </div>
            ) : filteredAndSortedTasks.length === 0 ? (
                <div className="text-center py-12 opacity-50">
                    <Cat size={48} className="mx-auto mb-4 text-stone-300" />
                    <p className="text-stone-400 font-medium">No tasks found. Time for a nap?</p>
                </div>
            ) : (
                filteredAndSortedTasks.map(task => (
                    <TaskItem 
                        key={task.id} 
                        todo={task} 
                        onToggle={toggleTask} 
                        onDelete={deleteTask}
                        onUpdate={updateTaskText}
                    />
                ))
            )}
        </div>
      </main>

        {/* AI Suggestions Modal */}
        {showAiModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-cat-brown flex items-center gap-2">
                            <Sparkles className="text-cat-orange" size={20}/> 
                            Cat Assistant
                        </h3>
                        <button onClick={() => setShowAiModal(false)} className="text-stone-400 hover:text-stone-600">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-stone-600 mb-6 text-sm">
                        Running low on ideas? Let the AI generate some "important" cat business for you.
                    </p>
                    <button 
                        onClick={handleAiSuggestions}
                        disabled={isAiLoading}
                        className="w-full py-3 bg-cat-orange text-white rounded-xl font-bold hover:bg-cat-orange-dark transition-colors flex items-center justify-center gap-2"
                    >
                        {isAiLoading ? <Loader2 className="animate-spin" /> : "Generate Tasks"}
                    </button>
                </div>
            </div>
        )}

    </div>
  );
};

export default Dashboard;