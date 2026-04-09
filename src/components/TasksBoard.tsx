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
  id: string;
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
        const mapped: Task[] = firebaseTasks.map((t) => {
          const dueDate = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
          const isToday = new Date().toDateString() === dueDate.toDateString();
          const isTomorrow = new Date(Date.now() + 86400000).toDateString() === dueDate.toDateString();
          const dateStr = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return {
            id: t.id, // Use Firestore document ID directly as the primary key
            title: t.title,
            date: dateStr,
            completed: t.status === 'completed',
            isUrgent: t.priority === 'high',
            type: t.category === 'system' ? 'system' as const : 'custom' as const,
            color: t.priority === 'high' ? 'bg-red-50 border border-red-100' : 'bg-[#edf1f7] border border-[#dde3eb]',
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
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');

  const addTask = async () => {
    if (newTaskTitle.trim() === '') return;
    
    const tempId = `_tmp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newTask: Task = {
      id: tempId,
      title: newTaskTitle,
      date: newTaskDate || 'No date',
      completed: false,
      isUrgent: false,
      type: 'custom',
      color: 'bg-[#edf1f7] border border-[#dde3eb]'
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskDate('');
    setShowAddTask(false);

    // Persist to Firebase and replace temporary ID with Firestore document ID
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
        setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: created.id } : t));
      } catch (err) {
        console.error('Error creating task:', err);
      }
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
    
    // Persist to Firebase (skip tasks with temporary IDs not yet synced)
    if (!id.startsWith('_tmp_')) {
      try {
        await updateTaskStatus(id, task?.completed ? 'todo' : 'completed');
      } catch (err) {
        console.error('Error toggling task:', err);
      }
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    // Only allow deleting custom tasks
    setTasks(tasks.filter(task => !(task.id === id && task.type === 'custom')));
    
    // Persist to Firebase (skip tasks with temporary IDs not yet synced)
    if (task?.type === 'custom' && !id.startsWith('_tmp_')) {
      try {
        await deleteFirebaseTask(id);
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

  const saveEdit = async (id: string) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, title: editTitle, date: editDate } : task
    ));
    setEditingTask(null);
    setEditTitle('');
    setEditDate('');

    // Persist to Firebase (skip tasks with temporary IDs not yet synced)
    if (!id.startsWith('_tmp_')) {
      try {
        const updates: Parameters<typeof updateFirebaseTask>[1] = { title: editTitle };
        // Persist dueDate if the entered date string is parseable
        if (editDate && editDate !== 'No date') {
          const parsed = new Date(editDate);
          if (!isNaN(parsed.getTime())) {
            updates.dueDate = parsed;
          }
        }
        await updateFirebaseTask(id, updates);
      } catch (err) {
        console.error('Error saving task edit:', err);
      }
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
    <div className="bg-white rounded-xl border border-[#dde3eb] p-3 card-elevated">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-display font-bold text-[#0a1628] text-base">Tasks Board</h3>
          <p className="text-xs text-slate-500 mt-1 font-body">
            {incompleteTasks.length} active • {completedTasks.length} completed
          </p>
        </div>
        <button 
          onClick={() => setShowAddTask(!showAddTask)}
          className="w-8 h-8 bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center justify-center text-white transition-all hover:scale-110 shadow-md"
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
            <div className="bg-[#f7f9fc] border-2 border-[#dde3eb] rounded-xl p-4 space-y-3">
              <Input
                type="text"
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full bg-white border-[#dde3eb] rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <Input
                type="text"
                placeholder="Date (e.g., Tomorrow, Oct 30)..."
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
                className="w-full bg-white border-[#dde3eb] rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <div className="flex gap-2">
                <Button
                  onClick={addTask}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg py-2 text-sm font-bold font-body"
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
                  className="px-4 rounded-lg border-[#dde3eb] text-sm font-bold font-body"
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
                <div className="bg-sky-50 border-2 border-sky-300 p-4 rounded-xl space-y-2">
                  <Input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-white border-sky-200 rounded-lg text-sm"
                  />
                  <Input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-white border-sky-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveEdit(task.id)}
                      className="flex-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg py-1.5 text-xs font-bold"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      variant="outline"
                      className="px-3 rounded-lg border-[#dde3eb] text-xs font-bold"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={`${task.color || 'bg-[#f7f9fc] border border-[#dde3eb]'} p-4 rounded-xl flex items-center justify-between group transition-all hover:shadow-md`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-[#0a1628] text-sm font-body">{task.title}</h4>
                      {task.isUrgent && (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-600 text-[10px] rounded-full font-bold whitespace-nowrap">
                          Due Soon
                        </span>
                      )}
                      {task.type === 'system' && (
                        <span className="px-2 py-0.5 bg-sky-500/10 text-sky-600 text-[10px] rounded-full font-bold whitespace-nowrap">
                          Auto
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[#5a6578]">
                      <Clock size={12} />
                      <span className="text-xs font-medium font-body">{task.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.type === 'custom' && (
                      <>
                        <button
                          onClick={() => startEditing(task)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="text-slate-500 hover:text-emerald-600 transition-colors"
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
            <div className="pt-4 mt-4 border-t border-[#dde3eb]">
              <p className="text-xs font-bold text-slate-500 mb-3 font-body tracking-wider">COMPLETED ({completedTasks.length})</p>
            </div>
            <AnimatePresence>
              {completedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: 100 }}
                  layout
                  className="bg-[#f7f9fc] border border-[#dde3eb] p-4 rounded-xl flex items-center justify-between group opacity-60 hover:opacity-100 transition-all"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-500 text-sm line-through font-body">{task.title}</h4>
                    <div className="flex items-center gap-2 text-[#d1cec6]">
                      <Clock size={12} />
                      <span className="text-xs font-medium">{task.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.type === 'custom' && (
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="text-emerald-600 hover:text-slate-500 transition-colors"
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
            <div className="w-16 h-16 bg-[#edf1f7] rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckSquare size={28} className="text-[#d1cec6]" />
            </div>
            <p className="text-[#5a6578] text-sm font-medium font-body">No tasks yet</p>
            <p className="text-slate-500 text-xs mt-1 font-body">Click + to add your first task</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksBoard;
