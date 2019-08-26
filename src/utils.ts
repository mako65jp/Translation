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
  return str === null || str.match(/^\s*$/) !== null;
}

