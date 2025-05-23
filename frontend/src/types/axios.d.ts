import { AxiosRequestConfig } from 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorHandler?: boolean;
    showSuccessMessage?: boolean;
    successMessage?: string;
  }
} 