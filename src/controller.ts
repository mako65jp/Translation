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
  // static EnableCommand: string = 'translation.enable';
  // static DisableCommand: string = 'translation.disable';

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

  private translation(editor: vscode.TextEditor) {
    if (!this._enabled) {
      this.startTranslator();
    }
    if (!this._enabled) {
      vscode.window.showErrorMessage(
        'You have to start Translator before you check the document.'
      );
      return;
    }

    this._translator.translation(editor);
  }

  private clearTranslations(editor: vscode.TextEditor) {
    if (!this._enabled) {
      this.startTranslator();
    }
    if (!this._enabled) {
      vscode.window.showErrorMessage(
        'You have to start Translator before you check the document.'
      );
      return;
    }
  
    this._translator.clearTranslations(editor);
  }

  private startTranslator() {
    if (this._enabled) {
      return;
    }

    let config = vscode.workspace.getConfiguration('Translator');

    this._translator = new Translator();
    this._translator.activate();
    this._enabled = true;
  }

  private stopTranslator() {
    if (!this._enabled) {
      vscode.window.showErrorMessage("Translator hasn't started.");
      return;
    }

    this._enabled = false;
    this._translator.dispose();
    this._translator = Object(null);
  }

  constructor(context: vscode.ExtensionContext) {
    this._extensionContext = context;
  }

  activate() {
    const self = this;

    this.registerTextEditorCommand(Controller.TranslationCommand);
    this.registerTextEditorCommand(Controller.ClearCommand);
    // this.registerCommand(Controller.EnableCommand);
    // this.registerCommand(Controller.DisableCommand);

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
    // this._eventEmitter.on(Controller.EnableCommand, () => {
    //   self.startTranslator();
    // });
    // this._eventEmitter.on(Controller.DisableCommand, () => {
    //   self.stopTranslator();
    // });
  }

  dispose() {
    if (this._translator) {
      this._translator.dispose();
    }
  }
}
