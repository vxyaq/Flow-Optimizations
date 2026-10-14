const noop = () => {}

const log = import.meta.env.DEV
  ? {
      info: console.log.bind(console),
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    }
  : { info: noop, log: noop, warn: noop, error: noop, debug: noop }

export default log
