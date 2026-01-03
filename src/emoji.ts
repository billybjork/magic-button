export interface Emoji {
  x: number
  y: number
  vx: number
  vy: number
  char: string
  size: number
}

const EMOJI_POOL = [
  '🌟', '✨', '💫', '⭐', '🎉', '🎊', '💖', '🔥', '🌈', '🦋',
  '🍀', '🎈', '🎁', '🌸', '😊', '🚀', '💎', '🌙', '☀️', '🎵'
]

const MIN_SPEED = 0.75
const MAX_SPEED = 1.9
const MIN_SIZE = 36
const MAX_SIZE = 72

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomVelocity(): number {
  const speed = randomRange(MIN_SPEED, MAX_SPEED)
  return Math.random() < 0.5 ? speed : -speed
}

export function createEmoji(canvasWidth: number, canvasHeight: number): Emoji {
  const size = randomRange(MIN_SIZE, MAX_SIZE)
  return {
    x: randomRange(size, canvasWidth - size),
    y: randomRange(size, canvasHeight - size),
    vx: randomVelocity(),
    vy: randomVelocity(),
    char: EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)],
    size
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
  ctx.font = `${emoji.size}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji.char, emoji.x, emoji.y)
}

// Emojis don't fill their full bounding box, so use a tighter collision radius
const EMOJI_RADIUS_FACTOR = 0.42

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
