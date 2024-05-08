import { IpcListenerFunction } from "../src/common/interfaces";

declare global {
    interface Window {
        electronAPI: {
            send: (
                channel: string,
                ...args: unknown[]
            ) => void;
            on: (
                channel: string,
                listener: IpcListener
            ) => void
            once: (
                channel: string,
                listener: IpcListenerFunction
            ) => Electron.IpcRenderer;
            removeListener: (
                channel: string,
                listener: IpcListener
            ) => void
            isListening: (
                channel: string,
                listener: IpcListener
            ) => boolean
            logInfo: (
                message: string
            ) => void
            logError: (
                message: string
            ) => void
            invoke: (
                channel: string,
                ...args: unknown[]
            ) => Promise<unknown>
        };
    }
}

export { };