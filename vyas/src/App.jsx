import { useState } from 'react'
import { useStore, setState, resetData, SUBJECTS } from './store.js'
import { supabase, supabaseConfigured } from './supabase.js'
import { Home } from './home.jsx'
import { Events, Marks, Attendance, Assignments } from './pages.jsx'
import { CampusConnect } from './social.jsx'
import { Notices, Staff, Counselling, Documents, People, Assistant } from './more.jsx'
import { Teachers, Feedback } from './teachers.jsx'
import { Timetable, Leave, Fees, LostFound } from './campus.jsx'
import { Users, Profile, Reports } from './admin.jsx'
import Library from './modules/src/modules/Library.jsx'
import Sports from './modules/src/modules/Sports.jsx'
import AttendanceOD from './modules/src/modules/AttendanceOD.jsx'
import AppShell from './components/AppShell.jsx'
import Brand from './components/Brand.jsx'
import { ArrowRight, BookOpen, FileCheck2, LockKeyhole, Moon, Sun, Users as UsersIcon } from './components/icons.jsx'
import './extra.css'

const TABS = [
  ['home', 'Overview', Home],
  ['connect', 'Campus Connect', CampusConnect],
  ['notices', 'Notices', Notices],
  ['events', 'Events', Events],
  ['marks', 'Marks', Marks],
  ['attendance', 'Attendance', Attendance],
  ['assignments', 'Assignments', Assignments],
  ['timetable', 'Timetable', Timetable],
  ['leave', 'Leave', Leave],
  ['fees', 'Fees', Fees, ['student', 'admin']],
  ['lostfound', 'Lost & Found', LostFound],
  ['counselling', 'Counselling', Counselling],
  ['documents', 'Documents', Documents],
  ['staff', 'Staff', Staff],
  ['profile', 'Profile', Profile],
  ['people', 'People', People, ['teacher', 'admin']],
  ['users', 'Users', Users, ['admin']],
  ['reports', 'Reports', Reports, ['admin']],
  ['teachers', 'Teachers', Teachers, ['admin']],
  ['feedback', 'Rate Teacher', Feedback, ['student']],
  ['assistant', 'AI Assistant', Assistant],
  ['library', 'Library', Library, ['student', 'teacher', 'admin', 'library_operator']],
  ['sports', 'Sports', Sports, ['student', 'teacher', 'admin', 'sports_coordinator']],
  ['od', 'Event OD', AttendanceOD, ['student', 'teacher', 'admin', 'sports_coordinator']],
]

export default function App() {
  const s = useStore()
  const [uid, setUid] = useState(null)
  const [tab, setTab] = useState('home')
  const [tabHistory, setTabHistory] = useState(['home'])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [darkMode, setDarkMode] = useState(false)
  const [loginRole, setLoginRole] = useState('student')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [signupMessage, setSignupMessage] = useState('')
  const [signup, setSignup] = useState({ fullName: '', loginId: '', email: '', password: '', phone: '', college: '', department: '', branch: '', year: '', className: '', section: '' })
  const user = s.users.find((u) => u.id === uid)

  const goToTab = (nextTab) => {
    if (nextTab === tab) return
    const nextHistory = tabHistory.slice(0, historyIndex + 1)
    nextHistory.push(nextTab)
    setTabHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
    setTab(nextTab)
  }

  const moveHistory = (direction) => {
    const nextIndex = historyIndex + direction
    if (nextIndex < 0 || nextIndex >= tabHistory.length) return
    setHistoryIndex(nextIndex)
    setTab(tabHistory[nextIndex])
  }

  const login = async (event) => {
    event.preventDefault()
    if (supabaseConfigured) {
      setLoginBusy(true)
      setLoginError('')
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'login', loginId, role: loginRole, password }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Sign-in failed.')
        const { error } = await supabase.auth.setSession(result.session)
        if (error) throw error
        const profile = result.profile
        const account = {
          id: profile.login_id,
          authId: profile.id,
          name: profile.full_name,
          role: profile.role,
          email: profile.email || '',
          phone: profile.phone || '',
          college: profile.college || '',
          dept: profile.department || '',
          designation: profile.designation || '',
          subjects: profile.subjects || [],
          branch: profile.branch || '',
          batch: profile.year || '',
          section: profile.section || '',
          rollNumber: profile.login_id,
          classes: profile.classes || [],
        }
        setState((d) => {
          const existing = d.users.find((u) => u.id === account.id)
          if (existing) Object.assign(existing, account)
          else d.users.push(account)
          if (account.role === 'student') {
            d.marks[account.id] ||= Object.fromEntries(SUBJECTS.map((subject) => [subject, 0]))
            d.attendance[account.id] ||= Object.fromEntries(SUBJECTS.map((subject) => [subject, { attended: 0, total: 0 }]))
          }
          return d
        })
        setLoginId('')
        setPassword('')
        const startTab = account.role === 'library_operator' ? 'library' : account.role === 'sports_coordinator' ? 'sports' : 'home'
        setTab(startTab)
        setTabHistory([startTab])
        setHistoryIndex(0)
        setUid(account.id)
      } catch (error) {
        setLoginError(error.message || 'Sign-in failed.')
      } finally {
        setLoginBusy(false)
      }
      return
    }
    const account = s.users.find((u) => u.role === loginRole && u.id.toLowerCase() === loginId.trim().toLowerCase())
    if (!account) {
      setLoginError(`No ${loginRole.replace('_', ' ')} account matches that ID.`)
      return
    }
    setLoginError('')
    setLoginId('')
    const startTab = loginRole === 'library_operator' ? 'library' : loginRole === 'sports_coordinator' ? 'sports' : 'home'
    setTab(startTab)
    setTabHistory([startTab])
    setHistoryIndex(0)
    setUid(account.id)
  }

  const logout = async () => {
    if (supabaseConfigured) await supabase.auth.signOut()
    setUid(null)
    setTabHistory(['home'])
    setHistoryIndex(0)
  }

  const registerStudent = async (event) => {
    event.preventDefault()
    setLoginBusy(true)
    setLoginError('')
    setSignupMessage('')
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'signup_student', profile: signup }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Registration failed.')
      setSignupMessage(result.message)
      setLoginRole('student')
      setLoginId(signup.loginId)
      setPassword('')
      setSignup({ fullName: '', loginId: '', email: '', password: '', phone: '', college: '', department: '', branch: '', year: '', className: '', section: '' })
      setSignupOpen(false)
    } catch (error) {
      setLoginError(error.message || 'Registration failed.')
    } finally {
      setLoginBusy(false)
    }
  }

  const availableRoles = ['student', 'teacher', 'library_operator', 'sports_coordinator', 'admin'].filter((role) => s.users.some((u) => u.role === role))

  if (!user) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr] dark:bg-slate-950">
          <section className="relative hidden min-h-screen overflow-hidden bg-[#0d0e10] p-12 text-white lg:flex lg:flex-col xl:p-16">
            <div className="absolute -right-40 top-1/3 size-96 rounded-full bg-indigo-500/15 blur-3xl" />
            <Brand inverse />
            <div className="relative my-auto max-w-2xl">
              <p className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-white/45">
                <span className="h-px w-10 bg-white/30" />
                One campus. One trusted space.
              </p>
              <h1 className="font-display text-6xl leading-[0.98] tracking-[-0.04em] xl:text-7xl">
                Academics.<br />Identity.<br />Community.
              </h1>
              <p className="mt-8 max-w-lg text-lg leading-8 text-white/55">
                A unified digital campus for verified records, library & sports management, and supervised student–faculty connection.
              </p>
            </div>
            <div className="relative grid grid-cols-3 gap-3">
              {[
                { icon: FileCheck2, label: 'Verified records' },
                { icon: UsersIcon, label: 'Campus community' },
                { icon: LockKeyhole, label: 'Role-based security' },
              ].map(({ icon: Icon, label }) => (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4" key={label}>
                  <Icon className="mb-3 size-5 text-indigo-300" />
                  <p className="text-xs font-medium text-white/70">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-screen flex-col bg-[#f7f7f3] px-5 py-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-10 lg:px-16 xl:px-20">
            <div className="flex items-center justify-between lg:justify-end">
              <div className="lg:hidden"><Brand /></div>
              <button
                aria-label="Toggle color theme"
                className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                onClick={() => setDarkMode((v) => !v)}
                type="button"
              >
                {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
            </div>

            <div className="mx-auto my-auto w-full max-w-md py-8">
              <div className="mb-8">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                  {signupOpen ? 'Student registration' : 'Campus ERP Portal'}
                </p>
                <h2 className="font-display text-4xl leading-tight text-slate-950 dark:text-white sm:text-5xl">
                  {signupOpen ? 'Join your campus.' : 'Sign in to continue.'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {supabaseConfigured ? 'Sign in with your assigned role, ID, and password.' : 'Sign in with a demo role and ID.'}
                </p>
              </div>

              {signupMessage && (
                <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {signupMessage}
                </div>
              )}

              {!signupOpen ? (
                <form className="space-y-4" onSubmit={login}>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Account Role</span>
                    <select
                      aria-label="Account type"
                      value={loginRole}
                      onChange={(event) => { setLoginRole(event.target.value); setLoginError('') }}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold capitalize outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-indigo-950"
                    >
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>{role.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Account ID</span>
                    <input
                      aria-label="Account ID"
                      placeholder="e.g. s1, t1, a1, l1, sp1"
                      value={loginId}
                      onChange={(event) => { setLoginId(event.target.value); setLoginError('') }}
                      required
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-indigo-950"
                    />
                  </label>

                  {supabaseConfigured && (
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</span>
                      <input
                        aria-label="Password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) => { setPassword(event.target.value); setLoginError('') }}
                        required
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-indigo-950"
                      />
                    </label>
                  )}

                  {loginError && (
                    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                      {loginError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loginBusy}
                    className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-400"
                  >
                    {loginBusy ? 'Signing in…' : 'Log in'}
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </button>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={registerStudent}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['fullName', 'Full name'], ['loginId', 'Student ID'], ['email', 'Email'], ['password', 'Password (10+ chars)'],
                      ['phone', 'Phone'], ['college', 'College'], ['department', 'Department'], ['branch', 'Branch'],
                      ['year', 'Year or batch'], ['className', 'Class'], ['section', 'Section'],
                    ].map(([key, label]) => (
                      <input
                        key={key}
                        aria-label={label}
                        placeholder={label}
                        type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
                        minLength={key === 'password' ? 10 : undefined}
                        value={signup[key]}
                        onChange={(event) => setSignup({ ...signup, [key]: event.target.value })}
                        required={['fullName', 'loginId', 'email', 'password', 'college', 'branch', 'year', 'section'].includes(key)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                      />
                    ))}
                  </div>
                  {loginError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600">{loginError}</p>}
                  <button disabled={loginBusy} className="flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {loginBusy ? 'Creating account…' : 'Create account'}
                  </button>
                </form>
              )}

              {!supabaseConfigured && (
                <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">Quick Demo Accounts (click to fill):</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      ['student', 's1', 'Student (s1)'],
                      ['teacher', 't1', 'Teacher (t1)'],
                      ['admin', 'a1', 'Admin (a1)'],
                      ['library_operator', 'l1', 'Library (l1)'],
                      ['sports_coordinator', 'sp1', 'Sports (sp1)'],
                    ].map(([r, id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { setLoginRole(r); setLoginId(id); setLoginError('') }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <span>Students s1–s12, teachers t1–t2</span>
                    <button type="button" onClick={resetData} className="font-semibold text-indigo-600 underline dark:text-indigo-400">
                      Reset sample data
                    </button>
                  </div>
                </div>
              )}

              {supabaseConfigured && loginRole === 'student' && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <button
                    className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4 dark:text-white"
                    onClick={() => { setSignupOpen(!signupOpen); setLoginError('') }}
                    type="button"
                  >
                    {signupOpen ? 'Back to sign in' : 'Create student account'}
                  </button>
                </div>
              )}

              <p className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                <BookOpen className="size-3.5" />
                Secured by CampusVault & Connect ERP
              </p>
            </div>
          </section>
        </div>
      </div>
    )
  }

  const roleTabs = user.role === 'library_operator' ? ['library', 'profile'] : user.role === 'sports_coordinator' ? ['sports', 'od', 'profile'] : null
  const tabs = TABS.filter((t) => roleTabs ? roleTabs.includes(t[0]) : !t[3] || t[3].includes(user.role))
  const defaultTab = user.role === 'library_operator' ? 'library' : user.role === 'sports_coordinator' ? 'sports' : tabs[0]?.[0]
  const current = tabs.find((t) => t[0] === tab) || tabs.find((t) => t[0] === defaultTab) || tabs[0]
  const Page = current[2]

  return (
    <div className={darkMode ? 'dark' : ''}>
      <AppShell
        user={user}
        tabs={tabs}
        currentTab={current[0]}
        onNavigate={goToTab}
        onMoveHistory={moveHistory}
        canBack={historyIndex > 0}
        canForward={historyIndex < tabHistory.length - 1}
        darkMode={darkMode}
        onThemeToggle={() => setDarkMode((v) => !v)}
        onLogout={logout}
      >
        <Page user={user} go={goToTab} />
      </AppShell>
    </div>
  )
}
