/**
 * XML Parser Module
 * Handles XML parsing with error handling using modern fast-xml-parser
 */

import { ErrorFactory, logger } from '@fever/shared'
import { XMLParser as FastXMLParser } from 'fast-xml-parser'

interface ParsedXMLResponse {
  planList: {
    output: {
      base_plan: any[]
    }
  }
}

export class XMLParser {
  private parser: FastXMLParser

  constructor() {
    this.parser = new FastXMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: false, // Keep values as strings
      trimValues: true,
      isArray: (name) => {
        // Force arrays for base_plan, plan, and zone elements
        return name === 'base_plan' || name === 'plan' || name === 'zone'
      },
    })
  }
  /**
   * Parse XML string to JavaScript object
   * @param xmlData - Raw XML string from provider
   * @returns Parsed provider XML response
   */
  async parse(xmlData: string): Promise<ParsedXMLResponse> {
    try {
      logger.debug(
        {
          xmlLength: xmlData.length,
          xmlSnippet: xmlData.substring(0, 200),
        },
        'Parsing XML data',
      )

      const result = this.parser.parse(xmlData)

      // Validate that the parsed result has the expected structure
      if (!result || !result.planList || result.planList.output === undefined) {
        throw new Error('Invalid XML structure: missing planList or output')
      }

      logger.debug(
        {
          hasPlanList: !!result.planList,
          planCount: result.planList?.output?.base_plan
            ? Array.isArray(result.planList.output.base_plan)
              ? result.planList.output.base_plan.length
              : 1
            : 0,
        },
        'Successfully parsed XML',
      )

      return result
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.error(
        {
          err: appError,
          xmlSnippet: xmlData.substring(0, 200),
        },
        'Failed to parse XML',
      )

      throw ErrorFactory.externalServiceError(
        'XMLParser',
        'parse',
        'Invalid XML response from provider',
        appError,
      )
    }
  }

  /**
   * Safe parse XML string with fallback
   * @param xmlData - Raw XML string from provider
   * @returns Parsed provider XML response or empty structure
   */
  async safeParse(xmlData: string): Promise<ParsedXMLResponse> {
    try {
      return await this.parse(xmlData)
    } catch (error) {
      const appError = ErrorFactory.fromError(error)

      logger.warn({ err: appError }, 'XML parsing failed, using fallback')

      // Return empty structure as fallback
      return {
        planList: { output: { base_plan: [] } },
      }
    }
  }
}
