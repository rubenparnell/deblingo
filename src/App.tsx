import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import ICAL from 'ical.js'
import {
  Check,
  ChevronDown,
  ClipboardList,
  Dice5,
  LayoutDashboard,
  LogOut,
  Plus,
  RotateCcw,
  Trash2,
  Moon,
  Sun,
} from 'lucide-react'
import { supabase } from './lib/supabase'

type View = 'board' | 'admin'

type BoardOption = {
  id: number
  label: string
}

type Lecture = {
  id: number
  source_uid: string
  title: string
  starts_at: string
  ends_at: string | null
}

function getLectureTiming(lecture: Lecture) {
  const start = new Date(new Date(lecture.starts_at).getTime() + 5 * 60 * 1000)
  const end = lecture.ends_at
    ? new Date(new Date(lecture.ends_at).getTime() - 5 * 60 * 1000)
    : null
  return { start, end }
}

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

function createBoard(options: BoardOption[]) {
  return shuffled(options).slice(0, 25)
}

function App() {
  const [boardDate] = useState(() => new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date()))
  const [view, setView] = useState<View>('board')
  const [options, setOptions] = useState<BoardOption[]>([])
  const [board, setBoard] = useState<BoardOption[]>([])
  const [marked, setMarked] = useState<number[]>([])
  const [newOption, setNewOption] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('deblingo-theme') === 'dark')
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nextLecture, setNextLecture] = useState<Lecture | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      const [{ data: userData }, { data, error: optionsError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('board_options').select('id, label').order('created_at'),
      ])
      if (!active) return
      if (optionsError) setError(optionsError.message)
      setUser(userData.user)
      if (userData.user) {
        const { data: profile } = await supabase.from('profiles').select('username, is_admin').eq('id', userData.user.id).maybeSingle()
        setIsAdmin(profile?.is_admin === true)
        setUsername(profile?.username ?? userData.user.email?.split('@')[0] ?? 'User')
      }
      if (data) {
        setOptions(data)
        setBoard(createBoard(data))
      }
      const { data: lectures } = await supabase.from('lectures').select('id, source_uid, title, starts_at, ends_at').order('starts_at').limit(100)
      const now = new Date()
      const current = lectures?.find((lecture) => {
        const timing = getLectureTiming(lecture)
        return timing.end && timing.start <= now && timing.end > now
      })
      const next = lectures?.find((lecture) => getLectureTiming(lecture).start > now)
      setNextLecture(current ?? next ?? null)
      setLoading(false)
    }
    load()
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setIsAdmin(false)
        setUsername('')
        return
      }
      const { data: profile } = await supabase.from('profiles').select('username, is_admin').eq('id', session.user.id).maybeSingle()
      setIsAdmin(profile?.is_admin === true)
      setUsername(profile?.username ?? session.user.email?.split('@')[0] ?? 'User')
    })
    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const randomizeBoard = () => {
    setBoard(createBoard(options))
    setMarked([])
  }

  const addOption = async () => {
    const label = newOption.trim()
    if (!label) return
    const { data, error: insertError } = await supabase.from('board_options').insert({ label, created_by: user?.id }).select('id, label').single()
    if (insertError) {
      setError(insertError.message)
      return
    }
    if (data) setOptions((current) => [...current, data])
    setNewOption('')
  }

  const uploadLectures = async (file: File) => {
    try {
      const calendar = new ICAL.Component(ICAL.parse(await file.text()))
      const lectures = calendar.getAllSubcomponents('vevent')
        .map((component) => {
          const event = new ICAL.Event(component)
          return {
            source_uid: event.uid,
            title: event.summary,
            starts_at: event.startDate.toJSDate().toISOString(),
            ends_at: event.endDate?.toJSDate().toISOString() ?? null,
            uploaded_by: user?.id,
          }
        })
        .filter((lecture) => {
          const title = lecture.title.toLowerCase()
          return title.includes('discrete') && title.includes('lecture')
        })
      if (!lectures.length) {
        setError('No future events containing both “discrete” and “lecture” were found.')
        return
      }
      const { error: clearError } = await supabase.from('lectures').delete().neq('id', 0)
      if (clearError) throw clearError
      const { data, error: insertError } = await supabase.from('lectures').insert(lectures).select('id, source_uid, title, starts_at, ends_at').order('starts_at')
      if (insertError) throw insertError
      setNextLecture(data?.[0] ?? null)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to parse the ICS file.')
    }
  }

  const deleteOption = async (id: number) => {
    const { error: deleteError } = await supabase.from('board_options').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setOptions((current) => current.filter((option) => option.id !== id))
    setBoard((current) => current.filter((option) => option.id !== id))
    setMarked((current) => current.filter((markedId) => markedId !== id))
  }

  const toggleMark = (id: number) => {
    setMarked((current) =>
      current.includes(id)
        ? current.filter((markedId) => markedId !== id)
        : [...current, id],
    )
  }

  useEffect(() => {
    localStorage.setItem('deblingo-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    const refreshLecture = async () => {
      const { data: lectures } = await supabase.from('lectures').select('id, source_uid, title, starts_at, ends_at').order('starts_at').limit(100)
      const now = new Date()
      const current = lectures?.find((lecture) => {
        const timing = getLectureTiming(lecture)
        return timing.end && timing.start <= now && timing.end > now
      })
      const next = lectures?.find((lecture) => getLectureTiming(lecture).start > now)
      setNextLecture(current ?? next ?? null)
    }
    const interval = window.setInterval(refreshLecture, 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  if (loading) return <div className={`flex min-h-screen items-center justify-center bg-[#f7f8fb] text-sm font-semibold text-[#748096] ${darkMode ? 'dark-theme' : ''}`}>Loading your board…</div>
  return (
    <div className={`min-h-screen bg-[#f7f8fb] text-[#182230] ${darkMode ? 'dark-theme' : ''}`}>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col border-r border-[#e7eaf0] bg-white lg:flex">
        <div className="flex h-[88px] items-center gap-3 border-b border-[#e7eaf0] px-7">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2144d3] text-lg font-extrabold text-white shadow-[0_6px_16px_rgba(33,68,211,0.22)]">D</div>
          <div>
            <p className="text-[17px] font-bold tracking-[-0.03em]">deblingo</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 py-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a3acbb]">Workspace</p>
          <SidebarItem icon={<LayoutDashboard size={17} />} label="Board" active={view === 'board'} onClick={() => setView('board')} />
          {isAdmin && <SidebarItem icon={<ClipboardList size={17} />} label="Manage options" active={view === 'admin'} onClick={() => setView('admin')} />}
        </div>
        <div className="flex items-center gap-3 border-t border-[#e7eaf0] px-6 py-5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${user ? 'bg-[#f5b69d] text-[#7b3e31]' : 'bg-[#eef2ff] text-[#2144d3]'}`}>{user ? username.slice(0, 2).toUpperCase() : 'G'}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold">{user ? username : 'Playing as guest'}</p><p className="text-[10px] text-[#98a2b3]">{user ? (isAdmin ? 'Admin' : 'Member') : 'No login needed'}</p></div>
          {user && <button aria-label="Log out" onClick={() => supabase.auth.signOut()} className="text-[#a8b0bf]"><LogOut size={15} /></button>}
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[252px]">
        <header className="flex h-[88px] items-center justify-between border-b border-[#e7eaf0] bg-white px-6 sm:px-10">
          <div>
            <h1 className="mt-1 text-[22px] font-bold tracking-[-0.04em]">{view === 'board' ? '' : 'Manage board options'}</h1>
          </div>
          <div className="flex items-center gap-3">
            {nextLecture && <CountdownCard event={nextLecture} compact />}
            <button aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDarkMode((current) => !current)} className="rounded-xl border border-[#e3e7ed] p-2 text-[#647086] transition hover:text-[#2144d3]">{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
            {user ? (
              <div className="relative">
                <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-2 rounded-xl border border-[#e3e7ed] p-1.5 pr-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f5b69d] text-[10px] font-bold text-[#7b3e31]">{username.slice(0, 2).toUpperCase()}</span><ChevronDown size={14} className="text-[#8993a5]" />
                </button>
                {showProfile && <div className="absolute right-0 top-12 z-30 w-40 rounded-xl border border-[#e7eaf0] bg-white p-2 text-xs shadow-xl"><button className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#f5f7fb]">Profile</button><button onClick={() => supabase.auth.signOut()} className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#f5f7fb]">Sign out</button></div>}
              </div>
            ) : (
              <button onClick={() => setView('admin')} className="rounded-xl border border-[#e3e7ed] px-3 py-2 text-[12px] font-semibold text-[#7b879a] transition hover:border-[#b8c4ee] hover:text-[#2144d3]">Guest</button>
            )}
          </div>
        </header>

        {error && <div className="mx-auto mt-5 max-w-[1120px] rounded-xl border border-[#f1caca] bg-[#fff5f5] px-4 py-3 text-xs text-[#b34e4e]">{error}</div>}
        {view === 'board' ? (
          <section className="mx-auto max-w-[1120px] px-5 py-8 sm:px-10 lg:px-14">
            <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div><div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2144d3]"><span className="h-2 w-2 rounded-full bg-[#32c184]" /> Live board</div><h2 className="text-[32px] font-extrabold tracking-[-0.055em] text-[#15202e] sm:text-[40px]">Find the fun in<br /><span className="text-[#2144d3]">deblingo.</span></h2><p className="mt-3 max-w-[440px] text-[13px] leading-6 text-[#748096]">Mark a square whenever you spot it. Get five in a row to call bingo!</p></div>
              <div className="flex items-center gap-3"><div className="rounded-xl border border-[#e3e7ed] bg-white px-4 py-2.5 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9ba4b5]">Marked</p><p className="mt-0.5 text-lg font-extrabold text-[#2144d3]">{marked.length}<span className="text-sm font-semibold text-[#a8b1c0]"> / 25</span></p></div><button onClick={randomizeBoard} className="flex items-center gap-2 rounded-xl bg-[#2144d3] px-4 py-3 text-[12px] font-bold text-white shadow-[0_7px_18px_rgba(33,68,211,0.2)] transition hover:bg-[#1738bd]"><Dice5 size={16} /> New board</button></div>
            </div>
            <div className="rounded-[22px] border border-[#e6e9ef] bg-white p-3 shadow-[0_15px_40px_rgba(38,51,77,0.06)] sm:p-5">
              <div className="mb-4 flex items-center justify-between px-1 sm:px-2"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a0a9b8]">{boardDate} · live board</p><button onClick={() => setMarked([])} className="flex items-center gap-1.5 text-[11px] font-bold text-[#8994a6] hover:text-[#2144d3]"><RotateCcw size={13} /> Clear marks</button></div>
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {board.map((option, index) => {
                  const isMarked = marked.includes(option.id)
                  return <button key={`${option.id}-${index}`} onClick={() => toggleMark(option.id)} className={`group relative flex min-h-[92px] flex-col items-center justify-center rounded-[13px] border p-2 text-center transition sm:min-h-[119px] sm:p-4 ${isMarked ? 'border-[#2144d3] bg-[#2144d3] text-white shadow-[0_7px_15px_rgba(33,68,211,0.2)]' : 'border-[#e5e9ef] bg-[#fbfcfd] text-[#354154] hover:-translate-y-0.5 hover:border-[#aebcf4] hover:bg-[#f5f7ff]'}`}><span className="text-[10px] font-bold leading-[1.35] sm:text-[12px]">{option.label}</span>{isMarked && <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white/20"><Check size={10} /></span>}</button>
                })}
              </div>
            </div>
          </section>
        ) : isAdmin ? (
          <AdminView options={options} newOption={newOption} setNewOption={setNewOption} addOption={addOption} deleteOption={deleteOption} uploadLectures={uploadLectures} />
        ) : user ? (
          <AdminDenied onBack={() => setView('board')} />
        ) : (
          <AuthView onSignedIn={setUser} />
        )}
      </main>
    </div>
  )
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${active ? 'bg-[#eef2ff] text-[#2144d3]' : 'text-[#7b879a] hover:bg-[#f7f8fb] hover:text-[#26344b]'}`}>{icon}<span>{label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2144d3]" />}</button>
}

function AuthView({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [username, setUsername] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const cleanUsername = username.trim().toLowerCase()
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        setError('Username must be 3–30 characters using only letters, numbers, and underscores.')
        setSubmitting(false)
        return
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: login.trim(),
        password,
        options: { data: { username: cleanUsername } },
      })
      if (signUpError) setError(signUpError.message)
      else if (data.session && data.user) {
        const { error: profileError } = await supabase.rpc('set_my_username', { new_username: cleanUsername })
        if (profileError) setError(profileError.message)
        else onSignedIn(data.user)
      }
      else setMessage('Account created. Check your email to confirm your account, then sign in.')
      setSubmitting(false)
      return
    }

    let email = login.trim()
    if (!email.includes('@')) {
      const { data: usernameData, error: usernameError } = await supabase.rpc('get_email_for_username', { login_username: email })
      if (usernameError || !usernameData) {
        setError('We could not find an account with that username.')
        setSubmitting(false)
        return
      }
      email = usernameData
    }
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError(signInError.message)
    if (data.user) onSignedIn(data.user)
    setSubmitting(false)
  }

  return <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5"><div className="w-full max-w-[410px] rounded-3xl border border-[#e5e9ef] bg-white p-8 shadow-[0_20px_60px_rgba(38,51,77,0.08)]"><div className="mb-8 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2144d3] text-lg font-extrabold text-white">D</div><div><p className="text-[18px] font-bold tracking-[-0.03em]">deblingo</p><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#9ba4b5]">team games</p></div></div><div className="mb-6 grid grid-cols-2 rounded-xl bg-[#f3f5fa] p-1"><button type="button" onClick={() => { setMode('signin'); setError(''); setMessage('') }} className={`rounded-lg py-2 text-xs font-bold ${mode === 'signin' ? 'bg-white text-[#2144d3] shadow-sm' : 'text-[#8994a6]'}`}>Sign in</button><button type="button" onClick={() => { setMode('signup'); setError(''); setMessage('') }} className={`rounded-lg py-2 text-xs font-bold ${mode === 'signup' ? 'bg-white text-[#2144d3] shadow-sm' : 'text-[#8994a6]'}`}>Create account</button></div><h1 className="text-2xl font-extrabold tracking-[-0.04em]">{mode === 'signin' ? 'Welcome back.' : 'Join your team.'}</h1><p className="mt-2 text-sm text-[#748096]">{mode === 'signin' ? 'Sign in to manage your team’s board.' : 'Create an account to manage your own team games.'}</p><form onSubmit={submit} className="mt-7">{mode === 'signup' && <><label className="mb-2 block text-xs font-bold text-[#59667c]">Username</label><input required type="text" pattern="[A-Za-z0-9_]{3,30}" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]" placeholder="your_username" /></>}<label className="mb-2 mt-4 block text-xs font-bold text-[#59667c]">Email</label><input required type="email" value={login} onChange={(event) => setLogin(event.target.value)} className="w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]" placeholder="you@company.com" /><label className="mb-2 mt-4 block text-xs font-bold text-[#59667c]">Password</label><input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]" placeholder="At least 6 characters" />{error && <p className="mt-4 rounded-lg bg-[#fff5f5] p-3 text-xs text-[#b34e4e]">{error}</p>}{message && <p className="mt-4 rounded-lg bg-[#effaf5] p-3 text-xs text-[#237a56]">{message}</p>}<button disabled={submitting} className="mt-6 w-full rounded-xl bg-[#2144d3] py-3 text-sm font-bold text-white transition hover:bg-[#1738bd] disabled:opacity-50">{submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button></form></div></div>
}

function AdminDenied({ onBack }: { onBack: () => void }) {
  return <section className="mx-auto max-w-[600px] px-5 py-20 text-center sm:px-10"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff5e7] text-2xl">🔒</div><h2 className="mt-5 text-2xl font-extrabold tracking-[-0.04em]">Admin access only.</h2><p className="mx-auto mt-2 max-w-[400px] text-sm leading-6 text-[#748096]">This account can play bingo, but it does not have permission to change the board options.</p><button onClick={onBack} className="mt-6 rounded-xl bg-[#2144d3] px-5 py-3 text-sm font-bold text-white">Back to board</button></section>
}

function CountdownCard({ event, compact = false }: { event: Lecture; compact?: boolean }) {
  const timing = getLectureTiming(event)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const update = () => setNow(new Date())
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const isLive = timing.end ? timing.start <= now && timing.end > now : false
  const target = isLive && timing.end ? timing.end : timing.start
  const remaining = Math.max(0, target.getTime() - now.getTime())
  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return compact ? <div className="hidden items-center gap-2 rounded-xl bg-[#2144d3] px-3 py-2 text-white sm:flex"><span className="text-[10px] font-bold uppercase tracking-wider text-white/75">{isLive ? 'Lecture ends in' : 'Next lecture'}</span><span className="text-xs font-extrabold text-white">{days}d {String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s</span></div> : <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#dce4ff] bg-[#eef2ff] px-5 py-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2144d3]">{isLive ? 'Lecture in progress' : 'Next discrete lecture'}</p><p className="mt-1 text-sm font-bold text-[#253354]">{event.title}</p><p className="mt-1 text-[11px] text-[#7180a2]">{target.toLocaleString()}</p></div><div className="flex items-baseline gap-1 text-[#2144d3]"><span className="text-2xl font-extrabold">{days}d</span><span className="text-2xl font-extrabold">{String(hours).padStart(2, '0')}h</span><span className="text-2xl font-extrabold">{String(minutes).padStart(2, '0')}m</span><span className="text-lg font-bold">{String(seconds).padStart(2, '0')}s</span></div></div>
}

function AdminView({ options, newOption, setNewOption, addOption, deleteOption, uploadLectures }: { options: BoardOption[]; newOption: string; setNewOption: (value: string) => void; addOption: () => void; deleteOption: (id: number) => void; uploadLectures: (file: File) => void }) {
  const submitOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      addOption()
    }
  }
  return <section className="mx-auto max-w-[1050px] px-5 py-8 sm:px-10 lg:px-14"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2144d3]">Admin controls</p><h2 className="text-[32px] font-extrabold tracking-[-0.055em] text-[#15202e]">Shape your board.</h2><p className="mt-2 text-[13px] text-[#748096]">Add prompts your team will instantly recognize.</p></div><div className="hidden rounded-xl bg-[#eef2ff] px-4 py-3 text-right sm:block"><p className="text-[10px] font-bold uppercase tracking-wider text-[#8998d1]">Available prompts</p><p className="text-xl font-extrabold text-[#2144d3]">{options.length}</p></div></div><div className="mb-6 rounded-2xl border border-[#e4e8ef] bg-white p-5 shadow-[0_10px_30px_rgba(38,51,77,0.04)]"><h3 className="text-[13px] font-bold">Lecture calendar</h3><p className="mt-1 text-[11px] text-[#9aa4b4]">Upload an ICS file. Events containing both “discrete” and “lecture” in the title will be saved.</p><input type="file" accept=".ics,text/calendar" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadLectures(file); event.currentTarget.value = '' }} className="mt-4 block w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-[12px]" /></div><div className="grid gap-6 lg:grid-cols-[350px_1fr]"><div className="h-fit rounded-2xl border border-[#e4e8ef] bg-white p-5 shadow-[0_10px_30px_rgba(38,51,77,0.04)]"><div className="mb-5 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2144d3]"><Plus size={16} /></div><div><h3 className="text-[13px] font-bold">Add an option</h3><p className="text-[11px] text-[#9aa4b4]">It will appear on future boards.</p></div></div><label className="mb-2 block text-[11px] font-bold text-[#59667c]">Prompt</label><textarea value={newOption} onChange={(event) => setNewOption(event.target.value)} onKeyDown={submitOnEnter} placeholder="e.g. 'Alphabets'" rows={4} className="w-full resize-none rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-[12px] outline-none transition placeholder:text-[#b2bac7] focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]" /><button onClick={addOption} disabled={!newOption.trim()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2144d3] py-3 text-[12px] font-bold text-white transition hover:bg-[#1738bd] disabled:cursor-not-allowed disabled:opacity-40"><Plus size={15} /> Add to board</button></div><div className="rounded-2xl border border-[#e4e8ef] bg-white shadow-[0_10px_30px_rgba(38,51,77,0.04)]"><div className="flex items-center justify-between border-b border-[#edf0f4] px-5 py-4"><div><h3 className="text-[13px] font-bold">Board options</h3><p className="mt-0.5 text-[11px] text-[#9aa4b4]">The board randomly selects 24 each round.</p></div><span className="rounded-lg bg-[#f6f7fa] px-2.5 py-1 text-[10px] font-bold text-[#8d98a9]">{options.length} total</span></div><div className="divide-y divide-[#f0f2f5]">{options.map((option) => <div key={option.id} className="flex items-center gap-3 px-5 py-3.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f5ff] text-[#2144d3]"><ClipboardList size={14} /></div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-[#354154]">{option.label}</p></div><button aria-label={`Delete ${option.label}`} onClick={() => deleteOption(option.id)} className="rounded-lg p-2 text-[#b0b8c5] transition hover:bg-[#fff1f1] hover:text-[#d55252]"><Trash2 size={15} /></button></div>)}</div></div></div></section>
}

export default App
