import react from '@vitejs/plugin-react-swc';
import { defineConfig, swcPlugin } from 'electron-vite';

export default defineConfig({
    main: {
        build: {
            lib: {
                entry: 'src/main/main.ts'
            }
        },
        plugins: [swcPlugin()]
    },
    preload: {
        build: {
            lib: {
                entry: 'src/preload/preload.ts'
            }
        }
    },
    renderer: {
        plugins: [react()]
    },
});