import { dirname } from 'path'

const CPP_HEADERS = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
#include <cmath>
#include <sstream>
#include <numeric>
using namespace std;

`

const C_HEADERS = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

`

export const LANGUAGES = {
  cpp: {
    ext: '.cpp',
    srcFile: 'main.cpp',
    compile: (files, bin, flags = []) => ['g++', ...files, ...flags, '-o', bin],
    runner: (bin) => [bin],
    playgroundWrap: (code) => CPP_HEADERS + code,
  },
  c: {
    ext: '.c',
    srcFile: 'main.c',
    compile: (files, bin, flags = []) => ['gcc', ...files, ...flags, '-o', bin],
    runner: (bin) => [bin],
    playgroundWrap: (code) => C_HEADERS + code,
  },
  python: {
    ext: '.py',
    srcFile: 'main.py',
    compile: null,
    runner: (_bin, srcFiles) => ['python3', srcFiles[0]],
    playgroundWrap: (code) => code,
  },
  bash: {
    ext: '.sh',
    srcFile: 'main.sh',
    compile: null,
    runner: (_bin, srcFiles) => ['/bin/sh', srcFiles[0]],
    playgroundWrap: (code) => code,
  },
  javascript: {
    ext: '.js',
    srcFile: 'main.js',
    compile: null,
    runner: (_bin, srcFiles) => ['node', srcFiles[0]],
    playgroundWrap: (code) => code,
  },
  typescript: {
    ext: '.ts',
    srcFile: 'main.ts',
    compile: null,
    runner: (_bin, srcFiles) => ['tsx', srcFiles[0]],
    playgroundWrap: (code) => code,
  },
  go: {
    ext: '.go',
    srcFile: 'main.go',
    compile: (files, bin, flags = []) => ['go', 'build', ...flags, '-o', bin, ...files],
    runner: (bin) => [bin],
    playgroundWrap: (code) => code,
  },
  rust: {
    ext: '.rs',
    srcFile: 'main.rs',
    compile: (files, bin, flags = []) => ['rustc', ...flags, files[0], '-o', bin],
    runner: (bin) => [bin],
    playgroundWrap: (code) => code,
  },
  java: {
    ext: '.java',
    srcFile: 'Main.java',
    compile: (files, bin, flags = []) => ['javac', ...flags, ...files],
    runner: (_bin, srcFiles) => ['java', '-cp', dirname(srcFiles[0]), 'Main'],
    playgroundWrap: (code) => code,
  },
  ruby: {
    ext: '.rb',
    srcFile: 'main.rb',
    compile: null,
    runner: (_bin, srcFiles) => ['ruby', srcFiles[0]],
    playgroundWrap: (code) => code,
  },
  php: {
    ext: '.php',
    srcFile: 'main.php',
    compile: null,
    runner: (_bin, srcFiles) => ['php83', srcFiles[0]],
    playgroundWrap: (code) => code,
  },
}

export const DEFAULT_LANGUAGE = 'cpp'
export const isValidLanguage = (id) => id in LANGUAGES
export const getLanguage = (id) => LANGUAGES[id] ?? LANGUAGES[DEFAULT_LANGUAGE]
