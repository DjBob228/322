import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initYaGamesSDK } from "./yandex-sdk";
import "./cheats"; // Инициализация чит-кодов

// Initialize Yandex SDK before rendering the app
initYaGamesSDK().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
});
