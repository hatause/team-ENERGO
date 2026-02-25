export const errorResponse = (code: string, message: string, traceId: string, details?: unknown) => ({
  error: {
    code,
    message,
    details,
    traceId,
    timestamp: new Date().toISOString()
  }
});
