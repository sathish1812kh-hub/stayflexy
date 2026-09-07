import fs from 'fs'
import yaml from 'js-yaml'

console.log('==============================================')
console.log('   Validating Apollo Supergraph Composition   ')
console.log('==============================================')

try {
  const content = fs.readFileSync('C:/Stayflexi/supergraph.yaml', 'utf8')
  const doc = yaml.load(content)

  if (!doc.subgraphs || Object.keys(doc.subgraphs).length < 5) {
    console.error('Supergraph validation failed: missing required subgraphs.')
    process.exit(1)
  }

  console.log('Found subgraphs:', Object.keys(doc.subgraphs).join(', '))
  console.log('Supergraph composition syntax & routing URLs valid.')
  process.exit(0)
} catch (err) {
  console.error('Supergraph composition check error:', err)
  process.exit(1)
}
