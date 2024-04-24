import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: "src/main/main.ts"
      }
    },
  },
  preload: {
    build: {
      lib: {
        entry: "src/preload/preload.ts"
      }
    }
  },
  renderer: {
    plugins: [react()]
  },
});