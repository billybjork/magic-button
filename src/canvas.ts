import { Emoji, createEmoji, updateEmoji, drawEmoji, bounceOffButton, bounceEmojisOffEachOther, findEmojiAtPosition } from './emoji'

const BUTTON_RADIUS_BASE = 144 // Includes silver rim + small buffer
const BUTTON_OFFSET_Y_BASE = 20 // Offset collision down to match 3D visual depth
const MOBILE_BREAKPOINT = 768

function getScale(): number {
  return window.innerWidth <= MOBILE_BREAKPOINT ? 0.75 : 1
}

// Velocity history for calculating throw velocity
interface VelocityPoint {
  x: number
  y: number
  time: number
}

const VELOCITY_HISTORY_SIZE = 5
const MAX_THROW_SPEED = 8
const MIN_THROW_SPEED = 0.5
const HOVER_SCALE_TARGET = 1.08
const GRAB_SCALE_TARGET = 1.15
const GRAB_SCALE_SPEED = 0.2

export class CanvasManager {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private emojis: Emoji[] = []

  // Drag state
  private draggedEmoji: Emoji | null = null
  private hoveredEmoji: Emoji | null = null
  private velocityHistory: VelocityPoint[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2d context')
    this.ctx = ctx

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
    this.setupDragHandlers()
  }

  private setupDragHandlers(): void {
    // Use pointer events on window for unified mouse/touch handling
    window.addEventListener('pointerdown', (e) => this.handlePointerDown(e))
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e))
    window.addEventListener('pointerup', () => this.handlePointerUp())
    window.addEventListener('pointercancel', () => this.handlePointerUp())
  }

  private handlePointerDown(e: PointerEvent): void {
    const emoji = findEmojiAtPosition(this.emojis, e.clientX, e.clientY)
    if (emoji) {
      this.draggedEmoji = emoji
      // Stop the emoji's current motion
      emoji.vx = 0
      emoji.vy = 0
      // Initialize velocity tracking
      this.velocityHistory = [{
        x: e.clientX,
        y: e.clientY,
        time: performance.now()
      }]
      // Visual feedback
      document.body.style.cursor = 'grabbing'
      // Prevent default to avoid text selection, scrolling, etc.
      e.preventDefault()
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.draggedEmoji) {
      // Update emoji position to follow pointer
      this.draggedEmoji.x = e.clientX
      this.draggedEmoji.y = e.clientY

      // Track velocity history
      const now = performance.now()
      this.velocityHistory.push({ x: e.clientX, y: e.clientY, time: now })

      // Keep only recent history
      if (this.velocityHistory.length > VELOCITY_HISTORY_SIZE) {
        this.velocityHistory.shift()
      }
    } else {
      // Track hovered emoji for cursor and scale effect
      const prevHovered = this.hoveredEmoji
      this.hoveredEmoji = findEmojiAtPosition(this.emojis, e.clientX, e.clientY)

      if (this.hoveredEmoji && !prevHovered) {
        document.body.style.cursor = 'grab'
      } else if (!this.hoveredEmoji && prevHovered) {
        document.body.style.cursor = ''
      }
    }
  }

  private handlePointerUp(): void {
    if (!this.draggedEmoji) return

    // Calculate throw velocity from recent movement
    const now = performance.now()

    if (this.velocityHistory.length >= 2) {
      // Find oldest point within reasonable timeframe (last 100ms)
      let oldestValid = this.velocityHistory[0]
      for (const point of this.velocityHistory) {
        if (now - point.time < 100) {
          oldestValid = point
          break
        }
      }

      const newest = this.velocityHistory[this.velocityHistory.length - 1]
      const dt = (newest.time - oldestValid.time) / 1000 // Convert to seconds

      if (dt > 0.001) { // Avoid division by very small numbers
        let vx = (newest.x - oldestValid.x) / dt / 60 // Convert to per-frame velocity
        let vy = (newest.y - oldestValid.y) / dt / 60

        // Clamp velocity magnitude
        const speed = Math.sqrt(vx * vx + vy * vy)
        if (speed > MAX_THROW_SPEED) {
          const scale = MAX_THROW_SPEED / speed
          vx *= scale
          vy *= scale
        } else if (speed > 0 && speed < MIN_THROW_SPEED) {
          // If barely moving, just stop
          vx = 0
          vy = 0
        }

        this.draggedEmoji.vx = vx
        this.draggedEmoji.vy = vy
      }
    }

    this.draggedEmoji = null
    this.velocityHistory = []
    // Reset cursor
    document.body.style.cursor = ''
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  spawnEmojis(count: number): void {
    // Collect currently visible emoji characters to avoid duplicates
    const onScreenChars = new Set(this.emojis.map(e => e.char))

    for (let i = 0; i < count; i++) {
      const newEmoji = createEmoji(this.canvas.width, this.canvas.height, onScreenChars)
      onScreenChars.add(newEmoji.char) // Track newly spawned emoji too
      this.emojis.push(newEmoji)
    }
  }

  getEmojis(): Emoji[] {
    return this.emojis
  }

  update(): void {
    const scale = getScale()
    const btnX = this.canvas.width / 2
    const btnY = this.canvas.height / 2 + BUTTON_OFFSET_Y_BASE * scale
    const btnRadius = BUTTON_RADIUS_BASE * scale

    for (const emoji of this.emojis) {
      // Animate grab/hover scale
      let targetScale = 1
      if (emoji === this.draggedEmoji) {
        targetScale = GRAB_SCALE_TARGET
      } else if (emoji === this.hoveredEmoji) {
        targetScale = HOVER_SCALE_TARGET
      }
      emoji.grabScale += (targetScale - emoji.grabScale) * GRAB_SCALE_SPEED

      // Skip physics for the emoji being dragged
      if (emoji === this.draggedEmoji) continue

      updateEmoji(emoji, this.canvas.width, this.canvas.height)
      bounceOffButton(emoji, btnX, btnY, btnRadius)
    }

    // Filter out dragged emoji from collision detection
    const activeEmojis = this.draggedEmoji
      ? this.emojis.filter(e => e !== this.draggedEmoji)
      : this.emojis
    bounceEmojisOffEachOther(activeEmojis)
  }

  draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    for (const emoji of this.emojis) {
      // Apply grab scale if not at rest
      if (Math.abs(emoji.grabScale - 1) > 0.001) {
        this.ctx.save()
        this.ctx.translate(emoji.x, emoji.y)
        this.ctx.scale(emoji.grabScale, emoji.grabScale)
        this.ctx.translate(-emoji.x, -emoji.y)
        drawEmoji(this.ctx, emoji)
        this.ctx.restore()
      } else {
        drawEmoji(this.ctx, emoji)
      }
    }
  }
}
