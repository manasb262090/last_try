import { useState } from 'react'
import { useStore, setState, uid } from './store.js'
import { resizeImage, timeAgo } from './util.js'
import { Check, Heart, Image, MessageCircle, Plus, Send, ShieldCheck, Users } from './components/icons.jsx'

const TYPE_LABEL = { club: 'Club', channel: 'Channel', branch: 'Branch' }

export function CampusConnect({ user }) {
  const s = useStore()
  const [active, setActive] = useState(s.channels[0]?.id)
  const [form, setForm] = useState({ name: '', type: 'club', desc: '' })
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const [comment, setComment] = useState({})
  const [showMembers, setShowMembers] = useState(false)
  const [poll, setPoll] = useState(null)

  const isStaff = user.role !== 'student'
  const ch = s.channels.find((c) => c.id === active)
  const isMember = ch ? ch.members.includes(user.id) : false
  const person = (id) => s.users.find((u) => u.id === id)
  const mine = s.channels.filter((c) => c.members.includes(user.id))
  const others = s.channels.filter((c) => !c.members.includes(user.id))
  const posts = s.posts.filter((p) => p.channelId === active).sort((a, b) => b.time - a.time)

  const create = () => {
    if (!form.name.trim()) return
    const id = uid()
    setState((d) => {
      d.channels.push({ id, name: form.name.trim(), type: form.type, desc: form.desc.trim(), ownerId: user.id, members: [user.id] })
      return d
    })
    setForm({ name: '', type: 'club', desc: '' })
    setActive(id)
  }

  const toggleJoin = () =>
    setState((d) => {
      const c = d.channels.find((x) => x.id === active)
      c.members = c.members.includes(user.id) ? c.members.filter((m) => m !== user.id) : [...c.members, user.id]
      return d
    })

  const post = () => {
    const opts = (poll || []).map((o) => o.trim()).filter(Boolean)
    if (poll && (!text.trim() || opts.length < 2)) return
    if (!text.trim() && !photo) return
    setState((d) => {
      d.posts.unshift({
        id: uid(),
        channelId: active,
        authorId: user.id,
        text: text.trim(),
        photo,
        time: Date.now(),
        likes: [],
        comments: [],
        ...(poll ? { poll: { options: opts.map((t) => ({ id: uid(), text: t, votes: [] })) } } : {}),
      })
      return d
    })
    setText('')
    setPhoto(null)
    setPoll(null)
  }

  const vote = (pid, oid) =>
    setState((d) => {
      const p = d.posts.find((x) => x.id === pid)
      p.poll.options.forEach((o) => (o.votes = o.votes.filter((v) => v !== user.id)))
      p.poll.options.find((o) => o.id === oid).votes.push(user.id)
      return d
    })

  const pickPhoto = async (e) => {
    const f = e.target.files[0]
    if (f) setPhoto(await resizeImage(f, 700))
    e.target.value = ''
  }

  const like = (pid) =>
    setState((d) => {
      const p = d.posts.find((x) => x.id === pid)
      p.likes = p.likes.includes(user.id) ? p.likes.filter((x) => x !== user.id) : [...p.likes, user.id]
      return d
    })

  const addComment = (pid) => {
    const t = (comment[pid] || '').trim()
    if (!t) return
    setState((d) => {
      d.posts.find((x) => x.id === pid).comments.push({ id: uid(), authorId: user.id, text: t, time: Date.now() })
      return d
    })
    setComment({ ...comment, [pid]: '' })
  }

  const delPost = (pid) =>
    setState((d) => {
      d.posts = d.posts.filter((p) => p.id !== pid)
      return d
    })

  const ChannelButton = ({ c }) => {
    const isOn = c.id === active
    const initials = c.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    return (
      <button
        type="button"
        onClick={() => setActive(c.id)}
        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
          isOn
            ? '!bg-slate-950 !text-white dark:!bg-white dark:!text-slate-950'
            : '!bg-transparent !text-slate-800 hover:!bg-slate-100 dark:!text-slate-200 dark:hover:!bg-slate-800'
        }`}
      >
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold ${isOn ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{c.name}</p>
          <p className="text-xs opacity-60">{TYPE_LABEL[c.type]} · {c.members.length} members</p>
        </div>
      </button>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Supervised campus space</p>
          <h1 className="font-display text-4xl tracking-tight text-slate-950 dark:text-white sm:text-5xl">Campus Connect</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Discover conversations, clubs, branch channels, and polls across campus.</p>
        </div>
        <div className="flex max-w-sm items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
          <ShieldCheck className="size-4 shrink-0" /> All activity is moderated under faculty supervision
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[310px_1fr]">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="!m-0 font-display !text-lg">My Communities</h3>
              <Users className="size-4 text-indigo-500" />
            </div>
            <div className="space-y-1">
              {mine.length === 0 && <p className="px-2 py-2 text-xs text-slate-400">You have not joined any group.</p>}
              {mine.map((c) => <ChannelButton key={c.id} c={c} />)}
            </div>
            {others.length > 0 && (
              <>
                <p className="mb-2 mt-5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Discover</p>
                <div className="space-y-1">{others.map((c) => <ChannelButton key={c.id} c={c} />)}</div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="!mt-0 font-display !text-lg">Create a club or channel</h3>
            <div className="space-y-2.5">
              <input className="w-full" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select className="w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="club">Club</option>
                <option value="channel">Channel</option>
              </select>
              <input className="w-full" placeholder="What is it about?" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
              <button className="w-full" onClick={create}><Plus className="mr-1 inline size-4" /> Create community</button>
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          {!ch ? <p className="muted">Pick a group on the left.</p> : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="!m-0 font-display !text-2xl">{ch.name}</h3>
                      <span className="tag official">{TYPE_LABEL[ch.type]}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{ch.desc || 'No description.'} · Created by {person(ch.ownerId)?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="ghost small" onClick={() => setShowMembers(!showMembers)}>{ch.members.length} members</button>
                    <button className={isMember ? 'ghost small' : 'small'} onClick={toggleJoin}>{isMember ? 'Leave' : 'Join group'}</button>
                  </div>
                </div>
                {showMembers && (
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {ch.members.map((m) => {
                      const p = person(m)
                      return <span key={m} className="tag">{p?.name}{p?.branch ? ' · ' + p.branch : ''}{p?.role !== 'student' ? ' · ' + p?.role : ''}</span>
                    })}
                  </div>
                )}
              </div>

              {isMember ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <textarea rows="2" placeholder={`Share an update in ${ch.name}...`} value={text} onChange={(e) => setText(e.target.value)} className="w-full" />
                  {photo && <img className="photo" src={photo} alt="preview" />}
                  {poll && (
                    <div className="my-3 space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                      <p className="text-xs font-semibold text-slate-500">Poll options (write your question above):</p>
                      {poll.map((o, i) => <input key={i} placeholder={'Option ' + (i + 1)} value={o} onChange={(e) => setPoll(poll.map((x, j) => (j === i ? e.target.value : x)))} className="w-full" />)}
                      {poll.length < 4 && <button className="ghost small" onClick={() => setPoll([...poll, ''])}>+ Add option</button>}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                        <Image className="size-4 text-indigo-500" /> Add photo
                        <input type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
                      </label>
                      <button type="button" className="ghost small" onClick={() => setPoll(poll ? null : ['', ''])}>{poll ? 'Remove poll' : 'Add poll'}</button>
                    </div>
                    <button onClick={post} className="flex items-center gap-1.5">Post <Send className="size-3.5" /></button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                  Join this community to post updates, photos, or polls.
                </div>
              )}

              {posts.length === 0 && <p className="muted">No posts yet.</p>}
              {posts.map((p) => {
                const author = person(p.authorId)
                const initials = (author?.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('')
                return (
                  <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" key={p.id}>
                    <div className="p-5 sm:p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-500 text-xs font-bold text-white">{initials}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold">{author?.name}</p>
                              <span className="grid size-4 place-items-center rounded-full bg-indigo-500"><Check className="size-2.5 text-white" /></span>
                            </div>
                            <p className="text-xs text-slate-400">{author?.role !== 'student' ? 'Faculty · ' : ''}{timeAgo(p.time)}</p>
                          </div>
                        </div>
                        {(p.authorId === user.id || ch.ownerId === user.id || isStaff) && <button className="ghost small" onClick={() => delPost(p.id)}>Delete</button>}
                      </div>

                      {p.text && <p className="mt-4 text-[15px] leading-7 text-slate-700 dark:text-slate-200">{p.text}</p>}
                      {p.photo && <img className="photo mt-4" src={p.photo} alt="post" />}

                      {p.poll && (() => {
                        const total = p.poll.options.reduce((a, o) => a + o.votes.length, 0)
                        return (
                          <div className="mt-4 space-y-2">
                            {p.poll.options.map((o) => (
                              <button key={o.id} disabled={!isMember} className={'pollopt rounded-xl px-4 py-2.5 ' + (o.votes.includes(user.id) ? 'mine' : '')} onClick={() => vote(p.id, o.id)}>
                                <div className="bar" style={{ width: (total ? (o.votes.length / total) * 100 : 0) + '%' }} />
                                <span className="font-medium">{o.text}</span>
                                <span className="n text-xs font-bold">{o.votes.length}{total ? ' · ' + Math.round((o.votes.length / total) * 100) + '%' : ''}</span>
                              </button>
                            ))}
                            <p className="muted">{total} vote{total === 1 ? '' : 's'}</p>
                          </div>
                        )
                      })()}
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/30 sm:px-6">
                      <div className="flex items-center gap-4">
                        <button className={p.likes.includes(user.id) ? 'small' : 'ghost small'} onClick={() => like(p.id)}>
                          <Heart className="mr-1 inline size-3.5" /> Like {p.likes.length}
                        </button>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MessageCircle className="size-3.5" /> {p.comments.length} comments
                        </span>
                      </div>

                      {p.comments.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {p.comments.map((c) => (
                            <p key={c.id} className="rounded-xl bg-white px-3 py-2 text-xs shadow-2xs dark:bg-slate-800">
                              <b>{person(c.authorId)?.name}:</b> {c.text}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <input className="flex-1" placeholder="Add a comment..." value={comment[p.id] || ''} onChange={(e) => setComment({ ...comment, [p.id]: e.target.value })} />
                        <button className="ghost small" onClick={() => addComment(p.id)}>Send</button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
