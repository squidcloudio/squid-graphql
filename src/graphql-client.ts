import { ApolloClient, gql, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core';
import { ApolloQueryResult } from '@apollo/client/core/types';
import { setContext } from '@apollo/client/link/context';
import { FetchResult } from '@apollo/client/link/core';
import { IntegrationId, Squid } from '@squidcloud/client';

interface GraphQLRequest {
  operationName?: string;
  query?: string;
  variables?: string | Record<string, any>;
}

/** The interface supported by Squid but is not exposed to public. */
interface SquidInternal {
  internal(): {
    getApplicationUrl: (region: string, appId: string, integrationId: string) => string;
    appIdWithEnvironmentIdAndDevId: (
      appId: string,
      environmentId: string | undefined,
      developerId: string | undefined,
    ) => string;
    getStaticHeaders: () => Record<string, string>;
    getAuthHeaders?: () => Record<string, string>;
  };
}

// noinspection JSUnusedGlobalSymbols
/** A GraphQL client that can be used to query and mutate data. */
export class GraphQLClient {
  private readonly client: ApolloClient<NormalizedCacheObject>;

  constructor(squid: Squid, integrationId: IntegrationId) {
    const squidInternal = (squid as unknown as SquidInternal).internal();
    const options = squid.options;
    const appId = squidInternal.appIdWithEnvironmentIdAndDevId(
      options.appId,
      options.environmentId,
      options.squidDeveloperId,
    );

    const url = squidInternal.getApplicationUrl(options.region, appId, `${integrationId}/graphql`);
    const httpLink = new HttpLink({
      uri: url,
      headers: squidInternal.getStaticHeaders(),
    });

    const authLink = setContext(async (_, { headers }) => {
      const authHeaders = (await squidInternal.getAuthHeaders?.()) || {};
      return {
        headers: {
          ...headers,
          ...authHeaders,
        },
      };
    });

    this.client = new ApolloClient({
      link: authLink.concat(httpLink),
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
      variables: request.variables as Record<string, any>,
    });
    return result.data;
  }
}
