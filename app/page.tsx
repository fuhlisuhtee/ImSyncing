"use client";

import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Cloud,
  FileText,
  Folder,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Signal,
  Sparkles,
  Table2,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

type View = "overview" | "tasks" | "calendar" | "files" | "archives" | "connections";
type Effort = "Light" | "Medium" | "Heavy" | "Intensive";
type Task = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  effort: Effort;
  weight: number;
  completed: boolean;
  mock?: boolean;
};
type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
};
type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  htmlLink?: string;
};

const STORAGE_KEY = "im-syncing-tasks";
const SIDEBAR_STORAGE_KEY = "im-syncing-sidebar-collapsed";
const MOCK_TASK_COUNT = 20;
const EFFORT_WEIGHTS: Record<Effort, number> = { Light: 1, Medium: 2, Heavy: 3, Intensive: 4 };

const navigation: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tasks", label: "The Tide", icon: ListTodo },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "files", label: "Cargo Hold", icon: FolderOpen },
  { id: "archives", label: "The Deep", icon: Archive },
];

const integrations = [
  { name: "Google Drive", detail: "Browse your files · read-only", icon: Folder, color: "drive" },
  { name: "Google Calendar", detail: "See events and deadlines · read-only", icon: CalendarDays, color: "calendar" },
  { name: "Google Docs", detail: "Preview documents · read-only", icon: FileText, color: "docs" },
  { name: "Google Sheets", detail: "Preview spreadsheets · read-only", icon: Table2, color: "sheets" },
];

const mockFiles = [
  { name: "TEST 01", type: "Folder", detail: "4 items", icon: Folder, color: "drive" },
  { name: "TEST 02", type: "Folder", detail: "2 items", icon: Folder, color: "drive" },
  { name: "TEST 03", type: "Google Doc", detail: "Edited just now", icon: FileText, color: "docs" },
  { name: "TEST 04", type: "Google Sheet", detail: "Edited just now", icon: Table2, color: "sheets" },
  { name: "TEST 05", type: "PDF", detail: "1.2 MB", icon: FileText, color: "gmail" },
  { name: "TEST 06", type: "Google Doc", detail: "Edited yesterday", icon: FileText, color: "docs" },
];

async function requestApi<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "The request failed.");
  return data;
}

function getCalendarEventDate(event: GoogleCalendarEvent) {
  if (event.start?.dateTime) {
    const date = new Date(event.start.dateTime);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  return event.start?.date ?? "";
}

function toLocalRfc3339(date: Date) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00${sign}${hours}:${minutes}`;
}

function getUrgencyMultiplier(dueDate: string) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const daysUntil = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (daysUntil < 0) return 2.5;
  if (daysUntil === 0) return 2;
  if (daysUntil === 1) return 1.5;
  if (daysUntil <= 3) return 1;
  if (daysUntil <= 7) return 0.75;
  return 0.5;
}

function getTaskLoad(task: Task) {
  const urgency = getUrgencyMultiplier(task.dueDate);
  return urgency === null ? null : task.weight * urgency;
}

function formatPoints(points: number) {
  return Number.isInteger(points) ? String(points) : String(Number(points.toFixed(2)));
}

function getWaterState(score: number) {
  const percent = Math.min((score / 18) * 100, 100);
  if (score <= 4) return { percent, title: "Calm waters", message: "Smooth sailing!", className: "water-calm" };
  if (score <= 9) return { percent, title: "Rising tide", message: "Things are picking up.", className: "water-rising" };
  if (score < 18) return { percent, title: "High tide", message: "Better start prioritizing.", className: "water-high" };
  return { percent, title: "Turbulent waters", message: "Time to navigate those deadlines!", className: "water-turbulent" };
}

function normalizeTask(value: unknown): Task | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as Partial<Task> & { priority?: string };
  if (typeof saved.title !== "string" || typeof saved.id !== "string") return null;
  const legacyEffort = saved.priority === "High" ? "Heavy" : saved.priority === "Low" ? "Light" : "Medium";
  const effort = saved.effort && Object.hasOwn(EFFORT_WEIGHTS, saved.effort) ? saved.effort : legacyEffort;
  const weight = typeof saved.weight === "number" && Number.isFinite(saved.weight) && saved.weight >= 0.5 && saved.weight <= 20
    ? saved.weight
    : EFFORT_WEIGHTS[effort];
  return {
    id: saved.id,
    title: saved.title,
    subject: typeof saved.subject === "string" ? saved.subject : "",
    dueDate: typeof saved.dueDate === "string" ? saved.dueDate : "",
    effort,
    weight,
    completed: saved.completed === true,
    ...(saved.mock === true ? { mock: true } : {}),
  };
}

function formatDate(value: string) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function dueLabel(value: string) {
  if (!value) return "No due date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  const difference = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (difference < 0) return `${Math.abs(difference)}d overdue`;
  if (difference === 0) return "Due today";
  if (difference === 1) return "Due tomorrow";
  return formatDate(value);
}

function dateOffsetFromToday(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const taskLoad = getTaskLoad(task);
  const urgency = getUrgencyMultiplier(task.dueDate);

  return (
    <div className={`task-row${task.completed ? " task-done" : ""}`}>
      <button
        className="task-check"
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? `Mark ${task.title} as active` : `Complete ${task.title}`}
      >
        {task.completed ? <Check size={14} /> : <Circle size={18} />}
      </button>
      <div className="task-copy">
        <span className="task-title">{task.title}{task.mock && <span className="mock-tag task-mock-tag">MOCK</span>}</span>
        <span className="task-meta">
          {task.subject || "Personal"} <span className="meta-dot">·</span> {task.effort} · {formatPoints(task.weight)} {task.weight === 1 ? "pt" : "pts"} <span className="meta-dot">·</span> {dueLabel(task.dueDate)}
        </span>
      </div>
      <span className={`task-load${taskLoad === null ? " task-load-unscored" : ""}`} title={taskLoad === null ? "No due date: excluded from workload score" : `Weight ${formatPoints(task.weight)} × urgency ${urgency}×`}>
        {taskLoad === null ? "Unscored" : `${formatPoints(taskLoad)} load`}
      </span>
      <button className="icon-button row-edit" aria-label={`Edit ${task.title}`} onClick={() => onEdit(task)}>
        <Pencil size={14} />
      </button>
      <button className="icon-button row-delete" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task.id)}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Inbox;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={22} strokeWidth={1.7} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function TaskDialog({
  onClose,
  onSave,
  initialTask,
}: {
  onClose: () => void;
  onSave: (task: Omit<Task, "id" | "completed">, taskId?: string) => void;
  initialTask?: Task;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const effort = String(form.get("effort") ?? "Medium") as Effort;
    const weight = Number(form.get("weight"));
    if (!title || !(effort in EFFORT_WEIGHTS) || !Number.isFinite(weight) || weight < 0.5 || weight > 20) return;
    onSave({
      title,
      subject: String(form.get("subject") ?? "").trim(),
      dueDate: String(form.get("dueDate") ?? ""),
      effort,
      weight,
      ...(initialTask?.mock ? { mock: true } : {}),
    }, initialTask?.id);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="task-dialog" onSubmit={submit}>
        <div className="dialog-heading">
          <div><span className="eyebrow">THE TIDE</span><h2>{initialTask ? "Adjust this task" : "Make a little headway"}</h2></div>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button>
        </div>
        <label className="field-label" htmlFor="task-title">Task name</label>
        <input id="task-title" name="title" placeholder="What needs doing?" defaultValue={initialTask?.title} autoFocus required maxLength={120} />
        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor="task-subject">Subject or project</label>
            <input id="task-subject" name="subject" placeholder="e.g. COMP 015" defaultValue={initialTask?.subject} maxLength={60} />
          </div>
          <div>
            <label className="field-label" htmlFor="task-date">Due date</label>
            <input id="task-date" name="dueDate" type="date" defaultValue={initialTask?.dueDate} />
          </div>
        </div>
        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor="task-effort">Effort type</label>
            <select id="task-effort" name="effort" defaultValue={initialTask?.effort ?? "Medium"} onChange={(event) => {
              const weightField = event.currentTarget.form?.elements.namedItem("weight");
              if (weightField instanceof HTMLInputElement) weightField.value = String(EFFORT_WEIGHTS[event.currentTarget.value as Effort]);
            }}>
              <option value="Light">Light · Quick work</option>
              <option value="Medium">Medium · Assignments</option>
              <option value="Heavy">Heavy · Major projects</option>
              <option value="Intensive">Intensive · Coding / research</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="task-weight">Weight (points)</label>
            <input id="task-weight" name="weight" type="number" min="0.5" max="20" step="0.5" defaultValue={initialTask?.weight ?? 2} required />
          </div>
        </div>
        <p className="weight-help">Effort suggests a starting weight. Adjust points for this task if needed (0.5–20).</p>
        <div className="dialog-footer">
          <span>Saved in this browser</span>
          <button type="button" className="button button-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary">{initialTask ? "Save changes" : <><Plus size={16} /> Add task</>}</button>
        </div>
      </form>
    </div>
  );
}

function CalendarPage({ tasks, connected, onConnect }: {
  tasks: Task[];
  connected: boolean;
  onConnect: () => void;
}) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month);
  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  useEffect(() => {
    if (!connected) {
      setEvents([]);
      return;
    }

    let active = true;
    const timeMin = toLocalRfc3339(new Date(month.getFullYear(), month.getMonth(), 1));
    const timeMax = toLocalRfc3339(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    const params = new URLSearchParams({ timeMin, timeMax });
    setEventsLoading(true);
    setEventsError("");
    requestApi<{ items?: GoogleCalendarEvent[] }>(`/api/google/calendar?${params}`)
      .then((data) => {
        if (active) setEvents(data.items ?? []);
      })
      .catch((error: unknown) => {
        if (active) setEventsError(error instanceof Error ? error.message : "Could not load Google Calendar events.");
      })
      .finally(() => {
        if (active) setEventsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [month, connected]);

  function changeMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setSelectedDay(1);
  }

  const selectedDate = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
  const selectedTasks = tasks.filter((task) => task.dueDate === selectedDate);
  const selectedEvents = events.filter((event) => getCalendarEventDate(event) === selectedDate);

  return (
    <div className="calendar-layout">
      <section className="content-card calendar-card">
        <div className="calendar-toolbar">
          <div><span className="section-overline">MONTH VIEW</span><h2>{monthLabel}</h2></div>
          <div className="calendar-controls">
            <button className="icon-button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={17} /></button>
            <button className="button button-quiet calendar-today" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today.getDate()); }}>Today</button>
            <button className="icon-button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={17} /></button>
          </div>
        </div>
        <div className="calendar-grid" role="grid" aria-label={monthLabel}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
          {Array.from({ length: cellCount }, (_, index) => {
            const day = index - firstWeekday + 1;
            const inMonth = day > 0 && day <= daysInMonth;
            const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasEvent = inMonth && events.some((event) => getCalendarEventDate(event) === date);
            const hasTask = inMonth && tasks.some((task) => task.dueDate === date);
            return (
              <button
                type="button"
                role="gridcell"
                aria-label={inMonth ? `${monthLabel} ${day}${hasEvent ? ", Google Calendar event" : ""}${hasTask ? ", task due" : ""}` : "Outside current month"}
                key={index}
                disabled={!inMonth}
                className={`calendar-day${inMonth ? "" : " calendar-day-outside"}${day === selectedDay && inMonth ? " calendar-day-selected" : ""}`}
                onClick={() => inMonth && setSelectedDay(day)}
              >
                {inMonth && <><span className="calendar-day-number">{day}</span><span className="calendar-markers">{hasEvent && <i className="marker-google" />}{hasTask && <i className="marker-task" />}</span></>}
              </button>
            );
          })}
        </div>
        <div className="calendar-legend"><span><i className="marker-google" /> Google Calendar event</span><span><i className="marker-task" /> Task due date</span></div>
      </section>
      <aside className="content-card calendar-agenda">
        <span className="section-overline">SELECTED DAY</span>
        <h2>{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${selectedDate}T12:00:00`))}</h2>
        {eventsError && <p className="integration-error" role="alert">{eventsError}</p>}
        {eventsLoading && <p className="integration-message">Loading Google Calendar…</p>}
        {selectedTasks.length === 0 && selectedEvents.length === 0 && !eventsLoading ? (
          <EmptyState
            icon={CalendarDays}
            title={connected ? "Nothing scheduled" : "Connect Google Calendar"}
            description={connected ? "Events from this Google Calendar and tasks with due dates will appear here." : "Sign in to load your Google Calendar events."}
            action={!connected ? <button className="text-button empty-action" onClick={onConnect}>Connect Google account <ArrowRight size={14} /></button> : undefined}
          />
        ) : (
          <div className="agenda-list">
            {selectedTasks.map((task) => (
              <div className="agenda-item" key={task.id}>
                <i className={`agenda-dot${task.mock ? " agenda-dot-mock" : ""}`} />
                <div><strong>{task.title}</strong><span>{task.mock ? "Mock task" : "Task due"}{task.mock && <span className="mock-tag">MOCK</span>}</span></div>
              </div>
            ))}
            {selectedEvents.map((event) => (
              <div className="agenda-item" key={event.id}>
                <i className="agenda-dot" />
                <div>
                  {event.htmlLink ? <a href={event.htmlLink} target="_blank" rel="noreferrer"><strong>{event.summary || "Untitled event"}</strong></a> : <strong>{event.summary || "Untitled event"}</strong>}
                  <span>Google Calendar event{event.start?.dateTime ? ` · ${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(event.start.dateTime))}` : " · All day"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="agenda-note"><ShieldCheck size={14} /> {connected ? "Read-only events loaded from your Google Calendar." : "Calendar events are not connected."}</div>
      </aside>
    </div>
  );
}

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();
  const [view, setView] = useState<View>("overview");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskBeingEdited, setTaskBeingEdited] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("all");
  const [query, setQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fileQuery, setFileQuery] = useState("");
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState("");
  const [filePreview, setFilePreview] = useState<{
    title: string;
    kind: "document" | "spreadsheet";
    text?: string;
    values?: (string | number | boolean)[][];
  } | null>(null);
  const [filePreviewLoading, setFilePreviewLoading] = useState(false);
  const [filePreviewError, setFilePreviewError] = useState("");
  const connected = sessionStatus === "authenticated";

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setTasks(parsed.map(normalizeTask).filter((task): task is Task => task !== null));
      }
    } catch (error) {
      console.error("Could not load saved tasks from this browser.", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (view !== "files" || !connected) return;

    let active = true;
    setDriveLoading(true);
    setDriveError("");
    requestApi<{ files?: DriveFile[] }>("/api/google/drive")
      .then((data) => {
        if (active) setDriveFiles(data.files ?? []);
      })
      .catch((error: unknown) => {
        if (active) setDriveError(error instanceof Error ? error.message : "Could not load Google Drive files.");
      })
      .finally(() => {
        if (active) setDriveLoading(false);
      });

    return () => {
      active = false;
    };
  }, [view, connected]);

  useEffect(() => {
    if (connected) return;
    setDriveFiles([]);
    setDriveError("");
    setFilePreview(null);
    setFilePreviewError("");
  }, [connected]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Could not save tasks in this browser.", error);
    }
  }, [tasks, loaded]);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
    } catch (error) {
      console.error("Could not load sidebar preference from this browser.", error);
    }
  }, []);

  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesFilter = taskFilter === "all" || (taskFilter === "active" ? !task.completed : task.completed);
      const matchesQuery =
        !normalizedQuery ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.subject.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [tasks, taskFilter, query]);

  function saveTask(task: Omit<Task, "id" | "completed">, taskId?: string) {
    if (taskId) {
      setTasks((current) => current.map((existing) => existing.id === taskId ? { ...existing, ...task } : existing));
    } else {
      setTasks((current) => [{ ...task, id: crypto.randomUUID(), completed: false }, ...current]);
    }
    setDialogOpen(false);
    setTaskBeingEdited(null);
  }

  function editTask(task: Task) {
    setTaskBeingEdited(task);
    setDialogOpen(false);
  }

  function startNewTask() {
    setTaskBeingEdited(null);
    setDialogOpen(true);
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function addMockTasks(amount: number) {
    setTasks((current) => {
      const existingIds = new Set(current.map((task) => task.id));
      const additions = Array.from({ length: MOCK_TASK_COUNT }, (_, index) => {
        const number = index + 1;
        const batch = Math.floor(index / 5);
        const effort = (["Light", "Medium", "Heavy", "Intensive", "Intensive"] as const)[batch];
        const dueOffsets = [9, 4, 2, 0, -1];
        const weights = [1, 1.5, 1.5, 2.5, 4];
        return {
          id: `mock-task-${String(number).padStart(2, "0")}`,
          title: `TEST ${String(number).padStart(2, "0")}`,
          subject: "TEST",
          dueDate: dateOffsetFromToday(dueOffsets[batch]),
          effort,
          weight: weights[batch],
          completed: false,
          mock: true,
        };
      }).filter((task) => !existingIds.has(task.id)).slice(0, amount);
      return [...additions, ...current];
    });
  }

  function clearMockTasks() {
    setTasks((current) => current.filter((task) => !task.mock));
  }

  async function previewGoogleFile(file: DriveFile) {
    const isDocument = file.mimeType === "application/vnd.google-apps.document";
    const isSpreadsheet = file.mimeType === "application/vnd.google-apps.spreadsheet";
    if (!isDocument && !isSpreadsheet) return;

    setFilePreview(null);
    setFilePreviewError("");
    setFilePreviewLoading(true);
    try {
      const endpoint = isDocument
        ? `/api/google/docs/${encodeURIComponent(file.id)}`
        : `/api/google/sheets/${encodeURIComponent(file.id)}`;
      if (isDocument) {
        const document = await requestApi<{ title: string; text: string }>(endpoint);
        setFilePreview({ kind: "document", ...document });
      } else {
        const spreadsheet = await requestApi<{
          title: string;
          values: (string | number | boolean)[][];
        }>(endpoint);
        setFilePreview({ kind: "spreadsheet", ...spreadsheet });
      }
    } catch (error) {
      setFilePreviewError(error instanceof Error ? error.message : "Could not preview this file.");
    } finally {
      setFilePreviewLoading(false);
    }
  }

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch (error) {
        console.error("Could not save sidebar preference in this browser.", error);
      }
      return next;
    });
  }

  const mockTaskCount = tasks.filter((task) => task.mock).length;
  const taskLoads = activeTasks.map(getTaskLoad).filter((load): load is number => load !== null);
  const workloadScore = taskLoads.reduce((total, load) => total + load, 0);
  const unscoredTaskCount = activeTasks.length - taskLoads.length;
  const waterState = getWaterState(workloadScore);
  const filteredMockFiles = mockFiles.filter((file) => file.name.toLowerCase().includes(fileQuery.trim().toLowerCase()));
  const filteredGoogleFiles = driveFiles.filter((file) => file.name.toLowerCase().includes(fileQuery.trim().toLowerCase()));
  const accountInitial = session?.user?.name?.trim().charAt(0).toUpperCase() || "Y";

  function goTo(nextView: View) {
    setView(nextView);
    setQuery("");
  }

  const heading = {
    overview: ["Your workspace", "A little more organized, one day at a time."],
    tasks: ["The Tide", "Keep an eye on what's coming in."],
    calendar: ["Calendar", "Your Google events and task deadlines, side by side."],
    files: ["Cargo Hold", "Your files stay yours, right in Google Drive."],
    archives: ["The Deep", "A quiet place for what's already done."],
    connections: ["The Signal", "Connect and manage your Google services."],
  }[view];

  return (
    <main className={`app-shell${sidebarCollapsed ? " sidebar-is-collapsed" : ""}`}>
      <aside className="sidebar">
        <button className="sidebar-toggle" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <button className="brand" onClick={() => goTo("overview")} aria-label="I'm Syncing home">
          <span className="brand-mark"><Waves size={21} strokeWidth={2.2} /></span>
          <span className="brand-name">I&apos;m Syncing<span className="brand-period">.</span><small>YOUR PERSONAL WORKSPACE</small></span>
        </button>
        <div className="side-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} aria-label={sidebarCollapsed ? label : undefined} title={sidebarCollapsed ? label : undefined} onClick={() => goTo(id)} className={`nav-item${view === id ? " nav-active" : ""}`}>
              <Icon size={18} strokeWidth={1.85} /><span>{label}</span>
              {id === "tasks" && activeTasks.length > 0 && <span className="nav-count">{activeTasks.length}</span>}
            </button>
          ))}
        </nav>
        <div className="side-label side-label-lower">ACCOUNT</div>
        <button aria-label={sidebarCollapsed ? "The Signal" : undefined} title={sidebarCollapsed ? "The Signal" : undefined} onClick={() => goTo("connections")} className={`nav-item${view === "connections" ? " nav-active" : ""}`}>
          <Signal size={18} strokeWidth={1.85} /><span>The Signal</span>
          <span className={`offline-dot${connected ? " online-dot" : ""}`} title={connected ? "Google account connected" : "Google services not connected"} />
        </button>
        <div className="sidebar-note">
          <div className="note-icon"><ShieldCheck size={17} /></div>
          <p><strong>Your space, your pace.</strong><br />{connected ? "Google account connected." : "No account connected yet."}</p>
          <button onClick={() => goTo("connections")}>Learn about connections <ArrowRight size={13} /></button>
        </div>
        <div className="sidebar-spacer" />
        <div className="sidebar-profile">
          <div className="avatar">{accountInitial}</div>
          <div className="profile-copy"><strong>{session?.user?.name ?? "Your workspace"}</strong><span>{session?.user?.email ?? "Personal edition"}</span></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{heading[0]}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input
                aria-label="Search tasks"
                placeholder="Search tasks"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (event.target.value) setView("tasks");
                }}
              />
            </label>
            <span className="topbar-divider" />
            <div className="topbar-avatar" aria-label={session?.user?.name ?? "Personal workspace"}>{accountInitial}</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="heading-kicker"><span className="heading-kicker-dot" /> PERSONAL WORKSPACE</div>
              <h1>{heading[0]}</h1>
              <p>{heading[1]}</p>
            </div>
            {view === "tasks" || view === "overview" || view === "calendar" ? (
              <button className="button button-primary" onClick={startNewTask}><Plus size={17} /> New task</button>
            ) : null}
          </div>

          {view === "overview" && (
            <section className="mock-controls" aria-label="Mock task preview controls">
              <div className="mock-controls-copy">
                <span className="mock-tag mock-tag-strong">MOCK DATA</span>
                <span><strong>{mockTaskCount}</strong> test tasks loaded</span>
                <span className="mock-controls-help">Temporary TEST tasks · remove anytime</span>
              </div>
              <div className="mock-controls-actions">
                <button className="button button-quiet" onClick={() => addMockTasks(1)} disabled={mockTaskCount >= MOCK_TASK_COUNT}>
                  <Plus size={14} /> Add 1
                </button>
                <button className="button button-quiet mock-add-five" onClick={() => addMockTasks(5)} disabled={mockTaskCount >= MOCK_TASK_COUNT}>
                  <Plus size={14} /> Add 5
                </button>
                <button className="text-button mock-clear" onClick={clearMockTasks} disabled={mockTaskCount === 0}>Clear test tasks</button>
              </div>
            </section>
          )}

          {view === "overview" && (
            <>
              <section className={`welcome-card ${waterState.className}`}>
                <div className="welcome-copy">
                  <div className="welcome-label"><Sparkles size={14} /> YOUR HELM</div>
                  <h2>{activeTasks.length === 0 ? "A clear horizon starts here." : waterState.title}</h2>
                  <p>{activeTasks.length === 0 ? "This is your space to bring everything together. Start with one task, or connect a service when you’re ready." : `${activeTasks.length} active ${activeTasks.length === 1 ? "task" : "tasks"} on your radar. ${waterState.message}`}</p>
                  <div className="welcome-actions">
                    <button className="button button-light" onClick={startNewTask}><Plus size={16} /> Add a task</button>
                    <button className="text-button welcome-link" onClick={() => goTo("connections")}>Explore connections <ArrowRight size={15} /></button>
                  </div>
                </div>
                <div className="welcome-art" aria-hidden="true">
                  <div className="sun-halo" />
                  <div className="water-line water-line-one" />
                  <div className="water-line water-line-two" />
                  <div className="water-line water-line-three" />
                  <div className="water-sparkle sparkle-one">✦</div><div className="water-sparkle sparkle-two">✦</div>
                  <div className="water-meter" role="meter" aria-label="Workload score" aria-valuemin={0} aria-valuemax={18} aria-valuenow={Math.min(workloadScore, 18)} aria-valuetext={`${formatPoints(workloadScore)} workload points`}>
                    <div className="water-meter-fill" style={{ width: `${waterState.percent}%` }} />
                  </div>
                  <div className="water-level-label">
                    <span>WORKLOAD · {formatPoints(workloadScore)} PTS</span>
                    <strong>{waterState.title}</strong>
                    <small>{waterState.message}</small>
                    {unscoredTaskCount > 0 && <small>{unscoredTaskCount} undated task{unscoredTaskCount === 1 ? "" : "s"} excluded</small>}
                  </div>
                </div>
              </section>

              <div className="stat-grid">
                <button className="stat-card" onClick={() => goTo("tasks")}>
                  <span className="stat-top"><span className="stat-icon stat-blue"><ListTodo size={17} /></span><span className="stat-arrow"><ArrowUpRight size={16} /></span></span>
                  <span className="stat-value">{activeTasks.length}</span><span className="stat-label">Active tasks</span>
                  <span className="stat-foot">{activeTasks.length ? "Keep your momentum going" : "Your list is clear"}</span>
                </button>
                <button className="stat-card" onClick={() => goTo("tasks")}>
                  <span className="stat-top"><span className="stat-icon stat-green"><CheckCircle2 size={17} /></span><span className="stat-arrow"><ArrowUpRight size={16} /></span></span>
                  <span className="stat-value">{completedTasks.length}</span><span className="stat-label">Completed</span>
                  <span className="stat-foot">{completedTasks.length ? "Nice work, keep it up" : "Your wins will show here"}</span>
                </button>
                <button className="stat-card" onClick={() => goTo("connections")}>
                  <span className="stat-top"><span className="stat-icon stat-teal"><Cloud size={17} /></span><span className="stat-arrow"><ArrowUpRight size={16} /></span></span>
                  <span className="stat-value">{connected ? integrations.length : 0}<span className="stat-out-of"> / {integrations.length}</span></span><span className="stat-label">Services connected</span>
                  <span className="stat-foot">{connected ? "Read-only access enabled" : "Connect only what you need"}</span>
                </button>
              </div>

              <div className="dashboard-grid">
                <section className="content-card task-card">
                  <div className="card-heading">
                    <div><span className="section-overline">YOUR NEXT STEPS</span><h2>Tasks on your tide</h2></div>
                    <button className="text-button card-link" onClick={() => goTo("tasks")}>See all <ArrowRight size={15} /></button>
                  </div>
                  {activeTasks.length ? (
                    <div className="task-list">
                      {activeTasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={editTask} onDelete={deleteTask} />)}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Inbox}
                      title="Nothing on the tide just yet"
                      description="Add a task to give your day a little direction."
                      action={<button className="text-button empty-action" onClick={startNewTask}>Create your first task <ArrowRight size={14} /></button>}
                    />
                  )}
                  {activeTasks.length > 4 && <button className="view-more" onClick={() => goTo("tasks")}>View {activeTasks.length - 4} more tasks <ArrowRight size={14} /></button>}
                </section>

                <section className="content-card connection-card">
                  <div className="card-heading">
                    <div><span className="section-overline">KEEP IT CONNECTED</span><h2>Your services</h2></div>
                    <span className={`not-connected-badge${connected ? " connected-badge" : ""}`}><span /> {connected ? "Connected" : "Not connected"}</span>
                  </div>
                  <div className="service-preview">
                    {integrations.slice(0, 3).map(({ name, icon: Icon, color }) => (
                      <div className="service-preview-row" key={name}>
                        <span className={`service-icon ${color}`}><Icon size={16} /></span><span>{name}</span><span className="service-offline">{connected ? "Read-only" : "Not connected"}</span>
                      </div>
                    ))}
                  </div>
                  <button className="connection-card-footer" onClick={() => goTo("connections")}>Manage connections <ArrowRight size={15} /></button>
                </section>
              </div>
              <div className="privacy-footnote"><ShieldCheck size={14} /> Your tasks stay in this browser. Google data is accessed read-only{connected ? " through your connected account." : " after you connect an account."}</div>
            </>
          )}

          {view === "tasks" && (
            <section className="content-card full-card">
              {mockTaskCount > 0 && (
                <div className="mock-inline-note"><span className="mock-tag mock-tag-strong">MOCK</span> {mockTaskCount} TEST task{mockTaskCount === 1 ? "" : "s"} in this list. Clear them from the dashboard.</div>
              )}
              <div className="card-heading task-page-heading">
                <div><span className="section-overline">YOUR LIST</span><h2>{activeTasks.length} active <span className="muted-count">· {completedTasks.length} completed</span></h2></div>
                <div className="filter-tabs">
                  {(["all", "active", "completed"] as const).map((filter) => (
                    <button key={filter} onClick={() => setTaskFilter(filter)} className={taskFilter === filter ? "filter-active" : ""}>{filter[0].toUpperCase() + filter.slice(1)}</button>
                  ))}
                </div>
              </div>
              {visibleTasks.length ? (
                <div className="task-list task-list-page">
                  {visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={editTask} onDelete={deleteTask} />)}
                </div>
              ) : (
                <EmptyState
                  icon={taskFilter === "completed" ? CheckCircle2 : Inbox}
                  title={query ? "No matching tasks" : taskFilter === "completed" ? "No completed tasks yet" : "A blank page can be a good thing"}
                  description={query ? "Try another search, or clear it to see your full list." : "Add a task whenever something needs a spot on your radar."}
                  action={!query && taskFilter !== "completed" ? <button className="button button-primary empty-button" onClick={startNewTask}><Plus size={16} /> Add your first task</button> : undefined}
                />
              )}
              <div className="storage-note"><ShieldCheck size={14} /> Task data is stored locally in this browser only.</div>
              <section className="scoring-guide" aria-label="Workload scoring guide">
                <div className="scoring-guide-heading"><div><span className="section-overline">HOW YOUR LOAD IS SCORED</span><h3>Effort × urgency</h3></div><span>Undated tasks are not scored</span></div>
                <div className="scoring-guide-grid">
                  <div><strong>Light</strong><span>1 pt · Quick reports, reading, simple research</span></div>
                  <div><strong>Medium</strong><span>2 pts · Assignments, quiz prep, exercises</span></div>
                  <div><strong>Heavy</strong><span>3 pts · Major projects, presentations, complex work</span></div>
                  <div><strong>Intensive</strong><span>4 pts · Coding, research papers, system development</span></div>
                </div>
                <div className="urgency-guide">
                  <span><b>8+ days</b> ×0.5</span><span><b>4–7 days</b> ×0.75</span><span><b>2–3 days</b> ×1</span>
                  <span><b>Tomorrow</b> ×1.5</span><span><b>Today</b> ×2</span><span><b>Overdue</b> ×2.5</span>
                </div>
                <div className="scoring-bands">
                  <span><b>0–4</b> Calm</span><span><b>5–9</b> Rising</span><span><b>10–17</b> High</span><span><b>18+</b> Turbulent</span>
                </div>
                <p>Task load = weight × urgency. You can override the suggested points on any task.</p>
              </section>
            </section>
          )}

          {view === "files" && (
            <section className="content-card full-card resource-page">
              <div className="card-heading">
                <div><span className="section-overline">{connected ? "GOOGLE DRIVE · READ-ONLY" : "GOOGLE DRIVE · UI PREVIEW"}</span><h2>Your cargo, in one place</h2></div>
                {connected ? <span className="not-connected-badge connected-badge"><span /> Connected</span> : <span className="mock-tag mock-tag-strong">MOCK CONTENT</span>}
              </div>
              {!connected && <div className="mock-preview-note"><ShieldCheck size={14} /> These TEST rows are mock data for the UI preview, not files from your Google Drive.</div>}
              {driveError && <p className="integration-error" role="alert">{driveError}</p>}
              {driveLoading && <p className="integration-message">Loading your Google Drive files…</p>}
              <div className="file-browser-toolbar">
                <div className="file-breadcrumb"><FolderOpen size={15} /><span>My Drive</span><ChevronRight size={14} /><strong>All files</strong></div>
                <label className="file-search"><Search size={15} /><input aria-label="Search Drive files" placeholder={connected ? "Search Drive files" : "Search test files"} value={fileQuery} onChange={(event) => setFileQuery(event.target.value)} /></label>
              </div>
              <div className="file-table">
                <div className="file-table-head"><span>Name</span><span>Type</span><span>Details</span><span>Source</span></div>
                {connected ? filteredGoogleFiles.map((file) => {
                  const isDocument = file.mimeType === "application/vnd.google-apps.document";
                  const isSpreadsheet = file.mimeType === "application/vnd.google-apps.spreadsheet";
                  const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                  const Icon = isFolder ? Folder : isSpreadsheet ? Table2 : FileText;
                  const color = isFolder ? "drive" : isSpreadsheet ? "sheets" : isDocument ? "docs" : "gmail";
                  const type = isFolder ? "Folder" : isSpreadsheet ? "Google Sheet" : isDocument ? "Google Doc" : file.mimeType.split("/").pop() ?? "File";
                  const modified = file.modifiedTime
                    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(file.modifiedTime))
                    : "—";
                  return (
                    <div className="file-table-row" key={file.id}>
                      <span className="file-name"><span className={`service-icon ${color}`}><Icon size={16} /></span>{file.webViewLink ? <a href={file.webViewLink} target="_blank" rel="noreferrer">{file.name}</a> : file.name}</span>
                      <span>{type}</span>
                      <span>{modified}</span>
                      <span>{isDocument || isSpreadsheet ? <button className="file-preview-button" onClick={() => previewGoogleFile(file)}>Preview</button> : "Drive"}</span>
                    </div>
                  );
                }) : filteredMockFiles.map(({ name, type, detail, icon: Icon, color }) => (
                  <div className="file-table-row" key={name}>
                    <span className="file-name"><span className={`service-icon ${color}`}><Icon size={16} /></span>{name}</span>
                    <span>{type}</span><span>{detail}</span><span><span className="mock-tag">MOCK</span></span>
                  </div>
                ))}
                {connected && !driveLoading && filteredGoogleFiles.length === 0 && <div className="file-no-results">{fileQuery ? "No matching Drive files." : "No files found in Google Drive."}</div>}
                {!connected && filteredMockFiles.length === 0 && <div className="file-no-results">No matching TEST files.</div>}
              </div>
              {filePreviewLoading && <p className="integration-message">Loading file preview…</p>}
              {filePreviewError && <p className="integration-error" role="alert">{filePreviewError}</p>}
              {connected && filePreview && (
                <section className="google-file-preview">
                  <div className="google-file-preview-heading"><h3>{filePreview.title}</h3><span>{filePreview.kind === "document" ? "Google Docs" : "Google Sheets"} · read-only</span></div>
                  {filePreview.kind === "document"
                    ? <pre>{filePreview.text || "This document has no text content."}</pre>
                    : filePreview.values?.length
                      ? <div className="sheet-preview-table">{filePreview.values.map((row, rowIndex) => <div className="sheet-preview-row" key={rowIndex}>{row.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}</div>)}</div>
                      : <p className="integration-message">This spreadsheet is empty.</p>}
                </section>
              )}
              {!connected && <button className="file-connect-link" onClick={() => goTo("connections")}>Connect Google Drive <ArrowRight size={14} /></button>}
              {connected && filePreview && <button className="file-connect-link" onClick={() => setFilePreview(null)}>Close file preview <ArrowRight size={14} /></button>}
              <div className="file-capabilities">
                <div><Folder size={17} /><span>Browse folders and files</span></div>
                <div><Search size={17} /><span>Search your Drive</span></div>
                <div><BookOpen size={17} /><span>Preview Docs and Sheets</span></div>
              </div>
            </section>
          )}

          {view === "calendar" && (
            <>
              {!connected && <div className="mock-inline-note calendar-mock-note"><span className="mock-tag mock-tag-strong">LOCAL TASKS</span> Sign in to show Google Calendar events. Tasks you add with due dates also appear here.</div>}
              <CalendarPage tasks={tasks} connected={connected} onConnect={() => goTo("connections")} />
            </>
          )}

          {view === "archives" && (
            <section className="content-card full-card resource-page">
              <div className="card-heading">
                <div><span className="section-overline">COMPLETED WORK</span><h2>Past the horizon</h2></div>
                <span className="archive-count">{completedTasks.length} completed</span>
              </div>
              {completedTasks.length ? (
                <div className="task-list task-list-page">{completedTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={editTask} onDelete={deleteTask} />)}</div>
              ) : (
                <EmptyState icon={Archive} title="Nothing archived yet" description="Tasks you complete will settle here, ready whenever you want to look back." />
              )}
            </section>
          )}

          {view === "connections" && (
            <>
              <section className="signal-banner">
                <div className="signal-banner-icon"><Signal size={20} /></div>
                <div>
                  <strong>{connected ? `Connected${session?.user?.name ? ` as ${session.user.name}` : ""}` : "Connect your Google account"}</strong>
                  <p>{connected ? `${session?.user?.email ?? "Google account"} · Read-only access to Drive, Calendar, Docs, and Sheets.` : "Sign in with Google to browse Drive, see Calendar events, and preview Docs and Sheets. Gmail is not requested."}</p>
                </div>
                {connected
                  ? <button className="button button-quiet" onClick={() => signOut()}><LogOut size={15} /> Sign out</button>
                  : <button className="button button-primary" onClick={() => signIn("google")} disabled={sessionStatus === "loading"}>{sessionStatus === "loading" ? "Checking…" : "Continue with Google"}</button>}
              </section>
              <div className="integration-grid">
                {integrations.map(({ name, detail, icon: Icon, color }) => (
                  <article className="integration-card" key={name}>
                    <div className={`integration-icon ${color}`}><Icon size={19} /></div>
                    <div className="integration-copy"><h2>{name}</h2><p>{detail}</p></div>
                    <div className={`integration-status${connected ? " integration-status-connected" : ""}`}><span className="status-dot" /> {connected ? "Read-only access active" : "Not connected"}</div>
                  </article>
                ))}
              </div>
              <div className="security-note"><ShieldCheck size={17} /><div><strong>Read-only Google access</strong><p>Google tokens are kept in an encrypted, HttpOnly Auth.js cookie; API calls use them server-side, and client-side code never receives the raw tokens. Your tasks remain in this browser. To revoke the Google grant entirely, remove this app from your Google Account’s third-party connections.</p></div></div>
            </>
          )}
        </div>
        <footer className="app-footer"><span>Made for calmer waters <span className="footer-wave">~</span></span><span>{connected ? "Google read-only access active" : "Google services are off"} <i /></span></footer>
      </section>

      {(dialogOpen || taskBeingEdited) && (
        <TaskDialog
          key={taskBeingEdited?.id ?? "new-task"}
          initialTask={taskBeingEdited ?? undefined}
          onClose={() => { setDialogOpen(false); setTaskBeingEdited(null); }}
          onSave={saveTask}
        />
      )}
    </main>
  );
}
