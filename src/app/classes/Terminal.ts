import { appConfig } from '../data/config'

export default class Terminal {

  private static name = 'ABYSSARIUM'

  private static styles = {
    error: 'background: #c93030; color: #fff; font-weight: bold; border-radius:2px; padding:2px 6px;',
    warn: 'background: #f9a825; color: #222; font-weight: bold; border-radius:2px; padding:2px 6px;',
    info: 'background: #1976d2; color: #fff; font-weight: bold; border-radius:2px; padding:2px 6px;',
    log: 'background: #333; color: #fff; font-weight: bold; border-radius:2px; padding:2px 6px;',
    debug: 'background: #724caf; color: #fff; font-weight: bold; border-radius:2px; padding:2px 6px;',
    track: 'background: #333; color: #fff; font-weight: bold; border-radius:2px; padding:2px 6px;',
  }

  static log (...args: any[]): void {
    if (!appConfig.debug) return
    console.log(`%c${this.name}`, this.styles.log, ...args)
  }

  static error (...args: any[]): void {
    console.error(`%c${this.name}`, this.styles.error, ...args)
  }

  static warn (...args: any[]): void {
    console.warn(`%c${this.name}`, this.styles.warn, ...args)
  }

  static info (...args: any[]): void {
    console.info(`%c${this.name}`, this.styles.info, ...args)
  }

  static debug (...args: any[]): void {
    if (!appConfig.debug) return
    console.debug(`%c${this.name}`, this.styles.debug, ...args)
  }

  static track (...args: any[]): void {
    if (!appConfig.track) return
    console.log(`%c${this.name}`, this.styles.track, ...args)
  }
}