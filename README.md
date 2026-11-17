# PiuPiu · 英语单词爆破

一个把「下落式方块」和「英语单词跟读」结合起来的网页小游戏。

**[在线试玩 →](https://lulgabc.github.io/PiuPiu/)**

单词从屏幕顶部随机落下。你对着麦克风正确读出单词，它就会带着不同颜色和动画效果消失；如果一直没读对，单词会落到底部并不断堆积。单词堆到屏幕顶端时，本轮结束。

内置 **500 个核心英语名词与动词**、**20 个主题词库**、**3 套 K-12 阅读词表**（Dolch / Fry / Dale-Chall）和 **Paul Nation 的 BNC/COCA 词族表（1k–25k）**。界面支持 **中文 / 法语 / 英语**，可在右上角随时切换。

游戏区背后是一层 **PixiJS 8 环境剧场**：四季 + 古埃及、古希腊、古罗马、太空共 **8 个程序化场景**，完全不干扰玩法。

> **环境效果独立预览** → **[pixi-demo.html](https://lulgabc.github.io/PiuPiu/pixi-demo.html)**
> 与游戏内使用同一个引擎，可手动切换全部 8 个场景。


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

## 界面语言

右上角提供 **中文 / FR / EN** 语言选择：

- 首次打开时按浏览器语言自动选择中文、法语或英语，其他语言回退中文。
- 选择会保存在 `localStorage`，下次打开继续使用。
- 切换只影响界面文案；下落的单词和语音识别语言仍然是英语（`en-US`）。
- 开始页、暂停页、结束页、计分栏、提示消息、麦克风状态、按钮标题与无障碍标签都会同步翻译。

## 词库与难度

开始页的「词库」区域可以自由选择：

- **综合词库**：500 个核心词，按词长分为初级 / 中级 / 高级；选择「全部」使用完整 500 词。
- **20 个主题词库**：食物、水果、蔬菜、饮品、动物、身体、家庭、服饰、家居、学校、职业、运动、音乐、旅行、交通、自然、天气、科技、情感、地点。
- 每个主题包含 30 个词，分为初级 / 中级 / 高级，每级 10 个词；选择「全部」会混合三个等级。
- **教育词表**：Dolch、Fry、Dale-Chall 三套公开阅读词表，位于词库下拉框的「K-12 阅读词表」分组。
- **BNC/COCA 词族表**：Paul Nation 的 25 个词族列表（1st 1000–25th 1000），位于「词族词表」分组。
- 当前选择会保存到 `localStorage`，刷新或下次打开时保持。
- 开始按钮上方会显示当前词库包含的单词数量。

## K-12 阅读词表

| 词表 | 分级 | 词数 | 说明 |
| --- | --- | --- | --- |
| **Dolch Sight Words** | Pre-K、Kindergarten、Grade 1、Grade 2、Grade 3、Nouns | 315 | 220 个服务词 + 95 个名词，Edward W. Dolch 1936/1948，公共领域 |
| **Fry Sight Words** | First 100 – Tenth 100 | 1000 | Edward B. Fry 的 1000 Instant Words，每 100 词一组，广泛用于北美小学 |
| **Dale-Chall Word List** | 全部词表 | 2940 | New Dale-Chall 可读性公式的熟悉词基准，公开可读性词表 |

- Dolch 和 Fry 选中后会显示单独的**级别下拉框**；Dale-Chall 作为单一词表使用。
- 这些教育词表**按原词表保留功能词**（如 `the / and / a`）和缩写，因为它们是阅读高频词的一部分。
- 单词匹配不区分大小写，并兼容省略撇号的识别结果（`dont` ↔ `don't`、`im` ↔ `I'm`）。
- 数据规范化：`good-bye → goodbye`、`Santa Claus → Santa`；Dale-Chall 中的连字符/缩写词规范为单 token（如 `mr. → mr`）。
- 数据来源均为公开词表：Dolch 为公共领域；Fry 为公开教育词表；Dale-Chall 使用 textstat 的公开 `easy_words.txt` 数据。
- 参考来源：Dolch 官方分组词表（sightwords.com / 公共领域版本）、Edward Fry 1000 Instant Words、[textstat/textstat](https://github.com/textstat/textstat)。

## BNC/COCA 词族表

- **25 个词族列表**：1st 1000、2nd 1000、…、25th 1000
- 共 **25,002 个词族 headword**
- 词族划分采用 Bauer & Nation Level 6（包含常见屈折、派生和前后缀）
- 游戏中每个 headword 代表一个词族；只存 headword，不展开全部词族成员
- 选中后使用单独的级别下拉框选择 1st–25th 列表
- headword 统一为 ASCII 小写；带重音的词会转写（如 `musée → musee`）
- 本数据源包含 25 个频率词族表；官方的专有名词、边缘词、透明复合词和缩略语补充列表未包含在内

**来源与授权：** I.S.P. Nation (2017), *The BNC/COCA Level 6 word family lists*。本项目的 headword 数据来自公开的 BNC/COCA headword lists（Victoria University of Wellington / EAP Foundation 及公开 CSV 转录）。**BNC/COCA 词表版权归 I.S.P. Nation，并非公共领域**；此处仅用于教育和研究用途并保留署名，重新分发或商用前请核对官方条款。

## 表情与儿童化

- 764 个可玩单词配有 emoji；下落时单词卡会**每 1 秒在 emoji 和文字之间轮换**，没有 emoji 的单词保持文字。
- 读对后会随机触发 5 种效果之一：**爆炸、裂开、飞走、快速坠落、旋转消失**。
- 每种效果有不同颜色闪光、星星/火花粒子、飘分颜色和 Web Audio 合成音效。
- 每次成功会出现本地化鼓励语（⭐ 太棒了 / Bravo / Great!）。
- 界面使用圆润字体、emoji 步骤图标、漂浮品牌动画，结束页改为更温和的「本轮结束」。
- 单词落入底部后会固定显示文字，方便复习。

## 听单词帮助

- 游戏中按 **空格**，或点击 / 触摸游戏区域，系统会大声读出当前**最靠下的下落单词**。
- 被读出的单词会获得金色聚焦描边和 🔊 图标，其他单词变暗，聚焦持续约 3 秒。
- 朗读使用系统语音合成（`en-US`，较慢语速，音量 1.0）。
- 朗读期间会临时暂停语音识别，读完后自动恢复，避免系统语音被麦克风当成玩家朗读。
- 没有下落单词时会提示稍等；浏览器不支持语音合成时仍会高亮该单词。
- 静音按钮控制游戏音效；帮助语音由系统语音服务播放，可在系统层面调整音量。

## 奖励消除

- HUD 新增 **「正确」计数**，每读对一个单词 +1。
- 每逢读对数达到 **5 的倍数**（5、10、15…）触发「星光清扫」奖励。
- 奖励以刚读对的单词为中心，向下方发射金色垂直光柱，清除光柱覆盖范围内**所有已堆积的单词**。
- 光柱范围约等于单词宽度（至少 110px），从该单词位置一直延伸到屏幕底部；光柱外的堆叠保持不变。
- 奖励特效包括金色光束、屏幕闪光、星星粒子、奖励文案和独立音效，HUD 的「正确」数字会闪烁。
- 奖励只清除堆积单词，不增加正确计数或得分。

## PixiJS 环境场景

游戏区域背后是一层完全独立的 PixiJS 8 环境引擎，包含 **8 个程序化场景**：

| 场景 | 内容 |
| --- | --- |
| **春 · 花雨** | 晨光、太阳光晕、樱花花瓣、前后景景深、漂浮光斑 |
| **夏 · 深海** | 月光、水母、气泡、鱼群、水面光纹与水下光柱 |
| **秋 · 落叶** | 暖色薄雾、银杏叶、椭圆落叶、远景飞鸟 |
| **冬 · 极光** | 极光帘幕、星空、雪幕、山脊与松林剪影 |
| **埃及 · 金沙** | 金字塔、尼罗河落日、沙丘、棕榈与金色尘埃 |
| **希腊 · 爱琴海** | 月光、海面、石柱神殿、橄榄叶与萤火 |
| **罗马 · 余晖** | 斗兽场拱门、火炬余烬、松柏与帝国晚霞 |
| **太空 · 星海** | 星云、环状行星、流星、卫星与闪烁星场 |

- 游戏从真实月份对应的季节开始，每 **22 秒**切换一个场景，按「春 → 夏 → 秋 → 冬 → 古埃及 → 古希腊 → 古罗马 → 太空」循环，使用交叉淡入淡出。
- 花瓣、银杏、水母、极光、金字塔、神殿、斗兽场、行星与星云全部由 Canvas 渐变、矢量图形和粒子程序化绘制，**不使用 emoji 贴图**。
- 环境层位于单词层**下方**（环境 `z-index: 1`，单词层 `3`），`pointer-events: none`，不拦截点击、输入或空格提示，也不改变任何游戏状态。
- 标签页切到后台时停止 Pixi 渲染与场景轮播，回到前台自动恢复。
- 开启系统「减少动态效果」时不加载 Pixi 场景，并隐藏环境层。
- 桌面实测约 **61 FPS**；渲染分辨率上限为 2x DPR，移动端自动适配。
- PixiJS 8 以 MIT 许可内置在 `js/vendor/pixi.min.js`，不依赖 CDN。

独立预览页：**[pixi-demo.html](https://lulgabc.github.io/PiuPiu/pixi-demo.html)**，可手动切换或暂停 8 个场景。

### 环境调试

在 URL 后加 `?debug=1` 后可在控制台直接调用：

```js
PiuAmbient.scenes;               // 8 个场景 key
PiuAmbient.current;              // 当前场景
PiuAmbient.setScene("egypt");    // spring / summer / autumn / winter / egypt / greece / rome / space
PiuAmbient.next();
```

## 玩法

1. 在开始页选择词库和难度，点击「开始游戏」，允许麦克风权限。
2. 单词会从顶部随机位置落下，emoji 和文字会交替显示，读出发音即可。
3. 读对后单词以随机特效消失、得分并累积连击。
4. 读错或没读，单词会堆在底部。堆到顶部危险线即结束。
5. 没有麦克风、权限被拒绝，或使用 Firefox 时，可以在底部输入框输入单词并按 Enter 爆破。

| 操作 | 说明 |
| --- | --- |
| 词库 / 级别选择 | 选择主题词库、教育词表及其等级/年级分组 |
| 读出单词 | 主要玩法，支持连续识别与自动重连 |
| `Space` / 点击游戏区域 | 听最靠下单词的读音并聚焦该单词 |
| 输入 + Enter | 键盘兜底模式 |
| `Enter` | 在开始页开始游戏 |
| `Esc` / `P` | 暂停 / 继续 |
| 麦克风按钮 | 开关语音识别 |
| 音效按钮 | 静音 / 取消静音 |
| 语言选择（中文 / FR / EN） | 切换界面语言，自动记忆 |

## 计分

- 单词越靠近底部被读出，基础分越高（10–20 分）。
- 连击每增加 1 次，得分倍率增加 0.1，最高 2 倍。
- 单词落地会清空当前连击，并计入「堆积」。
- 最高分保存在浏览器 `localStorage`。

## 单词库

`js/words.js` 提供 500 个核心词；`js/lexicon.js` 提供 20 个主题词库，共 600 个主题词条（572 个跨类别唯一词）；`js/education.js` 提供 Dolch 315、Fry 1000、Dale-Chall 2940 个教育词条；`js/families.js` 提供 BNC/COCA 25 个词族列表、25,002 个 headword。

`js/emojis.js` 为 766 个词提供 emoji 映射，覆盖核心、主题和教育词表中的大量单词。

核心词示例：

`apple · kitchen · bicycle · mountain · shoulder · family · accept · build · choose · listen · remember · understand · write`

游戏对同音词做了容错（例如 `sun / son`、`meat / meet`、`flower / flour`），语音识别返回任一拼写都能判定成功。

## 项目结构

```text
PiuPiu/
├── index.html                # 页面结构、开始 / 暂停 / 结束面板、词库选择
├── pixi-demo.html            # 8 个 PixiJS 环境场景独立预览
├── css/style.css             # 圆润儿童化视觉、emoji 卡片、特效动画、响应式布局
├── css/pixi-demo.css         # PixiJS 预览页的舞台与控制栏样式
├── js/i18n.js                # 中文 / 法语 / 英语界面文案与语言切换
├── js/game.js                # 游戏循环、词库池、emoji 轮换、随机特效、语音识别
├── js/words.js               # 500 个核心名词 / 动词
├── js/lexicon.js             # 20 个主题词库 × 3 个难度等级
├── js/education.js           # Dolch / Fry / Dale-Chall 教育词表
├── js/families.js            # Paul Nation BNC/COCA 词族 1k–25k
├── js/emojis.js              # 单词 → emoji 映射
├── js/pixi-ambient.js        # 游戏与预览共用的 8 场景 PixiJS 环境引擎
├── js/vendor/pixi.min.js     # PixiJS 8（MIT）
├── tests/verify-words.cjs    # 核心词库校验
├── tests/verify-lexicon.cjs  # 类别、等级、重复词与主题名翻译校验
├── tests/verify-education.cjs # Dolch、Fry、Dale-Chall 词数与分级校验
├── tests/verify-families.cjs # BNC/COCA 25 个词族列表与 headword 校验
├── tests/verify-emojis.cjs   # emoji 映射、覆盖率和重复键校验
├── tests/verify-i18n.cjs     # 三语翻译完整性与插值占位符校验
├── tests/verify-ambient.cjs  # 8 场景、游戏接入与旧环境清理校验
└── package.json
```

纯原生 HTML / CSS / JavaScript，无构建步骤；PixiJS 8 已本地内置。音效使用 Web Audio API 实时合成。

## 校验

```bash
npm test
```

检查核心词数量、主题词库类别数、每级词数、Dolch/Fry/Dale-Chall 词数与分级、BNC/COCA 25 个列表、emoji 映射覆盖率、是否混入虚词，以及三语翻译的 key 完整性、插值占位符一致性和界面引用缺失。另外校验 Pixi 环境引擎：8 个场景与顺序、WebGL 初始化、游戏内挂载、旧环境层已移除、无 emoji 素材，以及后台暂停和减少动态效果规则。

## 调试

在 URL 后加 `?debug=1` 会暴露 `window.__PIU__`，可用于查看下落单词、模拟爆破或结束游戏：

```js
__PIU__.getFalling();
__PIU__.getSettled();
__PIU__.getPack();
__PIU__.getCategories();
__PIU__.state.pile;

PiuAmbient.scenes;             // 8 个场景
PiuAmbient.current;            // 当前场景
PiuAmbient.setScene("egypt");
PiuAmbient.next();
```

## 已知限制

- 语音识别使用浏览器的 Web Speech API，识别准确率取决于浏览器、网络、麦克风和口音。
- 帮助朗读使用系统语音合成；音色取决于系统已安装的英语语音。
- Chrome 的语音识别通常需要联网；Safari 可能使用系统语音服务。
- 界面语言不会改变目标单词，也不会改变语音识别使用的 `en-US` 语言。
- 浏览器不支持 `SpeechRecognition` 时（例如 Firefox），游戏自动使用键盘输入模式。
- 环境场景依赖 WebGL；如果 WebGL 初始化失败，环境层会自动隐藏，不影响单词与游戏逻辑。
- 系统开启「减少动态效果」时不会创建环境画布，只保留静态的游戏背景。
- 麦克风权限被拒绝后，可点击底部麦克风按钮重试，或直接使用输入框。
