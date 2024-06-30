import { ApolloClient, gql, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client/core';
import { ApolloQueryResult } from '@apollo/client/core/types';
import { FetchResult } from '@apollo/client/link/core';
import { GraphQLRequest, IntegrationId, SquidRegion } from '@squidcloud/client';
import { getApplicationUrl } from '@squidcloud/client/dist/internal-common/src/utils/http';

/** A GraphQL client that can be used to query and mutate data. */
export class GraphQLClient {
  private readonly client: ApolloClient<NormalizedCacheObject>;

  /** @internal */
  constructor(
    private readonly rpcManager: RpcManager,
    integrationId: IntegrationId,
    private readonly region: SquidRegion,
    private readonly appId: string,
  ) {
    const url = getApplicationUrl(this.region, this.appId, `${integrationId}/graphql`);
    this.client = new ApolloClient({
      link: new HttpLink({
        uri: url,
        headers: this.rpcManager.getStaticHeaders(),
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
