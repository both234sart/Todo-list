import React, { useState, useEffect, useRef } from 'react';
import { Todo, TaskCategory, User } from '../types';
import TaskItem from './TaskItem';
import { Plus, Cat, LogOut, Search, SortAsc, SortDesc, MessageCircle, Sparkles, X, Loader2, Calendar, Bell, BellOff, List, Moon, Sun, Filter, CheckCircle2, Circle } from 'lucide-react';
import { getCatMotivation, suggestCatTasks } from '../services/geminiService';
import { supabase } from '../lib/supabase';
import { CATEGORY_COLORS } from '../constants';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [filter, setFilter] = useState<'All' | TaskCategory>('All');
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sorting and Filtering State
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'manual'>('manual');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Incomplete'>('All');
  
  // Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Input State
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>(TaskCategory.GENERAL);
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  
  // AI State
  const [motivation, setMotivation] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTheme, setAiTheme] = useState('');

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  const isGuest = user.id === 'guest';
  const GUEST_STORAGE_KEY = 'whiskerlist_guest_tasks';

  useEffect(() => {
    // Initialize Theme
    const savedTheme = localStorage.getItem('whiskerlist_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    fetchTasks();
    handleNewMotivation();
    
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, [user.id]);

  useEffect(() => {
    if (notificationsEnabled) {
      checkDueTasks();
    }
  }, [tasks, notificationsEnabled]);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('whiskerlist_theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('whiskerlist_theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support desktop notification");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    if (permission === 'granted') {
      new Notification('WhiskerList 🐾', {
        body: "Notifications enabled! We'll remind you about upcoming tasks.",
      });
      checkDueTasks();
    }
  };

  const checkDueTasks = () => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    tasks.forEach(task => {
      if (!task.completed && task.dueDate && !notifiedTasksRef.current.has(task.id)) {
        const timeLeft = task.dueDate - now;
        // Notify if due within the next 24 hours (and not way in the past)
        if (timeLeft < twentyFourHours && timeLeft > -3600000) {
           new Notification('Upcoming Task! 🐾', {
             body: `Meow! Don't forget: "${task.text}" is due ${timeLeft < 0 ? 'now!' : 'soon!'}`,
             icon: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' // Generic cat icon URL fallback
           });
           notifiedTasksRef.current.add(task.id);
        }
      }
    });
  };

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
        // Set due date to noon to avoid timezone edge cases on the exact start of day
        const dueDateTimestamp = newTaskDueDate ? new Date(newTaskDueDate + 'T12:00:00').getTime() : undefined;
        
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
                due_date: newTaskDueDate ? new Date(newTaskDueDate + 'T12:00:00').toISOString() : null
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
    const tasksAfterDelete = tasks.filter(t => t.id !== id);
    const originalTasks = [...tasks];
    
    // Update State Optimistically
    setTasks(tasksAfterDelete);

    if (isGuest) {
        try {
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(tasksAfterDelete));
        } catch (e) {
            console.error("Failed to update local storage", e);
            setTasks(originalTasks); // Revert on failure
        }
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
        setTasks(originalTasks); // Revert on failure
    }
  };

  const handleAiSuggestions = async () => {
      setIsAiLoading(true);
      try {
          const suggestions = await suggestCatTasks(aiTheme);
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
          setAiTheme('');
      }
  }

  // Handle Drag and Drop
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    // Create a copy of the tasks
    const _tasks = [...tasks];
    
    // We need to identify the tasks by the current visual list order
    // But we are sorting the *main* task list.
    // If we are filtering, drag-and-drop behaves weirdly if we just use indices of the filtered list against the main list.
    // So, we need to find the specific items in the main list.
    
    const visualList = filteredAndSortedTasks;
    const draggedTask = visualList[dragItem.current];
    const targetTask = visualList[dragOverItem.current];
    
    // Find their real indices in the main list
    const draggedTaskIndex = _tasks.findIndex(t => t.id === draggedTask.id);
    const targetTaskIndex = _tasks.findIndex(t => t.id === targetTask.id);
    
    if (draggedTaskIndex === -1 || targetTaskIndex === -1) return;

    // Remove dragged task
    const [reorderedItem] = _tasks.splice(draggedTaskIndex, 1);
    // Insert at new position
    _tasks.splice(targetTaskIndex, 0, reorderedItem);
    
    setTasks(_tasks);
    setSortOrder('manual'); // Switch to manual sort so auto-sort doesn't revert the change immediately
    
    if (isGuest) {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(_tasks));
    }

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const cycleSortOrder = () => {
      setSortOrder(prev => {
          if (prev === 'manual') return 'asc';
          if (prev === 'asc') return 'desc';
          return 'manual';
      });
  };

  const cycleStatusFilter = () => {
      setStatusFilter(prev => {
          if (prev === 'All') return 'Incomplete';
          if (prev === 'Incomplete') return 'Completed';
          return 'All';
      });
  };

  // Filtering and Sorting Logic
  const filteredAndSortedTasks = tasks
    .filter(t => {
        const matchesCategory = filter === 'All' || t.category === filter;
        const matchesStatus = statusFilter === 'All' 
            ? true 
            : statusFilter === 'Completed' 
                ? t.completed 
                : !t.completed;
        return matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
        if (sortOrder === 'manual') return 0; // Keep array order

        const dateA = a.dueDate ?? (sortOrder === 'asc' ? 8640000000000000 : 0);
        const dateB = b.dueDate ?? (sortOrder === 'asc' ? 8640000000000000 : 0);

        if (dateA !== dateB) {
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }
        return b.createdAt - a.createdAt;
    });

  return (
    <div className="min-h-screen bg-cat-cream dark:bg-stone-950 pb-12 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-10 shadow-sm transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-cat-orange p-1.5 rounded-lg">
              <Cat className="text-white" size={20} />
            </div>
            <span className="font-bold text-cat-brown dark:text-stone-100 text-xl hidden sm:inline">WhiskerList</span>
          </div>

          <div className="flex items-center gap-4">
            {isGuest && (
                 <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold rounded uppercase tracking-wide">Guest Mode</span>
            )}

            <button
                onClick={toggleTheme}
                className="p-2 text-stone-400 hover:text-cat-orange hover:bg-stone-50 dark:hover:bg-stone-800 rounded-full transition-colors"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button
              onClick={requestNotificationPermission}
              className={`p-2 rounded-full transition-colors ${notificationsEnabled ? 'text-cat-orange bg-orange-50 dark:bg-stone-800' : 'text-stone-400 hover:text-cat-orange hover:bg-stone-50 dark:hover:bg-stone-800'}`}
              title={notificationsEnabled ? "Notifications active" : "Enable notifications"}
            >
                {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
            </button>

            <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700">
                <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full" />
                <span className="text-sm font-medium text-stone-600 dark:text-stone-300 hidden sm:inline">{user.name}</span>
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
            <h1 className="text-3xl font-bold text-cat-brown dark:text-stone-100 mb-2">Hello, {user.name.split(' ')[0]}! 🐾</h1>
            <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 flex items-start gap-4 transition-colors">
                <div className="bg-cat-accent/20 dark:bg-cat-accent/10 p-2 rounded-full flex-shrink-0">
                    <MessageCircle size={24} className="text-cat-orange-dark dark:text-cat-orange" />
                </div>
                <div className="flex-grow">
                    <p className="text-stone-600 dark:text-stone-300 italic">"{motivation}"</p>
                    <button 
                        onClick={handleNewMotivation}
                        disabled={isAiLoading}
                        className="text-xs text-cat-orange-dark dark:text-cat-orange font-semibold mt-2 hover:underline disabled:opacity-50"
                    >
                        {isAiLoading ? "Thinking..." : "New Purr-spective"}
                    </button>
                </div>
            </div>
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-stone-900 p-2 rounded-2xl shadow-lg border border-stone-100 dark:border-stone-800 mb-8 flex flex-col sm:flex-row gap-2 transition-colors">
            <div className="flex-grow relative">
                <input 
                    type="text" 
                    placeholder="What needs doing right meow?" 
                    className="w-full h-12 pl-4 pr-12 rounded-xl bg-transparent outline-none text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500"
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
                        className="h-10 px-3 rounded-lg bg-stone-100 dark:bg-stone-800 border-none text-xs font-medium text-stone-600 dark:text-stone-300 outline-none cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors w-32 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                </div>

                <select 
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                    className="h-10 px-3 rounded-lg bg-stone-100 dark:bg-stone-800 border-none text-xs font-medium text-stone-600 dark:text-stone-300 outline-none cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                    {Object.values(TaskCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <button 
                    onClick={addTask}
                    disabled={isLoadingTasks}
                    className="h-10 px-4 sm:px-6 bg-cat-brown dark:bg-cat-orange dark:text-stone-900 text-white rounded-xl font-medium hover:bg-stone-700 dark:hover:bg-cat-orange-dark transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 duration-200 disabled:opacity-70"
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
                        ? 'bg-cat-brown text-white shadow-md dark:bg-cat-orange dark:text-stone-900' 
                        : 'bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800'
                    }`}
                >
                    All Tasks
                </button>
                {Object.values(TaskCategory).map(cat => {
                    const isActive = filter === cat;
                    const colorClass = CATEGORY_COLORS[cat];
                    
                    return (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                                isActive 
                                ? `${colorClass} shadow-md ring-2 ring-offset-1 ring-stone-200 dark:ring-stone-700 scale-105` 
                                : `${colorClass} opacity-60 hover:opacity-100 hover:shadow-sm`
                            }`}
                        >
                            {cat}
                        </button>
                    );
                })}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={cycleStatusFilter}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 font-medium text-sm border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                    {statusFilter === 'All' && (
                        <>
                            <Filter size={16} />
                            <span>Status: All</span>
                        </>
                    )}
                    {statusFilter === 'Incomplete' && (
                        <>
                            <Circle size={16} />
                            <span>Active</span>
                        </>
                    )}
                    {statusFilter === 'Completed' && (
                        <>
                            <CheckCircle2 size={16} />
                            <span>Completed</span>
                        </>
                    )}
                </button>

                <button
                    onClick={cycleSortOrder}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 font-medium text-sm border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                    {sortOrder === 'asc' && (
                        <>
                            <SortAsc size={16} />
                            <span>Date: Asc</span>
                        </>
                    )}
                    {sortOrder === 'desc' && (
                        <>
                            <SortDesc size={16} />
                            <span>Date: Desc</span>
                        </>
                    )}
                    {sortOrder === 'manual' && (
                        <>
                            <List size={16} />
                            <span>Manual</span>
                        </>
                    )}
                </button>
            </div>
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
                    <Cat size={48} className="mx-auto mb-4 text-stone-300 dark:text-stone-600" />
                    <p className="text-stone-400 dark:text-stone-500 font-medium">No tasks found. Time for a nap?</p>
                </div>
            ) : (
                filteredAndSortedTasks.map((task, index) => (
                    <TaskItem 
                        key={task.id} 
                        todo={task} 
                        onToggle={toggleTask} 
                        onDelete={deleteTask}
                        onUpdate={updateTaskText}
                        draggable={sortOrder === 'manual'}
                        onDragStart={() => dragItem.current = index}
                        onDragEnter={() => dragOverItem.current = index}
                        onDragEnd={handleSort}
                    />
                ))
            )}
        </div>
      </main>

        {/* AI Suggestions Modal */}
        {showAiModal && (
            <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200 border border-stone-100 dark:border-stone-800">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-cat-brown dark:text-stone-100 flex items-center gap-2">
                            <Sparkles className="text-cat-orange" size={20}/> 
                            Cat Assistant
                        </h3>
                        <button onClick={() => setShowAiModal(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 mb-4 text-sm">
                        Running low on ideas? Let the AI generate some "important" cat business for you.
                    </p>

                    <div className="mb-6">
                        <input 
                            type="text" 
                            value={aiTheme}
                            onChange={(e) => setAiTheme(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAiSuggestions()}
                            placeholder="e.g. hunting, napping, accounting..." 
                            className="w-full px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:border-cat-orange dark:focus:border-cat-orange focus:ring-2 focus:ring-cat-orange/20 outline-none text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 transition-all text-sm"
                        />
                    </div>

                    <button 
                        onClick={handleAiSuggestions}
                        disabled={isAiLoading}
                        className="w-full py-3 bg-cat-orange text-white dark:text-stone-900 rounded-xl font-bold hover:bg-cat-orange-dark transition-colors flex items-center justify-center gap-2"
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