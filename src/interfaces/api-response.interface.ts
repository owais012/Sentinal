// interfaces/api-response.interface.ts
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  timestamp: string;
  path?: string;
}