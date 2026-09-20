import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initYaGamesSDK } from "./yandex-sdk";

// Render app immediately
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

// Initialize Yandex SDK in background (non-blocking)
initYaGamesSDK().catch((error) => {
  console.warn('Yandex SDK initialization failed:', error);
});
