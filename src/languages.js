export const LANGUAGES = {
  cpp: {
    label: 'C++',
    defaultFile: 'main.cpp',
    hljsLang: 'cpp',
    playgroundDefault: 'int main() {\n\n  return 0;\n}\n',
  },
  c: {
    label: 'C',
    defaultFile: 'main.c',
    hljsLang: 'c',
    playgroundDefault: 'int main() {\n\n  return 0;\n}\n',
  },
  python: {
    label: 'Python',
    defaultFile: 'main.py',
    hljsLang: 'python',
    playgroundDefault: '# Write your code here\n',
  },
  bash: {
    label: 'Bash',
    defaultFile: 'main.sh',
    hljsLang: 'bash',
    playgroundDefault: '#!/bin/bash\n# Write your script here\n',
  },
}

export const DEFAULT_LANGUAGE = 'cpp'
export const getLanguage = (id) => LANGUAGES[id] ?? LANGUAGES[DEFAULT_LANGUAGE]
