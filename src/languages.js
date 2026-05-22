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
  javascript: {
    label: 'JavaScript',
    defaultFile: 'main.js',
    hljsLang: 'javascript',
    playgroundDefault: 'console.log("Hello, World!");\n',
  },
  typescript: {
    label: 'TypeScript',
    defaultFile: 'main.ts',
    hljsLang: 'typescript',
    playgroundDefault: 'const msg: string = "Hello, World!";\nconsole.log(msg);\n',
  },
  go: {
    label: 'Go',
    defaultFile: 'main.go',
    hljsLang: 'go',
    playgroundDefault: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}\n',
  },
  rust: {
    label: 'Rust',
    defaultFile: 'main.rs',
    hljsLang: 'rust',
    playgroundDefault: 'fn main() {\n    println!("Hello, World!");\n}\n',
  },
  java: {
    label: 'Java',
    defaultFile: 'Main.java',
    hljsLang: 'java',
    playgroundDefault: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  },
  ruby: {
    label: 'Ruby',
    defaultFile: 'main.rb',
    hljsLang: 'ruby',
    playgroundDefault: 'puts "Hello, World!"\n',
  },
  php: {
    label: 'PHP',
    defaultFile: 'main.php',
    hljsLang: 'php',
    playgroundDefault: '<?php\necho "Hello, World!\\n";\n',
  },
}

export const DEFAULT_LANGUAGE = 'cpp'
export const getLanguage = (id) => LANGUAGES[id] ?? LANGUAGES[DEFAULT_LANGUAGE]
