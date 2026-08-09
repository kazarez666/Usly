import { useEffect, useState } from 'react'
import { Heart, LockKeyhole, Mail, ArrowRight, Sparkles, ShieldCheck, Image, MessageCircle, CalendarHeart } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Mode = 'landing' | 'auth' | 'home'
type AuthMode = 'sign-in' | 'sign-up'

const features = [
  { icon: Heart, title: 'Your feelings', text: 'A tiny signal that says how you are, without needing a long message.' },
  { icon: Image, title: 'Your moments', text: 'Photos, notes and little memories that belong to both of you.' },
  { icon: MessageCircle, title: 'Your chat', text: 'A private conversation designed around two people, not a crowd.' },
  { icon: CalendarHeart, title: 'Your story', text: 'Dates, milestones, wishes and the story you are building together.' },
]

export default function App() {
  const [mode, setMode] = useState<Mode>('landing')
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { if (data.session) setMode('home') })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setMode(session ? 'home' : 'landing'))
    return () => data.subscription.unsubscribe()
  }, [])

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    if (!supabase) { setMessage('Supabase is not connected yet. Add your .env file first.'); setBusy(false); return }
    const result = authMode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
    if (result.error) setMessage(result.error.message)
    else setMessage(authMode === 'sign-up' ? 'Account created. Check your email if confirmation is enabled.' : '')
    setBusy(false)
  }

  if (mode === 'home') return <Home />
  if (mode === 'auth') return <AuthScreen authMode={authMode} setAuthMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} name={name} setName={setName} message={message} busy={busy} submitAuth={submitAuth} onBack={() => setMode('landing')} />
  return <Landing onStart={() => setMode('auth')} />
}

function Landing({ onStart }: { onStart: () => void }) {
  return <main className="landing shell">
    <nav className="nav"><div className="brand"><span className="brand-mark"><Heart size={18} fill="currentColor" /></span><span>Usly</span></div><button className="text-button" onClick={onStart}>Sign in</button></nav>
    <section className="hero">
      <div className="eyebrow"><Sparkles size={15} /> Your little world together</div>
      <h1>A private place<br /><em>for the two of you.</em></h1>
      <p className="hero-copy">Usly keeps the small things that make a relationship feel like yours — feelings, moments, conversations, wishes and memories.</p>
      <button className="primary-button" onClick={onStart}>Create your Us <ArrowRight size={18} /></button>
      <div className="trust"><ShieldCheck size={16} /> Private by design · Built for two</div>
    </section>
    <section className="preview-card">
      <div className="preview-top"><div><span className="tiny-label">YOUR US</span><h2>Today, together</h2></div><span className="days">214 days <Heart size={15} fill="currentColor" /></span></div>
      <div className="people"><div className="person"><div className="avatar a">A</div><span>Alex</span><strong>🥰</strong></div><div className="line-heart"><Heart size={17} fill="currentColor" /></div><div className="person"><div className="avatar b">S</div><span>Sonya</span><strong>😌</strong></div></div>
      <div className="daily"><span>💌</span><div><small>FOR YOU</small><p>“I hope you know how happy you make me.”</p></div></div>
    </section>
    <section className="features">{features.map(({icon: Icon, title, text}) => <article className="feature" key={title}><div className="feature-icon"><Icon size={19} /></div><h3>{title}</h3><p>{text}</p></article>)}</section>
    <footer>Usly <span>·</span> a little place for your us.</footer>
  </main>
}

function AuthScreen(props: {authMode: AuthMode; setAuthMode:(v:AuthMode)=>void; email:string; setEmail:(v:string)=>void; password:string; setPassword:(v:string)=>void; name:string; setName:(v:string)=>void; message:string; busy:boolean; submitAuth:(e:React.FormEvent)=>void; onBack:()=>void}) {
  const { authMode, setAuthMode, email, setEmail, password, setPassword, name, setName, message, busy, submitAuth, onBack } = props
  return <main className="auth-page shell"><button className="back" onClick={onBack}>← Back</button><div className="auth-wrap"><div className="auth-logo"><span className="brand-mark"><Heart size={20} fill="currentColor" /></span><b>Usly</b></div><h1>{authMode === 'sign-in' ? 'Welcome back.' : 'Create your Us.'}</h1><p>{authMode === 'sign-in' ? 'Your little world is waiting.' : 'Start with you. Invite your person next.'}</p>
    <form className="auth-form" onSubmit={submitAuth}>{authMode === 'sign-up' && <label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?" required /></label>}<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required /></label>{message && <div className="notice">{message}</div>}<button className="primary-button wide" disabled={busy}>{busy ? 'Please wait…' : authMode === 'sign-in' ? 'Sign in' : 'Create account'} <ArrowRight size={18}/></button></form>
    <button className="switch" onClick={()=>setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in')}>{authMode === 'sign-in' ? 'New to Usly? Create an account' : 'Already have an account? Sign in'}</button><div className="secure"><LockKeyhole size={15}/> Your private space starts here.</div></div></main>
}

function Home() {
  const signOut = async () => { await supabase?.auth.signOut() }
  return <main className="app shell"><nav className="nav"><div className="brand"><span className="brand-mark"><Heart size={18} fill="currentColor" /></span>Usly</div><button className="text-button" onClick={signOut}>Sign out</button></nav><section className="home-hero"><div className="eyebrow"><Sparkles size={15}/> YOUR US</div><h1>Good to have you here. ❤️</h1><p>Your couple space is ready. Next we’ll connect your partner and build the moments that make Usly yours.</p></section><section className="setup-card"><div className="setup-icon"><Mail size={22}/></div><div><span className="tiny-label">NEXT STEP</span><h2>Invite your person</h2><p>Once the couple database is connected, this becomes a private invite link you can send in one tap.</p></div><span className="pill">Coming next</span></section><div className="home-grid"><article><span>💭</span><h3>Daily feeling</h3><p>Tell them how you feel in one tap.</p></article><article><span>📸</span><h3>Create a moment</h3><p>Save something you want to remember.</p></article><article><span>📖</span><h3>Your story</h3><p>Build your shared timeline over time.</p></article></div><div className="security-note"><ShieldCheck size={18}/><div><b>Security first</b><p>Usly will use Supabase Auth, row-level security and private storage. No couple will be able to read another couple’s data.</p></div></div></main>
}
