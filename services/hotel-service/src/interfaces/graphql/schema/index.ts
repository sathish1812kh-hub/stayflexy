import { builder } from '../builder'

// Import all schema types to register them with the builder
import './hotel'
import './roomType'
import './room'

export const schema = builder.toSubGraphSchema({})
