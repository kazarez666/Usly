function patchAchievementNext() {
  document.querySelectorAll<HTMLElement>('.achievement-next strong').forEach(element => {
    const text = (element.textContent ?? '').trim()
    const parts = text.split(/\s+/)
    if (parts.length >= 2 && parts[0] === parts[1] && /^\d|^1K$/i.test(parts[0])) {
      element.textContent = parts.slice(1).join(' ')
    }
  })
}

function patchWishWaitingCopy() {
  document.querySelectorAll<HTMLElement>('.wish-waiting').forEach(element => {
    const text = (element.textContent ?? '').trim()
    if (text === 'Ждём партнёра') element.textContent = 'Ждём ответа партнёра'
  })
}

function applyUiFixes() {
  patchAchievementNext()
  patchWishWaitingCopy()
}

let scheduled = false
function scheduleUiFixes() {
  if (scheduled) return
  scheduled = true
  window.requestAnimationFrame(() => {
    scheduled = false
    applyUiFixes()
  })
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleUiFixes, { once: true })
  } else {
    scheduleUiFixes()
  }

  const observer = new MutationObserver(scheduleUiFixes)
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
