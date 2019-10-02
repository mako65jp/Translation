'use strict';

import * as vscode from 'vscode';
import * as events from 'events';
import Translator from './translator';
import { basename } from 'path';
import { readFile } from 'fs';

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

        vscode.workspace.onDidOpenTextDocument(textDocument => {
            const editorText = textDocument.getText();
            const editorEncoding = vscode.workspace.getConfiguration('files').encoding;

            readFile(textDocument.fileName, (err, data) => {
                if (err) {
                    return;
                }

                console.log('');
                console.log(textDocument.fileName);

                // 表示しているテキストをデコードして、エンコードを推測してみる方法。
                self.guessEncoding(data, editorText, editorEncoding, textDocument.fileName);
            });
        });

        vscode.window.onDidChangeActiveTextEditor(() => {
            vscode.commands.executeCommand('notifications.hideToasts');
        });
    }

    dispose() {
        if (this._translator) {
            this._translator.dispose();
        }
    }

    // 表示しているテキストをデコードして、エンコードを推測してみる方法。
    guessEncoding(array: Uint8Array, editorText: string, editorEncoding: string, fileName: string) {
        const encoding = require('encoding-japanese');
        editorEncoding = editorEncoding
            .toUpperCase()
            .replace('-', '')
            .replace('_', '')
            .replace('SHIFT', 'S');

        //encoding --> UTF8
        //encoding --> EUCJP
        //encoding --> SJIS
        //encoding --> ASCII
        const result = encoding
            .detect(array)
            .toUpperCase()
            .replace('-', '')
            .replace('_', '')
            .replace('SHIFT', 'S');
        console.log('encoding --> ' + result);

        // Since it is a single byte file, no notification is required.
        if (result === 'ASCII') {
            return;
        }

        // If the encoding is UTF-8, check if BOM is included.
        let isBOM = false;
        if (result === 'UTF8' && array.length >= 3) {
            if (array[0] === 0xef && array[1] === 0xbb && array[2] === 0xbf) {
                isBOM = true;
            }
        }

        // No notification required as it matches the editor's recognition.
        if (isBOM === false && result === editorEncoding) {
            return;
        }

        const resultEncoding = isBOM ? result + ' with BOM' : result;
        const message = 'The file "' + basename(fileName) + '" is encoded in "' + resultEncoding + '". ';
        vscode.window.showWarningMessage(message);
        return;
    }
}
