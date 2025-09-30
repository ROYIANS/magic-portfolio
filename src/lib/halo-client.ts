import axios, { AxiosError, AxiosInstance } from "axios";
import { createPublicApiClient } from "@halo-dev/api-client";

interface HaloClientConfig {
  baseURL: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

class HaloApiClient {
  private config: HaloClientConfig;
  private axiosInstance!: AxiosInstance;
  public publicApi: any;
  private isAvailable = false;

  constructor(config: HaloClientConfig) {
    this.config = config;
    this.setupAxiosInstance();
    this.setupApiClients();
  }

  private setupAxiosInstance(): void {
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...(process.env.HALO_API_TOKEN && {
          Authorization: `Bearer ${process.env.HALO_API_TOKEN}`,
        }),
      },
    });

    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`🔗 Halo API: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.isAvailable = true;
        return response;
      },
      async (error: AxiosError) => {
        this.isAvailable = false;
        
        if (process.env.NODE_ENV === "development") {
          console.error(`❌ Halo API Error: ${error.config?.url}`, {
            status: error.response?.status,
            message: error.response?.data || error.message,
          });
        }

        // 实现重试机制
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    const status = error.response?.status;
    return !!(status && (status === 429 || status >= 500));
  }

  private async retryRequest(error: AxiosError, retryCount = 0): Promise<any> {
    if (retryCount >= this.config.retryCount) {
      return Promise.reject(error);
    }

    await this.delay(this.config.retryDelay * Math.pow(2, retryCount));

    try {
      return await this.axiosInstance.request(error.config!);
    } catch (retryError) {
      return this.retryRequest(error, retryCount + 1);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private setupApiClients(): void {
    this.publicApi = createPublicApiClient(this.axiosInstance);
  }

  public getAvailability(): boolean {
    return this.isAvailable;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.axiosInstance.get("/actuator/health");
      this.isAvailable = true;
      return true;
    } catch (error) {
      this.isAvailable = false;
      return false;
    }
  }
}

// 创建配置
const createHaloConfig = (): HaloClientConfig => ({
  baseURL: process.env.HALO_API_BASE_URL || "http://localhost:8090",
  timeout: 10000,
  retryCount: Number(process.env.HALO_RETRY_COUNT) || 3,
  retryDelay: Number(process.env.HALO_RETRY_DELAY) || 1000,
});

// 单例实例
let haloClientInstance: HaloApiClient | null = null;

export const getHaloClient = (): HaloApiClient | null => {
  if (!process.env.HALO_API_BASE_URL || !process.env.HALO_API_TOKEN) {
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ Halo configuration missing, API client not available");
    }
    return null;
  }

  if (!haloClientInstance) {
    haloClientInstance = new HaloApiClient(createHaloConfig());
  }

  return haloClientInstance;
};

export const haloClient = getHaloClient();
export const isHaloAvailable = !!haloClient;

export type { HaloApiClient };