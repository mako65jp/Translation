// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
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
    return '';
  }

  // Get the selected string.
  const selectedText = editor.document
    .getText(editor.selection)
    .replace(/(\s)+/g, ' ') // Erase consecutive whitespace.
    .replace(/(^\s+)|(\s+$)/g, ''); // Remove leading and trailing blanks.
  if (!selectedText) {
    return '';
  }

  // Translates the selected string.
  const displayModal = vscode.workspace.getConfiguration('translation').get<boolean>('displayModal', true);
  const messageOptions = { modal: displayModal };
  await executeTranslation(selectedText, source, target).then(
    results => {
      if (!results || !results.trans) {
        return '';
      }

      let translatedText = results.trans;
      let originalText = results.orig;

      // Displays the translation result and prompts processing.
      const messageActionItem = ['Copy', 'Insert as comment line', 'Add to end of line', 'Replace'];
      vscode.window.showInformationMessage(translatedText, messageOptions, ...messageActionItem).then(selectActionItem => {
        switch (selectActionItem) {
          case 'Copy':
            // Copy the translation results to the clipboard.
            vscode.env.clipboard.writeText(translatedText);
            break;
          case 'Insert as comment line':
            // Add the translation result to the next line as a comment line.
            editor.edit(editBuilder => {
              editBuilder.replace(editor.selection, translatedText + '\n');
              vscode.commands.executeCommand('editor.action.commentLine');
              editBuilder.insert(editor.selection.start, originalText + '\n');
              vscode.commands.executeCommand('cursorLineStart');
            });
            break;
          case 'Add to end of line':
            // Add the translation result to end of line.
            editor.edit(editBuilder => {
              const positionNewLine = new vscode.Position(editor.selection.end.line, editor.selection.end.character + 1);
              editBuilder.insert(editor.selection.end, '  ==> ' + translatedText);
            });
            break;
          case 'Replace':
            // Replace the selected string with the translation result.
            editor.edit(editBuilder => {
              editBuilder.replace(editor.selection, translatedText);
            });
            break;
          default:
            // Close without doing anything.
            break;
        }
      });
    },
    () => {
      vscode.window.showErrorMessage('Translation    >>> ERROR <<<', messageOptions);
    }
  );
}

// Execute translation.
async function executeTranslation(text: string, source: string, target: string) {
  // Generate translation site parameters.
  const options = getParameterForTranslateSite(text, source, target);

  return await requestWithTimeout(options).then(
    async (res: any) => {
      // If the source language and translation result language are equal, the translation result is not required.
      if (!res || !res.src || res.src === target || !res.sentences) {
        return { trans: '', orig: '' };
      }

      return {
        trans: getTranslatedText(res.sentences),
        orig: getOriginalText(res.sentences)
      };
    },
    reason => {
      return Promise.reject(reason);
    }
  );
}

function getTranslatedText(sentences: []) {
  let result: string[] = [];
  sentences.forEach((s: { orig: string; trans: string }) => {
    result.push(s.trans || '');
  });
  return result.join('\n');
}

function getOriginalText(sentences: []) {
  let result: string[] = [];
  sentences.forEach((s: { orig: string; trans: string }) => {
    result.push(s.orig || '');
  });
  return result.join('\n');
}

// Generate translation site parameters.
function getParameterForTranslateSite(text: string, source: string, target: string) {
  const configProxy = String(vscode.workspace.getConfiguration().get('http.proxy'));

  let options = {
    uri: 'https://translate.google.com/translate_a/single?client=gtx' + '&dt=t&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&source=icon' + '&sl=' + (source || 'auto') + '&tl=' + (target || 'auto') + '&q=' + encodeURIComponent(text),
    proxy: String(vscode.workspace.getConfiguration().get('http.proxy')),
    json: true
  };
  return options;
}

async function requestWithTimeout(options: any) {
  // Get translation processing timeout setting.
  const processingTimeout = vscode.workspace.getConfiguration('translation').get<number>('processingTimeout', 750);

  return Promise.race([request(options), timeout(processingTimeout)]);
}

async function timeout(msec: number) {
  return new Promise((_, reject) => setTimeout(reject, msec));
}
