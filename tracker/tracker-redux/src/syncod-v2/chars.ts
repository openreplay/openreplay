const chars: Record<string, string> = {};

[
  "DEL",
  "UNDEF",
  "TRUE",
  "FALSE",
  "NUMBER",
  "BIGINT",
  "FUNCTION",
  "STRING",
  "SYMBOL",
  "NULL",
  "OBJECT",
  "ARRAY"
].forEach((k, i) => (chars[k] = String.fromCharCode(i + 0xe000)));

export default chars;
