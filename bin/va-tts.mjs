#!/usr/bin/env node
// va-tts — DeepSeek cloud TTS for voice-alert. Text on stdin; writes a WAV.
// usage: va-tts.mjs <voice_id> <out.wav> [account|api-key]
//   account: token of the DeepSeek account signed in to DSH (synced by the plugin to a 600 file)
//   api-key: DEEPSEEK_API_KEY or ~/.dsh/secrets/deepseek.key
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const [voice = 'stella', out, auth = 'account'] = process.argv.slice(2)
if (!out) { console.error('usage: va-tts.mjs <voice_id> <out.wav> [account|api-key]  (text on stdin)'); process.exit(2) }

const firstLine = (file) => {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const t = line.trim()
      if (t && !t.startsWith('#')) return t
    }
  } catch {}
  return null
}

const apiKey = () => (process.env.DEEPSEEK_API_KEY || '').trim() || firstLine(path.join(os.homedir(), '.dsh/secrets/deepseek.key'))
const accountToken = () => firstLine(path.join(os.homedir(), '.dsh/state/voice-alert/account.token'))

const text = fs.readFileSync(0, 'utf8').trim()
if (!text) process.exit(3)

// 账号 token 走 x-dsh-auth-token；自定义 key 走 Bearer。
// account 模式下语音合成若不接受账号付费（401），自动改用 API key。
const attempts = []
if (auth !== 'api-key') { const t = accountToken(); if (t) attempts.push({ 'x-dsh-auth-token': t }) }
{ const k = apiKey(); if (k) attempts.push({ Authorization: 'Bearer ' + k }) }
if (attempts.length === 0) process.exit(3)

let status = 0
for (const headers of attempts) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    const r = await fetch('https://api.deepseek.com/v1/tools/tts', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id: voice, format: 'wav', filter_markdown: true }),
    })
    status = r.status
    if (r.ok) { fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); process.exit(0) }
    if (r.status !== 401 && r.status !== 403) break
  } catch (e) { console.error(String(e?.message || e)); process.exit(5) } finally { clearTimeout(timer) }
}
console.error('TTS ' + status)
process.exit(4)
