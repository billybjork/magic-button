import { Emoji, createEmoji, updateEmoji, drawEmoji, bounceOffButton, bounceEmojisOffEachOther } from './emoji'

const BUTTON_RADIUS_BASE = 144 // Includes silver rim + small buffer
const MOBILE_BREAKPOINT = 768

function getScale(): number {
  return window.innerWidth <= MOBILE_BREAKPOINT ? 0.5 : 1
}

export class CanvasManager {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private emojis: Emoji[] = []
  private animationId: number | null = null

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
    for (let i = 0; i < count; i++) {
      this.emojis.push(createEmoji(this.canvas.width, this.canvas.height))
    }
  }

  private update(): void {
    const btnX = this.canvas.width / 2
    const btnY = this.canvas.height / 2
    const btnRadius = BUTTON_RADIUS_BASE * getScale()

    for (const emoji of this.emojis) {
      updateEmoji(emoji, this.canvas.width, this.canvas.height)
      bounceOffButton(emoji, btnX, btnY, btnRadius)
    }

    bounceEmojisOffEachOther(this.emojis)
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    for (const emoji of this.emojis) {
      drawEmoji(this.ctx, emoji)
    }
  }

  private loop = (): void => {
    this.update()
    this.draw()
    this.animationId = requestAnimationFrame(this.loop)
  }

  start(): void {
    if (this.animationId === null) {
      this.loop()
    }
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }
}
