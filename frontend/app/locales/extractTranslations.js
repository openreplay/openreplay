const fs = require('fs');
const path = require('path');

const projectDir = '../../app'; // Путь к твоему проекту
const outputFile = '../../app/locales/en.json';

const translations = {};

function walkDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walkDirectory(fullPath);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      extractTranslationsFromFile(fullPath);
    }
  }
}

function extractTranslationsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileTranslations = extractTranslations(content);

  Object.assign(translations, fileTranslations);
}

function extractTranslations(content) {
  const regex = /(?:\{|\s)t\(/g;
  const result = {};

  let match;
  while ((match = regex.exec(content)) !== null) {
    const start = match.index + match[0].length;

    const stringData = extractStringLiteral(content, start);
    if (stringData) {
      result[stringData.value] = stringData.value;
      regex.lastIndex = stringData.end;
    }
  }

  return result;
}

function extractStringLiteral(text, startIndex) {
  let i = startIndex;

  while (/\s/.test(text[i])) i++;

  const quoteChar = text[i];
  if (quoteChar !== "'" && quoteChar !== '"') {
    return null;
  }

  let value = '';
  let escaped = false;

  i++;

  for (; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      value += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === quoteChar) {
      i++;
      break;
    } else {
      value += char;
    }
  }

  while (/\s|,/.test(text[i])) i++;

  if (text[i] !== ')') {
    return null;
  }

  return { value: value.trim(), end: i + 1 };
}

function saveToFile() {
  fs.writeFileSync(outputFile, JSON.stringify(translations, null, 2), 'utf8');
  console.log(`✅ Локализации сохранены в ${outputFile}`);
}

walkDirectory(projectDir);
saveToFile();
