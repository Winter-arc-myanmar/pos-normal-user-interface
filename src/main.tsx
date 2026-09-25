import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import './index.css'
import i18n from './lib/i18n'
import { App } from './app/App'

const POS_LAYOUT_WIDTH = 1100

function windowCssWidth() {
  const viewport = window.visualViewport
  if (!viewport) return window.innerWidth
  return viewport.width * viewport.scale
}

function fitPosViewport() {
  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) return
  const width = windowCssWidth()
  const scaled = width < POS_LAYOUT_WIDTH - 1
  document.documentElement.classList.toggle('pos-scaled', scaled)
  if (scaled) {
    const scale = Math.max(width / POS_LAYOUT_WIDTH, 0.2)
    meta.setAttribute(
      'content',
      `width=${POS_LAYOUT_WIDTH}, initial-scale=${scale}, minimum-scale=${scale}, maximum-scale=5, viewport-fit=cover`,
    )
    return
  }
  meta.setAttribute(
    'content',
    'width=device-width, initial-scale=1, viewport-fit=cover',
  )
}

fitPosViewport()
window.addEventListener('resize', fitPosViewport)
window.visualViewport?.addEventListener('resize', fitPosViewport)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
)
