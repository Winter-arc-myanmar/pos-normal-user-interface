declare module "qz-tray" {
  type QzConfig = unknown;

  const qz: {
    websocket: {
      isActive(): boolean;
      connect(options?: {
        retries?: number;
        delay?: number;
        usingSecure?: boolean;
      }): Promise<void>;
      disconnect(): Promise<void>;
    };
    printers: {
      find(query?: string): Promise<string[] | string>;
    };
    configs: {
      create(
        printer:
          | string
          | { host: string; port: number },
        options?: Record<string, unknown>
      ): QzConfig;
    };
    print(
      config: QzConfig,
      data: Array<Record<string, unknown>>
    ): Promise<void>;
  };

  export default qz;
}
