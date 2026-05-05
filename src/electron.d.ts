export interface IElectronAPI {
  sendMessage: (channel: string, data?: any) => void;
  onMessage: (channel: string, func: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}