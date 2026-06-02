import { builder } from '../builder'

// Import all schema files to register them with Pothos Schema Builder
import './booking'

export const schema = builder.toSubGraphSchema({})
