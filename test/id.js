const path = require('path')
const test = require('brittle')
const Corestore = require('corestore')
const IdEnc = require('hypercore-id-encoding')
const IpBanList = require('ip-ban-list')
const { runIpBanListBin } = require('./helpers')

test('id prints the key for the selected storage', async (t) => {
  const storage = path.join(await t.tmp(), 'corestore')
  const store = new Corestore(storage)
  const banList = new IpBanList(store)

  await banList.ready()
  const expectedId = IdEnc.normalize(banList.key)

  await banList.close()
  await store.close()

  const result = await runIpBanListBin(t, 'id', '--storage', storage)

  t.is(result.exitCode, 0)
  t.is(result.stderr, '')
  t.is(result.stdout.trim(), expectedId)
})
