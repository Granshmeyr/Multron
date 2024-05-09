// electron.vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      lib: {
        entry: "src/main/main.ts"
      }
    }
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
  }
});
export {
  electron_vite_config_default as default
};
