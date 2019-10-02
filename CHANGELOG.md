# Change Log

## 1.0

- Display the translation result as a message.  
  翻訳結果をメッセージとして表示。

## 1.1

- Added the action to add / replace the displayed translation result to the document being edited.  
    表示した翻訳結果を、編集中の文書に追加／選択文字列と置き換えのアクションを追加。

## 1.2

- Added the action to copy the displayed translation result to the clipboard.  
表示した翻訳結果を、クリップボードにコピーのアクションを追加。

- Change the displayed translation result action.  
  表示した翻訳結果のアクションを変更。
  - Add to the end of the line with the selected text of the document being edited  
    編集中の文書の選択文字列のある行末に追加
  - Add a comment line to the line below the selected string  
    選択文字列の下の行にコメント行として追加

## 1.3

- Fixed a bug when not connected to the Internet  
  インターネット非接続時の不具合を修正

## 1.4

- Added extended function settings.  
  拡張機能設定を追加。

## 1.5

- Refactoring the translation process.  
  翻訳処理のリファクタリング。
- The translation result has been changed to Diagnostics display.  
  翻訳結果は、Diagnostics 表示に変更。
- Actions on translation results are abolished.  
  翻訳結果に対するアクションは廃止。

## 2.0

- Large scale refactoring.  
  大規模リファクタリング。
- Implement action (replacement only) on translation result with code action  
  翻訳結果に対するアクション（置換のみ）をコードアクションで実装。
- Implemented the translation result clear function.  
  翻訳結果クリア機能を実装。

## 2.1

- Implemented "Add Below" action for translation results.  
  翻訳結果に対するアクションに、「下に追加」を実装。

### 2.1.2

- Improved language recognition errors in selected areas.  
  選択範囲の言語認識ミスを改善。

### 2.2.0

- Added a function to display a warning when the file is opened when it differs from the default encoding.  
  ファイルオープン時に、デフォルトエンコードと異なる場合には、警告を表示する機能を付加。
