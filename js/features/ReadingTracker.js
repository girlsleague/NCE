/**
 * 精读百遍 - 跟读打卡与演讲考核模块
 * 记录每篇课文的跟读次数，提供进度可视化和演讲考核功能
 *
 * 核心功能：
 * 1. 跟读打卡 - 读完课文后，在最后一行打卡
 * 2. 进度追踪 - 控制面板显示紧凑进度，歌词底部打卡
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
      badge: null,          // 控制面板中的紧凑进度徽章
      badgeCount: null,
      checkinRow: null,     // 歌词底部的打卡行
      checkinBtn: null,
      checkinProgress: null,
      speechBtn: null,
      speechModal: null,
      speechModalClose: null,
      speechForm: null,
      lyricsDisplay: null,  // 缓存歌词容器引用
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
   * 构建精简 UI：控制面板进度徽章 + 歌词底部打卡行 + 演讲考核模态框
   */
  _buildUI() {
    // 1. 在控制面板添加紧凑进度徽章
    this._addCompactProgress();

    // 2. 缓存歌词容器引用
    this.dom.lyricsDisplay = document.querySelector('#lyricsDisplay');

    // 3. 构建演讲考核模态框
    this._buildSpeechModal();
  }

  /**
   * 在控制面板添加紧凑进度徽章
   */
  _addCompactProgress() {
    const navBtns = document.querySelector('.navigation-buttons');
    if (!navBtns) return;

    const badge = document.createElement('span');
    badge.className = 'tracker-badge';
    badge.title = '精读百遍进度';
    badge.innerHTML = `
      <span class="badge-icon">📖</span>
      <span class="badge-count" id="badgeCount">0/${this.TARGET}</span>
      <span class="badge-mile" id="badgeMile">🌱</span>
    `;
    navBtns.appendChild(badge);

    this.dom.badge = badge;
    this.dom.badgeCount = badge.querySelector('#badgeCount');
    this.dom.badgeMile = badge.querySelector('#badgeMile');
  }

  /**
   * 构建演讲考核模态框
   */
  _buildSpeechModal() {
    const modal = document.createElement('div');
    modal.className = 'speech-modal speech-modal-hidden';
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
  // 歌词底部打卡行注入
  // =========================================================================

  /**
   * 在歌词底部注入打卡行
   */
  _injectCheckinRow() {
    const container = document.querySelector('#lyricsDisplay');
    if (!container) return;

    // 移除旧的打卡行
    const old = container.querySelector('.tracker-checkin-row');
    if (old) old.remove();

    const { readCount, speechDone } = this.current;
    const pct = Math.min(readCount / this.TARGET, 1);

    const row = document.createElement('div');
    row.className = 'tracker-checkin-row';

    // 左侧：迷你进度条 + 次数
    row.innerHTML = `
      <div class="checkin-progress">
        <div class="checkin-bar-bg">
          <div class="checkin-bar-fill" style="width:${pct * 100}%"></div>
        </div>
        <span class="checkin-text" id="checkinText">已跟读 <strong>${readCount}</strong> / ${this.TARGET} 遍</span>
      </div>
      <div class="checkin-actions">
        <button class="checkin-btn" id="checkinBtn" type="button">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M4 11L7 14L16 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          ${readCount >= this.TARGET ? '🏆 已达百遍' : '打卡跟读'}
        </button>
        <button class="checkin-speech-btn" id="checkinSpeechBtn" type="button"
                style="${readCount >= this.SPEECH_THRESHOLD && !speechDone ? '' : 'display:none'}">
          🎤 演讲考核
        </button>
        <button class="checkin-speech-btn completed" id="checkinSpeechDone" type="button"
                style="${speechDone ? '' : 'display:none'}" disabled>
          ✅ 考核已通过
        </button>
      </div>
    `;

    container.appendChild(row);

    // 更新 DOM 引用
    this.dom.checkinRow = row;
    this.dom.checkinBtn = row.querySelector('#checkinBtn');
    this.dom.checkinProgress = row.querySelector('.checkin-bar-fill');
    this.dom.checkinText = row.querySelector('#checkinText');

    // 绑定按钮事件（重新绑定，因为 DOM 被重建了）
    const speechBtn = row.querySelector('#checkinSpeechBtn');
    const speechDoneBtn = row.querySelector('#checkinSpeechDone');
    if (this.dom.speechBtn) this.dom.speechBtn = null;

    // 打卡按钮
    if (this.dom.checkinBtn) {
      on(this.dom.checkinBtn, 'click', () => this._handleCheckin());
    }

    // 演讲考核按钮
    if (speechBtn) {
      on(speechBtn, 'click', () => this._openSpeechModal());
    }
  }

  // =========================================================================
  // 事件绑定
  // =========================================================================

  /**
   * 绑定全局事件
   */
  _bindEvents() {
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

    const self = this;

    // 拦截 loadUnitByIndex — 监听单元切换
    const originalLoadUnit = this.rs.loadUnitByIndex.bind(this.rs);
    this.rs.loadUnitByIndex = function (unitIndex, options) {
      const result = originalLoadUnit(unitIndex, options);
      requestAnimationFrame(() => {
        self._loadUnitProgress(this.state.bookKey, unitIndex);
      });
      return result;
    };

    // 拦截 renderLyrics — 在歌词渲染后注入打卡行
    const originalRenderLyrics = this.rs.renderLyrics.bind(this.rs);
    this.rs.renderLyrics = function () {
      originalRenderLyrics();
      requestAnimationFrame(() => {
        self._injectCheckinRow();
      });
    };
  }

  // =========================================================================
  // 数据管理
  // =========================================================================

  /**
   * 获取存储键
   */
  _storageKey(bookKey, unitIndex) {
    return `${bookKey}/unit_${unitIndex}`;
  }

  /**
   * 加载指定单元的进度
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
          } catch (e) { /* ignore */ }
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

    if (this.current.readCount >= this.TARGET) {
      this._showToast('🎉 已达百遍目标！太棒了！', 'success');
      return;
    }

    this.current.readCount += 1;
    this._saveProgress();
    this._updateUI();

    // 检查里程碑
    const milestone = this._getMilestone(this.current.readCount);
    if (milestone) {
      this._showToast(`${milestone.icon} ${milestone.label}！${milestone.message}`, 'milestone');
    } else {
      const messages = this.config.CHEER_MESSAGES;
      const msg = messages[Math.floor(Math.random() * messages.length)];
      this._showToast(`✅ ${msg}`, 'normal');
    }
  }

  // =========================================================================
  // 演讲考核
  // =========================================================================

  _openSpeechModal() {
    if (!this.dom.speechModal) return;
    if (this.dom.speechCountDisplay) {
      setText(this.dom.speechCountDisplay, this.current.readCount);
    }
    if (this.dom.speechForm) this.dom.speechForm.reset();

    this.dom.speechModal.classList.remove('speech-modal-hidden');
    this.dom.speechModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  _closeSpeechModal() {
    if (!this.dom.speechModal) return;
    this.dom.speechModal.classList.add('speech-modal-hidden');
    this.dom.speechModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  _handleSpeechSubmit(e) {
    e.preventDefault();

    const selected = e.target.querySelector('input[name="speechResult"]:checked');
    if (!selected) return;

    this.current.speechDone = true;
    this._saveProgress();
    this._updateUI();
    this._closeSpeechModal();

    const labels = {
      excellent: '🌟 优秀！',
      good: '👍 良好！',
      passable: '💪 继续加油！',
    };
    this._showToast(`🎤 ${labels[selected.value] || '考核完成！'} 考核已记录`, 'success');
  }

  // =========================================================================
  // UI 更新
  // =========================================================================

  _updateUI() {
    const { readCount, speechDone } = this.current;
    const pct = Math.min(readCount / this.TARGET, 1);

    // 更新控制面板进度徽章
    if (this.dom.badgeCount) {
      setText(this.dom.badgeCount, `${readCount}/${this.TARGET}`);
    }
    if (this.dom.badgeMile) {
      const milestone = this._getMilestone(readCount);
      setText(this.dom.badgeMile, milestone ? milestone.icon : '🌱');
    }

    // 更新歌词底部的打卡行
    if (this.dom.checkinRow && this.dom.checkinRow.parentNode) {
      // 迷你进度条
      if (this.dom.checkinProgress) {
        this.dom.checkinProgress.style.width = `${pct * 100}%`;
      }
      // 文字
      if (this.dom.checkinText) {
        this.dom.checkinText.innerHTML = `已跟读 <strong>${readCount}</strong> / ${this.TARGET} 遍`;
      }
      // 按钮
      if (this.dom.checkinBtn) {
        if (readCount >= this.TARGET) {
          this.dom.checkinBtn.disabled = true;
          this.dom.checkinBtn.innerHTML = '🏆 已达百遍';
          addClass(this.dom.checkinBtn, 'completed');
        } else {
          this.dom.checkinBtn.disabled = false;
          this.dom.checkinBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M4 11L7 14L16 5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            打卡跟读
          `;
          removeClass(this.dom.checkinBtn, 'completed');
        }
      }

      // 演讲考核按钮
      const speechBtn = this.dom.checkinRow.querySelector('#checkinSpeechBtn');
      const speechDoneBtn = this.dom.checkinRow.querySelector('#checkinSpeechDone');
      if (speechBtn) {
        speechBtn.style.display = (readCount >= this.SPEECH_THRESHOLD && !speechDone) ? '' : 'none';
      }
      if (speechDoneBtn) {
        speechDoneBtn.style.display = speechDone ? '' : 'none';
      }
    }
  }

  /**
   * 获取当前次数对应的里程碑
   */
  _getMilestone(count) {
    const milestones = this.config.MILESTONES;
    const keys = Object.keys(milestones).map(Number).sort((a, b) => b - a);
    for (const key of keys) {
      if (count >= key) return milestones[key];
    }
    return null;
  }

  // =========================================================================
  // Toast 提示
  // =========================================================================

  _showToast(message, type = 'normal') {
    const old = qs('.tracker-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.className = `tracker-toast tracker-toast-${type}`;
    setText(toast, message);
    document.body.appendChild(toast);

    requestAnimationFrame(() => addClass(toast, 'tracker-toast-show'));

    setTimeout(() => {
      removeClass(toast, 'tracker-toast-show');
      setTimeout(() => toast.remove(), 400);
    }, 2200);
  }

  /**
   * 重置当前单元的进度
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
   */
  getReadCount() {
    return this.current.readCount;
  }

  /**
   * 销毁清理
   */
  destroy() {
    this.dom.checkinRow?.remove();
    this.dom.badge?.remove();
    this.dom.speechModal?.remove();
    if (this.rs && this._originalLoadUnit) {
      this.rs.loadUnitByIndex = this._originalLoadUnit;
    }
    this._initialized = false;
  }
}
