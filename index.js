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
import { createHash } from 'node:crypto'
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
// 语音合成服务商：official = DeepSeek 官方（只填 key）；custom = 第三方兼容服务（填 base URL + key）
// 两种 key 分开存，切换服务商不会丢
const KEY_FILES = { official: `${HOME}/.dsh/secrets/deepseek.key`, custom: `${HOME}/.dsh/secrets/voice-alert-custom.key` }
// DSH「模型」里配置的 DeepSeek API key（凭据引用 DEEPSEEK_API_KEY）。只读不写：写进去会改变 DSH 自己的计费方式。
// Claude Code / Codex 调脚本时拿不到 DSH 的凭据服务，所以同步一份到 600 文件，DSH 那边删了 key 这里也删
const DSH_KEY_REF = 'DEEPSEEK_API_KEY'
const DSH_KEY_FILE = `${STATE}/dsh-deepseek.key`
// 旧版把 DSH 账号 token 同步到这里；DeepSeek 语音接口不接受账号凭据，已弃用，启动时清掉
const LEGACY_TOKEN_FILE = `${STATE}/account.token`
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
  engine: 'deepseek', provider: 'official', baseUrl: '', voiceId: 'stella', sayVoice: '', lang: 'zh', rate: 185,
  autoVolume: true, chime: true, banner: true, dedupe: 20, approval: true, watchHours: 4,
}
const ENV_KEYS = {
  engine: 'VA_CFG_ENGINE', provider: 'VA_CFG_PROVIDER', baseUrl: 'VA_CFG_BASE_URL', voiceId: 'VA_CFG_VOICE_ID', sayVoice: 'VA_CFG_SAY_VOICE', lang: 'VA_CFG_LANG',
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
    provider: oneOf(c.provider, ['official', 'custom'], DEFAULTS.provider),
    baseUrl: cleanBaseUrl(c.baseUrl),
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

// 第三方 base URL：只收 http(s)，不许带账号密码，去掉末尾的 /
function cleanBaseUrl(v) {
  if (typeof v !== 'string') return ''
  const t = v.trim().replace(/\/+$/, '')
  if (t === '' || t.length > 300) return ''
  try {
    const u = new URL(t)
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return ''
    return t
  } catch { return '' }
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

function keyIn(file) {
  try { return readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#')) || '' } catch { return '' }
}
// 只露前缀和最后 4 位，跟 DSH 自己的 masked 预览一个意思
const mask = (k) => (k.length <= 8 ? '••••' : `${k.startsWith('sk-') ? 'sk-' : ''}…${k.slice(-4)}`)

async function dshKeyInfo(ctx) {
  try { const info = await ctx.get('credentials')?.describe(DSH_KEY_REF); return info?.configured ? { masked: info.masked || '' } : null } catch { return null }
}

async function syncDshKey(ctx) {
  let value = ''
  try { value = (await ctx.get('credentials')?.resolve(DSH_KEY_REF))?.value?.trim() || '' } catch {}
  try {
    if (!value) { rmSync(DSH_KEY_FILE, { force: true }); return }
    if (keyIn(DSH_KEY_FILE) === value) return
    mkdirSync(STATE, { recursive: true })
    writeFileSync(DSH_KEY_FILE + '.tmp', value + '\n', { mode: 0o600 })
    renameSync(DSH_KEY_FILE + '.tmp', DSH_KEY_FILE)
    chmodSync(DSH_KEY_FILE, 0o600)
  } catch {}
}

// 每个服务商实际会用哪个 key：own = 本页填的；dsh = DSH「模型」里的（只对官方）；null = 没有，用本地语音
async function keyStatus(ctx) {
  await syncDshKey(ctx)
  const own = keyIn(KEY_FILES.official)
  const dsh = own ? null : await dshKeyInfo(ctx)
  const custom = keyIn(KEY_FILES.custom)
  const base = readConfig().baseUrl
  const ok = readVerified()
  const officialKey = own || (dsh ? keyIn(DSH_KEY_FILE) : '')
  return {
    official: own || dsh
      ? { source: own ? 'own' : 'dsh', masked: own ? mask(own) : dsh.masked, verified: !!officialKey && ok.official === fingerprint(officialKey, OFFICIAL_BASE) }
      : { source: null },
    custom: custom ? { source: 'own', masked: mask(custom), verified: !!base && ok.custom === fingerprint(custom, base) } : { source: null },
  }
}

// ---------- 连接测试：用 key 真的合成一句很短的语音 ----------

const OFFICIAL_BASE = 'https://api.deepseek.com'
const VERIFIED_FILE = `${STATE}/verified.json`
// 和 va-tts.mjs 的 ttsEndpoint 一致
const ttsEndpoint = (base) => { const b = base.replace(/\/+$/, ''); return /\/v1$/.test(b) ? `${b}/tools/tts` : `${b}/v1/tools/tts` }
// 记“哪把 key + 哪个地址测通过”，只存指纹，不存 key 本身
const fingerprint = (key, base) => createHash('sha256').update(`${base}\n${key}`).digest('hex').slice(0, 24)
function readVerified() { try { return JSON.parse(readFileSync(VERIFIED_FILE, 'utf8')) || {} } catch { return {} } }
function writeVerified(provider, fp) {
  const v = readVerified()
  if (fp) v[provider] = fp; else delete v[provider]
  try { mkdirSync(STATE, { recursive: true }); writeFileSync(VERIFIED_FILE, JSON.stringify(v), { mode: 0o600 }) } catch {}
}

const TEST_TEXT = { zh: '连接测试', en: 'Connection test', ja: '接続テスト', ko: '연결 테스트', fr: 'Test de connexion', de: 'Verbindungstest', es: 'Prueba de conexión', pt: 'Teste de conexão', it: 'Test di connessione', ru: 'Проверка связи' }

// 结果：{ ok: true } 或 { ok: false, reason: 'auth' | 'http' | 'network' | 'timeout', status? }
async function testKey(key, base, lang, voiceId) {
  try {
    const r = await fetch(ttsEndpoint(base), {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: TEST_TEXT[lang] || TEST_TEXT.en, voice_id: voiceId, format: 'wav' }),
    })
    const body = Buffer.from(await r.arrayBuffer())
    if (r.ok && body.length > 100) return { ok: true }
    if (r.status === 401 || r.status === 403) return { ok: false, reason: 'auth', status: r.status }
    return { ok: false, reason: 'http', status: r.status }
  } catch (err) {
    return { ok: false, reason: err?.name === 'TimeoutError' ? 'timeout' : 'network' }
  }
}

function saveKeyFile(file, key) {
  mkdirSync(`${HOME}/.dsh/secrets`, { recursive: true, mode: 0o700 })
  writeFileSync(file + '.tmp', key + '\n', { mode: 0o600 })
  renameSync(file + '.tmp', file)
  chmodSync(file, 0o600)
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
    return { ok: true, value: { config: readConfig(), watch: watchState(), voices: IS_MAC ? await listVoices() : [], platform: process.platform, keys: await keyStatus(ctx), hostVersion: HOST_VERSION } }
  }
  if (endpoint === 'key.set') {
    const file = KEY_FILES[payload?.provider === 'custom' ? 'custom' : 'official']
    const key = typeof payload?.key === 'string' ? payload.key.trim() : ''
    if (key === '') { rmSync(file, { force: true }); return { ok: true, value: { keys: await keyStatus(ctx) } } }
    if (!/^\S{10,300}$/.test(key)) return { ok: false, error: { code: 'voice/bad-key' } }
    saveKeyFile(file, key)
    return { ok: true, value: { keys: await keyStatus(ctx) } }
  }
  if (endpoint === 'key.verify') {
    // 带 key：先测，测通了才保存；不带 key：测当前正在用的那把
    const provider = payload?.provider === 'custom' ? 'custom' : 'official'
    const c = readConfig()
    const base = provider === 'custom' ? c.baseUrl : OFFICIAL_BASE
    const candidate = typeof payload?.key === 'string' ? payload.key.trim() : ''
    if (!base) return { ok: true, value: { result: { ok: false, reason: 'no-base' }, keys: await keyStatus(ctx) } }
    if (candidate && !/^\S{10,300}$/.test(candidate)) return { ok: true, value: { result: { ok: false, reason: 'format' }, keys: await keyStatus(ctx) } }
    await syncDshKey(ctx)
    const key = candidate || keyIn(KEY_FILES[provider]) || (provider === 'official' ? keyIn(DSH_KEY_FILE) : '')
    if (!key) return { ok: true, value: { result: { ok: false, reason: 'no-key' }, keys: await keyStatus(ctx) } }
    const result = await testKey(key, base, c.lang, c.voiceId)
    if (result.ok) {
      if (candidate) saveKeyFile(KEY_FILES[provider], candidate)
      writeVerified(provider, fingerprint(key, base))
    } else if (!candidate) writeVerified(provider, null)
    return { ok: true, value: { result, keys: await keyStatus(ctx) } }
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
  // source 必填：DSH 注册时不检查，AI 加载 skill 时才报「source must be a string」
  return {
    name: 'voice-alert',
    description,
    content: (m ? m[2] : raw).trim(),
    source: 'bundled',
    invocation: { modelInvocable: true, userInvocable: true },
    resourceBase: { kind: 'directory', path: fileURLToPath(new URL('./skills/voice-alert/', import.meta.url)) },
  }
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

  rmSync(LEGACY_TOKEN_FILE, { force: true })
  syncDshKey(ctx)
  ctx.on('credentials/reference-updated', (ref) => { if (String(ref) === DSH_KEY_REF) syncDshKey(ctx) })

  ctx.on('session/event', (session, event) => {
    if (event?.type !== 'approval/asked') return
    const project = projectOf(session)
    const args = ['--from', 'dsh', '--approve', '']
    if (project) args.push('--project', project)
    run(args, false).catch(() => {})
  }, { global: true })
}
