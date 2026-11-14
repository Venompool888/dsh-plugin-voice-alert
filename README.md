# dsh-plugin-voice-alert

[中文](#中文) · [English](#english)

## 中文

给 DeepSeek Harness（DSH）用的语音提醒插件。你不在屏幕前时，会话需要你批准、要验证码，或者长任务跑完了，它会把话念出来，开头先报来源和项目：

> 来自 DSH，3200 项目需要你批准。
> 来自 DSH，官网项目需要验证码：四，八，二，一。

### 安装

1. 打开 DSH → **设置 → 插件 → 添加插件**。
2. 在输入框里填这个地址，点「安装」：
   `https://github.com/Venompool888/dsh-plugin-voice-alert`
   （需要本机能访问 GitHub；访问不了的话，到 [Releases](https://github.com/Venompool888/dsh-plugin-voice-alert/releases) 下载 `.tgz`，解压后把文件夹路径填进去。）
3. 按 **⌘Q 完全退出 DSH**，再重新打开。设置侧栏里会出现「语音」。

也可以用命令行安装（桌面版用 `desktop` profile，网页版用 `web`）：

```bash
dsh plugin --profile desktop add github:Venompool888/dsh-plugin-voice-alert
```

装好就能出声：没有可用的云端凭据时自动用 macOS 本地语音。打开「设置 → 语音」，在「试一试」里输入一句话点「朗读」，能听到声音就说明装好了。

### 功能

- **等你批准时自动出声**：念「来自 DSH，某某项目需要你批准」。插件只负责念，不会替你批准。
- **AI 自己判断要不要喊**：插件注册了一个 `voice-alert` skill，遇到验证码、长任务结束、卡住需要你拍板时，AI 会调用它。
- **两种声音**：
  - DeepSeek 云端语音（默认），在「语音 → DeepSeek 语音」里选服务商：
    - **DeepSeek 官方**：只需要一个 API key（在 [platform.deepseek.com](https://platform.deepseek.com) 创建）。如果你已经在 DSH「设置 → 模型」里配置了 DeepSeek key，会自动用它，什么都不用填；页面上会显示正在用哪个 key。
    - **第三方**：兼容 DeepSeek 语音接口的服务，填它的 base URL 和 key。请求发到 `<base URL>/v1/tools/tts`（base URL 以 `/v1` 结尾时是 `<base URL>/tools/tts`）。
    - 注意：DSH 的账号登录不能用于语音合成，DeepSeek 的语音接口只认 API key。
  - macOS 本地语音：系统自带，不联网、不花钱。云端失败时自动改用本地语音。
- **10 种播报语言**：中文、English、日本語、한국어、Français、Deutsch、Español、Português、Italiano、Русский。
- **待命模式**：跟 AI 说「我去吃饭了」「帮我盯着」，长任务结束也会喊；说「我回来了」就只在需要你动手时喊。
- 可调：提示音、通知横幅、播报时自动调大音量、同一句话多少秒内不重复。

### 要求

- macOS（播放用系统自带的 `afplay` / `say`）。Windows、Linux 上设置页能打开，但不会出声。
- DSH 桌面版。

### 隐私

- 所有设置都在「设置 → 语音」页里完成，不需要改任何文件。
- API key 只保存在本机、只有你自己能读，只发给你选的那个服务商；页面上只显示末 4 位。
- 插件只读取 DSH「模型」里的 DeepSeek key，不会修改它。

### 升级

DSH 规定第三方插件要先卸载再安装新版。设置和 key 不受影响。

### 命令行

插件会把播报脚本装到 `~/.dsh/bin/voice-alert`，其他工具也能调用：

```bash
~/.dsh/bin/voice-alert --project 官网 --code 4821
~/.dsh/bin/voice-alert --project 官网 --style done "测试全部通过"
~/.dsh/bin/voice-alert doctor
```

---

## English

A voice-alert plugin for DeepSeek Harness (DSH). When you're away from the screen and a session needs your approval, needs a verification code, or finishes a long task, it says so out loud, starting with the source and the project:

> From DSH, project 3200 needs your approval.

### Install

1. Open DSH → **Settings → Plugins → Add plugin**.
2. Enter this address and click **Install**:
   `https://github.com/Venompool888/dsh-plugin-voice-alert`
   (If GitHub isn't reachable, download the `.tgz` from [Releases](https://github.com/Venompool888/dsh-plugin-voice-alert/releases), unpack it, and enter the folder path instead.)
3. **Quit DSH completely (⌘Q)** and reopen it. A **Voice** page appears in the Settings sidebar.

Or install from the command line (`desktop` profile for the desktop app, `web` for the web UI):

```bash
dsh plugin --profile desktop add github:Venompool888/dsh-plugin-voice-alert
```

It speaks right away: with no cloud credential it uses the macOS local voice. In **Settings → Voice**, type a sentence under **Try it** and click **Read aloud** to check.

### Features

- **Speaks when approval is needed.** It only announces; it never approves anything for you.
- **A `voice-alert` skill**, so the AI can speak up for verification codes, finished long tasks, or when it's stuck.
- **Two voices:** DeepSeek cloud voice (default — pick a provider: **DeepSeek official** needs only an API key from platform.deepseek.com, and reuses the DeepSeek key already set in DSH Settings → Models if there is one; **Third-party** takes the base URL and key of a DeepSeek-compatible service, called at `<base URL>/v1/tools/tts`. Signing in to DSH does not cover speech: DeepSeek's speech endpoint only accepts API keys) and the macOS local voice (offline, free, used automatically if the cloud fails).
- **10 spoken languages.** **Away mode** for announcing finished tasks while you're gone.

### Requirements

macOS for playback. On Windows and Linux the settings page opens, but nothing is spoken. DSH desktop.

### Privacy

Everything is configured on the Settings → Voice page; no files to edit. API keys stay on your Mac, readable only by you, and are sent only to the provider you chose; the page shows just the last 4 characters. The DeepSeek key from DSH Models is read, never changed.

### License

MIT
