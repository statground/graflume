export type GraflumeErrorCode =
  | 'INVALID_SPEC'
  | 'UNSAFE_KEY'
  | 'UNSUPPORTED_MARK'
  | 'UNSUPPORTED_RENDERER'
  | 'MISSING_TARGET'
  | 'INVALID_DATA'
  | 'INCOMPATIBLE_SCALE'
  | 'DESTROYED_CHART';

export class GraflumeError extends Error {
  readonly code: GraflumeErrorCode;
  readonly path?: string;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: GraflumeErrorCode,
    message: string,
    options: { path?: string; details?: Readonly<Record<string, unknown>>; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'GraflumeError';
    this.code = code;
    if (options.path !== undefined) this.path = options.path;
    if (options.details !== undefined) this.details = options.details;
  }
}
