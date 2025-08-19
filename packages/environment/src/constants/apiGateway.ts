import { getEnvVariable } from '../getEnvVariable.js'
import { parseBoolean, parseNumber } from '../parsers.js'

export const API_GATEWAY_PORT = getEnvVariable(
  'API_GATEWAY_PORT',
  parseNumber,
  5500,
)
export const API_GATEWAY_BASE_URL = getEnvVariable(
  'API_GATEWAY_BASE_URL',
  String,
  'http://127.0.0.1:5500',
)
export const SERVICE_HOST = getEnvVariable('SERVICE_HOST', String, '0.0.0.0')
export const CORS_ORIGIN = getEnvVariable('CORS_ORIGIN', String, '*')
export const ENABLE_HELMET = getEnvVariable('ENABLE_HELMET', parseBoolean, true)
export const ENABLE_CORS = getEnvVariable('ENABLE_CORS', parseBoolean, true)
export const ENABLE_COMPRESSION = getEnvVariable(
  'ENABLE_COMPRESSION',
  parseBoolean,
  true,
)
