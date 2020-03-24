import { graphql } from '@octokit/graphql'
import { enterpriseCompatibility } from '@octokit/plugin-enterprise-compatibility'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'
import { Octokit } from '@octokit/rest'

import { addGraphQL } from './graphql'
import { addLogging, Logger } from './logging'
import { addPagination } from './pagination'

export const ProbotOctokit = Octokit
  .plugin([throttling, retry, enterpriseCompatibility])

/**
 * the [@octokit/rest Node.js module](https://github.com/octokit/rest.js),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @see {@link https://github.com/octokit/rest.js}
 */
export function GitHubAPI (options: Options = {} as any) {
  const OctokitFromOptions = options.Octokit || ProbotOctokit
  const octokit = new OctokitFromOptions(Object.assign(options, {
    throttle: Object.assign({
      onAbuseLimit: (retryAfter: number) => {
        options.logger.warn(`Abuse limit hit, retrying in ${retryAfter} seconds`)
        return true
      },
      onRateLimit: (retryAfter: number) => {
        options.logger.warn(`Rate limit hit, retrying in ${retryAfter} seconds`)
        return true
      }
    }, options.throttle)
  })) as GitHubAPI

  addPagination(octokit)
  addLogging(octokit, options.logger)
  addGraphQL(octokit)

  return octokit
}

export interface Options extends Octokit.Options {
  debug?: boolean
  logger: Logger
  Octokit: Octokit.Static
}

export interface RequestOptions {
  baseUrl?: string
  method?: string
  url?: string
  headers?: any
  query?: string
  variables?: Variables
  data?: any
}

export interface Result {
  headers: {
    status: string
  }
}

export interface OctokitError extends Error {
  status: number
}

interface Paginate extends Octokit.Paginate {
  (
    responsePromise: Promise<Octokit.AnyResponse>,
    callback?: (response: Octokit.AnyResponse, done: () => void) => any
  ): Promise<any[]>
}

type Graphql = (query: string, variables?: Variables, headers?: Headers) => ReturnType<typeof graphql>

export interface GitHubAPI extends Octokit {
  paginate: Paginate
  graphql: Graphql
  /**
   * @deprecated `.query()` is deprecated, use `.graphql()` instead
   */
  query: Graphql
}

export interface GraphQlQueryResponse {
  data: { [ key: string ]: any } | null
  errors?: [{
    message: string
    path: [string]
    extensions: { [ key: string ]: any }
    locations: [{
      line: number,
      column: number
    }]
  }]
}

export interface Headers {
  [key: string]: string
}

export interface Variables { [key: string]: any }

export { GraphQLError } from './graphql'
