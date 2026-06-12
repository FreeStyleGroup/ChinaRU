import { pino, type Logger } from 'pino';

/**
 * Создаёт структурированный логгер. В dev — человекочитаемый вывод (если установлен
 * pino-pretty), в test — тихий, в prod — JSON в stdout (собирается агрегатором логов).
 */
export function createLogger(nodeEnv: 'development' | 'production' | 'test'): Logger {
  if (nodeEnv === 'test') {
    return pino({ level: 'silent' });
  }
  return pino({
    level: nodeEnv === 'production' ? 'info' : 'debug',
  });
}
