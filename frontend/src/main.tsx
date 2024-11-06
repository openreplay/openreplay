import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";

import "@/assets/fonts/interVF.ttf";
import "./styles/global.css";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
