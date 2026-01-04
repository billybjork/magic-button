// 4x4 Bayer ordered dithering matrix (normalized 0-1)
const BAYER_4X4 = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16],
]

const BTN_SIZE_BASE = 270
const BTN_DEPTH_BASE = 21
const BTN_RADIUS_BASE = 135
const MOBILE_BREAKPOINT = 768

function getScale(): number {
  return window.innerWidth <= MOBILE_BREAKPOINT ? 0.5 : 1
}

export class DitherEffect {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private sourceCanvas: HTMLCanvasElement
  private animationId: number | null = null
  private pixelSize = 1 // No pixelation, just dithering
  private colorLevels = 3 // Moderate color gradations
  private ditherStrength = 0.7 // Moderate pattern strength

  // Button interaction state
  private isHovering = false
  private isPressed = false

  // Animated values (for smooth transitions)
  private animatedPress = 0 // 0 = not pressed, 1 = fully pressed
  private animatedHover = 0 // 0 = not hovering, 1 = fully hovering

  constructor(sourceCanvas: HTMLCanvasElement) {
    this.sourceCanvas = sourceCanvas
    this.canvas = document.createElement('canvas')
    this.canvas.id = 'dither-canvas'
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!
    document.body.appendChild(this.canvas)
    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
    this.setupInteraction()
  }

  private isOverButton(x: number, y: number): boolean {
    const cx = this.canvas.width / 2
    const cy = this.canvas.height / 2
    const dx = x - cx
    const dy = y - cy
    return Math.sqrt(dx * dx + dy * dy) <= BTN_RADIUS_BASE * getScale()
  }

  private setupInteraction(): void {
    // Use pointer events for unified mouse/touch handling
    window.addEventListener('pointermove', (e) => {
      const wasHovering = this.isHovering
      this.isHovering = this.isOverButton(e.clientX, e.clientY)

      if (this.isHovering !== wasHovering) {
        document.body.style.cursor = this.isHovering ? 'pointer' : ''
      }
    })

    window.addEventListener('pointerdown', (e) => {
      if (this.isOverButton(e.clientX, e.clientY)) {
        this.isPressed = true
        // On touch devices, also set hovering to true when pressed
        this.isHovering = true
      }
    })

    window.addEventListener('pointerup', (e) => {
      this.isPressed = false
      // On touch devices, reset hover state when finger is lifted
      if (e.pointerType === 'touch') {
        this.isHovering = false
      }
    })

    window.addEventListener('pointercancel', () => {
      this.isPressed = false
      this.isHovering = false
    })

    window.addEventListener('pointerleave', () => {
      this.isHovering = false
      this.isPressed = false
      document.body.style.cursor = ''
    })
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  start(): void {
    const loop = () => {
      this.applyDither()
      this.animationId = requestAnimationFrame(loop)
    }
    loop()
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private updateAnimations(): void {
    // Smooth transitions using lerp
    const hoverSpeed = 0.15
    const pressSpeed = 0.25
    const releaseSpeed = 0.12

    const targetHover = this.isHovering ? 1 : 0
    const targetPress = this.isPressed ? 1 : 0

    this.animatedHover += (targetHover - this.animatedHover) * hoverSpeed

    const pressLerpSpeed = this.isPressed ? pressSpeed : releaseSpeed
    this.animatedPress += (targetPress - this.animatedPress) * pressLerpSpeed
  }

  private drawButton(): void {
    const scale = getScale()
    const cx = this.canvas.width / 2
    const cy = this.canvas.height / 2
    const radius = (BTN_SIZE_BASE / 2) * scale
    const depth = BTN_DEPTH_BASE * scale

    // Calculate animated press offset
    const pressOffset = this.animatedPress * 15 * scale
    const shadowY = depth + 6 * scale - (this.animatedPress * 18 * scale)

    // Shadow
    this.ctx.save()
    this.ctx.filter = 'blur(12px)'
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.beginPath()
    this.ctx.arc(cx, cy + shadowY, radius, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.restore()

    // Chrome edge
    const edgeGradient = this.ctx.createLinearGradient(cx, cy - radius, cx, cy + radius)
    edgeGradient.addColorStop(0, '#f5f5f5')
    edgeGradient.addColorStop(0.1, '#e8e8e8')
    edgeGradient.addColorStop(0.3, '#d0d0d0')
    edgeGradient.addColorStop(0.5, '#a8a8a8')
    edgeGradient.addColorStop(0.7, '#888888')
    edgeGradient.addColorStop(0.9, '#707070')
    edgeGradient.addColorStop(1, '#606060')

    this.ctx.fillStyle = edgeGradient
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    this.ctx.fill()

    // Red dome (front) - moves down when pressed
    const domeRadius = radius - 21 * scale
    const domeY = cy - depth + pressOffset

    // Brighten colors on hover (animated)
    const brightness = 1.0 + (this.animatedHover * 0.1)
    const brighten = (hex: string) => {
      const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * brightness))
      const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * brightness))
      const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * brightness))
      return `rgb(${r}, ${g}, ${b})`
    }

    const domeGradient = this.ctx.createLinearGradient(cx, domeY - domeRadius, cx, domeY + domeRadius)
    domeGradient.addColorStop(0, brighten('#ff5252'))
    domeGradient.addColorStop(0.2, brighten('#f44336'))
    domeGradient.addColorStop(0.4, brighten('#e53935'))
    domeGradient.addColorStop(0.6, brighten('#d32f2f'))
    domeGradient.addColorStop(0.8, brighten('#c62828'))
    domeGradient.addColorStop(1, brighten('#b71c1c'))

    this.ctx.fillStyle = domeGradient
    this.ctx.beginPath()
    this.ctx.arc(cx, domeY, domeRadius, 0, Math.PI * 2)
    this.ctx.fill()

    // Glossy highlight
    const highlightGradient = this.ctx.createRadialGradient(
      cx - domeRadius * 0.3, domeY - domeRadius * 0.3, 0,
      cx - domeRadius * 0.3, domeY - domeRadius * 0.3, domeRadius * 0.8
    )
    const highlightAlpha = 0.6 + (this.animatedHover * 0.1)
    highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${highlightAlpha})`)
    highlightGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)')
    highlightGradient.addColorStop(1, 'transparent')

    this.ctx.fillStyle = highlightGradient
    this.ctx.beginPath()
    this.ctx.arc(cx, domeY, domeRadius, 0, Math.PI * 2)
    this.ctx.fill()

    // Text
    this.ctx.fillStyle = 'white'
    this.ctx.font = `900 ${33 * scale}px "Arial Black", "Helvetica Neue", sans-serif`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    this.ctx.shadowBlur = 4 * scale
    this.ctx.shadowOffsetY = 3 * scale
    this.ctx.fillText('COMING', cx, domeY - 18 * scale)
    this.ctx.fillText('SOON', cx, domeY + 18 * scale)
    this.ctx.shadowColor = 'transparent'
  }

  private applyDither(): void {
    // Update animation states
    this.updateAnimations()

    const width = this.canvas.width
    const height = this.canvas.height
    const px = this.pixelSize

    // Fill with light gray background so dither pattern is visible
    this.ctx.fillStyle = '#ebebeb'
    this.ctx.fillRect(0, 0, width, height)

    // Draw source canvas (emojis)
    this.ctx.drawImage(this.sourceCanvas, 0, 0)

    // Draw button on top
    this.drawButton()

    // Get image data for pixel manipulation
    const imageData = this.ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    const levels = this.colorLevels
    const strength = this.ditherStrength

    // Process in blocks for coarser effect
    for (let by = 0; by < height; by += px) {
      for (let bx = 0; bx < width; bx += px) {
        // Sample center of block
        const sx = Math.min(bx + Math.floor(px / 2), width - 1)
        const sy = Math.min(by + Math.floor(px / 2), height - 1)
        const si = (sy * width + sx) * 4

        // Get Bayer threshold for this block
        const threshold = (BAYER_4X4[(by / px) % 4][(bx / px) % 4] - 0.5) * strength

        // Calculate dithered color for this block
        const r = data[si] / 255
        const g = data[si + 1] / 255
        const b = data[si + 2] / 255

        const newR = Math.round((r + threshold) * (levels - 1)) / (levels - 1)
        const newG = Math.round((g + threshold) * (levels - 1)) / (levels - 1)
        const newB = Math.round((b + threshold) * (levels - 1)) / (levels - 1)

        const finalR = Math.max(0, Math.min(255, newR * 255))
        const finalG = Math.max(0, Math.min(255, newG * 255))
        const finalB = Math.max(0, Math.min(255, newB * 255))

        // Apply to all pixels in block
        for (let py = by; py < Math.min(by + px, height); py++) {
          for (let pxx = bx; pxx < Math.min(bx + px, width); pxx++) {
            const i = (py * width + pxx) * 4
            data[i] = finalR
            data[i + 1] = finalG
            data[i + 2] = finalB
            data[i + 3] = 255
          }
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0)
  }
}
