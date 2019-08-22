import * as vscode from 'vscode';
var request = require('request-promise');

import Controller from './controller';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "translation" is now active!');

  let controller = new Controller(context);
  context.subscriptions.push(controller);
  controller.activate();
}

// this method is called when your extension is deactivated
export function deactivate() {
  // translationCollection.clear();
}
