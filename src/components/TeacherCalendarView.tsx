import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  Bell,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { CalendarEvent } from '../types/models';
import {
  createCalendarEvent,
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
  DialogFooter,
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

interface TeacherCalendarViewProps {
  classes?: { id: string; name: string; schedule: string }[];
  teacherId?: string;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenInsightModal?: () => void;
  userPhoto?: string;
  teacherName?: string;
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
  onOpenNotifications,
  onOpenProfile,
  onOpenInsightModal,
  userPhoto,
  teacherName,
}) => {
  const { currentUser } = useAuth();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(() => toDateKey(new Date()));
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('');

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
          evs.push({
            id: `schedule-${cls.id}-${toDateKey(current)}`,
            userId: teacherId || '',
            title: cls.name,
            startTime: new Date(current),
            createdAt: new Date(),
          });
        }
      });
      current.setDate(current.getDate() + 1);
    }
    return evs;
  }, [classes, month, teacherId]);

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
    setFormTitle('');
    setFormDescription('');
    setFormDate(key);
    setFormStartTime('09:00');
    setFormEndTime('');
    setIsAddOpen(true);
  };

  const handleCreate = async () => {
    if (!currentUser?.uid) return;
    if (!formTitle.trim()) {
      setError('Event title is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const start = parseDateTime(formDate, formStartTime);
      const end = formEndTime ? parseDateTime(formDate, formEndTime) : undefined;

      await createCalendarEvent(currentUser.uid, {
        title: formTitle.trim(),
        description: formDescription.trim() ? formDescription.trim() : undefined,
        startTime: start,
        endTime: end && end.getTime() > start.getTime() ? end : undefined,
      });

      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
      setError('Failed to create event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    setError('');
    try {
      await deleteCalendarEvent(eventId);
    } catch (err) {
      console.error(err);
      setError('Failed to delete event.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full h-full flex flex-col overflow-y-auto bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]"
    >
      {/* Calendar Actions Bar */}
      <div className="w-full px-[24px] xl:px-[32px] pt-[12px] pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              setMonth(today);
              setSelectedDay(today);
            }}
            className="px-4 py-1.5 bg-white/60 hover:bg-white text-[#64748b] text-[12px] font-bold rounded-full transition-all border border-white/50 backdrop-blur-md shadow-sm"
          >
            Today
          </button>
          <button 
            onClick={() => openAdd(selectedDay)}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[12px] font-bold rounded-full transition-transform hover:scale-[1.02] shadow-[0_4px_12px_rgba(79,70,229,0.2)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </button>
        </div>
      </div>


      <div className="w-full px-[24px] xl:px-[32px] pb-[32px] flex flex-col flex-1 gap-6 min-h-0">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-[13px] font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Calendar Layout Grid (Side-by-Side) */}
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          {/* Main Calendar Area (Grid) */}
          <div className="lg:w-[65%] xl:w-[70%] bg-white/80 backdrop-blur-[12px] rounded-[24px] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-full">
            {/* Calendar Header */}
            <div className="p-6 border-b border-[#f1f5f9] flex justify-between items-center bg-white/50 shrink-0">
              <div className="flex items-center gap-5">
                <button
                  onClick={() => {
                    const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
                    setMonth(prev);
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#64748b] hover:bg-slate-100 hover:text-[#1e293b] transition-colors border border-slate-200 shadow-sm hover:shadow-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-[22px] font-bold text-[#1e293b] w-44 text-center">{monthLabel(month)}</h2>
                <button
                  onClick={() => {
                    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
                    setMonth(next);
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#64748b] hover:bg-slate-100 hover:text-[#1e293b] transition-colors border border-slate-200 shadow-sm hover:shadow-md"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <span className="text-[13px] font-bold text-[#9333ea] bg-purple-50 px-4 py-1.5 rounded-full border border-purple-100 shadow-sm">
                {monthEvents.length} event{monthEvents.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Calendar Grid Container */}
            <div className="flex-1 p-4 flex flex-col min-h-0">
              <div className="grid grid-cols-7 text-center border-b border-slate-200/60 pb-3 mb-2 shrink-0">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-widest">
                    {d}
                  </div>
                ))}
              </div>

              <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 pb-2 overflow-y-auto no-scrollbar">
                {gridDays.map((day) => {
                  const key = toDateKey(day);
                  const events = eventsByDay.get(key) || [];
                  const selected = isSameDay(day, selectedDay);
                  const today = isSameDay(day, new Date());
                  const inMonth = isSameMonth(day, month);

                  return (
                    <div
                      key={key}
                      onClick={() => {
                        const d = new Date(day);
                        d.setHours(0, 0, 0, 0);
                        setSelectedDay(d);
                      }}
                      className={`calendar-day p-2 rounded-xl transition-all cursor-pointer border-2 flex flex-col group relative ${
                        selected
                          ? 'bg-purple-50/50 border-[#a855f7] shadow-[0_4px_16px_rgba(168,85,247,0.15)] z-10 scale-[1.02]'
                          : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                      } ${!inMonth ? 'opacity-40' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <span
                          className={`day-num w-7 h-7 rounded-full flex items-center justify-center font-bold text-[14px] transition-all ${
                            today
                              ? 'bg-gradient-to-br from-[#a855f7] to-[#9333ea] text-white shadow-md'
                              : selected
                              ? 'text-[#9333ea]'
                              : 'text-[#1e293b]'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {events.length > 0 && <span className="w-2 h-2 rounded-full bg-[#a855f7] mt-2 mr-1" />}
                      </div>
                      <div className="mt-auto space-y-1">
                        {events.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className={`w-full truncate text-[10px] font-bold px-2 py-1 rounded border shadow-sm ${
                              ev.id.startsWith('schedule-')
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                : 'bg-purple-50 text-purple-700 border-purple-100'
                            }`}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {events.length > 2 && (
                          <div className="text-[9px] font-bold text-[#64748b] pl-1">+{events.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {loading && (
              <div className="px-6 py-3 border-t border-[#f1f5f9] bg-white/50 flex items-center gap-2 text-[#64748b]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[12px] font-medium">Syncing calendar...</span>
              </div>
            )}
          </div>

          {/* Sidebar Daily Schedule */}
          <div className="lg:w-[35%] xl:w-[30%] bg-white/80 backdrop-blur-[12px] rounded-[24px] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-full shrink-0">
            <div className="p-6 border-b border-[#f1f5f9] bg-white/50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[20px] font-bold text-[#1e293b]">
                  {selectedDay.toLocaleDateString(undefined, { weekday: 'long' })}
                </h2>
                <p className="text-[13px] font-medium text-[#64748b]">
                  {selectedDay.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => openAdd(selectedDay)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#a855f7] hover:bg-purple-50 shadow-sm border border-purple-100 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {dayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <CalendarDays className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-[14px] font-bold text-[#1e293b]">No events today</p>
                  <p className="text-[12px] text-[#64748b]">Schedule a meeting or add a class.</p>
                </div>
              ) : (
                dayEvents.map((ev, idx) => (
                  <div
                    key={ev.id}
                    className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-[-24px] before:w-[2px] before:bg-slate-100 last:before:hidden"
                  >
                    <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-[3px] border-white shadow-sm z-10 ${
                      ev.id.startsWith('schedule-') ? 'bg-[#3b82f6]' : 'bg-[#a855f7]'
                    }`} />
                    <div className={`bg-gradient-to-br border rounded-[20px] p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group ${
                      ev.id.startsWith('schedule-') 
                        ? 'from-blue-50/50 to-white border-blue-100/60' 
                        : 'from-purple-50/50 to-white border-purple-100/60'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-[15px] font-bold text-[#1e293b] group-hover:text-purple-600 transition-colors line-clamp-1">{ev.title}</h4>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ev.id);
                          }}
                          className="text-[#cbd5e1] hover:text-rose-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className={`flex items-center gap-2 text-[11px] font-bold bg-white w-max px-2.5 py-1 rounded-lg shadow-sm border mb-3 ${
                        ev.id.startsWith('schedule-') ? 'text-blue-600 border-blue-50' : 'text-[#a855f7] border-purple-50'
                      }`}>
                        <Clock className="w-3 h-3" /> 
                        {formatTime(ev.startTime)}
                        {ev.endTime ? ` - ${formatTime(ev.endTime)}` : ''}
                      </div>
                      {ev.description && (
                        <p className="text-[13px] font-medium text-[#475569] bg-white/60 px-3 py-2 rounded-xl border border-slate-100/50 line-clamp-3">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
          </div>
        </div>
      </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">Add event</DialogTitle>
            <DialogDescription className="font-body">
              Create a reminder for your class schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-body font-bold text-muted-foreground">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Quiz review session"
              />
            </div>

            <div>
              <label className="text-xs font-body font-bold text-muted-foreground">Date</label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-body font-bold text-muted-foreground">Start time</label>
              <Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-body font-bold text-muted-foreground">End time (optional)</label>
              <Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-body font-bold text-muted-foreground">Notes (optional)</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Add context: class, room, agenda…"
                className="min-h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Plus />
                  Create event
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default TeacherCalendarView;
