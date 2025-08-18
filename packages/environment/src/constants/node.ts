import { getEnvVariable } from '../getEnvVariable.js'

export const NODE_ENV = getEnvVariable('NODE_ENV', String, 'development')
export const ENV_STAGE = getEnvVariable('ENV_STAGE', String, 'development')
export const LOG_LEVEL = getEnvVariable('LOG_LEVEL', String, 'info')
export const CI = getEnvVariable('CI', String, 'false')
export const DEBUG = getEnvVariable('DEBUG', String, 'false')
export const TEST_VERBOSE = getEnvVariable('TEST_VERBOSE', String, 'false')
export const ENABLE_QUEUE_IN_TEST = getEnvVariable(
  'ENABLE_QUEUE_IN_TEST',
  String,
  'false',
)

export const isDevelopment = NODE_ENV === 'development'
export const isProduction = NODE_ENV === 'production'
export const isTest = NODE_ENV === 'test'
export const isCI = CI === 'true'
