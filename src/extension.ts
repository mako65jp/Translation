// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { isUndefined } from 'util';
var request = require('request-promise');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "translation" is now active!');

  //   // The command has been defined in the package.json file
  //   // Now provide the implementation of the command with registerCommand
  //   // The commandId parameter must match the command field in package.json
  //   let disposable = vscode.commands.registerCommand(
  //     'extension.helloWorld',
  //     () => {
  //       // The code you place here will be executed every time your command is executed

  //       // Display a message box to the user
  //       vscode.window.showInformationMessage('Hello World!');
  //     }
  //   );

  //   context.subscriptions.push(disposable);

  // Translate to Japanese.
  const translateToJapanese = vscode.commands.registerTextEditorCommand('extension.translateToJapanese', async (editor, edit) => {
    await commandTranslate(editor, edit, '', 'ja');
  });
  context.subscriptions.push(translateToJapanese);

  // Translate to English.
  const translateToEnglish = vscode.commands.registerTextEditorCommand('extension.translateToEnglish', async (editor, edit) => {
    await commandTranslate(editor, edit, 'ja', '');
  });
  context.subscriptions.push(translateToEnglish);
}

// this method is called when your extension is deactivated
export function deactivate() {}

// Implementing translation commands.
async function commandTranslate(editor: vscode.TextEditor, edit: vscode.TextEditorEdit, source: string, target: string) {
  if (!editor || editor.selection.isEmpty) {
    return Promise.reject;
  }

  // Get the selected string.
  const selectedText = editor.document.getText(editor.selection);
  await translation(selectedText, source, target).then((res: string) => {
    if (!res) {
      return;
    }

    // Displays the translation result and prompts processing.
    vscode.window.showInformationMessage(res, 'Copy', 'Insert as comment line', 'Add to end of line', 'Replace', 'Close').then(selection => {
      switch (selection) {
        case 'Copy':
          // Copy the translation results to the clipboard.
          vscode.env.clipboard.writeText(res);
          break;
        case 'Insert as comment line':
          // Add the translation result to the next line as a comment line.
          editor.edit(editBuilder => {
            const translatedText = res + '\n';
            editBuilder.replace(editor.selection, translatedText);
            vscode.commands.executeCommand('editor.action.commentLine');
            if (selectedText.endsWith('\n')) {
              editBuilder.insert(editor.selection.start, selectedText);
            } else {
              editBuilder.insert(editor.selection.start, selectedText + '\n');
            }
            vscode.commands.executeCommand('cursorLineStart');
          });
          break;
        case 'Add to end of line':
          // Add the translation result to end of line.
          editor.edit(editBuilder => {
            const positionNewLine = new vscode.Position(editor.selection.end.line, editor.selection.end.character + 1);
            const translatedText = '  ==> ' + res;
            editBuilder.insert(editor.selection.end, translatedText);
          });
          break;
        case 'Replace':
          // Replace the selected string with the translation result.
          editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, res);
          });
          break;
        default:
          // Close without doing anything.
          break;
      }
    });
  });
}

// Translates the selected string.
async function translation(selectedText: string, source: string, target: string) {
  // Format the text.
  const text = selectedText
    .replace(/(\s)+/g, ' ') // Erase consecutive whitespace.
    .replace(/(^\s+)|(\s+$)/g, ''); // Remove leading and trailing blanks.

  if (!text) {
    return Promise.reject;
  }

  // Execute translation.
  return await executeTranslation(text, source, target);
}

// Execute translation.
async function executeTranslation(text: string, source: string, target: string) {
  // Generate translation site parameters.
  const options = getParameterForTranslateSite(text, source, target);

  return await request(options).then(async (res: { src: string; sentences: [] }) => {
    // If the source language and translation result language are equal, the translation result is not required.
    if (res.src === target) {
      return '';
    }
    let result: string[] = [];
    res.sentences.forEach((values: { trans: string }) => {
      result.push(values.trans);
    });
    return result.join('\n');
  });
}

// Generate translation site parameters.
function getParameterForTranslateSite(text: string, source: string, target: string) {
  const configProxy = String(vscode.workspace.getConfiguration().get('http.proxy'));

  let options = {
    uri: 'https://translate.google.com/translate_a/single?client=gtx' + '&sl=' + (source || 'auto') + '&tl=' + (target || 'auto') + '&dt=t&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&source=icon' + '&q=' + encodeURIComponent(text),
    proxy: String(vscode.workspace.getConfiguration().get('http.proxy')),
    json: true
  };
  return options;
}
