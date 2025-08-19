/**
 * Schema Validation Helper for API Tests
 *
 * Provides utilities for validating API responses against Zod schemas
 * Ensures contract compliance and type safety in tests
 */

import type { Response } from 'supertest'
import { expect } from 'vitest'
import type { z } from 'zod'

/**
 * Validates a response body against a Zod schema and returns the parsed result
 * Throws a descriptive error if validation fails
 */
export function validateResponse<T extends z.ZodType<any, any, any>>(
  response: Response,
  schema: T,
): z.infer<T> {
  const result = schema.safeParse(response.body)

  if (!result.success) {
    const errors = result.error.format()

    console.error('Schema validation failed:', JSON.stringify(errors, null, 2))

    throw new Error(
      `Response validation failed:\n${JSON.stringify(errors, null, 2)}\n\nActual response:\n${JSON.stringify(response.body, null, 2)}`,
    )
  }

  return result.data
}

/**
 * Validates a response and runs assertions on the validated data
 * Provides type-safe access to the response body
 */
export function expectValidResponse<T extends z.ZodType<any, any, any>>(
  response: Response,
  schema: T,
  assertions: (data: z.infer<T>) => void,
): void {
  const validatedData = validateResponse(response, schema)

  assertions(validatedData)
}

/**
 * Custom Vitest matcher for schema validation
 * Usage: expect(response).toMatchSchema(SearchSuccessResponse)
 */
export function toMatchSchema<T extends z.ZodType<any, any, any>>(
  response: Response,
  schema: T,
) {
  const result = schema.safeParse(response.body)

  return {
    pass: result.success,
    message: () => {
      if (result.success) {
        return 'Response matches schema'
      }

      const errors = result.error.format()

      return `Response does not match schema:\n${JSON.stringify(errors, null, 2)}\n\nActual response:\n${JSON.stringify(response.body, null, 2)}`
    },
    actual: response.body,
    expected: schema._def.typeName,
  }
}

/**
 * Extend Vitest's expect with custom matchers
 * Add this to your test setup file
 */
export function extendExpect() {
  expect.extend({
    toMatchSchema,
  })
}

// Type augmentation for the custom matcher
declare module 'vitest' {
  interface Assertion {
    toMatchSchema<S extends z.ZodType<any, any, any>>(schema: S): void
  }
  interface AsymmetricMatchersContaining {
    toMatchSchema<S extends z.ZodType<any, any, any>>(schema: S): void
  }
}
