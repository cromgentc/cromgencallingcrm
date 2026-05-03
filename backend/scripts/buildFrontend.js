const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const backendRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(backendRoot, '..')
const frontendRoot = path.join(repoRoot, 'frontend')
const frontendDist = path.join(frontendRoot, 'dist')
const backendPublic = path.join(backendRoot, 'public')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })

  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

if (!fs.existsSync(frontendRoot)) {
  throw new Error(`Frontend directory not found at ${frontendRoot}`)
}

run('npm', ['install'], { cwd: frontendRoot })
run('npm', ['run', 'build'], { cwd: frontendRoot })

fs.rmSync(backendPublic, { recursive: true, force: true })
fs.mkdirSync(backendPublic, { recursive: true })
fs.cpSync(frontendDist, backendPublic, { recursive: true })

console.log(`Frontend build copied to ${backendPublic}`)
