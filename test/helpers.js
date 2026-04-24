const { spawn } = require('child_process')
const path = require('path')
const NewlineDecoder = require('newline-decoder')
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

exports.waitForOutput = (proc, text, timeout = 30000) => {
  return new Promise((resolve, reject) => {
    const stdoutDec = new NewlineDecoder('utf-8')
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`Timeout waiting for "${text}"`))
    }, timeout)

    const cleanup = () => {
      clearTimeout(timer)
      proc.stdout.removeListener('data', onData)
      proc.removeListener('close', onClose)
    }

    const onData = (data) => {
      for (const line of stdoutDec.push(data)) {
        if (line.includes(text)) {
          cleanup()
          resolve(true)
        }
      }
    }

    const onClose = (exitCode) => {
      cleanup()
      reject(new Error(`Process exited with code ${exitCode} before "${text}"`))
    }

    proc.stdout.on('data', onData)
    proc.once('close', onClose)
  })
}
