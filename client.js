"use strict";
// dsh-plugin-voice-alert — Client half: Settings → Voice / 语音.
// Plain lazy-CJS module (no build step), same loader contract as other local bundles.
(() => {
  const MODULE_ID = "dsh-plugin-voice-alert";
  const SECTION_ID = "voice-alert";
  const RPC_CHANNEL = "/voice-alert";
  // 和 package.json 的 version 保持一致；后台 config.get 回报的 hostVersion 对不上就提示重启
  const VERSION = "1.0.0";

  const zh = {
    voice: "语音",
    intro: "设置语音提醒的声音和行为。DSH、Claude Code、Codex 共用这一份设置。",
    "sec.speech": "播报",
    "sec.alerts": "什么时候出声",
    "sec.watch": "待命模式",
    lang: "播报语言",
    "lang.hint": "「来自 Claude Code，某某项目」等固定用语和本地音色都跟随这里。",
    "engine.deepseek": "DeepSeek 云端",
    "engine.say": "本地",
    "engine.hint": "云端失败、没有 key 或断网时，自动改用系统本地语音。",
    engine: "使用哪种声音",
    "tab.deepseek": "DeepSeek 语音",
    "tab.local": "本地语音",
    "tab.active": "使用中",
    auth: "付费方式",
    "auth.account": "DSH 登录账号",
    "auth.key": "自定义 API key",
    "auth.account.ok": "用 DSH 已登录的 DeepSeek 账号，不用另外填 key。",
    "auth.account.no": "DSH 还没登录 DeepSeek 账号，会改用本地语音。",
    "auth.account.fallback": "DeepSeek 语音合成暂不接受账号付费，已自动改用你的 API key。",
    "auth.account.nokey": "DeepSeek 语音合成暂不接受账号付费。填一个自定义 API key 才能用云端声音，否则用本地语音。",
    key: "API key",
    "key.set": "已设置，云端语音可用。",
    "key.unset": "未设置，会使用系统本地语音。",
    "key.placeholder": "粘贴 sk-…",
    "key.save": "保存",
    "key.clear": "清除",
    "key.bad": "key 格式不对。",
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
    watch: "待命中",
    "watch.hint": "开着时，长任务结束也会出声。你说「我回来了」时 AI 会关掉。",
    "watch.left": "还剩 {0} 分钟",
    watchHours: "默认待命时长",
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
    "sec.watch": "Away mode",
    lang: "Spoken language",
    "lang.hint": "Fixed phrases such as “From Claude Code, project X” and local voices follow this setting.",
    "engine.deepseek": "DeepSeek cloud",
    "engine.say": "Local",
    "engine.hint": "Falls back to the system voice when the cloud fails, no key is set, or you are offline.",
    engine: "Which voice to use",
    "tab.deepseek": "DeepSeek voice",
    "tab.local": "Local voice",
    "tab.active": "In use",
    auth: "Billing",
    "auth.account": "DSH account",
    "auth.key": "Custom API key",
    "auth.account.ok": "Uses the DeepSeek account signed in to DSH — no key needed.",
    "auth.account.no": "DSH isn't signed in to DeepSeek; the local voice will be used.",
    "auth.account.fallback": "DeepSeek speech doesn't accept account billing yet, so your API key is used automatically.",
    "auth.account.nokey": "DeepSeek speech doesn't accept account billing yet. Add a custom API key for cloud voices; otherwise the local voice is used.",
    key: "API key",
    "key.set": "Set — cloud voices available.",
    "key.unset": "Not set — the system voice will be used.",
    "key.placeholder": "Paste sk-…",
    "key.save": "Save",
    "key.clear": "Clear",
    "key.bad": "That key doesn't look right.",
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
    watch: "Away mode on",
    "watch.hint": "While on, finished long tasks are announced too. The AI turns it off when you say you're back.",
    "watch.left": "{0} min left",
    watchHours: "Default duration",
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
.va-switch{all:unset;cursor:pointer;flex-shrink:0;width:40px;height:24px;border-radius:12px;background:var(--dsw-alias-border-l3);position:relative;transition:background .15s}
.va-switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s}
.va-switch.is-on{background:var(--dsw-alias-button-primary-fill)}
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
.va-spin{width:14px;height:14px;box-sizing:border-box;border:2px solid var(--dsw-alias-border-l3);border-top-color:var(--dsw-alias-button-primary-fill);border-radius:50%;animation:va-spin .8s linear infinite}
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
      function Row({ title, hint, dim, children }) {
        return h("div", { className: "va-row" + (dim ? " is-dim" : "") },
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
        const [keyMsg, setKeyMsg] = useState("");
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
              (v) => { setState((s) => ({ ...s, config: v.config })); setStatus(t("saved")); },
              () => setStatus(t("err.save")));
          }, 250);
        };
        const saveKey = (key) => call("key.set", { key }).then(
          (v) => { setState((s) => ({ ...s, hasKey: v.hasKey })); setKeyDraft(""); setKeyMsg(""); },
          () => setKeyMsg(t("key.bad")));
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

        const c = { auth: "account", ...state.config };
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
        const authHint = c.auth === "account"
          ? (!state.signedIn ? t("auth.account.no")
            : state.accountTts === "rejected" ? (state.hasKey ? t("auth.account.fallback") : t("auth.account.nokey"))
            : t("auth.account.ok"))
          : (keyMsg || (state.hasKey ? t("key.set") : t("key.unset")));

        const deepseekPane = h("div", { className: "va-card", role: "tabpanel", id: "va-pane-deepseek", "aria-labelledby": "va-tab-deepseek" },
          h(Row, { title: t("auth"), hint: authHint },
            h(Seg, { value: c.auth, options: [["account", t("auth.account")], ["api-key", t("auth.key")]], onChange: (auth) => set({ auth }) })),
          c.auth !== "api-key" ? null : h(Row, { title: t("key") },
            h("form", { className: "va-inline", onSubmit: (e) => { e.preventDefault(); if (keyDraft.trim()) saveKey(keyDraft); } },
              h("input", { className: "va-input", type: "password", autoComplete: "off", spellCheck: false, value: keyDraft, placeholder: t("key.placeholder"), "aria-label": t("key"), onChange: (e) => setKeyDraft(e.target.value), style: { maxWidth: 240 } }),
              h("button", { type: "submit", className: "va-btn", disabled: !keyDraft.trim() }, t("key.save")),
              state.hasKey ? h("button", { type: "button", className: "va-btn", onClick: () => saveKey("") }, t("key.clear")) : null)),
          h(Row, { title: t("voiceId") },
            h(Seg, { value: c.voiceId, options: [["stella", "Stella"], ["tide", "Tide"]], onChange: (voiceId) => set({ voiceId }) })));

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

          h("div", null, h("h3", { className: "va-section-title" }, t("sec.watch")),
            h("div", { className: "va-card" },
              h(Row, { title: t("watch"), hint: state.watch.on ? fmt(t("watch.left"), minsLeft) : t("watch.hint") },
                h(Switch, { value: state.watch.on, label: t("watch"), onChange: setWatch })),
              h(Row, { title: t("watchHours") },
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
