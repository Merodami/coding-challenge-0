import packageJson from '../../../../package.json' with { type: 'json' }
import { getEnvVariable } from '../getEnvVariable.js'
import { parseBoolean, parseString } from '../parsers.js'

export const APP_NAME = getEnvVariable('APP_NAME', String, 'FeverEvents')
export const APP_VERSION = getEnvVariable('APP_VERSION', String, '1.0.0')
export const VERSION = packageJson.version
export const BASE_URL = getEnvVariable(
  'BASE_URL',
  String,
  'http://localhost:5500',
)
export const API_PREFIX = getEnvVariable('API_PREFIX', parseString, '/api/v1')
export const HOST = getEnvVariable('HOST', String, '0.0.0.0')
export const DEFAULT_TIMEZONE = getEnvVariable(
  'DEFAULT_TIMEZONE',
  String,
  'Europe/Madrid',
)
export const DEFAULT_CURRENCY = getEnvVariable(
  'DEFAULT_CURRENCY',
  String,
  'EUR',
)
export const EMBEDDED_MODE = getEnvVariable(
  'EMBEDDED_MODE',
  parseBoolean,
  false,
)
