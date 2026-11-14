#!/usr/bin/env node
// va-tts — DeepSeek TTS for voice-alert. Text on stdin; writes a WAV.
// usage: va-tts.mjs <voice_id> <out.wav> [official|custom] [base_url]
//   official: https://api.deepseek.com, key entered on Settings → Voice, else the DeepSeek key configured in DSH Models
//             (synced by the plugin to ~/.dsh/state/voice-alert/dsh-deepseek.key)
//   custom:   a third-party DeepSeek-compatible service, key from ~/.dsh/secrets/voice-alert-custom.key
// exit: 0 ok · 3 no text / no key / bad base URL · 4 HTTP error · 5 network error
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const OFFICIAL = 'https://api.deepseek.com'
const [voice = 'stella', out, provider = 'official', baseArg = ''] = process.argv.slice(2)
if (!out) { console.error('usage: va-tts.mjs <voice_id> <out.wav> [official|custom] [base_url]  (text on stdin)'); process.exit(2) }

const firstLine = (file) => {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const t = line.trim()
      if (t && !t.startsWith('#')) return t
    }
  } catch {}
  return null
}

/**
 * The TTS endpoint for a base URL, the same way DSH builds its DeepSeek tool endpoints (`/v1/tools/...`).
 * `https://x.com` and `https://x.com/v1` both become `https://x.com/v1/tools/tts`.
 */
export function ttsEndpoint(base) {
  const b = base.trim().replace(/\/+$/, '')
  return /\/v1$/.test(b) ? `${b}/tools/tts` : `${b}/v1/tools/tts`
}

const secrets = path.join(os.homedir(), '.dsh/secrets')
const custom = provider === 'custom'
const base = custom ? baseArg : OFFICIAL
const key = custom
  ? firstLine(path.join(secrets, 'voice-alert-custom.key'))
  : firstLine(path.join(secrets, 'deepseek.key')) || firstLine(path.join(os.homedir(), '.dsh/state/voice-alert/dsh-deepseek.key'))
if (!base || !/^https?:\/\//.test(base) || !key) process.exit(3)

const text = fs.readFileSync(0, 'utf8').trim()
if (!text) process.exit(3)

try {
  const r = await fetch(ttsEndpoint(base), {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice_id: voice, format: 'wav', filter_markdown: true }),
  })
  if (r.ok) { fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); process.exit(0) }
  console.error('TTS ' + r.status)
  process.exit(4)
} catch (e) {
  console.error(String(e?.message || e))
  process.exit(5)
}
