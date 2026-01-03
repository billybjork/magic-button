import { CanvasManager } from './canvas'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const button = document.getElementById('spawn-btn') as HTMLButtonElement

const manager = new CanvasManager(canvas)

// Start with some emojis
manager.spawnEmojis(5)
manager.start()

// Spawn one emoji on button click
button.addEventListener('click', () => {
  manager.spawnEmojis(1)
})
