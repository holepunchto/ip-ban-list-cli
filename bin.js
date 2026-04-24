#!/usr/bin/env node

const path = require('path')
const os = require('os')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const IdEnc = require('hypercore-id-encoding')
const goodbye = require('graceful-goodbye')
const { command, flag, arg, summary, header } = require('paparam')
const IpBanList = require('ip-ban-list')

const DEFAULT_STORAGE = path.join(os.homedir(), '.ip-ban-list', 'corestore')

const banCmd = command(
  'ban',
  summary('Add an IP address to the ban list'),
  arg('<ip>', 'IP address to ban'),
  flag('--storage [path]', 'Storage path'),
  async (cmd) => {
    const ip = cmd.args.ip
    const storage = path.resolve(cmd.flags.storage || DEFAULT_STORAGE)
    const store = new Corestore(storage)
    goodbye(() => store.close())

    const banList = new IpBanList(store)
    goodbye(() => banList.close())

    await banList.ban(ip)
    console.log(`Banned ${ip}`)

    goodbye.exit()
  }
)

const unbanCmd = command(
  'unban',
  summary('Remove an IP address from the ban list'),
  arg('<ip>', 'IP address to unban'),
  flag('--storage [path]', 'Storage path'),
  async (cmd) => {
    const ip = cmd.args.ip
    const storage = path.resolve(cmd.flags.storage || DEFAULT_STORAGE)
    const store = new Corestore(storage)
    goodbye(() => store.close())

    const banList = new IpBanList(store)
    goodbye(() => banList.close())

    await banList.unban(ip)
    console.log(`Unbanned ${ip}`)

    goodbye.exit()
  }
)

const idCmd = command(
  'id',
  summary('Print the public key for the ban list'),
  flag('--storage [path]', 'Storage path'),
  async (cmd) => {
    const storage = path.resolve(cmd.flags.storage || DEFAULT_STORAGE)
    const store = new Corestore(storage)
    goodbye(() => store.close())

    const banList = new IpBanList(store)
    goodbye(() => banList.close())

    await banList.ready()

    console.log(IdEnc.normalize(banList.key))

    goodbye.exit()
  }
)

const seedCmd = command(
  'seed',
  summary('Seed the ban list over Hyperswarm'),
  flag('--storage [path]', 'Storage path'),
  flag('--bootstrap [port]', 'Bootstrap port (only relevant for tests)'),
  async (cmd) => {
    const storage = path.resolve(cmd.flags.storage || DEFAULT_STORAGE)
    const bootstrap = cmd.flags.bootstrap
      ? [{ host: '127.0.0.1', port: parseInt(cmd.flags.bootstrap, 10) }]
      : null
    const store = new Corestore(storage)
    const banList = new IpBanList(store)

    await banList.ready()

    const swarm = new Hyperswarm({ bootstrap })

    swarm.on('connection', (conn) => store.replicate(conn))
    swarm.join(banList.discoveryKey)

    goodbye(async () => {
      await swarm.destroy()
      await banList.close()
      await store.close()
    })

    console.log('Seeding ban list')
    console.log(`Key: ${IdEnc.normalize(banList.key)}`)
  }
)

const cmd = command(
  'ip-ban-list',
  header('CLI to manage and seed an ip-ban-list'),
  banCmd,
  unbanCmd,
  idCmd,
  seedCmd
)

cmd.parse()
