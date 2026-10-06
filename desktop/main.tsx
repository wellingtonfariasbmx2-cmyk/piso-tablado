import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PisoApp } from "@/components/piso-app";
import "@/styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PisoApp />
    </StrictMode>,
  );
}
