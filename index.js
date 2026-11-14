/**
 * dsh-plugin-voice-alert — Host half.
 *
 * 1. Registers the `voice-alert` skill (skills/voice-alert/SKILL.md), so turning
 *    this bundle off in Settings also removes the skill.
 * 2. Announces approvals: every `approval/asked` session event plays
 *    「来自 DSH，<项目> 项目需要你批准」 via ~/.dsh/bin/voice-alert.
 *    Read-only listener on the audit event; it never answers the approval.
 * 3. Serves the Settings → Voice page (client.js) over `/voice-alert/*` RPC.
 *    Settings land in ~/.dsh/state/voice-alert/config.{json,env}; the script
 *    sources config.env, so Claude Code and Codex get the same settings.
 */
import { execFile, spawn } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'voice-alert'
export const inject = ['skills', 'webServer', 'connection']

const HOME = homedir()
const SCRIPT = `${HOME}/.dsh/bin/voice-alert`
const STATE = `${HOME}/.dsh/state/voice-alert`
const CONFIG_JSON = `${STATE}/config.json`
const CONFIG_ENV = `${STATE}/config.env`
const WATCH_FILE = `${STATE}/watch`
const RPC_CHANNEL = '/voice-alert'
const KEY_FILE = `${HOME}/.dsh/secrets/deepseek.key`
const TOKEN_FILE = `${STATE}/account.token`
const TTS_URL = 'https://api.deepseek.com/v1/tools/tts'
const IS_MAC = process.platform === 'darwin'
const LANGS = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'it', 'ru']
const BUNDLED_SCRIPT = fileURLToPath(new URL('./bin/voice-alert', import.meta.url))
const BUNDLED_TTS = fileURLToPath(new URL('./bin/va-tts.mjs', import.meta.url))
// DSH 桌面版的 process.execPath 是 Electron 主程序，不能当 node 用；改用 DSH 自带的 node 运行时
const RUNTIME_NODE = `${HOME}/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node`
// 后台加载时的插件版本。设置页拿它和自己的版本比，对不上说明 DSH 还在跑旧后台
const HOST_VERSION = (() => { try { return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version } catch { return '' } })()
// 最近一次试听的开始时间：只认这之后写下的结果
let lastTestAt = 0
const NODE_PATH = !process.versions.electron ? process.execPath : (existsSync(RUNTIME_NODE) ? RUNTIME_NODE : '')

const DEFAULTS = {
  engine: 'deepseek', auth: 'account', voiceId: 'stella', sayVoice: '', lang: 'zh', rate: 185,
  autoVolume: true, chime: true, banner: true, dedupe: 20, approval: true, watchHours: 4,
}
const ENV_KEYS = {
  engine: 'VA_CFG_ENGINE', auth: 'VA_CFG_AUTH', voiceId: 'VA_CFG_VOICE_ID', sayVoice: 'VA_CFG_SAY_VOICE', lang: 'VA_CFG_LANG',
  rate: 'VA_CFG_RATE', autoVolume: 'VA_CFG_AUTO_VOLUME', chime: 'VA_CFG_CHIME', banner: 'VA_CFG_BANNER',
  dedupe: 'VA_CFG_DEDUPE', approval: 'VA_CFG_APPROVAL', watchHours: 'VA_CFG_WATCH_HOURS',
}

// ---------- settings ----------

function readConfig() {
  try { return sanitize({ ...DEFAULTS, ...JSON.parse(readFileSync(CONFIG_JSON, 'utf8')) }) } catch { return { ...DEFAULTS } }
}

const int = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d }
const oneOf = (v, list, d) => (list.includes(v) ? v : d)

function sanitize(c) {
  return {
    engine: oneOf(c.engine, ['deepseek', 'say'], DEFAULTS.engine),
    auth: oneOf(c.auth, ['account', 'api-key'], DEFAULTS.auth),
    voiceId: oneOf(c.voiceId, ['stella', 'tide'], DEFAULTS.voiceId),
    sayVoice: typeof c.sayVoice === 'string' && /^[\w ().'-]{0,80}$/.test(c.sayVoice) ? c.sayVoice : '',
    lang: oneOf(c.lang, LANGS, DEFAULTS.lang),
    rate: int(c.rate, 120, 260, DEFAULTS.rate),
    autoVolume: c.autoVolume !== false,
    chime: c.chime !== false,
    banner: c.banner !== false,
    dedupe: int(c.dedupe, 0, 120, DEFAULTS.dedupe),
    approval: c.approval !== false,
    watchHours: int(c.watchHours, 1, 12, DEFAULTS.watchHours),
  }
}

const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`

function writeConfig(c) {
  mkdirSync(STATE, { recursive: true })
  const env = ['# 由 DSH「设置 → 语音」生成，Claude Code / Codex / DSH 共用。手改会被覆盖。']
  // 运行时路径：脚本用 DSH 自带的 node 跑插件里的 va-tts.mjs，别人电脑上也能用云端语音
  if (NODE_PATH) env.push(`VA_CFG_NODE=${shq(NODE_PATH)}`)
  env.push(`VA_CFG_TTS=${shq(BUNDLED_TTS)}`)
  for (const [k, envKey] of Object.entries(ENV_KEYS)) {
    const v = typeof c[k] === 'boolean' ? (c[k] ? '1' : '0') : c[k]
    env.push(`${envKey}=${shq(v)}`)
  }
  writeFileSync(CONFIG_JSON + '.tmp', JSON.stringify(c, null, 2) + '\n')
  renameSync(CONFIG_JSON + '.tmp', CONFIG_JSON)
  writeFileSync(CONFIG_ENV + '.tmp', env.join('\n') + '\n')
  renameSync(CONFIG_ENV + '.tmp', CONFIG_ENV)
}

// 把插件里的脚本装到 ~/.dsh/bin/voice-alert（Claude Code、Codex 的 skill 和钩子都调这个路径）
function installScript(logger) {
  if (!IS_MAC) return
  try {
    const want = readFileSync(BUNDLED_SCRIPT)
    let have = null
    try { have = readFileSync(SCRIPT) } catch {}
    if (have && have.equals(want)) return
    mkdirSync(`${HOME}/.dsh/bin`, { recursive: true })
    if (have && !/dsh-(plugin-)?voice-alert|@local\/dsh-voice-alert/.test(have.toString('utf8')) && !existsSync(SCRIPT + '.bak')) copyFileSync(SCRIPT, SCRIPT + '.bak')
    writeFileSync(SCRIPT + '.tmp', want, { mode: 0o755 })
    renameSync(SCRIPT + '.tmp', SCRIPT)
  } catch (err) {
    logger?.warn?.(`voice-alert install failed: ${err.message}`)
  }
}

// 把 DSH 已登录 DeepSeek 账号的 token 同步到 600 文件，Claude Code / Codex 调脚本时也能用账号付费。
// 只在 DSH 允许发往 api.deepseek.com 时拿得到；退出登录后删除文件。
async function syncAccountToken(ctx) {
  let token
  try { token = await ctx.get('deepseekAccount')?.resolveToken(TTS_URL) } catch { token = undefined }
  try {
    if (token) {
      let have = ''
      try { have = readFileSync(TOKEN_FILE, 'utf8').trim() } catch {}
      if (have !== token) {
        mkdirSync(STATE, { recursive: true })
        writeFileSync(TOKEN_FILE + '.tmp', token + '\n', { mode: 0o600 })
        renameSync(TOKEN_FILE + '.tmp', TOKEN_FILE)
        chmodSync(TOKEN_FILE, 0o600)
      }
    } else {
      rmSync(TOKEN_FILE, { force: true })
    }
  } catch {}
  return !!token
}

// DeepSeek 语音合成是否接受账号付费：用空请求探一下（401 = 不接受），结果缓存 1 小时
let accountProbe = { at: 0, value: 'unknown' }
async function probeAccountTts() {
  if (Date.now() - accountProbe.at < 3600_000) return accountProbe.value
  let token = ''
  try { token = readFileSync(TOKEN_FILE, 'utf8').trim() } catch {}
  if (!token) return 'unknown'
  try {
    const r = await fetch(TTS_URL, { method: 'POST', headers: { 'x-dsh-auth-token': token, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(8000) })
    accountProbe = { at: Date.now(), value: r.status === 401 || r.status === 403 ? 'rejected' : 'ok' }
  } catch { return 'unknown' }
  return accountProbe.value
}

function hasKey() {
  if ((process.env.DEEPSEEK_API_KEY || '').trim()) return true
  try { return readFileSync(KEY_FILE, 'utf8').split('\n').some((l) => l.trim() && !l.trim().startsWith('#')) } catch { return false }
}

function watchState() {
  try {
    const until = Number(readFileSync(WATCH_FILE, 'utf8').trim()) * 1000
    return until > Date.now() ? { on: true, until } : { on: false, until: 0 }
  } catch { return { on: false, until: 0 } }
}

let voicesCache = null
function listVoices() {
  if (voicesCache) return Promise.resolve(voicesCache)
  return new Promise((resolve) => {
    execFile('say', ['-v', '?'], { timeout: 8000 }, (err, out) => {
      if (err) return resolve([])
      const voices = []
      for (const line of out.split('\n')) {
        const m = line.match(/^(.+?)\s{2,}([a-z]{2}_[A-Z]{2})\s/)
        if (m && LANGS.includes(m[2].slice(0, 2))) voices.push({ name: m[1].trim(), locale: m[2] })
      }
      voicesCache = voices
      resolve(voices)
    })
  })
}

function run(args, wait) {
  return new Promise((resolve) => {
    const child = spawn(SCRIPT, args, { detached: !wait, stdio: 'ignore' })
    child.on('error', () => resolve(false))
    if (wait) child.on('exit', (code) => resolve(code === 0))
    else { child.unref(); resolve(true) }
  })
}

async function dispatch(ctx, endpoint, payload) {
  if (endpoint === 'config.get') {
    const signedIn = await syncAccountToken(ctx)
    const accountTts = signedIn ? await probeAccountTts() : 'unknown'
    return { ok: true, value: { config: readConfig(), watch: watchState(), voices: IS_MAC ? await listVoices() : [], platform: process.platform, hasKey: hasKey(), signedIn, accountTts, hostVersion: HOST_VERSION } }
  }
  if (endpoint === 'key.set') {
    const key = typeof payload?.key === 'string' ? payload.key.trim() : ''
    if (key === '') { rmSync(KEY_FILE, { force: true }); return { ok: true, value: { hasKey: hasKey() } } }
    if (!/^\S{10,300}$/.test(key)) return { ok: false, error: { code: 'voice/bad-key' } }
    mkdirSync(`${HOME}/.dsh/secrets`, { recursive: true, mode: 0o700 })
    writeFileSync(KEY_FILE + '.tmp', key + '\n', { mode: 0o600 })
    renameSync(KEY_FILE + '.tmp', KEY_FILE)
    chmodSync(KEY_FILE, 0o600)
    return { ok: true, value: { hasKey: true } }
  }
  if (endpoint === 'config.set') {
    const next = sanitize({ ...readConfig(), ...(payload && typeof payload === 'object' ? payload : {}) })
    writeConfig(next)
    return { ok: true, value: { config: next } }
  }
  if (endpoint === 'watch.set') {
    await run(['watch', payload?.on ? 'on' : 'off'], true)
    return { ok: true, value: { watch: watchState() } }
  }
  if (endpoint === 'play.status') {
    // phase: synth / play / idle（文件超过 2 分钟没更新视为残留）
    // result: 这次试听结束后的结果 ok / fallback / fail，还没结束是 null
    let phase = 'idle', result = null
    try {
      const st = statSync(`${STATE}/status`)
      const v = readFileSync(`${STATE}/status`, 'utf8').trim()
      if (Date.now() - st.mtimeMs <= 120_000 && (v === 'synth' || v === 'play')) phase = v
    } catch {}
    try {
      const st = statSync(`${STATE}/result`)
      const v = readFileSync(`${STATE}/result`, 'utf8').trim()
      if (st.mtimeMs >= lastTestAt - 1000 && ['ok', 'fallback', 'fail'].includes(v)) result = v
    } catch {}
    return { ok: true, value: { phase, result } }
  }
  if (endpoint === 'play.stop') {
    await run(['stop'], true)
    rmSync(`${STATE}/stop`, { force: true })
    return { ok: true, value: { phase: 'idle' } }
  }
  if (endpoint === 'test.play') {
    if (!IS_MAC) return { ok: false, error: { code: 'voice/unsupported-platform' } }
    const c = readConfig()
    const text = typeof payload?.text === 'string' ? payload.text.trim().slice(0, 500) : ''
    const TEST = { zh: '这是一条测试。', en: 'This is a test.', ja: 'これはテストです。', ko: '테스트입니다.', fr: 'Ceci est un test.', de: 'Das ist ein Test.', es: 'Esto es una prueba.', pt: 'Isto é um teste.', it: 'Questo è un test.', ru: 'Это проверка.' }
    const project = c.lang === 'zh' ? '示例' : 'demo'
    const sample = payload?.kind === 'text'
      ? ['--style', 'raw', '--no-banner', text || TEST[c.lang]]
      : payload?.kind === 'code'
      ? ['--from', 'dsh', '--project', project, '--code', '4821', '--repeat', '1']
      : ['--from', 'dsh', '--project', project, '--approve', TEST[c.lang]]
    // 试听：先掐掉正在播的，并绕过「批准提醒」开关
    await run(['stop'], true)
    rmSync(`${STATE}/stop`, { force: true }) // 同一秒内的 stop 会让新播报直接退出
    rmSync(`${STATE}/result`, { force: true })
    lastTestAt = Date.now()
    const child = spawn(SCRIPT, sample, { detached: true, stdio: 'ignore', env: { ...process.env, VA_CFG_APPROVAL_FORCE: '1', VA_DEDUPE: '0' } })
    child.on('error', () => {}); child.unref()
    return { ok: true, value: null }
  }
  return { ok: false, error: { code: 'voice/unknown-endpoint' } }
}

// ---------- RPC route (same envelope as other local bundles) ----------

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = []
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy() } else chunks.push(c) })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function end(res, status) {
  if (res.destroyed || res.writableEnded) return
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end()
}

function createRoute(ctx, admission) {
  return async (req, res) => {
    const rejection = admission.requestRejection(req)
    if (rejection !== undefined) return end(res, rejection)
    const path = (req.url ?? '').split('?')[0]
    const endpoint = path.startsWith(RPC_CHANNEL + '/') ? path.slice(RPC_CHANNEL.length + 1) : ''
    if (req.method !== 'POST' || !/^[a-z]+\.[a-z]+$/.test(endpoint)) return end(res, 404)
    if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') return end(res, 415)
    let msg
    try {
      msg = JSON.parse(await readBody(req))
      if (!msg || msg.type !== 'client-request' || msg.method !== endpoint || typeof msg.rpcId !== 'string') return end(res, 400)
    } catch { return end(res, 400) }
    try {
      const result = await dispatch(ctx, endpoint, msg.payload)
      if (res.destroyed || res.writableEnded) return
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ type: 'server-response', rpcId: msg.rpcId, result }))
    } catch { end(res, 500) }
  }
}

// ---------- skill + approvals ----------

function parseSkill() {
  const raw = readFileSync(new URL('./skills/voice-alert/SKILL.md', import.meta.url), 'utf8')
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  const front = m ? m[1] : ''
  const description = (front.match(/^description:\s*(.+)$/m) || [])[1]?.trim() ?? 'Voice alerts'
  return { name: 'voice-alert', description, content: (m ? m[2] : raw).trim() }
}

function projectOf(session) {
  const cwd = session?.cwd
  if (!cwd || cwd === HOME) return ''
  return basename(cwd)
}

export function apply(ctx) {
  installScript(ctx.logger)
  try { writeConfig(readConfig()) } catch {}
  ctx.skills.register(parseSkill())

  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: RPC_CHANNEL, handler: createRoute(ctx, ctx.connection) }))

  // 账号 token 会轮换：启动时同步一次，之后每 20 分钟一次
  syncAccountToken(ctx)
  ctx.effect(() => { const id = setInterval(() => { syncAccountToken(ctx) }, 20 * 60 * 1000); id.unref?.(); return () => clearInterval(id) })
  ctx.on('deepseek-account/session-expired', () => { rmSync(TOKEN_FILE, { force: true }) })

  ctx.on('session/event', (session, event) => {
    if (event?.type !== 'approval/asked') return
    const project = projectOf(session)
    const args = ['--from', 'dsh', '--approve', '']
    if (project) args.push('--project', project)
    run(args, false).catch(() => {})
  }, { global: true })
}
