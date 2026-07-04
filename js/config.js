/**
 * 应用配置管理系统
 * 集中管理所有常量、枚举和配置参数
 * 
 * @module config
 */

/**
 * 应用全局配置
 */
export const CONFIG = {
  // 默认课本标识
  DEFAULT_BOOK_KEY: 'NCE1',

  // localStorage 存储键名
  STORAGE_KEYS: {
    BOOK_SELECTION: 'selectedBookKey',
    LOOP_MODE: 'loopMode',
    PLAYBACK_RATE: 'playbackRate',
    TRANSLATION_MODE: 'translationMode',
    THEME: 'theme',
  },

  // 可用的播放速率列表
  AVAILABLE_SPEEDS: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],

  // ===== 精读百遍功能配置 =====
  READING_TRACKER: {
    // 目标次数
    TARGET_COUNT: 100,
    // 演讲考核解锁次数
    SPEECH_UNLOCK_THRESHOLD: 60,
    // 里程碑定义（次数 → 标签/图标）
    MILESTONES: {
      10: { label: '初识', icon: '🌱', message: '好的开始！继续加油！' },
      30: { label: '渐熟', icon: '🔥', message: '渐入佳境，坚持就是胜利！' },
      60: { label: '精熟', icon: '⭐', message: '已达演讲考核标准！' },
      100: { label: '百遍', icon: '🏆', message: '🎉 恭喜完成百遍精读！' },
    },
    // 打卡完成提示语
    CHEER_MESSAGES: [
      '打卡成功！继续精进 💪',
      '又进了一步！坚持就是胜利 ✊',
      '很棒！距离目标又近了一步 🎯',
      '日积月累，终成大器 📚',
      '一分耕耘一分收获 🌾',
    ],
  },

  // 翻译显示模式枚举
  TRANSLATION_MODES: ['show', 'hide', 'blur'],

  // 循环播放模式
  LOOP_MODES: ['off', 'sentence', 'list'],

  // 播放器配置
  PLAYER: {
    // 音频缓存大小限制 (单位: 数量)
    MAX_AUDIO_CACHE: 3,
    // LRC 缓存大小限制 (单位: 数量)
    MAX_LRC_CACHE: 10,
    // 时间偏移 (秒) - 使高亮提前出现
    TIME_OFFSET: 0.5,
    // 句子边界容差 (秒) - 防止浮点精度问题
    SENTENCE_BOUNDARY_TOLERANCE: 0.1,
  },

  // UI 配置
  UI: {
    // 歌词滚动到可视区域的阈值 (容器高度的百分比)
    LYRIC_SCROLL_THRESHOLD: 0.22,
    // 主题切换动画时长 (毫秒)
    THEME_ANIMATION_DURATION: 300,
    // 弹窗开启/关闭动画时长 (毫秒)
    MODAL_ANIMATION_DURATION: 200,
  },

  // 错误消息
  ERROR_MESSAGES: {
    LOAD_BOOKS: '加载课本数据失败',
    LOAD_CONFIG: '课件配置加载失败',
    LOAD_LYRIC: '加载歌词失败',
    NO_DATA: '未找到可用课本数据',
    LOAD_FAILED: '加载失败',
  },
};

/**
 * 初始化 ReadingSystem 的 state 对象模板
 * 用于创建一个干净的初始状态
 */
export function createInitialState() {
  return {
    books: [],
    units: [],
    bookPath: '',
    bookKey: '',
    currentLyrics: [],
    currentLyricIndex: -1,
    currentUnitIndex: -1,
    loopMode: 'off',
    playbackRate: 1.0,
    translationMode: 'show',
    availableSpeeds: CONFIG.AVAILABLE_SPEEDS,
    savedPlayTime: 0,
    isProgressDragging: false,
    sentence: false, // 标记是否处于单句循环模式
  };
}

/**
 * 初始化 DOM 元素引用模板
 * 用于创建一个干净的 DOM 引用对象
 */
export function createDOMReferences() {
  return {
    audioPlayer: document.querySelector('#audioPlayer'),
    lyricsDisplay: document.querySelector('#lyricsDisplay'),
    lyricsContainer: document.querySelector('.lyrics-container'),
    unitList: document.querySelector('#unitListContainer'),
    playPauseBtn: document.querySelector('#playPauseBtn'),
    progressBar: document.querySelector('#progressBar'),
    currentTime: document.querySelector('#currentTime'),
    duration: document.querySelector('#duration'),
    speedBtn: document.querySelector('#speedBtn'),
    speedText: document.querySelector('#speedText'),
    loopToggleBtn: document.querySelector('#loopToggleBtn'),
    bookCover: document.querySelector('#bookCover'),
    unitSelect: document.querySelector('#unitSelect'),
    bookSelects: Array.from(document.querySelectorAll('.book-select')),
    prevUnitBtn: document.querySelector('#prevUnitBtn'),
    nextUnitBtn: document.querySelector('#nextUnitBtn'),
    toggleTranslationBtn: document.querySelector('#toggleTranslationBtn'),
  };
}
