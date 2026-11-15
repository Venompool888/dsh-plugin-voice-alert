#!/usr/bin/env node
// va-line — ask DeepSeek chat for one short spoken line in a chosen persona. Prints the line; nothing on failure.
// usage: va-line.mjs <style> <lang> <persona> <source> <project> <round> [official|custom] [base_url]  (event text on stdin)
//   style: approve | code | urgent | done      persona: pro | tsundere | cute | clingy | cold | custom
//   custom persona text comes from VA_CFG_PERSONA_CUSTOM
// exit: 0 printed · 3 no key / bad args · 4 HTTP or empty answer · 5 network / timeout
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const [style = 'approve', lang = 'zh', persona = 'pro', source = 'DSH', project = '', roundArg = '1', provider = 'official', baseArg = ''] = process.argv.slice(2)
const round = Math.max(1, Number(roundArg) || 1)

const firstLine = (file) => {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const t = line.trim()
      if (t && !t.startsWith('#')) return t
    }
  } catch {}
  return null
}
const secrets = path.join(os.homedir(), '.dsh/secrets')
const custom = provider === 'custom'
const base = (custom ? baseArg : 'https://api.deepseek.com').trim().replace(/\/+$/, '')
const key = custom
  ? firstLine(path.join(secrets, 'voice-alert-custom.key'))
  : firstLine(path.join(secrets, 'deepseek.key')) || firstLine(path.join(os.homedir(), '.dsh/state/voice-alert/dsh-deepseek.key'))
if (!key || !/^https?:\/\//.test(base)) process.exit(3)
const endpoint = /\/v1$/.test(base) ? `${base}/chat/completions` : `${base}/v1/chat/completions`

const LANG_NAME = { zh: '简体中文', en: 'English', ja: '日本語', ko: '한국어', fr: 'français', de: 'Deutsch', es: 'español', pt: 'português', it: 'italiano', ru: 'русский' }
const PERSONA = {
  pro: 'professional: concise, polite and calm, like a reliable assistant',
  tsundere: 'tsundere: grumbles and acts reluctant or annoyed, but clearly cares',
  cute: 'cute: cheerful, bubbly and playful, light interjections are fine',
  clingy: 'clingy and pleading: soft, whiny, misses the user and begs them to come back',
  cold: 'cold: flat, minimal, no emotion, as few words as possible',
}
const WHAT = {
  approve: 'the session is waiting for the user to approve an action',
  code: 'the session needs a verification code from the user (do NOT say any digits; they are read separately right after your line)',
  urgent: 'the AI is stuck and needs the user to decide',
  done: 'a long task has finished',
}
const personaText = persona === 'custom'
  ? `custom persona described by the user: ${(process.env.VA_CFG_PERSONA_CUSTOM || '').slice(0, 200) || 'friendly'}`
  : PERSONA[persona] || PERSONA.pro
const detail = fs.readFileSync(0, 'utf8').trim().slice(0, 200)

const system = [
  `You write ONE short sentence that a Mac will speak aloud to call the user back to the computer.`,
  `Language: ${LANG_NAME[lang] || 'English'}. At most ${lang === 'zh' || lang === 'ja' ? '30 characters' : lang === 'ko' ? '25 syllables' : '20 words'}.`,
  `Persona and tone: ${personaText}.`,
  `It must mention the source "${source}"${project ? ` and the project "${project}"` : ''}, and what is needed: ${WHAT[style] || WHAT.approve}.`,
  round > 1 ? `This is call number ${round}; the user has not come back yet, so vary the wording and sound a bit more insistent, staying in persona.` : '',
  `No emoji, no quotes, no markdown, no code, no URLs, no file paths. Output only the sentence.`,
].filter(Boolean).join('\n')

try {
  const r = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(Number(process.env.VA_LINE_TIMEOUT_MS) || 3500),
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 1.3,
      max_tokens: 80,
      messages: [{ role: 'system', content: system }, { role: 'user', content: detail ? `Details: ${detail}` : 'Write the line.' }],
    }),
  })
  if (!r.ok) process.exit(4)
  const j = await r.json()
  let line = String(j?.choices?.[0]?.message?.content || '').split('\n').map((s) => s.trim()).find(Boolean) || ''
  line = line.replace(/^["'“”「『]+|["'“”」』]+$/g, '').replace(/[`*_#<>]/g, '').trim()
  if (!line || line.length > 160) process.exit(4)
  process.stdout.write(line)
} catch {
  process.exit(5)
}
