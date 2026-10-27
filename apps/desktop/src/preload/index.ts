/**
 * The only bridge between the interface and the main process. It exposes
 * one method, invoke, limited to the channels in @kiungo/api.
 */
import { contextBridge, ipcRenderer } from "electron";
import { isInvokeChannel, type KiungoBridge } from "@kiungo/api";

const bridge: KiungoBridge = {
  invoke: (channel, ...args) => {
    if (!isInvokeChannel(channel)) return Promise.reject(new Error(`Unknown channel ${String(channel)}`));
    return ipcRenderer.invoke(channel, ...args);
  },
};

contextBridge.exposeInMainWorld("kiungo", bridge);
