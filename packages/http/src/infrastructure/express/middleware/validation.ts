import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'

interface ValidationError extends Error {
  code: string
  httpPart: string
  validation: Array<{
    instancePath: string
    schemaPath: string
    keyword: string
    params: Record<string, unknown>
    message: string
    data: unknown
  }>
}

/**
 * Middleware to validate request query parameters
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query)

      // For query parameters, we need to handle the read-only constraint
      Object.defineProperty(req, 'query', {
        value: validated,
        writable: false,
        enumerable: true,
        configurable: true,
      })
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new Error(
          'Query validation failed',
        ) as ValidationError

        validationError.code = 'VALIDATION_ERROR'
        validationError.httpPart = 'query'
        validationError.validation = error.issues.map((issue) => ({
          instancePath: `/query/${issue.path.join('/')}`,
          schemaPath: '',
          keyword: issue.code,
          params: {},
          message: issue.message,
          data: undefined,
        }))
        next(validationError)
      } else {
        next(error)
      }
    }
  }
}

/**
 * Middleware to validate request parameters
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params)

      // For params, we can use Object.assign since params are mutable
      Object.assign(req.params, validated)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new Error(
          'Params validation failed',
        ) as ValidationError

        validationError.code = 'VALIDATION_ERROR'
        validationError.httpPart = 'params'
        validationError.validation = error.issues.map((issue) => ({
          instancePath: `/params/${issue.path.join('/')}`,
          schemaPath: '',
          keyword: issue.code,
          params: {},
          message: issue.message,
          data: undefined,
        }))
        next(validationError)
      } else {
        next(error)
      }
    }
  }
}

/**
 * Middleware to validate request body
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body)

      req.body = validated
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new Error(
          'Body validation failed',
        ) as ValidationError

        validationError.code = 'VALIDATION_ERROR'
        validationError.httpPart = 'body'
        validationError.validation = error.issues.map((issue) => ({
          instancePath: `/body/${issue.path.join('/')}`,
          schemaPath: '',
          keyword: issue.code,
          params: {},
          message: issue.message,
          data: undefined,
        }))
        next(validationError)
      } else {
        next(error)
      }
    }
  }
}
