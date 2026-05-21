function log(level, ...args) {
  const ts = new Date().toISOString()
  ;(level === 'error' ? console.error : console.log)(`[${ts}] [${level}]`, ...args)
}

export const info = (...args) => log('INFO', ...args)
export const error = (...args) => log('ERROR', ...args)
