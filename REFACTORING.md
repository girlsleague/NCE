# 📁 模块化架构说明

## 项目结构

```
js/
├── main.js                      # 应用入口（轻量级）
├── config.js                    # 全局配置和常量
├── ReadingSystem.js             # 核心系统（完整的业务逻辑）
├── LRCParser.js                 # LRC 歌词解析器
│
├── utils/                       # 工具函数库
│   ├── dom.js                   # DOM 操作工具
│   ├── storage.js               # localStorage 管理工具
│   └── helpers.js               # 通用工具函数
│
├── managers/                    # 管理器
│   ├── CacheManager.js          # 缓存管理（LRU 缓存）
│   ├── ResourceLoader.js        # 资源加载管理
│   └── EventManager.js          # 事件管理系统
│
├── ui/                          # UI 模块
│   ├── theme.js                 # 主题管理
│   └── modal.js                 # 弹窗管理
│
└── main.old.js                  # 旧版本备份（可删除）
```

## 模块说明

### 核心模块

#### `main.js` (入口)
- **职责**: 初始化应用，管理生命周期
- **导入**: ReadingSystem, ThemeManager, SupportModal
- **输出**: NCEPlayer 全局应用实例
- **大小**: ~70 行

#### `config.js` (配置)
- **职责**: 集中管理所有常量、枚举和默认配置
- **导出**: CONFIG 对象、createInitialState()、createDOMReferences()
- **特点**: 易于维护、便于调试

#### `ReadingSystem.js` (核心系统)
- **职责**: 管理课本、单元、歌词、播放、用户偏好
- **大小**: ~1200 行（完整功能，代码清晰）
- **特点**: 
  - 使用 localStorage 管理用户偏好
  - 智能缓存和预加载
  - 支持循环播放、速度控制、翻译切换等功能
  - 详细的错误处理

#### `LRCParser.js` (歌词解析)
- **职责**: 解析 LRC 格式歌词、计算句子边界
- **静态方法**: parse()、findLyricIndexByTime()、getSentenceBoundaries()
- **特点**: 健壮的错误处理、支持多种 LRC 格式

### 工具库 (utils/)

#### `dom.js`
提供 DOM 操作的快捷方法:
- 选择器: `qs()`, `qsa()`
- 属性: `getAttr()`, `setAttr()`
- 类名: `hasClass()`, `addClass()`, `toggleClass()`
- 内容: `setText()`, `setHTML()`
- 事件: `on()`, `off()`, `delegate()`
- 位置: `getRect()`, `scrollIntoView()`

#### `storage.js`
安全的 localStorage 操作:
- 基础操作: `getStorage()`, `setStorage()`, `removeStorage()`
- JSON 支持: `getStorageJSON()`, `setStorageJSON()`
- 专用方法: `getPlayTime()`, `savePlayTime()`, `getCurrentUnitIndex()`
- 可用性检查: `isStorageAvailable()`

#### `helpers.js`
通用工具函数:
- 数值: `clamp()`
- 时间: `formatTime()`, `parseTimeString()`
- 函数式: `debounce()`, `throttle()`
- 对象: `deepClone()`, `mergeObjects()`
- 验证: `isValidNumber()`, `isValidString()`
- CSS: `setCSSVariable()`, `getCSSVariable()`
- 异步: `loadScript()`, `loadStyle()`, `delay()`

### 管理器 (managers/)

#### `CacheManager.js`
**LRU 缓存实现**
- 自动容量管理
- 最久未使用自动清理
- 获取、设置、删除、清空操作
- 统计信息查询

**ResourceLoader**
- 异步加载 LRC 和音频资源
- 集成缓存支持
- 批量加载管理
- 超时和重试机制

#### `EventManager.js`
**统一事件管理**
- 集中注册和移除事件
- 防止重复注册
- 事件委托支持
- 统计信息和清理

**KeyboardEventHandler**
- 快捷键绑定
- 修饰键支持 (Ctrl, Alt, Shift)
- 一次性快捷键
- 全局键盘事件处理

### UI 模块 (ui/)

#### `theme.js` (ThemeManager)
- **功能**: 深色/浅色主题切换
- **特点**:
  - 自动检测系统主题偏好
  - 保存用户主题选择
  - 动画效果
  - 更新 meta theme-color

#### `modal.js`
**SupportModal**: 打赏弹窗
- 打开/关闭/切换
- ESC 键和背景点击关闭
- 自定义内容

**Modal**: 通用模态框基类
- 灵活的模态框管理
- 事件回调支持
- 确认对话框扩展类

## 使用示例

### 访问核心系统
```javascript
// main.js 已暴露到全局作用域
console.log(window.readingSystem);      // ReadingSystem 实例
console.log(window.themeManager);       // ThemeManager 实例
console.log(window.supportModal);       // SupportModal 实例
```

### 使用工具函数
```javascript
import { qs, addClass, setText } from './utils/dom.js';
import { setStorage, getPlayTime } from './utils/storage.js';
import { formatTime, debounce } from './utils/helpers.js';
```

### 创建缓存管理器
```javascript
import { CacheManager } from './managers/CacheManager.js';

const cache = new CacheManager(10); // 最多存储 10 项
cache.set('key', 'value');
const value = cache.get('key');
```

## 优化要点

### 1. 模块化
- ✅ 每个文件职责单一
- ✅ 低耦合、高内聚
- ✅ 易于测试和维护

### 2. 缓存优化
- ✅ LRU 缓存自动清理
- ✅ LRC 文本缓存（避免重复加载）
- ✅ 音频预加载管理

### 3. 事件处理
- ✅ 集中管理事件（便于清理）
- ✅ 事件委托（提高性能）
- ✅ 防止重复绑定

### 4. 错误处理
- ✅ try-catch 包装异步操作
- ✅ 优雅降级（加载失败时显示占位符）
- ✅ 详细的控制台日志

### 5. localStorage 管理
- ✅ 安全的读写操作
- ✅ 自动类型转换
- ✅ 详细的辅助方法

## 文件大小对比

| 版本 | 总大小 | 单文件大小 |
|------|--------|----------|
| 旧版 (main.old.js) | 1343 行 | 1343 行 |
| 新版 (模块化) | ~1400 行 | main.js (70 行) |

**优势**: 
- 代码更有组织
- 便于重用和测试
- 更易维护和扩展
- 更好的代码分割（浏览器可按需加载）

## 下一步优化建议

1. **构建工具**: 使用 Webpack/Vite 进行代码压缩和 tree-shaking
2. **单元测试**: 为各模块编写测试
3. **类型检查**: 添加 JSDoc 注释或迁移到 TypeScript
4. **性能监控**: 添加性能指标收集
5. **国际化**: 支持多语言 UI
6. **离线支持**: 添加 Service Worker 缓存

## 迁移说明

- 旧版本已备份为 `main.old.js`，可随时参考
- 所有功能已保留，行为完全兼容
- HTML 已更新为 ES6 模块加载方式 (`<script type="module">`)
