import { Emoji, createEmoji, updateEmoji, drawEmoji, bounceOffButton, bounceEmojisOffEachOther } from './emoji'

const BUTTON_RADIUS_BASE = 144 // Includes silver rim + small buffer
const BUTTON_OFFSET_Y_BASE = 20 // Offset collision down to match 3D visual depth
const MOBILE_BREAKPOINT = 768

function getScale(): number {
  return window.innerWidth <= MOBILE_BREAKPOINT ? 0.75 : 1
}

export class CanvasManager {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private emojis: Emoji[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2d context')
    this.ctx = ctx

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
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
      updateEmoji(emoji, this.canvas.width, this.canvas.height)
      bounceOffButton(emoji, btnX, btnY, btnRadius)
    }

    bounceEmojisOffEachOther(this.emojis)
  }

  draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    for (const emoji of this.emojis) {
      drawEmoji(this.ctx, emoji)
    }
  }
}
