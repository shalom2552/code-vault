import { describe, it, expect } from 'vitest'
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage } from '../../src/languages.js'

describe('client language registry', () => {
  describe('registry shape', () => {
    it('contains cpp and c', () => {
      expect(Object.keys(LANGUAGES)).toEqual(expect.arrayContaining(['cpp', 'c']))
    })

    it.each(Object.entries(LANGUAGES))('%s has all required fields', (id, lang) => {
      expect(typeof lang.label).toBe('string')
      expect(lang.label.length).toBeGreaterThan(0)
      expect(typeof lang.defaultFile).toBe('string')
      expect(lang.defaultFile.length).toBeGreaterThan(0)
      expect(typeof lang.hljsLang).toBe('string')
      expect(lang.hljsLang.length).toBeGreaterThan(0)
      expect(typeof lang.playgroundDefault).toBe('string')
      expect(lang.playgroundDefault.length).toBeGreaterThan(0)
    })
  })

  describe('cpp', () => {
    const lang = LANGUAGES.cpp

    it('label is C++', () => expect(lang.label).toBe('C++'))
    it('defaultFile is main.cpp', () => expect(lang.defaultFile).toBe('main.cpp'))
    it('hljsLang is cpp', () => expect(lang.hljsLang).toBe('cpp'))
    it('playgroundDefault contains int main', () => expect(lang.playgroundDefault).toContain('int main'))
  })

  describe('c', () => {
    const lang = LANGUAGES.c

    it('label is C', () => expect(lang.label).toBe('C'))
    it('defaultFile is main.c', () => expect(lang.defaultFile).toBe('main.c'))
    it('hljsLang is c', () => expect(lang.hljsLang).toBe('c'))
    it('playgroundDefault contains int main', () => expect(lang.playgroundDefault).toContain('int main'))
  })

  describe('defaultFile extensions match server extensions', () => {
    it('cpp defaultFile ends with .cpp', () => expect(LANGUAGES.cpp.defaultFile).toMatch(/\.cpp$/))
    it('c defaultFile ends with .c', () => expect(LANGUAGES.c.defaultFile).toMatch(/\.c$/))
  })

  describe('python', () => {
    const lang = LANGUAGES.python

    it('label is Python', () => expect(lang.label).toBe('Python'))
    it('defaultFile is main.py', () => expect(lang.defaultFile).toBe('main.py'))
    it('hljsLang is python', () => expect(lang.hljsLang).toBe('python'))
    it('playgroundDefault is non-empty', () => expect(lang.playgroundDefault.length).toBeGreaterThan(0))
  })

  describe('getLanguage', () => {
    it('returns cpp entry for "cpp"', () => expect(getLanguage('cpp')).toBe(LANGUAGES.cpp))
    it('returns c entry for "c"', () => expect(getLanguage('c')).toBe(LANGUAGES.c))
    it('falls back to default for unknown id', () => expect(getLanguage('fortran')).toBe(LANGUAGES[DEFAULT_LANGUAGE]))
    it('falls back to default for undefined', () => expect(getLanguage(undefined)).toBe(LANGUAGES[DEFAULT_LANGUAGE]))
  })

  describe('DEFAULT_LANGUAGE', () => {
    it('is "cpp"', () => expect(DEFAULT_LANGUAGE).toBe('cpp'))
    it('exists as a key in LANGUAGES', () => expect(LANGUAGES[DEFAULT_LANGUAGE]).toBeDefined())
  })
})
