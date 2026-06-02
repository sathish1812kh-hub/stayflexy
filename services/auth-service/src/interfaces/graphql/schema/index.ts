import { builder } from '../builder'

// Import all schema files to register them with Pothos Schema Builder
import './user'

export const schema = builder.toSubGraphSchema({})
