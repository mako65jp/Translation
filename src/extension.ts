import * as vscode from 'vscode';
var request = require('request-promise');
import * as translation from './translation';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "translation" is now active!');

  // Auto Translate.
  const collection = vscode.languages.createDiagnosticCollection('Translation');
  const translate = vscode.commands.registerTextEditorCommand(
    'extension.translate',
    async (editor, edit) => {
      await commandAutoTranslate(editor, edit, collection);
    }
  );
  context.subscriptions.push(translate);
}

// this method is called when your extension is deactivated
export function deactivate() {}

async function commandAutoTranslate(
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  collection: vscode.DiagnosticCollection
) {
  // Do nothing if nothing is selected.
  if (!editor || editor.selection.isEmpty) {
    return;
  }

  // Get the selected string.
  const selectionRange = new vscode.Range(
    editor.selection.start,
    editor.selection.end
  );
  const selectedText = translation.getSelectedText(
    editor.document,
    editor.selection
  );
  if (!selectedText) {
    return;
  }

  // translate.
  await translation.translation(selectedText).then(async results => {
    if (results.trans) {
      const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);

      // Register the translation result as Diagnostics.
      collection.set(
        editor.document.uri,
        diagnostics.concat([
          {
            code: '',
            message: results.lang
              ? 'Translation to ' + results.lang.trans
              : 'Translation',
            range: selectionRange,
            severity: vscode.DiagnosticSeverity.Information,
            source: '',
            relatedInformation: [
              new vscode.DiagnosticRelatedInformation(
                new vscode.Location(editor.document.uri, selectionRange),
                String(results.trans)
              )
            ]
          }
        ])
      );
    } else {
      // If translation results cannot be obtained or if an error occurs, a message is displayed in the lower right.
      vscode.window.showErrorMessage('Translation ----->>> ERROR');
    }
  });
}
