import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Dice5,
  LayoutDashboard,
  LogOut,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { supabase } from './lib/supabase'

type View = 'board' | 'admin'

type BoardOption = {
  id: number
  label: string
  category: string
}

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

function createBoard(options: BoardOption[]) {
  const fillBoard = shuffled(options).slice(0, 24)
  return [
    ...fillBoard.slice(0, 12),
    { id: 0, label: 'FREE SPACE', category: 'Bingo' },
    ...fillBoard.slice(12),
  ]
}

function App() {
  const [view, setView] = useState<View>('board')
  const [options, setOptions] = useState<BoardOption[]>([])
  const [board, setBoard] = useState<BoardOption[]>([])
  const [marked, setMarked] = useState<number[]>([])
  const [newOption, setNewOption] = useState('')
  const [newCategory, setNewCategory] = useState('Meetings')
  const [showProfile, setShowProfile] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const categories = useMemo(
    () => ['Meetings', 'Remote life', 'Work life'],
    [],
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      const [{ data: userData }, { data, error: optionsError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('board_options').select('id, label, category').order('created_at'),
      ])
      if (!active) return
      if (optionsError) setError(optionsError.message)
      setUser(userData.user)
      if (userData.user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', userData.user.id).maybeSingle()
        setIsAdmin(profile?.is_admin === true)
      }
      if (data) {
        setOptions(data)
        setBoard(createBoard(data))
      }
      setLoading(false)
    }
    load()
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setIsAdmin(false)
        return
      }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle()
      setIsAdmin(profile?.is_admin === true)
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
    const { data, error: insertError } = await supabase.from('board_options').insert({ label, category: newCategory, created_by: user?.id }).select('id, label, category').single()
    if (insertError) {
      setError(insertError.message)
      return
    }
    if (data) setOptions((current) => [...current, data])
    setNewOption('')
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
    if (id === 0) return
    setMarked((current) =>
      current.includes(id)
        ? current.filter((markedId) => markedId !== id)
        : [...current, id],
    )
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] text-sm font-semibold text-[#748096]">Loading your board…</div>
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#182230]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col border-r border-[#e7eaf0] bg-white lg:flex">
        <div className="flex h-[88px] items-center gap-3 border-b border-[#e7eaf0] px-7">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2144d3] text-lg font-extrabold text-white shadow-[0_6px_16px_rgba(33,68,211,0.22)]">D</div>
          <div>
            <p className="text-[17px] font-bold tracking-[-0.03em]">deblingo</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#9ba4b5]">team games</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 py-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a3acbb]">Workspace</p>
          <SidebarItem icon={<LayoutDashboard size={17} />} label="Board" active={view === 'board'} onClick={() => setView('board')} />
          <SidebarItem icon={<ClipboardList size={17} />} label="Manage options" active={view === 'admin'} onClick={() => setView('admin')} />
          <div className="mt-8 border-t border-[#eef0f4] pt-6">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a3acbb]">Account</p>
            <SidebarItem icon={<Users size={17} />} label="Team members" />
            <SidebarItem icon={<Settings size={17} />} label="Settings" />
          </div>
          <div className="mt-auto rounded-2xl bg-[#f1f5ff] p-4">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#2144d3]"><Sparkles size={16} /></div>
            <p className="text-[12px] font-bold">Make it yours</p>
            <p className="mt-1 text-[11px] leading-5 text-[#6e7c9a]">Add your own moments to create a board your team will love.</p>
            <button onClick={() => setView('admin')} className="mt-3 text-[11px] font-bold text-[#2144d3]">Customize board <ArrowUpRight className="ml-1 inline" size={13} /></button>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-[#e7eaf0] px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5b69d] text-[11px] font-bold text-[#7b3e31]">RP</div>
          <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold">{user ? 'Ruben Parnell' : 'Playing as guest'}</p><p className="text-[10px] text-[#98a2b3]">{user ? 'Admin' : 'No login needed'}</p></div>
          {user && <button aria-label="Log out" onClick={() => supabase.auth.signOut()} className="text-[#a8b0bf]"><LogOut size={15} /></button>}
        </div>
      </aside>

      <main className="min-h-screen lg:ml-[252px]">
        <header className="flex h-[88px] items-center justify-between border-b border-[#e7eaf0] bg-white px-6 sm:px-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9aa4b6]">Wednesday, May 14, 2025</p>
            <h1 className="mt-1 text-[22px] font-bold tracking-[-0.04em]">{view === 'board' ? 'Team bingo' : 'Manage board options'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden items-center gap-2 rounded-xl border border-[#e3e7ed] px-3 py-2 text-[12px] font-semibold text-[#647086] sm:flex"><CircleHelp size={15} /> Help center</button>
            <div className="relative">
              <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-2 rounded-xl border border-[#e3e7ed] p-1.5 pr-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f5b69d] text-[10px] font-bold text-[#7b3e31]">RP</span><ChevronDown size={14} className="text-[#8993a5]" />
              </button>
              {showProfile && <div className="absolute right-0 top-12 z-30 w-40 rounded-xl border border-[#e7eaf0] bg-white p-2 text-xs shadow-xl"><button className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#f5f7fb]">Profile</button><button className="w-full rounded-lg px-3 py-2 text-left hover:bg-[#f5f7fb]">Sign out</button></div>}
            </div>
          </div>
        </header>

        {error && <div className="mx-auto mt-5 max-w-[1120px] rounded-xl border border-[#f1caca] bg-[#fff5f5] px-4 py-3 text-xs text-[#b34e4e]">{error}</div>}
        {view === 'board' ? (
          <section className="mx-auto max-w-[1120px] px-5 py-8 sm:px-10 lg:px-14">
            <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div><div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2144d3]"><span className="h-2 w-2 rounded-full bg-[#32c184]" /> Live board</div><h2 className="text-[32px] font-extrabold tracking-[-0.055em] text-[#15202e] sm:text-[40px]">Find the fun in<br /><span className="text-[#2144d3]">the everyday.</span></h2><p className="mt-3 max-w-[440px] text-[13px] leading-6 text-[#748096]">Mark a square whenever you spot it. Get five in a row to call bingo!</p></div>
              <div className="flex items-center gap-3"><div className="rounded-xl border border-[#e3e7ed] bg-white px-4 py-2.5 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9ba4b5]">Marked</p><p className="mt-0.5 text-lg font-extrabold text-[#2144d3]">{marked.length}<span className="text-sm font-semibold text-[#a8b1c0]"> / 24</span></p></div><button onClick={randomizeBoard} className="flex items-center gap-2 rounded-xl bg-[#2144d3] px-4 py-3 text-[12px] font-bold text-white shadow-[0_7px_18px_rgba(33,68,211,0.2)] transition hover:bg-[#1738bd]"><Dice5 size={16} /> New board</button></div>
            </div>
            <div className="rounded-[22px] border border-[#e6e9ef] bg-white p-3 shadow-[0_15px_40px_rgba(38,51,77,0.06)] sm:p-5">
              <div className="mb-4 flex items-center justify-between px-1 sm:px-2"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a0a9b8]">May 2025 · edition 04</p><button onClick={() => setMarked([])} className="flex items-center gap-1.5 text-[11px] font-bold text-[#8994a6] hover:text-[#2144d3]"><RotateCcw size={13} /> Clear marks</button></div>
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {board.map((option, index) => {
                  const isMarked = option.id === 0 || marked.includes(option.id)
                  return <button key={`${option.id}-${index}`} onClick={() => toggleMark(option.id)} className={`group relative flex min-h-[92px] flex-col items-center justify-center rounded-[13px] border p-2 text-center transition sm:min-h-[119px] sm:p-4 ${isMarked ? 'border-[#2144d3] bg-[#2144d3] text-white shadow-[0_7px_15px_rgba(33,68,211,0.2)]' : 'border-[#e5e9ef] bg-[#fbfcfd] text-[#354154] hover:-translate-y-0.5 hover:border-[#aebcf4] hover:bg-[#f5f7ff]'}`}><span className={`mb-2 text-[8px] font-bold uppercase tracking-[0.13em] sm:text-[9px] ${isMarked ? 'text-[#bfcaff]' : 'text-[#a6afbd]'}`}>{option.category}</span><span className="text-[10px] font-bold leading-[1.35] sm:text-[12px]">{option.label}</span>{isMarked && option.id !== 0 && <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white/20"><Check size={10} /></span>}</button>
                })}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#8d98aa]"><Sparkles size={14} className="text-[#f5ad3c]" /> Built for better breaks, one square at a time.</div>
          </section>
        ) : isAdmin ? (
          <AdminView options={options} categories={categories} newOption={newOption} newCategory={newCategory} setNewOption={setNewOption} setNewCategory={setNewCategory} addOption={addOption} deleteOption={deleteOption} />
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError(signInError.message)
    if (data.user) onSignedIn(data.user)
    setSubmitting(false)
  }

  return <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5"><div className="w-full max-w-[410px] rounded-3xl border border-[#e5e9ef] bg-white p-8 shadow-[0_20px_60px_rgba(38,51,77,0.08)]"><div className="mb-8 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2144d3] text-lg font-extrabold text-white">D</div><div><p className="text-[18px] font-bold tracking-[-0.03em]">deblingo</p><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#9ba4b5]">team games</p></div></div><h1 className="text-2xl font-extrabold tracking-[-0.04em]">Welcome back.</h1><p className="mt-2 text-sm text-[#748096]">Sign in to access your team’s bingo board.</p><form onSubmit={signIn} className="mt-7"><label className="mb-2 block text-xs font-bold text-[#59667c]">Email</label><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]" placeholder="you@company.com" /><label className="mb-2 mt-4 block text-xs font-bold text-[#59667c]">Password</label><input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]" placeholder="Your password" />{error && <p className="mt-4 rounded-lg bg-[#fff5f5] p-3 text-xs text-[#b34e4e]">{error}</p>}<button disabled={submitting} className="mt-6 w-full rounded-xl bg-[#2144d3] py-3 text-sm font-bold text-white transition hover:bg-[#1738bd] disabled:opacity-50">{submitting ? 'Signing in…' : 'Sign in'}</button></form></div></div>
}

function AdminDenied({ onBack }: { onBack: () => void }) {
  return <section className="mx-auto max-w-[600px] px-5 py-20 text-center sm:px-10"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff5e7] text-2xl">🔒</div><h2 className="mt-5 text-2xl font-extrabold tracking-[-0.04em]">Admin access only.</h2><p className="mx-auto mt-2 max-w-[400px] text-sm leading-6 text-[#748096]">This account can play bingo, but it does not have permission to change the board options.</p><button onClick={onBack} className="mt-6 rounded-xl bg-[#2144d3] px-5 py-3 text-sm font-bold text-white">Back to board</button></section>
}

function AdminView({ options, categories, newOption, newCategory, setNewOption, setNewCategory, addOption, deleteOption }: { options: BoardOption[]; categories: string[]; newOption: string; newCategory: string; setNewOption: (value: string) => void; setNewCategory: (value: string) => void; addOption: () => void; deleteOption: (id: number) => void }) {
  return <section className="mx-auto max-w-[1050px] px-5 py-8 sm:px-10 lg:px-14"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2144d3]">Admin controls</p><h2 className="text-[32px] font-extrabold tracking-[-0.055em] text-[#15202e]">Shape your board.</h2><p className="mt-2 text-[13px] text-[#748096]">Add prompts your team will instantly recognize.</p></div><div className="hidden rounded-xl bg-[#eef2ff] px-4 py-3 text-right sm:block"><p className="text-[10px] font-bold uppercase tracking-wider text-[#8998d1]">Available prompts</p><p className="text-xl font-extrabold text-[#2144d3]">{options.length}</p></div></div><div className="grid gap-6 lg:grid-cols-[350px_1fr]"><div className="h-fit rounded-2xl border border-[#e4e8ef] bg-white p-5 shadow-[0_10px_30px_rgba(38,51,77,0.04)]"><div className="mb-5 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2144d3]"><Plus size={16} /></div><div><h3 className="text-[13px] font-bold">Add an option</h3><p className="text-[11px] text-[#9aa4b4]">It will appear on future boards.</p></div></div><label className="mb-2 block text-[11px] font-bold text-[#59667c]">Prompt</label><textarea value={newOption} onChange={(event) => setNewOption(event.target.value)} placeholder="e.g. Someone mentions the weather" rows={4} className="w-full resize-none rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-[12px] outline-none transition placeholder:text-[#b2bac7] focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]" /><label className="mb-2 mt-4 block text-[11px] font-bold text-[#59667c]">Category</label><select value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className="w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-[12px] text-[#354154] outline-none">{categories.map((category) => <option key={category}>{category}</option>)}</select><button onClick={addOption} disabled={!newOption.trim()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2144d3] py-3 text-[12px] font-bold text-white transition hover:bg-[#1738bd] disabled:cursor-not-allowed disabled:opacity-40"><Plus size={15} /> Add to board</button></div><div className="rounded-2xl border border-[#e4e8ef] bg-white shadow-[0_10px_30px_rgba(38,51,77,0.04)]"><div className="flex items-center justify-between border-b border-[#edf0f4] px-5 py-4"><div><h3 className="text-[13px] font-bold">Board options</h3><p className="mt-0.5 text-[11px] text-[#9aa4b4]">The board randomly selects 24 each round.</p></div><span className="rounded-lg bg-[#f6f7fa] px-2.5 py-1 text-[10px] font-bold text-[#8d98a9]">{options.length} total</span></div><div className="divide-y divide-[#f0f2f5]">{options.map((option) => <div key={option.id} className="flex items-center gap-3 px-5 py-3.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f5ff] text-[#2144d3]"><ClipboardList size={14} /></div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-[#354154]">{option.label}</p><p className="mt-0.5 text-[10px] font-medium text-[#a0a9b8]">{option.category}</p></div><button aria-label={`Delete ${option.label}`} onClick={() => deleteOption(option.id)} className="rounded-lg p-2 text-[#b0b8c5] transition hover:bg-[#fff1f1] hover:text-[#d55252]"><Trash2 size={15} /></button></div>)}</div></div></div></section>
}

export default App
