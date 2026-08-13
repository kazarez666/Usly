export type HoroscopeLanguage = 'ru' | 'en'

export type DailyHoroscope = {
  date: string
  sign: string
  text: string
  source: 'freehoroscopeapi' | 'usly-fallback'
}

const SIGN_MAP: Record<string, { api: string; ru: string; en: string }> = {
  aries: { api: 'aries', ru: 'Овен', en: 'Aries' },
  taurus: { api: 'taurus', ru: 'Телец', en: 'Taurus' },
  gemini: { api: 'gemini', ru: 'Близнецы', en: 'Gemini' },
  cancer: { api: 'cancer', ru: 'Рак', en: 'Cancer' },
  leo: { api: 'leo', ru: 'Лев', en: 'Leo' },
  virgo: { api: 'virgo', ru: 'Дева', en: 'Virgo' },
  libra: { api: 'libra', ru: 'Весы', en: 'Libra' },
  scorpio: { api: 'scorpio', ru: 'Скорпион', en: 'Scorpio' },
  sagittarius: { api: 'sagittarius', ru: 'Стрелец', en: 'Sagittarius' },
  capricorn: { api: 'capricorn', ru: 'Козерог', en: 'Capricorn' },
  aquarius: { api: 'aquarius', ru: 'Водолей', en: 'Aquarius' },
  pisces: { api: 'pisces', ru: 'Рыбы', en: 'Pisces' },
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm' }).format(new Date())
}

function cacheKey(sign: string, language: HoroscopeLanguage) {
  return `usly-horoscope:${todayKey()}:${sign}:${language}`
}

export function zodiacToHoroscopeSign(sign: string | null | undefined) {
  return sign ? SIGN_MAP[sign]?.api ?? null : null
}

export function zodiacLabel(sign: string, language: HoroscopeLanguage) {
  return SIGN_MAP[sign]?.[language] ?? sign
}



const FALLBACKS: Record<string, { ru: string[]; en: string[] }> = {
  aries: { ru: ['Сегодня лучше действовать смело, но без спешки. В отношениях особенно хорошо работает честный разговор и маленькая инициатива.', 'День подходит для новых идей и приятных сюрпризов. Не держи важные мысли при себе — близкий человек готов тебя услышать.', 'Энергии достаточно для того, чтобы сдвинуть с места то, что давно откладывалось. В любви выбирай прямоту вместо догадок.'], en: ['Today rewards courage without rushing. Honest conversation and a small initiative can make your relationship warmer.', 'A good day for fresh ideas and sweet surprises. Say what you mean — someone close is ready to listen.', 'You have enough energy to move something forward. In love, choose clarity over guessing.'] },
  taurus: { ru: ['Сегодня ценность простых вещей особенно заметна. Устройте спокойный вечер вдвоём и не торопитесь никуда.', 'Хороший день для заботы о себе и партнёре. Тёплый жест сегодня может запомниться надолго.', 'Не нужно всё контролировать. Доверься человеку рядом и дай отношениям немного лёгкости.'], en: ['Simple things feel especially valuable today. Slow down and enjoy a calm moment together.', 'A good day for caring for yourself and your partner. A warm gesture can stay in memory for a long time.', 'You do not need to control everything. Trust the person beside you and leave room for ease.'] },
  gemini: { ru: ['Сегодня разговоры могут неожиданно сблизить вас. Поделись тем, что обычно оставляешь при себе.', 'Любопытство ведёт тебя в правильную сторону. Попробуйте вместе что-нибудь новое.', 'День быстрых мыслей и живого общения. Не забывай не только говорить, но и внимательно слушать.'], en: ['A conversation today can bring you closer than expected. Share something you usually keep to yourself.', 'Curiosity is pointing you in the right direction. Try something new together.', 'It is a lively day for thoughts and communication. Remember to listen as much as you speak.'] },
  cancer: { ru: ['Сегодня особенно важны безопасность и эмоциональная близость. Не бойся попросить о поддержке.', 'Твоя интуиция хорошо считывает настроение близкого человека. Доверься ей, но не додумывай лишнего.', 'Домашняя атмосфера сегодня лечит лучше суеты. Создай для вас двоих маленькое уютное пространство.'], en: ['Emotional safety and closeness matter most today. Do not be afraid to ask for support.', 'Your intuition is good at reading the mood of someone close. Trust it, but do not overthink.', 'A cozy atmosphere can do more good than rushing around. Create a small space just for the two of you.'] },
  leo: { ru: ['Сегодня тебе легко быть заметным. Направь это внимание не только на себя — партнёру тоже приятно чувствовать себя особенным.', 'День подходит для романтической инициативы. Не жди идеального момента — создай его.', 'Твоя уверенность заразительна. Используй её, чтобы поднять настроение вам обоим.'], en: ['You naturally stand out today. Share that attention too — your partner wants to feel special.', 'A good day for romantic initiative. Do not wait for the perfect moment; create it.', 'Your confidence is contagious. Use it to lift both of your moods.'] },
  virgo: { ru: ['Сегодня маленькая забота скажет больше длинных речей. Обрати внимание на детали.', 'Не пытайся сделать всё идеально. В отношениях сейчас важнее искренность.', 'Хороший день, чтобы спокойно обсудить планы и договориться о том, чего хочется вам обоим.'], en: ['A small act of care can say more than a long speech today. Notice the details.', 'Do not try to make everything perfect. Sincerity matters more in relationships right now.', 'A good day to calmly discuss plans and what you both want.'] },
  libra: { ru: ['Сегодня легко найти общий язык. Если между вами есть напряжение, мягкий разговор поможет его снять.', 'Баланс начинается с честного ответа на вопрос: чего хочешь именно ты?', 'Романтика сегодня любит красоту и внимание. Сделай обычный момент немного особенным.'], en: ['Finding common ground is easier today. If there is tension, a gentle conversation can ease it.', 'Balance starts with an honest answer to one question: what do you actually want?', 'Romance enjoys beauty and attention today. Make an ordinary moment feel a little special.'] },
  scorpio: { ru: ['Сегодня чувства могут быть особенно сильными. Не прячь их за холодностью — близость требует открытости.', 'Хороший день для честного разговора о желаниях и границах.', 'Твоя глубина сегодня — сила. Используй её, чтобы лучше понять человека рядом.'], en: ['Feelings may run deep today. Do not hide them behind distance; closeness needs openness.', 'A good day for an honest talk about desires and boundaries.', 'Your depth is a strength today. Use it to understand the person beside you better.'] },
  sagittarius: { ru: ['Сегодня отношениям не помешает немного приключений. Спонтанная идея может стать лучшим воспоминанием дня.', 'Не усложняй. Иногда счастливый вечер начинается с простого «поехали куда-нибудь».', 'Тебе нужен воздух и движение. Возьми партнёра с собой и придумайте что-нибудь новое.'], en: ['Your relationship could use a little adventure today. A spontaneous idea may become the best memory of the day.', 'Do not overcomplicate things. Sometimes a happy evening starts with “let’s go somewhere.”', 'You need movement and fresh air. Bring your partner along and try something new.'] },
  capricorn: { ru: ['Сегодня стабильность — твой плюс. Покажи партнёру, что на тебя можно рассчитывать.', 'Хороший день, чтобы превратить один общий план в конкретный шаг.', 'Не забывай отмечать то хорошее, что уже построено вместе.'], en: ['Stability is your strength today. Show your partner they can rely on you.', 'A good day to turn one shared plan into a concrete step.', 'Remember to appreciate the good things you have already built together.'] },
  aquarius: { ru: ['Сегодня необычная идея может сделать отношения интереснее. Разреши себе немного нарушить привычный сценарий.', 'Партнёру может быть интересно узнать твою неожиданную сторону. Поделись ею.', 'Свобода и близость не противоречат друг другу. Дай друг другу немного пространства без потери контакта.'], en: ['An unusual idea can make your relationship more exciting today. Break the routine a little.', 'Your partner may enjoy seeing an unexpected side of you. Let them.', 'Freedom and closeness can coexist. Give each other room without losing connection.'] },
  pisces: { ru: ['Сегодня интуиция и эмпатия особенно сильны. Обрати внимание не только на слова, но и на настроение близкого человека.', 'День хорош для нежности, музыки и спокойного времени вдвоём.', 'Не стесняйся говорить о своих чувствах. Искренность сегодня создаёт особенно тёплую связь.'], en: ['Your intuition and empathy are especially strong today. Notice not only words, but the mood of someone close.', 'A good day for tenderness, music, and quiet time together.', 'Do not be shy about your feelings. Sincerity can create an especially warm connection today.'] },
}

function fallbackHoroscope(sign: string, language: HoroscopeLanguage): DailyHoroscope {
  const date = todayKey()
  const dayNumber = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86400000)
  const pool = FALLBACKS[sign] ?? FALLBACKS.pisces
  const texts = pool[language]
  return {
    date,
    sign: zodiacLabel(sign, language),
    text: texts[Math.abs(dayNumber) % texts.length],
    source: 'usly-fallback',
  }
}

export async function getDailyHoroscope(sign: string | null | undefined, language: HoroscopeLanguage, forceRefresh = false): Promise<{ ok: true; horoscope: DailyHoroscope } | { ok: false; error: string }> {
  const apiSign = zodiacToHoroscopeSign(sign)
  if (!apiSign) return { ok: false, error: 'ZODIAC_NOT_SET' }

  const key = cacheKey(apiSign, language)
  try {
    if (forceRefresh) localStorage.removeItem(key)
    const cached = forceRefresh ? null : localStorage.getItem(key)
    if (cached) {
      const parsed = JSON.parse(cached) as DailyHoroscope
      if (parsed?.text && parsed.date === todayKey()) return { ok: true, horoscope: parsed }
    }
  } catch {
    // Ignore malformed local cache and fetch a fresh reading.
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8000)
  try {
    const url = new URL('https://freehoroscopeapi.com/api/v1/get-horoscope/daily')
    url.searchParams.set('sign', apiSign)
    url.searchParams.set('date', todayKey())
    url.searchParams.set('_', String(Date.now()))
    const response = await fetch(url.toString(), { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' } })
    if (!response.ok) return { ok: true, horoscope: fallbackHoroscope(apiSign, language) }
    const payload = await response.json() as { data?: { date?: string; sign?: string; horoscope?: string } }
    const text = payload.data?.horoscope?.trim()
    if (!text || (payload.data?.date && payload.data.date !== todayKey())) return { ok: true, horoscope: fallbackHoroscope(apiSign, language) }

    const horoscope: DailyHoroscope = {
      date: todayKey(),
      sign: payload.data?.sign ?? zodiacLabel(apiSign, language),
      text,
      source: 'freehoroscopeapi',
    }
    try { localStorage.setItem(key, JSON.stringify(horoscope)) } catch { /* cache is optional */ }
    return { ok: true, horoscope }
  } catch (error) {
    // The public API can be unavailable or blocked by a browser/network policy.
    // Keep the feature useful with a deterministic daily in-app fallback.
    return { ok: true, horoscope: fallbackHoroscope(apiSign, language) }
  } finally {
    window.clearTimeout(timeout)
  }
}
