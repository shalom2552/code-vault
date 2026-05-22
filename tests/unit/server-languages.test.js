import { describe, it, expect } from 'vitest'
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage } from '../../server/languages.js'
import { LANGUAGES as clientLANGUAGES } from '../../src/languages.js'

describe('server language registry', () => {
  describe('registry shape', () => {
    it('contains cpp and c', () => {
      expect(Object.keys(LANGUAGES)).toEqual(expect.arrayContaining(['cpp', 'c']))
    })

    it.each(Object.entries(LANGUAGES))('%s has all required fields', (id, lang) => {
      expect(typeof lang.ext).toBe('string')
      expect(typeof lang.srcFile).toBe('string')
      expect(lang.compile === null || typeof lang.compile === 'function').toBe(true)
      expect(typeof lang.runner).toBe('function')
      expect(typeof lang.playgroundWrap).toBe('function')
    })
  })

  describe('cpp', () => {
    const lang = LANGUAGES.cpp

    it('ext is .cpp', () => expect(lang.ext).toBe('.cpp'))
    it('srcFile is main.cpp', () => expect(lang.srcFile).toBe('main.cpp'))

    it('compile uses g++', () => {
      expect(lang.compile(['a.cpp'], '/out')[0]).toBe('g++')
    })

    it('compile includes all source files and output path', () => {
      const cmd = lang.compile(['/src/a.cpp', '/src/b.cpp'], '/tmp/out')
      expect(cmd).toContain('/src/a.cpp')
      expect(cmd).toContain('/src/b.cpp')
      expect(cmd).toContain('/tmp/out')
    })

    it('playgroundWrap includes iostream', () => {
      expect(lang.playgroundWrap('// code')).toContain('#include <iostream>')
    })

    it('playgroundWrap includes using namespace std', () => {
      expect(lang.playgroundWrap('// code')).toContain('using namespace std;')
    })

    it('playgroundWrap places headers before user code', () => {
      const result = lang.playgroundWrap('int x = 1;')
      expect(result.indexOf('#include')).toBeLessThan(result.indexOf('int x = 1;'))
    })

    it('playgroundWrap preserves user code', () => {
      expect(lang.playgroundWrap('int x = 42;')).toContain('int x = 42;')
    })
  })

  describe('c', () => {
    const lang = LANGUAGES.c

    it('ext is .c', () => expect(lang.ext).toBe('.c'))
    it('srcFile is main.c', () => expect(lang.srcFile).toBe('main.c'))

    it('compile uses gcc', () => {
      expect(lang.compile(['a.c'], '/out')[0]).toBe('gcc')
    })

    it('compile includes source file and output path', () => {
      const cmd = lang.compile(['/src/main.c'], '/tmp/out')
      expect(cmd).toContain('/src/main.c')
      expect(cmd).toContain('/tmp/out')
    })

    it('playgroundWrap includes stdio.h', () => {
      expect(lang.playgroundWrap('// code')).toContain('#include <stdio.h>')
    })

    it('playgroundWrap places headers before user code', () => {
      const result = lang.playgroundWrap('int x = 1;')
      expect(result.indexOf('#include')).toBeLessThan(result.indexOf('int x = 1;'))
    })

    it('playgroundWrap preserves user code', () => {
      expect(lang.playgroundWrap('int main(){}')).toContain('int main(){}')
    })
  })

  describe('python', () => {
    const lang = LANGUAGES.python

    it('ext is .py', () => expect(lang.ext).toBe('.py'))
    it('srcFile is main.py', () => expect(lang.srcFile).toBe('main.py'))
    it('compile is null (interpreted)', () => expect(lang.compile).toBeNull())
    it('runner uses python3', () => {
      const [cmd] = lang.runner('/tmp/out', ['/src/main.py'])
      expect(cmd).toBe('python3')
    })
    it('runner passes source file as argument', () => {
      const [, src] = lang.runner('/tmp/out', ['/src/main.py'])
      expect(src).toBe('/src/main.py')
    })
    it('playgroundWrap returns code unchanged', () => {
      const code = 'print("hello")'
      expect(lang.playgroundWrap(code)).toBe(code)
    })
  })

  describe('getLanguage', () => {
    it('returns cpp entry for "cpp"', () => expect(getLanguage('cpp')).toBe(LANGUAGES.cpp))
    it('returns c entry for "c"', () => expect(getLanguage('c')).toBe(LANGUAGES.c))
    it('falls back to default for unknown id', () => expect(getLanguage('fortran')).toBe(LANGUAGES[DEFAULT_LANGUAGE]))
    it('falls back to default for undefined', () => expect(getLanguage(undefined)).toBe(LANGUAGES[DEFAULT_LANGUAGE]))
    it('falls back to default for null', () => expect(getLanguage(null)).toBe(LANGUAGES[DEFAULT_LANGUAGE]))
    it('falls back to default for empty string', () => expect(getLanguage('')).toBe(LANGUAGES[DEFAULT_LANGUAGE]))
  })

  describe('DEFAULT_LANGUAGE', () => {
    it('is "cpp"', () => expect(DEFAULT_LANGUAGE).toBe('cpp'))
    it('exists as a key in LANGUAGES', () => expect(LANGUAGES[DEFAULT_LANGUAGE]).toBeDefined())
  })
})

// P28: cross-check that server and client registries declare the same language IDs
describe('cross-check: server vs client language registry', () => {
  it('server and client LANGUAGES have identical keys', () => {
    expect(Object.keys(LANGUAGES).sort()).toEqual(Object.keys(clientLANGUAGES).sort())
  })
})
