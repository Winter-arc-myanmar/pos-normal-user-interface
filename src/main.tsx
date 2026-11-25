import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import './index.css'
import i18n from './lib/i18n'
import { App } from './app/App'
import { isMedianAppShell } from './lib/printing/medianBridge'
import { probePrintAgent } from './lib/printing/printAgent'
import { isBrowserPrinting } from './core/infrastructure/printing/PrinterClient'

if (isMedianAppShell()) {
  document.documentElement.classList.add('median-app')
}

// Decides whether this computer prints through the desktop agent or QZ Tray.
// It must not delay the first paint, so it runs in the background; the print
// client awaits the same probe before choosing an engine. Phones and the Median
// shell print in the browser, so they never ask the loopback agent.
if (!isBrowserPrinting()) {
  void probePrintAgent()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
)
