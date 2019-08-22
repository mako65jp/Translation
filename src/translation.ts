import * as vscode from 'vscode';
var request = require('request-promise');

// Get the character string selected on the active editor.
export function getSelectedText(
  document: vscode.TextDocument,
  selection: vscode.Selection
): string {
  if (!document || selection.isEmpty) {
    return '';
  }

  const selectedText = document.getText(selection);

  // Erase consecutive whitespace.
  // Remove leading and trailing blanks.
  return selectedText.replace(/(\s)+/g, ' ').replace(/(^\s+)|(\s+$)/g, '');
}

export async function translation(text: string) {
  // Get translation pattern settings.
  const pattern = vscode.workspace
    .getConfiguration('translationExt')
    .get<any[]>('pattern') || [
    { src: 'en', target: ['ja'] },
    { src: 'ja', target: ['en'] }
  ];
  const target = pattern[0].target[0] || '';

  // Translate using the first pattern.
  return await requestWithTimeout2(text, target).then(async results => {
    if (results.status === 0) {
      // There was a response from the translation site.

      if (results.res.src === target) {
        // If the source language and the specified language are equal.

        // Translate again with the next translation pattern setting.
        const next = pattern.find(v => v.src === results.res.src);
        if (next && next.target[0]) {
          // The following translation pattern was found.
          return await requestWithTimeout2(text, next.target[0]).then(
            results => {
              if (results.status === 0) {
                // Translated correctly.
                return parsTranslated(
                  results.res,
                  results.res.src,
                  next.target[0]
                );
              } else {
                // There was no response from the translation site.
                return parsTranslated(null);
              }
            }
          );
        } else {
          // The next conversion pattern was not found.
          return parsTranslated(null);
        }
      }
      // Translated correctly.
      return parsTranslated(results.res, results.res.src, target);
    } else {
      // Fatal error.
      return parsTranslated(null);
    }
  });
}

// Format the translation results.
function parsTranslated(res: any, origLang?: string, transLang?: string) {
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
    trans: convertTranslatedText(res.sentences),
    orig: convertOriginalText(res.sentences),
    lang: { trans: transLang + '', orig: origLang + '' }
  };
}

// Convert the translation result into a string.
function convertTranslatedText(sentences: []) {
  let result: string[] = [];
  sentences.forEach((s: { orig: string; trans: string }) => {
    result.push(s.trans || '');
  });
  return result.join('\n');
}

// Convert the translation source to a string.
function convertOriginalText(sentences: []) {
  let result: string[] = [];
  sentences.forEach((s: { orig: string; trans: string }) => {
    result.push(s.orig || '');
  });
  return result.join('\n');
}

// Generate translation site parameters.
function getParameterForTranslateSite(text: string, target: string) {
  const configProxy = String(
    vscode.workspace.getConfiguration().get('http.proxy')
  );

  let options = {
    uri:
      'https://translate.google.com/translate_a/single?client=gtx' +
      '&dt=t&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&source=icon' +
      '&sl=auto' +
      '&tl=' +
      (target || 'auto') +
      '&q=' +
      encodeURIComponent(text),
    proxy: String(vscode.workspace.getConfiguration().get('http.proxy')),
    json: true
  };
  return options;
}

async function requestWithTimeout2(text: string, target: string) {
  // Generate translation site parameters.
  const options = getParameterForTranslateSite(text, target);

  // Get translation processing timeout setting.
  const processingTimeout = vscode.workspace
    .getConfiguration('translationExt')
    .get<number>('processingTimeout', 750);

  return await Promise.race([
    request(options),
    timeout(processingTimeout)
  ]).then(
    async res => {
      if (res.src) {
        return { status: 0, res: res };
      } else {
        return { status: 900, res: '' };
      }
    },
    reason => {
      return { status: 900, res: reason };
    }
  );
}

async function timeout(msec: number) {
  return new Promise((_, reject) => setTimeout(reject, msec));
}
