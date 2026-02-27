export interface Emoji {
  x: number
  y: number
  vx: number
  vy: number
  char: string
  size: number
  spawnTime: number
  grabScale: number
}

const EMOJI_POOL = [
  '😎', '🫡', '🤠', '👾', '🫶', '🙌', '✌️', '🤘', '🤝', '🦾',
  '👁️', '🧠', '👀', '🤙', '🧑‍💻', '🤳', '👑', '💼', '🍀', '🌱',
  '🌞', '⚡️', '💥', '🔥', '🍾', '☕️', '🏆', '🎬', '🎧', '🎤',
  '🎟️', '🧩', '🎯', '🚀', '📱', '💻', '🖥️', '💾', '🎞️', '📺',
  '🎥', '🎛️', '🎚️', '🧭', '🕹️', '🔋', '💡', '🔌', '💸', '💰',
  '💎', '🪜', '🛠️', '🔧', '⚙️', '🔮', '🔭', '🧪', '🔑', '🎈',
  '🛍️', '🎉', '📥', '📬', '📈', '🗃️', '🗂️', '📚', '📝', '🔐',
  '❤️‍🔥', '⚛️', '💯', '🔆', '✅', '🛜', '💲', '👁️‍🗨️', '🔔', '💬'
]

const MIN_SPEED = 0.75
const MAX_SPEED = 1.9
const MIN_SIZE_BASE = 54
const MAX_SIZE_BASE = 108
const SPAWN_ANIMATION_DURATION = 500 // ms
const MOBILE_BREAKPOINT = 768

function getScale(): number {
  return window.innerWidth <= MOBILE_BREAKPOINT ? 0.75 : 1
}

// Elastic ease-out: overshoots then settles
function elasticOut(t: number): number {
  if (t === 0 || t === 1) return t
  const p = 0.4
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomVelocity(): number {
  const speed = randomRange(MIN_SPEED, MAX_SPEED)
  return Math.random() < 0.5 ? speed : -speed
}

const SPAWN_RADIUS_MIN_BASE = 225 // Spawn at least this far from button center
const SPAWN_RADIUS_MAX_BASE = 375 // Spawn at most this far from button center

export function createEmoji(canvasWidth: number, canvasHeight: number, excludeChars: Set<string> = new Set()): Emoji {
  const scale = getScale()
  const size = randomRange(MIN_SIZE_BASE * scale, MAX_SIZE_BASE * scale)

  // Spawn in a ring around the button (which is centered)
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  const angle = Math.random() * Math.PI * 2
  const distance = randomRange(SPAWN_RADIUS_MIN_BASE * scale, SPAWN_RADIUS_MAX_BASE * scale)

  const x = centerX + Math.cos(angle) * distance
  const y = centerY + Math.sin(angle) * distance

  // Filter out emojis that are already on screen
  const availableEmojis = EMOJI_POOL.filter(e => !excludeChars.has(e))
  const pool = availableEmojis.length > 0 ? availableEmojis : EMOJI_POOL

  return {
    x,
    y,
    vx: randomVelocity(),
    vy: randomVelocity(),
    char: pool[Math.floor(Math.random() * pool.length)],
    size,
    spawnTime: performance.now(),
    grabScale: 1
  }
}

export function updateEmoji(emoji: Emoji, canvasWidth: number, canvasHeight: number): void {
  emoji.x += emoji.vx
  emoji.y += emoji.vy

  // Bounce off left/right edges
  if (emoji.x <= emoji.size / 2) {
    emoji.x = emoji.size / 2
    emoji.vx *= -1
  } else if (emoji.x >= canvasWidth - emoji.size / 2) {
    emoji.x = canvasWidth - emoji.size / 2
    emoji.vx *= -1
  }

  // Bounce off top/bottom edges
  if (emoji.y <= emoji.size / 2) {
    emoji.y = emoji.size / 2
    emoji.vy *= -1
  } else if (emoji.y >= canvasHeight - emoji.size / 2) {
    emoji.y = canvasHeight - emoji.size / 2
    emoji.vy *= -1
  }
}

export function drawEmoji(ctx: CanvasRenderingContext2D, emoji: Emoji): void {
  // Calculate spawn animation scale
  const elapsed = performance.now() - emoji.spawnTime
  const t = Math.min(elapsed / SPAWN_ANIMATION_DURATION, 1)
  const scale = elasticOut(t)

  const displaySize = emoji.size * scale
  ctx.font = `${displaySize}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji.char, emoji.x, emoji.y)
}

// Emojis don't fill their full bounding box, so use a tighter collision radius
const EMOJI_RADIUS_FACTOR = 0.42

export function findEmojiAtPosition(emojis: Emoji[], x: number, y: number): Emoji | null {
  // Check in reverse order so topmost (last rendered) emoji is found first
  for (let i = emojis.length - 1; i >= 0; i--) {
    const emoji = emojis[i]
    const radius = emoji.size * EMOJI_RADIUS_FACTOR
    const dx = x - emoji.x
    const dy = y - emoji.y
    if (dx * dx + dy * dy <= radius * radius) {
      return emoji
    }
  }
  return null
}

export function bounceOffButton(
  emoji: Emoji,
  btnX: number,
  btnY: number,
  btnRadius: number
): void {
  const emojiRadius = emoji.size * EMOJI_RADIUS_FACTOR
  const dx = emoji.x - btnX
  const dy = emoji.y - btnY
  const distance = Math.sqrt(dx * dx + dy * dy)
  const minDist = btnRadius + emojiRadius

  if (distance < minDist && distance > 0) {
    // Normalize the collision normal
    const nx = dx / distance
    const ny = dy / distance

    // Reflect velocity: v' = v - 2(v · n)n
    const dot = emoji.vx * nx + emoji.vy * ny
    emoji.vx -= 2 * dot * nx
    emoji.vy -= 2 * dot * ny

    // Push emoji outside the button to prevent sticking
    emoji.x = btnX + nx * minDist
    emoji.y = btnY + ny * minDist
  }
}

export function bounceEmojisOffEachOther(emojis: Emoji[]): void {
  for (let i = 0; i < emojis.length; i++) {
    for (let j = i + 1; j < emojis.length; j++) {
      const a = emojis[i]
      const b = emojis[j]

      const dx = b.x - a.x
      const dy = b.y - a.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const minDist = a.size * EMOJI_RADIUS_FACTOR + b.size * EMOJI_RADIUS_FACTOR

      if (distance < minDist && distance > 0) {
        // Collision normal from a to b
        const nx = dx / distance
        const ny = dy / distance

        // Relative velocity of a with respect to b
        const dvx = a.vx - b.vx
        const dvy = a.vy - b.vy
        const dot = dvx * nx + dvy * ny

        // Only resolve if emojis are moving toward each other
        if (dot > 0) {
          // Simple elastic collision (equal mass)
          a.vx -= dot * nx
          a.vy -= dot * ny
          b.vx += dot * nx
          b.vy += dot * ny
        }

        // Push apart to prevent overlap
        const overlap = (minDist - distance) / 2
        a.x -= overlap * nx
        a.y -= overlap * ny
        b.x += overlap * nx
        b.y += overlap * ny
      }
    }
  }
}
