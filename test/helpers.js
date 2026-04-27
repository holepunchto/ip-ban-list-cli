const { spawn } = require('child_process')
const path = require('path')
const { once } = require('events')
const process = require('process')
const { isBare } = require('which-runtime')

const EXECUTABLE = isBare
  ? path.join(__dirname, '..', 'bare-bin.js')
  : path.join(__dirname, '..', 'bin.js')

exports.spawnIpBanListBin = (t, ...args) => {
  const proc = spawn(process.execPath, [EXECUTABLE, ...args])

  t.teardown(() => {
    if (proc.exitCode === null) proc.kill('SIGKILL')
  })

  process.once('exit', () => {
    if (proc.exitCode === null) proc.kill('SIGKILL')
  })

  return proc
}

exports.runIpBanListBin = async (t, ...args) => {
  const proc = exports.spawnIpBanListBin(t, ...args)

  let stdout = ''
  let stderr = ''

  proc.stdout.on('data', (data) => {
    stdout += data.toString()
  })

  proc.stderr.on('data', (data) => {
    stderr += data.toString()
  })

  const [exitCode] = await once(proc, 'close')

  return { exitCode, stdout, stderr }
}
