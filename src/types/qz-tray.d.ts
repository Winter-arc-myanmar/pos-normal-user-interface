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
      details(): Promise<
        | Array<{ name?: string; connection?: string }>
        | { name?: string; connection?: string }
      >;
      startListening(
        printers: string[] | null,
        options?: Record<string, unknown>
      ): Promise<void>;
      stopListening(): Promise<void>;
      getStatus(): Promise<unknown>;
    };
    usb: {
      listDevices(includeHubs?: boolean): Promise<
        Array<{
          vendorId: string;
          productId: string;
          product?: string;
          manufacturer?: string;
        }>
      >;
      listInterfaces(device: {
        vendorId: string;
        productId: string;
      }): Promise<string[]>;
      listEndpoints(device: {
        vendorId: string;
        productId: string;
        interface: string;
      }): Promise<string[]>;
      claimDevice(device: {
        vendorId: string;
        productId: string;
        interface: string;
      }): Promise<void>;
      sendData(device: {
        vendorId: string;
        productId: string;
        endpoint: string;
        data: { data: string; type: string };
      }): Promise<void>;
      releaseDevice(device: { vendorId: string; productId: string }): Promise<void>;
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
