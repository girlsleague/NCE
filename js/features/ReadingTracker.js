/**
 * 精读百遍 - 跟读打卡与演讲考核模块
 * 记录每篇课文的跟读次数，提供进度可视化和演讲考核功能
 *
 * 核心功能：
 * 1. 跟读打卡 - 每完成一次跟读可打卡记录
 * 2. 进度追踪 - 环形进度条 + 里程碑可视化
 * 3. 演讲考核 - 跟读60遍后解锁演讲考核
 *
 * @module features/ReadingTracker
 */

import { CONFIG } from '../config.js';
import { qs, setHTML, setText, addClass, removeClass, toggleClass, on } from '../utils/dom.js';
import { getStorageJSON, setStorageJSON } from '../utils/storage.js';

/**
 * 精读百遍跟踪器
 */
export class ReadingTracker {
  /**
   * @param {Object} readingSystem - ReadingSystem 实例引用
   */
  constructor(readingSystem) {
    this.rs = readingSystem;
    this.config = CONFIG.READING_TRACKER;
    this.TARGET = this.config.TARGET_COUNT;
    this.SPEECH_THRESHOLD = this.config.SPEECH_UNLOCK_THRESHOLD;

    /** @type {{bookKey: string, unitIndex: number, readCount: number, speechDone: boolean}} */
    this.current = {
      bookKey: '',
      unitIndex: -1,
      readCount: 0,
      speechDone: false,
    };

    // DOM 元素
    this.dom = {
      panel: null,
      countText: null,
      progressRing: null,
      progressFill: null,
      progressText: null,
      checkinBtn: null,
      milestoneBadge: null,
      speechBtn: null,
      speechModal: null,
      speechModalClose: null,
      speechForm: null,
    };

    // 初始化标记
    this._initialized = false;
  }

  /**
   * 初始化精读百遍功能
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    this._buildUI();
    this._bindEvents();
    this._syncFromSystem();

    console.log('ReadingTracker initialized. 📚 精读百遍');
  }

  // =========================================================================
  // UI 构建
  // =========================================================================

  /**
   * 构建精读百遍面板 UI
   */
  _buildUI() {
    // 找到插入位置：control-panel 之后，lyrics-container 之前
    const controlPanel = qs('.control-panel');
    const lyricsContainer = qs('.lyrics-container');
    const playerSection = qs('.player-section');
    if (!controlPanel || !lyricsContainer || !playerSection) return;

    const panel = document.createElement('section');
    panel.className = 'reading-tracker';
    panel.setAttribute('aria-label', '精读百遍');
    panel.innerHTML = `
      <div class="tracker-header">
        <span class="tracker-title">📖 精读百遍</span>
        <span class="tracker-count" id="trackerCount">0 / ${this.TARGET}</span>
      </div>
      <div class="tracker-body">
        <div class="tracker-progress-ring" id="trackerProgressRing">
          <svg viewBox="0 0 120 120">
            <circle class="ring-bg" cx="60" cy="60" r="52" />
            <circle class="ring-fill" cx="60" cy="60" r="52"
                    stroke-dasharray="326.73"
                    stroke-dashoffset="326.73" />
          </svg>
          <div class="ring-text">
            <span class="ring-number" id="trackerRingNumber">0</span>
            <span class="ring-label">遍</span>
          </div>
        </div>
        <div class="tracker-info">
          <div class="tracker-milestone" id="trackerMilestone">
            <span class="milestone-icon">🌱</span>
            <span class="milestone-label">初识</span>
          </div>
          <div class="tracker-actions">
            <button class="tracker-checkin-btn" id="trackerCheckinBtn" type="button">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 11L7 14L16 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              打卡跟读
            </button>
            <button class="tracker-speech-btn" id="trackerSpeechBtn" type="button" style="display:none">
              🎤 演讲考核
            </button>
          </div>
        </div>
      </div>
    `;

    // 插入到控制面板之后
    controlPanel.parentNode.insertBefore(panel, lyricsContainer);

    // 缓存 DOM 引用
    this.dom.panel = panel;
    this.dom.countText = panel.querySelector('#trackerCount');
    this.dom.progressRing = panel.querySelector('#trackerProgressRing');
    this.dom.progressFill = panel.querySelector('.ring-fill');
    this.dom.ringNumber = panel.querySelector('#trackerRingNumber');
    this.dom.checkinBtn = panel.querySelector('#trackerCheckinBtn');
    this.dom.milestoneBadge = panel.querySelector('#trackerMilestone');
    this.dom.speechBtn = panel.querySelector('#trackerSpeechBtn');

    // 构建演讲考核模态框
    this._buildSpeechModal();
  }

  /**
   * 构建演讲考核模态框
   */
  _buildSpeechModal() {
    const modal = document.createElement('div');
    modal.className = 'speech-modal';
    modal.id = 'speechModal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'speechModalTitle');
    modal.innerHTML = `
      <div class="speech-modal-card">
        <button class="speech-close-btn" id="speechCloseBtn" type="button" aria-label="关闭">×</button>
        <h3 id="speechModalTitle">🎤 演讲考核</h3>
        <p class="speech-subtitle">你已经精读本文 <strong id="speechCountDisplay">0</strong> 遍，来检验一下学习成果吧！</p>
        <div class="speech-criteria">
          <div class="speech-criterion">
            <h4>📣 考核要求</h4>
            <ul>
              <li>能够不看原文，用英文完整复述课文</li>
              <li>发音清晰，语调自然</li>
              <li>语句流畅，无明显卡顿</li>
            </ul>
          </div>
        </div>
        <form class="speech-form" id="speechForm">
          <p class="speech-form-label">自评结果：</p>
          <div class="speech-options">
            <label class="speech-option">
              <input type="radio" name="speechResult" value="excellent" required />
              <span class="speech-option-content">
                <span class="option-icon">🌟</span>
                <span class="option-text">优秀 — 流利复述，发音标准</span>
              </span>
            </label>
            <label class="speech-option">
              <input type="radio" name="speechResult" value="good" />
              <span class="speech-option-content">
                <span class="option-icon">👍</span>
                <span class="option-text">良好 — 基本复述，有小瑕疵</span>
              </span>
            </label>
            <label class="speech-option">
              <input type="radio" name="speechResult" value="passable" />
              <span class="speech-option-content">
                <span class="option-icon">💪</span>
                <span class="option-text">及格 — 勉强复述，需要继续练习</span>
              </span>
            </label>
          </div>
          <button type="submit" class="speech-submit-btn">✓ 提交考核结果</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    this.dom.speechModal = modal;
    this.dom.speechModalClose = modal.querySelector('#speechCloseBtn');
    this.dom.speechForm = modal.querySelector('#speechForm');
    this.dom.speechCountDisplay = modal.querySelector('#speechCountDisplay');

    // 点击遮罩关闭
    on(modal, 'click', (e) => {
      if (e.target === modal) this._closeSpeechModal();
    });

    // ESC 关闭
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('speech-modal-hidden')) {
        this._closeSpeechModal();
      }
    });
  }

  // =========================================================================
  // 事件绑定
  // =========================================================================

  /**
   * 绑定所有事件
   */
  _bindEvents() {
    if (!this.dom.checkinBtn) return;

    // 打卡按钮
    on(this.dom.checkinBtn, 'click', () => this._handleCheckin());

    // 演讲考核按钮
    if (this.dom.speechBtn) {
      on(this.dom.speechBtn, 'click', () => this._openSpeechModal());
    }

    // 演讲考核关闭按钮
    if (this.dom.speechModalClose) {
      on(this.dom.speechModalClose, 'click', () => this._closeSpeechModal());
    }

    // 演讲考核表单提交
    if (this.dom.speechForm) {
      on(this.dom.speechForm, 'submit', (e) => this._handleSpeechSubmit(e));
    }
  }

  /**
   * 从 ReadingSystem 同步当前选中的课本和单元
   */
  _syncFromSystem() {
    if (!this.rs) return;

    const { bookKey, currentUnitIndex } = this.rs.state;
    if (bookKey && currentUnitIndex >= 0) {
      this._loadUnitProgress(bookKey, currentUnitIndex);
    }

    // 监听单元切换
    // 由于 ReadingSystem 没有提供事件系统，我们通过拦截 loadUnitByIndex 来实现
    const originalLoadUnit = this.rs.loadUnitByIndex.bind(this.rs);
    const self = this;
    this.rs.loadUnitByIndex = function (unitIndex, options) {
      const result = originalLoadUnit(unitIndex, options);
      // 延迟一帧等待 UI 更新完毕
      requestAnimationFrame(() => {
        self._loadUnitProgress(this.state.bookKey, unitIndex);
      });
      return result;
    };
  }

  // =========================================================================
  // 数据管理
  // =========================================================================

  /**
   * 获取存储键
   * @param {string} bookKey
   * @param {number} unitIndex
   * @returns {string}
   */
  _storageKey(bookKey, unitIndex) {
    return `${bookKey}/unit_${unitIndex}`;
  }

  /**
   * 加载指定单元的进度
   * @param {string} bookKey
   * @param {number} unitIndex
   */
  _loadUnitProgress(bookKey, unitIndex) {
    if (!bookKey || unitIndex < 0) return;

    this.current.bookKey = bookKey;
    this.current.unitIndex = unitIndex;

    const key = this._storageKey(bookKey, unitIndex);
    const data = getStorageJSON(`tracker_${key}`, null);

    if (data && typeof data.readCount === 'number') {
      this.current.readCount = data.readCount;
      this.current.speechDone = !!data.speechDone;
    } else {
      this.current.readCount = 0;
      this.current.speechDone = false;
    }

    this._updateUI();
  }

  /**
   * 保存当前单元进度
   */
  _saveProgress() {
    const { bookKey, unitIndex, readCount, speechDone } = this.current;
    if (!bookKey || unitIndex < 0) return;

    const key = `tracker_${this._storageKey(bookKey, unitIndex)}`;
    setStorageJSON(key, { readCount, speechDone });
  }

  /**
   * 获取所有有进度数据的课堂列表
   * @returns {Array<{bookKey: string, unitIndex: number, readCount: number, speechDone: boolean}>}
   */
  getAllProgress() {
    const results = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tracker_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            const parts = key.replace('tracker_', '').split('/unit_');
            if (parts.length === 2) {
              results.push({
                bookKey: parts[0],
                unitIndex: parseInt(parts[1]),
                readCount: data.readCount || 0,
                speechDone: !!data.speechDone,
              });
            }
          } catch (e) {
            // 忽略解析失败项
          }
        }
      }
    } catch (e) {
      console.warn('ReadingTracker: Failed to enumerate all progress', e);
    }
    return results;
  }

  // =========================================================================
  // 打卡逻辑
  // =========================================================================

  /**
   * 处理打卡
   */
  _handleCheckin() {
    if (!this.current.bookKey || this.current.unitIndex < 0) return;

    // 已达目标
    if (this.current.readCount >= this.TARGET) {
      this._showToast('🎉 已达百遍目标！太棒了！', 'success');
      return;
    }

    this.current.readCount += 1;
    this._saveProgress();
    this._updateUI();

    // 检查是否触发里程碑
    const milestone = this._getMilestone(this.current.readCount);

    if (milestone) {
      this._showToast(`${milestone.icon} ${milestone.label}！${milestone.message}`, 'milestone');
    } else {
      // 随机鼓励语
      const messages = this.config.CHEER_MESSAGES;
      const msg = messages[Math.floor(Math.random() * messages.length)];
      this._showToast(`✅ ${msg}`, 'normal');
    }
  }

  // =========================================================================
  // 演讲考核
  // =========================================================================

  /**
   * 打开演讲考核模态框
   */
  _openSpeechModal() {
    if (!this.dom.speechModal) return;

    // 设置当前次数显示
    if (this.dom.speechCountDisplay) {
      setText(this.dom.speechCountDisplay, this.current.readCount);
    }

    // 重置表单
    if (this.dom.speechForm) {
      this.dom.speechForm.reset();
    }

    this.dom.speechModal.classList.remove('speech-modal-hidden');
    this.dom.speechModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  /**
   * 关闭演讲考核模态框
   */
  _closeSpeechModal() {
    if (!this.dom.speechModal) return;
    this.dom.speechModal.classList.add('speech-modal-hidden');
    this.dom.speechModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /**
   * 处理演讲考核提交
   * @param {Event} e
   */
  _handleSpeechSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const selected = form.querySelector('input[name="speechResult"]:checked');
    if (!selected) return;

    // 记录考核完成
    this.current.speechDone = true;
    this._saveProgress();
    this._updateUI();

    this._closeSpeechModal();

    const labels = {
      excellent: '🌟 优秀！',
      good: '👍 良好！',
      passable: '💪 继续加油！',
    };
    const label = labels[selected.value] || '考核完成！';

    this._showToast(`🎤 ${label} 考核已记录`, 'success');
  }

  // =========================================================================
  // UI 更新
  // =========================================================================

  /**
   * 更新所有 UI 元素
   */
  _updateUI() {
    const { readCount, speechDone } = this.current;
    const pct = Math.min(readCount / this.TARGET, 1);

    // 更新计数文字
    if (this.dom.countText) {
      setText(this.dom.countText, `${readCount} / ${this.TARGET}`);
    }

    // 更新环形进度
    if (this.dom.progressFill) {
      const circumference = 326.73; // 2 * π * 52
      const offset = circumference * (1 - pct);
      this.dom.progressFill.style.strokeDashoffset = offset;
    }

    // 更新环中数字
    if (this.dom.ringNumber) {
      setText(this.dom.ringNumber, readCount);
    }

    // 更新里程碑徽章
    if (this.dom.milestoneBadge) {
      const milestone = this._getMilestone(readCount);
      if (milestone) {
        const icon = this.dom.milestoneBadge.querySelector('.milestone-icon');
        const label = this.dom.milestoneBadge.querySelector('.milestone-label');
        if (icon) setText(icon, milestone.icon);
        if (label) setText(label, milestone.label);
      }
    }

    // 更新打卡按钮状态
    if (this.dom.checkinBtn) {
      if (readCount >= this.TARGET) {
        this.dom.checkinBtn.disabled = true;
        setText(this.dom.checkinBtn, '🏆 已达百遍');
        addClass(this.dom.checkinBtn, 'completed');
      } else {
        this.dom.checkinBtn.disabled = false;
        this.dom.checkinBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M4 11L7 14L16 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          打卡跟读
        `;
        removeClass(this.dom.checkinBtn, 'completed');
      }

      // 冷却状态 — 防止连点（视觉提示，不强制禁用）
      toggleClass(this.dom.checkinBtn, 'just-checked', false);
    }

    // 演讲考核按钮
    if (this.dom.speechBtn) {
      if (readCount >= this.SPEECH_THRESHOLD && !speechDone) {
        this.dom.speechBtn.style.display = '';
        this.dom.speechBtn.disabled = false;
        setText(this.dom.speechBtn, '🎤 演讲考核');
        removeClass(this.dom.speechBtn, 'completed');
      } else if (speechDone) {
        this.dom.speechBtn.style.display = '';
        this.dom.speechBtn.disabled = true;
        setText(this.dom.speechBtn, '✅ 考核已通过');
        addClass(this.dom.speechBtn, 'completed');
      } else {
        this.dom.speechBtn.style.display = 'none';
      }
    }

    // 面板动画 — 每次更新触发微闪
    if (this.dom.panel) {
      removeClass(this.dom.panel, 'tracker-updated');
      // 强制 reflow
      void this.dom.panel.offsetWidth;
      addClass(this.dom.panel, 'tracker-updated');
    }
  }

  /**
   * 获取当前次数对应的里程碑
   * @param {number} count
   * @returns {{icon: string, label: string, message: string}|null}
   */
  _getMilestone(count) {
    const milestones = this.config.MILESTONES;
    const keys = Object.keys(milestones).map(Number).sort((a, b) => b - a);
    for (const key of keys) {
      if (count >= key) {
        return milestones[key];
      }
    }
    return null;
  }

  // =========================================================================
  // Toast 提示
  // =========================================================================

  /**
   * 显示 Toast 提示
   * @param {string} message
   * @param {'normal'|'milestone'|'success'} type
   */
  _showToast(message, type = 'normal') {
    // 移除旧 toast
    const old = qs('.tracker-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.className = `tracker-toast tracker-toast-${type}`;
    setText(toast, message);
    document.body.appendChild(toast);

    // 入场
    requestAnimationFrame(() => {
      addClass(toast, 'tracker-toast-show');
    });

    // 离场
    setTimeout(() => {
      removeClass(toast, 'tracker-toast-show');
      setTimeout(() => toast.remove(), 400);
    }, 2200);
  }

  /**
   * 重置当前单元的进度（需要确认后调用）
   */
  resetCurrentProgress() {
    const { bookKey, unitIndex } = this.current;
    if (!bookKey || unitIndex < 0) return;

    this.current.readCount = 0;
    this.current.speechDone = false;
    this._saveProgress();
    this._updateUI();
    this._showToast('🔄 进度已重置', 'normal');
  }

  /**
   * 获取当前单元读的遍数
   * @returns {number}
   */
  getReadCount() {
    return this.current.readCount;
  }

  /**
   * 销毁清理
   */
  destroy() {
    this.dom.panel?.remove();
    this.dom.speechModal?.remove();
    // 恢复原始方法
    if (this.rs && this._originalLoadUnit) {
      this.rs.loadUnitByIndex = this._originalLoadUnit;
    }
    this._initialized = false;
  }
}
