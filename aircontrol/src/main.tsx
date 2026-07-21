import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Let React own scroll position on hash links — the browser's native
// scroll restoration otherwise races our anchor scroll and wins on hard loads.
if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

createRoot(document.getElementById("root")!).render(<App />);
