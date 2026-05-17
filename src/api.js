const json = (res) => res.json()

export const api = {
  listSnippets: () => fetch('/api/snippets').then(json),
  getSnippet: (id) => fetch(`/api/snippets/${id}`).then(json),
  createSnippet: (body) => fetch('/api/snippets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json),
  updateSnippet: (id, body) => fetch(`/api/snippets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json),
  deleteSnippet: (id) => fetch(`/api/snippets/${id}`, { method: 'DELETE' }).then(json),
  runSnippet: (id, stdin) => fetch(`/api/snippets/${id}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stdin }),
  }).then(json),
  runPlayground: (code, stdin, language) => fetch('/api/playground/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, stdin, language }),
  }).then(json),
}
