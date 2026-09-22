import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Clock,
  PanelRight,
  Edit2,
  Check,
  X,
  Calendar as CalendarIcon,
  AlignLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { CalendarEvent } from '../types/models';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  subscribeToUserCalendarEvents,
} from '../services/calendarService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const pad2 = (value: number) => String(value).padStart(2, '0');

const toDateKey = (date: Date) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const startOfCalendarGrid = (month: Date) => {
  const first = startOfMonth(month);
  const day = first.getDay(); // 0=Sun
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - day);
  gridStart.setHours(0, 0, 0, 0);
  return gridStart;
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const monthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const formatTime = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const parseDateTime = (dateStr: string, timeStr: string) => {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  const [hh, mm] = timeStr.split(':').map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
};

const EVENT_COLORS = ['purple', 'blue', 'emerald', 'amber', 'rose'] as const;
type EventColor = typeof EVENT_COLORS[number];

const getColorHex = (color: EventColor) => {
  switch (color) {
    case 'blue': return '#3b82f6';
    case 'emerald': return '#10b981';
    case 'amber': return '#f59e0b';
    case 'rose': return '#f43f5e';
    case 'purple':
    default: return '#a855f7';
  }
};

const getGridEventClasses = (color?: string, isSchedule = false) => {
  if (isSchedule) return 'bg-blue-50 text-blue-700 border-blue-100 opacity-80';
  switch (color) {
    case 'blue': return 'bg-blue-50 text-blue-700 border-blue-100 opacity-90 hover:bg-blue-100';
    case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-100 opacity-90 hover:bg-emerald-100';
    case 'amber': return 'bg-amber-50 text-amber-700 border-amber-100 opacity-90 hover:bg-amber-100';
    case 'rose': return 'bg-rose-50 text-rose-700 border-rose-100 opacity-90 hover:bg-rose-100';
    case 'purple':
    default: return 'bg-purple-50 text-purple-700 border-purple-100 opacity-90 hover:bg-purple-100';
  }
};

const getTimelineEventClasses = (color?: string, isSchedule = false) => {
  if (isSchedule) return { dot: 'bg-[#3b82f6]', border: 'border-l-blue-400', time: 'text-blue-600 border-blue-50' };
  switch (color) {
    case 'blue': return { dot: 'bg-blue-500', border: 'border-l-blue-400', time: 'text-blue-600 border-blue-50' };
    case 'emerald': return { dot: 'bg-emerald-500', border: 'border-l-emerald-400', time: 'text-emerald-600 border-emerald-50' };
    case 'amber': return { dot: 'bg-amber-500', border: 'border-l-amber-400', time: 'text-amber-600 border-amber-50' };
    case 'rose': return { dot: 'bg-rose-500', border: 'border-l-rose-400', time: 'text-rose-600 border-rose-50' };
    case 'purple':
    default: return { dot: 'bg-[#a855f7]', border: 'border-l-[#a855f7]', time: 'text-[#a855f7] border-purple-50' };
  }
};

const getDotColorClass = (color?: string, isSchedule = false) => {
  if (isSchedule) return 'bg-blue-500';
  switch (color) {
    case 'blue': return 'bg-blue-500';
    case 'emerald': return 'bg-emerald-500';
    case 'amber': return 'bg-amber-500';
    case 'rose': return 'bg-rose-500';
    case 'purple':
    default: return 'bg-purple-500';
  }
};

interface TeacherCalendarViewProps {
  classes?: { id: string; name: string; schedule: string }[];
  teacherId?: string;
}

const DAY_PATTERNS = [
  { names: ['sun', 'sunday'], day: 0 },
  { names: ['mon', 'monday'], day: 1 },
  { names: ['tue', 'tues', 'tuesday'], day: 2 },
  { names: ['wed', 'wednesday'], day: 3 },
  { names: ['thu', 'thurs', 'thursday'], day: 4 },
  { names: ['fri', 'friday'], day: 5 },
  { names: ['sat', 'saturday'], day: 6 },
];

function parseScheduleDays(schedule: string): number[] {
  const lower = schedule.toLowerCase();
  const days = new Set<number>();

  if (lower.includes('daily') || lower.includes('everyday')) return [0, 1, 2, 3, 4, 5, 6];
  if (lower.includes('weekends')) return [0, 6];
  if (lower.includes('weekdays')) return [1, 2, 3, 4, 5];

  const rangeMatch = lower.match(/(mon|tue|wed|thu|fri|sat|sun)[\s/-]*(mon|tue|wed|thu|fri|sat|sun)/);
  if (rangeMatch) {
    const startDay = DAY_PATTERNS.find(p => p.names.includes(rangeMatch[1]))?.day;
    const endDay = DAY_PATTERNS.find(p => p.names.includes(rangeMatch[2]))?.day;
    if (startDay !== undefined && endDay !== undefined) {
      let current = startDay;
      while (true) {
        days.add(current);
        if (current === endDay) break;
        current = (current + 1) % 7;
      }
      return Array.from(days);
    }
  }

  DAY_PATTERNS.forEach(({ names, day }) => {
    if (names.some(n => lower.includes(n))) days.add(day);
  });

  return Array.from(days).sort((a, b) => a - b);
}

const TeacherCalendarView: React.FC<TeacherCalendarViewProps> = ({
  classes,
  teacherId,
}) => {
  const { currentUser } = useAuth();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  const [month, setMonth] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const [hiddenScheduleIds, setHiddenScheduleIds] = useState<Set<string>>(new Set());

  // Editor Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(() => toDateKey(new Date()));
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('');
  const [formColor, setFormColor] = useState<EventColor>('purple');

  // View Modal State
  const [viewEventOpen, setViewEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setError('');
    setLoading(true);

    const unsubscribe = subscribeToUserCalendarEvents(
      currentUser.uid,
      { limitCount: 500 },
      (items) => {
        setEvents(items);
        setLoading(false);
      },
      () => {
        setError('Unable to load calendar events right now.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const monthStart = useMemo(() => {
    const d = startOfMonth(month);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [month]);

  const monthEnd = useMemo(() => {
    const d = endOfMonth(month);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [month]);

  const scheduleEvents = useMemo(() => {
    if (!classes || classes.length === 0) return [];
    const evs: CalendarEvent[] = [];
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      classes.forEach((cls) => {
        const days = parseScheduleDays(cls.schedule);
        if (days.includes(dayOfWeek)) {
          const id = `schedule-${cls.id}-${toDateKey(current)}`;
          if (!hiddenScheduleIds.has(id)) {
            evs.push({
              id,
              userId: teacherId || '',
              title: cls.name,
              startTime: new Date(current),
              createdAt: new Date(),
            });
          }
        }
      });
      current.setDate(current.getDate() + 1);
    }
    return evs;
  }, [classes, month, teacherId, hiddenScheduleIds]);

  const allEvents = useMemo(() => [...events, ...scheduleEvents], [events, scheduleEvents]);

  const monthEvents = useMemo(() => {
    return allEvents
      .filter((e) => e.startTime >= monthStart && e.startTime <= monthEnd)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [allEvents, monthStart, monthEnd]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of monthEvents) {
      const key = toDateKey(ev.startTime);
      const list = map.get(key) || [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [monthEvents]);

  const selectedKey = useMemo(() => toDateKey(selectedDay), [selectedDay]);

  const dayEvents = useMemo(() => {
    const list = eventsByDay.get(selectedKey) || [];
    return [...list].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [eventsByDay, selectedKey]);

  const gridDays = useMemo(() => {
    const start = startOfCalendarGrid(month);
    return Array.from({ length: 42 }).map((_, idx) => addDays(start, idx));
  }, [month]);

  const openAdd = (day: Date) => {
    const key = toDateKey(day);
    setEditingEventId(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(key);
    setFormStartTime('09:00');
    setFormEndTime('');
    setFormColor('purple');
    setIsAddOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    if (ev.id.startsWith('schedule-')) {
      setHiddenScheduleIds(prev => new Set(prev).add(ev.id));
      setEditingEventId(null);
    } else {
      setEditingEventId(ev.id);
    }
    setFormTitle(ev.title);
    setFormDescription(ev.description || '');
    setFormDate(toDateKey(ev.startTime));
    setFormStartTime(pad2(ev.startTime.getHours()) + ':' + pad2(ev.startTime.getMinutes()));
    setFormEndTime(ev.endTime ? (pad2(ev.endTime.getHours()) + ':' + pad2(ev.endTime.getMinutes())) : '');
    setFormColor(ev.color || 'purple');
    setViewEventOpen(false);
    setIsAddOpen(true);
  };

  const openView = (e: React.MouseEvent, ev: CalendarEvent) => {
    e.stopPropagation();
    setSelectedEvent(ev);
    setViewEventOpen(true);
  };

  const handleSave = async () => {
    const uid = currentUser?.uid || teacherId || 'local-user';
    if (!formTitle.trim()) {
      setError('Event title is required.');
      return;
    }

    setSaving(true);
    setError('');

    const start = parseDateTime(formDate, formStartTime);
    const end = formEndTime ? parseDateTime(formDate, formEndTime) : undefined;
    const evData = {
      title: formTitle.trim(),
      description: formDescription.trim() ? formDescription.trim() : undefined,
      startTime: start,
      endTime: end && end.getTime() > start.getTime() ? end : undefined,
      color: formColor,
    };

    try {
      if (editingEventId) {
        setEvents(prev => prev.map(e => e.id === editingEventId ? { ...e, ...evData } : e));
        await updateCalendarEvent(editingEventId, evData);
      } else {
        const tempId = `temp-${Date.now()}`;
        setEvents(prev => [...prev, { id: tempId, userId: uid, createdAt: new Date(), ...evData }]);
        await createCalendarEvent(uid, evData);
      }
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
      setIsAddOpen(false); // Optimistic UI holds
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (eventId.startsWith('schedule-')) {
      setHiddenScheduleIds(prev => new Set(prev).add(eventId));
      if (selectedEvent?.id === eventId) setViewEventOpen(false);
      return;
    }

    setError('');
    setEvents(prev => prev.filter(e => e.id !== eventId));
    if (selectedEvent?.id === eventId) setViewEventOpen(false);

    try {
      await deleteCalendarEvent(eventId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col px-2 sm:px-6 xl:px-8 py-2 sm:py-6 xl:py-8 pb-32 sm:pb-36 lg:pb-8 overflow-y-auto">
      {/* Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 flex-1 min-h-0 w-full max-w-[1400px] mx-auto">
        
        {/* Main Calendar Area */}
        <div className={`flex flex-col flex-1 min-w-0 transition-all duration-500 ${showSidebar ? 'lg:w-[65%] xl:w-[70%]' : 'lg:w-full'}`}>
          <div className="bg-white/90 backdrop-blur-[12px] rounded-[18px] sm:rounded-[24px] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-full">
            
            {/* Solid Calendar Header */}
            <div className="p-3 sm:p-5 lg:p-6 border-b border-purple-500/30 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 shrink-0 flex items-center justify-between gap-2 sm:gap-3 rounded-t-[18px] sm:rounded-t-[24px] relative overflow-hidden group text-white">
              {/* Subtle background decoration */}
              <div className="absolute -bottom-24 -right-12 w-64 h-64 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute -top-20 left-1/4 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
              
              <div className="flex items-center gap-1.5 sm:gap-4 relative z-10">
                <button
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  aria-label="Previous month"
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[#6d28d9] bg-white hover:bg-slate-50 transition-all shadow-xs hover:shadow-sm active:scale-90"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </button>
                <h2 className="text-sm sm:text-lg md:text-[22px] font-bold text-white tracking-tight select-none">
                  {monthLabel(month)}
                </h2>
                <button
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  aria-label="Next month"
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[#6d28d9] bg-white hover:bg-slate-50 transition-all shadow-xs hover:shadow-sm active:scale-90"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 relative z-10">
                <span className="text-[11px] sm:text-[13px] font-bold text-[#6d28d9] bg-white px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-xs">
                  {monthEvents.length} events
                </span>
                <button 
                  onClick={() => setShowSidebar(!showSidebar)}
                  className={`hidden lg:flex w-8 h-8 sm:w-9 sm:h-9 rounded-full items-center justify-center transition-all shadow-xs hover:shadow-sm border ${
                    showSidebar ? 'text-[#6d28d9] bg-white border-white' : 'text-white bg-white/20 border-white/30 backdrop-blur-md'
                  }`}
                  title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
                  aria-label={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
                >
                  <PanelRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid Wrapper */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
              {/* Weekdays */}
              <div className="grid grid-cols-7 w-full text-center border-b border-slate-200/60 py-2 sm:py-3.5 shrink-0 bg-white z-20 px-1 sm:px-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-[10px] sm:text-[12px] font-bold text-[#475569] uppercase tracking-wider">
                    <span className="xs:hidden">{day[0]}</span>
                    <span className="hidden xs:inline sm:hidden">{day.slice(0, 2)}</span>
                    <span className="hidden sm:inline">{day}</span>
                  </div>
                ))}
              </div>

              {/* Days Grid - fits in one glance on mobile */}
              <div className="grid grid-cols-7 w-full gap-1 sm:gap-2 p-1.5 sm:p-4">
                {gridDays.map((day) => {
                  const key = toDateKey(day);
                  const dayEvs = eventsByDay.get(key) || [];
                  const selected = isSameDay(day, selectedDay);
                  const today = isSameDay(day, new Date());
                  const inMonth = isSameMonth(day, month);

                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedDay(new Date(day))}
                      className={`group p-1 sm:p-2 rounded-xl sm:rounded-2xl transition-all cursor-pointer border flex flex-col justify-between items-center sm:items-stretch relative min-h-[46px] xs:min-h-[52px] sm:min-h-[72px] md:min-h-[96px] ${
                        selected
                          ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/40 shadow-xs z-10'
                          : today 
                            ? 'bg-purple-50/25 border-purple-300/80 hover:bg-purple-50/40'
                            : 'border-transparent hover:bg-slate-50/80 hover:border-slate-200'
                      } ${!inMonth ? 'opacity-30 grayscale' : ''}`}
                    >
                      <div className="flex justify-center sm:justify-between items-center w-full">
                        <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[12px] sm:text-[14px] transition-all ${
                          today
                            ? 'bg-gradient-to-br from-[#a855f7] to-[#9333ea] text-white shadow-xs'
                            : selected ? 'bg-purple-600 text-white font-black' : 'text-[#1e293b]'
                        }`}>
                          {day.getDate()}
                        </span>
                      </div>

                      {/* Mobile Event Dots (One Glance Indicator) */}
                      <div className="md:hidden flex items-center justify-center gap-0.5 mt-0.5 min-h-[6px]">
                        {dayEvs.slice(0, 3).map((ev) => {
                          const isSchedule = ev.id.startsWith('schedule-');
                          return (
                            <span
                              key={ev.id}
                              className={`w-1 h-1 xs:w-1.5 xs:h-1.5 rounded-full shrink-0 ${getDotColorClass(ev.color, isSchedule)}`}
                            />
                          );
                        })}
                        {dayEvs.length > 3 && (
                          <span className="text-[7.5px] xs:text-[8px] font-black text-purple-600 leading-none">
                            +
                          </span>
                        )}
                      </div>

                      {/* Desktop Event Pills */}
                      <div className="hidden md:block mt-1 space-y-1">
                        {dayEvs.slice(0, 3).map((ev) => {
                          const isSchedule = ev.id.startsWith('schedule-');
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => openView(e, ev)}
                              className={`w-full truncate text-[11px] font-bold px-2 py-1 rounded border shadow-2xs transition-all hover:-translate-y-[1px] hover:shadow-xs cursor-pointer ${getGridEventClasses(ev.color, isSchedule)}`}
                            >
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvs.length > 3 && (
                          <div className="text-[10px] font-bold text-[#64748b] pl-1 pt-0.5">
                            +{dayEvs.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Day Agenda on Mobile (Below Calendar) */}
              <div className="lg:hidden border-t border-slate-200/80 bg-slate-50/70 p-3 sm:p-4 rounded-b-[18px] sm:rounded-b-[24px]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      {selectedDay.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <p className="text-[10.5px] sm:text-[11px] text-slate-500">
                      {dayEvents.length} event{dayEvents.length === 1 ? '' : 's'} scheduled
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAdd(selectedDay)}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Event</span>
                  </button>
                </div>

                {dayEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2.5 text-center font-medium">
                    No events scheduled for this day
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {dayEvents.map((ev) => {
                      const isSchedule = ev.id.startsWith('schedule-');
                      const timelineClasses = getTimelineEventClasses(ev.color, isSchedule);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => openView(e, ev)}
                          className={`p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2 cursor-pointer border-l-4 hover:border-slate-300 transition-all ${timelineClasses.border}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{ev.title}</p>
                            <p className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formatTime(ev.startTime)}{ev.endTime ? ` - ${formatTime(ev.endTime)}` : ''}</span>
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md shrink-0">
                            View
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Schedule (Desktop) */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="hidden lg:block lg:w-[35%] xl:w-[30%] h-full shrink-0"
            >
              <div className="bg-white/90 backdrop-blur-[12px] rounded-[24px] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-[#f1f5f9] bg-white shrink-0 flex justify-between items-center relative overflow-hidden group">
                  <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-purple-50 rounded-full mix-blend-multiply filter blur-2xl opacity-50 transition-transform duration-700 group-hover:scale-150"></div>
                  
                  <div className="relative z-10">
                    <h2 className="text-[20px] font-bold text-[#1e293b]">{selectedDay.toLocaleDateString(undefined, { weekday: 'long' })}</h2>
                    <p className="text-[13px] font-medium text-[#64748b]">{selectedDay.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <button 
                    onClick={() => openAdd(selectedDay)}
                    title="Add Event"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#a855f7] text-white hover:bg-[#9333ea] shadow-md shadow-purple-200 transition-all hover:scale-105 active:scale-95 relative z-10"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-12">
                  {dayEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                      <CalendarDays className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="text-[14px] font-bold text-[#1e293b]">No events today</p>
                      <p className="text-[12px] text-[#64748b]">Schedule a meeting or add a class.</p>
                    </div>
                  ) : (
                    dayEvents.map((ev) => {
                      const isSchedule = ev.id.startsWith('schedule-');
                      const timelineClasses = getTimelineEventClasses(ev.color, isSchedule);
                      return (
                        <div key={ev.id} className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-[-24px] before:w-[2px] before:bg-slate-100 last:before:hidden">
                          <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-[3px] border-white shadow-sm z-10 ${timelineClasses.dot}`}></div>
                          <div 
                            onClick={(e) => openView(e, ev)}
                            className={`group relative bg-white border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border-l-[6px] cursor-pointer ${timelineClasses.border}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-[15px] font-bold text-[#1e293b] group-hover:text-[#9333ea] transition-colors break-words line-clamp-2 w-full pr-2">{ev.title}</h4>
                            </div>
                            <div className={`flex items-center gap-2 text-[11px] font-bold bg-slate-50 w-max px-2.5 py-1 rounded-lg border mb-3 ${timelineClasses.time}`}>
                              <Clock className="w-3.5 h-3.5" /> <span>{formatTime(ev.startTime)}{ev.endTime ? ` - ${formatTime(ev.endTime)}` : ''}</span>
                            </div>
                            {ev.description && (
                              <p className="text-[13px] font-medium text-[#64748b] bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100/30 break-words whitespace-normal w-full overflow-hidden">
                                {ev.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Add/Edit Event Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[28px] border-none shadow-2xl [&>button]:hidden">
          <div className="p-8 bg-white">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-[24px] font-bold text-[#1e293b] tracking-tight">{editingEventId ? 'Edit Event' : 'Add New Event'}</DialogTitle>
              <DialogDescription className="text-[14px] text-[#64748b]">Schedule a classroom activity or reminder.</DialogDescription>
            </DialogHeader>

            {error && <p className="text-rose-500 text-sm font-semibold mb-4">{error}</p>}

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#1e293b] ml-1">Event Title</label>
                <Input 
                  value={formTitle} 
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Mathematics Quiz - Grade 11" 
                  className="bg-white border-slate-200 focus:border-[#a855f7] focus:ring-4 focus:ring-purple-50 rounded-xl h-12 px-4 transition-all text-[14px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-[#1e293b] ml-1">Date</label>
                  <Input 
                    type="date" 
                    value={formDate} 
                    onChange={(e) => setFormDate(e.target.value)}
                    className="bg-white border-slate-200 focus:border-[#a855f7] rounded-xl h-12 px-4 text-[14px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-[#1e293b] ml-1">Start Time</label>
                  <Input 
                    type="time" 
                    value={formStartTime} 
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="bg-white border-slate-200 focus:border-[#a855f7] rounded-xl h-12 px-4 text-[14px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#1e293b] ml-1">Notes (Optional)</label>
                <Textarea 
                  value={formDescription} 
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Additional details about this event..." 
                  className="bg-white border-slate-200 focus:border-[#a855f7] rounded-xl min-h-[100px] p-4 transition-all text-[14px] break-all"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[13px] font-bold text-[#1e293b] ml-1">Color Theme</label>
                <div className="flex gap-3 ml-1">
                  {EVENT_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormColor(color)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        formColor === color ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-sm' : 'hover:scale-110 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: getColorHex(color) }}
                      title={color}
                    >
                      {formColor === color && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button 
                variant="outline" 
                onClick={() => setIsAddOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-100 transition-all text-[14px]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="flex-[1.5] h-12 rounded-xl font-bold bg-[#a855f7] hover:bg-[#9333ea] text-white shadow-lg shadow-purple-200 transition-all hover:scale-[1.02] text-[14px]"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Event Dialog */}
      <Dialog open={viewEventOpen} onOpenChange={setViewEventOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden rounded-[24px] border-none shadow-2xl [&>button]:hidden">
          {selectedEvent && (
            <div className="p-8 bg-white relative">
              <button onClick={() => setViewEventOpen(false)} aria-label="Close event details" className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={18} />
              </button>
              
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: getColorHex(selectedEvent.color || 'purple') + '20', color: getColorHex(selectedEvent.color || 'purple') }}>
                  {selectedEvent.id.startsWith('schedule-') ? <CalendarIcon size={24} /> : <CalendarDays size={24} />}
                </div>
                <div className="pr-6">
                  <h3 className="text-[18px] font-bold text-[#1e293b] leading-tight mb-2">{selectedEvent.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[12px] font-semibold border border-slate-200">
                      <CalendarDays size={12} />
                      {selectedEvent.startTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[12px] font-semibold border border-slate-200">
                      <Clock size={12} />
                      {formatTime(selectedEvent.startTime)}{selectedEvent.endTime ? ` - ${formatTime(selectedEvent.endTime)}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <AlignLeft size={16} className="text-slate-400" />
                    <h4 className="text-[13px] font-bold text-slate-700">Details</h4>
                  </div>
                  <p className="text-[14px] text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 break-words">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <Button 
                  variant="outline" 
                  onClick={() => handleDelete(selectedEvent.id)}
                  className="flex-1 h-11 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all text-[13px]"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
                <Button 
                  onClick={() => openEdit(selectedEvent)}
                  className="flex-1 h-11 rounded-xl font-bold bg-[#1e293b] hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] text-[13px]"
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Event
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherCalendarView;
