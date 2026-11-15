"use strict";
// dsh-plugin-voice-alert — Client half: Settings → Voice / 语音.
// Plain lazy-CJS module (no build step), same loader contract as other local bundles.
(() => {
  const MODULE_ID = "dsh-plugin-voice-alert";
  const SECTION_ID = "voice-alert";
  const RPC_CHANNEL = "/voice-alert";
  // 和 package.json 的 version 保持一致；后台 config.get 回报的 hostVersion 对不上就提示重启
  const VERSION = "1.3.4";

  const zh = {
    voice: "语音",
    intro: "设置语音提醒的声音和行为。DSH、Claude Code、Codex 共用这一份设置。",
    "sec.speech": "播报",
    "sec.alerts": "什么时候出声",
    "sec.idle": "离开电脑时",
    idleNag: "离开电脑时反复喊我",
    "idleNag.hint": "键盘鼠标 30 秒没动才出声；在电脑前时只响提示音、弹通知。每 30 秒喊一次（5 次后改为每 2 分钟），动一下键盘或鼠标就停，最多 20 分钟。",
    aiLines: "每次让 AI 换个说法",
    "aiLines.hint": "用你的 DeepSeek key 现写一句（验证码数字照常逐位念）。生成失败时用固定句子。",
    persona: "说话语气",
    "persona.pro": "专业", "persona.tsundere": "傲娇", "persona.cute": "可爱", "persona.clingy": "撒娇", "persona.cold": "冷漠", "persona.custom": "自定义",
    "persona.examples": "示例（点蓝色播放按钮试听；实际播报时 AI 每次会换说法）",
    "persona.examples.pending": "正在让 AI 写示例…",
    "preview.ready": "试听音频已准备好，点击即可播放。",
    "preview.running": "正在生成试听音频 {0}…",
    "preview.nokey": "填好 key 后会自动生成所有试听音频。",
    "preview.partial": "部分试听音频没生成成功，点播放时会现场生成。",
    "persona.custom.placeholder": "描述你想要的语气，例如：像个老管家，称呼我少爷",
    "persona.needKey": "需要先在上面填好 DeepSeek key，AI 才能现写句子。",
    "sec.watch": "我不在电脑前",
    lang: "播报语言",
    "lang.hint": "「来自 Claude Code，某某项目」等固定用语和本地音色都跟随这里。",
    "engine.deepseek": "DeepSeek 云端",
    "engine.say": "本地",
    "engine.hint": "云端失败、没有 key 或断网时，自动改用系统本地语音。",
    engine: "使用哪种声音",
    "tab.deepseek": "DeepSeek 语音",
    "tab.local": "本地语音",
    "tab.active": "使用中",
    provider: "服务商",
    "provider.official": "DeepSeek 官方",
    "provider.custom": "第三方",
    "provider.official.hint": "只需要一个 DeepSeek API key（在 platform.deepseek.com 创建）。",
    "provider.custom.hint": "兼容 DeepSeek 语音接口的第三方服务，要填它的 base URL 和 key。",
    baseUrl: "Base URL",
    "baseUrl.placeholder": "https://example.com",
    "baseUrl.hint": "请求地址：{0}",
    "baseUrl.need": "还没填 base URL，会用 Mac 本地语音。",
    "baseUrl.bad": "地址要以 http:// 或 https:// 开头。",
    key: "API key",
    "key.src.own": "本页保存",
    "key.src.dsh": "来自 DSH「设置 → 模型」",
    "key.ok": "已连接",
    "key.unverified": "未测试",
    "key.none.official": "还没有 key，会用 Mac 本地语音。填一个 DeepSeek API key，或在 DSH「设置 → 模型」里配置。",
    "key.none.custom": "还没有 key，会用 Mac 本地语音。",
    "key.placeholder": "粘贴 sk-…",
    "key.saveTest": "保存并测试",
    "key.testing": "正在测试…",
    "key.test": "测试连接",
    "key.change": "更换",
    "key.cancel": "取消",
    "key.clear": "清除",
    "key.clear.confirm": "再点一次确认清除",
    "key.toast.ok": "密钥正确，已成功连接",
    "key.err.auth": "密钥不对（{0}），没有保存。请检查后重新粘贴。",
    "key.err.http": "服务返回错误（{0}），没有保存。",
    "key.err.network": "连不上服务，请检查网络后重试。",
    "key.err.timeout": "服务 15 秒没响应，请稍后重试。",
    "key.err.format": "这不像一个 key，请检查后重新粘贴。",
    "key.err.noBase": "先在上面填 Base URL。",
    "key.err.noKey": "还没有可以测试的 key。",
    "key.err.test.auth": "这个 key 已经不能用了（{0}），请更换。",
    "sec.try": "试一试",
    "try.placeholder": "输入一段文字，用当前设置朗读",
    "try.play": "朗读",
    "live.synth": "正在生成语音…",
    "live.play": "正在播放",
    "live.done": "播放完毕",
    "live.fallback": "云端生成失败，已改用本地语音",
    "live.fail": "播放失败",
    "live.timeout": "生成超时，已停止",
    "live.sent": "已发送",
    "stale": "语音插件已更新，后台还是旧版本。请完全退出 DSH（⌘Q）再打开，新设置才会生效。",
    stop: "停止",
    "unsupported": "这台电脑的系统暂不支持播放语音提醒，目前只支持 macOS。设置仍会保存。",
    voiceId: "云端音色",
    sayVoice: "本地音色",
    "sayVoice.auto": "自动",
    rate: "本地语速",
    cloudRate: "语速",
    "cloudRate.hint": "播放时调速，只改快慢不改音调。",
    "cloudRate.reset": "恢复正常",
    "rate.hint": "只对 macOS 本地语音有效。",
    approval: "等你批准时提醒",
    "approval.hint": "弹出批准或授权时自动念「某某项目需要你批准」。",
    chime: "提示音",
    banner: "系统通知条",
    autoVolume: "静音或音量太低时临时调高",
    dedupe: "防重复间隔",
    "dedupe.hint": "这段时间内已经播过就不再插播；验证码和批准不受限制。",
    sec: "{0} 秒",
    off: "关",
    watch: "长任务跑完也喊我",
    "watch.hint": "平时只在需要你动手时出声（批准、验证码、AI 卡住）。打开后，长任务跑完也会喊你。",
    "watch.left": "已打开，{0} 分钟后自动关闭。你跟 AI 说「我回来了」也会关掉。",
    watchHours: "多久后自动关闭",
    "watchHours.hint": "防止忘了关，回来后还一直喊。",
    hours: "{0} 小时",
    "test.approve": "试听：批准提醒",
    "test.code": "试听：验证码",
    saved: "已保存",
    saving: "保存中…",
    "err.load": "读不到设置，请确认插件正在运行。",
    "err.save": "保存失败，请重试。",
    retry: "重试",
  };
  const en = {
    voice: "Voice",
    intro: "Sound and behavior of voice alerts. Shared by DSH, Claude Code and Codex.",
    "sec.speech": "Speech",
    "sec.alerts": "When to speak",
    "sec.idle": "When I step away",
    idleNag: "Keep calling me when I'm away",
    "idleNag.hint": "Speaks only after 30 seconds without keyboard or mouse input; while you're at the computer it just chimes and shows a notification. Repeats every 30 seconds (every 2 minutes after 5 calls), stops as soon as you touch the keyboard or mouse, for at most 20 minutes.",
    aiLines: "Let the AI vary the wording",
    "aiLines.hint": "Writes each line with your DeepSeek key (verification code digits are still read one by one). Falls back to a fixed sentence if generation fails.",
    persona: "Tone",
    "persona.pro": "Professional", "persona.tsundere": "Tsundere", "persona.cute": "Cute", "persona.clingy": "Clingy", "persona.cold": "Cold", "persona.custom": "Custom",
    "persona.examples": "Examples (click the blue play button to hear them; real alerts are reworded by the AI each time)",
    "persona.examples.pending": "Asking the AI to write examples…",
    "preview.ready": "Preview audio is ready — plays instantly.",
    "preview.running": "Generating preview audio {0}…",
    "preview.nokey": "All preview audio is generated automatically once a key is set.",
    "preview.partial": "Some preview audio couldn't be generated; it will be made when you play it.",
    "persona.custom.placeholder": "Describe the tone you want, e.g. an old butler who calls me 'young master'",
    "persona.needKey": "Add a DeepSeek key above first so the AI can write the lines.",
    "sec.watch": "When I'm away",
    lang: "Spoken language",
    "lang.hint": "Fixed phrases such as “From Claude Code, project X” and local voices follow this setting.",
    "engine.deepseek": "DeepSeek cloud",
    "engine.say": "Local",
    "engine.hint": "Falls back to the system voice when the cloud fails, no key is set, or you are offline.",
    engine: "Which voice to use",
    "tab.deepseek": "DeepSeek voice",
    "tab.local": "Local voice",
    "tab.active": "In use",
    provider: "Provider",
    "provider.official": "DeepSeek official",
    "provider.custom": "Third-party",
    "provider.official.hint": "Only needs a DeepSeek API key (create one at platform.deepseek.com).",
    "provider.custom.hint": "A third-party service compatible with DeepSeek's speech API — needs its base URL and key.",
    baseUrl: "Base URL",
    "baseUrl.placeholder": "https://example.com",
    "baseUrl.hint": "Requests go to {0}",
    "baseUrl.need": "No base URL yet — the Mac's local voice will be used.",
    "baseUrl.bad": "The address must start with http:// or https://.",
    key: "API key",
    "key.src.own": "Saved here",
    "key.src.dsh": "From DSH Settings → Models",
    "key.ok": "Connected",
    "key.unverified": "Not tested",
    "key.none.official": "No key yet — the Mac's local voice will be used. Add a DeepSeek API key, or configure one in DSH Settings → Models.",
    "key.none.custom": "No key yet — the Mac's local voice will be used.",
    "key.placeholder": "Paste sk-…",
    "key.saveTest": "Save and test",
    "key.testing": "Testing…",
    "key.test": "Test connection",
    "key.change": "Change",
    "key.cancel": "Cancel",
    "key.clear": "Clear",
    "key.clear.confirm": "Click again to clear",
    "key.toast.ok": "Key is valid — connected",
    "key.err.auth": "The key was rejected ({0}) and wasn't saved. Check it and paste again.",
    "key.err.http": "The service returned an error ({0}); the key wasn't saved.",
    "key.err.network": "Couldn't reach the service. Check your connection and try again.",
    "key.err.timeout": "The service didn't respond within 15 seconds. Try again shortly.",
    "key.err.format": "That doesn't look like a key. Check it and paste again.",
    "key.err.noBase": "Fill in the Base URL above first.",
    "key.err.noKey": "There's no key to test yet.",
    "key.err.test.auth": "This key no longer works ({0}). Please change it.",
    "sec.try": "Try it",
    "try.placeholder": "Type something to read with the current settings",
    "try.play": "Read aloud",
    "live.synth": "Generating speech…",
    "live.play": "Playing",
    "live.done": "Finished",
    "live.fallback": "Cloud speech failed — used the local voice",
    "live.fail": "Playback failed",
    "live.timeout": "Speech generation timed out — stopped",
    "live.sent": "Sent",
    "stale": "The Voice plugin was updated but DSH is still running the old version. Quit DSH completely (⌘Q) and reopen it to apply.",
    stop: "Stop",
    "unsupported": "Voice playback isn't supported on this system yet — macOS only for now. Settings are still saved.",
    voiceId: "Cloud voice",
    sayVoice: "Local voice",
    "sayVoice.auto": "Automatic",
    rate: "Local speaking rate",
    cloudRate: "Speed",
    "cloudRate.hint": "Changes speed at playback without changing pitch.",
    "cloudRate.reset": "Reset",
    "rate.hint": "Only affects the macOS local voice.",
    approval: "Speak when approval is needed",
    "approval.hint": "Says “project X needs your approval” when an approval or permission prompt appears.",
    chime: "Chime",
    banner: "System notification",
    autoVolume: "Raise volume temporarily when muted or too low",
    dedupe: "Repeat guard",
    "dedupe.hint": "Skip an alert if one played within this window; codes and approvals always play.",
    sec: "{0} s",
    off: "Off",
    watch: "Also announce finished long tasks",
    "watch.hint": "Normally it speaks only when you need to act (approval, a verification code, the AI is stuck). Turn this on to also hear when long tasks finish.",
    "watch.left": "On — turns off automatically in {0} min, or when you tell the AI you're back.",
    watchHours: "Turn off automatically after",
    "watchHours.hint": "So it doesn't keep announcing after you're back.",
    hours: "{0} h",
    "test.approve": "Preview: approval",
    "test.code": "Preview: code",
    saved: "Saved",
    saving: "Saving…",
    "err.load": "Couldn't read settings. Make sure the plugin is running.",
    "err.save": "Couldn't save. Please try again.",
    retry: "Retry",
  };

  const CSS = `
.va-page{display:flex;flex-direction:column;gap:20px;color:var(--dsw-alias-label-primary);font-size:14px}
.va-intro{color:var(--dsw-alias-label-secondary);line-height:1.5;margin:0}
.va-section-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary);margin:0 0 8px 4px}
.va-card{border:1px solid var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l2));background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-1));border-radius:var(--dsw-radius-lg,14px);overflow:hidden}
.va-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 18px;min-height:52px;box-sizing:border-box}
.va-row+.va-row{border-top:1px solid var(--dsw-alias-border-l1,var(--dsw-alias-border-l2))}
.va-row.is-dim{opacity:.5}
.va-label{display:flex;flex-direction:column;gap:3px;min-width:0}
.va-title{font-weight:500}
.va-hint{font-size:12px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));line-height:1.45}
.va-seg{display:inline-flex;padding:2px;border-radius:var(--dsw-radius-md,10px);border:1px solid var(--dsw-alias-border-l2);flex-shrink:0}
.va-seg button{all:unset;cursor:pointer;padding:5px 12px;border-radius:calc(var(--dsw-radius-md,10px) - 2px);font-size:13px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.va-seg button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.va-seg button.is-on{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.va-seg button:focus-visible,.va-switch:focus-visible,.va-btn:focus-visible,.va-select:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:2px}
.va-switch{all:unset;cursor:pointer;flex-shrink:0;width:40px;height:24px;border-radius:12px;background:var(--dsw-alias-border-l3,#5a5a5e);box-shadow:inset 0 0 0 1px rgba(0,0,0,.12);position:relative;transition:background .15s}
.va-switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--dsw-alias-switch-thumb,#fff);box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .15s}
/* 打开用 DSH 品牌蓝：深色主题的主按钮色是白色，跟白色圆点混在一起看不出开关 */
.va-switch.is-on{background:var(--dsw-alias-brand-primary,#4d6bfe);box-shadow:none}
.va-switch.is-on::after{transform:translateX(16px)}
.va-select{flex-shrink:0;max-width:240px;padding:6px 10px;border-radius:var(--dsw-radius-sm,8px);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2,transparent);color:inherit;font:inherit;font-size:13px}
.va-range{display:flex;align-items:center;gap:10px;flex-shrink:0}
.va-range input{width:160px;accent-color:var(--dsw-alias-button-primary-fill)}
.va-range span{min-width:32px;text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);font-size:13px}
.va-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.va-btn{all:unset;cursor:pointer;padding:7px 14px;border-radius:var(--dsw-radius-md,10px);border:1px solid var(--dsw-alias-border-l2);font-size:13px}
.va-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.va-status{font-size:12px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.va-input{flex:1;min-width:0;padding:7px 10px;border-radius:var(--dsw-radius-sm,8px);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2,transparent);color:inherit;font:inherit;font-size:13px}
.va-input:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:1px}
.va-inline{display:flex;gap:8px;align-items:center;flex:1;min-width:0;justify-content:flex-end}
.va-keyline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.va-keyline-text{display:flex;flex-direction:column;gap:2px;flex:1;min-width:140px}
.va-keyline-text code{font:13px ui-monospace,SFMono-Regular,Menlo,monospace}
.va-keyline-sub{font-size:12px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.va-ok{color:#1f9d55;font-weight:500}
.va-dot{width:8px;height:8px;margin:0 4px;border-radius:50%;background:var(--dsw-alias-border-l3,#888)}
.va-mark.is-ok,.va-keyline .va-mark{background:#1f9d55}
.va-keyerr{font-size:12px;color:#d93a3a;line-height:1.45}
.va-btn .va-spin{width:12px;height:12px;margin-right:6px;vertical-align:-2px;display:inline-block}
.va-spin.is-light{border-color:rgba(255,255,255,.35);border-top-color:#fff}
.va-btn[disabled]{opacity:.5;cursor:default}
.va-toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:1000;display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:12px;background:var(--dsw-alias-bg-layer-2,#2c2c2e);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 8px 24px rgba(0,0,0,.25);font-size:14px;animation:va-toast .22s ease-out}
@keyframes va-toast{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
.va-personas{display:flex;flex-wrap:wrap;gap:8px}
.va-chip{all:unset;cursor:pointer;padding:6px 14px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);font-size:13px}
.va-chip.is-on{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground,#fff);border-color:transparent}
.va-examples{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.08))}
.va-examples-title{font-size:12px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.va-examples p{margin:0;font-size:13px;line-height:1.5}
.va-example{all:unset;cursor:pointer;display:flex;gap:10px;align-items:center;padding:5px 8px;margin:0 -8px;border-radius:8px;font-size:13px;line-height:1.5}
.va-example:hover:not([disabled]){background:rgba(127,127,127,.12)}
.va-example:hover:not([disabled]) .va-play{transform:scale(1.08)}
.va-example:focus-visible{outline:2px solid #4d6bfe;outline-offset:1px}
.va-example[disabled]{cursor:not-allowed;opacity:.55}
.va-example[disabled] .va-play{background:#8a8a8f}
.va-play{flex:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#4d6bfe;color:#fff;font-size:10px;line-height:1;padding-left:2px;box-sizing:border-box;transition:transform .12s}
.va-pv{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.va-pv .va-mark{width:14px;height:14px;font-size:9px;background:#1f9d55}
.va-btn.is-danger{color:#d93a3a;border-color:#d93a3a}
.va-row.is-stack{flex-direction:column;align-items:stretch;gap:10px}
.va-row.is-stack .va-inline{justify-content:flex-start;width:100%}
.va-try{display:flex;gap:8px;padding:14px 18px}
.va-seg .va-ico{display:inline-flex;vertical-align:-2px;margin-right:5px}
.va-btn.is-primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:transparent}
.va-btn[disabled]{opacity:.5;cursor:default}
.va-notice{border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,10px);padding:10px 14px;font-size:13px;color:var(--dsw-alias-label-secondary)}
.va-tabs{display:flex;gap:4px;margin:0 0 8px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.va-tabs button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;margin-bottom:-1px;font-size:14px;font-weight:500;color:var(--dsw-alias-label-secondary);border-bottom:2px solid transparent}
.va-tabs button:hover{color:var(--dsw-alias-label-primary)}
.va-tabs button.is-on{color:var(--dsw-alias-label-primary);border-bottom-color:var(--dsw-alias-button-primary-fill)}
.va-tabs button:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:-2px}
.va-tabs .va-ico{margin-right:0}
.va-badge{font-size:11px;font-weight:500;padding:1px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary)}
.va-live{display:flex;align-items:center;gap:10px;padding:0 18px 14px;margin-top:-4px;font-size:13px;color:var(--dsw-alias-label-secondary)}
.va-actions .va-live{padding:0;margin:0}
.va-spin{width:14px;height:14px;box-sizing:border-box;border:2px solid var(--dsw-alias-border-l3);border-top-color:#4d6bfe;border-radius:50%;animation:va-spin .8s linear infinite}
.va-wave{display:inline-flex;gap:3px;align-items:center;height:16px}
.va-wave i{display:block;width:3px;height:100%;border-radius:2px;background:var(--dsw-alias-button-primary-fill);transform:scaleY(.3);animation:va-wave 1s ease-in-out infinite}
.va-wave i:nth-child(2){animation-delay:-.75s}.va-wave i:nth-child(3){animation-delay:-.5s}.va-wave i:nth-child(4){animation-delay:-.25s}.va-wave i:nth-child(5){animation-delay:-.6s}
.va-mark{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;font-size:11px;font-weight:600;line-height:1;color:#fff;background:var(--dsw-alias-button-primary-fill)}
.va-mark.is-warn{background:#d98a00}.va-mark.is-bad{background:#d93a3a}
.va-live.is-final{animation:va-fade .2s ease-out}
@keyframes va-fade{from{opacity:0}to{opacity:1}}
@keyframes va-spin{to{transform:rotate(360deg)}}
@keyframes va-wave{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
@media (prefers-reduced-motion:reduce){.va-spin{animation-duration:2.4s}.va-wave i{animation:none;transform:scaleY(.7)}}
.va-error{color:var(--dsw-alias-state-error-primary);font-size:13px;display:flex;gap:10px;align-items:center}
`;

  const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.2 6.5a7.8 7.8 0 0 1 0 11"/></svg>';

  const APPLE = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.2 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.5-3.9zM14 5.3c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>';

  // 播报语言：各用自己的名字显示；界面语言排第一
  const LANGS = [["zh", "中文"], ["en", "English"], ["ja", "日本語"], ["ko", "한국어"], ["fr", "Français"], ["de", "Deutsch"], ["es", "Español"], ["pt", "Português"], ["it", "Italiano"], ["ru", "Русский"]];
  const uiLang = () => String(document.documentElement.lang || navigator.language || "en").slice(0, 2).toLowerCase();
  const orderedLangs = () => { const u = uiLang(); return [...LANGS.filter(([v]) => v === u), ...LANGS.filter(([v]) => v !== u)]; };

  window.__ModuleLoader__.load({
    id: MODULE_ID,
    factory(require2) {
      const React = require2("react");
      const h = React.createElement;
      const { useEffect, useRef, useState } = React;

      const fmt = (s, v) => s.replace("{0}", String(v));

      function Seg({ value, options, onChange }) {
        return h("div", { className: "va-seg", role: "radiogroup" }, options.map(([v, label]) =>
          h("button", { key: v, type: "button", role: "radio", "aria-checked": value === v, className: value === v ? "is-on" : "", onClick: () => onChange(v) }, label)));
      }
      function Switch({ value, onChange, label }) {
        return h("button", { type: "button", role: "switch", "aria-checked": !!value, "aria-label": label, className: "va-switch" + (value ? " is-on" : ""), onClick: () => onChange(!value) });
      }
      // stack：说明文字较长、控件是输入框时，控件单独占一行，不跟文字抢宽度
      function Row({ title, hint, dim, stack, children }) {
        return h("div", { className: "va-row" + (dim ? " is-dim" : "") + (stack ? " is-stack" : "") },
          h("div", { className: "va-label" }, h("span", { className: "va-title" }, title), hint ? h("span", { className: "va-hint" }, hint) : null),
          children);
      }

      function VoicePage({ rpc, t }) {
        const [state, setState] = useState(null); // { config, watch, voices }
        const [error, setError] = useState("");
        const [status, setStatus] = useState("");
        const [, tick] = useState(0);
        const saveTimer = useRef(0);
        const [keyDraft, setKeyDraft] = useState("");
        const [keyMsg, setKeyMsg] = useState("");      // 红字错误
        const [keyEditing, setKeyEditing] = useState(false); // 已有 key 时点了「更换」
        const [keyBusy, setKeyBusy] = useState(false);
        const [toast, setToast] = useState("");
        const [personaDraft, setPersonaDraft] = useState(null);
        // 试听音频在后台生成时，每 1.5 秒刷新一次进度和示例
        const pvRunning = state?.preview?.state === "running";
        // 改了会影响试听音频的设置、或 key 测通后，后台会开始生成：稍后查一次，进入轮询
        const kickPreview = () => setTimeout(() => { call("preview.status").then((v) => setState((s) => ({ ...s, preview: v.preview, examples: v.examples })), () => {}); }, 400);
        useEffect(() => {
          if (!pvRunning) return;
          const id = setInterval(() => { call("preview.status").then((v) => setState((s) => ({ ...s, preview: v.preview, examples: v.examples })), () => {}); }, 1500);
          return () => clearInterval(id);
        }, [pvRunning]);
        useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(""), 2600); return () => clearTimeout(id); }, [toast]);
        const [baseDraft, setBaseDraft] = useState(null); // null = 没在编辑，显示已保存的值
        const [baseMsg, setBaseMsg] = useState("");
        const [confirmClear, setConfirmClear] = useState(false); // 「清除」要点两次，key 删了找不回来
        useEffect(() => { if (!confirmClear) return; const id = setTimeout(() => setConfirmClear(false), 4000); return () => clearTimeout(id); }, [confirmClear]);
        const [tryText, setTryText] = useState("");
        const [pane, setPane] = useState(null);
        // 播放状态：idle / starting（已点、脚本还没起来）/ synth（正在生成）/ play（正在播放）
        // 结束态（显示一会儿再回 idle）：done / fallback / fail / timeout / sent
        const [phase, setPhase] = useState("idle");
        const poll = useRef(0);
        const finalTimer = useRef(0);
        const stopPoll = () => { clearInterval(poll.current); poll.current = 0; };
        const clearFinal = () => { clearTimeout(finalTimer.current); finalTimer.current = 0; };
        useEffect(() => () => { stopPoll(); clearFinal(); }, []);
        useEffect(() => { if (state && pane === null) setPane(state.config.engine === "say" ? "local" : "deepseek"); }, [state]);

        const call = async (endpoint, payload) => {
          const result = await rpc.call(RPC_CHANNEL, endpoint, payload ?? {});
          if (result?.ok !== true) throw new Error(result?.error?.code ?? "failed");
          return result.value;
        };
        const load = () => { setError(""); call("config.get").then(setState, () => setError(t("err.load"))); };
        useEffect(load, []);
        useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(id); }, []);

        const set = (patch) => {
          setState((s) => ({ ...s, config: { ...s.config, ...patch } }));
          setStatus(t("saving"));
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            call("config.set", patch).then(
              (v) => { setState((s) => ({ ...s, config: v.config })); setStatus(t("saved")); kickPreview(); },
              () => setStatus(t("err.save")));
          }, 250);
        };
        const clearKey = (provider) => call("key.set", { provider, key: "" }).then(
          (v) => { setState((s) => ({ ...s, keys: v.keys })); setKeyMsg(""); setKeyEditing(false); }, () => {});
        const ERR = { auth: "key.err.auth", http: "key.err.http", network: "key.err.network", timeout: "key.err.timeout", format: "key.err.format", "no-base": "key.err.noBase", "no-key": "key.err.noKey" };
        // 带 key = 先测后存；不带 = 测当前那把
        const verifyKey = (provider, key) => {
          setKeyBusy(true); setKeyMsg("");
          call("key.verify", key ? { provider, key } : { provider }).then((v) => {
            setKeyBusy(false);
            setState((s) => ({ ...s, keys: v.keys }));
            const r = v.result;
            if (r.ok) { setKeyDraft(""); setKeyEditing(false); setToast(t("key.toast.ok")); kickPreview(); return; }
            const id = !key && r.reason === "auth" ? "key.err.test.auth" : (ERR[r.reason] || "key.err.network");
            setKeyMsg(fmt(t(id), r.status ?? ""));
          }, () => { setKeyBusy(false); setKeyMsg(t("key.err.network")); });
        };
        const saveBase = () => {
          if (baseDraft === null) return;
          const v = baseDraft.trim();
          if (v !== "" && !/^https?:\/\/\S+$/.test(v)) { setBaseMsg(t("baseUrl.bad")); return; }
          setBaseMsg(""); setBaseDraft(null); set({ baseUrl: v.replace(/\/+$/, "") });
        };
        const finish = (p, ms) => {
          stopPoll(); clearFinal(); setPhase(p);
          finalTimer.current = setTimeout(() => setPhase("idle"), ms);
        };
        const play = (payload) => {
          stopPoll(); clearFinal();
          setPhase("starting");
          call("test.play", payload).then(() => {
            const started = Date.now();
            let seen = false, synthAt = 0, fails = 0, inflight = false;
            poll.current = setInterval(async () => {
              if (inflight) return;
              inflight = true;
              let st = null;
              try { st = await call("play.status"); fails = 0; } catch { fails++; }
              inflight = false;
              if (!poll.current) return; // 已被停止
              if (!st) {
                // 查不到状态：不假装在生成，说一声“已发送”就收
                if (fails >= 3) finish("sent", 2500);
                return;
              }
              if (st.phase === "synth" || st.phase === "play") {
                seen = true;
                if (st.phase === "synth") {
                  synthAt = synthAt || Date.now();
                  if (Date.now() - synthAt > 25000) { call("play.stop").catch(() => {}); finish("timeout", 4000); return; }
                } else synthAt = 0;
                setPhase(st.phase);
                return;
              }
              if (st.result === "ok") finish("done", 1500);
              else if (st.result === "fallback") finish("fallback", 4000);
              else if (st.result === "fail") finish("fail", 4000);
              else if (seen) finish("done", 1500);
              else if (Date.now() - started > 8000) finish("fail", 4000);
            }, 250);
          }, () => finish("fail", 4000));
        };
        const stopPlay = () => { stopPoll(); clearFinal(); setPhase("idle"); call("play.stop").catch(() => {}); };
        const busy = phase === "starting" || phase === "synth" || phase === "play";
        const FINAL = { done: ["✓", "", "live.done"], fallback: ["!", " is-warn", "live.fallback"], fail: ["×", " is-bad", "live.fail"], timeout: ["!", " is-warn", "live.timeout"], sent: ["✓", "", "live.sent"] };
        const live = (extra) => {
          if (phase === "idle") return null;
          const fin = FINAL[phase];
          if (fin) return h("div", { className: "va-live is-final", role: "status", "aria-live": "polite" },
            h("span", { className: "va-mark" + fin[1], "aria-hidden": true }, fin[0]), t(fin[2]));
          return h("div", { className: "va-live", role: "status", "aria-live": "polite" },
            phase === "play"
              ? h("span", { className: "va-wave", "aria-hidden": true }, h("i"), h("i"), h("i"), h("i"), h("i"))
              : h("span", { className: "va-spin", "aria-hidden": true }),
            phase === "play" ? t("live.play") : t("live.synth"),
            extra || null);
        };
        const setWatch = (on) => call("watch.set", { on }).then((v) => setState((s) => ({ ...s, watch: v.watch })), () => setStatus(t("err.save")));

        const style = h("style", null, CSS);
        if (error) return h("div", { className: "va-page" }, style, h("div", { className: "va-error" }, error, h("button", { type: "button", className: "va-btn", onClick: load }, t("retry"))));
        if (!state) return h("div", { className: "va-page" }, style);

        const c = { provider: "official", baseUrl: "", ...state.config };
        const keys = state.keys ?? { official: { source: null }, custom: { source: null } };
        const hasAnyKey = !!(c.provider === "custom" ? keys.custom.source && c.baseUrl : keys.official.source);
        const PERSONAS = ["pro", "tsundere", "cute", "clingy", "cold", "custom"];
        const examples = (state.examples || {})[c.persona || "pro"] || [];
        const pv = state.preview || { state: "idle" };
        const previewNote = pv.state === "running" ? h("span", { className: "va-pv" }, h("span", { className: "va-spin", "aria-hidden": true }), fmt(t("preview.running"), pv.total ? `${pv.done}/${pv.total}` : ""))
          : pv.state === "ready" ? h("span", { className: "va-pv" }, h("span", { className: "va-mark", "aria-hidden": true }, "✓"), t("preview.ready"))
          : !hasAnyKey || pv.state === "nokey" ? h("span", { className: "va-pv" }, t("preview.nokey"))
          : pv.state === "partial" ? h("span", { className: "va-pv" }, t("preview.partial")) : null;
        const stale = state.hostVersion !== VERSION;
        const mac = state.platform === "darwin";
        const canPlay = mac && !stale; // 旧后台没有播放状态接口，先不让试听
        const tab = mac ? pane : "deepseek";
        const appleIco = h("span", { className: "va-ico", dangerouslySetInnerHTML: { __html: APPLE } });
        const engineOptions = mac
          ? [["deepseek", t("engine.deepseek")], ["say", h(React.Fragment, null, appleIco, t("engine.say"))]]
          : [["deepseek", t("engine.deepseek")]];
        const voices = state.voices.filter((v) => v.locale.startsWith(c.lang + "_"));
        const minsLeft = state.watch.on ? Math.max(0, Math.round((state.watch.until - Date.now()) / 60000)) : 0;
        const custom = c.provider === "custom";
        const k = custom ? keys.custom : keys.official;
        const ownKey = k.source === "own";
        const CHECK = h("span", { className: "va-mark", "aria-hidden": true }, "✓");
        // 和 va-tts.mjs 的 ttsEndpoint 一致：x.com 与 x.com/v1 都落到 x.com/v1/tools/tts
        const endpoint = (b) => (/\/v1$/.test(b) ? b + "/tools/tts" : b + "/v1/tools/tts");
        const showInput = !k.source || keyEditing;
        const baseHint = baseMsg || (c.baseUrl ? fmt(t("baseUrl.hint"), endpoint(c.baseUrl)) : t("baseUrl.need"));

        const deepseekPane = h("div", { className: "va-card", role: "tabpanel", id: "va-pane-deepseek", "aria-labelledby": "va-tab-deepseek" },
          h(Row, { title: t("provider"), hint: custom ? t("provider.custom.hint") : t("provider.official.hint") },
            h(Seg, { value: c.provider, options: [["official", t("provider.official")], ["custom", t("provider.custom")]], onChange: (provider) => { setKeyDraft(""); setKeyMsg(""); setKeyEditing(false); set({ provider }); } })),
          !custom ? null : h(Row, { title: t("baseUrl"), hint: baseHint, stack: true },
            h("form", { className: "va-inline", onSubmit: (e) => { e.preventDefault(); saveBase(); } },
              h("input", { className: "va-input", type: "url", autoComplete: "off", spellCheck: false, value: baseDraft ?? c.baseUrl, placeholder: t("baseUrl.placeholder"), "aria-label": t("baseUrl"), onChange: (e) => { setBaseDraft(e.target.value); setBaseMsg(""); }, onBlur: saveBase }))),
          h(Row, { title: t("key"), hint: showInput && !k.source ? t(custom ? "key.none.custom" : "key.none.official") : null, stack: true },
            // 已有 key：一行状态 + 操作；没有 key 或点了「更换」：输入框
            k.source && !keyEditing ? h("div", { className: "va-keyline" },
              k.verified ? CHECK : h("span", { className: "va-dot", "aria-hidden": true }),
              h("span", { className: "va-keyline-text" },
                h("code", null, k.masked || "sk-…"),
                h("span", { className: "va-keyline-sub" }, t(ownKey ? "key.src.own" : "key.src.dsh"), " · ",
                  h("span", { className: k.verified ? "va-ok" : "" }, t(k.verified ? "key.ok" : "key.unverified")))),
              h("button", { type: "button", className: "va-btn", disabled: keyBusy, onClick: () => verifyKey(c.provider) },
                keyBusy ? h(React.Fragment, null, h("span", { className: "va-spin", "aria-hidden": true }), t("key.testing")) : t("key.test")),
              h("button", { type: "button", className: "va-btn", disabled: keyBusy, onClick: () => { setKeyEditing(true); setKeyMsg(""); } }, t("key.change")),
              ownKey ? h("button", { type: "button", className: "va-btn" + (confirmClear ? " is-danger" : ""), disabled: keyBusy,
                onClick: () => { if (!confirmClear) { setConfirmClear(true); return; } setConfirmClear(false); clearKey(c.provider); } },
                confirmClear ? t("key.clear.confirm") : t("key.clear")) : null)
            : h("form", { className: "va-inline", onSubmit: (e) => { e.preventDefault(); if (keyDraft.trim() && !keyBusy) verifyKey(c.provider, keyDraft); } },
              h("input", { className: "va-input", type: "password", autoComplete: "off", spellCheck: false, autoFocus: keyEditing, value: keyDraft, placeholder: t("key.placeholder"), "aria-label": t("key"), disabled: keyBusy, onChange: (e) => { setKeyDraft(e.target.value); setKeyMsg(""); } }),
              h("button", { type: "submit", className: "va-btn is-primary", disabled: !keyDraft.trim() || keyBusy },
                keyBusy ? h(React.Fragment, null, h("span", { className: "va-spin is-light", "aria-hidden": true }), t("key.testing")) : t("key.saveTest")),
              keyEditing ? h("button", { type: "button", className: "va-btn", disabled: keyBusy, onClick: () => { setKeyEditing(false); setKeyDraft(""); setKeyMsg(""); } }, t("key.cancel")) : null),
            keyMsg ? h("div", { className: "va-keyerr", role: "alert" }, keyMsg) : null),
          h(Row, { title: t("voiceId") },
            h(Seg, { value: c.voiceId, options: [["stella", "Stella"], ["tide", "Tide"]], onChange: (voiceId) => set({ voiceId }) })),
          h(Row, { title: t("cloudRate"), hint: t("cloudRate.hint") },
            h("div", { className: "va-range" },
              h("input", { type: "range", min: 0.7, max: 1.6, step: 0.05, value: c.cloudRate ?? 1, "aria-label": t("cloudRate"), onChange: (e) => set({ cloudRate: Number(e.target.value) }) }),
              h("span", { style: { minWidth: 44, textAlign: "right" } }, (c.cloudRate ?? 1).toFixed(2).replace(/0$/, "") + "×"),
              (c.cloudRate ?? 1) !== 1 ? h("button", { type: "button", className: "va-btn", onClick: () => set({ cloudRate: 1 }) }, t("cloudRate.reset")) : null)));

        const localPane = h("div", { className: "va-card", role: "tabpanel", id: "va-pane-local", "aria-labelledby": "va-tab-local" },
          h(Row, { title: t("sayVoice") },
            h("select", { className: "va-select", value: c.sayVoice, onChange: (e) => set({ sayVoice: e.target.value }) },
              h("option", { value: "" }, t("sayVoice.auto")),
              voices.map((v) => h("option", { key: v.name, value: v.name }, v.name)))),
          h(Row, { title: t("rate") },
            h("div", { className: "va-range" },
              h("input", { type: "range", min: 120, max: 260, step: 5, value: c.rate, "aria-label": t("rate"), onChange: (e) => set({ rate: Number(e.target.value) }) }),
              h("span", null, c.rate))));

        return h("div", { className: "va-page" }, style,
          toast ? h("div", { className: "va-toast", role: "status", "aria-live": "polite" }, h("span", { className: "va-mark is-ok" }, "✓"), toast) : null,
          h("p", { className: "va-intro" }, t("intro")),
          stale ? h("div", { className: "va-notice", role: "alert" }, t("stale")) : null,
          mac ? null : h("div", { className: "va-notice", role: "note" }, t("unsupported")),

          canPlay ? h("div", null, h("h3", { className: "va-section-title" }, t("sec.try")),
            h("div", { className: "va-card" },
              h("form", { className: "va-try", onSubmit: (e) => { e.preventDefault(); busy ? stopPlay() : play({ kind: "text", text: tryText }); } },
                h("input", { className: "va-input", value: tryText, maxLength: 500, placeholder: t("try.placeholder"), "aria-label": t("try.placeholder"), onChange: (e) => setTryText(e.target.value) }),
                h("button", { type: "submit", className: "va-btn is-primary" }, busy ? t("stop") : t("try.play"))),
              live())) : null,

          h("div", null, h("h3", { className: "va-section-title" }, t("sec.speech")),
            h("div", { className: "va-card" },
              h(Row, { title: t("lang"), hint: t("lang.hint") },
                h("select", { className: "va-select", value: c.lang, "aria-label": t("lang"), onChange: (e) => set({ lang: e.target.value, sayVoice: "" }) },
                  orderedLangs().map(([v, label]) => h("option", { key: v, value: v }, label)))),
              mac ? h(Row, { title: t("engine"), hint: t("engine.hint") },
                h(Seg, { value: c.engine, options: engineOptions, onChange: (engine) => set({ engine }) })) : null)),

          h("div", null,
            mac ? h("div", { className: "va-tabs", role: "tablist" },
              h("button", { type: "button", role: "tab", id: "va-tab-deepseek", "aria-selected": tab === "deepseek", "aria-controls": "va-pane-deepseek", className: tab === "deepseek" ? "is-on" : "", onClick: () => setPane("deepseek") },
                t("tab.deepseek"), c.engine === "deepseek" ? h("span", { className: "va-badge" }, t("tab.active")) : null),
              h("button", { type: "button", role: "tab", id: "va-tab-local", "aria-selected": tab === "local", "aria-controls": "va-pane-local", className: tab === "local" ? "is-on" : "", onClick: () => setPane("local") },
                appleIco, t("tab.local"), c.engine === "say" ? h("span", { className: "va-badge" }, t("tab.active")) : null))
              : h("h3", { className: "va-section-title" }, t("tab.deepseek")),
            tab === "deepseek" ? deepseekPane : localPane),
          h("div", null, h("h3", { className: "va-section-title" }, t("sec.alerts")),
            h("div", { className: "va-card" },
              h(Row, { title: t("approval"), hint: t("approval.hint") }, h(Switch, { value: c.approval, label: t("approval"), onChange: (approval) => set({ approval }) })),
              h(Row, { title: t("chime") }, h(Switch, { value: c.chime, label: t("chime"), onChange: (chime) => set({ chime }) })),
              h(Row, { title: t("banner") }, h(Switch, { value: c.banner, label: t("banner"), onChange: (banner) => set({ banner }) })),
              h(Row, { title: t("autoVolume") }, h(Switch, { value: c.autoVolume, label: t("autoVolume"), onChange: (autoVolume) => set({ autoVolume }) })),
              h(Row, { title: t("dedupe"), hint: t("dedupe.hint") },
                h("select", { className: "va-select", value: String(c.dedupe), onChange: (e) => set({ dedupe: Number(e.target.value) }) },
                  [0, 10, 20, 30, 60, 120].map((s) => h("option", { key: s, value: String(s) }, s === 0 ? t("off") : fmt(t("sec"), s))))))),

          !mac ? null : h("div", null, h("h3", { className: "va-section-title" }, t("sec.idle")),
            h("div", { className: "va-card" },
              h(Row, { title: t("idleNag"), hint: t("idleNag.hint") },
                h(Switch, { value: c.idleNag !== false, label: t("idleNag"), onChange: (v) => set({ idleNag: v }) })),
              h(Row, { title: t("aiLines"), hint: !hasAnyKey && c.aiLines !== false ? t("persona.needKey") : t("aiLines.hint") },
                h(Switch, { value: c.aiLines !== false, label: t("aiLines"), onChange: (v) => set({ aiLines: v }) })),
              c.aiLines === false ? null : h(Row, { title: t("persona"), stack: true },
                h("div", { className: "va-personas", role: "radiogroup", "aria-label": t("persona") },
                  PERSONAS.map((p) => h("button", { key: p, type: "button", role: "radio", "aria-checked": (c.persona || "pro") === p,
                    className: "va-chip" + ((c.persona || "pro") === p ? " is-on" : ""), onClick: () => set({ persona: p }) }, t("persona." + p)))),
                (c.persona || "pro") === "custom"
                  ? h("input", { className: "va-input", maxLength: 200, value: personaDraft ?? (c.personaCustom || ""), placeholder: t("persona.custom.placeholder"), "aria-label": t("persona.custom"),
                      onChange: (e) => setPersonaDraft(e.target.value), onBlur: () => { if (personaDraft !== null) { set({ personaCustom: personaDraft }); setPersonaDraft(null); } } })
                  : null,
                h("div", { className: "va-examples" }, h("span", { className: "va-examples-title" }, t("persona.examples")),
                  examples.length === 0
                    ? h("p", { className: "va-pv" }, hasAnyKey ? h(React.Fragment, null, h("span", { className: "va-spin", "aria-hidden": true }), t("persona.examples.pending")) : t("persona.needKey"))
                    : examples.map((x, i) => h("button", { key: i, type: "button", className: "va-example", disabled: !canPlay || busy || !hasAnyKey, onClick: () => play({ kind: "example", persona: c.persona || "pro", index: i }) },
                        h("span", { className: "va-play", "aria-hidden": true }, "▶"), h("span", null, x)))),
                previewNote))),

          h("div", null, h("h3", { className: "va-section-title" }, t("sec.watch")),
            h("div", { className: "va-card" },
              h(Row, { title: t("watch"), hint: state.watch.on ? fmt(t("watch.left"), minsLeft) : t("watch.hint") },
                h(Switch, { value: state.watch.on, label: t("watch"), onChange: setWatch })),
              h(Row, { title: t("watchHours"), hint: t("watchHours.hint") },
                h("select", { className: "va-select", value: String(c.watchHours), onChange: (e) => set({ watchHours: Number(e.target.value) }) },
                  [1, 2, 4, 8, 12].map((n) => h("option", { key: n, value: String(n) }, fmt(t("hours"), n))))))),

          h("div", { className: "va-actions" },
            !canPlay ? null : h("button", { type: "button", className: "va-btn", disabled: busy, onClick: () => play({ kind: "approve" }) }, t("test.approve")),
            !canPlay ? null : h("button", { type: "button", className: "va-btn", disabled: busy, onClick: () => play({ kind: "code" }) }, t("test.code")),
            live(h("button", { type: "button", className: "va-btn", onClick: stopPlay }, t("stop"))),
            status && !busy ? h("span", { className: "va-status", role: "status" }, status) : null));
      }

      const SettingsIcon = (props) => h("span", {
        "aria-hidden": true, style: { display: "inline-flex" },
        dangerouslySetInnerHTML: { __html: SPEAKER.replace("<svg ", `<svg width="${props.size ?? 16}" height="${props.size ?? 16}" `) },
      });

      return {
        inject: ["connection", "slots", "locale"],
        apply(ctx) {
          const rpc = ctx.connection.rpc;
          ctx.effect(() => ctx.locale.register(MODULE_ID, { zh, en }));
          const t = ctx.locale.bind(MODULE_ID);
          ctx.slots.inject("settings.section", () => ctx.slots.register({
            name: "settings.section",
            id: SECTION_ID,
            order: 55,
            label: () => t("voice"),
            locale: MODULE_ID,
            inject: () => ({ rpc, t }),
          }, VoicePage));
          ctx.slots.inject("settings.section.icon", () => ctx.slots.register({
            name: "settings.section.icon",
            id: SECTION_ID,
          }, SettingsIcon));
        },
      };
    },
  });
})();
