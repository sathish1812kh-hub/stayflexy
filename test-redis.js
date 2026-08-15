const Redis = require('ioredis')
console.log('Connecting to Redis...')
const redis = new Redis('redis://:redis_dev@127.0.0.1:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

async function main() {
  console.log('Calling connect()...')
  await redis.connect()
  console.log('Calling ping()...')
  const res = await redis.ping()
  console.log('Ping result:', res)
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error('Redis error:', err)
    process.exit(1)
  })
  .finally(() => {
    redis.disconnect()
  })
