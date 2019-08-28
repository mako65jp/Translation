'use strict';

import * as vscode from 'vscode';
// import * as DiagnosticsAndActions from './diagnosticsAndActions';
import * as utils from './utils';
var request = require('request-promise');

interface Map<V> {
  [key: string]: V;
}

export default class Translator
  implements vscode.CodeActionProvider, vscode.Disposable {
  private _disposable: vscode.Disposable = Object.create(null);

  private _isEnabled = false;

  private static ConfigProxy =
    vscode.workspace.getConfiguration().get<string>('http.proxy') || '';

  public static Source = 'Translator';
  private static Config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(
    Translator.Source
  );

  private _diagnosticMap: Map<vscode.Diagnostic[]> = {};
  private _diagnostics: vscode.DiagnosticCollection = Object.create(null);

  public static ReplaceOnSuggestion: string =
    Translator.Source + '.replaceOnSuggestion';
  private _replaceOnSuggestionCommand: vscode.Disposable = Object.create(null);

  public static AddOnSuggestion: string =
    Translator.Source + '.addOnSuggestion';
  private _addOnSuggestionCommand: vscode.Disposable = Object.create(null);

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.Command[] {
    const diagnostic = context.diagnostics.filter(
      (d, i) => d.source === Translator.Source
    )[0];
    const suggestion = diagnostic.message;
    const error = document.getText(range);

    let commands: vscode.Command[] = [];
    commands.push(
      {
        title: "置換： '" + suggestion.substring(0, 80) + " ... '",
        command: Translator.ReplaceOnSuggestion,
        arguments: [document, diagnostic, error, suggestion]
      },
      {
        title: "下に追加： '" + suggestion.substring(0, 80) + " ... '",
        command: Translator.AddOnSuggestion,
        arguments: [document, diagnostic, error, suggestion]
      }
    );

    return commands;
  }

  private replaceWithSuggestion(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    error: string,
    suggestion: string
  ): any {
    let diagnostics: vscode.Diagnostic[] = this._diagnosticMap[
      document.uri.toString()
    ];
    let index: number = diagnostics.indexOf(diagnostic);

    diagnostics.splice(index, 1);

    this._diagnosticMap[document.uri.toString()] = diagnostics;
    this._diagnostics.set(document.uri, diagnostics);

    let edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, diagnostic.range, suggestion);
    vscode.workspace.applyEdit(edit);
  }

  private addWithSuggestion(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    error: string,
    suggestion: string
  ): any {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      let diagnostics: vscode.Diagnostic[] = this._diagnosticMap[
        document.uri.toString()
      ];
      let index: number = diagnostics.indexOf(diagnostic);

      const anchor = new vscode.Position(
        diagnostics[index].range.end.line + 1,
        0
      );
      const active = new vscode.Position(
        diagnostics[index].range.end.line + 1,
        0
      );
      const selection = new vscode.Selection(anchor, active);
      editor.selection = selection;

      editor
        .edit(editBuilder => {
          editBuilder.replace(
            editor.selection,
            '[Translation]\n' + suggestion + '\n'
          );
        })
        .then(success => {
          if (success) {
            diagnostics.splice(index, 1);

            this._diagnosticMap[document.uri.toString()] = diagnostics;
            this._diagnostics.set(document.uri, diagnostics);
            vscode.commands.executeCommand('editor.action.addCommentLine');
          }
        });
    }
  }

  private static createDiagnosticObject(range: vscode.Range, suggest: string) {
    let diag = new vscode.Diagnostic(
      range,
      suggest,
      vscode.DiagnosticSeverity.Information
    );
    diag.source = Translator.Source;
    return diag;
  }

  private createDiagnostics(editor: vscode.TextEditor, transText: string) {
    const document = editor.document;
    const range: vscode.Range = editor.selection;

    let diagnostics: vscode.Diagnostic[] = (
      this._diagnostics.get(document.uri) || []
    ).filter(d => !range.intersection(d.range));

    diagnostics.push(Translator.createDiagnosticObject(range, transText));

    this._diagnostics.set(document.uri, diagnostics);
    this._diagnosticMap[document.uri.toString()] = diagnostics;
  }

  public async translation(editor: vscode.TextEditor) {
    if (!this._isEnabled) {
      return;
    }

    const selectionText = utils.getSelectedText(
      editor.document,
      editor.selection
    );
    if (!selectionText) {
      return;
    }

    await this.postTranslation(selectionText).then(results => {
      if (results.trans) {
        // If you can translate
        if (results.orig !== results.trans) {
          this.createDiagnostics(editor, results.trans);
        }
      } else {
        // If translation results cannot be obtained or if an error occurs,
        // a message is displayed in the lower right.
        vscode.window.showErrorMessage('Translation ----->>> ERROR');
      }
    });
  }

  private async postTranslation(text: string) {
    // Get translation pattern settings.
    const pattern = Translator.Config.get<any[]>('pattern') || [
      { src: 'en', target: ['ja'] },
      { src: 'ja', target: ['en'] }
    ];
    const target = pattern[0].target[0] || '';

    // Translate using the first pattern.
    return await this.requestWithTimeout(text, target).then(async results => {
      if (results && results.status === 0) {
        // There was a response from the translation site.
        let isSource = results.res.src === target;
        if (!isSource) {
          results.res.ld_result.srclangs.forEach((srclang: string) => {
              if (srclang === target) {
                isSource = true;
              }
          });
        }
        if (isSource) {
          // If the source language and the specified language are equal.

          // Translate again with the next translation pattern setting.
          const next = pattern.find(v => v.src === target);
          if (next && next.target[0]) {
            // The following translation pattern was found.
            return await this.requestWithTimeout(text, next.target[0]).then(
              results => {
                if (results.status === 0) {
                  // Translated correctly.
                  return this.parsTranslated(
                    results.res,
                    results.res.src,
                    next.target[0]
                  );
                } else {
                  // There was no response from the translation site.
                  return this.parsTranslated(null);
                }
              }
            );
          } else {
            // The next conversion pattern was not found.
            return this.parsTranslated(null);
          }
        }
        // Translated correctly.
        return this.parsTranslated(results.res, results.res.src, target);
      } else {
        // Fatal error.
        return this.parsTranslated(null);
      }
    });
  }

  private async requestWithTimeout(text: string, target: string) {
    // Generate translation site parameters.
    const options = this.getParameterForTranslateSite(text, target);

    // Get translation processing timeout setting.
    const processingTimeout = Translator.Config.get<number>(
      'processingTimeout',
      750
    );

    return await Promise.race([
      request(options),
      new Promise((_, reject) => setTimeout(reject, processingTimeout))
    ]).then(
      async res => {
        if (res.src) {
          return { status: 0, res: res };
        } else {
          return { status: 999, res: '' };
        }
      },
      reason => {
        return { status: 999, res: reason };
      }
    );
  }

  // Generate translation site parameters.
  private getParameterForTranslateSite(text: string, target: string) {
    let options = {
      uri:
        'https://translate.google.com/translate_a/single?client=gtx' +
        '&dt=t&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&source=icon' +
        '&sl=auto' +
        '&tl=' +
        (target || 'auto') +
        '&q=' +
        encodeURIComponent(text),
      proxy: Translator.ConfigProxy,
      json: true
    };
    return options;
  }

  // Format the translation results.
  private parsTranslated(res: any, origLang?: string, transLang?: string) {
    // When translation results cannot be obtained.
    if (!res || !res.sentences) {
      return {
        trans: '',
        orig: '',
        lang: { trans: '', orig: '' }
      };
    }

    // When translation results are obtained.
    return {
      trans: this.convertTranslatedText(res.sentences),
      orig: this.convertOriginalText(res.sentences),
      lang: { trans: transLang + '', orig: origLang + '' }
    };
  }

  // Convert the translation result into a string.
  private convertTranslatedText(sentences: []) {
    let result: string[] = [];
    sentences.forEach((s: { orig: string; trans: string }) => {
      result.push(s.trans || '');
    });
    return result.join('\n');
  }

  // Convert the translation source to a string.
  private convertOriginalText(sentences: []) {
    let result: string[] = [];
    sentences.forEach((s: { orig: string; trans: string }) => {
      result.push(s.orig || '');
    });
    return result.join('\n');
  }

  public clearTranslations(editor: vscode.TextEditor) {
    const document = editor.document;
    let diagnostics: vscode.Diagnostic[];

    if (editor.selection.isEmpty) {
      diagnostics = [];
    } else {
      const range: vscode.Range = editor.selection;
      diagnostics = (this._diagnostics.get(document.uri) || []).filter(
        d => !range.intersection(d.range)
      );
    }

    this._diagnostics.set(document.uri, diagnostics);
    this._diagnosticMap[document.uri.toString()] = diagnostics;
  }

  activate() {
    const self = this;

    this._replaceOnSuggestionCommand = vscode.commands.registerCommand(
      Translator.ReplaceOnSuggestion,
      this.replaceWithSuggestion.bind(this)
    );
    this._addOnSuggestionCommand = vscode.commands.registerCommand(
      Translator.AddOnSuggestion,
      this.addWithSuggestion.bind(this)
    );

    let subscriptions: vscode.Disposable[] = [];

    // vscode.window.onDidChangeActiveTextEditor(
    //   this.onActiveTextEditorChanged,
    //   this,
    //   subscriptions
    // );

    this._diagnostics = vscode.languages.createDiagnosticCollection(
      Translator.Source
    );

    vscode.workspace.onDidCloseTextDocument(
      textDocument => {
        self._diagnostics.delete(textDocument.uri);
      },
      null,
      subscriptions
    );

    vscode.languages.registerCodeActionsProvider('*', this);

    this._disposable = vscode.Disposable.from(...subscriptions);

    this._isEnabled = true;
  }

  dispose() {
    this._replaceOnSuggestionCommand.dispose();
    this._addOnSuggestionCommand.dispose();
    this._disposable.dispose();
  }
}
