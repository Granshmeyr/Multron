declare global {
    interface Window {
        electronAPI: {
            send: (
                channel: string,
                ...args: unknown[]
            ) => void;
            on: (
                channel: string,
                uuid: string,
                listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void,
            ) => void
            once: (
                channel: string,
                listener: (
                    event: Electron.IpcRendererEvent,
                    ...args: unknown[]
                ) => void
            ) => Electron.IpcRenderer;
            removeListener: (
                channel: string,
                uuid: string,
                listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void,
            ) => void
            isListening:(
                channel: string,
                uuid: string
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