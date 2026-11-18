# PiuPiu · 英语单词爆破

一个把「下落式方块」和「英语单词跟读」结合起来的网页小游戏。

**[在线试玩 →](https://lulgabc.github.io/PiuPiu/)**

单词从屏幕顶部随机落下。你对着麦克风正确读出单词，它就会带着不同颜色和动画效果消失；如果一直没读对，单词会落到底部并不断堆积。单词堆到屏幕顶端时，本轮结束。

内置 **500 个核心英语名词与动词**、**20 个主题词库**、**3 套 K-12 阅读词表**（Dolch / Fry / Dale-Chall）、**Paul Nation 的 BNC/COCA 词族表（1k–25k）**，以及 **PHaVE 动词短语表**和 **PHRASE 短语表**。界面支持 **中文 / 法语 / 英语**，可在右上角随时切换。

游戏区背后是一层 **PixiJS 8 环境剧场**：四季 + 古埃及、古希腊、古罗马、太空共 **8 个程序化场景**，完全不干扰玩法。

支持 **PWA 安装**：可以像普通 App 一样添加到手机主屏幕，全屏运行，并在离线时打开已缓存的界面和词库。触屏设备会自动启用更低功耗的渲染档位。

> **环境效果独立预览** → **[pixi-demo.html](https://lulgabc.github.io/PiuPiu/pixi-demo.html)**
> 与游戏内使用同一个引擎；游戏内每局固定一个主题，预览页可手动切换全部 8 个场景。


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

## 首屏设计

首屏按「儿童玩法卡 + 家长抽屉」组织：

- 只保留 **吉祥物、PiuPiu 标题、三格玩法、开始按钮、词库胶囊**，不再展示大段规则和技术词表。
- 三格玩法使用图标和短词：**落下来 / 大声读 / 爆炸**。
- 词库、难度、朗读声音、语音说明和词表介绍收进「游戏设置」抽屉：点 **🌍 词库胶囊** 或 **⚙ 家长** 打开。
- 最高分、安装和「家长」放在开始按钮下方的一行轻量工具中。
- 开始页会隐藏计分栏、星光进度条和底部输入栏，避免首屏被游戏 HUD 抢占；进入游戏后自动恢复。
- 首次进入时，三格玩法会轻轻依次跳动一次；之后不再播放。

## 安装到手机（PWA）

开始按钮下方的工具行提供 **「📲 安装」** 快捷按钮：

- **Android / Chrome / Edge**：点击后弹出浏览器原生安装对话框；也可以在浏览器菜单中选择「安装应用」。
- **iPhone / iPad**：点击后显示 iOS 安装步骤：浏览器工具栏「分享」→「添加到主屏幕」→「添加」。
- 安装后从主屏幕打开会以 **standalone 全屏模式**运行，不显示浏览器地址栏。
- 已安装或从主屏幕打开时，安装按钮会自动隐藏。
- 在较矮的屏幕或手机上，开始面板会自动收紧，保证「开始游戏」和安装按钮无需滚动即可看到。
- 首次打开后 Service Worker 会缓存界面、词库、图标和脚本；之后即使断网也能打开游戏。Chrome 的云端语音识别仍需要网络，离线时可使用键盘输入模式。
- 新版本会通过 `sw.js` 的缓存版本号更新，旧缓存会自动清理；更新后刷新一次即可使用新版本。

安装清单是 `manifest.json`，包含 192 / 512 普通图标和 512 maskable 图标，以及 iOS 使用的 180px Apple Touch Icon。

## 性能与发热（iPad / 触屏）

游戏会在触屏设备、窄屏或 `?lowpower=1` 时自动启用流畅模式，桌面大屏仍保留完整画质：

- **环境画布降分辨率**：PixiJS 渲染分辨率从最高 2× 降到 **1.3×**；iPad 竖屏下像素量约减少一半。
- **环境帧率 30fps**：背景粒子、极光、雪和星海以 30fps 更新；游戏的单词下落逻辑单独限制在 **60fps**，避免 iPad Pro 的 120Hz 屏幕把 DOM 更新也跑到 120fps。
- **粒子数量按比例减少**：花瓣、雪、极光带、星光、尘埃等减少约 40–60%，极光带的降幅更大。
- **遮罩显示时暂停背景**：开始页、暂停页和结束页会停止 Pixi ticker；点「开始游戏 / 继续」后恢复。菜单背景保持最后一帧，不再持续渲染。
- **首次绘制后再准备 WebGL**：低功耗设备先显示菜单，空闲时再创建 WebGL 场景，避免打开页面时被初始化阻塞；如果用户点得很快，会在开始游戏时立即准备。
- **去掉触屏上的实时模糊**：词卡、计分栏、开始遮罩和安装弹层不再使用 `backdrop-filter`，改用更不透明的底色；桌面端仍保留玻璃质感。
- **星空改为合成层动画**：不再逐帧改 `background-position`；触屏上直接关闭这段长动画。
- **其他小动画降级**：触屏上关闭品牌图标、麦克风呼吸和词卡入场模糊动画。
- **GPU 偏好**：流畅模式请求 `low-power`，桌面请求 `high-performance`。

桌面或需要排查体验时，可用 `?lowpower=1` 强制测试流畅模式；在 `?debug=1` 下还可查看 `PiuAmbient.lowPower` 和 `PiuAmbient.running`。

## 界面语言

右上角提供 **中文 / FR / EN** 语言选择：

- 首次打开时按浏览器语言自动选择中文、法语或英语，其他语言回退中文。
- 选择会保存在 `localStorage`，下次打开继续使用。
- 切换只影响界面文案；下落的单词和语音识别语言仍然是英语（`en-US`）。
- 开始页、暂停页、结束页、计分栏、提示消息、麦克风状态、按钮标题与无障碍标签都会同步翻译。

## 词库与难度

点击开始页的 **🌍 词库胶囊**（或「⚙ 家长」）打开设置，可以自由选择：

- **综合词库**：500 个核心词，按词长分为初级 / 中级 / 高级；选择「全部」使用完整 500 词。
- **20 个主题词库**：食物、水果、蔬菜、饮品、动物、身体、家庭、服饰、家居、学校、职业、运动、音乐、旅行、交通、自然、天气、科技、情感、地点。
- 每个主题包含 30 个词，分为初级 / 中级 / 高级，每级 10 个词；选择「全部」会混合三个等级。
- **教育词表**：Dolch、Fry、Dale-Chall 三套公开阅读词表，位于词库下拉框的「K-12 阅读词表」分组。
- **BNC/COCA 词族表**：Paul Nation 的 25 个词族列表（1st 1000–25th 1000），位于「词族词表」分组。
- **短语词表**：**PHaVE 动词短语** 150 个，**PHRASE 短语表** 499 个可玩短语，位于「短语词表」分组。
- 选择短语词表时，卡片会显示完整短语；朗读或输入完整短语即可消除。
- 当前选择会保存到 `localStorage`，刷新或下次打开时保持。
- 开始按钮上方会显示当前词库包含的词条数量。

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

## PHaVE 动词短语与 PHRASE 短语表

### PHaVE List

- **150 个最常用动词短语**，按语料频率排序。
- 游戏内分为三个频率段：**1–50 / 51–100 / 101–150**，每段 50 个。
- 只使用动词短语本身（如 `give up`、`find out`、`look after`），不包含原表 288 条义项释义。
- **来源：** Garnier, M., & Schmitt, N. (2015). *The PHaVE List: A pedagogical list of phrasal verbs and their most frequent meaning senses.* Language Teaching Research, 19(6), 645–666.
- [Norbert Schmitt 词汇资源页](https://www.norbertschmitt.co.uk/vocabulary-resources)（免费下载 PHaVE List、用户手册和频率索引）。

### PHRASE List

- 原表为 **505 条**最常用的非透明多词表达，按 BNC 1K–5K 频率段排列。
- 公开附录表格实际有 506 行（一个重复的 Integrated List Rank）。本游戏按**去掉义项重复后的表面形式**收录 **499 个可玩短语**：
  - `used to`、`up to`、`out of`、`get to`、`get on` 等同一表面形式的不同义项合并为一张卡。
  - 可选/可变成分归一为自然形式：`a bit (of) → a bit`、`have got (+NP) → have got`、`make its/one's way → make one's way`、`there is/are → there is` 等。
- 保留原表的 1K–5K 频率段，各段词条数为 **32 / 84 / 126 / 155 / 102**。
- **来源：** Martinez, R., & Schmitt, N. (2012). *A Phrasal Expressions List.* Applied Linguistics, 33(3), 299–320.
- [Norbert Schmitt 词汇资源页](https://www.norbertschmitt.co.uk/vocabulary-resources) / [公开附录 PDF](http://www.drronmartinez.com/uploads/4/4/8/2/44820161/appendix_phrase_list_martinez_and_schmitt_2012.pdf)。

两份列表可从作者网站免费下载，但**并非公共领域**；本项目仅用于非商业教育和研究，并保留作者署名。重新分发或商用前请核对原作者与出版方的条款。

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
- 设置抽屉里的 **「朗读声音」** 可选择：自动（推荐）、女声、男声、童声，以及设备里所有英语系统声音；支持试听并记住选择。
- **自动** 会优先挑选设备中的 Premium / Enhanced / Neural / Siri 等高质量英语语音，并排除 Albert、Bells、Zarvox 等搞怪音色，减少机器感。
- **童声** 优先使用系统儿童音色（如 Junior、Eddy）；没有时用高质量女声加轻微音高模拟，不会过度变调。
- 朗读期间麦克风保持监听；系统语音被麦克风收进去的结果会被忽略，读完后立即恢复匹配。
- 没有下落单词时会提示稍等；浏览器不支持语音合成时仍会高亮该单词。
- 静音按钮控制游戏音效；帮助语音由系统语音服务播放，可在系统层面调整音量。

## 音效与彩蛋

音效全部由 Web Audio API 实时合成，没有额外音频下载；所有声音经过一个总音量节点和压缩器，避免多个音效同时出现时爆音。静音按钮对所有音效生效。

- **基础音效**：爆破、裂开、飞走、坠落、旋转各有独立的声音；开始、暂停、继续、升级、星光清扫和结束也有专属提示音。
- **卡通音色库**：气泡、弹簧、吱吱、滑哨、卡祖笛、机器人哔哔、火箭升空、恐龙低吼、金币、幽灵、猫叫、狗叫、星尘琶音、神秘音和号角。
- **幸运星单词**：游戏中偶尔会出现带金色边框和 ★ 徽章的下落单词（约 4.5%，且同时最多一个）。读对后额外 +25 分，并触发金币、号角和星星爆发。
- **单词彩蛋**：`robot / rocket / dragon / banana / pizza / ghost / cat / dog / star / magic / rainbow / birthday` 会播放对应的小彩蛋音效和 emoji。
- **随机惊喜**：普通消除时有约 12% 概率出现弹簧、吱吱、滑哨、卡祖笛或气泡音，并有 7 秒冷却，避免过度密集。
- **连击小号角**：连击达到 5 / 10 / 15… 时播放上升号角并撒星星。
- **星星的秘密**：在开始页连续点星星吉祥物 5 次（1.2 秒内），会触发秘密音效和一句隐藏提示。

这些彩蛋只增加声音、动画或额外分数，不改变读词判定的核心规则。

## 语音识别优化

游戏默认使用浏览器的 Web Speech API（Chrome 通常是云端识别）。在当前目标词库很小、需要低延迟的场景下，项目做了这些优化：

- **5 个候选结果（n-best）**：`maxAlternatives = 5`，同时检查所有候选，并按 confidence 选择最可信的目标匹配，而不是只看第一个结果。
- **上下文偏置（Contextual Biasing）**：如果浏览器支持 `SpeechRecognition.phrases`、`SpeechRecognitionPhrase`，**且识别运行在设备端（`processLocally === true`）**，会把当前屏幕目标以 boost 4.0、后续 5 个目标以 boost 2.0 加入提示。Chrome 默认的云端识别会返回 `phrases-not-supported`，因此默认不启用；如果服务不支持，会立即清空偏置并重试，避免“启动—报错—重启”循环。
- **短语容错**：
  - 紧凑形式：`give up` ← `giveup`
  - 常见弱读：`going to` ← `gonna`、`have to` ← `hafta`、`out of` ← `outta`、`there is` ← `there's`
  - 省略冠词：`the extent to which` ← `extent to which`
  - 包含在更长句子中：`give up` ← `give up now`
  - 撇号/同音词/词形变化仍沿用原有容错。
- **更早采用中间结果**：`interimResults = true`，中间结果一旦稳定匹配目标即可消除，不必等待最终结果。
- **帮助发音与麦克风并行**：按空格/点击救助发音时，麦克风保持监听（如果原本未启动会立即启动），TTS 播放期间只忽略识别结果；TTS 结束立即恢复匹配，**不再停止并重启识别，也没有 100ms 等待**。
- **TTS 回声保护**：帮助发音结束后 200ms 内，只忽略与帮助词完全相同的识别结果，避免扬声器里的发音自动清词；其他目标立即可读。
- **更短的重连空窗**：正常结束约 **90ms** 后重启；连续 no-speech 时退避到 **260ms**，避免空转。
- **启动竞态保护**：遇到 `InvalidStateError` 时最多重试 3 次，避免与浏览器内部状态冲突。
- **延迟观测**：在 `?debug=1` 下可使用 `__PIU__.getSpeechStats()` 查看首个中间结果、匹配延迟的 p50 / p95、候选数、短语偏置是否启用等。

**仍然存在的限制：** Web Speech API 的声学模型、端点和网络延迟由浏览器/服务商控制，网页无法直接调参；`phrases` 属于较新的实验能力，Safari/Firefox 可能不支持。n-best 的低置信候选也有误匹配可能。

如果未来要追求稳定低延迟或离线识别，可考虑浏览器端流式模型（Vosk WASM、sherpa-onnx WASM、Moonshine/Whisper WebGPU）；代价是 20–100MB+ 模型下载、内存/CPU 占用和更复杂的音频前端。以当前游戏的短词/短语目标，保留 Web Speech API + 目标感知匹配通常是延迟与准确率更平衡的方案。

## 奖励消除

- HUD 新增 **「正确」计数**，每读对一个单词 +1。
- 游戏顶部新增 **五格「星光清扫」进度条**：每读对一个词条点亮一格，并伴随轻微脉冲和数字跳动。
- 五格全亮时整条进度条发光、扫过一道高光，并触发「星光清扫」；约 0.9 秒后归零，开始下一轮。
- 如果在归零前又读对一个词，会直接进入下一轮的第 1 格。
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

- **每局只使用一个主题，整局不会切换。** 第一局从真实月份对应的季节开始（现在是秋天）；之后每次点击开始或重新开始，会随机换一个与上一局不同的主题，并立即生效。
- 花瓣、银杏、水母、极光、金字塔、神殿、斗兽场、行星与星云全部由 Canvas 渐变、矢量图形和粒子程序化绘制，**不使用 emoji 贴图**。
- 环境层位于单词层**下方**（环境 `z-index: 1`，单词层 `3`），`pointer-events: none`，不拦截点击、输入或空格提示，也不改变任何游戏状态。
- 标签页切到后台时停止 Pixi 渲染，回到前台自动恢复。
- 开启系统「减少动态效果」时不加载 Pixi 场景，并隐藏环境层。
- 桌面实测约 **61 FPS**；渲染分辨率上限为 2x DPR，移动端自动适配。
- PixiJS 8 以 MIT 许可内置在 `js/vendor/pixi.min.js`，不依赖 CDN。

独立预览页：**[pixi-demo.html](https://lulgabc.github.io/PiuPiu/pixi-demo.html)**，可手动切换 8 个场景；自动轮播默认关闭，仅用于浏览预览。

### 环境调试

在 URL 后加 `?debug=1` 后可在控制台直接调用：

```js
PiuAmbient.scenes;               // 8 个场景 key
PiuAmbient.current;              // 当前场景
PiuAmbient.setScene("egypt");    // spring / summer / autumn / winter / egypt / greece / rome / space
PiuAmbient.next();
```

## 玩法

1. 在开始页点击 **🌍 词库胶囊** 选择词库和难度，再点「开始游戏」，允许麦克风权限。
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

`js/emojis.js` 为 766 个词提供 emoji 映射，覆盖核心、主题和教育词表中的大量单词；`js/phrases.js` 提供 PHaVE 150 个动词短语和 PHRASE 499 个短语。

核心词示例：

`apple · kitchen · bicycle · mountain · shoulder · family · accept · build · choose · listen · remember · understand · write`

游戏对同音词做了容错（例如 `sun / son`、`meat / meet`、`flower / flour`），语音识别返回任一拼写都能判定成功。

## 项目结构

```text
PiuPiu/
├── index.html                # 页面结构、开始 / 暂停 / 结束面板、词库选择
├── manifest.json             # PWA 安装清单、图标、主题色
├── sw.js                     # Service Worker：应用壳缓存与离线回退
├── icons/                    # 192 / 512 / maskable / Apple Touch 图标
├── pixi-demo.html            # 8 个 PixiJS 环境场景独立预览
├── css/style.css             # 圆润儿童化视觉、emoji 卡片、特效动画、响应式布局
├── css/pixi-demo.css         # PixiJS 预览页的舞台与控制栏样式
├── js/i18n.js                # 中文 / 法语 / 英语界面文案与语言切换
├── js/game.js                # 游戏循环、词库池、emoji 轮换、随机特效、语音识别
├── js/pwa.js                 # 安装提示、iOS 安装说明、Service Worker 注册
├── js/words.js               # 500 个核心名词 / 动词
├── js/lexicon.js             # 20 个主题词库 × 3 个难度等级
├── js/education.js           # Dolch / Fry / Dale-Chall 教育词表
├── js/families.js            # Paul Nation BNC/COCA 词族 1k–25k
├── js/phrases.js             # PHaVE 150 动词短语 + PHRASE 499 短语
├── js/emojis.js              # 单词 → emoji 映射
├── js/pixi-ambient.js        # 游戏与预览共用的 8 场景 PixiJS 环境引擎
├── js/vendor/pixi.min.js     # PixiJS 8（MIT）
├── tests/verify-words.cjs    # 核心词库校验
├── tests/verify-lexicon.cjs  # 类别、等级、重复词与主题名翻译校验
├── tests/verify-education.cjs # Dolch、Fry、Dale-Chall 词数与分级校验
├── tests/verify-families.cjs # BNC/COCA 25 个词族列表与 headword 校验
├── tests/verify-phrases.cjs  # PHaVE / PHRASE 数量、频段、唯一性与翻译校验
├── tests/verify-reward-progress.cjs # 星光进度条结构、动画、逻辑与三语标签校验
├── tests/verify-speech.cjs   # 语音 n-best、上下文偏置、短语容错与延迟指标校验
├── tests/verify-emojis.cjs   # emoji 映射、覆盖率和重复键校验
├── tests/verify-i18n.cjs     # 三语翻译完整性与插值占位符校验
├── tests/verify-ambient.cjs  # 8 场景、游戏接入与旧环境清理校验
├── tests/verify-voice.cjs    # 朗读声音分类、筛选、试听与记忆校验
├── tests/verify-pwa.cjs      # 清单、图标、安装按钮、iOS 指引与离线缓存校验
├── tests/verify-performance.cjs # 触屏降级、环境暂停、模糊与帧率上限校验
├── tests/verify-home.cjs    # 首屏玩法卡、设置抽屉与安静菜单校验
├── tests/verify-audio.cjs   # 音效总线、卡通音色、幸运星与彩蛋校验
├── tools/make-icons.py       # 重新生成 PWA 图标（开发用，需要 Pillow / NumPy）
└── package.json
```

纯原生 HTML / CSS / JavaScript，无构建步骤；PixiJS 8 已本地内置。音效使用 Web Audio API 实时合成。

## 校验

```bash
npm test
```

检查核心词数量、主题词库类别数、每级词数、Dolch/Fry/Dale-Chall 词数与分级、BNC/COCA 25 个列表、emoji 映射覆盖率、是否混入虚词，以及三语翻译的 key 完整性、插值占位符一致性和界面引用缺失。另外校验短语词表：PHaVE 150 个、PHRASE 499 个、频段数量、跨表唯一性，以及分组和级别标签的三语翻译。语音测试会校验 5 候选、上下文偏置、弱读/紧凑短语、重连与延迟指标；声音测试会校验自动/女声/男声/童声分类、系统声音列表、搞怪音色排除、试听、记忆选择和帮助发音接入。PWA 测试会校验 manifest 字段、图标真实尺寸、安装按钮与 iOS 指引、Service Worker 注册、预缓存文件完整性和缓存版本一致性。首屏测试会校验吉祥物、三格玩法、词库胶囊、家长设置抽屉和菜单 HUD 隐藏。音效测试会校验压缩音频总线、卡通音色库、幸运星、单词彩蛋、连击号角和星星秘密。性能测试会校验触屏低功耗检测、环境降分辨率与 30fps、粒子缩减、菜单暂停、触屏去模糊和游戏 60fps 上限。还会校验顶部星光进度条：五格节点、进度语义、满格动画、累积/归零逻辑、移动端与减少动态效果规则。最后校验 Pixi 环境引擎：8 个场景与顺序、每局固定主题、新局换题事件、WebGL 初始化、游戏内挂载、旧环境层已移除、无 emoji 素材，以及后台暂停和减少动态效果规则。

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

__PIU__.getSpeechStats();       // 语音延迟 / p50 / p95 / 候选统计
__PIU_PWA__.hasPrompt();        // 是否已捕获浏览器安装事件
__PIU_PWA__.showHelp();         // 打开安装说明

PiuAmbient.lowPower;            // 当前是否启用流畅模式
PiuAmbient.running;             // 环境渲染是否在运行
```

## 已知限制

- 语音识别使用浏览器的 Web Speech API，识别准确率取决于浏览器、网络、麦克风和口音。
- 帮助朗读使用系统语音合成；音色取决于系统已安装的英语语音。系统未安装儿童音色时，「童声」是高质量女声的轻度音高模拟，听起来不会像真实儿童。
- Chrome 的语音识别通常需要联网；Safari 可能使用系统语音服务。
- 界面语言不会改变目标单词，也不会改变语音识别使用的 `en-US` 语言。
- PWA 离线缓存保证界面和词库可以打开；Chrome 的云端语音识别在断网时不可用，此时可使用键盘输入。
- 流畅模式会降低背景画质以减少发热；如果仍觉得热，可在系统设置中开启「低电量模式」，或暂时关闭麦克风使用键盘输入。
- iPhone / iPad 的安装入口由系统「添加到主屏幕」提供，网页无法直接弹出原生安装框。
- 浏览器不支持 `SpeechRecognition` 时（例如 Firefox），游戏自动使用键盘输入模式。
- 环境场景依赖 WebGL；如果 WebGL 初始化失败，环境层会自动隐藏，不影响单词与游戏逻辑。
- 系统开启「减少动态效果」时不会创建环境画布，只保留静态的游戏背景。
- 短语词表需要朗读或输入完整短语；多词短语的语音识别准确率可能低于单个单词。
- 很长的短语会自动缩小字号以适配卡片宽度，移动端仍可正常显示。
- 麦克风权限被拒绝后，可点击底部麦克风按钮重试，或直接使用输入框。
