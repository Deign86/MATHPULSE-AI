import React, { useState, useEffect } from 'react';
import { Plus, X, Clock, Square, CheckSquare, Trash2, Edit2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserTasks,
  createTask as createFirebaseTask,
  updateTaskStatus,
  deleteTask as deleteFirebaseTask,
  updateTask as updateFirebaseTask,
} from '../services/taskService';

export interface Task {
  id: number;
  title: string;
  date: string;
  completed: boolean;
  isUrgent: boolean;
  type: 'system' | 'custom'; // system tasks are auto-generated, custom are user-added
  color?: string;
}

interface TasksBoardProps {
  initialTasks?: Task[];
  systemTasks?: Task[]; // Tasks from the system (lessons, quizzes, etc.)
}

const TasksBoard: React.FC<TasksBoardProps> = ({ initialTasks = [], systemTasks = [] }) => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  // Load tasks from Firebase
  useEffect(() => {
    const loadTasks = async () => {
      if (!currentUser) return;
      try {
        const firebaseTasks = await getUserTasks(currentUser.uid);
        const mapped: Task[] = firebaseTasks.map(t => {
          const dueDate = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
          const isToday = new Date().toDateString() === dueDate.toDateString();
          const isTomorrow = new Date(Date.now() + 86400000).toDateString() === dueDate.toDateString();
          const dateStr = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return {
            id: t.id as unknown as number, // Keep Firebase string ID in the id field
            firebaseId: t.id, // Store actual Firebase ID
            title: t.title,
            date: dateStr,
            completed: t.status === 'completed',
            isUrgent: t.priority === 'high',
            type: t.category === 'system' ? 'system' as const : 'custom' as const,
            color: t.priority === 'high' ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100',
          };
        });
        setTasks(mapped.length > 0 ? mapped : [...initialTasks]);
      } catch (err) {
        console.error('Error loading tasks:', err);
        setTasks([...initialTasks]);
      } finally {
        setTasksLoaded(true);
      }
    };
    loadTasks();
  }, [currentUser]);

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');

  const addTask = async () => {
    if (newTaskTitle.trim() === '') return;
    
    const newTask: Task = {
      id: Math.max(...tasks.map(t => typeof t.id === 'number' ? t.id : 0), 0) + 1,
      title: newTaskTitle,
      date: newTaskDate || 'No date',
      completed: false,
      isUrgent: false,
      type: 'custom',
      color: 'bg-slate-50 border border-slate-100'
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskDate('');
    setShowAddTask(false);

    // Persist to Firebase
    if (currentUser) {
      try {
        const dueDate = newTaskDate ? new Date(newTaskDate) : new Date();
        const created = await createFirebaseTask(
          currentUser.uid,
          newTaskTitle,
          '',
          dueDate,
          'medium',
          'custom'
        );
        // Update local task with Firebase ID
        setTasks(prev => prev.map(t => t.id === newTask.id ? { ...t, id: created.id as unknown as number, firebaseId: created.id } : t));
      } catch (err) {
        console.error('Error creating task:', err);
      }
    }
  };

  const toggleTask = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
    
    // Persist to Firebase
    const firebaseId = (task as any)?.firebaseId || String(id);
    try {
      await updateTaskStatus(firebaseId, task?.completed ? 'todo' : 'completed');
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const deleteTask = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    // Only allow deleting custom tasks
    setTasks(tasks.filter(task => !(task.id === id && task.type === 'custom')));
    
    // Persist to Firebase
    const firebaseId = (task as any)?.firebaseId || String(id);
    if (task?.type === 'custom') {
      try {
        await deleteFirebaseTask(firebaseId);
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  const startEditing = (task: Task) => {
    if (task.type === 'custom') {
      setEditingTask(task.id);
      setEditTitle(task.title);
      setEditDate(task.date);
    }
  };

  const saveEdit = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, title: editTitle, date: editDate } : task
    ));
    setEditingTask(null);
    setEditTitle('');
    setEditDate('');

    // Persist to Firebase
    const firebaseId = (task as any)?.firebaseId || String(id);
    try {
      await updateFirebaseTask(firebaseId, { title: editTitle });
    } catch (err) {
      console.error('Error saving task edit:', err);
    }
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditTitle('');
    setEditDate('');
  };

  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Tasks Board</h3>
          <p className="text-xs text-slate-500 mt-1">
            {incompleteTasks.length} active • {completedTasks.length} completed
          </p>
        </div>
        <button 
          onClick={() => setShowAddTask(!showAddTask)}
          className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110 shadow-md"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>

      {/* Add Task Form */}
      <AnimatePresence>
        {showAddTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3">
              <Input
                type="text"
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full bg-white border-slate-200 rounded-xl"
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <Input
                type="text"
                placeholder="Date (e.g., Tomorrow, Oct 30)..."
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                className="w-full bg-white border-slate-200 rounded-xl"
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <div className="flex gap-2">
                <Button
                  onClick={addTask}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 text-sm font-bold"
                >
                  Add Task
                </Button>
                <Button
                  onClick={() => {
                    setShowAddTask(false);
                    setNewTaskTitle('');
                    setNewTaskDate('');
                  }}
                  variant="outline"
                  className="px-4 rounded-xl border-slate-200 text-sm font-bold"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {/* Incomplete Tasks */}
        <AnimatePresence>
          {incompleteTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              layout
            >
              {editingTask === task.id ? (
                <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-2xl space-y-2">
                  <Input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-white border-blue-200 rounded-xl text-sm"
                  />
                  <Input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-white border-blue-200 rounded-xl text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveEdit(task.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-1.5 text-xs font-bold"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      variant="outline"
                      className="px-3 rounded-xl border-slate-200 text-xs font-bold"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={`${task.color || 'bg-slate-50 border border-slate-100'} p-4 rounded-2xl flex items-center justify-between group transition-all hover:shadow-md`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-slate-800 text-sm">{task.title}</h4>
                      {task.isUrgent && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-full font-bold whitespace-nowrap">
                          Due Soon
                        </span>
                      )}
                      {task.type === 'system' && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] rounded-full font-bold whitespace-nowrap">
                          Auto
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock size={12} />
                      <span className="text-xs font-medium">{task.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.type === 'custom' && (
                      <>
                        <button
                          onClick={() => startEditing(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="text-slate-400 hover:text-teal-600 transition-colors"
                    >
                      <Square size={22} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <>
            <div className="pt-4 mt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 mb-3">COMPLETED ({completedTasks.length})</p>
            </div>
            <AnimatePresence>
              {completedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: 100 }}
                  layout
                  className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between group opacity-60 hover:opacity-100 transition-all"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-500 text-sm line-through">{task.title}</h4>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock size={12} />
                      <span className="text-xs font-medium">{task.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.type === 'custom' && (
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="text-teal-600 hover:text-slate-400 transition-colors"
                    >
                      <CheckSquare size={22} strokeWidth={2} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckSquare size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No tasks yet</p>
            <p className="text-slate-300 text-xs mt-1">Click + to add your first task</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksBoard;
