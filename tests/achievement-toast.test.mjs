import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock minimal DOM environment for testing toast UI logic
class MockDOMElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.className = '';
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c)
    };
    this.children = [];
    this.parentNode = null;
    this.innerHTML = '';
    this.attributes = {};
    this.style = {};
  }

  setAttribute(name, val) {
    this.attributes[name] = val;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  querySelector(selector) {
    // Basic selector matcher for classes
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      const search = (node) => {
        if (node.className && node.className.includes(cls)) return node;
        for (const ch of node.children) {
          const res = search(ch);
          if (res) return res;
        }
        return null;
      };
      return search(this);
    }
    return null;
  }
}

test('Achievement Toast: CSS specifications and responsive design audit', () => {
  const css = fs.readFileSync(path.resolve('./src/style.css'), 'utf-8');

  // Verify desktop design constraints
  assert.match(css, /\.toast-container\s*\{[^}]*max-width:\s*340px/, 'Desktop toast container max-width must be 340px');
  assert.match(css, /\.arcade-toast[^{]*\{[^}]*padding:\s*10px 14px/, 'Desktop toast padding must be ~10px 14px');
  assert.match(css, /\.toast-icon\s*\{[^}]*font-size:\s*22px/, 'Desktop toast icon size must be around 22-24px');
  assert.match(css, /\.toast-title[^{]*\{[^}]*font-size:\s*14px/, 'Toast title must be ~14px');
  assert.match(css, /\.toast-badge[^{]*\{[^}]*font-size:\s*11px/, 'Toast badge must be ~11-12px');
  assert.match(css, /-webkit-line-clamp:\s*2/, 'Toast title must support 2-line clamp to prevent text clipping');

  // Verify mobile design constraints
  assert.match(css, /@media\s*\(max-width:\s*768px\)\s*\{[^}]*max-width:\s*290px/, 'Mobile toast container max-width must be 290px');
  assert.match(css, /env\(safe-area-inset-top/, 'Mobile toast container must respect safe-area-inset-top');
  assert.match(css, /translateX\(-50%\)/, 'Mobile toast container must be centered horizontally');

  // Verify 320px narrow mobile constraints
  assert.match(css, /@media\s*\(max-width:\s*340px\)/, 'Must contain narrow screen <=340px rules');

  // Verify reduced motion support
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Must respect OS prefers-reduced-motion');
  assert.match(css, /body\.reduced-motion/, 'Must respect application body.reduced-motion setting');
});

test('Achievement Toast: Lifecycle, queueing, formatting, and auto-dismissal logic', async () => {
  const container = new MockDOMElement('div');
  container.className = 'toast-container';

  const playedSounds = [];
  const announcedMessages = [];

  const soundMock = {
    playVictory: () => playedSounds.push('victory'),
    announce: (msg) => announcedMessages.push(msg)
  };

  // Instantiate arcade-like controller
  const arcade = {
    toastContainer: container,
    toastQueue: [],
    activeToasts: new Set(),
    recentToastKeys: new Set(),
    MAX_CONCURRENT_TOASTS: 2,
    TOAST_DISPLAY_MS: 50, // Shortened for fast test execution
    TOAST_FADE_MS: 10,

    showAchievementToast(ach) {
      if (!ach) return;
      const achKey = 'ach_' + (ach.id || ach.title);
      if (this.recentToastKeys.has(achKey)) return;
      this.recentToastKeys.add(achKey);
      setTimeout(() => this.recentToastKeys.delete(achKey), 500);

      soundMock.playVictory();
      soundMock.announce('Achievement Unlocked!');

      this.enqueueToast({
        type: 'achievement',
        id: ach.id,
        icon: ach.icon || '🏆',
        badge: 'ACHIEVEMENT UNLOCKED',
        title: ach.title || 'Unknown Achievement',
        reward: '+100 Neon Credits'
      });
    },

    showToast(arg1, arg2, arg3) {
      let icon = '🎮';
      let badge = 'ARCADE SYSTEM';
      let title = '';
      let reward = '';

      if (arg2 !== undefined && arg3 !== undefined) {
        icon = arg1 || '🎮';
        badge = arg2;
        title = arg3;
      } else if (arg2 !== undefined) {
        badge = arg1;
        title = arg2;
      } else if (typeof arg1 === 'string') {
        const msg = arg1.trim();
        const emojiMatch = msg.match(/^(\p{Extended_Pictographic}+|\S+)\s*(.*)$/u);
        if (emojiMatch && /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(emojiMatch[1])) {
          icon = emojiMatch[1];
          title = emojiMatch[2];
          badge = 'ARCADE SYSTEM';
        } else {
          title = msg;
          badge = 'ARCADE SYSTEM';
        }
      }

      this.enqueueToast({
        type: 'general',
        icon,
        badge,
        title,
        reward
      });
    },

    enqueueToast(item) {
      this.toastQueue.push(item);
      this.processToastQueue();
    },

    processToastQueue() {
      if (!this.toastContainer) return;
      while (this.activeToasts.size < this.MAX_CONCURRENT_TOASTS && this.toastQueue.length > 0) {
        const item = this.toastQueue.shift();
        this.mountToastElement(item);
      }
    },

    mountToastElement(item) {
      const toast = new MockDOMElement('div');
      const isAch = item.type === 'achievement';
      toast.className = `arcade-toast ${isAch ? 'toast-achievement achievement-toast' : 'toast-general'}`;
      toast.setAttribute('role', 'alert');

      const rewardHtml = item.reward ? `<div class="toast-reward">${item.reward}</div>` : '';
      toast.innerHTML = `
        <div class="toast-icon">${item.icon}</div>
        <div class="toast-content toast-text">
          <h5 class="toast-badge">${item.badge}</h5>
          <p class="toast-title">${item.title}</p>
          ${rewardHtml}
        </div>
      `;

      this.toastContainer.appendChild(toast);
      this.activeToasts.add(toast);

      const dismissTimer = setTimeout(() => {
        this.dismissToastElement(toast);
      }, this.TOAST_DISPLAY_MS);

      toast._dismissTimer = dismissTimer;
    },

    dismissToastElement(toast) {
      if (!toast) return;
      if (toast._dismissTimer) {
        clearTimeout(toast._dismissTimer);
        toast._dismissTimer = null;
      }

      toast.classList.add('toast-hiding');

      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        this.activeToasts.delete(toast);
        this.processToastQueue();
      }, this.TOAST_FADE_MS);
    },

    clearAllToasts() {
      this.toastQueue = [];
      for (const toast of this.activeToasts) {
        if (toast._dismissTimer) clearTimeout(toast._dismissTimer);
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }
      this.activeToasts.clear();
    }
  };

  // 1. Single Achievement Toast
  arcade.showAchievementToast({
    id: 'speed_demon',
    title: 'Speed Demon',
    icon: '🏎️'
  });

  assert.equal(container.children.length, 1);
  const toast1 = container.children[0];
  assert.ok(toast1.className.includes('toast-achievement'));
  assert.ok(toast1.className.includes('achievement-toast'));
  assert.ok(toast1.innerHTML.includes('ACHIEVEMENT UNLOCKED'));
  assert.ok(toast1.innerHTML.includes('Speed Demon'));
  assert.ok(toast1.innerHTML.includes('+100 Neon Credits'));
  assert.equal(playedSounds[0], 'victory');
  assert.equal(announcedMessages[0], 'Achievement Unlocked!');

  // 2. Duplicate Achievement Deduplication Test
  arcade.showAchievementToast({
    id: 'speed_demon',
    title: 'Speed Demon',
    icon: '🏎️'
  });
  // Should NOT create a second duplicate toast
  assert.equal(container.children.length, 1);

  // 3. Queueing: Add 3 more toasts while max concurrent is 2
  arcade.showToast('💾', 'SAVE SYSTEM', 'Backup completed');
  arcade.showToast('ℹ️ System notice 1');
  arcade.showToast('ℹ️ System notice 2');

  // Exactly 2 active in DOM, 2 waiting in queue
  assert.equal(container.children.length, 2);
  assert.equal(arcade.activeToasts.size, 2);
  assert.equal(arcade.toastQueue.length, 2);

  // 4. Wait for first batch to dismiss and next queued toasts to appear
  await new Promise(r => setTimeout(r, 80));

  // Queue should have progressed
  assert.equal(arcade.toastQueue.length, 0);

  // 5. Wait for remaining toasts to dismiss
  await new Promise(r => setTimeout(r, 80));
  assert.equal(container.children.length, 0);
  assert.equal(arcade.activeToasts.size, 0);

  // 6. Test clearAllToasts()
  arcade.showToast('A');
  arcade.showToast('B');
  arcade.showToast('C');
  arcade.showToast('D');
  assert.equal(container.children.length, 2);
  assert.equal(arcade.toastQueue.length, 2);

  arcade.clearAllToasts();
  assert.equal(container.children.length, 0);
  assert.equal(arcade.toastQueue.length, 0);
  assert.equal(arcade.activeToasts.size, 0);
});
