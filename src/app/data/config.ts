/**
 * Configuration interface
 */
export interface AppConfig {
  debug: boolean
  track: boolean
  enableCamera: boolean
  enableMicrophone: boolean
}

export const appConfig: AppConfig = {
  debug: true,
  track: false,
  enableCamera: false,
  enableMicrophone: false,
}