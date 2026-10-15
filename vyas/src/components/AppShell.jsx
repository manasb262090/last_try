import { useState } from "react"
import {
  Award,
  BarChart,
  Bell as BellIcon,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  Moon,
  Search as SearchIcon,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Users,
  UsersRound,
  X,
} from "./icons.jsx"
import Brand from "./Brand.jsx"
import Modal from "./Modal.jsx"
import { useStore, setState, visibleNotice } from "../store.js"
import { timeAgo } from "../util.js"

const TAB_ICONS = {
  home: LayoutDashboard,
  connect: UsersRound,
  notices: Megaphone,
  events: Award,
  marks: BarChart,
  attendance: Clock3,
  assignments: FileCheck2,
  timetable: CalendarDays,
  leave: FileText,
  fees: CreditCard,
  lostfound: HelpCircle,
  counselling: MessageSquareText,
  documents: FileText,
  staff: Users,
  profile: GraduationCap,
  people: UsersRound,
  users: Users,
  reports: BarChart,
  teachers: GraduationCap,
  feedback: Star,
  assistant: Sparkles,
  library: BookOpen,
  sports: Trophy,
  od: FileCheck2,
}

const GROUPS = [
  { title: "Core Workspace", keys: ["home", "connect", "assistant", "notices", "documents", "profile"] },
  { title: "Academics & Records", keys: ["marks", "attendance", "assignments", "timetable", "events", "od", "leave"] },
  { title: "Campus Services", keys: ["library", "sports", "fees", "counselling", "lostfound", "staff", "feedback"] },
  { title: "Administration", keys: ["people", "users", "teachers", "reports"] },
]

export default function AppShell({
  children,
  user,
  tabs,
  currentTab,
  onNavigate,
  onMoveHistory,
  canBack,
  canForward,
  darkMode,
  onThemeToggle,
  onLogout,
}) {
  const s = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [snap, setSnap] = useState(0)
  const [q, setQ] = useState("")

  const initials = (user.name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const userDetail =
    user.role === "student"
      ? `${user.branch || "Campus"} · ${user.batch || ""} Sec ${user.section || ""}`
      : `${user.designation || user.role.replace("_", " ")}${user.dept ? ` · ${user.dept}` : ""}`

  const t = q.trim().toLowerCase()
  const has = (x) => (x || "").toLowerCase().includes(t)
  const searchResults = !t
    ? []
    : [
        ...(user.role !== "student"
          ? s.users.filter((u) => u.role === "student" && has(u.name)).map((u) => ["Student", u.name, "people"])
          : []),
        ...(user.role === "admin"
          ? s.users.filter((u) => u.role === "teacher" && has(u.name)).map((u) => ["Teacher", u.name, "teachers"])
          : []),
        ...s.events.filter((e) => has(e.title)).map((e) => ["Event", e.title, "events"]),
        ...s.assignments.filter((a) => has(a.title)).map((a) => ["Assignment", a.title, "assignments"]),
        ...s.channels.filter((c) => has(c.name)).map((c) => [c.type === "club" ? "Club" : "Group", c.name, "connect"]),
        ...s.notices.filter((n) => visibleNotice(n, user) && has(n.title)).map((n) => ["Notice", n.title, "notices"]),
        ...s.staff.filter((f) => has(f.name) || has(f.role)).map((f) => ["Staff", `${f.name} · ${f.role}`, "staff"]),
      ].slice(0, 8)

  const today = new Date().toISOString().slice(0, 10)
  const loanAlerts = s.libraryIssues
    .filter(
      (issue) =>
        issue.studentId === user.id &&
        issue.status === "issued" &&
        issue.dueDate &&
        issue.dueDate <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
    )
    .map((issue) => ({
      id: "loan-reminder-" + issue.id,
      userId: user.id,
      text:
        issue.dueDate < today
          ? `${issue.bookTitle} is overdue. It was due ${issue.dueDate}.`
          : `Return ${issue.bookTitle} by ${issue.dueDate}.`,
      time: Date.parse(issue.dueDate + "T00:00:00") - 3 * 86400000,
    }))
  const mineAlerts = [
    ...s.notifications.filter((n) => n.userId === "all" || n.userId === user.id),
    ...loanAlerts,
  ].sort((a, b) => b.time - a.time)
  const readAt = s.readAt[user.id] || 0
  const unread = mineAlerts.filter((n) => n.time > readAt).length

  const toggleBell = () => {
    if (!bellOpen) {
      setSnap(readAt)
      setState((d) => ((d.readAt[user.id] = Date.now()), d))
    }
    setBellOpen(!bellOpen)
  }

  const navigate = (tabKey) => {
    onNavigate(tabKey)
    setMenuOpen(false)
  }

  const availableKeys = new Set(tabs.map(([k]) => k))
  const tabLabelMap = Object.fromEntries(tabs.map(([k, label]) => [k, label]))

  return (
    <div className="min-h-screen bg-[#f6f6f2] text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#0d0e10] px-5 py-6 text-white transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Brand inverse />
          <button
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-full border border-white/10 text-white/60 lg:hidden"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
          {GROUPS.map((group) => {
            const groupTabs = group.keys.filter((k) => availableKeys.has(k))
            if (groupTabs.length === 0) return null
            return (
              <div key={group.title}>
                <p className="px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  {group.title}
                </p>
                <nav className="mt-2 space-y-1">
                  {groupTabs.map((key) => {
                    const Icon = TAB_ICONS[key] || LayoutDashboard
                    const active = key === currentTab
                    return (
                      <button
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          active
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-white/60 hover:bg-white/7 hover:text-white"
                        }`}
                        key={key}
                        onClick={() => navigate(key)}
                        type="button"
                      >
                        <Icon className="size-[18px]" />
                        <span className="truncate">{tabLabelMap[key]}</span>
                      </button>
                    )
                  })}
                </nav>
              </div>
            )
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/55">
            <GraduationCap className="size-4" />
            Academic year 2025–26
          </div>
          <div className="flex items-center gap-3 border-t border-white/10 pt-3">
            {user.photo ? (
              <img src={user.photo} alt={user.name} className="size-10 rounded-full object-cover" />
            ) : (
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-500 text-xs font-bold">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-white/40">{userDetail}</p>
            </div>
            <button
              aria-label="Log out"
              className="text-white/40 transition hover:text-white"
              onClick={onLogout}
              title="Log out"
              type="button"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {menuOpen && (
        <button
          aria-label="Close menu overlay"
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center gap-2 border-b border-slate-200/80 bg-[#f6f6f2]/90 px-4 backdrop-blur-xl sm:px-8 dark:border-slate-800 dark:bg-slate-950/90">
          <button
            aria-label="Open navigation"
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white lg:hidden dark:border-slate-700 dark:bg-slate-900"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex items-center gap-1">
            <button
              aria-label="Back"
              title="Back"
              disabled={!canBack}
              onClick={() => onMoveHistory(-1)}
              className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Forward"
              title="Forward"
              disabled={!canForward}
              onClick={() => onMoveHistory(1)}
              className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="relative ml-2 max-w-sm flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search portal"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-indigo-950"
              placeholder="Search people, events, notices or clubs..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {t && (
              <div className="absolute left-0 top-12 z-30 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {searchResults.length === 0 && <p className="p-4 text-xs text-slate-400">No results.</p>}
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                    onClick={() => {
                      navigate(r[2])
                      setQ("")
                    }}
                  >
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                      {r[0]}
                    </span>
                    <span className="truncate font-medium">{r[1]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              aria-label="Toggle color theme"
              className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
              onClick={onThemeToggle}
              type="button"
            >
              {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            <div className="relative">
              <button
                aria-label="Notifications"
                className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                onClick={toggleBell}
                type="button"
              >
                <BellIcon className="size-4" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                    {unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-12 z-30 max-h-96 w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    Notifications
                  </div>
                  {mineAlerts.length === 0 && <p className="p-4 text-xs text-slate-400">No notifications.</p>}
                  {mineAlerts.slice(0, 12).map((n) => (
                    <div
                      key={n.id}
                      className={`border-b border-slate-100 px-4 py-3 text-xs last:border-0 dark:border-slate-800 ${
                        n.time > snap ? "bg-indigo-50/60 dark:bg-indigo-950/30" : ""
                      }`}
                    >
                      <p className="font-medium text-slate-800 dark:text-slate-200">{n.text}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.time)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              aria-label="Open profile modal"
              className="ml-1 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold sm:flex dark:border-slate-700 dark:bg-slate-900"
              onClick={() => setProfileOpen(true)}
              type="button"
            >
              <span className="grid size-7 place-items-center overflow-hidden rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {user.photo ? <img src={user.photo} alt={user.name} className="size-full object-cover" /> : initials}
              </span>
              <span className="max-w-[120px] truncate text-xs">{user.name}</span>
              <ChevronDown className="size-3.5 text-slate-400" />
            </button>
          </div>
        </header>

        <main className="erp-module mx-auto max-w-[1500px] p-4 sm:p-8 lg:p-10">{children}</main>
      </div>

      {profileOpen && (
        <Modal
          eyebrow={`${user.role.replace("_", " ")} profile`}
          onClose={() => setProfileOpen(false)}
          title={user.name}
        >
          <div className="overflow-hidden rounded-2xl bg-slate-950 text-white">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              <span className="grid size-20 place-items-center rounded-2xl bg-indigo-500 text-2xl font-bold">
                {initials}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-3xl">{user.name}</p>
                  <ShieldCheck className="size-5 text-emerald-400" />
                </div>
                <p className="mt-1 text-sm text-white/50">{userDetail}</p>
                <span className="mt-3 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Institution verified · ID: {user.rollNumber || user.id}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Login / Roll ID", user.rollNumber || user.id],
              ["Role", user.role.replace("_", " ")],
              ["Email", user.email || "Not set"],
              ["Phone", user.phone || "Not set"],
            ].map(([label, value]) => (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700" key={label}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-xs font-semibold text-white dark:bg-white dark:text-slate-950"
              onClick={() => {
                navigate("profile")
                setProfileOpen(false)
              }}
              type="button"
            >
              Edit full profile & directory
            </button>
            <button
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              onClick={onLogout}
              type="button"
            >
              Log out
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
