import { InvalidArgumentError, type Command} from 'commander';

/**
 * A memory-safe cache that stores the flattened list of registered flags for each Command.
 * Using a WeakMap ensures that once a Command object is garbage collected (e.g., after a test run),
 * its associated cache is also freed, preventing memory leaks.
 */
const flagCache = new WeakMap<Command, string[]>();

/**
 * Traverses the current Command and all its parent commands to collect every registered flag.
 * Uses caching to ensure this expensive traversal only happens once per Command instance.
 *
 * @param cmd - The Commander.js Command instance to inspect.
 * @returns An array of all registered short and long flags (e.g., ['-c', '--content', ...]).
 */
const getAllRegisteredFlags = (cmd: Command): string[] => {
  if (flagCache.has(cmd)) {
    return flagCache.get(cmd)!;
  }

  let flags: string[] = [];
  let current: Command | null = cmd;

  while (current) {
    if (current.options) {
      const currentFlags = current.options.flatMap(opt =>
        [opt.short, opt.long].filter(Boolean) as string[]
      );
      flags = [...flags, ...currentFlags];
    }
    // Move up the command tree to catch globally registered options
    current = current.parent as Command | null;
  }

  flagCache.set(cmd, flags);
  return flags;
};


/**
 * Determines if a given string value looks like a CLI flag instead of a standard argument.
 * This is used to detect "argument shifting" (e.g., when an empty string "" is swallowed by the shell,
 * causing the next flag to be incorrectly parsed as the value for the current option).
 *
 * @param value - The string argument to evaluate.
 * @param cmd - (Optional) The Command instance. If provided, enables strict matching against registered flags.
 * @returns True if the value is likely a shifted flag; otherwise, false.
 */
export function isFlag(value: string | undefined, cmd?: Command): boolean {
  if (!value) return false;

  // Strict Match: If a Command context is provided, check against actually registered flags.
  if (cmd) {
    const knownFlags = getAllRegisteredFlags(cmd);
    if (knownFlags.includes(value)) return true;
  }

  return false;
}

/**
 * Validates an entire record of parsed arguments to ensure none of them are shifted flags.
 * Useful for running a bulk check after Commander has finished parsing,
 * especially when using dynamic commands or positional arguments.
 *
 * @param fields - A key-value record of parsed arguments (e.g., { title: '--content', parentId: '123' }).
 * @param cmd - (Optional) The Command instance for strict flag matching.
 * @throws {Error} If any value is identified as a shifted flag.
 */
export function checkPayloadForFlags(fields: Record<string, string | undefined>, cmd?: Command): void {
  for (const [name, value] of Object.entries(fields)) {
    if (isFlag(value, cmd)) {
      throw new Error(
        `Argument shifting detected: "${value}" was misinterpreted as the value for "${name}". ` +
          `This usually indicates argument shifting (e.g. the shell swallowed an empty string ""). ` +
          `To fix this, use explicit flags (e.g. --title="", --content="") or check your quoting.`
      );
    }
  }
}

/**
 * A higher-order function designed to be used as a custom processing function in Commander's `.option()`.
 * It binds the Command context to the validation logic.
 *
 * @param cmd - The current Commander instance.
 * @returns A validation function that throws an InvalidArgumentError if the value is a shifted flag.
 *
 * @example
 * const check = validateNotFlag(program);
 * program.option('--title <text>', 'Note title', check);
 */
export function validateNotFlag(value: string, cmd?: Command): string {
  if (isFlag(value, cmd)) {
    throw new InvalidArgumentError(
      `"${value}" looks like a flag but was passed as an option value. ` +
        `This usually indicates argument shifting (e.g. the shell swallowed an empty string ""). ` +
        `To fix this, use explicit flags (e.g. --title="", --content="") or check your quoting.`
    );
  }
  return value;
}