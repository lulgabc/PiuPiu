# PiuPiu · 英语单词爆破

一个把「下落式方块」和「英语单词跟读」结合起来的网页小游戏。

单词从屏幕顶部随机落下。你对着麦克风正确读出单词，它就会当场爆炸消失；如果一直没读对，单词会落到底部并不断堆积。单词堆到屏幕顶端时，游戏结束。

内置 **500 个常用英语名词与动词**，不包含 `the / and / an / of / to` 等虚词。

## 运行

语音识别要求安全上下文，请用本地服务器打开，不要直接双击 `index.html`。

```bash
cd PiuPiu
python3 -m http.server 4173
# 打开 http://localhost:4173
```

或者：

```bash
npm start
```

推荐使用 **Chrome、Edge 或 Safari**，并在浏览器询问时允许麦克风权限。

## 玩法

1. 点击「开始游戏」，允许麦克风权限。
2. 单词会从顶部随机位置落下，尽量在它落地前大声读出来。
3. 读对后单词爆炸、得分并累积连击。
4. 读错或没读，单词会堆在底部。堆到顶部危险线即结束。
5. 没有麦克风、权限被拒绝，或使用 Firefox 时，可以在底部输入框输入单词并按 Enter 爆破。

| 操作 | 说明 |
| --- | --- |
| 读出单词 | 主要玩法，支持连续识别与自动重连 |
| 输入 + Enter | 键盘兜底模式 |
| `Enter` | 在开始页开始游戏 |
| `Esc` / `P` | 暂停 / 继续 |
| 麦克风按钮 | 开关语音识别 |
| 音效按钮 | 静音 / 取消静音 |

## 计分

- 单词越靠近底部被读出，基础分越高（10–20 分）。
- 连击每增加 1 次，得分倍率增加 0.1，最高 2 倍。
- 单词落地会清空当前连击，并计入「堆积」。
- 最高分保存在浏览器 `localStorage`。

## 单词库

`js/words.js` 中包含 500 个不重复的单词，全部为小写英文名词或动词，例如：

`apple · kitchen · bicycle · mountain · shoulder · family · accept · build · choose · listen · remember · understand · write`

游戏对同音词做了容错（例如 `sun / son`、`meat / meet`、`flower / flour`），语音识别返回任一拼写都能判定成功。

## 项目结构

```text
PiuPiu/
├── index.html              # 页面结构、开始 / 暂停 / 结束面板
├── css/style.css           # 深色霓虹视觉、下落动画、爆炸粒子、响应式布局
├── js/game.js              # 游戏循环、碰撞堆积、语音识别、计分与音效
├── js/words.js             # 500 个常用名词 / 动词
├── tests/verify-words.cjs  # 单词库校验
└── package.json
```

纯原生 HTML / CSS / JavaScript，无构建步骤、无第三方依赖。音效使用 Web Audio API 实时合成。

## 校验

```bash
npm test
```

检查单词数量、唯一性、格式以及是否混入虚词。

## 调试

在 URL 后加 `?debug=1` 会暴露 `window.__PIU__`，可用于查看下落单词、模拟爆破或结束游戏：

```js
__PIU__.getFalling();
__PIU__.getSettled();
__PIU__.state.pile;
```

## 已知限制

- 语音识别使用浏览器的 Web Speech API，识别准确率取决于浏览器、网络、麦克风和口音。
- Chrome 的语音识别通常需要联网；Safari 可能使用系统语音服务。
- 浏览器不支持 `SpeechRecognition` 时（例如 Firefox），游戏自动使用键盘输入模式。
- 麦克风权限被拒绝后，可点击底部麦克风按钮重试，或直接使用输入框。
