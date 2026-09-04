let layer: HTMLDivElement | null = null
let activationTimer = 0
let lastClickAt = 0

type NavDirection = 'forward' | 'backward'

function isRush() {
  return document.documentElement.dataset.theme === 'rush'
}

function getLayer() {
  if (layer && document.body.contains(layer)) return layer
  layer = document.createElement('div')
  layer.className = 'rush-v2-fx-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)
  return layer
}

function removeAfter(node: HTMLElement, ms = 760) {
  window.setTimeout(() => node.remove(), ms)
}

function add(className: string, x: number, y: number, color: string, vars: Record<string,string> = {}, lifetime = 760) {
  const node = document.createElement('i')
  node.className = `rush-v2-fx ${className}`
  node.style.setProperty('--x', `${x}px`)
  node.style.setProperty('--y', `${y}px`)
  node.style.setProperty('--fx', color)
  for (const [name, value] of Object.entries(vars)) node.style.setProperty(name, value)
  getLayer().appendChild(node)
  removeAfter(node, lifetime)
  return node
}

function colorFor(button: HTMLElement) {
  if (button.classList.contains('mood-yellow')) return '#ffd84a'
  if (button.classList.contains('mood-blue')) return '#24e8ff'
  if (button.classList.contains('mood-violet')) return '#9d75ff'
  if (button.classList.contains('mood-red')) return '#ff405d'
  if (button.classList.contains('mood-pink')) return '#ff4fad'
  if (button.classList.contains('primary-button')) return '#ff3ea5'
  return '#00e5ff'
}

function pointFor(event: MouseEvent, button: HTMLElement) {
  if (event.clientX || event.clientY) return { x: event.clientX, y: event.clientY }
  const rect = button.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function burst(x: number, y: number, color: string, strong = false) {
  add('rush-v2-ring', x, y, color, {}, 560)
  add('rush-v2-flare', x, y, color, {}, 460)

  const angles = strong ? [-62, -31, 0, 31, 62] : [-42, 0, 42]
  angles.forEach((angle, index) => {
    add('rush-v2-stroke', x, y, index % 2 ? '#00e5ff' : color, {
      '--rot': `${angle}deg`,
      '--travel': `${46 + index * 5}px`,
      '--len': `${26 + (index % 2) * 8}px`,
    }, 600)
  })

  if (strong) {
    add('rush-v2-smoke', x, y, color, {
      '--dx': '24px',
      '--dy': '-54px',
      '--size': '48px',
      '--rot': '14deg',
    }, 720)
  }
}

function screenCut(y: number) {
  const node = document.createElement('i')
  node.className = 'rush-v2-screen-cut'
  node.style.setProperty('--y', `${y}px`)
  getLayer().appendChild(node)
  removeAfter(node, 540)
}

function navDirection(button: HTMLButtonElement): NavDirection {
  const nav = button.closest('.bottom-nav')
  if (!nav) return 'forward'
  const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>('button'))
  const targetIndex = buttons.indexOf(button)
  const currentIndex = buttons.findIndex(item => item.classList.contains('active'))
  if (currentIndex < 0 || targetIndex < 0 || targetIndex === currentIndex) return 'forward'
  return targetIndex > currentIndex ? 'forward' : 'backward'
}

function fullScreenNavSwipe(direction: NavDirection) {
  const fx = getLayer()
  fx.querySelectorAll('.rush-v2-nav-transition').forEach(node => node.remove())

  const node = document.createElement('i')
  node.className = `rush-v2-nav-transition rush-v2-nav-${direction}`
  fx.appendChild(node)
  removeAfter(node, 520)
}

function activationSweep() {
  if (!isRush()) return
  window.clearTimeout(activationTimer)
  activationTimer = window.setTimeout(() => {
    if (!isRush() || document.visibilityState !== 'visible') return
    const node = document.createElement('i')
    node.className = 'rush-v2-activation'
    getLayer().appendChild(node)
    removeAfter(node, 520)
  }, 60)
}

function pop(button: HTMLElement) {
  button.classList.remove('rush-v2-pop')
  void button.offsetWidth
  button.classList.add('rush-v2-pop')
  window.setTimeout(() => button.classList.remove('rush-v2-pop'), 360)
}

function onClick(event: MouseEvent) {
  if (!isRush() || document.visibilityState !== 'visible') return

  const now = performance.now()
  if (now - lastClickAt < 90) return
  lastClickAt = now

  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null
  if (!button || button.disabled) return

  const { x, y } = pointFor(event, button)
  const color = colorFor(button)
  pop(button)

  if (button.closest('.bottom-nav')) {
    fullScreenNavSwipe(navDirection(button))
    return
  }

  if (button.matches('.mood-choice')) {
    burst(x, y, color, true)
    return
  }

  if (button.matches('.feelings-send')) {
    burst(x, y, '#ff3ea5', true)
    screenCut(y)
    return
  }

  if (button.matches('.primary-button')) {
    burst(x, y, '#ff3ea5')
    return
  }

  if (button.matches('.secondary-button, .icon-button, .desire-options button, .shared-wishes-tabs button, .wish-status-tabs button, .randomizer-tabs button, .truth-room-categories button, .truth-status-actions button')) {
    burst(x, y, color)
  }
}

document.addEventListener('click', onClick, true)

const themeObserver = new MutationObserver((records) => {
  if (records.some(record => record.attributeName === 'data-theme')) activationSweep()
})

themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', activationSweep, { once: true })
} else {
  activationSweep()
}

window.addEventListener('pagehide', () => {
  themeObserver.disconnect()
  document.removeEventListener('click', onClick, true)
  layer?.remove()
  layer = null
  window.clearTimeout(activationTimer)
}, { once: true })
