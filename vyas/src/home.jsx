import { useStore, pct, SUBJECTS, inClass, classLabel } from './store.js'
import { timeAgo } from './util.js'
import { Table, Badge } from './pages.jsx'
import { Award, CheckCircle2, Clock3, FileText } from './components/icons.jsx'

const lowSubjects = (s, id) => SUBJECTS.filter((x) => pct(s.attendance[id][x]) < 75)

const studentsFor = (s, user) => {
  const all = s.users.filter((u) => u.role === 'student')
  if (user.role === 'admin') return all
  return all.filter((st) => (user.classes || []).some((c) => inClass(st, c)))
}

function Stat({ label, value, tab, go, bad, highlight }) {
  return (
    <div
      className={`cursor-pointer rounded-2xl border p-5 transition hover:-translate-y-0.5 ${
        highlight
          ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
      onClick={() => go && go(tab)}
    >
      <span className={`text-xs font-medium ${highlight ? 'opacity-60' : 'text-slate-400'}`}>{label}</span>
      <p className={`mt-3 font-display text-4xl ${bad && value > 0 ? 'text-rose-500' : ''}`}>{value}</p>
    </div>
  )
}

export function Home({ user, go }) {
  const s = useStore()
  const nm = (id) => s.users.find((u) => u.id === id)?.name
  const ev = (id) => s.events.find((e) => e.id === id)?.title
  const notices = [...s.notices].sort((a, b) => b.time - a.time).slice(0, 3)
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')

  const NoticeList = () => (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h3>Latest campus notices</h3>
        <button className="ghost small" onClick={() => go('notices')}>View all notices</button>
      </div>
      <div className="grid">
        {notices.map((n) => (
          <div className="card" key={n.id}>
            <div className="flex items-center justify-between gap-2">
              <b className="text-sm font-semibold">{n.title}</b>
              <span className="tag official">{n.kind}</span>
            </div>
            {n.body && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{n.body}</p>}
            <p className="muted mt-3">{nm(n.authorId)} · {timeAgo(n.time)}</p>
          </div>
        ))}
      </div>
    </div>
  )

  if (user.role === 'student') {
    const low = lowSubjects(s, user.id)
    const certs = s.certificates.filter((c) => c.studentId === user.id)
    const todo = s.assignments.filter((a) => !s.submissions.some((x) => x.assignmentId === a.id && x.studentId === user.id))
    const graded = s.submissions.filter((x) => x.studentId === user.id && x.grade !== null && x.grade !== '')

    return (
      <div>
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Student workspace</p>
            <h1 className="font-display text-4xl tracking-tight text-slate-950 dark:text-white sm:text-5xl">Good morning, {user.name.split(' ')[0]}.</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Here’s what’s happening across your academic space today.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Clock3 className="size-4" />
            Live ERP sync active
          </div>
        </div>

        <section className="mb-8 overflow-hidden rounded-3xl bg-[#0d0e10] text-white shadow-xl shadow-slate-950/10">
          <div className="grid lg:grid-cols-[1.4fr_0.6fr]">
            <div className="relative p-6 sm:p-8">
              <div className="absolute right-0 top-0 size-48 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-indigo-500 text-2xl font-bold">{initials}</div>
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="!m-0 font-display !text-3xl !text-white">{user.name}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
                      <CheckCircle2 className="size-3" /> Verified student
                    </span>
                  </div>
                  <p className="text-sm text-white/50">{user.college}</p>
                  <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
                    {[
                      ['Student ID', user.rollNumber || user.id],
                      ['Branch', user.branch],
                      ['Batch', user.batch],
                      ['Section', `Sec ${user.section}`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">{label}</p>
                        <p className="mt-1 text-sm font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-white/10 lg:border-l lg:border-t-0">
              <div onClick={() => go('documents')} className="flex cursor-pointer flex-col justify-center border-r border-white/10 p-6 transition hover:bg-white/5">
                <FileText className="mb-4 size-5 text-indigo-300" />
                <p className="font-display text-4xl">{s.documents.filter((d) => d.studentId === user.id).length}</p>
                <p className="mt-1 text-xs text-white/40">Vault documents</p>
              </div>
              <div onClick={() => go('events')} className="flex cursor-pointer flex-col justify-center p-6 transition hover:bg-white/5">
                <Award className="mb-4 size-5 text-amber-300" />
                <p className="font-display text-4xl">{certs.filter((c) => c.status === 'verified').length}</p>
                <p className="mt-1 text-xs text-white/40">Verified certificates</p>
              </div>
            </div>
          </div>
        </section>

        {low.length > 0 && <div className="warn">Attendance below 75% in {low.join(', ')}. Open Attendance or Event OD to review.</div>}

        <div className="grid">
          <Stat highlight label="Assignments to submit" value={todo.length} tab="assignments" go={go} />
          <Stat label="Certificates awaiting review" value={certs.filter((c) => c.status === 'pending').length} tab="events" go={go} />
          <Stat label="Certificates verified" value={certs.filter((c) => c.status === 'verified').length} tab="events" go={go} />
          <Stat label="Graded assignments" value={graded.length} tab="assignments" go={go} />
        </div>

        <NoticeList />
      </div>
    )
  }

  const mine = studentsFor(s, user)
  const ids = mine.map((x) => x.id)
  const pending = s.certificates.filter((c) => c.status === 'pending' && ids.includes(c.studentId))
  const ungraded = s.submissions.filter((x) => ids.includes(x.studentId) && (x.grade === null || x.grade === ''))
  const lowStudents = mine.filter((st) => lowSubjects(s, st.id).length)
  const isAdmin = user.role === 'admin'

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">{isAdmin ? 'Administration console' : 'Faculty console'}</p>
          <h1 className="font-display text-4xl tracking-tight text-slate-950 dark:text-white sm:text-5xl">Good morning, {user.name}.</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isAdmin ? 'Full institutional oversight across students, faculty, library, and sports.' : 'Manage attendance, marks, and verifications for your assigned classes.'}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          <span className="size-2 rounded-full bg-emerald-500" /> Student records live
        </div>
      </div>

      {!isAdmin && (
        <div className="card mb-6">
          <h3>My assigned classes</h3>
          {(user.classes || []).length === 0 && <p className="muted">No classes assigned yet. Ask the admin to assign classes.</p>}
          <div className="row wrap mt-2">
            {(user.classes || []).map((c, i) => (
              <span key={i} className="tag official">
                {classLabel(c)} · {s.users.filter((u) => u.role === 'student' && inClass(u, c)).length} students
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid mb-8">
        <Stat highlight label={isAdmin ? 'Total Students' : 'My Students'} value={mine.length} tab={isAdmin ? 'users' : 'people'} go={go} />
        <Stat label="Certificates to verify" value={pending.length} tab="events" go={go} bad />
        <Stat label="Submissions to grade" value={ungraded.length} tab="assignments" go={go} bad />
        <Stat label="Students below 75% attendance" value={lowStudents.length} tab="attendance" go={go} bad />
        {isAdmin && <Stat label="Teachers" value={s.users.filter((u) => u.role === 'teacher').length} tab="teachers" go={go} />}
        {isAdmin && <Stat label="Open counselling requests" value={s.counselling.filter((c) => c.status === 'open').length} tab="counselling" go={go} bad />}
        {isAdmin && <Stat label="New teacher ratings/complaints" value={s.feedback.filter((f) => f.status === 'new').length} tab="teachers" go={go} bad />}
      </div>

      <h3>Pending certificate verifications</h3>
      {pending.length === 0 ? <p className="muted">Nothing to verify.</p> : (
        <Table head={['Student', 'Event', 'File', 'Status']} rows={pending.map((c) => [nm(c.studentId), ev(c.eventId), c.file, <Badge status={c.status} />])} />
      )}

      {lowStudents.length > 0 && (
        <>
          <h3>Low attendance alert (&lt; 75%)</h3>
          <Table head={['Student', 'Class', 'Subjects below 75%']} rows={lowStudents.map((st) => [st.name, classLabel(st), lowSubjects(s, st.id).join(', ')])} />
        </>
      )}

      <NoticeList />
    </div>
  )
}
