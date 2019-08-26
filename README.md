# translation

## Features :: できること

- This extension translates the selected string into Japanese or English.
- この拡張機能は、選択した文字列を日本語または英語に翻訳します。

## Requirements :: 必要条件

- Be able to connect to the Internet.
- インターネットに接続できる事。

## Extension Settings :: 設定

- No setting is required.
- 設定は不要です。

## Known Issues :: 既知の問題点  

## Release Notes :: リリースノート

### 1.0

- Display the translation result as a message.
- 翻訳結果をメッセージとして表示。

### 1.1

- Added the action to add / replace the displayed translation result to the document being edited.
- 表示した翻訳結果を、編集中の文書に追加／選択文字列と置き換えのアクションを追加。

### 1.2

- Added the action to copy the displayed translation result to the clipboard.
- 表示した翻訳結果を、クリップボードにコピーのアクションを追加。

- Change the displayed translation result action.
  - Add to the end of the line with the selected text of the document being edited
  - Add a comment line to the line below the selected string
- 表示した翻訳結果のアクションを変更。
  - 編集中の文書の選択文字列のある行末に追加
  - 選択文字列の下の行にコメント行として追加

### 1.3

- Fixed a bug when not connected to the Internet
- インターネット非接続時の不具合を修正

### 1.4

- Added extended function settings.
- 拡張機能設定を追加。

### 1.5

- Refactoring the translation process.
- The translation result has been changed to Diagnostics display.
- Actions on translation results are abolished.
- 翻訳処理のリファクタリング。
- 翻訳結果は、Diagnostics 表示に変更。
- 翻訳結果に対するアクションは廃止。

### 2.0

- Large scale refactoring.
- Implement action (replacement only) on translation result with code action
- Implemented the translation result clear function.
- 大規模リファクタリング。
- 翻訳結果に対するアクション（置換のみ）をコードアクションで実装。
- 翻訳結果クリア機能を実装。
