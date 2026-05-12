import bcrypt from 'bcryptjs'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const rl = readline.createInterface({ input, output })

try {
  const password = await rl.question('Password to hash: ')
  if (!password) {
    console.error('No password entered.')
    process.exitCode = 1
  } else {
    const hash = await bcrypt.hash(password, 12)
    console.log(hash)
  }
} finally {
  rl.close()
}
