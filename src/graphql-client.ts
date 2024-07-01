import { ApolloClient, gql, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core';
import { ApolloQueryResult } from '@apollo/client/core/types';
import { FetchResult } from '@apollo/client/link/core';
import { GraphQLRequest, IntegrationId, Squid } from '@squidcloud/client';

/** The interface supported by Squid but is not exposed to public. */
interface SquidInternal {
  getApplicationUrl: (region: string, appId: string, integrationId: string) => string;
  getStaticHeaders: () => Record<string, string>;
}

// noinspection JSUnusedGlobalSymbols
/** A GraphQL client that can be used to query and mutate data. */
export class GraphQLClient {
  private readonly client: ApolloClient<NormalizedCacheObject>;

  constructor(
    squid: Squid,
    integrationId: IntegrationId,
  ) {
    const squidInternal = squid as unknown as SquidInternal;
    const url = squidInternal.getApplicationUrl(squid.options.region, squid.options.appId, `${integrationId}/graphql`);
    this.client = new ApolloClient({
      link: new HttpLink({
        uri: url,
        headers: squidInternal.getStaticHeaders(),
      }),
      cache: new InMemoryCache(),
    });
  }

  /** Executes a GraphQL query and returns a promise with the result. */
  async query<T = any>(request: GraphQLRequest): Promise<T> {
    const result: ApolloQueryResult<T> = await this.client.query({
      query: gql`
        ${request.query}
      `,
      variables: request.variables as Record<string, any>,
    });
    return result.data;
  }

  /** Executes a GraphQL mutation and returns a promise with the result. */
  async mutate<T = Record<string, any>>(request: GraphQLRequest): Promise<T | null | undefined> {
    const result: FetchResult<T> = await this.client.mutate({
      mutation: gql`
        ${request.query}
      `,
    });
    return result.data;
  }
}
