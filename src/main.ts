import { CanvasManager } from './canvas'
import { DitherEffect } from './effects/dither'

const canvas = document.getElementById('canvas') as HTMLCanvasElement

const manager = new CanvasManager(canvas)

// Start with some emojis
manager.spawnEmojis(5)
manager.start()

// Start dither effect
const dither = new DitherEffect(canvas)
dither.start()

// Handle clicks on the button area
const BTN_RADIUS = 135
canvas.parentElement!.addEventListener('click', (e) => {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const dx = e.clientX - cx
  const dy = e.clientY - cy
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance <= BTN_RADIUS) {
    manager.spawnEmojis(1)
  }
})
