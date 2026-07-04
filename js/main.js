/**
 * 新概念英语播放器 - 应用入口
 * 轻量级入口文件，负责初始化核心模块
 * 
 * @module main
 */

import { ReadingSystem } from './ReadingSystem.js';
import { ThemeManager } from './ui/theme.js';
import { SupportModal } from './ui/modal.js';
import { ReadingTracker } from './features/ReadingTracker.js';

/**
 * 应用主类
 */
class NCEPlayer {
  /**
   * 初始化应用
   */
  static init() {
    try {
      // 初始化主题管理器
      const themeManager = new ThemeManager({
        toggleBtn: document.getElementById('themeToggle'),
      });
      themeManager.init();

      // 初始化打赏弹窗
      const supportModal = new SupportModal({
        modal: document.getElementById('supportModal'),
        openBtn: document.getElementById('supportBtn'),
        closeBtn: document.getElementById('supportCloseBtn'),
      });
      supportModal.init();

      // 初始化核心阅读系统
      const readingSystem = new ReadingSystem();

      // 初始化精读百遍功能（等阅读系统初始化完毕后再初始化）
      const readingTracker = new ReadingTracker(readingSystem);
      const initTracker = () => {
        if (readingSystem.state && readingSystem.state.bookKey) {
          readingTracker.init();
        } else {
          setTimeout(initTracker, 300);
        }
      };
      setTimeout(initTracker, 500);

      // 暴露到全局作用域，方便调试
      if (window.__DEV__) {
        window.readingSystem = readingSystem;
        window.themeManager = themeManager;
        window.supportModal = supportModal;
        window.readingTracker = readingTracker;
        console.log('NCE Player initialized. [DEV MODE]');
        console.log('Access: window.readingSystem, window.themeManager, window.supportModal, window.readingTracker');
      } else {
        console.log('NCE Player initialized.');
      }

      return { readingSystem, themeManager, supportModal, readingTracker };
    } catch (error) {
      console.error('Failed to initialize NCE Player:', error);
      document.body.innerHTML =
        '<div style="padding: 20px; color: red; font-family: sans-serif;">' +
        '<h2>应用初始化失败</h2>' +
        '<p>请检查浏览器控制台了解详细错误信息。</p>' +
        '</div>';
      throw error;
    }
  }
}

/**
 * 应用启动入口 - 等待所有资源（样式表、字体等）加载完成后初始化
 * 避免布局抖动和 FOUC
 */
if (document.readyState === 'loading' || document.readyState === 'interactive') {
  window.addEventListener('load', () => {
    NCEPlayer.init();
  }, { once: true });
} else {
  NCEPlayer.init();
}
