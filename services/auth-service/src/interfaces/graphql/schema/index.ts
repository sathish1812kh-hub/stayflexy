import { builder } from '../builder'

// Import all schema files to register them with Pothos Schema Builder
import './user'
import './role'
import './invitation'
import './organization'

export const schema = builder.toSubGraphSchema({})
