import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import SpatialApp from "./SpatialApp";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SpatialApp />
    <Analytics />
  </StrictMode>,
);
