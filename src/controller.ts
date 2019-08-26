'use strict';

import * as vscode from 'vscode';
import * as events from 'events';
import Translator from './translator';

export default class Controller implements vscode.Disposable {
  private _translator: Translator = Object.create(null);
  private _enabled: boolean = false;

  private _extensionContext: vscode.ExtensionContext;
  private _eventEmitter: events.EventEmitter = new events.EventEmitter();

  static TranslationCommand: string = 'translation.translation';
  static ClearCommand: string = 'translation.clear';

  private registerCommand(command: string) {
    const self = this;

    this._extensionContext.subscriptions.push(
      vscode.commands.registerCommand(command, () => {
        self._eventEmitter.emit(command);
      })
    );
  }

  private registerTextEditorCommand(command: string) {
    const self = this;

    this._extensionContext.subscriptions.push(
      vscode.commands.registerTextEditorCommand(command, editor => {
        self._eventEmitter.emit(command, editor);
      })
    );
  }

  // Selection translation command
  private translation(editor: vscode.TextEditor) {
    this.enableTranslator();
    this._translator.translation(editor);
  }

  // Translation result clear command
  private clearTranslations(editor: vscode.TextEditor) {
    this.enableTranslator();
    this._translator.clearTranslations(editor);
  }

  // Enable translation processing
  private enableTranslator() {
    if (!this._enabled) {
      this._translator = new Translator();
      this._translator.activate();
      this._enabled = true;
    }
  }

  // private stopTranslator() {
  //   if (!this._enabled) {
  //     vscode.window.showErrorMessage("Translator hasn't started.");
  //     return;
  //   }

  //   this._enabled = false;
  //   this._translator.dispose();
  //   this._translator = Object(null);
  // }

  constructor(context: vscode.ExtensionContext) {
    this._extensionContext = context;
  }

  activate() {
    const self = this;

    // Registering commands.
    this.registerTextEditorCommand(Controller.TranslationCommand);
    this.registerTextEditorCommand(Controller.ClearCommand);

    // Registering event handlers.
    this._eventEmitter.on(Controller.TranslationCommand, editor => {
      if (editor && !editor.selection.isEmpty) {
        self.translation(editor);
      }
    });
    this._eventEmitter.on(Controller.ClearCommand, editor => {
      if (editor) {
        self.clearTranslations(editor);
      }
    });
  }

  dispose() {
    if (this._translator) {
      this._translator.dispose();
    }
  }
}
