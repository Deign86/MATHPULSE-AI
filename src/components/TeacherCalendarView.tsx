import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
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

const TeacherCalendarView: React.FC = () => {
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

  const monthEvents = useMemo(() => {
    return events
      .filter((e) => e.startTime >= monthStart && e.startTime <= monthEnd)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [events, monthStart, monthEnd]);

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
      className="p-4 sm:p-6 space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0">
              <CalendarDays size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-display font-bold text-foreground">Calendar</h2>
              <p className="text-sm text-muted-foreground font-body">Check upcoming class events and schedule</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      </div>

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
    </motion.div>
  );
};

export default TeacherCalendarView;
