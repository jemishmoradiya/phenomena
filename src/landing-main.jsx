import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import LandingApp from "./LandingApp";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LandingApp />
    <Analytics />
  </StrictMode>,
);
