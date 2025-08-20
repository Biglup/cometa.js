/* eslint-disable no-console */
/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* DEFINITIONS ****************************************************************/

/**
 * Wraps text by word, and forcibly breaks words that are longer than the maxWidth.
 * @param text The text to wrap.
 * @param maxWidth The maximum width of a line.
 * @returns An array of strings, representing the wrapped lines.
 */
const wordWrap = (text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  let currentLine = '';

  for (const word of text.split(' ')) {
    if (word.length > maxWidth) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = '';
      }
      let remainingWord = word;
      while (remainingWord.length > maxWidth) {
        lines.push(remainingWord.slice(0, maxWidth));
        remainingWord = remainingWord.slice(maxWidth);
      }
      currentLine = remainingWord;
    } else if (`${currentLine} ${word}`.trim().length > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = `${currentLine} ${word}`.trim();
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

/**
 * Prints a formatted header with a title and a word-wrapped description.
 * @param title The main title for the header.
 * @param description A description that will be automatically word-wrapped.
 * @param terminalWidth The maximum width of the box, defaults to 80 characters.
 */
export const printHeader = (title: string, description: string, terminalWidth = 80) => {
  const chars = {
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    separatorLeft: '├',
    separatorRight: '┤',
    topLeft: '┌',
    topRight: '┐',
    vertical: '│'
  };
  const contentWidth = terminalWidth - 4;

  const createCenteredLine = (text: string): string => {
    const truncated = text.length > contentWidth ? `${text.slice(0, contentWidth - 3)}...` : text;
    const padding = ' '.repeat(Math.floor((contentWidth - truncated.length) / 2));
    return `${chars.vertical} ${padding}${truncated.padEnd(contentWidth - padding.length)} ${chars.vertical}`;
  };

  const topBorder = `${chars.topLeft}${chars.horizontal.repeat(terminalWidth - 2)}${chars.topRight}`;
  const titleLine = createCenteredLine(title);
  const separator = `${chars.separatorLeft}${chars.horizontal.repeat(terminalWidth - 2)}${chars.separatorRight}`;
  const bottomBorder = `${chars.bottomLeft}${chars.horizontal.repeat(terminalWidth - 2)}${chars.bottomRight}`;

  const wrappedDescriptionLines = wordWrap(description, contentWidth);

  console.log('');
  console.log(topBorder);
  console.log(titleLine);
  console.log(separator);
  for (const line of wrappedDescriptionLines) {
    console.log(`${chars.vertical} ${line.padEnd(contentWidth)} ${chars.vertical}`);
  }
  console.log(bottomBorder);
  console.log('');
};
