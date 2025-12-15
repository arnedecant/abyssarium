import { appConfig } from '../config'

export default class Terminal {

  static log (...args: any[]): void {
    if (!appConfig.debug) return
    console.log('[Terminal]', ...args)
  }

  static error (...args: any[]): void {
    if (!appConfig.debug) return
    console.error('[Terminal]', ...args)
  }

  static warn (...args: any[]): void {
    if (!appConfig.debug) return
    console.warn('[Terminal]', ...args)
  }

  static info (...args: any[]): void {
    if (!appConfig.debug) return
    console.info('[Terminal]', ...args)
  }
}