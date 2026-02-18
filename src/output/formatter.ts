export type OutputFormat = 'json' | 'text';

/**
 * Format a successful result for stdout.
 */
export function formatResult(
  data: unknown,
  format: OutputFormat,
  textFormatter?: (data: unknown) => string
): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  if (textFormatter) {
    return textFormatter(data);
  }
  // Fallback: simple key-value display
  if (data && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join('\n');
  }
  return String(data);
}

/**
 * Format an error for stderr/stdout.
 */
export function formatError(message: string, format: OutputFormat, code?: number): string {
  if (format === 'json') {
    return JSON.stringify({ error: message, ...(code !== undefined && { code }) }, null, 2);
  }
  return `Error: ${message}`;
}
