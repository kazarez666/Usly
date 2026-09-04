import { Component, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, Heart, Languages, LogOut, ShieldCheck, Sparkles, Users, Smile, Cloud, Flame, Moon, Frown, Send, Image as ImageIcon, Trash2, Plus, HandHeart, CircleCheck, UserRound, Camera, Save, X, Settings, CalendarDays, Cake, Video, Square, Bell } from 'lucide-react'
import { supabase } from './lib/supabase'
import {
  createCouple,
  getMyCouple,
  joinCouple,
  type CoupleSummary,
} from './lib/couples'
import { getCurrentFeelings, getMyUserId, saveFeeling, type Feeling, type MoodKey } from './lib/feelings'
import { createMoment, deleteMoment, getLatestMoment, getMomentCount, getMoments, type Moment } from './lib/moments'
import { deleteMessage, getLatestMessage, getMessageCount, getMessages, getUnreadCount, markMessagesRead, sendMessage, sendVideoMessage, type Message } from './lib/chat'
import { getDailyHoroscope, zodiacLabel, type DailyHoroscope } from './lib/horoscope'
import { getUsSpace, leaveCouple, updateMyProfile, updateUsSettings, type UsSpace } from './lib/us'
import { createWish, completeWish, deleteWish, getWishes, joinWish, type Wish } from './lib/wishes'
import { getMyDesire, getPartnerDesire, saveMyDesire, type Desire } from './lib/desires'
import { getSecretCategories, createSecretCategory, updateSecretCategory, deleteSecretCategory, getSecretOptions, createSecretOption, deleteSecretOption, sendSecretDesire, getSecretDesiresInbox, updateSecretDesireStatus, getSecretPhotos, uploadSecretPhoto, deleteSecretPhoto, getSecretChat, sendSecretChat, deleteSecretChatMessage, deleteSecretDesire, type SecretCategory, type SecretOption, type SecretSentDesire, type SecretPhoto, type SecretChatMessage } from './lib/secretRoom'
import { createCoupleDate, deleteCoupleDate, getCoupleDates, type CoupleDate } from './lib/dates'
import { createCoupleNote, deleteCoupleNote, getCoupleNotes, type CoupleNote } from './lib/coupleNotes'
import { getIntimacyEvents, toggleIntimacyEvent, intimacyTypes, type IntimacyEvent, type IntimacyType } from './lib/intimacy'
import { createGiftWish, deleteGiftWish, getGiftWishes, toggleGiftWish, type GiftWish } from './lib/giftWishes'
import { createTruthReply, createTruthTopic, getTruthReplies, getTruthTopics, updateTruthStatus, type TruthCategory, type TruthReply, type TruthStatus, type TruthTopic } from './lib/truthRoom'
import { roomPasswordExists, setRoomPassword, verifyRoomPassword, type RoomPasswordKind } from './lib/roomPasswords'
import { getNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from './lib/notifications'

type Mode = 'landing' | 'auth' | 'setup' | 'home'
type AuthMode = 'sign-in' | 'sign-up'
export type Language = 'ru' | 'en'

type Translation = {
  navSignIn: string
  navLanguage: string
  eyebrow: string
  heroTitle1: string
  heroTitle2: string
  heroCopy: string
  createUs: string
  privateByDesign: string
  back: string
  welcomeBack: string
  welcomeBackCopy: string
  createYourUs: string
  createYourUsCopy: string
  name: string
  namePlaceholder: string
  email: string
  emailPlaceholder: string
  password: string
  passwordPlaceholder: string
  pleaseWait: string
  signIn: string
  createAccount: string
  newToUsly: string
  alreadyAccount: string
  privateSpace: string
  supabaseMissing: string
  accountCreated: string
  setupTitle: string
  setupCopy: string
  createCouple: string
  joinCouple: string
  createCoupleCopy: string
  joinCoupleCopy: string
  inviteCode: string
  invitePlaceholder: string
  createInvite: string
  yourInviteCode: string
  inviteHint: string
  copied: string
  copy: string
  joined: string
  invalidCode: string
  coupleFull: string
  goodToHaveYou: string
  homeCopy: string
  waitingTitle: string
  waitingCopy: string
  coupleCode: string
  connected: string
  signOut: string
  refresh: string
  securityFirst: string
  securityCopy: string
  nextStep: string
}

const STORAGE_KEY = 'usly-language'
const LATEST_PHOTO_KEY_PREFIX = 'usly-latest-photo-'
const ACHIEVEMENTS_OPEN_KEY_PREFIX = 'usly-achievements-open-'
const INTIMACY_COLLAPSED_KEY_PREFIX = 'usly-intimacy-collapsed-'
const SECRET_AGE_CONFIRMED_KEY_PREFIX = 'usly-secret-age-confirmed:v1:'

function hasConfirmedSecretAge(coupleId: string) {
  try {
    return localStorage.getItem(`${SECRET_AGE_CONFIRMED_KEY_PREFIX}${coupleId}`) === '1'
  } catch {
    return false
  }
}

function rememberSecretAgeConfirmation(coupleId: string) {
  try {
    localStorage.setItem(`${SECRET_AGE_CONFIRMED_KEY_PREFIX}${coupleId}`, '1')
  } catch {
    // Access confirmation still works for this visit when storage is unavailable.
  }
}

type HomeBlockId = 'feeling' | 'note' | 'photo'
type UsBlockId = 'stats' | 'dates' | 'achievements' | 'giftWishlist' | 'entertainment' | 'truthRoom' | 'compatibility' | 'horoscope' | 'secret'
type BlockVisibility = { home: Record<HomeBlockId, boolean>; us: Record<UsBlockId, boolean> }

const DEFAULT_BLOCK_VISIBILITY: BlockVisibility = {
  home: { feeling: true, note: true, photo: true },
  us: { stats: true, dates: true, achievements: true, giftWishlist: true, entertainment: true, truthRoom: true, compatibility: true, horoscope: true, secret: true },
}

function getBlockVisibility(coupleId: string): BlockVisibility {
  try {
    const raw = localStorage.getItem(`usly-blocks-${coupleId}`)
    if (!raw) return DEFAULT_BLOCK_VISIBILITY
    const parsed = JSON.parse(raw) as Partial<BlockVisibility>
    return {
      home: { ...DEFAULT_BLOCK_VISIBILITY.home, ...(parsed.home ?? {}) },
      us: { ...DEFAULT_BLOCK_VISIBILITY.us, ...(parsed.us ?? {}) },
    }
  } catch {
    return DEFAULT_BLOCK_VISIBILITY
  }
}

function saveBlockVisibility(coupleId: string, value: BlockVisibility) {
  localStorage.setItem(`usly-blocks-${coupleId}`, JSON.stringify(value))
}

function resetBlockVisibility(coupleId: string) {
  localStorage.removeItem(`usly-blocks-${coupleId}`)
  return DEFAULT_BLOCK_VISIBILITY
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const translations: Record<Language, Translation> = {
  ru: {
    navSignIn: 'Войти', navLanguage: 'Язык', eyebrow: 'Ваш маленький мир вдвоём',
    heroTitle1: 'Пространство', heroTitle2: 'только для вас двоих.',
    heroCopy: 'Usly хранит маленькие вещи, из которых складываются отношения: чувства, моменты, разговоры, желания и воспоминания.',
    createUs: 'Создать наше пространство', privateByDesign: 'Приватно по задумке · Только для двоих',
    back: '← Назад', welcomeBack: 'С возвращением.', welcomeBackCopy: 'Ваш маленький мир ждёт вас.',
    createYourUs: 'Создайте ваше «мы».', createYourUsCopy: 'Начните с себя. Следующим шагом пригласите своего человека.',
    name: 'Имя', namePlaceholder: 'Как к вам обращаться?', email: 'Email', emailPlaceholder: 'you@example.com',
    password: 'Пароль', passwordPlaceholder: 'Минимум 6 символов', pleaseWait: 'Подождите…',
    signIn: 'Войти', createAccount: 'Создать аккаунт', newToUsly: 'Впервые в Usly? Создать аккаунт',
    alreadyAccount: 'Уже есть аккаунт? Войти', privateSpace: 'Ваше приватное пространство начинается здесь.',
    supabaseMissing: 'Supabase пока не подключён. Добавьте данные в .env.local.',
    accountCreated: 'Аккаунт создан. Если включено подтверждение email, проверьте почту.',
    setupTitle: 'Теперь создадим ваше «мы».',
    setupCopy: 'Создай новую пару или введи код, который прислал тебе партнёр.',
    createCouple: 'Создать пару', joinCouple: 'Войти по коду',
    createCoupleCopy: 'Ты создаёшь пространство и получаешь код-приглашение для второго человека.',
    joinCoupleCopy: 'Введи код приглашения, который получил от своего человека.',
    inviteCode: 'Код приглашения', invitePlaceholder: 'Например, A7K9P2QX',
    createInvite: 'Создать приглашение', yourInviteCode: 'Ваш код',
    inviteHint: 'Отправь этот код партнёру. Он сможет ввести его на своём устройстве.',
    copied: 'Скопировано', copy: 'Скопировать', joined: 'Вы вместе. ❤️',
    invalidCode: 'Такого приглашения нет или оно уже недействительно.',
    coupleFull: 'В этой паре уже два человека.',
    goodToHaveYou: 'Рады тебя видеть. ❤️',
    homeCopy: 'Ваше пространство для двоих уже подключено. Теперь здесь будет жить ваша общая история.',
    waitingTitle: 'Партнёр ещё не подключился',
    waitingCopy: 'Отправь ему код ниже. Как только он присоединится, вы оба увидите одно и то же пространство.',
    coupleCode: 'Код пары', connected: 'Пара подключена', signOut: 'Выйти',
    refresh: 'Обновить', securityFirst: 'Безопасность прежде всего',
    securityCopy: 'Данные привязаны к вашей паре. Доступ строится через Supabase Auth и Row Level Security.',
    nextStep: 'ВАШЕ ПРОСТРАНСТВО',
  },
  en: {
    navSignIn: 'Sign in', navLanguage: 'Language', eyebrow: 'Your little world together',
    heroTitle1: 'A private place', heroTitle2: 'for the two of you.',
    heroCopy: 'Usly keeps the small things that make a relationship feel like yours — feelings, moments, conversations, wishes and memories.',
    createUs: 'Create your Us', privateByDesign: 'Private by design · Built for two',
    back: '← Back', welcomeBack: 'Welcome back.', welcomeBackCopy: 'Your little world is waiting.',
    createYourUs: 'Create your Us.', createYourUsCopy: 'Start with you. Invite your person next.',
    name: 'Name', namePlaceholder: 'What should we call you?', email: 'Email', emailPlaceholder: 'you@example.com',
    password: 'Password', passwordPlaceholder: 'At least 6 characters', pleaseWait: 'Please wait…',
    signIn: 'Sign in', createAccount: 'Create account', newToUsly: 'New to Usly? Create an account',
    alreadyAccount: 'Already have an account? Sign in', privateSpace: 'Your private space starts here.',
    supabaseMissing: 'Supabase is not connected yet. Add your values to .env.local.',
    accountCreated: 'Account created. Check your email if confirmation is enabled.',
    setupTitle: 'Now let’s create your Us.',
    setupCopy: 'Create a new couple or enter the code your partner sent you.',
    createCouple: 'Create couple', joinCouple: 'Join with code',
    createCoupleCopy: 'Create the private space and get an invite code for your person.',
    joinCoupleCopy: 'Enter the invite code your person sent you.',
    inviteCode: 'Invite code', invitePlaceholder: 'For example, A7K9P2QX',
    createInvite: 'Create invite', yourInviteCode: 'Your code',
    inviteHint: 'Send this code to your partner. They can enter it on their device.',
    copied: 'Copied', copy: 'Copy', joined: 'You are together. ❤️',
    invalidCode: 'That invite does not exist or is no longer valid.',
    coupleFull: 'This couple already has two people.',
    goodToHaveYou: 'Good to have you here. ❤️',
    homeCopy: 'Your private couple space is connected. This is where your shared story will live.',
    waitingTitle: 'Your partner has not joined yet',
    waitingCopy: 'Send them the code below. Once they join, you will both see the same space.',
    coupleCode: 'Couple code', connected: 'Couple connected', signOut: 'Sign out',
    refresh: 'Refresh', securityFirst: 'Security first',
    securityCopy: 'Your data is attached to your couple. Access is protected with Supabase Auth and Row Level Security.',
    nextStep: 'YOUR SPACE',
  },
}

function getInitialLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'ru' || saved === 'en') return saved
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

export default function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const [theme, setTheme] = useState<'core' | 'rush' | 'nocturne' | 'mono' | 'custom'>(() => {
    const saved = localStorage.getItem('usly-theme')
    if (saved === 'rush' || saved === 'nocturne' || saved === 'mono' || saved === 'custom') return saved
    if (saved === 'pink') return 'nocturne'
    if (saved === 'blue') return 'mono'
    return 'core'
  })
  const [mode, setMode] = useState<Mode>('landing')
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [couple, setCouple] = useState<CoupleSummary | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  const t = translations[language]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    localStorage.setItem('usly-theme', theme)
    document.documentElement.dataset.theme = theme
  }, [theme])



  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    let mounted = true

    const load = async () => {
      const { data } = await client.auth.getSession()
      if (!mounted) return
      if (data.session) {
        const result = await getMyCouple()
        if (result.ok && result.couple) {
          setCouple(result.couple)
          setMode('home')
        } else {
          setMode('setup')
        }
      }
    }

    load()
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCouple(null)
        setMode('landing')
      }
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function submitAuth(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    if (!supabase) {
      setMessage(t.supabaseMissing)
      setBusy(false)
      return
    }

    try {
      const result = authMode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: name.trim() } },
          })

      if (result.error) setMessage(result.error.message)
      else if (authMode === 'sign-up') {
        setMessage(t.accountCreated)
        if (result.data.session) setMode('setup')
      } else {
        const coupleResult = await getMyCouple()
        setCouple(coupleResult.couple)
        setMode(coupleResult.couple ? 'home' : 'setup')
      }
    } catch {
      setMessage(t.supabaseMissing)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateCouple() {
    setBusy(true); setMessage('')
    const result = await createCouple()
    if (result.ok && result.couple) {
      setCouple(result.couple)
      setMode('home')
    } else {
      setMessage(result.error ?? t.supabaseMissing)
    }
    setBusy(false)
  }

  async function handleJoinCouple(code: string) {
    setBusy(true); setMessage('')
    const result = await joinCouple(code)
    if (result.ok && result.couple) {
      setCouple(result.couple)
      setMode('home')
    } else {
      setMessage(result.error === 'COUPLE_FULL' ? t.coupleFull : t.invalidCode)
    }
    setBusy(false)
  }

  async function refreshCouple() {
    setBusy(true)
    const result = await getMyCouple()
    setCouple(result.couple)
    setBusy(false)
  }

  function changeLanguage(next: Language) {
    setLanguage(next)
  }

  if (mode === 'home' && couple) {
    return <Home t={t} language={language} onLanguageChange={changeLanguage} theme={theme} onThemeChange={setTheme} couple={couple} busy={busy} onRefresh={refreshCouple} onCoupleLeft={() => { setCouple(null); setMode('setup') }} installPrompt={installPrompt} />
  }

  if (mode === 'setup') {
    return (
      <CoupleSetup
        t={t}
        language={language}
        onLanguageChange={changeLanguage}
        busy={busy}
        message={message}
        onCreate={handleCreateCouple}
        onJoin={handleJoinCouple}
      />
    )
  }

  if (mode === 'auth') {
    return (
      <AuthScreen
        t={t} language={language} onLanguageChange={changeLanguage}
        authMode={authMode} setAuthMode={setAuthMode}
        email={email} setEmail={setEmail} password={password} setPassword={setPassword}
        name={name} setName={setName} message={message} busy={busy}
        submitAuth={submitAuth} onBack={() => setMode('landing')}
      />
    )
  }

  return <Landing t={t} language={language} onLanguageChange={changeLanguage} onStart={() => setMode('auth')} />
}

function LanguageSwitcher({ language, onChange, label }: { language: Language; onChange: (language: Language) => void; label: string }) {
  return (
    <div className="language-switcher" aria-label={label} title={label}>
      <Languages size={15} />
      <button type="button" className={language === 'ru' ? 'active' : ''} onClick={() => onChange('ru')}>RU</button>
      <span>/</span>
      <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => onChange('en')}>EN</button>
    </div>
  )
}

function Landing({ t, language, onLanguageChange, onStart }: { t: Translation; language: Language; onLanguageChange: (language: Language) => void; onStart: () => void }) {
  return (
    <main className="shell landing">
      <nav className="nav">
        <Brand />
        <div className="nav-actions"><LanguageSwitcher language={language} onChange={onLanguageChange} label={t.navLanguage} /><button className="text-button" onClick={onStart}>{t.navSignIn}</button></div>
      </nav>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={15} /> {t.eyebrow}</div>
        <h1>{t.heroTitle1}<br /><em>{t.heroTitle2}</em></h1>
        <p className="hero-copy">{t.heroCopy}</p>
        <button className="primary-button" onClick={onStart}>{t.createUs} <ArrowRight size={18} /></button>
        <div className="trust"><ShieldCheck size={16} /> {t.privateByDesign}</div>
      </section>
      <section className="landing-card">
        <div className="floating-heart"><Heart size={28} fill="currentColor" /></div>
        <div className="preview-title">Usly</div>
        <p>❤️</p><strong>Two people. One private space.</strong>
      </section>
    </main>
  )
}

function AuthScreen(props: {
  t: Translation; language: Language; onLanguageChange: (language: Language) => void
  authMode: AuthMode; setAuthMode: (value: AuthMode) => void
  email: string; setEmail: (value: string) => void; password: string; setPassword: (value: string) => void
  name: string; setName: (value: string) => void; message: string; busy: boolean
  submitAuth: (event: FormEvent) => void; onBack: () => void
}) {
  const { t, language, onLanguageChange, authMode, setAuthMode, email, setEmail, password, setPassword, name, setName, message, busy, submitAuth, onBack } = props
  return (
    <main className="shell auth-page">
      <div className="auth-top"><button className="back" onClick={onBack}>{t.back}</button><LanguageSwitcher language={language} onChange={onLanguageChange} label={t.navLanguage} /></div>
      <div className="auth-wrap">
        <Brand />
        <h1>{authMode === 'sign-in' ? t.welcomeBack : t.createYourUs}</h1>
        <p>{authMode === 'sign-in' ? t.welcomeBackCopy : t.createYourUsCopy}</p>
        <form className="auth-form" onSubmit={submitAuth}>
          {authMode === 'sign-up' && <label>{t.name}<input value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="name" required /></label>}
          <label>{t.email}<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} autoComplete="email" required /></label>
          <label>{t.password}<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'} minLength={6} required /></label>
          {message && <div className="notice">{message}</div>}
          <button className="primary-button wide" disabled={busy}>{busy ? t.pleaseWait : authMode === 'sign-in' ? t.signIn : t.createAccount}<ArrowRight size={18} /></button>
        </form>
        <button className="switch" onClick={() => setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in')}>{authMode === 'sign-in' ? t.newToUsly : t.alreadyAccount}</button>
        <div className="secure"><ShieldCheck size={15} /> {t.privateSpace}</div>
      </div>
    </main>
  )
}

function CoupleSetup(props: {
  t: Translation; language: Language; onLanguageChange: (language: Language) => void
  busy: boolean; message: string; onCreate: () => void; onJoin: (code: string) => void
}) {
  const { t, language, onLanguageChange, busy, message, onCreate, onJoin } = props
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [code, setCode] = useState('')

  return (
    <main className="shell setup-page">
      <div className="auth-top"><Brand /><LanguageSwitcher language={language} onChange={onLanguageChange} label={t.navLanguage} /></div>
      <div className="setup-wrap">
        <div className="eyebrow"><Users size={15} /> {t.nextStep}</div>
        <h1>{t.setupTitle}</h1>
        <p>{t.setupCopy}</p>
        <div className="segmented">
          <button className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>{t.createCouple}</button>
          <button className={tab === 'join' ? 'active' : ''} onClick={() => setTab('join')}>{t.joinCouple}</button>
        </div>
        {tab === 'create' ? (
          <div className="action-card">
            <div className="action-icon"><Heart size={22} fill="currentColor" /></div>
            <h2>{t.createCouple}</h2><p>{t.createCoupleCopy}</p>
            <button className="primary-button wide" disabled={busy} onClick={onCreate}>{busy ? t.pleaseWait : t.createInvite}<ArrowRight size={18} /></button>
          </div>
        ) : (
          <div className="action-card">
            <div className="action-icon"><Users size={22} /></div>
            <h2>{t.joinCouple}</h2><p>{t.joinCoupleCopy}</p>
            <label>{t.inviteCode}<input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder={t.invitePlaceholder} maxLength={8} /></label>
            <button className="primary-button wide" disabled={busy || code.length < 6} onClick={() => onJoin(code)}>{busy ? t.pleaseWait : t.joinCouple}<ArrowRight size={18} /></button>
          </div>
        )}
        {message && <div className="notice">{message}</div>}
      </div>
    </main>
  )
}

const moodOptions: { key: MoodKey; icon: typeof Heart; label: string; color: string }[] = [
  { key: 'love', icon: Heart, label: 'Влюблён(а)', color: 'pink' },
  { key: 'happy', icon: Smile, label: 'Счастлив(а)', color: 'yellow' },
  { key: 'calm', icon: Cloud, label: 'Спокойно', color: 'blue' },
  { key: 'sad', icon: Frown, label: 'Грустно', color: 'violet' },
  { key: 'angry', icon: Flame, label: 'Злюсь', color: 'red' },
  { key: 'miss', icon: Moon, label: 'Скучаю', color: 'indigo' },
]

function formatFeelingTime(value: string, language: Language) {
  const date = new Date(value)
  return date.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function moodInfo(key: string) {
  return moodOptions.find((item) => item.key === key) ?? {
    key,
    icon: Heart,
    label: key,
    color: 'pink',
  }
}

function formatRelativeTime(value: string, language: Language) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return language === 'ru' ? 'только что' : 'just now'
  if (minutes < 60) return language === 'ru' ? `${minutes} мин назад` : `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return language === 'ru' ? `${hours} ч назад` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return language === 'ru' ? `${days} дн назад` : `${days}d ago`
}

const feelingThirdPerson: Record<string, { male: string; female: string }> = {
  'злюсь': { male: 'злится', female: 'злится' }, 'грущу': { male: 'грустит', female: 'грустит' },
  'скучаю': { male: 'скучает', female: 'скучает' }, 'радуюсь': { male: 'радуется', female: 'радуется' },
  'влюблён(а)': { male: 'влюблён', female: 'влюблена' }, 'влюблен(а)': { male: 'влюблён', female: 'влюблена' },
  'счастлив(а)': { male: 'счастлив', female: 'счастлива' }, 'спокоен(а)': { male: 'спокоен', female: 'спокойна' },
  'спокойно': { male: 'спокоен', female: 'спокойна' }, 'грустно': { male: 'грустит', female: 'грустит' },
  'взволнован(а)': { male: 'взволнован', female: 'взволнована' }, 'тревожусь': { male: 'тревожится', female: 'тревожится' },
  'переживаю': { male: 'переживает', female: 'переживает' }, 'боюсь': { male: 'боится', female: 'боится' },
  'устал(а)': { male: 'устал', female: 'устала' }, 'уставший': { male: 'устал', female: 'устала' },
  'уставшая': { male: 'устал', female: 'устала' }, 'обижен(а)': { male: 'обижен', female: 'обижена' },
  'обиделся': { male: 'обиделся', female: 'обиделась' }, 'обиделась': { male: 'обиделся', female: 'обиделась' },
  'гнев': { male: 'в гневе', female: 'в гневе' }, 'злость': { male: 'злится', female: 'злится' },
  'грусть': { male: 'грустит', female: 'грустит' }, 'тоска': { male: 'тоскует', female: 'тоскует' },
  'радость': { male: 'радуется', female: 'радуется' }, 'тревога': { male: 'тревожится', female: 'тревожится' },
  'волнение': { male: 'волнуется', female: 'волнуется' }, 'раздражение': { male: 'раздражён', female: 'раздражена' },
  'спокойствие': { male: 'спокоен', female: 'спокойна' }, 'одиночество': { male: 'чувствует себя одиноко', female: 'чувствует себя одиноко' },
  'усталость': { male: 'устал', female: 'устала' }, 'обида': { male: 'обижен', female: 'обижена' },
}

function partnerLabel(gender: 'male' | 'female' | null | undefined, language: Language) {
  if (language !== 'ru') return 'Partner'
  return gender === 'female' ? 'Партнёрша' : gender === 'male' ? 'Партнёр' : 'Партнёр'
}

function localizedFeelingPhrase(raw: string, language: Language, gender: 'male' | 'female' | null | undefined = null) {
  const key = raw.trim().toLocaleLowerCase('ru-RU')
  if (language === 'ru') {
    const localized: Record<string, string> = { love: gender === 'female' ? 'влюблена' : 'влюблён', happy: gender === 'female' ? 'счастлива' : 'счастлив', calm: gender === 'female' ? 'спокойна' : 'спокоен', sad: 'грустит', angry: 'злится', miss: 'скучает' }
    if (localized[key]) return localized[key]
    if (feelingThirdPerson[key]) return gender === 'female' ? feelingThirdPerson[key].female : feelingThirdPerson[key].male
    if (/(?:аю|яю)$/.test(key)) return key.slice(0, -2) + 'ает'
    if (/ую$/.test(key)) return key.slice(0, -2) + 'ует'
    if (/аюсь$/.test(key)) return key.slice(0, -4) + 'ается'
    if (/яюсь$/.test(key)) return key.slice(0, -4) + 'яется'
    if (/юсь$/.test(key)) return key.slice(0, -3) + 'ится'
    if (/усь$/.test(key)) return key.slice(0, -3) + 'ится'
    if (/ю$/.test(key) && key.length > 3) return key.slice(0, -1) + 'ит'
    return raw
  }
  const localized: Record<string, string> = { love: 'in love', happy: 'happy', calm: 'calm', sad: 'sad', angry: 'angry', miss: 'missing you' }
  return localized[key] ?? raw
}

function localizedFeelingLabel(raw: string, language: Language) {
  const key = raw.trim().toLocaleLowerCase('ru-RU')
  if (language === 'ru') {
    const map: Record<string, string> = { love: 'Влюблён(а)', happy: 'Счастлив(а)', calm: 'Спокойно', sad: 'Грустно', angry: 'Злюсь', miss: 'Скучаю' }
    return map[key] ?? raw
  }
  return moodInfo(key).label || raw
}

function CurrentFeelingCard({ feeling, language, title = 'Партнёр сейчас', partner }: { feeling: Feeling | null; language: Language; title?: string; partner?: UsSpace['people'][number] | null }) {
  const option = feeling ? moodInfo(feeling.mood) : null
  const Icon = option?.icon ?? Heart
  const partnerText = feeling ? localizedFeelingPhrase(feeling.mood, language, partner?.gender) : ''
  const partnerName = partnerLabel(partner?.gender, language)

  return (
    <section className="current-feeling-card">
      <div className="current-feeling-heading">
        <div><span className="tiny-label">СЕЙЧАС</span><h3>{title}</h3></div>
      </div>
      {feeling && option ? (
        <div className={`current-feeling-content mood-${option.color}`}>
          <div className="current-feeling-icon"><Icon size={30} fill={option.key === 'love' ? 'currentColor' : 'none'} /></div>
          <div className="current-feeling-text">
            <strong className="partner-feeling-phrase">{partnerName} {partnerText}</strong>
            {feeling.note && <p>{feeling.note}</p>}
            <span className="feeling-time">{formatRelativeTime(feeling.updatedAt, language)}</span>
          </div>
        </div>
      ) : (
        <div className="current-feeling-empty"><span>💭</span><div><strong>Пока ничего</strong><p>Партнёр ещё не выбрал чувство.</p></div></div>
      )}
    </section>
  )
}

function FeelingsSection({ couple, language, onBack }: { couple: CoupleSummary; language: Language; onBack: () => void }) {
  const [selected, setSelected] = useState<string>('love')
  const [customFeeling, setCustomFeeling] = useState('')
  const [note, setNote] = useState('')
  const [feelings, setFeelings] = useState<Feeling[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [desire, setDesire] = useState<Desire | null>(null)
  const [partnerDesire, setPartnerDesire] = useState<Desire | null>(null)
  const [desireText, setDesireText] = useState('')
  const [intensity, setIntensity] = useState(5)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDesire, setSavingDesire] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [space, setSpace] = useState<UsSpace | null>(null)

  const load = async () => {
    const [rows, userId, d, pd, spaceResult] = await Promise.all([getCurrentFeelings(couple.id), getMyUserId(), getMyDesire(couple.id), getPartnerDesire(couple.id), getUsSpace(couple.id)])
    setFeelings(rows); setMyUserId(userId); setDesire(d)
    if (d) { setDesireText(d.desire); setIntensity(d.intensity) }
    setPartnerDesire(pd)
    if (spaceResult.ok) setSpace(spaceResult.space)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    void load().then(() => { if (!active) return })
    if (!supabase) return () => { active = false }
    const channel = supabase.channel(`couple-feelings-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_feelings', filter: `couple_id=eq.${couple.id}` }, () => { void load() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_desires', filter: `couple_id=eq.${couple.id}` }, () => { void load() })
      .subscribe()
    return () => { active = false; void supabase?.removeChannel(channel) }
  }, [couple.id])

  const submit = async () => {
    setSaving(true); setError(''); setSaved(false)
    const feelingValue = customFeeling.trim() || selected
    if (!feelingValue) { setError('Выбери или напиши своё чувство.'); setSaving(false); return }
    const result = await saveFeeling(couple.id, feelingValue, note)
    if (!result.ok) setError(result.error ?? 'Не удалось обновить чувство')
    else { setNote(''); setSaved(true); await load(); window.setTimeout(() => setSaved(false), 1800) }
    setSaving(false)
  }

  const submitDesire = async () => {
    if (!desireText.trim()) { setError('Выбери или напиши, чего хочется сейчас.'); return }
    setSavingDesire(true); setError('')
    const result = await saveMyDesire(couple.id, desireText.trim(), intensity)
    if (!result.ok) setError(result.error ?? 'Не удалось обновить желание')
    else await load()
    setSavingDesire(false)
  }

  const mine = feelings.find(f => f.userId === myUserId) ?? null
  const partner = feelings.find(f => f.userId !== myUserId) ?? null
  const partnerPerson = space?.people.find(person => !person.isMe) ?? null
  const desireOptions = ['Объятия', 'Поцелуи', 'Массаж', 'Свидание', 'Поговорить', 'Побыть рядом', 'Интимная близость', 'Сюрприз']

  return <section className="feelings-page">
    <div className="section-back"><button className="back" onClick={onBack}>← Главная</button></div>
    <div className="feelings-intro"><div className="eyebrow"><Heart size={15} fill="currentColor" /> ЧУВСТВА</div><h2>Что происходит между вами сейчас?</h2><p>Здесь только актуальное состояние — без истории и лишнего шума. Партнёр видит изменения сразу.</p></div>

    <CurrentFeelingCard feeling={partner} language={language} title={`${partnerLabel(partnerPerson?.gender, language)} сейчас`} partner={partnerPerson} />

    <section className="partner-desire-card">
      <div className="current-feeling-heading"><div><span className="tiny-label">ЖЕЛАНИЕ ПАРТНЁРА</span><h3>{partnerDesire ? partnerDesire.desire : 'Пока ничего не выбрано'}</h3></div>{partnerDesire && <span className="desire-score">{partnerDesire.intensity}/10</span>}</div>
      {partnerDesire ? <div className="desire-progress"><span style={{width:`${partnerDesire.intensity*10}%`}} /></div> : <p>Когда партнёр выберет желание, оно появится здесь.</p>}
    </section>

    <div className="feelings-composer">
      <div className="composer-label"><span className="tiny-label">ТВОЁ ЧУВСТВО</span>{mine && <small>Сейчас: {localizedFeelingLabel(mine.mood, language)}</small>}</div>
      <div className="mood-grid">{moodOptions.map(({key,icon:Icon,label,color}) => <button key={key} type="button" className={`mood-choice ${selected===key && !customFeeling?'selected':''} mood-${color}`} onClick={()=>{setSelected(key);setCustomFeeling('')}}><Icon size={24} fill={key==='love'?'currentColor':'none'} /><span>{label}</span></button>)}</div>
      <div className="custom-feeling-row">
        <input className="custom-feeling-input" value={customFeeling} onChange={e=>{setCustomFeeling(e.target.value.slice(0,60)); if(e.target.value.trim()) setSelected('')}} placeholder="Или напиши своё: злюсь, тревожусь, радуюсь…" />
        <span className="custom-feeling-hint">Без ограничений</span>
      </div>
      <textarea value={note} onChange={e=>setNote(e.target.value.slice(0,180))} placeholder="Можно добавить пару слов…" rows={3}/>
      <div className="feelings-compose-bottom"><span>{note.length}/180</span><button className="primary-button feelings-send" disabled={saving} onClick={submit}>{saving?'Обновляем…':saved?'Обновлено ❤️':'Показать партнёру'} <Send size={17}/></button></div>
    </div>

    <section className="desire-editor">
      <div className="composer-label"><div><span className="tiny-label">ТВОЁ ЖЕЛАНИЕ</span><h3>Чего хочется сейчас?</h3></div><strong className="desire-score">{intensity}/10</strong></div>
      <div className="desire-options">{desireOptions.map(option=><button key={option} className={desireText===option?'selected':''} onClick={()=>setDesireText(option)}>{option}</button>)}</div>
      <input className="desire-custom" value={desireText} onChange={e=>setDesireText(e.target.value.slice(0,80))} placeholder="Или напиши своё желание…" />
      <div className="intensity-row"><span>Нежно</span><input type="range" min="1" max="10" value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/><span>Очень хочется</span></div>
      <button className="primary-button wide" disabled={savingDesire} onClick={()=>void submitDesire()}>{savingDesire?'Сохраняем…':desire?'Обновить желание':'Показать партнёру'} <Heart size={16}/></button>
      <small className="muted-copy">Отображается только одно актуальное желание. Новое заменяет предыдущее.</small>
    </section>
    {error && <div className="notice">{error}</div>}
  </section>
}

function MomentsSection({ couple, language, onBack, installPrompt, onInstall }: { couple: CoupleSummary; language: Language; onBack: () => void; installPrompt: BeforeInstallPromptEvent | null; onInstall: () => void }) {
  const [photos, setPhotos] = useState<Moment[]>([])
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Moment | null>(null)

  const loadPhotos = async () => {
    const rows = await getMoments(couple.id)
    const next = rows.filter(row => Boolean(row.imageUrl))
    setPhotos(next)
    if (next[0]?.imageUrl) localStorage.setItem(`${LATEST_PHOTO_KEY_PREFIX}${couple.id}`, next[0].imageUrl)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    setLoading(true)

    Promise.all([getMyUserId(), getMoments(couple.id)]).then(([userId, rows]) => {
      if (!active) return
      setMyUserId(userId)
      setPhotos(rows.filter(row => Boolean(row.imageUrl)))
      setLoading(false)
    })

    if (!supabase) return () => { active = false }

    const channel = supabase
      .channel(`couple-photos-${couple.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'moments',
        filter: `couple_id=eq.${couple.id}`,
      }, () => { void loadPhotos() })
      .subscribe()

    return () => {
      active = false
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      void supabase?.removeChannel(channel)
    }
  }, [couple.id])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!lightbox) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [lightbox])

  const selectFile = (nextFile: File | null) => {
    if (!nextFile) return
    if (!nextFile.type.startsWith('image/')) {
      setError(language === 'ru' ? 'Можно отправлять только фотографии.' : 'Only photos can be sent.')
      return
    }
    if (nextFile.size > 8 * 1024 * 1024) {
      setError(language === 'ru' ? 'Фото слишком большое. Максимум — 8 МБ.' : 'Photo is too large. Maximum is 8 MB.')
      return
    }
    setError('')
    setFile(nextFile)
  }

  const submit = async () => {
    if (!file) {
      setError(language === 'ru' ? 'Выбери фотографию.' : 'Choose a photo.')
      return
    }

    setSaving(true)
    setError('')
    const result = await createMoment(couple.id, '', caption, file)
    if (!result.ok) {
      const errors: Record<string, string> = {
        SUPABASE_MISSING: language === 'ru' ? 'Supabase не подключён.' : 'Supabase is not connected.',
        NOT_AUTHENTICATED: language === 'ru' ? 'Сессия закончилась. Войди снова.' : 'Your session expired. Sign in again.',
        IMAGE_ONLY: language === 'ru' ? 'Можно отправлять только фотографии.' : 'Only photos can be sent.',
        IMAGE_TOO_LARGE: language === 'ru' ? 'Фото слишком большое. Максимум — 8 МБ.' : 'Photo is too large. Maximum is 8 MB.',
      }
      setError(errors[result.error ?? ''] ?? result.error ?? (language === 'ru' ? 'Не удалось отправить фото.' : 'Could not send the photo.'))
    } else {
      setCaption('')
      setFile(null)
      await loadPhotos()
    }
    setSaving(false)
  }

  const remove = async (photo: Moment) => {
    if (!window.confirm(language === 'ru' ? 'Удалить это фото у вас обоих?' : 'Delete this photo for both of you?')) return
    const result = await deleteMoment(photo)
    if (!result.ok) {
      setError(result.error ?? (language === 'ru' ? 'Не удалось удалить фото.' : 'Could not delete the photo.'))
      return
    }
    setPhotos(current => current.filter(item => item.id !== photo.id))
    if (lightbox?.id === photo.id) setLightbox(null)
  }

  return (
    <section className="photos-page">
      <div className="section-back">
        <button className="back" onClick={onBack}>← {language === 'ru' ? 'Главная' : 'Home'}</button>
      </div>

      <div className="photos-intro">
        <div>
          <div className="eyebrow"><ImageIcon size={15} /> {language === 'ru' ? 'ФОТО · ВАШИ' : 'PHOTOS · YOURS'}</div>
          <h2>{language === 'ru' ? 'Ваши моменты — здесь.' : 'Your moments, together.'}</h2>
          <p>{language === 'ru' ? 'Отправляй фотографии прямо сюда — партнёр увидит их почти сразу.' : 'Send photos here and your partner will see them almost instantly.'}</p>
        </div>
        <div className="photos-count"><strong>{photos.length}</strong><span>{language === 'ru' ? 'фото' : 'photos'}</span></div>
      </div>

      <div className="photo-send-card">
        <div className="photo-send-copy">
          <span className="tiny-label">{language === 'ru' ? 'ОТПРАВИТЬ ПАРТНЁРУ' : 'SEND TO PARTNER'}</span>
          <h3>{language === 'ru' ? 'Покажи, что происходит прямо сейчас.' : 'Show what is happening right now.'}</h3>
          <p>{language === 'ru' ? 'Одно фото, одна подпись — и оно появляется у вас обоих.' : 'One photo, one caption — and it appears for both of you.'}</p>
        </div>

        <label className={`photo-dropzone ${previewUrl ? 'has-preview' : ''}`}>
          <input type="file" accept="image/*" capture="environment" onChange={event => { selectFile(event.target.files?.[0] ?? null); event.currentTarget.value = '' }} />
          {previewUrl ? (
            <img src={previewUrl} alt="" />
          ) : (
            <>
              <span className="photo-drop-icon"><Camera size={24} /></span>
              <strong>{language === 'ru' ? 'Выбрать фотографию' : 'Choose a photo'}</strong>
              <small>{language === 'ru' ? 'JPG, PNG, WEBP · до 8 МБ' : 'JPG, PNG, WEBP · up to 8 MB'}</small>
            </>
          )}
        </label>

        {file && <div className="photo-selected-file"><ImageIcon size={15}/><span>{file.name}</span><button type="button" onClick={() => setFile(null)} aria-label={language === 'ru' ? 'Убрать фото' : 'Remove photo'}><X size={15}/></button></div>}

        <div className="photo-caption-row">
          <input value={caption} onChange={event => setCaption(event.target.value.slice(0, 180))} placeholder={language === 'ru' ? 'Подпись (необязательно)' : 'Caption (optional)'} maxLength={180} />
          <button className="primary-button" disabled={saving || !file} onClick={() => void submit()}>{saving ? (language === 'ru' ? 'Отправляем…' : 'Sending…') : (language === 'ru' ? 'Отправить' : 'Send')} <Send size={16}/></button>
        </div>
        {error && <div className="notice">{error}</div>}
      </div>

      <div className="photo-widget-bar">
        <div>
          <strong>{language === 'ru' ? 'Фото на экране' : 'Photo on your screen'}</strong>
          <small>{language === 'ru' ? 'Usly запоминает последнее фото. Открой отдельный экран в стиле Locket или установи Usly как приложение.' : 'Usly keeps the latest photo. Open the Locket-style photo screen or install Usly as an app.'}</small>
        </div>
        <div className="photo-widget-actions">
          <button className="secondary-button" type="button" onClick={() => { window.location.href = '/widget/' }}>{language === 'ru' ? 'Открыть фото' : 'Open photo'}</button>
          {installPrompt && <button className="primary-button" type="button" onClick={onInstall}>{language === 'ru' ? 'Установить Usly' : 'Install Usly'}</button>}
        </div>
      </div>

      <div className="section-heading photos-heading">
        <div>
          <span className="tiny-label">{language === 'ru' ? 'ОБЩАЯ ГАЛЕРЕЯ' : 'SHARED GALLERY'}</span>
          <h2>{language === 'ru' ? 'Последние фотографии' : 'Latest photos'}</h2>
        </div>
        {photos[0]?.imageUrl && <span className="photos-live-hint"><span /> {language === 'ru' ? 'Обновляется автоматически' : 'Updates automatically'}</span>}
      </div>

      {loading ? (
        <div className="feelings-empty"><Sparkles size={24}/><h3>{language === 'ru' ? 'Загружаем фотографии…' : 'Loading photos…'}</h3></div>
      ) : photos.length === 0 ? (
        <div className="photos-empty">
          <div className="photos-empty-icon"><ImageIcon size={28}/></div>
          <h3>{language === 'ru' ? 'Галерея пока пустая' : 'Your gallery is empty'}</h3>
          <p>{language === 'ru' ? 'Отправь первое фото — оно появится здесь и на главной.' : 'Send the first photo — it will appear here and on the home screen.'}</p>
        </div>
      ) : (
        <div className="photo-gallery">
          {photos.map(photo => (
            <article className="photo-tile" key={photo.id} onClick={() => setLightbox(photo)}>
              <img src={photo.imageUrl!} alt={photo.body || ''} loading="lazy" />
              <div className="photo-tile-gradient" />
              <div className="photo-tile-meta">
                <span>{photo.userId === myUserId ? (language === 'ru' ? 'Ты' : 'You') : (language === 'ru' ? 'Партнёр' : 'Partner')}</span>
                <time>{formatRelativeTime(photo.createdAt, language)}</time>
              </div>
              {photo.body && <div className="photo-tile-caption">{photo.body}</div>}
              {photo.userId === myUserId && <button className="photo-tile-delete" type="button" onClick={event => { event.stopPropagation(); void remove(photo) }} aria-label={language === 'ru' ? 'Удалить фото' : 'Delete photo'}><Trash2 size={15}/></button>}
            </article>
          ))}
        </div>
      )}

      {lightbox?.imageUrl && (
        <div className="photo-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button className="photo-lightbox-close" type="button" onClick={() => setLightbox(null)} aria-label={language === 'ru' ? 'Закрыть' : 'Close'}><X size={22}/></button>
          <div className="photo-lightbox-content" onClick={event => event.stopPropagation()}>
            <img src={lightbox.imageUrl} alt={lightbox.body || ''}/>
            <div className="photo-lightbox-info">
              <strong>{lightbox.userId === myUserId ? (language === 'ru' ? 'Ты' : 'You') : (language === 'ru' ? 'Партнёр' : 'Partner')}</strong>
              <span>{formatRelativeTime(lightbox.createdAt, language)}</span>
              {lightbox.body && <p>{lightbox.body}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function formatMessageTime(value: string, language: Language) {
  return new Date(value).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ person, size = 'md' }: { person: { displayName?: string; avatarUrl?: string | null } | null; size?: 'sm' | 'md' | 'lg' }) {
  const initial = (person?.displayName || '?').trim().slice(0, 1).toUpperCase()
  return (
    <div className={`profile-avatar profile-avatar-${size}`}>
      {person?.avatarUrl ? <img src={person.avatarUrl} alt={person.displayName || ''} /> : <span>{initial}</span>}
    </div>
  )
}

function ChatSection({ couple, language, onBack, onUnreadChange }: { couple: CoupleSummary; language: Language; onBack: () => void; onUnreadChange: (count: number) => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [space, setSpace] = useState<UsSpace | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingError, setRecordingError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingStartedRef = useRef(0)
  const recordingTimerRef = useRef<number | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const load = async () => {
    const rows = await getMessages(couple.id)
    setMessages(rows)
    setLoading(false)
    await markMessagesRead(couple.id)
    onUnreadChange(0)
  }

  useEffect(() => {
    let active = true
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null
    setLoading(true)

    const setup = async () => {
      const [rows, unread, userId, spaceResult] = await Promise.all([getMessages(couple.id), getUnreadCount(couple.id), getMyUserId(), getUsSpace(couple.id)])
      if (!active) return
      setMessages(rows)
      setMyUserId(userId)
      if (spaceResult.ok) setSpace(spaceResult.space)
      setLoading(false)
      onUnreadChange(unread)
      await markMessagesRead(couple.id)
      if (!active) return
      onUnreadChange(0)

      if (!supabase) return

      channel = supabase
        .channel(`couple-chat-${couple.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages', filter: `couple_id=eq.${couple.id}`,
        }, async payload => {
          const incoming = payload.new as any
          const refreshed = await getMessages(couple.id)
          setMessages(refreshed)
          if (incoming.sender_id !== userId) {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
              new Notification('Usly · новое сообщение', { body: incoming.body.slice(0, 100) })
            }
            if (document.visibilityState === 'visible') {
              await markMessagesRead(couple.id)
              onUnreadChange(0)
            } else {
              onUnreadChange(await getUnreadCount(couple.id))
            }
          }
        })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages', filter: `couple_id=eq.${couple.id}`,
      }, payload => {
        const updated = payload.new as any
        setMessages(current => current.map(item => item.id === updated.id ? { ...item, readAt: updated.read_at } : item))
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'profiles',
      }, async payload => {
        const changedId = (payload.new as any)?.id || (payload.old as any)?.id
        if (changedId) {
          const result = await getUsSpace(couple.id)
          if (result.ok) setSpace(result.space)
        }
      })
        .subscribe()
    }

    void setup()
    return () => {
      active = false
      if (channel) void supabase?.removeChannel(channel)
    }
  }, [couple.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: loading ? 'auto' : 'smooth' })
  }, [messages.length, loading])

  useEffect(() => {
    if (!recording || !videoPreviewRef.current || !streamRef.current) return
    videoPreviewRef.current.srcObject = streamRef.current
    void videoPreviewRef.current.play()
  }, [recording])

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
  }

  const startRecording = async () => {
    if (recording || sending) return
    setRecordingError('')
    try {
      if (typeof MediaRecorder === 'undefined') throw new Error('VIDEO_UNSUPPORTED')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' } }, audio: true })
      streamRef.current = stream
      const mimeCandidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      const mime = mimeCandidates.find(type => MediaRecorder.isTypeSupported(type))
      if (!mime) {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        throw new Error('VIDEO_UNSUPPORTED')
      }
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      recordingStartedRef.current = Date.now()
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onstop = async () => {
        const duration = Date.now() - recordingStartedRef.current
        const blob = new Blob(chunksRef.current, { type: mime })
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setRecording(false); setRecordingSeconds(0)
        if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current)
        if (blob.size) {
          setSending(true); setError('')
          const result = await sendVideoMessage(couple.id, blob, duration)
          if (!result.ok) setError(result.error === 'VIDEO_TOO_LARGE' ? (language === 'ru' ? 'Видео слишком большое. Максимум 20 МБ.' : 'Video is too large. Maximum 20 MB.') : result.error ?? (language === 'ru' ? 'Не удалось отправить видео.' : 'Could not send video.'))
          setSending(false)
        }
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
      recordingTimerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - recordingStartedRef.current) / 1000)
        setRecordingSeconds(seconds)
        if (seconds >= 20) stopRecording()
      }, 250)
    } catch (error) {
      const message = error instanceof Error && error.message === 'VIDEO_UNSUPPORTED'
        ? (language === 'ru' ? 'Этот браузер не умеет записывать видеокружки.' : 'This browser cannot record video circles.')
        : (language === 'ru' ? 'Нужен доступ к камере и микрофону для видеокружков.' : 'Camera and microphone access is needed for video circles.')
      setRecordingError(message)
      setError(message)
    }
  }

  useEffect(() => () => {
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current)
    streamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    setError('')
    const result = await sendMessage(couple.id, text)
    if (!result.ok) {
      const errors: Record<string, string> = {
        SUPABASE_MISSING: 'Supabase не подключён.',
        NOT_AUTHENTICATED: 'Сессия закончилась. Войди снова.',
        EMPTY_MESSAGE: 'Напиши сообщение.',
        MESSAGE_TOO_LONG: 'Сообщение слишком длинное. Максимум — 2000 символов.',
      }
      setError(errors[result.error ?? ''] ?? result.error ?? 'Не удалось отправить сообщение.')
    } else {
      setText('')
    }
    setSending(false)
  }

  const removeOwnMessage = async (message: Message) => {
    if (message.senderId !== myUserId) return
    const result = await deleteMessage(message)
    if (!result.ok) setError(result.error ?? (language === 'ru' ? 'Не удалось удалить сообщение.' : 'Could not delete message.'))
    else setMessages(current => current.filter(item => item.id !== message.id))
  }

  const cancelRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.ondataavailable = null
      recorderRef.current.onstop = null
      if (recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
    setRecording(false)
    setRecordingSeconds(0)
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current)
    setRecordingError('')
  }

  return (
    <section className="chat-page">
      <div className="section-back"><button className="back" onClick={onBack}>← {language === 'ru' ? 'Главная' : 'Home'}</button></div>
      <div className="chat-intro">
        <div className="eyebrow"><Send size={15} /> {language === 'ru' ? 'ЧАТ · ТОЛЬКО ВДВОЁМ' : 'CHAT · JUST YOU TWO'}</div>
        <div className="chat-title-row">
          <div>
            <h2>{language === 'ru' ? 'Скажи мне.' : 'Talk to me.'}</h2>
            <p>{language === 'ru' ? 'Ваш разговор остаётся внутри вашего пространства.' : 'Your conversation stays inside your private space.'}</p>
          </div>
        </div>
      </div>

      <div className="chat-panel">
        <div className="chat-panel-head">
          <div><span className="tiny-label">USLY CHAT</span><strong>{language === 'ru' ? 'Ваш маленький разговор' : 'Your little conversation'}</strong></div>
          </div>

        <div className="chat-messages">
          {loading ? (
            <div className="chat-empty"><span>💌</span><strong>{language === 'ru' ? 'Открываем ваш разговор…' : 'Opening your conversation…'}</strong></div>
          ) : messages.length === 0 ? (
            <div className="chat-empty"><span>💌</span><strong>{language === 'ru' ? 'Здесь пока тихо.' : 'It’s quiet here.'}</strong><p>{language === 'ru' ? 'Напиши первым. Иногда одного «привет» достаточно.' : 'Send the first message. Sometimes a simple hello is enough.'}</p></div>
          ) : (
            messages.map(message => {
              const mine = message.senderId === myUserId
              return (
                <div className={`chat-message-row ${mine ? 'mine' : 'theirs'}`} key={message.id}>
                  {!mine && <Avatar person={space?.people.find(person => person.userId === message.senderId) ?? null} size="sm" />}
                  <div className="chat-bubble-wrap">
                    {!mine && <span className="chat-sender-name">{space?.people.find(person => person.userId === message.senderId)?.displayName || (language === 'ru' ? 'Партнёр' : 'Partner')}</span>}
                    {message.mediaType === 'video' && message.mediaUrl ? (
                      <div className="chat-video-message" onDoubleClick={() => void removeOwnMessage(message)} title={mine ? (language === 'ru' ? 'Двойной клик — удалить' : 'Double click to delete') : undefined}>
                        <video className="chat-video-circle" src={message.mediaUrl} playsInline controls preload="metadata" />
                        {message.durationMs ? <span className="chat-video-duration">{Math.max(1, Math.round(message.durationMs / 1000))}с</span> : null}
                      </div>
                    ) : <button className="chat-bubble" type="button" onDoubleClick={() => void removeOwnMessage(message)} title={mine ? (language === 'ru' ? 'Двойной клик — удалить' : 'Double click to delete') : undefined}>{message.body}</button>}
                    <div className="chat-meta">{formatMessageTime(message.createdAt, language)} {mine && (message.readAt ? '· ✓✓' : '· ✓')}</div>
                  </div>
                  {mine && <Avatar person={space?.people.find(person => person.userId === message.senderId) ?? null} size="sm" />}
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="notice chat-error">{error}</div>}

        {recording && <div className="video-recording-bar">
          <div className="video-circle-preview"><video ref={videoPreviewRef} muted playsInline /></div>
          <div className="video-recording-copy"><strong>{language === 'ru' ? 'Видеокружок' : 'Video circle'}</strong><span>00:{String(recordingSeconds).padStart(2,'0')} / 00:20</span></div>
          <button className="video-control-button cancel" type="button" onClick={cancelRecording} aria-label={language === 'ru' ? 'Отменить' : 'Cancel'}>×</button>
          <button className="record-stop-button" type="button" onClick={stopRecording} aria-label={language === 'ru' ? 'Остановить запись' : 'Stop recording'}><Square size={15} fill="currentColor"/></button>
        </div>}
        {recordingError && <div className="video-recording-error">{recordingError}</div>}
        <form className="chat-composer" onSubmit={submit}>
          <button className="chat-media-button" type="button" onClick={() => recording ? stopRecording() : void startRecording()} disabled={sending} aria-label={language === 'ru' ? 'Видеокружок' : 'Video circle'} title={language === 'ru' ? 'Записать видеокружок' : 'Record video circle'}>
            {recording ? <Square size={16} fill="currentColor" /> : <Video size={18}/>}
          </button>
          <input value={text} onChange={event => setText(event.target.value.slice(0, 2000))} placeholder={language === 'ru' ? 'Напиши что-нибудь…' : 'Say something…'} maxLength={2000} autoComplete="off" enterKeyHint="send" />
          <button className="chat-send" disabled={sending || !text.trim()} aria-label={language === 'ru' ? 'Отправить' : 'Send'}><Send size={18} /></button>
        </form>
      </div>
    </section>
  )
}


function CoupleDatesSection({ couple, language, relationshipStartedAt, onRelationshipDateSave, relationshipDateSaving }: { couple: CoupleSummary; language: Language; relationshipStartedAt: string; onRelationshipDateSave: (value: string) => Promise<void>; relationshipDateSaving: boolean }) {
  const [dates, setDates] = useState<CoupleDate[]>([])
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [relationshipDraft, setRelationshipDraft] = useState(relationshipStartedAt)
  useEffect(() => setRelationshipDraft(relationshipStartedAt), [relationshipStartedAt])

  const load = async () => {
    const result = await getCoupleDates(couple.id)
    if (!result.ok) setError(result.error ?? (language === 'ru' ? 'Не удалось загрузить даты.' : 'Could not load dates.'))
    else setDates(result.dates)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    void getCoupleDates(couple.id).then(result => {
      if (!active) return
      if (!result.ok) setError(result.error ?? (language === 'ru' ? 'Не удалось загрузить даты.' : 'Could not load dates.'))
      else setDates(result.dates)
      setLoading(false)
    })
    if (!supabase) return () => { active = false }
    const channel = supabase
      .channel(`couple-dates-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_dates', filter: `couple_id=eq.${couple.id}` }, () => { void load() })
      .subscribe()
    return () => { active = false; void supabase?.removeChannel(channel) }
  }, [couple.id])

  const add = async () => {
    if (!title.trim() || !date) {
      setError(language === 'ru' ? 'Укажи название и дату.' : 'Add a title and date.')
      return
    }
    setSaving(true); setError('')
    const result = await createCoupleDate(couple.id, title, date, 'other')
    if (!result.ok) setError(result.error ?? (language === 'ru' ? 'Не удалось сохранить дату.' : 'Could not save the date.'))
    else { setTitle(''); setDate(''); await load() }
    setSaving(false)
  }

  const remove = async (id: string) => {
    const result = await deleteCoupleDate(id)
    if (!result.ok) setError(result.error ?? (language === 'ru' ? 'Не удалось удалить дату.' : 'Could not delete the date.'))
    else await load()
  }

  const nextDate = (value: string) => {
    const now = new Date()
    const base = new Date(`${value}T00:00:00`)
    const thisYear = new Date(now.getFullYear(), base.getMonth(), base.getDate())
    if (thisYear.getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) return thisYear
    return new Date(now.getFullYear() + 1, base.getMonth(), base.getDate())
  }

  if (loading) return <div className="dates-card"><div className="dates-empty"><CalendarDays size={20}/><span>{language === 'ru' ? 'Загружаем ваши даты…' : 'Loading your dates…'}</span></div></div>

  return <div className="dates-card">
    <div className="section-heading"><div><span className="tiny-label">{language === 'ru' ? 'ВАЖНОЕ' : 'IMPORTANT'}</span><h2>{language === 'ru' ? 'Ваши даты' : 'Your dates'}</h2></div><CalendarDays size={20}/></div>
    <p className="dates-copy">{language === 'ru' ? 'Годовщицы, дни рождения и маленькие даты, которые хочется помнить.' : 'Anniversaries, birthdays and little dates worth remembering.'}</p>

    <div className="relationship-date-row">
      <div><span className="tiny-label">{language === 'ru' ? 'НАЧАЛО ВАШЕЙ ИСТОРИИ' : 'YOUR STORY STARTED'}</span><strong>{language === 'ru' ? 'Дата, с которой вы вместе' : 'The date you became a couple'}</strong><small>{language === 'ru' ? 'Она используется для расчёта «дней вместе» и достижений.' : 'Used for your together-days counter and achievements.'}</small></div>
      <div className="relationship-date-actions"><input type="date" value={relationshipDraft} onChange={e=>setRelationshipDraft(e.target.value)} /><button className="secondary-button" disabled={relationshipDateSaving || relationshipDraft === relationshipStartedAt} onClick={()=>void onRelationshipDateSave(relationshipDraft)}>{relationshipDateSaving ? '…' : (language === 'ru' ? 'Сохранить' : 'Save')}</button></div>
    </div>

    <div className="date-composer">
      <input value={title} onChange={e => setTitle(e.target.value.slice(0, 60))} placeholder={language === 'ru' ? 'Например: Наша годовщина' : 'For example: Our anniversary'} maxLength={60}/>
      <div className="date-composer-row">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="primary-button" disabled={saving} onClick={() => void add()}>{saving ? '…' : <><Plus size={15}/>{language === 'ru' ? 'Добавить' : 'Add'}</>}</button>
      </div>
    </div>

    {error && <div className="notice">{error}</div>}

    {!dates.length ? <div className="dates-empty large"><CalendarDays size={26}/><strong>{language === 'ru' ? 'Пока нет важных дат' : 'No important dates yet'}</strong><span>{language === 'ru' ? 'Добавьте первую — она появится здесь у вас обоих.' : 'Add the first one and it will appear here for both of you.'}</span></div> : <div className="dates-list">
      {dates.map(item => {
        const next = nextDate(item.date)
        const days = Math.ceil((next.getTime() - new Date().setHours(0,0,0,0)) / 86400000)
        const Icon = item.kind === 'birthday' ? Cake : CalendarDays
        return <article className="date-item" key={item.id}>
          <div className="date-icon"><Icon size={18}/></div>
          <div className="date-main"><strong>{item.title}</strong><span>{new Date(`${item.date}T00:00:00`).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span><small>{days === 0 ? (language === 'ru' ? 'Сегодня ❤️' : 'Today ❤️') : days === 1 ? (language === 'ru' ? 'Завтра' : 'Tomorrow') : (language === 'ru' ? `Через ${days} дн.` : `In ${days} days`)}</small></div>
          <button className="date-delete" onClick={() => void remove(item.id)} title={language === 'ru' ? 'Удалить' : 'Delete'}><Trash2 size={15}/></button>
        </article>
      })}
    </div>}
  </div>
}

function IntimacyCalendar({ couple, language }: { couple: CoupleSummary; language: Language }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [events, setEvents] = useState<IntimacyEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [loading, setLoading] = useState(true)
  const load = async () => { const r = await getIntimacyEvents(couple.id); if (r.ok) setEvents(r.events); setLoading(false) }
  useEffect(()=>{setLoading(true);void load(); if(!supabase)return; const ch=supabase.channel(`intimacy-${couple.id}`).on('postgres_changes',{event:'*',schema:'public',table:'couple_intimacy_events',filter:`couple_id=eq.${couple.id}`},()=>void load()).subscribe(); return()=>{void supabase?.removeChannel(ch)}},[couple.id])
  const y=month.getFullYear(), m=month.getMonth(), first=new Date(y,m,1).getDay(), offset=(first+6)%7, days=new Date(y,m+1,0).getDate()
  const dateKey=(d:number)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const selected=events.filter(e=>e.date===selectedDate)
  const labels:Record<IntimacyType,string>={sex:'Секс',oral:'Оральный секс',orgasm:'Оргазм',toys:'Игрушки',date:'Свидание',kiss:'Поцелуи',cuddle:'Объятия',other:'Другое'}
  const eventClass:Record<IntimacyType,string>={sex:'event-sex',oral:'event-oral',orgasm:'event-orgasm',toys:'event-toys',date:'event-date',kiss:'event-kiss',cuddle:'event-cuddle',other:'event-other'}
  const toggle=async(type:IntimacyType)=>{await toggleIntimacyEvent(couple.id,selectedDate,type);await load()}
  return <section className="intimacy-calendar-card">
    <div className="section-heading"><div><span className="tiny-label">КАЛЕНДАРЬ МОМЕНТОВ</span><h2>{language==='ru'?'Ваши моменты':'Your moments'}</h2></div><span className="calendar-private-badge">🔒</span></div>
    <p className="dates-copy">{language==='ru'?'Отмечайте важные моменты по датам. Видно только вам двоим.':'Track meaningful moments by date. Only you two can see them.'}</p>
    <div className="intimacy-calendar-nav"><button className="icon-button" onClick={()=>setMonth(new Date(y,m-1,1))}>←</button><strong>{month.toLocaleDateString(language==='ru'?'ru-RU':'en-US',{month:'long',year:'numeric'})}</strong><button className="icon-button" onClick={()=>setMonth(new Date(y,m+1,1))}>→</button></div>
    <div className="intimacy-weekdays">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(x=><span key={x}>{language==='ru'?x:['Mo','Tu','We','Th','Fr','Sa','Su'][['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].indexOf(x)]}</span>)}</div>
    <div className="intimacy-grid">{Array.from({length:offset+days},(_,i)=>{if(i<offset)return <span key={`e${i}`}/>;const d=i-offset+1,k=dateKey(d),dayEvents=events.filter(e=>e.date===k),has=dayEvents.length>0;return <button key={k} className={`intimacy-day ${k===selectedDate?'selected':''} ${has?'has-events':''}`} onClick={()=>setSelectedDate(k)}>{d}<i>{[...new Set(dayEvents.map(e=>e.type))].slice(0,4).map(type=><b key={type} className={eventClass[type]}/>)}</i></button>})}</div>
    <div className="intimacy-selected"><span className="tiny-label">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString(language==='ru'?'ru-RU':'en-US',{day:'numeric',month:'long'})}</span><div className="intimacy-tags">{intimacyTypes.map(type=><button key={type} className={selected.some(e=>e.type===type)?'selected':''} onClick={()=>void toggle(type)}>{labels[type]}</button>)}</div><div className="intimacy-legend"><span><i className="event-sex"/>Секс</span><span><i className="event-oral"/>Оральный</span><span><i className="event-orgasm"/>Оргазм</span><span><i className="event-toys"/>Игрушки</span><span><i className="event-date"/>Свидание</span><span><i className="event-kiss"/>Поцелуи</span><span><i className="event-cuddle"/>Объятия</span><span><i className="event-other"/>Другое</span></div></div>
    {loading&&<small className="intimacy-loading">Загрузка…</small>}
  </section>
}

function Achievements({ couple, language, daysTogether, photoCount, wishes, messageCount }: { couple: CoupleSummary; language: Language; daysTogether: number|null; photoCount: number; wishes: Wish[]; messageCount: number }) {
  const [open, setOpen] = useState(() => localStorage.getItem(`${ACHIEVEMENTS_OPEN_KEY_PREFIX}${couple.id}`) === '1')
  useEffect(() => { localStorage.setItem(`${ACHIEVEMENTS_OPEN_KEY_PREFIX}${couple.id}`, open ? '1' : '0') }, [couple.id, open])
  const completedWishes = wishes.filter(wish => wish.status === 'done').length
  const daysInUsly = Math.max(0, Math.floor((Date.now() - new Date(couple.createdAt).getTime()) / 86400000))
  const items=[
    {icon:'♡',title:language==='ru'?'Первый день':'First day',text:language==='ru'?'Вы начали своё «мы».':'You started your Us.',ok:daysTogether!==null},
    {icon:'7',title:language==='ru'?'Неделя вместе':'One week',text:language==='ru'?'7 дней рядом.':'7 days together.',ok:(daysTogether??0)>=7},
    {icon:'30',title:language==='ru'?'Месяц вместе':'One month',text:language==='ru'?'30 дней вашей истории.':'30 days of your story.',ok:(daysTogether??0)>=30},
    {icon:'100',title:language==='ru'?'100 дней':'100 days',text:language==='ru'?'Первая круглая дата.':'A beautiful milestone.',ok:(daysTogether??0)>=100},
    {icon:'♥',title:language==='ru'?'Год вместе':'One year together',text:language==='ru'?'Ваша первая годовщина.':'Your first anniversary.',ok:(daysTogether??0)>=365},
    {icon:'500',title:language==='ru'?'500 дней':'500 days',text:language==='ru'?'Полтысячи дней вашей истории.':'Five hundred days together.',ok:(daysTogether??0)>=500},
    {icon:'730',title:language==='ru'?'2 года':'Two years',text:language==='ru'?'730 дней рядом.':'730 days together.',ok:(daysTogether??0)>=730},
    {icon:'1000',title:language==='ru'?'1000 дней':'1000 days',text:language==='ru'?'Четырёхзначная история.':'A four-digit love story.',ok:(daysTogether??0)>=1000},
    {icon:'💬',title:language==='ru'?'Первое сообщение':'First message',text:language==='ru'?'Ваш разговор в Usly начался.':'Your Usly conversation has started.',ok:messageCount>=1},
    {icon:'10',title:language==='ru'?'10 сообщений':'10 messages',text:language==='ru'?'Первые маленькие разговоры.':'Your first little conversations.',ok:messageCount>=10},
    {icon:'50',title:language==='ru'?'50 сообщений':'50 messages',text:language==='ru'?'Вы всегда находите, что сказать друг другу.':'You always find something to say.',ok:messageCount>=50},
    {icon:'100',title:language==='ru'?'100 сообщений':'100 messages',text:language==='ru'?'Уже целая переписка вашей пары.':'A whole conversation history.',ok:messageCount>=100},
    {icon:'250',title:language==='ru'?'250 сообщений':'250 messages',text:language==='ru'?'Четверть тысячи слов друг другу.':'A quarter-thousand messages together.',ok:messageCount>=250},
    {icon:'500',title:language==='ru'?'500 сообщений':'500 messages',text:language==='ru'?'Ваш чат действительно живёт.':'Your chat is truly alive.',ok:messageCount>=500},
    {icon:'1K',title:language==='ru'?'1000 сообщений':'1,000 messages',text:language==='ru'?'Тысяча маленьких касаний через экран.':'A thousand little touches through the screen.',ok:messageCount>=1000},
    {icon:'▧',title:language==='ru'?'Первый кадр':'First photo',text:language==='ru'?'Первое воспоминание появилось в Usly.':'Your first Usly memory.',ok:photoCount>=1},
    {icon:'▧',title:language==='ru'?'10 кадров':'10 photos',text:language==='ru'?'Вы сохранили 10 воспоминаний.':'You saved 10 memories.',ok:photoCount>=10},
    {icon:'25',title:language==='ru'?'25 кадров':'25 photos',text:language==='ru'?'Целая коллекция ваших моментов.':'A whole collection of moments.',ok:photoCount>=25},
    {icon:'50',title:language==='ru'?'50 кадров':'50 photos',text:language==='ru'?'Пятьдесят общих воспоминаний.':'Fifty shared memories.',ok:photoCount>=50},
    {icon:'100',title:language==='ru'?'100 кадров':'100 photos',text:language==='ru'?'Целая цифровая полка воспоминаний.':'A full shelf of shared memories.',ok:photoCount>=100},
    {icon:'✦',title:language==='ru'?'Первое желание':'First wish',text:language==='ru'?'У вас появился первый общий план.':'Your first shared plan.',ok:wishes.length>=1},
    {icon:'5',title:language==='ru'?'5 желаний':'5 wishes',text:language==='ru'?'Маленький список будущих моментов.':'A small list of future moments.',ok:wishes.length>=5},
    {icon:'✦',title:language==='ru'?'10 желаний':'10 wishes',text:language==='ru'?'Большие и маленькие планы.':'Big and little plans.',ok:wishes.length>=10},
    {icon:'25',title:language==='ru'?'25 желаний':'25 wishes',text:language==='ru'?'Список планов растёт.':'Your shared list keeps growing.',ok:wishes.length>=25},
    {icon:'50',title:language==='ru'?'50 желаний':'50 wishes',text:language==='ru'?'Столько всего хочется попробовать вместе.':'So many things to try together.',ok:wishes.length>=50},
    {icon:'∞',title:language==='ru'?'100 желаний':'100 wishes',text:language==='ru'?'Ваш список мечт уже огромный.':'Your shared wish list is huge.',ok:wishes.length>=100},
    {icon:'✓',title:language==='ru'?'Первое исполненное':'First wish completed',text:language==='ru'?'Вы вместе превратили желание в воспоминание.':'You turned a wish into a memory.',ok:completedWishes>=1},
    {icon:'5✓',title:language==='ru'?'5 желаний исполнено':'5 wishes completed',text:language==='ru'?'Ваши планы не остаются только планами.':'Your plans do not stay just plans.',ok:completedWishes>=5},
    {icon:'10✓',title:language==='ru'?'10 желаний исполнено':'10 wishes completed',text:language==='ru'?'Десять мечт уже стали вашей историей.':'Ten dreams are now part of your story.',ok:completedWishes>=10},
    {icon:'25✓',title:language==='ru'?'25 желаний исполнено':'25 wishes completed',text:language==='ru'?'Вы умеете воплощать задуманное вместе.':'You make things happen together.',ok:completedWishes>=25},
    {icon:'7',title:language==='ru'?'Неделя в Usly':'One week in Usly',text:language==='ru'?'Вашему пространству исполнилась неделя.':'Your space is one week old.',ok:daysInUsly>=7},
    {icon:'30',title:language==='ru'?'Месяц в Usly':'One month in Usly',text:language==='ru'?'Месяц вашей цифровой истории.':'A month of your digital story.',ok:daysInUsly>=30},
    {icon:'♡',title:language==='ru'?'100 дней в Usly':'100 days in Usly',text:language==='ru'?'Вы возвращаетесь сюда уже сто дней.':'You have shared this space for 100 days.',ok:daysInUsly>=100},
    {icon:'♥',title:language==='ru'?'Год в Usly':'One year in Usly',text:language==='ru'?'Usly стал частью вашей истории.':'Usly has been part of your story for a year.',ok:daysInUsly>=365},
  ]
  const unlocked = items.filter(i=>i.ok).length
  const next = items.find(i=>!i.ok)
  return <section className="achievements-card"><div className="section-heading"><div><span className="tiny-label">ДОСТИЖЕНИЯ</span><h2>{language==='ru'?'Ваша история в цифрах':'Your story, unlocked'}</h2></div><div className="achievement-heading-actions"><span className="achievement-count">{unlocked}/{items.length}</span><button className="secondary-button achievement-toggle" onClick={()=>setOpen(v=>!v)}>{open ? (language==='ru'?'Свернуть':'Collapse') : (language==='ru'?'Открыть':'Open')}</button></div></div>{!open && next && <div className="achievement-next"><span>Следующее</span><strong>{next.icon} {next.title}</strong><small>{next.text}</small></div>}{open && <div className="achievement-grid">{items.map((item,i)=><article key={i} className={item.ok?'unlocked':''}><span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.text}</small></div>{item.ok&&<Check size={15}/>}</article>)}</div>}</section>
}


const truthArticles = [
  {
    title:'Как начать сложный разговор так, чтобы партнёр мог вас услышать',
    summary:'Не «ты всегда…», а конкретная ситуация, чувство, потребность и просьба.',
    body:'Начинать разговор лучше с конкретного наблюдения, а не с оценки личности партнёра. Вместо «ты никогда меня не слушаешь» полезнее описать эпизод: «Когда я рассказывал(а) тебе о своём дне, а ты продолжал(а) смотреть в телефон…». Затем назвать своё чувство и то, что за ним стоит: «я почувствовал(а) себя неважным(ой), потому что мне нужна была твоя вовлечённость». Завершить разговор стоит конкретной просьбой, которую партнёру реально выполнить: «можешь в такие моменты отложить телефон на несколько минут?». Такой формат не гарантирует согласия, но делает предмет разговора яснее и снижает вероятность того, что обсуждение сразу превратится в спор о характере друг друга.',
    source:'The Gottman Institute · Softened Startup',
    url:'https://www.gottman.com/blog/softening-startup/',
    tag:'Практика'
  },
  {
    title:'Как вернуться к разговору после ссоры',
    summary:'Пауза полезна, если она заканчивается возвращением к теме, а не исчезновением из разговора.',
    body:'Во время сильного конфликта человек может перестать нормально воспринимать аргументы и перейти в режим защиты. В такой момент полезнее не дожимать разговор, а обозначить паузу и договориться, когда вы к нему вернётесь. Важно различать паузу и молчаливое наказание: «Мне нужно 20–30 минут, чтобы успокоиться. Давай продолжим после этого» — это договорённость; исчезнуть без объяснения — совсем другое. После паузы полезно начать с того, что вы поняли из позиции партнёра, а затем обсудить, что можно изменить. В исследованиях и практических моделях восстановления после конфликта особое место занимают небольшие «repair attempts» — действия, которые снижают напряжение и возвращают разговор в конструктивное русло.',
    source:'The Gottman Institute · Repair Attempts',
    url:'https://www.gottman.com/blog/make-repair-attempts-partner-feels-loved/',
    tag:'Примирение'
  },
  {
    title:'Почему важно чувствовать, что тебя поняли',
    summary:'Для конфликта важен не только исход спора, но и ощущение: «мой человек действительно понял мою точку зрения».',
    body:'Исследование, включившее семь исследований, показало, что конфликт особенно сильно связан со снижением удовлетворённости отношениями тогда, когда люди воспринимают партнёра как недостаточно понимающего их мысли, чувства и точку зрения. Это не означает, что во всём нужно соглашаться. «Я понимаю, почему ты так это видишь» и «я согласен(на) с тобой» — разные вещи. В комнате правды можно поэтому сначала фиксировать, что каждый услышал из слов другого, и только после этого переходить к решению.',
    source:'Journal of Personality and Social Psychology · PubMed',
    url:'https://pubmed.ncbi.nlm.nih.gov/26523997/',
    tag:'Исследование'
  },
  {
    title:'Как говорить о том, что вам не нравится',
    summary:'Критику личности лучше заменять конкретной жалобой на поведение и ясной просьбой.',
    body:'Есть большая разница между «ты эгоист» и «мне тяжело, когда наши планы меняются в последний момент без обсуждения». В первом случае атакуется личность; во втором обсуждается наблюдаемое поведение и его влияние. Такая конкретика оставляет партнёру пространство для ответа и изменения. Исследования коммуникации пар также показывают, что негативные взаимодействия и уход от конфликта связаны с худшими показателями качества отношений, поэтому задача разговора — не победить, а сделать проблему обсуждаемой.',
    source:'The Gottman Institute · Four Horsemen + PubMed',
    url:'https://www.gottman.com/blog/the-four-horsemen-recognizing-criticism-contempt-defensiveness-and-stonewalling-/',
    tag:'Коммуникация'
  },
  {
    title:'Почему «я просто замолчу» не всегда помогает',
    summary:'Отстранение во время конфликта может временно снизить накал, но хронический уход от разговора связан с худшими исходами.',
    body:'Иногда остановить спор действительно необходимо. Но если один партнёр постоянно требует обсуждения, а второй постоянно закрывается и избегает контакта, возникает паттерн demand–withdraw. В исследовании пар, обсуждавших сексуальные конфликты, более выраженный такой паттерн был связан с более низкой удовлетворённостью отношениями и сексуальной удовлетворённостью и с большей выраженностью сексуального дистресса. Практический вывод для пары простой: если сейчас невозможно говорить спокойно, договоритесь о времени возвращения к разговору вместо бесконечного избегания.',
    source:'Journal of Sex Research · PubMed',
    url:'https://pubmed.ncbi.nlm.nih.gov/39115370/',
    tag:'Конфликт'
  },
  {
    title:'Разговоры о близости тоже требуют навыка',
    summary:'О сексуальных желаниях, границах и неудовлетворённости полезно говорить так же конкретно и бережно, как о других важных темах.',
    body:'Наблюдательные исследования показывают, что качество общения связано с благополучием отношений и в сексуальных, и в несексуальных обсуждениях. В отдельном исследовании 126 молодых пар качество поведения во время сексуальных и обычных конфликтных разговоров изучалось отдельно, потому что сексуальные темы могут иметь собственную эмоциональную нагрузку. Поэтому полезно обсуждать не только «что я хочу», но и «что для меня комфортно», «что мне не подходит» и «что поможет мне чувствовать себя безопасно». Согласие и возможность в любой момент изменить решение должны оставаться базой любого разговора о близости.',
    source:'Journal of Sexual Medicine / PubMed',
    url:'https://pubmed.ncbi.nlm.nih.gov/35119568/',
    tag:'Близость'
  },
]


function TruthRoom({ couple, language }: { couple: CoupleSummary; language: Language }) {
  const [topics,setTopics]=useState<TruthTopic[]>([])
  const [replies,setReplies]=useState<TruthReply[]>([])
  const [category,setCategory]=useState<TruthCategory>('concern')
  const [truthTab,setTruthTab]=useState<'threads'|'reading'>('threads')
  const [selectedArticle,setSelectedArticle]=useState<number|null>(null)
  const [title,setTitle]=useState('')
  const [body,setBody]=useState('')
  const [feeling,setFeeling]=useState('')
  const [request,setRequest]=useState('')
  const [replyDrafts,setReplyDrafts]=useState<Record<string,string>>({})
  const [openTopic,setOpenTopic]=useState<string|null>(null)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')

  const copy = language==='ru' ? {
    label:'КОМНАТА ПРАВДЫ', title:'Поговорить честно, но бережно', intro:'Место для вещей, которые хочется не замалчивать: что беспокоит, чего не хватает и что вы хотите улучшить вместе.',
    guide:'Говорите от первого лица: наблюдение → чувство → потребность → конкретная просьба. Не ищите виноватого и не пытайтесь решить всё за один разговор.',
    concern:'Меня что-то беспокоит', change:'Хочу изменить', add:'Хочу добавить в наши отношения', appreciation:'Хочу сказать спасибо', important:'Нам важно обсудить',
    addAction:'Начать разговор',
    titlePlaceholder:'О чём хочется поговорить?', bodyPlaceholder:'Опиши ситуацию без обвинений: что произошло и почему это для тебя важно…', feelingPlaceholder:'Что я чувствую?', requestPlaceholder:'Чего мне хотелось бы от нас?', topics:'Наши разговоры', empty:'Пока нет тем. Иногда первый честный разговор — уже хороший шаг.', reply:'Ответить', replyPlaceholder:'Что ты услышал(а) и что хочешь сказать в ответ?', open:'Открыто', discussing:'Обсуждаем', agreed:'Договорились', done:'Закрыто', save:'Сохранить', note:'Это инструмент для общения, а не замена психологической помощи. Если в отношениях есть страх, угрозы или насилие, приоритет — безопасность и помощь специалиста.'
  } : {
    label:'ROOM OF TRUTH', title:'Talk honestly, but gently', intro:'A space for the things you do not want to leave unspoken: what hurts, what is missing, and what you want to improve together.',
    guide:'Speak in first person: observation → feeling → need → concrete request. Do not look for a culprit or try to solve everything in one conversation.',
    concern:'Something is bothering me', change:'I want to change', add:'I want to add to our relationship', appreciation:'I want to appreciate you', important:'We need to discuss this',
    addAction:'Start the conversation',
    titlePlaceholder:'What do you want to talk about?', bodyPlaceholder:'Describe the situation without blame: what happened and why it matters to you…', feelingPlaceholder:'What am I feeling?', requestPlaceholder:'What would I like from us?', topics:'Our conversations', empty:'No topics yet. Sometimes the first honest conversation is already a good step.', reply:'Reply', replyPlaceholder:'What did you hear, and what do you want to say back?', open:'Open', discussing:'Discussing', agreed:'Agreed', done:'Closed', save:'Save', note:'This is a relationship-education tool, not a substitute for therapy. If there is fear, coercion, threats or violence, prioritize safety and professional support.'
  }
  const load=async()=>{const [t,r]=await Promise.all([getTruthTopics(couple.id),getTruthReplies(couple.id)]);if(t.ok)setTopics(t.topics);else setError(t.error??'');if(r.ok)setReplies(r.replies)}
  useEffect(()=>{void load();if(!supabase)return;const ch=supabase.channel(`truth-room-${couple.id}`).on('postgres_changes',{event:'*',schema:'public',table:'couple_truth_topics',filter:`couple_id=eq.${couple.id}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'couple_truth_replies',filter:`couple_id=eq.${couple.id}`},()=>void load()).subscribe();return()=>{void supabase?.removeChannel(ch)}},[couple.id])
  const addTopic=async()=>{if(!title.trim()||!body.trim())return;setSaving(true);setError('');const r=await createTruthTopic(couple.id,category,title,body,feeling,request);if(r.ok){setTitle('');setBody('');setFeeling('');setRequest('');setCategory('concern');await load()}else setError(r.error??'');setSaving(false)}
  const addReply=async(topicId:string)=>{const text=(replyDrafts[topicId]??'').trim();if(!text)return;setSaving(true);const r=await createTruthReply(topicId,text);if(r.ok){setReplyDrafts(d=>({...d,[topicId]:''}));await load()}else setError(r.error??'');setSaving(false)}
  const statusLabel=(s:TruthStatus)=>({open:copy.open,discussing:copy.discussing,agreed:copy.agreed,done:copy.done}[s])
  const categoryLabel=(c:TruthCategory)=>({concern:copy.concern,change:copy.change,add:copy.add,appreciation:copy.appreciation,important:copy.important}[c])
  return <section className="truth-room-card">
    <div className="section-heading truth-room-heading"><div><span className="tiny-label">{copy.label}</span><h2>{copy.title}</h2></div><span className="truth-room-mark">♡</span></div>
    <p className="truth-room-intro">{copy.intro}</p>
    <div className="truth-room-guide"><strong>1 · 2 · 3 · 4</strong><span>{copy.guide}</span></div>
    <div className="truth-room-tabs"><button className={truthTab==='threads'?'active':''} onClick={()=>setTruthTab('threads')}>{language==='ru'?'Наши разговоры':'Our conversations'} <b>{topics.length}</b></button><button className={truthTab==='reading'?'active':''} onClick={()=>setTruthTab('reading')}>{language==='ru'?'Литература для отношений':'Relationship reading'} <b>{truthArticles.length}</b></button></div>
    {truthTab==='reading' ? <div className="truth-reading"><div className="truth-articles-head"><div><span className="tiny-label">ПСИХОЛОГИЯ ОТНОШЕНИЙ</span><h3>{language==='ru'?'Короткие материалы прямо внутри Usly':'Short reading inside Usly'}</h3></div><span>✦</span></div>{selectedArticle===null ? <div className="truth-articles-grid">{truthArticles.map((a,i)=><button key={a.url} className="truth-article-card" onClick={()=>setSelectedArticle(i)}><span>{a.tag}</span><strong>{a.title}</strong><p>{a.summary}</p><small>{a.source}</small></button>)}</div> : <article className="truth-article-reader"><button className="secondary-button truth-reader-back" onClick={()=>setSelectedArticle(null)}>← {language==='ru'?'Все материалы':'All materials'}</button><span>{truthArticles[selectedArticle].tag}</span><h3>{truthArticles[selectedArticle].title}</h3><p className="truth-reader-summary">{truthArticles[selectedArticle].summary}</p><div className="truth-reader-body">{truthArticles[selectedArticle].body}</div><small className="truth-reader-source">Основа материала: {truthArticles[selectedArticle].source}</small></article>}</div> : <>
    <div className="truth-room-form">
      <div className="truth-room-categories">{(['concern','change','add','appreciation','important'] as TruthCategory[]).map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{categoryLabel(c)}</button>)}</div>
      <input value={title} onChange={e=>setTitle(e.target.value.slice(0,100))} placeholder={copy.titlePlaceholder}/>
      <textarea value={body} onChange={e=>setBody(e.target.value.slice(0,1200))} placeholder={copy.bodyPlaceholder} rows={4}/>
      <div className="truth-room-two-fields"><input value={feeling} onChange={e=>setFeeling(e.target.value.slice(0,300))} placeholder={copy.feelingPlaceholder}/><input value={request} onChange={e=>setRequest(e.target.value.slice(0,500))} placeholder={copy.requestPlaceholder}/></div>
      <button className="primary-button" disabled={saving||!title.trim()||!body.trim()} onClick={()=>void addTopic()}><Heart size={15}/>{copy.addAction}</button>
    </div>
    {error&&<div className="notice">{error}</div>}
    <div className="truth-room-list"><div className="truth-room-list-head"><span className="tiny-label">{copy.topics}</span><b>{topics.length}</b></div>
      {!topics.length?<div className="truth-room-empty">{copy.empty}</div>:topics.map(topic=>{const topicReplies=replies.filter(r=>r.topicId===topic.id);const open=openTopic===topic.id;return <article className={`truth-topic ${open?'open':''}`} key={topic.id}>
        <button className="truth-topic-head" onClick={()=>setOpenTopic(open?null:topic.id)}><div><span className="truth-topic-category">{categoryLabel(topic.category)}</span><strong>{topic.title}</strong><small>{new Date(topic.updatedAt).toLocaleDateString(language==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short'})}</small></div><div className="truth-topic-meta"><span className={`truth-status status-${topic.status}`}>{statusLabel(topic.status)}</span><span>{open?'⌃':'⌄'}</span></div></button>
        {open&&<div className="truth-topic-body"><p>{topic.body}</p>{topic.feeling&&<div className="truth-detail"><span>Чувство</span><strong>{topic.feeling}</strong></div>}{topic.request&&<div className="truth-detail"><span>Просьба</span><strong>{topic.request}</strong></div>}
          <div className="truth-status-actions">{(['open','discussing','agreed','done'] as TruthStatus[]).map(s=><button key={s} className={topic.status===s?'active':''} onClick={()=>void updateTruthStatus(topic.id,s).then(load)}>{statusLabel(s)}</button>)}</div>
          <div className="truth-replies">{topicReplies.map(r=><div className="truth-reply" key={r.id}><small>{new Date(r.createdAt).toLocaleTimeString(language==='ru'?'ru-RU':'en-US',{hour:'2-digit',minute:'2-digit'})}</small><p>{r.body}</p></div>)}</div>
          <div className="truth-reply-form"><textarea value={replyDrafts[topic.id]??''} onChange={e=>setReplyDrafts(d=>({...d,[topic.id]:e.target.value.slice(0,1200)}))} placeholder={copy.replyPlaceholder} rows={3}/><button className="secondary-button" disabled={saving||!(replyDrafts[topic.id]??'').trim()} onClick={()=>void addReply(topic.id)}>{copy.reply}</button></div>
        </div>}
      </article>})}
    </div>
    </>}
    <small className="truth-room-note">{copy.note}</small>
  </section>
}

function RoomPasswordGate({ couple, language, room, title, description, ageGate = false, onUnlocked }: { couple: CoupleSummary; language: Language; room: RoomPasswordKind; title: string; description: string; ageGate?: boolean; onUnlocked: () => void }) {
  const [exists,setExists]=useState<boolean|null>(null)
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [agePreviouslyConfirmed]=useState(()=>ageGate&&hasConfirmedSecretAge(couple.id))
  const [ageOk,setAgeOk]=useState(()=>!ageGate||agePreviouslyConfirmed)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [setup,setSetup]=useState(false)
  useEffect(()=>{void roomPasswordExists(couple.id,room).then(r=>{setExists(r.exists);setError(r.error??'')})},[couple.id,room])
  const submit=async()=>{
    setError(''); setBusy(true)
    if(ageGate&&!ageOk){setError(language==='ru'?'Подтверди, что тебе есть 18 лет.':'Please confirm you are 18 or older.');setBusy(false);return}
    if(setup||exists===false){if(password.length<4){setError(language==='ru'?'Пароль должен быть не короче 4 символов.':'Password must be at least 4 characters.');setBusy(false);return}if(password!==confirm){setError(language==='ru'?'Пароли не совпадают.':'Passwords do not match.');setBusy(false);return}const r=await setRoomPassword(couple.id,room,password);if(!r.ok){setError(r.error==='PASSWORD_TOO_SHORT'?'Пароль слишком короткий':r.error??'Не удалось сохранить пароль.');setBusy(false);return}setExists(true);onUnlocked()}else{const r=await verifyRoomPassword(couple.id,room,password);if(!r.ok||!r.valid){setError(language==='ru'?'Неверный пароль.':'Wrong password.');setBusy(false);return}onUnlocked()}
    setBusy(false)
  }
  if(exists===null) return <div className="room-password-gate"><div className="room-password-card"><span className="eyebrow">USLY</span><h2>{title}</h2><p>Загружаем доступ…</p></div></div>
  const firstSetup=exists===false||setup
  return <div className="room-password-gate"><div className="room-password-card"><div className="room-password-icon">{room==='secret'?'18+':'♡'}</div><span className="eyebrow">{room==='secret'?'PRIVATE ROOM':'ROOM OF TRUTH'}</span><h2>{firstSetup?(language==='ru'?'Придумайте пароль':'Create a password'):title}</h2><p>{firstSetup?(language==='ru'?'Пароль общий для вас двоих. Он добавляет отдельный уровень доступа к комнате.':'The password is shared by both of you and adds another access layer.'):description}</p>{ageGate&&!agePreviouslyConfirmed&&<label className="room-password-age"><input type="checkbox" checked={ageOk} onChange={e=>{const checked=e.target.checked;setAgeOk(checked);if(checked)rememberSecretAgeConfirmation(couple.id)}}/><span>{language==='ru'?'Мне есть 18 лет и я осознанно открываю эту комнату.':'I am 18+ and understand what I am opening.'}</span></label>}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={firstSetup?'Минимум 4 символа':'Введите пароль'} autoComplete="new-password"/><>{firstSetup&&<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Повторите пароль" autoComplete="new-password"/>}</><button className="primary-button wide" disabled={busy||!password.trim()} onClick={()=>void submit()}>{busy?'…':firstSetup?(language==='ru'?'Создать и войти':'Create & enter'):(language==='ru'?'Войти':'Enter')} <ArrowRight size={16}/></button>{error&&<div className="notice">{error}</div>}{exists&&<button className="text-button" onClick={()=>{setSetup(true);setPassword('');setConfirm('');setError('')}}>{language==='ru'?'Изменить пароль':'Change password'}</button>}</div></div>
}

function TruthRoomPage({ couple, language, onBack }: { couple: CoupleSummary; language: Language; onBack: () => void }) {
  const [unlocked,setUnlocked]=useState(false)
  return <section className="truth-room-page"><div className="section-back"><button className="back" onClick={onBack}>← {language==='ru'?'Мы':'Us'}</button></div>{!unlocked?<RoomPasswordGate couple={couple} language={language} room="truth" title={language==='ru'?'Комната правды':'Room of Truth'} description={language==='ru'?'Пространство для честных разговоров без обвинений и спешки.':'A space for honest conversations without blame or pressure.'} onUnlocked={()=>setUnlocked(true)}/>:<><div className="truth-room-page-head"><div className="eyebrow">♡ {language==='ru'?'ОТДЕЛЬНАЯ КОМНАТА':'SEPARATE ROOM'}</div><h1>{language==='ru'?'Комната правды':'Room of Truth'}</h1><p>{language==='ru'?'Пространство для честных разговоров без обвинений и спешки.':'A space for honest conversations without blame or pressure.'}</p></div><TruthRoom couple={couple} language={language} /></>}</section>
}

function GiftWishlist({ couple, language, theme }: { couple: CoupleSummary; language: Language; theme: 'core' | 'rush' | 'nocturne' | 'mono' | 'custom' }) {
  const [tab,setTab]=useState<'wishes'|'gifts'>('wishes')
  const [wishStatusTab,setWishStatusTab]=useState<'active'|'completed'|'declined'>('active')
  const [wishes,setWishes]=useState<Wish[]>([])
  const [secretWishes,setSecretWishes]=useState<SecretSentDesire[]>([])
  const [giftWishes,setGiftWishes]=useState<GiftWish[]>([])
  const [title,setTitle]=useState(''),[note,setNote]=useState(''),[giftTitle,setGiftTitle]=useState(''),[url,setUrl]=useState(''),[giftNote,setGiftNote]=useState('')
  const [saving,setSaving]=useState(false),[error,setError]=useState(''),[myId,setMyId]=useState<string|null>(null)
  const load=async()=>{
    const [w,s,g,u]=await Promise.all([getWishes(couple.id),getSecretDesiresInbox(couple.id),getGiftWishes(couple.id),getMyUserId()])
    if(w.ok)setWishes(w.wishes);else setError(w.error??'')
    if(s.ok)setSecretWishes(s.desires);else setError(s.error??'')
    if(g.ok)setGiftWishes(g.wishes);else setError(g.error??'')
    setMyId(u)
  }
  useEffect(()=>{void load();if(!supabase)return;const ch=supabase.channel(`shared-wishes-${couple.id}`).on('postgres_changes',{event:'*',schema:'public',table:'couple_wishes',filter:`couple_id=eq.${couple.id}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'secret_sent_desires',filter:`couple_id=eq.${couple.id}`},()=>void load()).on('postgres_changes',{event:'*',schema:'public',table:'gift_wishes',filter:`couple_id=eq.${couple.id}`},()=>void load()).subscribe();return()=>{void supabase?.removeChannel(ch)}},[couple.id])
  const addWish=async()=>{if(!title.trim())return;setSaving(true);setError('');const r=await createWish(couple.id,title,note);if(r.ok){setTitle('');setNote('');await load()}else setError(r.error??'Не удалось сохранить желание.');setSaving(false)}
  const addGift=async()=>{if(!giftTitle.trim())return;setSaving(true);setError('');const r=await createGiftWish(couple.id,giftTitle,url,giftNote);if(r.ok){setGiftTitle('');setUrl('');setGiftNote('');await load()}else setError(r.error??'Не удалось сохранить виш-лист.');setSaving(false)}
  const actWish=async(w:Wish,action:'join'|'done')=>{setSaving(true);const r=action==='join'?await joinWish(w.id):await completeWish(w.id);if(!r.ok)setError(r.error??'Не удалось обновить желание.');else await load();setSaving(false)}
  const removeWish=async(id:string)=>{setSaving(true);const r=await deleteWish(id);if(!r.ok)setError(r.error??'Не удалось удалить желание.');else await load();setSaving(false)}
  const removeSecretWish=async(id:string)=>{setSaving(true);const r=await deleteSecretDesire(id);if(!r.ok)setError(r.error??'Не удалось удалить желание.');else await load();setSaving(false)}
  const actSecret=async(id:string,status:'accepted'|'declined'|'completed')=>{setSaving(true);const r=await updateSecretDesireStatus(id,status);if(!r.ok)setError(r.error??'Не удалось обновить желание.');else await load();setSaving(false)}
  const open=wishes.filter(w=>w.status==='open'),done=wishes.filter(w=>w.status==='done')
  const secretActive=secretWishes.filter(d=>d.status==='pending'||d.status==='accepted'),secretDone=secretWishes.filter(d=>d.status==='completed'),secretDeclined=secretWishes.filter(d=>d.status==='declined')
  return <section className="gift-wishlist-card shared-wishes-hub" data-us-theme={theme}>
    <div className="section-heading"><div><span className="tiny-label">ЖЕЛАНИЯ</span><h2>{language==='ru'?'Ваши желания':'Your wishes'}</h2></div><span>♡</span></div>
    <p className="dates-copy">{language==='ru'?'Здесь собраны обычные желания пары, желания из секретной комнаты и отдельный виш-лист подарков.':'Shared wishes, private-room wishes and a separate gift wishlist in one place.'}</p>
    <div className="shared-wishes-tabs"><button className={tab==='wishes'?'active':''} onClick={()=>setTab('wishes')}>♡ {language==='ru'?'Список желаний':'Wish list'}</button><button className={tab==='gifts'?'active':''} onClick={()=>setTab('gifts')}>🎁 {language==='ru'?'Виш-лист':'Gift wishlist'}</button></div>
    {error&&<div className="notice">{error}</div>}
    {tab==='wishes'?<>
      <div className="gift-form shared-wish-form"><input value={title} onChange={e=>setTitle(e.target.value.slice(0,100))} placeholder={language==='ru'?'Например: съездить к морю 🌊':'For example: go to the sea 🌊'}/><textarea value={note} onChange={e=>setNote(e.target.value.slice(0,300))} placeholder={language==='ru'?'Маленькая деталь — необязательно':'A little detail — optional'} rows={2}/><button className="primary-button" disabled={saving||!title.trim()} onClick={()=>void addWish()}><Plus size={15}/> {language==='ru'?'Добавить желание':'Add wish'}</button></div>
      <div className="wish-status-tabs">
        {([
          ['active', language==='ru'?'Активные':'Active', open.length+secretActive.length],
          ['completed', language==='ru'?'Выполненные':'Completed', done.length+secretDone.length],
          ['declined', language==='ru'?'Отказы':'Declined', secretDeclined.length],
        ] as const).map(([id,label,count])=><button key={id} className={wishStatusTab===id?'active':''} onClick={()=>setWishStatusTab(id)}><span>{label}</span><b>{count}</b></button>)}
      </div>
      {wishStatusTab==='active'&&<div className="wishes-list">
        {!open.length&&!secretActive.length&&<div className="wish-empty"><span>♡</span><strong>{language==='ru'?'Пока пусто':'Nothing here yet'}</strong><p>{language==='ru'?'Добавьте желание или отправьте его из секретной комнаты.':'Add a wish or send one from the private room.'}</p></div>}
        {open.map(w=>{const mine=w.createdBy===myId,joined=!!w.joinedBy;return <article className="wish-card" key={`wish-${w.id}`}><div className="wish-card-mark">{joined?'♥':'♡'}</div><div className="wish-card-body"><div className="wish-card-top"><span>{mine?'ТВОЁ ЖЕЛАНИЕ':'ЖЕЛАНИЕ ПАРТНЁРА'}</span><time>{new Date(w.createdAt).toLocaleDateString(language==='ru'?'ru-RU':'en-US')}</time></div><h3>{w.title}</h3>{w.note&&<p>{w.note}</p>}<div className="wish-card-actions">{!mine&&!joined&&<button className="secondary-button" onClick={()=>void actWish(w,'join')}><Heart size={14}/> Хочу тоже</button>}{joined&&<span className="wish-joined"><Heart size={13} fill="currentColor"/> Хотите оба</span>}{mine&&!joined&&<span className="wish-waiting">Ждём партнёра</span>}{joined&&<button className="primary-button" disabled={saving} onClick={()=>void actWish(w,'done')}><CircleCheck size={14}/> Сделано</button>}<button className="icon-button wish-delete" disabled={saving} onClick={()=>void removeWish(w.id)} title="Удалить"><Trash2 size={14}/></button></div></div></article>})}
        {secretActive.map(d=>{
          const incoming=d.toUser===myId
          return <article className={`wish-card secret-shared-wish status-${d.status}`} key={`secret-${d.id}`}><div className="wish-card-mark">{d.status==='accepted'?'♥':'✦'}</div><div className="wish-card-body"><div className="wish-card-top"><span>18+ · {d.categoryName}</span><time>{new Date(d.createdAt).toLocaleDateString(language==='ru'?'ru-RU':'en-US')}</time></div><h3>{d.optionTitle}</h3>{d.note&&<p>{d.note}</p>}<div className="wish-card-actions">{incoming&&d.status==='pending' ? <><button className="primary-button" disabled={saving} onClick={()=>void actSecret(d.id,'accepted')}>♥ Хочу</button><button className="secondary-button" disabled={saving} onClick={()=>void actSecret(d.id,'declined')}>✕ Не хочу</button></> : d.status==='pending' ? <span className="wish-waiting">Ждём ответа партнёра</span> : <><span className="wish-joined">Желание принято</span><button className="primary-button" disabled={saving} onClick={()=>void actSecret(d.id,'completed')}><CircleCheck size={14}/> Выполнено</button></>}<button className="icon-button wish-delete" disabled={saving} onClick={()=>void removeSecretWish(d.id)} title="Удалить"><Trash2 size={14}/></button></div></div></article>
        })}
      </div>}
      {wishStatusTab==='completed'&&<div className="wishes-list wishes-done-list">
        {!done.length&&!secretDone.length&&<div className="wish-empty"><span>✓</span><strong>{language==='ru'?'Пока ничего не выполнено':'Nothing completed yet'}</strong><p>{language==='ru'?'Здесь появятся желания, которые вы исполнили вместе.':'Completed wishes will appear here.'}</p></div>}
        {done.map(w=><article className="wish-card wish-card-done" key={`done-${w.id}`}><div className="wish-card-mark">✓</div><div className="wish-card-body"><div className="wish-card-top"><span>ВАША ИСТОРИЯ</span><button className="icon-button wish-delete" disabled={saving} onClick={()=>void removeWish(w.id)} title="Удалить"><Trash2 size={14}/></button></div><h3>{w.title}</h3>{w.note&&<p>{w.note}</p>}</div></article>)}
        {secretDone.map(d=><article className="wish-card wish-card-done" key={`done-secret-${d.id}`}><div className="wish-card-mark">✓</div><div className="wish-card-body"><div className="wish-card-top"><span>18+ · {d.categoryName}</span><button className="icon-button wish-delete" disabled={saving} onClick={()=>void removeSecretWish(d.id)} title="Удалить"><Trash2 size={14}/></button></div><h3>{d.optionTitle}</h3>{d.note&&<p>{d.note}</p>}</div></article>)}
      </div>}
      {wishStatusTab==='declined'&&<div className="wishes-list">
        {!secretDeclined.length&&<div className="wish-empty"><span>×</span><strong>{language==='ru'?'Отказов нет':'No declined wishes'}</strong><p>{language==='ru'?'Здесь появятся желания, от которых партнёр отказался.':'Declined private wishes will appear here.'}</p></div>}
        {secretDeclined.map(d=><article className="wish-card wish-card-declined" key={`declined-${d.id}`}><div className="wish-card-mark">×</div><div className="wish-card-body"><div className="wish-card-top"><span>18+ · {d.categoryName}</span><button className="icon-button wish-delete" disabled={saving} onClick={()=>void removeSecretWish(d.id)} title="Удалить"><Trash2 size={14}/></button></div><h3>{d.optionTitle}</h3>{d.note&&<p>{d.note}</p>}</div></article>)}
      </div>}
    </>:<>
      <div className="gift-form"><input value={giftTitle} onChange={e=>setGiftTitle(e.target.value.slice(0,120))} placeholder={language==='ru'?'Например: наушники':'For example: headphones'}/><input value={url} onChange={e=>setUrl(e.target.value.slice(0,1000))} placeholder="https://ozon.ru/..."/><textarea value={giftNote} onChange={e=>setGiftNote(e.target.value.slice(0,300))} placeholder={language==='ru'?'Размер, цвет или маленькая подсказка…':'Size, color or a little hint…'} rows={2}/><button className="primary-button" disabled={saving||!giftTitle.trim()} onClick={()=>void addGift()}><Plus size={15}/> {language==='ru'?'Добавить в виш-лист':'Add to wishlist'}</button></div>
      <div className="gift-list">{!giftWishes.length?<div className="gift-empty">{language==='ru'?'Пока пусто — можно начать с маленькой мечты.':'Nothing here yet.'}</div>:giftWishes.map(w=><article key={w.id} className={w.done?'done':''}><div className="gift-mark">{w.done?'✓':'♡'}</div><div><strong>{w.title}</strong>{w.note&&<p>{w.note}</p>}{w.url&&<a href={w.url} target="_blank" rel="noreferrer">Открыть ссылку ↗</a>}</div><div className="gift-actions"><button className="icon-button" onClick={()=>void toggleGiftWish(w.id).then(load)}>{w.done?'↩':'✓'}</button><button className="icon-button" onClick={()=>void deleteGiftWish(w.id).then(load)}><Trash2 size={14}/></button></div></article>)}</div>
    </>}
  </section>
}

const dateIdeas=['Устроить завтрак в незнакомом месте','Взять кофе и пойти гулять без маршрута','Приготовить ужин вместе с закрытыми телефонами','Выбрать друг другу маленький подарок до 500 ₽','Сходить в место, где вы ещё никогда не были','Сделать фотопрогулку и выбрать лучший кадр','Устроить домашний кинотеатр с рандомным фильмом','Написать друг другу по пять причин, за что вы благодарны','Встретить закат с пледом и музыкой','Сыграть в настолку или придумать свою игру','Устроить вечер воспоминаний: старые фото, музыка и истории','Поехать на одну остановку дальше и исследовать район','Собрать плейлист друг для друга','Сходить в книжный и выбрать книгу друг другу','Приготовить блюдо из страны, где вы не были','Устроить вечер без телефонов на два часа','Найти красивое место в городе и сделать там фото','Выбрать случайную остановку и исследовать район','Сходить вместе на выставку или в музей','Устроить мини-пикник дома на полу','Написать друг другу открытки и спрятать их','Посмотреть первый фильм, который смотрели вместе','Устроить вечер настольных или карточных игр','Составить список из 10 мест, куда хотите сходить','Пойти гулять и по очереди выбирать направление','Устроить дегустацию сладостей вслепую','Сходить на вечернюю прогулку под одну общую песню','Приготовить друг другу завтрак по очереди','Выбрать тему и сделать друг другу маленькие подарки своими руками','Запланировать мини-путешествие на один день','Устроить свидание по цвету: выбрать цвет и построить вокруг него весь вечер','Сходить в кофейню и придумать друг другу смешные имена в заказе','Собрать капсулу воспоминаний и открыть её через год','Устроить домашний спа-вечер с музыкой и масками','Выбрать случайный рецепт и приготовить его вместе','Пойти на прогулку и купить друг другу что-то на 300 ₽','Сделать друг другу тайные комплименты на стикерах','Устроить вечер «давай попробуем»: каждый предлагает по одной новой вещи','Сходить на утреннюю прогулку до того, как проснётся город','Сделать карту ваших любимых мест в городе','Устроить вечер любимых песен и рассказывать, почему каждая важна','Выбрать фильм по обложке, не читая описание','Сходить вместе на мастер-класс','Сделать друг другу завтрак в постель','Поменяться ролями и приготовить друг другу сюрприз-вечер','Устроить вечер настольных вопросов без телефонов','Найти место с красивым видом и встретить там рассвет','Составить список из 20 маленьких радостей и выбрать одну прямо сегодня','Устроить фотоквест из пяти заданий по городу']
const closenessQuestions=['Что во мне тебе особенно нравится в последнее время?','Какой наш момент ты бы хотел повторить?','Что помогает тебе чувствовать себя любимым?','Какой маленький ритуал ты хотел бы завести для нас?','Что ты давно хотел попробовать вместе?','Как ты понимаешь, что рядом со мной тебе спокойно?','Какой подарок от меня запомнился тебе сильнее всего?','Какой день из нашей истории ты вспоминаешь чаще всего?','Что я делаю, что заставляет тебя улыбаться?','Куда ты хотел бы съездить со мной на выходные?','О чём тебе хочется говорить со мной чаще?','Что нам стоит делать только вдвоём, без телефонов?','Какая моя привычка кажется тебе милой?','Какой комплимент от меня тебе хочется слышать чаще?','Что бы ты хотел изменить в наших обычных выходных?','Какой наш разговор ты вспоминаешь с улыбкой?','В какой момент рядом со мной ты чувствуешь себя особенно собой?','Что ты хочешь, чтобы мы обязательно попробовали в этом году?','Какая песня сейчас лучше всего описывает нас?','Какой совместный навык тебе было бы интересно освоить?','Что тебе проще показать делом, чем сказать словами?','Какой наш маленький момент хочется сохранить навсегда?','Что помогает тебе быстрее мириться после ссоры?','Какой идеальный вечер вдвоём выглядит для тебя?','Что ты хочешь чаще получать от меня: внимание, слова, объятия или время?','Какой город ты хотел бы однажды исследовать со мной?','Какой семейной или личной традицией ты хотел бы поделиться со мной?','Что во мне изменилось к лучшему с тех пор, как мы вместе?','Какую нашу дату ты особенно ждёшь?','Какой вопрос тебе давно хотелось мне задать?','Какая моя поддержка запомнилась тебе сильнее всего?','Что в наших отношениях стало для тебя домом?','Какой наш обычный день тебе почему-то особенно дорог?','Как ты любишь получать заботу, когда устал?','Что ты хочешь, чтобы я чаще замечал(а) в тебе?','Какая наша шутка никогда не надоест?','Что бы ты хотел сохранить в наших отношениях через десять лет?','Какой мой поступок заставил тебя почувствовать себя важным человеком?','Какая мечта у тебя есть, о которой мы ещё мало говорили?','Что нам стоит начать делать каждую неделю?','Какой наш конфликт в итоге чему-то нас научил?','Что тебе нравится в том, как мы проводим время вдвоём?','Какой комплимент от меня ты запомнил надолго?','Что для тебя значит «быть командой»?','Какой новый общий ритуал тебе хотелось бы попробовать?','В какой поездке со мной тебе было бы интересно оказаться прямо сейчас?','Какой маленький знак внимания делает твой день лучше?','Что ты хотел бы однажды сделать вместе впервые?','Какой момент наших отношений ты показал бы кому-то как пример нашей пары?','Когда ты в последний раз чувствовал(а), что я тебя действительно услышал(а)?','Какая моя черта помогает тебе становиться лучше?','Что нам помогает не отдаляться, даже когда много дел?','Какой идеальный выходной ты бы подарил нам обоим?','Что ты хочешь попробовать в наших совместных путешествиях?','Какой наш общий проект тебе было бы интересно сделать?','Что тебе хочется услышать от меня сегодня?','Какой период наших отношений ты вспоминаешь с особым теплом?','Что в нас как в паре тебе кажется самым сильным?','Какую маленькую традицию из детства ты хотел бы принести в нашу жизнь?']
const extraDateIdeas=[
  'Устроить свидание по первой букве ваших имён',
  'Выбрать друг другу по одному блюду в магазине и приготовить их вместе',
  'Сделать прогулку без телефонов и сфотографировать только глазами',
  'Устроить вечер «наша музыка»: по одной песне по очереди',
  'Сходить в новое место и поставить ему оценку от 1 до 10',
  'Сыграть в «20 вопросов» во время прогулки',
  'Купить ингредиенты на случайный бюджет и придумать ужин',
  'Устроить свидание в стиле вашего первого свидания',
  'Сделать друг другу мини-квест из трёх записок',
  'Выбрать случайную книгу и зачитать друг другу по абзацу',
  'Устроить вечер «каждый выбирает по одному сюрпризу»',
  'Найти в городе место, где вы ещё ни разу не фотографировались',
  'Составить план идеального совместного воскресенья',
  'Устроить дегустацию трёх новых напитков',
  'Сделать друг другу маленькие открытки прямо во время свидания',
  'Пойти гулять только по улицам, названия которых нравятся',
  'Устроить вечер «пять вопросов и один сюрприз»',
  'Выбрать фильм, который никто из вас не видел',
  'Сделать совместный плейлист из десяти песен без объяснений',
  'Запланировать свидание мечты с бюджетом 0 ₽'
]
const extraClosenessQuestions=[
  'Какой момент со мной ты хотел бы сохранить в капсуле времени?',
  'Что я делаю, когда тебе особенно нужна поддержка?',
  'Какой наш день ты бы хотел прожить ещё раз?',
  'Что тебе хочется попробовать в наших отношениях в ближайший месяц?',
  'Что делает наш дом или наше пространство именно нашим?',
  'Как ты понимаешь, что я рядом, даже когда молчу?',
  'Какой мой взгляд или жест ты узнаёшь сразу?',
  'Что тебе хотелось бы чаще отмечать вместе?',
  'Какая маленькая вещь между нами кажется тебе особенной?',
  'Что бы ты хотел рассказать мне через десять лет?',
  'Какой наш общий страх мы уже смогли пережить?',
  'Что тебе хочется, чтобы мы никогда не переставали делать?',
  'Какая моя сторона раскрылась для тебя только со временем?',
  'Что для тебя означает ощущение «мы команда»?',
  'Какой вопрос о тебе я пока задаю слишком редко?',
  'Какой совместный план ты хотел бы превратить в реальность первым?',
  'Что тебе помогает снова чувствовать близость после тяжёлого дня?',
  'Какая наша фотография лучше всего передаёт нас?',
  'Что тебе хочется услышать от меня, когда ты сомневаешься в себе?',
  'Какую традицию ты бы придумал для нашей пары с нуля?'
]
const allDateIdeas=[...dateIdeas,...extraDateIdeas]
const allClosenessQuestions=[...closenessQuestions,...extraClosenessQuestions]

function IdeaRandomizer({ language }: { language: Language }) {
  const [mode,setMode]=useState<'date'|'question'>('date'),[result,setResult]=useState('')
  const roll=()=>{const arr=mode==='date'?allDateIdeas:allClosenessQuestions;setResult(arr[Math.floor(Math.random()*arr.length)])}
  return <section className="randomizer-card"><div className="section-heading"><div><span className="tiny-label">РАЗВЛЕЧЕНИЯ ДЛЯ ДВОИХ</span><h2>{language==='ru'?'Что делаем сегодня?':'What shall we do?'}</h2></div><Sparkles size={18}/></div><div className="randomizer-tabs"><button className={mode==='date'?'active':''} onClick={()=>setMode('date')}>Идея свидания</button><button className={mode==='question'?'active':''} onClick={()=>setMode('question')}>Вопрос для сближения</button></div><div className="randomizer-result">{result||'Нажми кнопку — Usly выберет что-нибудь неожиданное.'}</div><button className="primary-button wide" onClick={roll}>Сгенерировать ✦</button></section>
}

function UsSection({ couple, language, theme, onBack, onOpenSecret, onOpenTruth, blockVisibility }: { couple: CoupleSummary; language: Language; theme: 'core' | 'rush' | 'nocturne' | 'mono' | 'custom'; onBack: () => void; onOpenSecret: () => void; onOpenTruth: () => void; blockVisibility: Record<UsBlockId, boolean> }) {
  const [space, setSpace] = useState<UsSpace | null>(null)
  const [photoCount, setPhotoCount] = useState(0)
  const [wishes, setWishes] = useState<Wish[]>([])
  const [messageCount, setMessageCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const [myName, setMyName] = useState('')
  const [coupleName, setCoupleName] = useState('Наше «мы»')
  const [startedAt, setStartedAt] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [zodiac, setZodiac] = useState('')
  const [myHoroscope, setMyHoroscope] = useState<DailyHoroscope | null>(null)
  const [horoscopeLoading, setHoroscopeLoading] = useState(false)
  const [horoscopeError, setHoroscopeError] = useState('')

  const loadHoroscope = async (sign: string | null | undefined, forceRefresh = false) => {
    if (!sign) { setMyHoroscope(null); setHoroscopeError(''); return }
    setHoroscopeLoading(true)
    setHoroscopeError('')
    const result = await getDailyHoroscope(sign, language, forceRefresh)
    if (result.ok) setMyHoroscope(result.horoscope)
    else { setMyHoroscope(null); setHoroscopeError(result.error) }
    setHoroscopeLoading(false)
  }

  const loadSpace = async () => {
    const spaceResult = await getUsSpace(couple.id)
    if (!spaceResult.ok) setError(spaceResult.error ?? 'Не удалось загрузить ваше пространство.')
    if (spaceResult.space) {
      setSpace(spaceResult.space)
      setCoupleName(spaceResult.space.coupleName)
      setStartedAt(spaceResult.space.relationshipStartedAt ?? '')
      setMyName(spaceResult.space.people.find(person => person.isMe)?.displayName ?? '')
    }
    setLoading(false)
  }

  const loadPhotoCount = async () => setPhotoCount(await getMomentCount(couple.id))
  const loadWishes = async () => {
    const result = await getWishes(couple.id)
    if (result.ok) setWishes(result.wishes)
  }
  const loadMessageCount = async () => setMessageCount(await getMessageCount(couple.id))

  useEffect(() => {
    let active = true
    setLoading(true)
    void loadSpace().then(() => {
      if (!active) return
    })
    void loadPhotoCount()
    void loadWishes()
    void loadMessageCount()

    if (!supabase) return () => { active = false }

    const channel = supabase
      .channel(`couple-us-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moments', filter: `couple_id=eq.${couple.id}` }, () => { void loadPhotoCount() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_wishes', filter: `couple_id=eq.${couple.id}` }, () => { void loadWishes() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `couple_id=eq.${couple.id}` }, () => { void loadMessageCount() })
      .subscribe()

    return () => {
      active = false
      void supabase?.removeChannel(channel)
    }
  }, [couple.id])

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return }
    const url = URL.createObjectURL(avatarFile)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  const save = async () => {
    setSaving(true); setError(''); setSaved(false)
    const profileResult = await updateMyProfile(myName, avatarFile)
    if (!profileResult.ok) {
      setError(profileResult.error === 'EMPTY_NAME' ? 'Имя не может быть пустым.' : profileResult.error ?? 'Не удалось сохранить имя.')
      setSaving(false)
      return
    }
    const settingsResult = await updateUsSettings(couple.id, coupleName, startedAt || null)
    if (!settingsResult.ok) {
      setError(settingsResult.error ?? 'Не удалось сохранить настройки «Мы».')
      setSaving(false)
      return
    }
    await loadSpace()
    setAvatarFile(null)
    setAvatarPreview(null)
    setBackgroundFile(null)
    setBackgroundPreview(null)
    setEditing(false)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
    setSaving(false)
  }

  const saveRelationshipDate = async (value: string) => {
    setSaving(true); setError('')
    const result = await updateUsSettings(couple.id, coupleName, value || null)
    if (!result.ok) setError(result.error ?? 'Не удалось сохранить дату.')
    else {
      setStartedAt(value)
      setSpace(current => current ? { ...current, relationshipStartedAt: value || null } : current)
    }
    setSaving(false)
  }

  const partner = space?.people.find(person => !person.isMe) ?? null
  const mine = space?.people.find(person => person.isMe) ?? null
  useEffect(() => { void loadHoroscope(mine?.zodiac) }, [mine?.zodiac, language])
  useEffect(() => {
    const refresh = () => { void loadHoroscope(mine?.zodiac) }
    const interval = window.setInterval(refresh, 30 * 60 * 1000)
    const now = new Date()
    const nextMidnight = new Date(now)
    nextMidnight.setHours(24, 0, 8, 0)
    const midnightTimer = window.setTimeout(refresh, Math.max(1000, nextMidnight.getTime() - now.getTime()))
    return () => { window.clearInterval(interval); window.clearTimeout(midnightTimer) }
  }, [mine?.zodiac, language])
  const daysTogether = space?.relationshipStartedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(`${space.relationshipStartedAt}T00:00:00`).getTime()) / 86400000))
    : null

  if (loading) {
    return <section className="us-page"><div className="section-back"><button className="back" onClick={onBack}>← {language === 'ru' ? 'Главная' : 'Home'}</button></div><div className="feelings-empty"><Heart size={28} /><h3>{language === 'ru' ? 'Собираем ваше «мы»…' : 'Loading your Us…'}</h3></div></section>
  }

  return (
    <section className="us-page">
      <div className="section-back"><button className="back" onClick={onBack}>← {language === 'ru' ? 'Главная' : 'Home'}</button></div>

      <div className="us-intro">
        <div className="eyebrow"><Heart size={15} fill="currentColor" /> {language === 'ru' ? 'ВАШЕ «МЫ»' : 'YOUR US'}</div>
        <h2>{coupleName}</h2>
        <p>{language === 'ru' ? 'Место, где важны не цифры, а вы двое.' : 'A little place where the important thing is the two of you.'}</p>
      </div>

      {error && <div className="notice us-load-error">{error}</div>}

      <div className="us-title-tools">
        {!editing ? (
          <button className="secondary-button us-name-edit-button" onClick={() => setEditing(true)}><Settings size={15}/>{language === 'ru' ? 'Настроить название' : 'Edit name'}</button>
        ) : (
          <div className="us-inline-editor">
            <label><span>{language === 'ru' ? 'Название вашего «Мы»' : 'Name your Us'}</span><input value={coupleName} onChange={e => setCoupleName(e.target.value.slice(0, 60))} maxLength={60} /></label>
            <div className="us-edit-actions"><button className="secondary-button" onClick={() => { setCoupleName(space?.coupleName ?? coupleName); setEditing(false) }}>{language === 'ru' ? 'Отмена' : 'Cancel'}</button><button className="primary-button" disabled={saving} onClick={() => void save()}>{saving ? (language === 'ru' ? 'Сохраняем…' : 'Saving…') : saved ? 'Сохранено ❤️' : (language === 'ru' ? 'Сохранить' : 'Save')} <Check size={16} /></button></div>
          </div>
        )}
      </div>

      <div className="us-couple-hero">
        <div className="us-couple-person">
          <Avatar person={mine} size="lg" />
          <span className="tiny-label">{language === 'ru' ? 'ТЫ' : 'YOU'}</span>
          <strong>{mine?.displayName || (language === 'ru' ? 'Ты' : 'You')}</strong>
          <small>{mine?.zodiac ? `${zodiacOptions.find(z => z.key === mine.zodiac)?.symbol || ''} ${language === 'ru' ? zodiacOptions.find(z => z.key === mine.zodiac)?.ru : zodiacOptions.find(z => z.key === mine.zodiac)?.en}` : (language === 'ru' ? 'Знак не указан' : 'Zodiac not set')}</small>
        </div>
        <div className="us-couple-connection"><Heart size={22} fill="currentColor" /><span>{language === 'ru' ? 'ВАШЕ МЫ' : 'YOUR US'}</span></div>
        <div className={`us-couple-person ${partner ? '' : 'us-person-muted'}`}>
          <Avatar person={partner} size="lg" />
          <span className="tiny-label">{language === 'ru' ? 'ПАРТНЁР' : 'PARTNER'}</span>
          <strong>{partner?.displayName || (language === 'ru' ? 'Ещё не здесь' : 'Not here yet')}</strong>
          <small>{partner?.zodiac ? `${zodiacOptions.find(z => z.key === partner.zodiac)?.symbol || ''} ${language === 'ru' ? zodiacOptions.find(z => z.key === partner.zodiac)?.ru : zodiacOptions.find(z => z.key === partner.zodiac)?.en}` : (language === 'ru' ? 'Знак не указан' : 'Zodiac not set')}</small>
        </div>
      </div>

      {blockVisibility.stats && <div className="us-stats us-stats-main">
        <div className="us-stat us-stat-together"><span>{language === 'ru' ? 'Вместе' : 'Together'}</span><strong>{daysTogether === null ? '—' : daysTogether}</strong><small>{language === 'ru' ? 'дней' : 'days'}</small><i>♥</i></div>
        <div className="us-stat us-stat-usly"><span>{language === 'ru' ? 'В Usly' : 'In Usly'}</span><strong>{Math.max(0, Math.floor((Date.now() - new Date(couple.createdAt).getTime()) / 86400000))}</strong><small>{language === 'ru' ? 'дней' : 'days'}</small><i>◌</i></div>
      </div>}

      {blockVisibility.dates && <CoupleDatesSection couple={couple} language={language} relationshipStartedAt={startedAt} onRelationshipDateSave={saveRelationshipDate} relationshipDateSaving={saving} />}
      {blockVisibility.achievements && <Achievements couple={couple} language={language} daysTogether={daysTogether} photoCount={photoCount} wishes={wishes} messageCount={messageCount} />}
      {blockVisibility.giftWishlist && <GiftWishlist couple={couple} language={language} theme={theme} />}
      {blockVisibility.entertainment && <IdeaRandomizer language={language} />}
      {blockVisibility.compatibility && partner?.zodiac && mine?.zodiac && (
        <div className="us-compatibility-card">
          <div className="section-heading"><div><span className="tiny-label">{language === 'ru' ? 'ЗОДИАК' : 'ZODIAC'}</span><h2>{language === 'ru' ? 'Совместимость' : 'Compatibility'}</h2></div><span className="us-compatibility-score">{getZodiacCompatibility(mine.zodiac, partner.zodiac)}%</span></div>
          <div className="us-compatibility-bar"><span style={{ width: `${getZodiacCompatibility(mine.zodiac, partner.zodiac)}%` }} /></div>
          <p>{language === 'ru' ? 'Развлекательная оценка по знакам зодиака — не научный прогноз.' : 'For entertainment only — zodiac compatibility is not a scientific prediction.'}</p>
        </div>
      )}

      {blockVisibility.horoscope && <div className="us-horoscope-card">
        <div className="section-heading us-horoscope-heading">
          <div>
            <span className="tiny-label">{language === 'ru' ? 'СЕГОДНЯ ПО ЗВЁЗДАМ' : 'TODAY IN THE STARS'}</span>
            <h2>{language === 'ru' ? 'Твой гороскоп' : 'Your horoscope'}</h2>
          </div>
          {mine?.zodiac && <div className="us-horoscope-tools"><span className="us-horoscope-sign">{zodiacOptions.find(z => z.key === mine.zodiac)?.symbol} {zodiacLabel(mine.zodiac, language)}</span><button className="icon-button" onClick={() => void loadHoroscope(mine?.zodiac, true)} title={language==='ru'?'Обновить прогноз':'Refresh reading'} aria-label={language==='ru'?'Обновить прогноз':'Refresh reading'}>↻</button></div>}
        </div>
        {!mine?.zodiac ? (
          <div className="us-horoscope-empty">{language === 'ru' ? 'Укажи знак зодиака в профиле — и здесь каждый день будет появляться новый прогноз.' : 'Set your zodiac sign in your profile and a fresh daily reading will appear here.'}</div>
        ) : horoscopeLoading ? (
          <div className="us-horoscope-loading"><span className="horoscope-orbit">✦</span><span>{language === 'ru' ? 'Получаем прогноз…' : 'Getting today’s reading…'}</span></div>
        ) : myHoroscope ? (
          <div className="us-horoscope-body">
            <div className="us-horoscope-icon">{zodiacOptions.find(z => z.key === mine.zodiac)?.symbol}</div>
            <div className="us-horoscope-copy"><p>{myHoroscope.text}</p><small className="horoscope-date">{language==='ru' ? `Прогноз на ${new Date(`${myHoroscope.date}T00:00:00`).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}` : `Reading for ${myHoroscope.date}`}</small></div>
            <small className="horoscope-disclaimer">{language === 'ru' ? 'Развлекательный контент. Гороскоп не является научным прогнозом.' : 'For entertainment only. Horoscopes are not scientific predictions.'}</small>
          </div>
        ) : (
          <div className="us-horoscope-error">
            <span>{language === 'ru' ? 'Не удалось получить прогноз автоматически.' : 'Could not load today’s reading automatically.'}</span>
            <button className="secondary-button" onClick={() => void loadHoroscope(mine?.zodiac, true)}>{language === 'ru' ? 'Повторить' : 'Retry'}</button>
          </div>
        )}
      </div>}


      {(blockVisibility.truthRoom || blockVisibility.secret) && <div className="rooms-entry-grid">{blockVisibility.truthRoom && <button className="room-entry-button room-entry-truth" onClick={onOpenTruth}><span className="room-entry-kicker">♡</span><strong>{language==='ru'?'Комната правды':'Room of Truth'}</strong><small>{language==='ru'?'Честные разговоры и договорённости':'Honest conversations and agreements'}</small><ArrowRight size={17}/></button>}{blockVisibility.secret && <button className="room-entry-button room-entry-secret" onClick={onOpenSecret}><span className="room-entry-kicker">18+</span><strong>{language==='ru'?'Секретная комната':'Private room'}</strong><small>{language==='ru'?'Фото, чат и желания только для вас двоих':'Photos, chat and desires for the two of you'}</small><ArrowRight size={17}/></button>}</div>}

    </section>
  )
}


const zodiacCompatibilityMatrix: Record<string, number> = { aries: 82, taurus: 78, gemini: 86, cancer: 80, leo: 88, virgo: 76, libra: 91, scorpio: 84, sagittarius: 87, capricorn: 79, aquarius: 85, pisces: 90 }
function getZodiacCompatibility(a: string, b: string) {
  if (!a || !b) return 0
  if (a === b) return 84
  const pair = `${[a,b].sort().join(':')}`
  const overrides: Record<string, number> = { 'aries:leo': 94, 'cancer:pisces': 96, 'gemini:libra': 95, 'taurus:virgo': 93, 'scorpio:pisces': 94, 'aquarius:sagittarius': 92, 'capricorn:taurus': 93, 'aries:libra': 79, 'gemini:pisces': 82 }
  return overrides[pair] ?? Math.round((zodiacCompatibilityMatrix[a] + zodiacCompatibilityMatrix[b]) / 2)
}

const zodiacOptions = [
  { key: 'aries', symbol: '♈', ru: 'Овен', en: 'Aries' }, { key: 'taurus', symbol: '♉', ru: 'Телец', en: 'Taurus' },
  { key: 'gemini', symbol: '♊', ru: 'Близнецы', en: 'Gemini' }, { key: 'cancer', symbol: '♋', ru: 'Рак', en: 'Cancer' },
  { key: 'leo', symbol: '♌', ru: 'Лев', en: 'Leo' }, { key: 'virgo', symbol: '♍', ru: 'Дева', en: 'Virgo' },
  { key: 'libra', symbol: '♎', ru: 'Весы', en: 'Libra' }, { key: 'scorpio', symbol: '♏', ru: 'Скорпион', en: 'Scorpio' },
  { key: 'sagittarius', symbol: '♐', ru: 'Стрелец', en: 'Sagittarius' }, { key: 'capricorn', symbol: '♑', ru: 'Козерог', en: 'Capricorn' },
  { key: 'aquarius', symbol: '♒', ru: 'Водолей', en: 'Aquarius' }, { key: 'pisces', symbol: '♓', ru: 'Рыбы', en: 'Pisces' },
] as const

function ProfileSection({ couple, language, onBack }: { couple: CoupleSummary; language: Language; onBack: () => void }) {
  const [space, setSpace] = useState<UsSpace | null>(null)
  const [name, setName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [zodiac, setZodiac] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const result = await getUsSpace(couple.id)
    if (!result.ok) {
      setError(result.error ?? (language === 'ru' ? 'Не удалось загрузить профиль.' : 'Could not load profile.'))
    } else if (result.space) {
      setSpace(result.space)
      const me = result.space.people.find(person => person.isMe)
      setName(me?.displayName ?? '')
      setGender(me?.gender ?? '')
      setZodiac(me?.zodiac ?? '')
    }
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    void getUsSpace(couple.id).then(result => {
      if (!active) return
      if (!result.ok) setError(result.error ?? (language === 'ru' ? 'Не удалось загрузить профиль.' : 'Could not load profile.'))
      else if (result.space) {
        setSpace(result.space)
        const me = result.space.people.find(person => person.isMe)
        setName(me?.displayName ?? '')
        setGender(me?.gender ?? '')
        setZodiac(me?.zodiac ?? '')
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [couple.id])

  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return }
    const url = URL.createObjectURL(avatarFile)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])
  useEffect(() => {
    if (!backgroundFile) { setBackgroundPreview(null); return }
    const url = URL.createObjectURL(backgroundFile)
    setBackgroundPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [backgroundFile])


  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel(`profile-page-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { void load() })
      .subscribe()
    return () => { void supabase?.removeChannel(channel) }
  }, [couple.id])

  const mine = space?.people.find(person => person.isMe) ?? null
  const partner = space?.people.find(person => !person.isMe) ?? null

  const save = async () => {
    setSaving(true); setError(''); setSaved(false)
    const result = await updateMyProfile(name, avatarFile, gender || null, zodiac || null, backgroundFile)
    if (!result.ok) {
      const message = result.error === 'EMPTY_NAME'
        ? (language === 'ru' ? 'Имя не может быть пустым.' : 'Name cannot be empty.')
        : result.error ?? (language === 'ru' ? 'Не удалось сохранить профиль.' : 'Could not save profile.')
      setError(message)
      setSaving(false)
      return
    }
    await load()
    setAvatarFile(null)
    setAvatarPreview(null)
    setBackgroundFile(null)
    setBackgroundPreview(null)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
    setSaving(false)
  }

  if (loading) {
    return <section className="profile-page"><div className="section-back"><button className="back" onClick={onBack}>← {language === 'ru' ? 'Главная' : 'Home'}</button></div><div className="feelings-empty"><UserRound size={28} /><h3>{language === 'ru' ? 'Загружаем профиль…' : 'Loading profile…'}</h3></div></section>
  }

  return (
    <section className="profile-page">
      <div className="section-back"><button className="back" onClick={onBack}>← {language === 'ru' ? 'Главная' : 'Home'}</button></div>
      <div className="profile-intro">
        <div className="eyebrow"><UserRound size={15} /> {language === 'ru' ? 'ТВОЙ ПРОФИЛЬ' : 'YOUR PROFILE'}</div>
        <h2>{language === 'ru' ? 'Как тебя видит твой человек.' : 'How your person sees you.'}</h2>
        <p>{language === 'ru' ? 'Имя и фото будут отображаться у партнёра по всему Usly.' : 'Your name and photo appear to your partner across Usly.'}</p>
      </div>

      <div className="profile-main-card">
        <div className="profile-avatar-stage">
          <div className="profile-avatar-ring"><Avatar person={avatarPreview ? { displayName: name, avatarUrl: avatarPreview } : mine} size="lg" /></div>
          <label className="avatar-camera-button" title={language === 'ru' ? 'Изменить фото' : 'Change photo'}>
            <Camera size={18} />
            <input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0] ?? null; if (file && file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) setAvatarFile(file); e.currentTarget.value = '' }} />
          </label>
        </div>
        <div className="profile-form-copy">
          <span className="tiny-label">{language === 'ru' ? 'ТВОЁ ИМЯ' : 'YOUR NAME'}</span>
          <input className="profile-name-input" value={name} onChange={e => setName(e.target.value.slice(0, 40))} maxLength={40} placeholder={language === 'ru' ? 'Как тебя называть?' : 'What should we call you?'} />
          <small>{language === 'ru' ? 'До 40 символов. Можно изменить в любой момент.' : 'Up to 40 characters. You can change it anytime.'}</small>
          <div className="profile-field-grid">
            <label><span className="tiny-label">{language === 'ru' ? 'ПОЛ' : 'GENDER'}</span><select value={gender} onChange={e => setGender(e.target.value as 'male' | 'female' | '')}><option value="">{language === 'ru' ? 'Не указан' : 'Not set'}</option><option value="male">{language === 'ru' ? 'Мужской' : 'Male'}</option><option value="female">{language === 'ru' ? 'Женский' : 'Female'}</option></select></label>
            <label><span className="tiny-label">{language === 'ru' ? 'ЗНАК ЗОДИАКА' : 'ZODIAC SIGN'}</span><select value={zodiac} onChange={e => setZodiac(e.target.value)}><option value="">{language === 'ru' ? 'Не указан' : 'Not set'}</option>{zodiacOptions.map(z => <option key={z.key} value={z.key}>{z.symbol} {language === 'ru' ? z.ru : z.en}</option>)}</select></label>
          </div>
          <label className="profile-background-field"><span className="tiny-label">{language === 'ru' ? 'ФОН ПРИЛОЖЕНИЯ' : 'APP BACKGROUND'}</span><div className="background-upload-row">{(backgroundPreview || mine?.backgroundUrl) && <img src={backgroundPreview || mine?.backgroundUrl || ''} alt="" />}{!backgroundPreview && !mine?.backgroundUrl && <span className="background-placeholder">{language === 'ru' ? 'Своя фотография на фоне' : 'Your own photo as the background'}</span>}<label className="secondary-button file-button"><Camera size={15}/>{language === 'ru' ? 'Выбрать' : 'Choose'}<input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0] ?? null; if (file && file.type.startsWith('image/') && file.size <= 8 * 1024 * 1024) setBackgroundFile(file); e.currentTarget.value = '' }} /></label></div></label>
        </div>
        <button className="primary-button profile-save-button" disabled={saving} onClick={() => void save()}>
          {saving ? (language === 'ru' ? 'Сохраняем…' : 'Saving…') : saved ? (language === 'ru' ? 'Сохранено ❤️' : 'Saved ❤️') : (language === 'ru' ? 'Сохранить' : 'Save')} {saved ? <Check size={16} /> : <Save size={16} />}
        </button>
        {error && <div className="notice">{error}</div>}
      </div>

      <div className="profile-preview-card">
        <div className="section-heading"><div><span className="tiny-label">{language === 'ru' ? 'ПРЕДПРОСМОТР' : 'PREVIEW'}</span><h2>{language === 'ru' ? 'Как это увидит партнёр' : 'How your partner sees you'}</h2></div></div>
        <div className="partner-preview-row">
          <Avatar person={avatarPreview ? { displayName: name, avatarUrl: avatarPreview } : mine} size="md" />
          <div><strong>{name || (language === 'ru' ? 'Твоё имя' : 'Your name')}</strong><span>{language === 'ru' ? 'Участник вашего Usly' : 'Member of your Usly'}</span></div>
          <Heart size={18} fill="currentColor" />
          <div className="preview-partner"><Avatar person={partner} size="sm" /><span>{partner?.displayName || (language === 'ru' ? 'Партнёр' : 'Partner')}</span></div>
        </div>
      </div>

      <div className="profile-tip"><Sparkles size={18}/><div><b>{language === 'ru' ? 'Маленькая деталь.' : 'A small detail.'}</b><p>{language === 'ru' ? 'Фото хранится приватно и доступно только вашему пространству.' : 'Your photo is stored privately and only available inside your shared space.'}</p></div></div>
    </section>
  )
}


function WishesSection({ couple, language, onBack }: { couple: CoupleSummary; language: Language; onBack: () => void }) {
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [myId, setMyId] = useState<string | null>(null)

  const load = async () => {
    const [rows, userId] = await Promise.all([getWishes(couple.id), getMyUserId()])
    if (!rows.ok) setError(rows.error ?? 'Не удалось загрузить желания.')
    else setWishes(rows.wishes)
    setMyId(userId)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    void Promise.all([getWishes(couple.id), getMyUserId()]).then(([rows, userId]) => {
      if (!active) return
      if (!rows.ok) setError(rows.error ?? 'Не удалось загрузить желания.')
      else setWishes(rows.wishes)
      setMyId(userId)
      setLoading(false)
    })
    if (!supabase) return () => { active = false }
    const channel = supabase
      .channel(`wishes-live-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_wishes', filter: `couple_id=eq.${couple.id}` }, () => { void load() })
      .subscribe()
    return () => { active = false; void supabase?.removeChannel(channel) }
  }, [couple.id])

  const add = async () => {
    if (!title.trim()) return setError(language === 'ru' ? 'Напиши, чего хочется.' : 'Add a wish first.')
    setSaving(true); setError('')
    const result = await createWish(couple.id, title, note)
    if (!result.ok) setError(result.error ?? 'Не удалось сохранить желание.')
    else { setTitle(''); setNote(''); await load() }
    setSaving(false)
  }

  const act = async (wish: Wish, action: 'join' | 'done') => {
    setError('')
    const result = action === 'join' ? await joinWish(wish.id) : await completeWish(wish.id)
    if (!result.ok) setError(result.error ?? 'Не удалось обновить желание.')
    else await load()
  }

  const open = wishes.filter(w => w.status === 'open')
  const done = wishes.filter(w => w.status === 'done')

  if (loading) return <section className="wishes-page"><div className="section-back"><button className="back" onClick={onBack}>← {language === 'ru' ? 'Главная' : 'Home'}</button></div><div className="feelings-empty"><Heart size={28}/><h3>{language === 'ru' ? 'Собираем ваши желания…' : 'Loading your wishes…'}</h3></div></section>

  return (
    <section className="wishes-page">
      <div className="section-back"><button className="back" onClick={onBack}>← {language === 'ru' ? 'Главная' : 'Home'}</button></div>
      <div className="wishes-intro">
        <div className="eyebrow"><HandHeart size={15}/> {language === 'ru' ? 'ВАШИ ЖЕЛАНИЯ' : 'YOUR WISHES'}</div>
        <h2>{language === 'ru' ? 'Хочется вместе.' : 'Things to do together.'}</h2>
        <p>{language === 'ru' ? 'Добавляйте маленькие и большие желания. Если партнёр тоже хочет — отмечает это. Когда сделали — закрываете вместе.' : 'Add little or big wishes. Your partner can join in, and you can mark them done together.'}</p>
      </div>

      <div className="wish-composer">
        <div className="wish-composer-icon"><Plus size={20}/></div>
        <div className="wish-form">
          <input value={title} onChange={e => setTitle(e.target.value.slice(0,100))} placeholder={language === 'ru' ? 'Например: съездить к морю 🌊' : 'For example: go to the sea 🌊'} maxLength={100}/>
          <textarea value={note} onChange={e => setNote(e.target.value.slice(0,300))} placeholder={language === 'ru' ? 'Можно добавить маленькую деталь…' : 'Add a little detail…'} maxLength={300}/>
          <div className="wish-form-footer"><small>{title.length}/100</small><button className="primary-button" disabled={saving} onClick={() => void add()}>{saving ? (language === 'ru' ? 'Добавляем…' : 'Adding…') : (language === 'ru' ? 'Добавить желание' : 'Add wish')} <Plus size={15}/></button></div>
        </div>
      </div>

      {error && <div className="notice">{error}</div>}

      <div className="wishes-heading"><div><span className="tiny-label">{language === 'ru' ? 'СЕЙЧАС' : 'NOW'}</span><h3>{language === 'ru' ? 'То, что ещё впереди' : 'Still on your list'}</h3></div><span className="wish-count">{open.length}</span></div>
      <div className="wishes-list">
        {!open.length && <div className="wish-empty"><span>♡</span><strong>{language === 'ru' ? 'Пока пусто' : 'Nothing here yet'}</strong><p>{language === 'ru' ? 'Добавьте первое желание — даже самое маленькое.' : 'Add your first wish, even a tiny one.'}</p></div>}
        {open.map(wish => {
          const mine = wish.createdBy === myId
          const joined = !!wish.joinedBy
          return <article className="wish-card" key={wish.id}>
            <div className="wish-card-mark">{joined ? '♥' : '♡'}</div>
            <div className="wish-card-body">
              <div className="wish-card-top"><span>{mine ? (language === 'ru' ? 'ТВОЁ ЖЕЛАНИЕ' : 'YOUR WISH') : (language === 'ru' ? 'ЖЕЛАНИЕ ПАРТНЁРА' : "PARTNER'S WISH")}</span><time>{new Date(wish.createdAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}</time></div>
              <h3>{wish.title}</h3>
              {wish.note && <p>{wish.note}</p>}
              <div className="wish-card-actions">
                {!mine && !joined && <button className="secondary-button" onClick={() => void act(wish, 'join')}><Heart size={14}/> {language === 'ru' ? 'Хочу тоже' : 'I want this too'}</button>}
                {joined && <span className="wish-joined"><Heart size={13} fill="currentColor"/> {language === 'ru' ? 'Хотите оба' : 'You both want it'}</span>}
                {mine && !joined && <span className="wish-waiting">{language === 'ru' ? 'Ждём партнёра' : 'Waiting for partner'}</span>}
                {joined && <button className="primary-button" onClick={() => void act(wish, 'done')}><CircleCheck size={14}/> {language === 'ru' ? 'Сделано' : 'Done'}</button>}
              </div>
            </div>
          </article>
        })}
      </div>

      {done.length > 0 && <>
        <div className="wishes-heading completed-heading"><div><span className="tiny-label">{language === 'ru' ? 'УЖЕ ВМЕСТЕ' : 'TOGETHER'}</span><h3>{language === 'ru' ? 'Сделано ❤️' : 'Done ❤️'}</h3></div><span className="wish-count">{done.length}</span></div>
        <div className="wishes-list wishes-done-list">{done.slice(0, 8).map(wish => <article className="wish-card wish-card-done" key={wish.id}><div className="wish-card-mark">✓</div><div className="wish-card-body"><div className="wish-card-top"><span>{language === 'ru' ? 'ВАША ИСТОРИЯ' : 'YOUR STORY'}</span><time>{wish.completedAt ? new Date(wish.completedAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US') : ''}</time></div><h3>{wish.title}</h3>{wish.note && <p>{wish.note}</p>}</div></article>)}</div></>}
    </section>
  )
}


function SecretRoomSection({ couple, language, onBack }: { couple: CoupleSummary; language: Language; onBack: () => void }) {
  const [unlocked,setUnlocked]=useState(false)
  const [tab,setTab]=useState<'photos'|'chat'|'desires'>('desires')
  const [categories,setCategories]=useState<SecretCategory[]>([])
  const [categoryId,setCategoryId]=useState<string>('')
  const [options,setOptions]=useState<SecretOption[]>([])
  const [selectedOption,setSelectedOption]=useState<SecretOption|null>(null)
  const [desires,setDesires]=useState<SecretSentDesire[]>([])
  const [photos,setPhotos]=useState<SecretPhoto[]>([])
  const [chat,setChat]=useState<SecretChatMessage[]>([])
  const [optionDraft,setOptionDraft]=useState('')
  const [categoryDraft,setCategoryDraft]=useState('')
  const [editingCategory,setEditingCategory]=useState<string|null>(null)
  const [editingName,setEditingName]=useState('')
  const [desireNote,setDesireNote]=useState('')
  const [chatDraft,setChatDraft]=useState('')
  const [photoCaption,setPhotoCaption]=useState('')
  const [saving,setSaving]=useState(false)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [privacyShield,setPrivacyShield]=useState(false)
  const fileRef=useRef<HTMLInputElement|null>(null)
  const currentUserIdRef=useRef<string>('')

  const load=async()=>{
    setLoading(true); setError('')
    const [c,o,d,p,ch,uid]=await Promise.all([getSecretCategories(couple.id),getSecretOptions(couple.id,categoryId||undefined),getSecretDesiresInbox(couple.id),getSecretPhotos(couple.id),getSecretChat(couple.id),getMyUserId()])
    if(c.ok){setCategories(c.categories); if(!categoryId && c.categories[0]) setCategoryId(c.categories[0].id)} else setError(c.error??'')
    if(o.ok)setOptions(o.options); else setError(o.error??'')
    if(d.ok)setDesires(d.desires); else setError(d.error??'')
    if(p.ok)setPhotos(p.photos); else setError(p.error??'')
    if(ch.ok)setChat(ch.messages); else setError(ch.error??'')
    if(uid) currentUserIdRef.current=uid
    setLoading(false)
  }
  useEffect(()=>{if(!unlocked)return;void load()},[unlocked,couple.id,categoryId])
  useEffect(()=>{
    if(!unlocked)return
    const hide=()=>setPrivacyShield(true)
    const show=()=>{if(document.visibilityState==='visible')setPrivacyShield(false)}
    let autoLock:number|undefined
    const armAutoLock=()=>{ if(autoLock!==undefined) window.clearTimeout(autoLock); autoLock=window.setTimeout(()=>setUnlocked(false),10*60*1000) }
    window.addEventListener('blur',hide)
    document.addEventListener('visibilitychange',show)
    window.addEventListener('pointerdown',armAutoLock,{passive:true})
    window.addEventListener('keydown',armAutoLock)
    window.addEventListener('touchstart',armAutoLock,{passive:true})
    armAutoLock()
    return()=>{window.removeEventListener('blur',hide);document.removeEventListener('visibilitychange',show);window.removeEventListener('pointerdown',armAutoLock);window.removeEventListener('keydown',armAutoLock);window.removeEventListener('touchstart',armAutoLock);if(autoLock!==undefined)window.clearTimeout(autoLock)}
  },[unlocked])
  useEffect(()=>{
    if(!unlocked||!supabase)return
    const channel=supabase.channel(`secret-v2-${couple.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'secret_categories',filter:`couple_id=eq.${couple.id}`},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'secret_options',filter:`couple_id=eq.${couple.id}`},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'secret_sent_desires',filter:`couple_id=eq.${couple.id}`},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'secret_photos',filter:`couple_id=eq.${couple.id}`},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'secret_chat_messages',filter:`couple_id=eq.${couple.id}`},()=>void load()).subscribe()
    return()=>{void supabase?.removeChannel(channel)}
  },[unlocked,couple.id,categoryId])

  const addCategory=async()=>{if(!categoryDraft.trim())return;setSaving(true);const r=await createSecretCategory(couple.id,categoryDraft,'✦');if(r.ok){setCategoryDraft('');await load()}else setError(r.error??'');setSaving(false)}
  const saveCategory=async(id:string)=>{if(!editingName.trim())return;setSaving(true);const r=await updateSecretCategory(id,editingName);if(r.ok){setEditingCategory(null);await load()}else setError(r.error??'');setSaving(false)}
  const removeCategory=async(id:string)=>{setSaving(true);const r=await deleteSecretCategory(id);if(r.ok){if(categoryId===id)setCategoryId('');await load()}else setError(r.error??'');setSaving(false)}
  const addOption=async()=>{if(!categoryId||!optionDraft.trim())return;setSaving(true);const r=await createSecretOption(couple.id,categoryId,optionDraft);if(r.ok){setOptionDraft('');await load()}else setError(r.error??'');setSaving(false)}
  const removeOption=async(id:string)=>{setSaving(true);const r=await deleteSecretOption(id);if(r.ok){if(selectedOption?.id===id)setSelectedOption(null);await load()}else setError(r.error??'');setSaving(false)}
  const sendDesire=async()=>{if(!selectedOption)return;setSaving(true);const r=await sendSecretDesire(couple.id,selectedOption.id,desireNote);if(r.ok){setSelectedOption(null);setDesireNote('');await load()}else setError(r.error??'');setSaving(false)}
  const updateDesire=async(id:string,status:'accepted'|'declined'|'completed')=>{setSaving(true);const r=await updateSecretDesireStatus(id,status);if(r.ok)await load();else setError(r.error??'');setSaving(false)}
  const sendChat=async()=>{if(!chatDraft.trim())return;setSaving(true);const r=await sendSecretChat(couple.id,chatDraft);if(r.ok){setChatDraft('');await load()}else setError(r.error??'');setSaving(false)}
  const uploadPhoto=async(file:File)=>{setSaving(true);const r=await uploadSecretPhoto(couple.id,file,photoCaption);if(r.ok){setPhotoCaption('');await load()}else setError(r.error??'');setSaving(false)}
  const removePhoto=async(photo:SecretPhoto)=>{setSaving(true);const r=await deleteSecretPhoto(photo.id,photo.path);if(!r.ok)setError(r.error??'');else await load();setSaving(false)}

  if(!unlocked) return <section className="secret-room-page"><div className="section-back"><button className="back" onClick={onBack}>← {language==='ru'?'Назад':'Back'}</button></div><RoomPasswordGate couple={couple} language={language} room="secret" title={language==='ru'?'Секретная комната':'Private room'} description={language==='ru'?'Интимное пространство пары: фото, приватный чат и желания.':'A private space for photos, private chat and shared desires.'} ageGate onUnlocked={()=>setUnlocked(true)}/></section>

  return <section className="secret-room-page"><div className="section-back"><button className="back" onClick={onBack}>← {language==='ru'?'Назад':'Back'}</button></div><div className="secret-room-content secret-room-open secret-v2"><div className="secret-room-head"><div><span className="eyebrow">18+ · {language==='ru'?'ТОЛЬКО ВДВОЁМ':'JUST YOU TWO'}</span><h2>{language==='ru'?'Секретная комната':'Private room'}</h2><p>{language==='ru'?'Закрытое пространство только для вашей пары.':'A private space for your couple.'}</p></div><button className="secondary-button" onClick={()=>setUnlocked(false)}>🔒 {language==='ru'?'Закрыть':'Lock'}</button></div>
    {error&&<div className="notice">{error}</div>}
    <div className="secret-v2-tabs">{([['desires','♡','Желания'],['photos','▧','Фото'],['chat','◌','Чат']] as const).map(([id,icon,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><span>{icon}</span>{language==='ru'?label:id}</button>)}</div>

    {tab==='photos'&&<section className="secret-v2-section"><div className="secret-v2-section-head"><div><span className="tiny-label">ПРИВАТНЫЙ АЛЬБОМ</span><h3>{language==='ru'?'Фото только для вас двоих':'Private photos'}</h3><p>{language==='ru'?'Файлы хранятся в закрытом хранилище пары.':'Files are kept in private couple storage.'}</p></div><button className="primary-button" onClick={()=>fileRef.current?.click()} disabled={saving}><Plus size={15}/> {language==='ru'?'Добавить фото':'Add photo'}</button><input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void uploadPhoto(f);e.currentTarget.value=''}}/></div><div className="secret-photo-caption"><input value={photoCaption} onChange={e=>setPhotoCaption(e.target.value.slice(0,160))} placeholder={language==='ru'?'Подпись к фото — необязательно':'Caption — optional'}/></div>{loading?<div className="secret-empty">Загружаем…</div>:!photos.length?<div className="secret-empty">{language==='ru'?'Здесь пока пусто. Добавьте ваш первый кадр.':'No photos yet.'}</div>:<div className="secret-photo-grid">{photos.map(photo=><article className="secret-photo-card" key={photo.id}>{photo.url?<img src={photo.url} alt="Приватное фото пары"/>:<div className="secret-photo-missing">Фото недоступно</div>}<div><small>{new Date(photo.createdAt).toLocaleDateString(language==='ru'?'ru-RU':'en-US')}</small>{photo.caption&&<p>{photo.caption}</p>}<button className="icon-button" onClick={()=>void removePhoto(photo)}><Trash2 size={14}/></button></div></article>)}</div>}</section>}

    {tab==='chat'&&<section className="secret-v2-section secret-chat-v2"><div className="secret-v2-section-head"><div><span className="tiny-label">ПИКАНТНЫЙ ЧАТ</span><h3>{language==='ru'?'Разговор только между вами':'Private chat'}</h3></div></div><div className="secret-chat-messages">{loading?<div className="secret-empty">Загружаем…</div>:!chat.length?<div className="secret-empty">{language==='ru'?'Напишите что-нибудь друг другу — это останется здесь.':'Start a private conversation.'}</div>:chat.map(m=><article className={m.senderId===currentUserIdRef.current?'mine':'partner'} key={m.id}><div className="secret-chat-bubble"><p>{m.body}</p><small>{new Date(m.createdAt).toLocaleTimeString(language==='ru'?'ru-RU':'en-US',{hour:'2-digit',minute:'2-digit'})}</small></div>{m.senderId===currentUserIdRef.current&&<button className="icon-button" onClick={()=>void deleteSecretChatMessage(m.id).then(load)}><Trash2 size={12}/></button>}</article>)}</div><div className="secret-chat-composer"><textarea value={chatDraft} onChange={e=>setChatDraft(e.target.value.slice(0,2000))} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void sendChat()}}} rows={2} placeholder={language==='ru'?'Напиши что-нибудь пикантное…':'Write something playful…'}/><button className="primary-button" disabled={saving||!chatDraft.trim()} onClick={()=>void sendChat()}><Send size={15}/></button></div></section>}

    {tab==='desires'&&<section className="secret-v2-section"><div className="secret-v2-section-head"><div><span className="tiny-label">ВАШИ ЖЕЛАНИЯ</span><h3>{language==='ru'?'Выберите то, чего хочется':'Choose what you want'}</h3><p>{language==='ru'?'Выберите вариант и отправьте его партнёру одним нажатием.':'Pick an option and send it to your partner.'}</p></div><button className="secondary-button" onClick={()=>setEditingCategory(v=>v?'':(categories[0]?.id??''))}>⚙ {language==='ru'?'Категории':'Categories'}</button></div>
      <div className="secret-desire-layout"><aside className="secret-category-list">{categories.map(c=><button key={c.id} className={categoryId===c.id?'active':''} onClick={()=>{setCategoryId(c.id);setSelectedOption(null)}}><span>{c.icon}</span><b>{c.name}</b></button>)}{editingCategory!==null&&<div className="secret-category-manager"><div className="secret-manager-add"><input value={categoryDraft} onChange={e=>setCategoryDraft(e.target.value.slice(0,40))} placeholder="Новая категория"/><button className="primary-button" onClick={()=>void addCategory()} disabled={saving||!categoryDraft.trim()}><Plus size={14}/></button></div>{categories.map(c=><div className="secret-manager-row" key={c.id}>{editingCategory===c.id?<><input value={editingName} onChange={e=>setEditingName(e.target.value)}/><button onClick={()=>void saveCategory(c.id)}>✓</button></>:<><span>{c.name}</span><button onClick={()=>{setEditingCategory(c.id);setEditingName(c.name)}}>✎</button>{!c.isDefault&&<button onClick={()=>void removeCategory(c.id)}>×</button>}</>}</div>)}</div>}</aside>
        <div className="secret-options-area"><div className="secret-option-add"><input value={optionDraft} onChange={e=>setOptionDraft(e.target.value.slice(0,100))} placeholder={language==='ru'?'Добавить свой вариант…':'Add your own option…'}/><button className="secondary-button" disabled={saving||!optionDraft.trim()||!categoryId} onClick={()=>void addOption()}><Plus size={14}/> {language==='ru'?'Добавить':'Add'}</button></div>{loading?<div className="secret-empty">Загружаем…</div>:!options.length?<div className="secret-empty">{language==='ru'?'В этой категории пока нет вариантов. Добавьте свой.':'No options here yet. Add one.'}</div>:<div className="secret-option-list">{options.map(o=><button key={o.id} className={`secret-option-card ${selectedOption?.id===o.id?'selected':''}`} onClick={()=>setSelectedOption(o)}><span>♡</span><strong>{o.title}</strong><small>{o.createdBy===currentUserIdRef.current?'Ваш вариант':'Вариант партнёра'}</small><i onClick={e=>{e.stopPropagation();void removeOption(o.id)}}>×</i></button>)}</div>}
          {selectedOption&&<div className="secret-desire-send"><div><span className="tiny-label">ВЫБРАНО</span><strong>{selectedOption.title}</strong></div><input value={desireNote} onChange={e=>setDesireNote(e.target.value.slice(0,300))} placeholder={language==='ru'?'Добавить сообщение — необязательно':'Add a note — optional'}/><button className="primary-button" disabled={saving} onClick={()=>void sendDesire()}>{language==='ru'?'Отправить желание':'Send desire'} <ArrowRight size={15}/></button></div>}
        </div></div>
    </section>}
  </div>{privacyShield&&<div className="secret-privacy-shield"><div><span>18+</span><strong>{language==='ru'?'Приватный режим':'Private mode'}</strong><p>{language==='ru'?'Содержимое скрыто, пока окно не вернулось в фокус.':'Content is hidden while the window is out of focus.'}</p><button className="primary-button" onClick={()=>setPrivacyShield(false)}>{language==='ru'?'Вернуть просмотр':'Show again'}</button></div></div>}</section>
}

function NocturneSky({ zodiac }: { zodiac: string | null | undefined }) {
  const stars = useMemo(() => Array.from({ length: 260 }, (_, index) => {
    const hash = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
      return x - Math.floor(x)
    }
    const x = hash(index + 11)
    const y = hash(index * 1.73 + 97)
    const sizeRoll = hash(index * 4.17 + 31)
    const brightness = hash(index * 2.91 + 71)
    const clusterPull = hash(index * 0.37 + 211)
    const left = Math.min(99, Math.max(1, x * 100 + (clusterPull - 0.5) * 7))
    const top = Math.min(99, Math.max(1, y * 100 + Math.sin(index * 0.41) * 3.5))
    const size = sizeRoll > 0.965 ? 2.7 + brightness * 1.5 : sizeRoll > 0.78 ? 1.5 + brightness * 1.2 : 0.55 + brightness * 0.8
    return {
      left: `${left}%`, top: `${top}%`, size: `${size.toFixed(2)}px`,
      opacity: `${0.16 + brightness * 0.74}`,
      delay: `${(hash(index * 5.31 + 13) * 7).toFixed(2)}s`,
    }
  }), [])

  // Real constellation charts from Wikimedia Commons. We keep the source
  // geometry intact and render the authentic SVG directly. CSS compositing
  // removes the paper/map background without inventing a constellation.
  const constellationSources: Record<string, string> = {
    aries: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Field_Book_of_the_Stars-107-Aries.svg',
    taurus: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/ConstellationTaurus.svg',
    gemini: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/ConstellationGemini.svg',
    cancer: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/ConstellationCancer.svg',
    leo: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/ConstellationLeo.svg',
    virgo: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/ConstellationVirgo.svg',
    libra: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Libra_constellation_map.svg',
    scorpio: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Scorpius.svg',
    sagittarius: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Field_Book_of_the_Stars-065-Sagittarius.svg',
    capricorn: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Field_Book_of_the_Stars-105-Capricornus.svg',
    aquarius: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Field_Book_of_the_Stars-103-Aquarius.svg',
    pisces: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/ConstellationPisces.svg',
  }

  const constellationSource = zodiac ? constellationSources[zodiac] : undefined

  return <div className="nocturne-sky" aria-hidden="true">
    <div className="nocturne-stars">
      {stars.map((star, index) => (
        <span key={index} style={{ left: star.left, top: star.top, width: star.size, height: star.size, opacity: star.opacity, animationDelay: star.delay }} />
      ))}
    </div>
    {constellationSource && <RealConstellationImage src={constellationSource} />}
    <div className="nocturne-nebula" />
  </div>
}

function RealConstellationImage({ src }: { src: string }) {
  // Render the authentic Wikimedia SVG directly. The previous canvas
  // rasterization could fail because of cross-origin restrictions and then
  // fall back to the original paper-backed chart, creating a white rectangle.
  // Direct SVG + CSS compositing avoids that failure mode completely.
  return <div className="zodiac-constellation-wrap">
    <img
      className="zodiac-constellation-image"
      src={src}
      alt=""
      draggable={false}
      referrerPolicy="no-referrer"
    />
  </div>
}

function Home({ t, language, onLanguageChange, theme, onThemeChange, couple, busy, onRefresh, onCoupleLeft, installPrompt }: { t: Translation; language: Language; onLanguageChange: (language: Language) => void; theme: 'core' | 'rush' | 'nocturne' | 'mono' | 'custom'; onThemeChange: (theme: 'core' | 'rush' | 'nocturne' | 'mono' | 'custom') => void; couple: CoupleSummary; busy: boolean; onRefresh: () => void; onCoupleLeft: () => void; installPrompt: BeforeInstallPromptEvent | null }) {
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState<'home' | 'feelings' | 'moments' | 'chat' | 'us' | 'profile' | 'secret' | 'truth'>('home')
  const [secretReturnSection, setSecretReturnSection] = useState<'home' | 'us'>('home')
  const [notice, setNotice] = useState('')
  const [partnerFeeling, setPartnerFeeling] = useState<Feeling | null>(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [latestMoment, setLatestMoment] = useState<Moment | null>(null)
  const [latestMessage, setLatestMessage] = useState<Message | null>(null)
  const [coupleDates, setCoupleDates] = useState<CoupleDate[]>([])
  const [coupleNotes, setCoupleNotes] = useState<CoupleNote[]>([])
  const [noteComposerOpen, setNoteComposerOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [space, setSpace] = useState<UsSpace | null>(null)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [blockVisibility, setBlockVisibility] = useState<BlockVisibility>(() => getBlockVisibility(couple.id))


  const unreadNotifications = notifications.filter(item => !item.readAt).length

  const loadNotifications = async () => {
    const rows = await getNotifications(couple.id)
    setNotifications(rows)
  }

  const openNotifications = async () => {
    setSettingsOpen(false)
    setNotificationsOpen(true)

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        // Notification permission is optional; the in-app center still works.
      }
    }

    const rows = await getNotifications(couple.id)
    setNotifications(rows)

    if (rows.some(item => !item.readAt)) {
      await markAllNotificationsRead(couple.id)
      const readAt = new Date().toISOString()
      setNotifications(current => current.map(item => item.readAt ? item : { ...item, readAt }))
    }
  }

  const openNotificationItem = async (item: AppNotification) => {
    if (!item.readAt) {
      await markNotificationRead(item.id)
      const readAt = new Date().toISOString()
      setNotifications(current => current.map(row => row.id === item.id ? { ...row, readAt } : row))
    }

    setNotificationsOpen(false)

    if (item.entityType === 'message' || item.type === 'message') {
      setActiveSection('chat')
      return
    }
    if (item.entityType === 'feeling' || item.entityType === 'desire' || item.type === 'feeling' || item.type === 'desire') {
      setActiveSection('feelings')
      return
    }
    if (item.entityType === 'moment' || item.type === 'moment') {
      setActiveSection('moments')
      return
    }
    if (item.entityType === 'wish' || item.type === 'wish_joined' || item.type === 'wish_done') {
      setActiveSection('us')
    }
  }

  useEffect(() => {
    let active = true
    void getNotifications(couple.id).then(rows => {
      if (active) setNotifications(rows)
    })

    if (!supabase) return () => { active = false }

    const channel = supabase
      .channel(`notifications-${couple.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `couple_id=eq.${couple.id}`,
      }, async payload => {
        if (!active) return

        const row = payload.new as any
        const rows = await getNotifications(couple.id)
        if (!active) return
        setNotifications(rows)

        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted' &&
          document.visibilityState !== 'visible'
        ) {
          const title = row?.title ? `Usly · ${row.title}` : 'Usly'
          const body = row?.body ? String(row.body).slice(0, 160) : undefined
          try {
            new Notification(title, body ? { body } : undefined)
          } catch {
            // The in-app notification center remains available.
          }
        }
      })
      .subscribe()

    return () => {
      active = false
      void supabase?.removeChannel(channel)
    }
  }, [couple.id])

  useEffect(() => {
    setBlockVisibility(getBlockVisibility(couple.id))
  }, [couple.id])

  const toggleHomeBlock = (id: HomeBlockId) => {
    setBlockVisibility(current => {
      const next = { ...current, home: { ...current.home, [id]: !current.home[id] } }
      saveBlockVisibility(couple.id, next)
      return next
    })
  }

  const toggleUsBlock = (id: UsBlockId) => {
    setBlockVisibility(current => {
      const next = { ...current, us: { ...current.us, [id]: !current.us[id] } }
      saveBlockVisibility(couple.id, next)
      return next
    })
  }
  const [leaving, setLeaving] = useState(false)
  const waiting = couple.memberCount < 2
  const installUsly = async () => {
    if (!installPrompt) { window.location.href = '/widget/'; return }
    await installPrompt.prompt()
  }
  const meProfile = space?.people.find(person => person.isMe) ?? null
  const partnerProfile = space?.people.find(person => !person.isMe) ?? null

  const daysInUsly = Math.max(0, Math.floor((Date.now() - new Date(couple.createdAt).getTime()) / 86400000))

  useEffect(() => {
    document.documentElement.style.setProperty('--us-custom-bg', meProfile?.backgroundUrl ? `url(\"${meProfile.backgroundUrl}\")` : 'none')
    return () => { document.documentElement.style.removeProperty('--us-custom-bg') }
  }, [meProfile?.backgroundUrl])

  useEffect(() => {
    let active = true
    const loadSpace = async () => {
      const result = await getUsSpace(couple.id)
      if (!active) return
      if (result.ok) setSpace(result.space)
    }
    const loadLiveFeeling = async () => {
      const [userId, rows] = await Promise.all([getMyUserId(), getCurrentFeelings(couple.id)])
      if (!active) return
      setPartnerFeeling(rows.find((row) => row.userId !== userId) ?? null)
    }
    const loadLatestPhoto = async () => {
      const latest = await getLatestMoment(couple.id)
      if (!active) return
      setLatestMoment(latest)
      if (latest?.imageUrl) localStorage.setItem(`${LATEST_PHOTO_KEY_PREFIX}${couple.id}`, latest.imageUrl)
    }
    const loadLatestChatMessage = async () => {
      const latest = await getLatestMessage(couple.id)
      if (active) setLatestMessage(latest)
    }
    const loadDates = async () => {
      const dates = await getCoupleDates(couple.id)
      if (active && dates.ok) setCoupleDates(dates.dates)
    }
    const loadNotes = async () => {
      const notes = await getCoupleNotes(couple.id)
      if (!active) return
      if (notes.ok) setCoupleNotes(notes.notes)
    }
    void loadSpace()
    void loadLiveFeeling()
    void loadLatestPhoto()
    void loadLatestChatMessage()
    void loadDates()
    void loadNotes()
    void getUnreadCount(couple.id).then(count => { if (active) setUnreadMessages(count) })
    if (!supabase) return () => { active = false }
    const channel = supabase
      .channel(`home-live-${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_feelings', filter: `couple_id=eq.${couple.id}` }, () => { void loadLiveFeeling();  })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moments', filter: `couple_id=eq.${couple.id}` }, () => { void loadLatestPhoto() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_dates', filter: `couple_id=eq.${couple.id}` }, () => { void loadDates() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_notes', filter: `couple_id=eq.${couple.id}` }, () => { void loadNotes() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `couple_id=eq.${couple.id}` }, async payload => {
        void loadLatestChatMessage()
        const userId = await getMyUserId()
        if (payload.new?.sender_id !== userId) {
          setUnreadMessages(await getUnreadCount(couple.id))
              }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { void loadSpace() })
      .subscribe()
    return () => { active = false; void supabase?.removeChannel(channel) }
  }, [couple.id])

  useEffect(() => {
    let active = true
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null

    const setupPresence = async () => {
      if (!supabase || !active) return
      const userId = await getMyUserId()
      if (!userId || !active) return

      channel = supabase.channel(`couple-presence-${couple.id}`, {
        config: { presence: { key: userId } },
      })

      const updatePartnerPresence = () => {
        if (!channel) return
        const state = channel.presenceState() as Record<string, Array<{ userId?: string }>>
        setPartnerOnline(Object.values(state).some(entries => entries.some(entry => entry.userId && entry.userId !== userId)))
      }

      channel
        .on('presence', { event: 'sync' }, updatePartnerPresence)
        .on('presence', { event: 'join' }, updatePartnerPresence)
        .on('presence', { event: 'leave' }, updatePartnerPresence)
        .subscribe(async status => {
          if (status === 'SUBSCRIBED') {
            await channel?.track({ userId, onlineAt: new Date().toISOString() })
            updatePartnerPresence()
          }
        })
    }

    void setupPresence()
    return () => {
      active = false
      setPartnerOnline(false)
      if (channel) void supabase?.removeChannel(channel)
    }
  }, [couple.id])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(couple.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setNotice('Не удалось скопировать код. Выдели его вручную.')
      setTimeout(() => setNotice(''), 3000)
    }
  }

  const saveHomeNote = async () => {
    if (!noteDraft.trim() || noteSaving) return
    setNoteSaving(true)
    const result = await createCoupleNote(couple.id, noteDraft)
    if (!result.ok) { setNotice(language === 'ru' ? 'Не удалось сохранить записку.' : 'Could not save the note.') }
    else { setNoteDraft(''); setNoteComposerOpen(false); await getCoupleNotes(couple.id).then(r => { if (r.ok) setCoupleNotes(r.notes) }) }
    setNoteSaving(false)
  }

  const signOut = async () => {
    setSettingsOpen(false)
    await supabase?.auth.signOut()
  }

  const leave = async () => {
    if (leaving) return
    const confirmed = window.confirm(language === 'ru'
      ? 'Выйти из этой пары? Твоя учётка останется, но ты больше не будешь участником этого пространства.'
      : 'Leave this couple? Your account will stay, but you will no longer be a member of this space.')
    if (!confirmed) return
    setLeaving(true)
    const result = await leaveCouple(couple.id)
    if (!result.ok) {
      setNotice(result.error ?? (language === 'ru' ? 'Не удалось выйти из пары.' : 'Could not leave the couple.'))
      setLeaving(false)
      return
    }
    setSettingsOpen(false)
    onCoupleLeft()
    setLeaving(false)
  }

  const upcomingDate = useMemo(() => {
    if (!coupleDates.length) return null
    const now = new Date()
    const candidates = coupleDates.map(item => {
      const source = new Date(`${item.date}T00:00:00`)
      const next = new Date(now.getFullYear(), source.getMonth(), source.getDate())
      if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        next.setFullYear(now.getFullYear() + 1)
      }
      return { item, next }
    }).sort((a, b) => a.next.getTime() - b.next.getTime())
    return candidates[0] ?? null
  }, [coupleDates])

  const daysUntilDate = upcomingDate
    ? Math.max(0, Math.ceil((upcomingDate.next.getTime() - new Date().getTime()) / 86400000))
    : null

  const daysTogether = space?.relationshipStartedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(space.relationshipStartedAt).getTime()) / 86400000))
    : null

  const nav: Array<{ id: 'home' | 'feelings' | 'moments' | 'chat' | 'us'; label: string; icon: string }> = [
    { id: 'home', label: 'Главная', icon: '⌂' },
    { id: 'feelings', label: 'Чувства', icon: '♡' },
    { id: 'moments', label: 'Фото', icon: '▧' },
    { id: 'chat', label: 'Чат', icon: '◌' },
    { id: 'us', label: 'Мы', icon: '♥' },
  ]


  return (
    <main className="shell app-shell">
      {theme === 'nocturne' && <NocturneSky zodiac={meProfile?.zodiac} />}
      <nav className="nav app-nav">
        <Brand />
        <div className="nav-actions">
          {!waiting && <span className={`partner-presence ${partnerOnline ? 'online' : 'offline'}`} title={partnerOnline ? (language === 'ru' ? 'Партнёр сейчас онлайн' : 'Partner is online') : (language === 'ru' ? 'Партнёр сейчас офлайн' : 'Partner is offline')}>
            <span className="network-dot" />
            <span className="network-label">{partnerOnline ? (language === 'ru' ? 'онлайн' : 'online') : (language === 'ru' ? 'офлайн' : 'offline')}</span>
          </span>}
          <LanguageSwitcher language={language} onChange={onLanguageChange} label={t.navLanguage} />
          {!waiting && <button
            className="icon-button"
            title={language === 'ru' ? 'Уведомления' : 'Notifications'}
            onClick={() => void openNotifications()}
            aria-label={language === 'ru' ? 'Уведомления' : 'Notifications'}
            style={{ position: 'relative' }}
          >
            <Bell size={17} />
            {unreadNotifications > 0 && <b className="nav-badge" style={{ position: 'absolute', top: -5, right: -5 }}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</b>}
          </button>}
          <button className="icon-button" title={language === 'ru' ? 'Настройки' : 'Settings'} onClick={() => { setNotificationsOpen(false); setSettingsOpen(v => !v) }} aria-label={language === 'ru' ? 'Настройки' : 'Settings'}><Settings size={17} /></button>
          <button className="text-button" onClick={signOut}><LogOut size={16} /> {t.signOut}</button>
        </div>
      </nav>

      {notificationsOpen && (
        <div
          className="settings-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={language === 'ru' ? 'Уведомления' : 'Notifications'}
          onMouseDown={event => { if (event.target === event.currentTarget) setNotificationsOpen(false) }}
        >
          <section className="settings-sheet">
            <div className="settings-sheet-head">
              <div>
                <span className="tiny-label">USLY</span>
                <h2>{language === 'ru' ? 'Уведомления' : 'Notifications'}</h2>
              </div>
              <button className="notification-close" onClick={() => setNotificationsOpen(false)} aria-label={language === 'ru' ? 'Закрыть' : 'Close'}><X size={17}/></button>
            </div>

            <div className="settings-section">
              <span className="tiny-label">
                {language === 'ru' ? 'СООБЫТИЯ ВАШЕЙ ПАРЫ' : 'YOUR COUPLE ACTIVITY'}
              </span>

              {!notifications.length ? (
                <div className="current-feeling-empty">
                  <span>♡</span>
                  <div>
                    <strong>{language === 'ru' ? 'Пока тихо' : 'Nothing new yet'}</strong>
                    <p>{language === 'ru'
                      ? 'Здесь появятся новые сообщения, изменения чувств и желания партнёра.'
                      : 'New messages, feeling changes and partner desires will appear here.'}</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {notifications.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className="settings-row"
                      onClick={() => void openNotificationItem(item)}
                      style={{
                        textAlign: 'left',
                        opacity: item.readAt ? 0.72 : 1,
                        border: item.readAt ? undefined : '1px solid currentColor',
                      }}
                    >
                      <span className="settings-row-icon">
                        {item.type === 'message' ? '💬' : item.type === 'feeling' ? '♡' : item.type === 'desire' ? '✨' : item.type === 'moment' ? '▧' : '♥'}
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        {item.body && <small>{item.body}</small>}
                        <small>{formatRelativeTime(item.createdAt, language)}</small>
                      </span>
                      {!item.readAt && <span aria-label={language === 'ru' ? 'Новое' : 'New'}>●</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="settings-footer">
              <Bell size={16}/>
              <span>{language === 'ru'
                ? 'Системные уведомления работают, когда браузер разрешил их и страница Usly открыта в фоне.'
                : 'System notifications work when the browser allows them and Usly is open in the background.'}</span>
            </div>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="settings-overlay" role="dialog" aria-modal="true" aria-label={language === 'ru' ? 'Настройки' : 'Settings'} onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false) }}>
          <section className="settings-sheet">
            <div className="settings-sheet-head">
              <div><span className="tiny-label">USLY</span><h2>{language === 'ru' ? 'Настройки' : 'Settings'}</h2></div>
              <button className="notification-close" onClick={() => setSettingsOpen(false)} aria-label={language === 'ru' ? 'Закрыть' : 'Close'}><X size={17}/></button>
            </div>

            <div className="settings-section">
              <span className="tiny-label">{language === 'ru' ? 'ВНЕШНИЙ ВИД' : 'APPEARANCE'}</span>
              <div className="theme-picker">
                {([['core','Core','Core'],['rush','Rush','Rush'],['nocturne','Nocturne','Nocturne'],['mono','Mono','Mono'],['custom','Своё фото','Custom photo']] as const).map(([id,ru,en]) => id==='custom' ? <label key={id} className={theme===id?'theme-option active theme-custom-option':'theme-option theme-custom-option'}><span className="theme-swatch theme-custom" /><strong>{language==='ru'?ru:en}</strong><small>{meProfile?.backgroundUrl ? (language==='ru'?'Фото как фон':'Use your photo') : (language==='ru'?'Загрузить фон':'Upload background')}</small><input type="file" accept="image/*" hidden onChange={async e=>{const file=e.target.files?.[0]??null;if(!file)return;const result=await updateMyProfile(meProfile?.displayName||'Usly',null,meProfile?.gender??null,meProfile?.zodiac??null,file);if(result.ok){const next=await getUsSpace(couple.id);if(next.ok)setSpace(next.space);onThemeChange('custom')}else setNotice(result.error??'Не удалось загрузить фон.');e.currentTarget.value=''}} /></label> : <button key={id} className={theme===id?'theme-option active':'theme-option'} onClick={()=>onThemeChange(id)}><span className={`theme-swatch theme-${id}`} /><strong>{language==='ru'?ru:en}</strong><small>{id==='core' ? (language==='ru'?'Спокойный':'Calm') : id==='rush' ? (language==='ru'?'Энергия':'Energy') : id==='nocturne' ? (language==='ru'?'Ночной':'Night') : (language==='ru'?'Футуризм':'Future')}</small></button>)}
              </div>
            </div>

            <div className="settings-section">
              <span className="tiny-label">{language === 'ru' ? 'ПРИЛОЖЕНИЕ' : 'APP'}</span>
              <button className="settings-row" onClick={() => { setSettingsOpen(false); setActiveSection('profile') }}>
                <span className="settings-row-icon"><UserRound size={18}/></span>
                <span><strong>{language === 'ru' ? 'Профиль' : 'Profile'}</strong><small>{language === 'ru' ? 'Имя и фотография' : 'Name and photo'}</small></span>
                <ArrowRight size={16}/>
              </button>
              <button className="settings-row" onClick={() => { setSettingsOpen(false); setActiveSection('us') }}>
                <span className="settings-row-icon"><Heart size={18} fill="currentColor"/></span>
                <span><strong>{language === 'ru' ? 'Ваше «Мы»' : 'Your Us'}</strong><small>{language === 'ru' ? 'Название пары · даты — во вкладке «Мы»' : 'Couple name · dates live in Us'}</small></span>
                <ArrowRight size={16}/>
              </button>
              <button className="settings-row" onClick={() => setNotice(`Код пары: ${couple.inviteCode}`)}>
                <span className="settings-row-icon"><ShieldCheck size={18}/></span><span><strong>Код пары</strong><small>Нужен только для подключения партнёра</small></span><span className="settings-code">{couple.inviteCode}</span>
              </button>
              <button className="settings-row secret-settings-row" onClick={() => { setSettingsOpen(false); setSecretReturnSection('home'); setActiveSection('secret') }}>
                <span className="settings-row-icon"><Heart size={18}/></span><span><strong>Секретная комната 18+</strong><small>Приватное пространство только для вас двоих</small></span><ArrowRight size={16}/>
              </button>
              <div className="settings-row settings-row-static">
                <span className="settings-row-icon"><Languages size={18}/></span>
                <span><strong>{language === 'ru' ? 'Язык' : 'Language'}</strong><small>{language === 'ru' ? 'Язык интерфейса' : 'Interface language'}</small></span>
                <LanguageSwitcher language={language} onChange={onLanguageChange} label={language === 'ru' ? 'Язык' : 'Language'} />
              </div>
            </div>

            <div className="settings-section settings-blocks-section">
              <span className="tiny-label">{language === 'ru' ? 'БЛОКИ' : 'BLOCKS'}</span>
              <p className="settings-section-copy">{language === 'ru' ? 'Убирай ненужные блоки — настройки сохраняются для этого пространства на этом устройстве.' : 'Hide anything you do not need — settings are saved for this space on this device.'}</p>
              <div className="settings-blocks-grid">
                <div className="settings-block-group">
                  <strong>{language === 'ru' ? 'Главная' : 'Home'}</strong>
                  {([
                    ['feeling', language === 'ru' ? 'Настроение партнёра' : 'Partner feeling'],
                    ['note', language === 'ru' ? 'Записка для пары' : 'Couple note'],
                    ['photo', language === 'ru' ? 'Последнее фото' : 'Latest photo'],
                  ] as [HomeBlockId, string][]).map(([id, label]) => (
                    <button key={id} className={`settings-toggle-row ${blockVisibility.home[id] ? 'enabled' : ''}`} onClick={() => toggleHomeBlock(id)} aria-pressed={blockVisibility.home[id]}>
                      <span>{label}</span><i>{blockVisibility.home[id] ? 'Вкл' : 'Выкл'}</i>
                    </button>
                  ))}
                </div>
                <div className="settings-block-group">
                  <strong>{language === 'ru' ? 'Мы' : 'Us'}</strong>
                  {([
                    ['stats', language === 'ru' ? 'Статистика' : 'Stats'],
                    ['dates', language === 'ru' ? 'Наши даты' : 'Our dates'],
                    ['achievements', language === 'ru' ? 'Достижения' : 'Achievements'],
                    ['giftWishlist', language === 'ru' ? 'Виш-лист подарков' : 'Gift wishlist'],
                    ['entertainment', language === 'ru' ? 'Развлечения для двоих' : 'Two-person fun'],
                    ['truthRoom', language === 'ru' ? 'Комната правды' : 'Room of Truth'],
                    ['compatibility', language === 'ru' ? 'Совместимость' : 'Compatibility'],
                    ['horoscope', language === 'ru' ? 'Гороскоп' : 'Horoscope'],
                    ['secret', language === 'ru' ? 'Секретная комната' : 'Secret room'],
                  ] as [UsBlockId, string][]).map(([id, label]) => (
                    <button key={id} className={`settings-toggle-row ${blockVisibility.us[id] ? 'enabled' : ''}`} onClick={() => toggleUsBlock(id)} aria-pressed={blockVisibility.us[id]}>
                      <span>{label}</span><i>{blockVisibility.us[id] ? 'Вкл' : 'Выкл'}</i>
                    </button>
                  ))}
                </div>
              </div>
              <button className="settings-reset-blocks" onClick={() => { const next = resetBlockVisibility(couple.id); setBlockVisibility(next); }}>
                ↺ {language === 'ru' ? 'Вернуть все блоки' : 'Restore all blocks'}
              </button>
            </div>

            <div className="settings-section">
              <span className="tiny-label">{language === 'ru' ? 'СЕССИЯ' : 'SESSION'}</span>
              <button className="settings-row" onClick={() => void signOut()}>
                <span className="settings-row-icon"><LogOut size={18}/></span>
                <span><strong>{language === 'ru' ? 'Выйти из аккаунта' : 'Sign out'}</strong><small>{language === 'ru' ? 'Вернуться к экрану входа' : 'Return to sign in'}</small></span>
                <ArrowRight size={16}/>
              </button>
            </div>

            <div className="settings-danger">
              <span className="tiny-label">{language === 'ru' ? 'ОСТОРОЖНО' : 'CAREFUL'}</span>
              <h3>{language === 'ru' ? 'Покинуть пару' : 'Leave couple'}</h3>
              <p>{language === 'ru' ? 'Учётка останется, но это пространство перестанет быть твоим. Партнёр сможет продолжить пользоваться им.' : 'Your account stays, but you will no longer be a member of this space. Your partner can keep using it.'}</p>
              <button className="danger-button" disabled={leaving} onClick={() => void leave()}>{leaving ? (language === 'ru' ? 'Выходим…' : 'Leaving…') : (language === 'ru' ? 'Выйти из пары' : 'Leave couple')}</button>
            </div>

            <div className="settings-footer">
              <ShieldCheck size={16}/><span>{language === 'ru' ? 'Данные пары защищены Supabase Auth и Row Level Security.' : 'Couple data is protected by Supabase Auth and Row Level Security.'}</span>
            </div>
          </section>
        </div>
      )}

      <div className="dashboard-head dashboard-head-minimal">
        <div>
          <div className="eyebrow"><Sparkles size={15} /> USLY</div>
          <h1>{waiting ? 'Почти вдвоём.' : 'Как вы сегодня?'}</h1>
          <p>{waiting ? 'Подключите второго человека — дальше всё важное будет здесь.' : 'Сначала — то, что чувствует твой человек прямо сейчас.'}</p>
        </div>
      </div>

      <SectionErrorBoundary resetKey={activeSection} language={language}>
      {activeSection === 'feelings' ? (
        <FeelingsSection couple={couple} language={language} onBack={() => setActiveSection('home')} />
      ) : activeSection === 'moments' ? (
        <MomentsSection couple={couple} language={language} onBack={() => setActiveSection('home')} installPrompt={installPrompt} onInstall={installUsly} />
      ) : activeSection === 'chat' ? (
        <ChatSection couple={couple} language={language} onBack={() => setActiveSection('home')} onUnreadChange={setUnreadMessages} />
      ) : activeSection === 'us' ? (
        <UsSection couple={couple} language={language} theme={theme} onBack={() => setActiveSection('home')} onOpenSecret={() => { setSecretReturnSection('us'); setActiveSection('secret') }} onOpenTruth={() => setActiveSection('truth')} blockVisibility={blockVisibility.us} />
      ) : activeSection === 'truth' ? (
        <TruthRoomPage couple={couple} language={language} onBack={() => setActiveSection('us')} />
      ) : activeSection === 'profile' ? (
        <ProfileSection couple={couple} language={language} onBack={() => setActiveSection('home')} />
      ) : activeSection === 'secret' ? (
        <SecretRoomSection couple={couple} language={language} onBack={() => setActiveSection(secretReturnSection)} />
      ) : activeSection === 'home' ? (
        <>
          {!waiting && blockVisibility.home.feeling && <section className="home-feeling-hero">
            <div className="home-feeling-top"><div><span className="tiny-label">ПРЯМО СЕЙЧАС</span><h2>{partnerFeeling ? `${partnerLabel(partnerProfile?.gender, language)} ${localizedFeelingPhrase(partnerFeeling.mood, language, partnerProfile?.gender)}` : `${partnerLabel(partnerProfile?.gender, language)} ещё ничего не выбрал`}</h2></div></div>
            {partnerFeeling ? <div className="home-feeling-main"><div className="home-feeling-icon"><Heart size={30} fill="currentColor"/></div><div className="home-feeling-copy"><strong>{localizedFeelingPhrase(partnerFeeling.mood, language, partnerProfile?.gender)}</strong>{partnerFeeling.note && <p>{partnerFeeling.note}</p>}<div className="home-feeling-time">{formatRelativeTime(partnerFeeling.updatedAt, language)}</div></div></div> : <div className="home-feeling-empty">💭 Партнёр может выбрать одно актуальное чувство во вкладке «Чувства».</div>}
            <button className="primary-button wide" onClick={()=>setActiveSection('feelings')}>Открыть чувства <ArrowRight size={16}/></button>
          </section>}

          {!waiting && blockVisibility.home.note && <section className="home-note-card">
            <div className="home-note-head"><div><span className="tiny-label">ЗАПИСКА ДЛЯ ПАРЫ</span><h2>{coupleNotes[0] ? 'Для тебя ❤️' : 'Оставь маленькое сообщение'}</h2></div><Sparkles size={18}/></div>
            {coupleNotes[0] && !noteComposerOpen ? (
              <div className="home-note-body"><p>{coupleNotes[0].body}</p><small>{formatRelativeTime(coupleNotes[0].createdAt, language)}</small><div className="home-note-actions"><button className="secondary-button" onClick={()=>setNoteComposerOpen(true)}>Изменить записку</button><button className="icon-button home-note-delete" onClick={()=>void deleteCoupleNote(coupleNotes[0].id).then(()=>getCoupleNotes(couple.id)).then(r=>{if(r.ok)setCoupleNotes(r.notes)})} aria-label="Удалить"><Trash2 size={15}/></button></div></div>
            ) : (
              <div className="home-note-composer"><textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value.slice(0,500))} placeholder="Я тебя люблю, радость моя!" rows={3}/><div><small>{noteDraft.length}/500</small><button className="primary-button" disabled={noteSaving || !noteDraft.trim()} onClick={()=>void saveHomeNote()}>{noteSaving?'Сохраняем…':'Оставить записку'} <Heart size={15}/></button></div></div>
            )}
            {!coupleNotes[0] && !noteComposerOpen && <button className="primary-button wide" onClick={()=>setNoteComposerOpen(true)}>Написать милую записку <ArrowRight size={16}/></button>}
          </section>}

          {!waiting && blockVisibility.home.photo && <section className="home-photo-card" onClick={()=>setActiveSection('moments')}>
            <div className="home-photo-head"><div><span className="tiny-label">ПОСЛЕДНЕЕ ФОТО</span><h2>{latestMoment?.title || 'Ваш последний кадр'}</h2></div><ArrowRight size={17}/></div>
            {latestMoment?.imageUrl ? <img src={latestMoment.imageUrl} alt="Последнее фото пары"/> : <div className="photo-placeholder">Отправьте первое фото друг другу ❤️</div>}
          </section>}

          {waiting && <section className="waiting-card"><Heart size={24}/><h2>Ждём второго человека</h2><p>Открой настройки — там находится код пары. Отправь его партнёру.</p><button className="primary-button" onClick={()=>setSettingsOpen(true)}>Открыть настройки <Settings size={16}/></button></section>}
        </>
      ) : (
        <section className="empty-section">
          <div className="empty-icon">{nav.find(item => item.id === activeSection)?.icon}</div>
          <span className="eyebrow">СКОРО</span>
          <h2>{nav.find(item => item.id === activeSection)?.label}</h2>
          <p>Этот раздел уже заложен в структуру Usly. Сейчас закончим главный экран, а затем подключим сюда настоящие данные Supabase.</p>
          <button className="secondary-button" onClick={() => setActiveSection('home')}>Вернуться на главную</button>
        </section>
      )}
      </SectionErrorBoundary>


      {notice && <div className="toast-notice">{notice}</div>}

      <nav className="bottom-nav" aria-label="Основная навигация">
        {nav.map(item => (
          <button key={item.id} className={activeSection === item.id ? 'active' : ''} onClick={() => setActiveSection(item.id)}>
            <span className="nav-icon-wrap">{item.icon}{item.id === 'chat' && unreadMessages > 0 && <b className="nav-badge">{unreadMessages > 9 ? '9+' : unreadMessages}</b>}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>
    </main>
  )
}

class SectionErrorBoundary extends Component<{ children: ReactNode; resetKey?: string; language: Language }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: unknown) { console.error('Usly section render error', error) }
  componentDidUpdate(prevProps: Readonly<{ children: ReactNode; resetKey?: string; language: Language }>) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) this.setState({ hasError: false })
  }
  render() {
    if (this.state.hasError) {
      const ru = this.props.language === 'ru'
      return <section className="section-error-card" role="alert">
        <span className="tiny-label">USLY</span>
        <h2>{ru ? 'Что-то пошло не так' : 'Something went wrong'}</h2>
        <p>{ru ? 'Этот раздел не смог отобразиться. Остальное приложение остаётся доступным.' : 'This section could not be displayed. The rest of the app is still available.'}</p>
        <button className="secondary-button" onClick={() => this.setState({ hasError: false })}>{ru ? 'Повторить' : 'Retry'}</button>
      </section>
    }
    return this.props.children
  }
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><Heart size={18} fill="currentColor" /></span><span>Usly</span></div>
}
