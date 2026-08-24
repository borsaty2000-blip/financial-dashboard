import { createRoot } from "react-dom/client";
import { App } from "@client/App";
import "@client/styles.css";

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error('Root element "#app" was not found');
}

createRoot(rootElement).render(<App />);
