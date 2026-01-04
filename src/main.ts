import { CanvasManager } from './canvas'
import { DitherEffect } from './effects/dither'

const canvas = document.getElementById('canvas') as HTMLCanvasElement

const manager = new CanvasManager(canvas)

// Start with some emojis
manager.spawnEmojis(5)

// Dither effect (no separate loop - we'll drive it from one unified loop)
const dither = new DitherEffect(canvas)

// Single unified animation loop instead of three separate ones
function mainLoop() {
  manager.update()
  manager.draw()
  dither.setEmojis(manager.getEmojis())
  dither.render()
  requestAnimationFrame(mainLoop)
}
mainLoop()

// Handle clicks on the button area
const BTN_RADIUS_BASE = 135
const MOBILE_BREAKPOINT = 768

canvas.parentElement!.addEventListener('click', (e) => {
  const scale = window.innerWidth <= MOBILE_BREAKPOINT ? 0.5 : 1
  const btnRadius = BTN_RADIUS_BASE * scale
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const dx = e.clientX - cx
  const dy = e.clientY - cy
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance <= btnRadius) {
    manager.spawnEmojis(1)
  }
})
