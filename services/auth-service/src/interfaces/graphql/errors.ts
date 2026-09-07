import { GraphQLError } from 'graphql'
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@stayflexi/shared-errors'

export function toGraphQLError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) {
    return error
  }

  if (error instanceof UnauthorizedError) {
    return new GraphQLError(error.message, {
      extensions: {
        code: 'UNAUTHORIZED',
        http: { status: 401 },
      },
    })
  }

  if (error instanceof ForbiddenError) {
    return new GraphQLError(error.message, {
      extensions: {
        code: 'FORBIDDEN',
        http: { status: 403 },
      },
    })
  }

  if (error instanceof NotFoundError) {
    return new GraphQLError(error.message, {
      extensions: {
        code: 'NOT_FOUND',
        http: { status: 404 },
      },
    })
  }

  if (error instanceof ConflictError) {
    return new GraphQLError(error.message, {
      extensions: {
        code: 'CONFLICT',
        http: { status: 409 },
      },
    })
  }

  if (error instanceof ValidationError) {
    return new GraphQLError(error.message, {
      extensions: {
        code: 'BAD_USER_INPUT',
        http: { status: 422 },
        details: error.details,
      },
    })
  }

  const message = error instanceof Error ? error.message : 'Internal server error'
  return new GraphQLError(message, {
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
      http: { status: 500 },
    },
  })
}
