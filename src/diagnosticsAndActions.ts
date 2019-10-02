'use strict';

import * as vscode from 'vscode';
import * as utils from './utils';
import Translator from './translator';

interface Map<V> {
    [key: string]: V;
}

export default class DiagnosticsAndActions implements vscode.CodeActionProvider, vscode.Disposable {
    private _diagnosticMap: Map<vscode.Diagnostic[]> = {};
    private _diagnostics: vscode.DiagnosticCollection = Object.create(null);

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.Command[] {
        const diagnostic = context.diagnostics.filter((d, i) => d.source === Translator.Source)[0];
        const suggestion = diagnostic.message;
        const error = document.getText(range);

        let commands: vscode.Command[] = [];
        commands.push(
            {
                title: "Replace with '" + suggestion.substring(0, 80) + " ... '",
                command: Translator.ReplaceOnSuggestion,
                arguments: [document, diagnostic, error, suggestion]
            },
            {
                title: "Add with '" + suggestion.substring(0, 80) + " ... '",
                command: Translator.AddOnSuggestion,
                arguments: [document, diagnostic, error, suggestion]
            }
        );

        return commands;
    }

    dispose() {}

    private fixWithSuggestion(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, error: string, suggestion: string): any {
        let diagnostics: vscode.Diagnostic[] = this._diagnosticMap[document.uri.toString()];
        let index: number = diagnostics.indexOf(diagnostic);

        diagnostics.splice(index, 1);

        this._diagnosticMap[document.uri.toString()] = diagnostics;
        this._diagnostics.set(document.uri, diagnostics);

        let edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, diagnostic.range, suggestion);
        return vscode.workspace.applyEdit(edit);
    }

    public createDiagnostics(editor: vscode.TextEditor, souece: string, transText: string) {
        const document = editor.document;
        const range: vscode.Range = editor.selection;

        let diagnostics: vscode.Diagnostic[] = (this._diagnostics.get(document.uri) || []).filter(d => !range.intersection(d.range));

        diagnostics.push(this.createDiagnosticObject(document, range, souece, vscode.DiagnosticSeverity.Information, transText));

        this._diagnostics.set(document.uri, diagnostics);
        this._diagnosticMap[document.uri.toString()] = diagnostics;
    }

    private createDiagnosticObject(
        document: vscode.TextDocument,
        range: vscode.Range,
        message: string,
        severity: vscode.DiagnosticSeverity,
        suggest: string
    ) {
        message = message.replace(/\r?\n/g, '');
        suggest = suggest.replace(/\r?\n/g, '');
        if (!utils.isEmptyOrSpaces(suggest)) {
            message = `${message}\n${suggest}`;
        }

        // let startPos = document.positionAt(pos[0]);
        // let endPos = document.positionAt(pos[1]);
        // let range = new vscode.Range(startPos, endPos);
        let diag = new vscode.Diagnostic(range, message, severity);
        return diag;
    }
}
