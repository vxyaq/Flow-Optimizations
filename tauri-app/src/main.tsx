import ReactDOM from "react-dom/client"
import App from "./App"
import ErrorBoundary from "./components/ErrorBoundary"
import { HashRouter } from "react-router-dom"
import { installTauriShim } from "./lib/tauri-shim"

installTauriShim()

if (import.meta.env.PROD) {
  const threshold = 160;
  let devtoolsOpen = false;
  
  const detectDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (!(heightThreshold && widthThreshold) && ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        console.clear();
      }
    } else {
      devtoolsOpen = false;
    }
  };
  
  setInterval(detectDevTools, 500);
  
  if (typeof console !== 'undefined') {
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.error = noop;
    console.info = noop;
    console.debug = noop;
  }
}

const rootElement = document.getElementById("root")
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <HashRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HashRouter>,
  )
}
