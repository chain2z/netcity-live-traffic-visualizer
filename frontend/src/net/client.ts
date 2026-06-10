import { decodeMessage } from "./decode";
import type { WSMessage } from "../types/messages";

export interface CitySocketOptions {
  url?: string;
  onMessage: (message: WSMessage) => void;
  onConnectionState?: (state: "connecting" | "open" | "closed") => void;
}

export class CitySocket {
  private socket: WebSocket | null = null;
  private retry = 0;
  private stopped = false;
  private readonly url: string;

  constructor(private readonly options: CitySocketOptions) {
    this.url =
      options.url ??
      import.meta.env.VITE_WS_URL ??
      `${window.location.protocol === "https:" ? "wss" : "ws"}://localhost:8000/ws/stream`;
  }

  connect() {
    this.stopped = false;
    this.options.onConnectionState?.("connecting");
    this.socket = new WebSocket(this.url);
    this.socket.onopen = () => {
      this.retry = 0;
      this.options.onConnectionState?.("open");
    };
    this.socket.onmessage = (event) => {
      this.options.onMessage(decodeMessage(event.data));
    };
    this.socket.onclose = () => {
      this.options.onConnectionState?.("closed");
      if (!this.stopped) {
        const delay = Math.min(1000 * 2 ** this.retry, 8000);
        this.retry += 1;
        window.setTimeout(() => this.connect(), delay);
      }
    };
  }

  close() {
    this.stopped = true;
    this.socket?.close();
  }
}
