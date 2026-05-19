const parseResponse = async (res) => {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  listSnippets: () => fetch('/api/snippets').then(parseResponse),
  getSnippet: (id) => fetch(`/api/snippets/${id}`).then(parseResponse),
  createSnippet: (body) => fetch('/api/snippets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(parseResponse),
  updateSnippet: (id, body) => fetch(`/api/snippets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(parseResponse),
  deleteSnippet: (id) => fetch(`/api/snippets/${id}`, { method: 'DELETE' }).then(parseResponse),
  runSnippet: (id, stdin) => fetch(`/api/snippets/${id}/run`, {
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
