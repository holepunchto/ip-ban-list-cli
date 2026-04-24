const path = require('path')
const { once } = require('events')
const test = require('brittle')
const Corestore = require('corestore')
const IdEnc = require('hypercore-id-encoding')
const Hyperswarm = require('hyperswarm')
const createTestnet = require('hyperdht/testnet')
const IpBanList = require('ip-ban-list')
const { runIpBanListBin, spawnIpBanListBin } = require('./helpers')

test('ban, seed, and unban update the replicated reader ban list', async (t) => {
  const storage = path.join(await t.tmp(), 'corestore')
  const ip = '8.8.8.8'

  const ban = await runIpBanListBin(t, 'ban', '--storage', storage, ip)
  t.is(ban.exitCode, 0)
  t.is(ban.stderr, '')
  t.ok(ban.stdout.includes(`Banned ${ip}`))

  const id = await runIpBanListBin(t, 'id', '--storage', storage)
  t.is(id.exitCode, 0)
  t.is(id.stderr, '')
  const key = IdEnc.decode(id.stdout.trim())

  const { bootstrap } = await createTestnet(3, t.teardown)
  const bootstrapPort = bootstrap[0].port

  const seedProc = spawnIpBanListBin(
    t,
    'seed',
    '--storage',
    storage,
    '--bootstrap',
    String(bootstrapPort)
  )

  const readerStore = new Corestore(await t.tmp())
  const reader = new IpBanList(readerStore, { key })
  t.teardown(async () => {
    await reader.close()
    await readerStore.close()
  })
  await reader.ready()

  const readerSwarm = new Hyperswarm({ bootstrap })
  t.teardown(() => readerSwarm.destroy())
  readerSwarm.on('connection', (conn) => readerStore.replicate(conn))
  readerSwarm.join(reader.discoveryKey)

  await once(reader, 'cache-updated')

  t.is(reader.isBanned(ip), true)
  t.is(reader.isBanned('1.1.1.1'), false)

  // we need to stop the old seed process to unlock the corestore so unban can work
  seedProc.kill('SIGTERM')
  await once(seedProc, 'close')

  const finalUnban = await runIpBanListBin(t, 'unban', '--storage', storage, ip)
  t.is(finalUnban.exitCode, 0)
  t.is(finalUnban.stderr, '')
  t.ok(finalUnban.stdout.includes(`Unbanned ${ip}`))

  // reseed
  const reseedProc = spawnIpBanListBin(
    t,
    'seed',
    '--storage',
    storage,
    '--bootstrap',
    String(bootstrapPort)
  )

  await once(reader, 'cache-updated')

  t.is(reader.isBanned(ip), false)

  reseedProc.kill('SIGTERM')
  await once(reseedProc, 'close')
})
