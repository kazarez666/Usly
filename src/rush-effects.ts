const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

let fxLayer: HTMLDivElement | null = null
let cleanupTimers = new Set<number>()

function isRushTheme() {
  return document.documentElement.dataset.theme === 'rush'
}

function ensureLayer() {
  if (fxLayer && document.body.contains(fxLayer)) return fxLayer
  fxLayer = document.createElement('div')
  fxLayer.className = 'rush-fx-layer'
  fxLayer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(fxLayer)
  return fxLayer
}

function later(callback: () => void, delay: number) {
  const id = window.setTimeout(() => {
    cleanupTimers.delete(id)
    callback()
  }, delay)
  cleanupTimers.add(id)
}

function removeLater(node: HTMLElement, delay = 900) {
  later(() => node.remove(), delay)
}

function addFx(className: string, x: number, y: number, color: string, vars: Record<string, string> = {}, lifetime = 900) {
  const layer = ensureLayer()
  const node = document.createElement('i')
  node.className = `rush-fx ${className}`
  node.style.setProperty('--x', `${x}px`)
  node.style.setProperty('--y', `${y}px`)
  node.style.setProperty('--fx', color)
  Object.entries(vars).forEach(([name, value]) => node.style.setProperty(name, value))
  layer.appendChild(node)
  removeLater(node, lifetime)
  return node
}

function toneForButton(button: HTMLElement) {
  if (button.classList.contains('mood-yellow')) return '#ffd84a'
  if (button.classList.contains('mood-blue')) return '#24e8ff'
  if (button.classList.contains('mood-violet')) return '#9d75ff'
  if (button.classList.contains('mood-red')) return '#ff405d'
  if (button.classList.contains('mood-pink')) return '#ff4fad'
  if (button.classList.contains('primary-button')) return '#ff3ea5'
  return '#00e5ff'
}

function markPressed(button: HTMLElement) {
  button.classList.remove('rush-hit')
  // Force the highlight animation to restart even on fast repeated taps.
  void button.offsetWidth
  button.classList.add('rush-hit')
  later(() => button.classList.remove('rush-hit'), 520)
}

function smallBurst(x: number, y: number, color: string) {
  addFx('rush-fx-ring', x, y, color, {}, 620)
  addFx('rush-fx-flash', x, y, color, {}, 480)

  const rotations = [-42, -14, 13, 38]
  rotations.forEach((rotation, index) => {
    addFx('rush-fx-slash', x, y, color, {
      '--rot': `${rotation}deg`,
      '--travel': `${34 + index * 7}px`,
      '--len': `${17 + (index % 2) * 8}px`,
    }, 650)
  })
}

function moodBurst(x: number, y: number, color: string) {
  addFx('rush-fx-ring', x, y, color, {}, 650)
  addFx('rush-fx-flash', x, y, color, {}, 500)

  const rotations = [-68, -43, -21, 2, 24, 48, 72]
  rotations.forEach((rotation, index) => {
    addFx('rush-fx-slash', x, y, index % 2 ? '#00e5ff' : color, {
      '--rot': `${rotation}deg`,
      '--travel': `${45 + (index % 3) * 13}px`,
      '--len': `${20 + (index % 4) * 6}px`,
    }, 720)
  })

  const smoke = [
    [-24, -34, 22, -18],
    [18, -48, 28, 12],
    [34, -25, 19, 28],
  ]

  smoke.forEach(([dx, dy, size, rot]) => {
    addFx('rush-fx-smoke', x, y, color, {
      '--dx': `${dx}px`,
      '--dy': `${dy}px`,
      '--size': `${size}px`,
      '--rot': `${rot}deg`,
    }, 920)
  })
}

function sendStreak(y: number) {
  const layer = ensureLayer()
  const node = document.createElement('i')
  node.className = 'rush-send-streak'
  node.style.setProperty('--y', `${y}px`)
  layer.appendChild(node)
  removeLater(node, 620)
}

function navSwipe() {
  const layer = ensureLayer()
  const node = document.createElement('i')
  node.className = 'rush-nav-swipe'
  layer.appendChild(node)
  removeLater(node, 560)

  const shell = document.querySelector<HTMLElement>('.app-shell')
  if (shell) {
    shell.classList.remove('rush-route-shock')
    void shell.offsetWidth
    shell.classList.add('rush-route-shock')
    later(() => shell.classList.remove('rush-route-shock'), 420)
  }
}

function eventPoint(event: PointerEvent, target: HTMLElement) {
  if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY) && (event.clientX || event.clientY)) {
    return { x: event.clientX, y: event.clientY }
  }
  const rect = target.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function onPointerDown(event: PointerEvent) {
  if (!isRushTheme() || reduceMotion.matches) return

  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button') : null
  if (!target || target.disabled) return

  const { x, y } = eventPoint(event, target)
  const color = toneForButton(target)
  markPressed(target)

  if (target.matches('.mood-choice')) {
    moodBurst(x, y, color)
    return
  }

  if (target.matches('.feelings-send')) {
    moodBurst(x, y, '#ff3ea5')
    sendStreak(y)
    return
  }

  if (target.closest('.bottom-nav')) {
    smallBurst(x, y, '#00e5ff')
    navSwipe()
    return
  }

  if (target.matches('.primary-button')) {
    smallBurst(x, y, '#ff3ea5')
    return
  }

  if (target.matches('.secondary-button, .icon-button, .desire-options button, .shared-wishes-tabs button, .wish-status-tabs button, .randomizer-tabs button, .truth-room-categories button, .truth-status-actions button')) {
    smallBurst(x, y, color)
  }
}

document.addEventListener('pointerdown', onPointerDown, { passive: true })

window.addEventListener('pagehide', () => {
  cleanupTimers.forEach(id => window.clearTimeout(id))
  cleanupTimers = new Set<number>()
  fxLayer?.remove()
  fxLayer = null
}, { once: true })
