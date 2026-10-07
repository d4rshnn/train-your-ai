import type { Example } from '../../data/examples'

const urls = import.meta.glob('../../assets/images/*/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

/** "train/train-01-….webp" -> bundled URL. Images are local files; nothing is fetched from the network. */
const byTail = new Map(Object.entries(urls).map(([path, url]) => [path.split('/').slice(-2).join('/'), url]))

export function imageUrl(example: Example): string | undefined {
  return byTail.get(example.file.split('/').slice(-2).join('/'))
}

let preloaded = false

/** Decode every example image once, early (local files, no network), so screens that show them never hitch on first paint. */
export function preloadImages(examples: Example[]): void {
  if (preloaded) return
  preloaded = true
  for (const e of examples) {
    const url = imageUrl(e)
    if (!url) continue
    const img = new Image()
    img.src = url
    void img.decode().catch(() => undefined)
  }
}
