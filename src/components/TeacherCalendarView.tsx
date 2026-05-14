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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="w-full min-h-full flex flex-col bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]"
    >
      {/* Standard Header */}
      <div className="w-full px-[24px] xl:px-[32px] pt-[24px] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-[26px] font-bold text-[#1e293b] tracking-tight leading-tight">Calendar</h1>
            <p className="text-[13px] text-[#64748b] mt-1">Check upcoming class events and schedule.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <div className="flex items-center gap-2 mr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  setMonth(today);
                  setSelectedDay(today);
                }}
              >
                Today
              </Button>
              <Button size="sm" onClick={() => openAdd(selectedDay)}>
                <Plus />
                Add event
              </Button>
            </div>

            {/* AI Insights Button */}
            <button
              onClick={onOpenInsightModal}
              className="relative w-10 h-10 flex items-center justify-center bg-[#eef2ff]/80 hover:bg-[#e0e7ff] rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[#a5b4fc]/60 text-[#4f46e5] hover:border-[#818cf8] transition-colors cursor-pointer hover:scale-[1.02]"
              aria-label="View AI Insight"
            >
              <Sparkles className="w-4 h-4" />
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 border border-white animate-pulse" />
            </button>
            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative w-10 h-10 flex items-center justify-center bg-white/60 hover:bg-white/80 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 text-[#64748b] hover:text-[#1e293b] transition-colors cursor-pointer hover:scale-[1.02]"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>
            {/* Profile Pill */}
            <div
              onClick={onOpenProfile}
              className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full backdrop-blur-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-white/50 cursor-pointer hover:bg-white/80 transition-colors h-10 hover:scale-[1.02]"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-100 overflow-hidden shrink-0">
                <img src={userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName || 'Teacher')}&background=e0e7ff&color=4f46e5`} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <span className="text-[13px] font-semibold text-[#1e293b]">{teacherName || 'Test Teacher'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-[24px] xl:px-[32px] pb-[32px] space-y-[24px]">

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-xl px-4 py-3 text-sm font-body">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
                  setMonth(prev);
                }}
                aria-label="Previous month"
              >
                <ChevronLeft />
              </Button>
              <div className="text-sm sm:text-base font-display font-bold text-foreground">
                {monthLabel(month)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
                  setMonth(next);
                }}
                aria-label="Next month"
              >
                <ChevronRight />
              </Button>
            </div>

            <div className="text-xs text-muted-foreground font-body">
              {monthEvents.length} event{monthEvents.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="bg-card px-3 py-2 text-xs font-body font-bold text-muted-foreground"
              >
                {d}
              </div>
            ))}

            {gridDays.map((day) => {
              const key = toDateKey(day);
              const count = eventsByDay.get(key)?.length || 0;
              const selected = isSameDay(day, selectedDay);
              const today = isSameDay(day, new Date());
              const inMonth = isSameMonth(day, month);

              return (
                <button
                  key={key}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(0, 0, 0, 0);
                    setSelectedDay(d);
                  }}
                  className={
                    `bg-card px-3 py-3 min-h-[78px] text-left transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ` +
                    (selected ? 'ring-2 ring-primary/40 ' : '') +
                    (!inMonth ? 'opacity-50 ' : '')
                  }
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={
                        `w-7 h-7 rounded-lg flex items-center justify-center text-sm font-body font-bold ` +
                        (today ? 'bg-primary text-primary-foreground ' : 'text-foreground ') +
                        (selected && !today ? 'bg-secondary text-secondary-foreground ' : '')
                      }
                    >
                      {day.getDate()}
                    </div>

                    {count > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-xs font-body text-muted-foreground">{count}</span>
                      </div>
                    )}
                  </div>

                  {count > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(eventsByDay.get(key) || []).slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-2 py-0.5 text-[10px] font-body font-bold truncate max-w-full"
                          title={ev.title}
                        >
                          {ev.title}
                        </span>
                      ))}
                      {(eventsByDay.get(key)?.length || 0) > 3 && (
                        <span className="text-[10px] font-body text-muted-foreground">+{(eventsByDay.get(key)?.length || 0) - 3} more</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {loading && (
            <div className="px-4 py-4 border-t border-border flex items-center gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-body">Syncing events…</span>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-sm font-display font-bold text-foreground">
                {selectedDay.toLocaleDateString(undefined, { weekday: 'long' })}
              </div>
              <div className="text-xs text-muted-foreground font-body">{selectedDay.toLocaleDateString()}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => openAdd(selectedDay)}>
              <Plus />
              Add
            </Button>
          </div>

          <div className="p-4">
            {dayEvents.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="text-sm font-body font-bold text-foreground">No events</div>
                <div className="text-xs text-muted-foreground font-body mt-1">
                  Add reminders for quizzes, meetings, or deadlines.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-border bg-background p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <div className="text-sm font-body font-bold text-foreground truncate">{ev.title}</div>
                      </div>
                      <div className="text-xs text-muted-foreground font-body mt-1">
                        {formatTime(ev.startTime)}
                        {ev.endTime ? ` – ${formatTime(ev.endTime)}` : ''}
                      </div>
                      {ev.description && (
                        <div className="text-xs text-muted-foreground font-body mt-2 line-clamp-2">{ev.description}</div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ev.id)}
                      aria-label="Delete event"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
      </div>
    </motion.div>
  );
};

export default TeacherCalendarView;
