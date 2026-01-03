import { CanvasManager } from './canvas'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const button = document.getElementById('spawn-btn') as HTMLButtonElement

const manager = new CanvasManager(canvas)

// Start with some emojis
manager.spawnEmojis(5)
manager.start()

// Spawn more on button click
button.addEventListener('click', () => {
  const count = Math.floor(Math.random() * 3) + 3 // 3-5 emojis
  manager.spawnEmojis(count)
})
