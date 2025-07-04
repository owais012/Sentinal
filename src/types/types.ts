export interface IDatabaseResponse<T> {
    success: boolean;
    message: string | null;
    error?: string | null;
    data: T | null;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== APPROACH 1: Enhanced ApiResponse Class ====================

export interface IApiResponse<T> {
    success: boolean;
    message: string | null;
    data: T | null;
    error?: string;
    timestamp?: string;
    path?: string;
}

export class ApiResponse<T> implements IApiResponse<T> {
    public success: boolean;
    public message: string | null;
    public data: T | null;
    public error?: string;
    public timestamp?: string;
    public path?: string;

    constructor(
        success: boolean, 
        message: string | null, 
        data: T | null, 
        error?: string,
        path?: string
    ) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.error = error;
        this.timestamp = new Date().toISOString();
        this.path = path;
    }

    // Static factory methods
    public static success<T>(data: T, message?: string, path?: string): ApiResponse<T> {
        return new ApiResponse<T>(true, message || 'Success', data, undefined, path);
    }

    public static error<T>(message: string, error?: string, path?: string): ApiResponse<T> {
        return new ApiResponse<T>(false, message, null, error, path);
    }

    public static notFound<T>(message?: string, path?: string): ApiResponse<T> {
        return new ApiResponse<T>(false, message || 'Not Found', null, 'NOT_FOUND', path);
    }

    public static conflict<T>(message?: string, path?: string): ApiResponse<T> {
        return new ApiResponse<T>(false, message || 'Conflict', null, 'CONFLICT', path);
    }

    public static badRequest<T>(message?: string, path?: string): ApiResponse<T> {
        return new ApiResponse<T>(false, message || 'Bad Request', null, 'BAD_REQUEST', path);
    }

    public static created<T>(data: T, message?: string, path?: string): ApiResponse<T> {
        return new ApiResponse<T>(true, message || 'Created successfully', data, undefined, path);
    }
}