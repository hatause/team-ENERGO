import { randomUUID } from 'crypto';

export const newTraceId = (): string => `trc_${randomUUID()}`;
