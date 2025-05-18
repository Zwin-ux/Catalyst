import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LoggerOptions {
  name?: string;
  level?: LogLevel;
  timestamp?: boolean;
}

export class Logger {
  private static readonly LEVELS = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3
  };

  private readonly name: string;
  private readonly level: number;
  private readonly showTimestamp: boolean;

  constructor(options: string | LoggerOptions = {}) {
    if (typeof options === 'string') {
      options = { name: options };
    }

    this.name = options.name || 'Logger';
    this.level = options.level 
      ? Logger.LEVELS[options.level] 
      : Logger.LEVELS[process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG];
    this.showTimestamp = options.timestamp !== false;
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (Logger.LEVELS[level] < this.level) return;

    const timestamp = this.showTimestamp ? `[${new Date().toISOString()}] ` : '';
    const prefix = `[${this.name}]`;
    const levelStr = `[${level.toUpperCase()}]`;
    
    let logMethod: (message?: any, ...optionalParams: any[]) => void;
    let coloredLevel: string;
    
    switch (level) {
      case LogLevel.ERROR:
        logMethod = console.error;
        coloredLevel = chalk.red(levelStr);
        break;
      case LogLevel.WARN:
        logMethod = console.warn;
        coloredLevel = chalk.yellow(levelStr);
        break;
      case LogLevel.INFO:
        logMethod = console.log;
        coloredLevel = chalk.blue(levelStr);
        break;
      case LogLevel.DEBUG:
      default:
        logMethod = console.debug;
        coloredLevel = chalk.gray(levelStr);
        break;
    }

    const formattedMessage = `${timestamp}${coloredLevel} ${prefix} ${message}`;
    
    if (args.length > 0) {
      logMethod(formattedMessage, ...args);
    } else {
      logMethod(formattedMessage);
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  child(name: string): Logger {
    return new Logger({
      name: `${this.name}:${name}`,
      level: Object.entries(Logger.LEVELS).find(([_, v]) => v === this.level)?.[0] as LogLevel,
      timestamp: this.showTimestamp
    });
  }
}

// Default logger instance
export const logger = new Logger('App');
