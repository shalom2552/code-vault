const parseResponse = async (res) => {
  const text = await res.text();
  if (!res.ok) {
    let msg;
    try { msg = JSON.parse(text).error; } catch {}
    throw new Error(msg || `HTTP ${res.status}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Server returned unexpected response');
  }
}

export const api = {
  listSnippets: (q = '') => fetch(`/api/snippets${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(parseResponse),
  exportSnippets: () => fetch('/api/export').then(parseResponse),
  pinSnippet: (id) => fetch(`/api/snippets/${encodeURIComponent(id)}/pin`, { method: 'PATCH' }).then(parseResponse),
  getSnippet: (id) => fetch(`/api/snippets/${encodeURIComponent(id)}`).then(parseResponse),
  createSnippet: (body) => fetch('/api/snippets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(parseResponse),
  updateSnippet: (id, body) => fetch(`/api/snippets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(parseResponse),
  deleteSnippet: (id) => fetch(`/api/snippets/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(parseResponse),
  runSnippet: (id, stdin) => fetch(`/api/snippets/${encodeURIComponent(id)}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stdin }),
  }).then(parseResponse),
  runPlayground: (code, stdin, language) => fetch('/api/playground/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, stdin, language }),
  }).then(parseResponse),
}
