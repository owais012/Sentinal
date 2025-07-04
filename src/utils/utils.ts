/*
 * Logger
 */
export class Logger {
    private static instance: Logger;

    private constructor() {}

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public log(message: any): void {
        console.log(message);
    }

    public error(message: any): void {
        console.error(message);
    }

    private logWithColor(message: string, color: string): void {
        console.log(`${color}%s\x1b[0m`, message);
    }

    public logWarning(message: string): void {
        this.logWithColor(`Warning: ${message}`, '\x1b[33m'); // Yellow
    }

    public logError(message: string): void {
        this.logWithColor(`Error: ${message}`, '\x1b[31m'); // Red
    }
    public logSuccess(message: string): void {
        this.logWithColor(`Success: ${message}`, '\x1b[32m'); // Green
    }
}
