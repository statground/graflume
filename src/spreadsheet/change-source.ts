const pasteCommand =
  /(?:^|\.)command\.(?:paste(?:-(?:by-short-key|value|format|formula|col-width|besides-border))?|optional-paste)$/;

export function isSpreadsheetPasteCommand(commandId: string): boolean {
  return pasteCommand.test(commandId);
}
