import winston from 'winston';
import { LOG_LEVEL } from './config';

export const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console()
    ]
});