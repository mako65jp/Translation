'use strict';

import * as vscode from 'vscode';

// Get the character string selected on the active editor.
export function getSelectedText(
  document: vscode.TextDocument,
  selection: vscode.Selection
): string {
  if (!document || selection.isEmpty) {
    return '';
  }

  const selectedText = document.getText(selection);

  // Erase consecutive whitespace.
  // Remove leading and trailing blanks.
  return selectedText.replace(/(\s)+/g, ' ').replace(/(^\s+)|(\s+$)/g, '');
}
export function isEmptyOrSpaces(str: string): boolean {
    return str === null || str.match(/^ *$/) !== null;
}

// export function createDiagnosticObject(document: vscode.TextDocument, pos: [number, number], message: string, severity: vscode.DiagnosticSeverity, suggest: string) {
  export function createDiagnosticObject(document: vscode.TextDocument, range: vscode.Range, message: string, severity: vscode.DiagnosticSeverity, suggest: string) {
    message = message.replace(/\r?\n/g, '');
  suggest = suggest.replace(/\r?\n/g, '');
  if (!isEmptyOrSpaces(suggest)) {
      message = `${message}\n${suggest}`;
  }

  // let startPos = document.positionAt(pos[0]);
  // let endPos = document.positionAt(pos[1]);
  // let range = new vscode.Range(startPos, endPos);
  let diag = new vscode.Diagnostic(range, message, severity);
  return diag;
}
