import { getEnvVariable } from '../getEnvVariable.js'
import { parseNumber } from '../parsers.js'

export const PAGINATION_DEFAULT_LIMIT = getEnvVariable(
  'PAGINATION_DEFAULT_LIMIT',
  parseNumber,
  20,
)
export const PAGINATION_MAX_LIMIT = getEnvVariable(
  'PAGINATION_MAX_LIMIT',
  parseNumber,
  100,
)
