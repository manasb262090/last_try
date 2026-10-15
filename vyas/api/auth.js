import { createClient } from '@supabase/supabase-js'

const ROLES = ['student', 'teacher', 'admin', 'library_operator', 'sports_coordinator']
const ID_PATTERN = /^[a-zA-Z0-9._-]{2,64}$/

function clients() {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) return null
  return {
    admin: createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    public: createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const supabase = clients()
  if (!supabase) return res.status(503).json({ error: 'Supabase server environment is not configured.' })

  const body = req.body || {}
  if (body.action === 'signup_student') {
    const profile = body.profile || {}
    const loginId = String(profile.loginId || '').trim().toLowerCase()
    const email = String(profile.email || '').trim().toLowerCase()
    const password = String(profile.password || '')
    if (!ID_PATTERN.test(loginId) || !email.includes('@') || password.length < 10 || !String(profile.fullName || '').trim()) {
      return res.status(400).json({ error: 'Enter a valid student ID, name, email, and password of at least 10 characters.' })
    }
    const { data, error } = await supabase.public.auth.signUp({
      email,
      password,
      options: {
        data: {
          login_id: loginId,
          full_name: String(profile.fullName).trim(),
          phone: String(profile.phone || ''),
          college: String(profile.college || ''),
          department: String(profile.department || ''),
          branch: String(profile.branch || ''),
          year: String(profile.year || ''),
          class_name: String(profile.className || ''),
          section: String(profile.section || ''),
        },
      },
    })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(201).json({ confirmationRequired: !data.session, message: data.session ? 'Student account created.' : 'Check your email to confirm your student account.' })
  }

  if (body.action === 'create_account') {
    const authorization = String(req.headers.authorization || '')
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Admin sign-in required.' })
    const { data: authData, error: authError } = await supabase.admin.auth.getUser(token)
    if (authError || !authData.user) return res.status(401).json({ error: 'Admin sign-in required.' })
    const { data: actor } = await supabase.admin.from('profiles').select('role').eq('id', authData.user.id).maybeSingle()
    if (actor?.role !== 'admin') return res.status(403).json({ error: 'Only an admin can create staff accounts.' })

    const account = body.account || {}
    const newLoginId = String(account.loginId || '').trim().toLowerCase()
    const email = String(account.email || '').trim().toLowerCase()
    const newPassword = String(account.password || '')
    if (!ID_PATTERN.test(newLoginId) || !ROLES.includes(account.role) || account.role === 'student' || !email.includes('@') || newPassword.length < 10 || !String(account.fullName || '').trim()) {
      return res.status(400).json({ error: 'Enter a valid staff role, ID, name, email, and password of at least 10 characters.' })
    }
    const classes = Array.isArray(account.classes) ? account.classes : []
    if (account.role === 'teacher' && classes.length === 0) return res.status(400).json({ error: 'Assign at least one class to this teacher.' })

    const { data: created, error: createError } = await supabase.admin.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        login_id: newLoginId,
        full_name: String(account.fullName).trim(),
        phone: String(account.phone || ''),
        department: String(account.department || ''),
      },
    })
    if (createError) return res.status(400).json({ error: createError.message })

    const updates = {
      login_id: newLoginId,
      email,
      full_name: String(account.fullName).trim(),
      role: account.role,
      phone: String(account.phone || ''),
      department: String(account.department || ''),
    }
    const { data: profile, error: profileUpdateError } = await supabase.admin.from('profiles').update(updates).eq('id', created.user.id).select().single()
    if (profileUpdateError) {
      await supabase.admin.auth.admin.deleteUser(created.user.id)
      return res.status(500).json({ error: 'Account was created but the profile could not be saved.' })
    }
    if (account.role === 'teacher') {
      const rows = classes.map((classInfo) => ({ teacher_id: created.user.id, college: classInfo.college, branch: classInfo.branch, year: classInfo.year, section: classInfo.section }))
      const { error: classError } = await supabase.admin.from('teacher_classes').insert(rows)
      if (classError) {
        await supabase.admin.auth.admin.deleteUser(created.user.id)
        return res.status(500).json({ error: 'Teacher account created, but class assignments could not be saved.' })
      }
    }
    return res.status(201).json({ profile })
  }

  const loginId = String(body.loginId || '').trim().toLowerCase()
  const role = String(body.role || '')
  const password = String(body.password || '')
  if (!ID_PATTERN.test(loginId) || !ROLES.includes(role) || !password) {
    return res.status(400).json({ error: 'A valid role, account ID, and password are required.' })
  }

  const { data: profile, error: profileError } = await supabase.admin
    .from('profiles')
    .select('id, login_id, full_name, email, role, phone, department, designation, subjects, college, branch, year, class_name, section')
    .eq('login_id', loginId)
    .eq('role', role)
    .maybeSingle()
  if (profileError) return res.status(503).json({ error: 'Could not verify account. Check the Supabase schema.' })
  if (!profile?.email) return res.status(401).json({ error: 'Account ID or role is incorrect.' })

  let classes = []
  if (profile.role === 'teacher') {
    const { data: assignments, error: classError } = await supabase.admin
      .from('teacher_classes')
      .select('college, branch, year, section')
      .eq('teacher_id', profile.id)
    if (classError) return res.status(503).json({ error: 'Could not load teacher class assignments.' })
    classes = (assignments || []).map((classInfo) => ({ ...classInfo, batch: classInfo.year }))
  }

  const { data, error } = await supabase.public.auth.signInWithPassword({ email: profile.email, password })
  if (error || !data.session) return res.status(401).json({ error: 'Account ID, role, or password is incorrect.' })
  return res.status(200).json({ session: data.session, profile: { ...profile, classes } })
}