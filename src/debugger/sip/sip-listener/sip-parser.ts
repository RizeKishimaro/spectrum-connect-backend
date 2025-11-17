// src/sip/sip-parser.ts
export function parseSipMessage(message: string) {
  const lines = message.split(/\r?\n/);
  const startLine = lines[0];
  const headers: Record<string, string> = {};

  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) break;
    const [key, ...rest] = line.split(':');
    if (key && rest.length) headers[key.trim()] = rest.join(':').trim();
  }

  const body = lines.slice(i + 1).join('\n');
  return { startLine, headers, body };
}

