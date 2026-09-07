import { spawn } from 'child_process'

const serverPath =
  'C:/Users/Sathish/AppData/Roaming/npm/node_modules/@modelcontextprotocol/server-puppeteer/dist/index.js'

console.log('Testing Puppeteer / Chrome DevTools MCP server startup...')

const proc = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
})

let buffer = ''

// Step 1: Initialize
const initMessage =
  JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'browser-smoke-test',
        version: '1.0.0',
      },
    },
  }) + '\n'

proc.stdout.on('data', (chunk) => {
  buffer += chunk.toString()
  const lines = buffer.split('\n')
  buffer = lines.pop()

  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id === 1 && msg.result) {
        console.log('✅ Server Initialized:', msg.result.serverInfo)

        // Step 2: Request tools list
        const toolsListMsg =
          JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {},
          }) + '\n'
        proc.stdin.write(toolsListMsg)
      } else if (msg.id === 2 && msg.result?.tools) {
        console.log(`✅ Discovered ${msg.result.tools.length} Browser Tools:`)
        msg.result.tools.forEach((t) => {
          console.log(`   - ${t.name}: ${t.description}`)
        })
        console.log('\n🎉 Puppeteer / Chrome DevTools MCP server is fully operational!')
        proc.kill()
        process.exit(0)
      }
    } catch (e) {
      // Ignored non-JSON or partial stream
    }
  }
})

proc.on('error', (err) => {
  console.error('❌ Failed to start server process:', err)
  process.exit(1)
})

setTimeout(() => {
  console.error('❌ Smoke test timed out waiting for response.')
  proc.kill()
  process.exit(1)
}, 10000)

proc.stdin.write(initMessage)
