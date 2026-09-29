import type {
  SpreadsheetBatchChange,
  SpreadsheetCellPatch,
  SpreadsheetDataFrame,
  SpreadsheetLimits,
  SpreadsheetLocale,
  SpreadsheetProfile,
  SpreadsheetSelection,
  SpreadsheetSnapshot,
  SpreadsheetTopLevelMenuActionEvent,
} from './types.js';
import type { SpreadsheetTopLevelMenuDescriptor } from './menu.js';

export const spreadsheetProtocol = 'graflume-spreadsheet-v1';

export interface SpreadsheetRuntimeInit {
  readonly profile: SpreadsheetProfile;
  readonly locale: SpreadsheetLocale;
  readonly data: SpreadsheetDataFrame;
  readonly snapshot?: SpreadsheetSnapshot;
  readonly limits: SpreadsheetLimits;
}

export type SpreadsheetRuntimeRequest =
  | { readonly method: 'init'; readonly value: SpreadsheetRuntimeInit }
  | { readonly method: 'save' }
  | { readonly method: 'load'; readonly value: SpreadsheetSnapshot }
  | { readonly method: 'getSelection' }
  | { readonly method: 'setSelection'; readonly value: SpreadsheetSelection | null }
  | { readonly method: 'applyPatch'; readonly value: readonly SpreadsheetCellPatch[] }
  | {
      readonly method: 'renameColumn';
      readonly value: { readonly columnId: string; readonly label: string };
    }
  | { readonly method: 'replaceData'; readonly value: SpreadsheetDataFrame }
  | { readonly method: 'undo' }
  | { readonly method: 'redo' }
  | { readonly method: 'addTopLevelMenu'; readonly value: SpreadsheetTopLevelMenuDescriptor }
  | { readonly method: 'rollback'; readonly value: SpreadsheetBatchChange }
  | { readonly method: 'ack'; readonly value: string }
  | { readonly method: 'destroy' };

export interface SpreadsheetRequestMessage {
  readonly protocol: typeof spreadsheetProtocol;
  readonly instanceId: string;
  readonly requestId: number;
  readonly request: SpreadsheetRuntimeRequest;
}

export interface SpreadsheetResponseMessage {
  readonly protocol: typeof spreadsheetProtocol;
  readonly instanceId: string;
  readonly requestId: number;
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: string;
}

export type SpreadsheetEventMessage =
  | {
      readonly protocol: typeof spreadsheetProtocol;
      readonly instanceId: string;
      readonly event: 'batchchange';
      readonly value: SpreadsheetBatchChange;
    }
  | {
      readonly protocol: typeof spreadsheetProtocol;
      readonly instanceId: string;
      readonly event: 'menuaction';
      readonly value: SpreadsheetTopLevelMenuActionEvent;
    }
  | {
      readonly protocol: typeof spreadsheetProtocol;
      readonly instanceId: string;
      readonly event: 'error';
      readonly value: { readonly message: string };
    };

export function isSpreadsheetMessage(value: unknown): value is {
  readonly protocol: typeof spreadsheetProtocol;
  readonly instanceId: string;
} {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.protocol === spreadsheetProtocol && typeof candidate.instanceId === 'string';
}
