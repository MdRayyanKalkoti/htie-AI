/* ═══════════════════════════════════════════════════════════════════════════
   pwa-install.js — HTIE Universal PWA Install Engine v1.0
   ─────────────────────────────────────────────────────────────────────────
   Works on EVERY device that has ever had a web browser:

   ✅ MODERN MOBILE
      Android Chrome, Android Edge, Android Firefox
      iOS Safari (iPhone / iPad / iPod)
      Samsung Internet

   ✅ CHINA MOBILE (all brands + their browsers)
      WeChat (微信)           → open-in-browser redirect
      UC Browser (UC浏览器)   → 添加到桌面 steps
      Baidu Browser (百度)    → 添加到主屏幕 steps
      QQ Browser (QQ浏览器)   → 添加到主屏幕 steps
      Huawei Browser (华为)   → 添加到桌面 steps
      MIUI Browser (小米)     → 添加到桌面 steps
      OPPO Browser            → steps
      Vivo Browser            → steps
      360 Browser (360浏览器) → steps
      Sogou Browser (搜狗)    → steps
      Liebao Browser (猎豹)   → steps
      Quark Browser (夸克)    → steps
      Via Browser             → steps
      MiuiBrowser             → steps

   ✅ LEGACY / LESS COMMON
      Firefox (mobile + desktop)
      Opera / Opera Mini / Opera Mobile
      Brave Browser
      Yandex Browser
      Puffin Browser
      Dolphin Browser
      Maxthon Browser
      Desktop Safari (Mac)
      Desktop Chrome / Edge / Brave / Opera (PC)

   ─────────────────────────────────────────────────────────────────────────
   HOW IT WORKS:
   1. Page loads → bar is visible (CSS default)
   2. setupPWA() hides bar only if: dismissed this session OR already installed
   3. User clicks Install → deferredPrompt triggers native OS dialog (HTTPS)
      OR → showInstallModal() shows step-by-step for that exact browser
   ─────────────────────────────────────────────────────────────────────────
   DEPENDENCIES: Expects these DOM IDs in index.html:
     #pwaBar          — the install bar strip
     #pwaBarSub       — subtitle text inside bar
     #installBtn      — the install button
     #pwaModal        — modal overlay
     #pwaModalBox     — modal inner box
     #pwaModalBrowser — modal browser name label
     #pwaModalSteps   — modal steps container
   ─────────────────────────────────────────────────────────────────────────
   TO REUSE IN ANY PROJECT:
   1. Copy this file and the #pwaBar + #pwaModal HTML blocks
   2. Call setupPWA() in your DOMContentLoaded
   3. Deploy on HTTPS (required for native install prompt)
═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   ★ CAPTURE beforeinstallprompt IMMEDIATELY
   This event fires early — before DOMContentLoaded.
   Must be registered at script parse time, not inside any
   function. Using 'defer' on this script is fine because
   browsers hold the event until listeners are ready, BUT
   we also store it on window as a safety net.
═══════════════════════════════════════════════════════════ */
window.HTIE_deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome's mini-infobar from appearing automatically
  e.preventDefault();
  // Store for when user clicks Install button
  window.HTIE_deferredPrompt = e;
  // Show the install bar immediately if it's hidden
  const bar = document.getElementById('pwaBar');
  if (bar) {
    bar.classList.remove('hidden');
  }
  console.log('[HTIE PWA] beforeinstallprompt captured ✓');
});

window.addEventListener('appinstalled', () => {
  window.HTIE_deferredPrompt = null;
  pwa_hideBar();
  console.log('[HTIE PWA] App installed ✓');
  try {
    if (typeof setSbar === 'function') {
      setSbar('capStatus', 'ok', '✓ HTIE installed! Open it anytime from your home screen or desktop.');
    }
  } catch(e) {}
});

/* ═══════════════════════════════════════════════════════════
   1. BROWSER & DEVICE DETECTION
   Reads navigator.userAgent and builds a flat info object.
═══════════════════════════════════════════════════════════ */
function pwa_detectBrowser() {
  const ua  = navigator.userAgent || '';
  const pf  = navigator.platform  || '';
  const vn  = navigator.vendor    || '';

  const info = {
    // ── OS ────────────────────────────────────────────────
    isIOS:       /iPhone|iPad|iPod/i.test(ua),
    isAndroid:   /Android/i.test(ua),
    isMac:       /Macintosh|MacIntel|MacPPC/i.test(pf),
    isWin:       /Win/i.test(pf),
    isLinux:     /Linux/i.test(pf) && !/Android/i.test(ua),
    isMobile:    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),

    // ── CHINA BROWSERS ────────────────────────────────────
    isWeChat:    /MicroMessenger/i.test(ua),
    isWeibo:     /Weibo/i.test(ua),
    isUC:        /UCBrowser|UCWEB|UC?Browser/i.test(ua),
    isBaidu:     /baidubrowser|BaiduHD|baiduboxapp/i.test(ua),
    isQQ:        /QQBrowser|MQQBrowser|QQ\//i.test(ua),
    isHuawei:    /HuaweiBrowser/i.test(ua),
    isMIUI:      /MiuiBrowser|XiaoMi/i.test(ua),
    isOPPO:      /OppoBrowser|HeyTap|OPPO/i.test(ua),
    isVivo:      /VivoBrowser|vivo(?!s)/i.test(ua),
    is360:       /360\s?Browser|QHBrowser|360se/i.test(ua),
    isSogou:     /SogouMobileBrowser|MetaSr/i.test(ua),
    isLiebao:    /LieBaoFast|LBBROWSER/i.test(ua),
    isQuark:     /Quark(?!Video)/i.test(ua),
    isVia:       /\bVia\b/i.test(ua),
    isMiLink:    /MiLink/i.test(ua),
    isDolphin:   /Dolphin|DolfinBrowser/i.test(ua),
    isMaxthon:   /Maxthon|MxBrowser/i.test(ua),

    // ── MAINSTREAM BROWSERS ────────────────────────────────
    isSamsung:   /SamsungBrowser/i.test(ua),
    isFirefox:   /Firefox|FxiOS/i.test(ua) && !/Seamonkey/i.test(ua),
    isOpera:     /OPR\/|Opera Mini|Opera Mobi|Opera\//i.test(ua),
    isBrave:     /Brave/i.test(ua),
    isYandex:    /YaBrowser|YaSearchBrowser/i.test(ua),
    isPuffin:    /Puffin/i.test(ua),
    isEdge:      /Edg\/|EdgA\/|EdgIOS\//i.test(ua),
    isChrome:    /Chrome\/|CriOS\//i.test(ua) && !/Chromium|Edg\/|OPR\/|SamsungBrowser/i.test(ua),
    isSafari:    /Safari\//i.test(ua) && !/Chrome|CriOS|FxiOS|OPR\/|EdgIOS/i.test(ua),
    isIE:        /Trident\/|MSIE /i.test(ua),
  };

  // ── Composite flags ─────────────────────────────────────
  info.isChinaBrowser = (
    info.isWeChat || info.isWeibo || info.isUC  || info.isBaidu  ||
    info.isQQ     || info.isHuawei|| info.isMIUI|| info.isOPPO   ||
    info.isVivo   || info.is360   || info.isSogou|| info.isLiebao||
    info.isQuark  || info.isVia   || info.isMiLink
  );

  // Supports the native beforeinstallprompt event
  info.supportsPrompt = (
    (info.isChrome || info.isEdge || info.isSamsung || info.isBrave || info.isOpera) &&
    !info.isIOS && !info.isWeChat && !info.isUC && !info.isBaidu &&
    !info.isQQ  && !info.isHuawei && !info.isMIUI
  );

  return info;
}


/* ═══════════════════════════════════════════════════════════
   2. INSTALL STEPS PER BROWSER
   Returns { browser, steps[], tip? }
   Each step: { e: emoji, t: HTML instruction text }
═══════════════════════════════════════════════════════════ */
function pwa_getInstallSteps(br) {

  /* ── WeChat / Weibo ── must open in external browser first */
  if (br.isWeChat || br.isWeibo) {
    const app = br.isWeChat ? '微信 WeChat' : '微博 Weibo';
    return {
      browser: app,
      steps: [
        { e: '↗️', t: `Tap the <strong>⋯</strong> button in the top-right corner of ${app}` },
        { e: '🌐', t: 'Select <strong>"Open in Browser"</strong><br><span style="color:var(--muted)">(在浏览器中打开 / 在默认浏览器中打开)</span>' },
        { e: '📲', t: 'Once the page opens in Chrome or Safari, follow the steps below to install' },
      ],
      tip: `⚠️ ${app} restricts direct PWA install. You must open this page in your phone's default browser first.`,
    };
  }

  /* ── UC Browser ── */
  if (br.isUC) {
    return {
      browser: 'UC Browser (UC浏览器)',
      steps: [
        { e: '⋮', t: 'Tap the <strong>Menu</strong> icon (bottom bar or top-right)' },
        { e: '➕', t: 'Select <strong>"Add to Desktop"</strong><br><span style="color:var(--muted)">(添加到桌面)</span>' },
        { e: '✅', t: 'Tap <strong>Add</strong> to confirm — HTIE icon appears on your home screen' },
      ],
    };
  }

  /* ── Quark Browser ── */
  if (br.isQuark) {
    return {
      browser: 'Quark Browser (夸克浏览器)',
      steps: [
        { e: '⋮', t: 'Tap the <strong>⋮</strong> menu (bottom-right)' },
        { e: '📌', t: 'Select <strong>"Add to Desktop"</strong><br><span style="color:var(--muted)">(添加到桌面)</span>' },
        { e: '✅', t: 'Confirm to add HTIE to your home screen' },
      ],
    };
  }

  /* ── Baidu Browser ── */
  if (br.isBaidu) {
    return {
      browser: 'Baidu Browser (百度浏览器)',
      steps: [
        { e: '⋯', t: 'Tap the <strong>More</strong> button (three dots / bottom bar)' },
        { e: '📌', t: 'Select <strong>"Add to Home Screen"</strong><br><span style="color:var(--muted)">(添加到主屏幕)</span>' },
        { e: '✅', t: 'Tap Confirm — HTIE added to home screen' },
      ],
    };
  }

  /* ── QQ Browser ── */
  if (br.isQQ) {
    return {
      browser: 'QQ Browser (QQ浏览器)',
      steps: [
        { e: '⋮', t: 'Tap the <strong>Menu</strong> icon in the bottom toolbar' },
        { e: '🏠', t: 'Select <strong>"Add to Home Screen"</strong><br><span style="color:var(--muted)">(添加到主屏幕)</span>' },
        { e: '✅', t: 'Tap <strong>OK</strong> — HTIE icon added' },
      ],
    };
  }

  /* ── Huawei Browser ── */
  if (br.isHuawei) {
    return {
      browser: 'Huawei Browser (华为浏览器)',
      steps: [
        { e: '⋮', t: 'Tap the <strong>⋮</strong> menu (top-right corner)' },
        { e: '📲', t: 'Tap <strong>"Add to Home Screen"</strong><br><span style="color:var(--muted)">(添加到桌面)</span>' },
        { e: '✅', t: 'Tap <strong>Add</strong> to confirm' },
      ],
    };
  }

  /* ── MIUI Browser (Xiaomi) ── */
  if (br.isMIUI) {
    return {
      browser: 'MIUI Browser (小米浏览器)',
      steps: [
        { e: '⋮', t: 'Tap the <strong>⋮</strong> menu at the top-right' },
        { e: '🏠', t: 'Tap <strong>"Add to Home Screen"</strong><br><span style="color:var(--muted)">(添加到桌面)</span>' },
        { e: '✅', t: 'Confirm to add HTIE shortcut' },
      ],
    };
  }

  /* ── OPPO Browser ── */
  if (br.isOPPO) {
    return {
      browser: 'OPPO Browser',
      steps: [
        { e: '⋮', t: 'Tap the <strong>Menu</strong> button (three dots)' },
        { e: '📲', t: 'Select <strong>"Add to Home Screen"</strong>' },
        { e: '✅', t: 'Confirm to install HTIE on your home screen' },
      ],
    };
  }

  /* ── Vivo Browser ── */
  if (br.isVivo) {
    return {
      browser: 'Vivo Browser',
      steps: [
        { e: '⋮', t: 'Tap the <strong>Menu</strong> button' },
        { e: '📲', t: 'Select <strong>"Add to Home Screen"</strong>' },
        { e: '✅', t: 'Tap Confirm' },
      ],
    };
  }

  /* ── 360 Browser ── */
  if (br.is360) {
    return {
      browser: '360 Browser (360浏览器)',
      steps: [
        { e: '☰', t: 'Tap the <strong>Menu</strong> (top-right)' },
        { e: '📌', t: 'Select <strong>"Add to Desktop"</strong><br><span style="color:var(--muted)">(添加到桌面)</span>' },
        { e: '✅', t: 'Tap OK to confirm' },
      ],
    };
  }

  /* ── Sogou Browser ── */
  if (br.isSogou) {
    return {
      browser: 'Sogou Browser (搜狗浏览器)',
      steps: [
        { e: '⋮', t: 'Tap the <strong>Menu</strong> icon' },
        { e: '📌', t: 'Tap <strong>"Add to Home Screen"</strong><br><span style="color:var(--muted)">(添加到主屏幕)</span>' },
        { e: '✅', t: 'Confirm installation' },
      ],
    };
  }

  /* ── Liebao Browser ── */
  if (br.isLiebao) {
    return {
      browser: 'Liebao Browser (猎豹浏览器)',
      steps: [
        { e: '⋮', t: 'Tap the <strong>⋮</strong> menu' },
        { e: '📲', t: 'Select <strong>"Add to Desktop"</strong><br><span style="color:var(--muted)">(添加到桌面)</span>' },
        { e: '✅', t: 'Confirm to add HTIE' },
      ],
    };
  }

  /* ── Via Browser ── */
  if (br.isVia) {
    return {
      browser: 'Via Browser',
      steps: [
        { e: '⋮', t: 'Tap the <strong>⋮</strong> menu' },
        { e: '🏠', t: 'Select <strong>"Add to Home Screen"</strong>' },
        { e: '✅', t: 'Confirm' },
      ],
    };
  }

  /* ── Maxthon ── */
  if (br.isMaxthon) {
    return {
      browser: 'Maxthon Browser',
      steps: [
        { e: '☰', t: 'Tap the <strong>Maxthon Menu</strong>' },
        { e: '📌', t: 'Select <strong>"Add to Home Screen"</strong>' },
        { e: '✅', t: 'Confirm' },
      ],
    };
  }

  /* ── Yandex Browser ── */
  if (br.isYandex) {
    return {
      browser: 'Yandex Browser',
      steps: [
        { e: '⋮', t: 'Tap the <strong>⋮</strong> menu (top-right)' },
        { e: '📌', t: 'Select <strong>"Add shortcut to desktop"</strong>' },
        { e: '✅', t: 'Tap <strong>Add</strong>' },
      ],
    };
  }

  /* ── Samsung Internet ── */
  if (br.isSamsung) {
    return {
      browser: 'Samsung Internet',
      steps: [
        { e: '☰', t: 'Tap the <strong>☰ Menu</strong> button (bottom-right)' },
        { e: '➕', t: 'Select <strong>"Add page to"</strong> → <strong>"Home screen"</strong>' },
        { e: '✅', t: 'Tap <strong>Add</strong> to confirm' },
      ],
    };
  }

  /* ── Firefox Mobile ── */
  if (br.isFirefox && br.isMobile) {
    return {
      browser: 'Firefox (Mobile)',
      steps: [
        { e: '⋮', t: 'Tap the <strong>⋮</strong> menu (top-right or bottom-right)' },
        { e: '🏠', t: 'Select <strong>"Install"</strong> or <strong>"Add to Home Screen"</strong>' },
        { e: '✅', t: 'Tap <strong>Add</strong> to confirm' },
      ],
    };
  }

  /* ── Firefox Desktop ── */
  if (br.isFirefox) {
    return {
      browser: 'Firefox (Desktop)',
      steps: [
        { e: '☰', t: 'Click the <strong>☰ Menu</strong> (top-right)' },
        { e: '📌', t: 'Look for <strong>"Install"</strong> in the menu or address bar icon' },
        { e: '✅', t: 'Click <strong>Install</strong> to add HTIE to your desktop' },
      ],
    };
  }

  /* ── Opera / Opera Mini ── */
  if (br.isOpera) {
    return {
      browser: 'Opera Browser',
      steps: [
        { e: '⋮', t: 'Tap the <strong>O</strong> Opera button or <strong>⋮</strong> menu' },
        { e: '📲', t: 'Select <strong>"Add to home screen"</strong>' },
        { e: '✅', t: 'Tap <strong>Add</strong> to confirm' },
      ],
    };
  }

  /* ── Puffin ── */
  if (br.isPuffin) {
    return {
      browser: 'Puffin Browser',
      steps: [
        { e: '⋮', t: 'Tap the <strong>Menu</strong>' },
        { e: '📌', t: 'Select <strong>"Add to Home Screen"</strong>' },
        { e: '✅', t: 'Confirm' },
      ],
    };
  }

  /* ── iOS Safari ── */
  if (br.isIOS && br.isSafari) {
    return {
      browser: 'iPhone / iPad (Safari)',
      steps: [
        { e: '⎙', t: 'Tap the <strong>Share ⎙</strong> button at the bottom of Safari' },
        { e: '🏠', t: 'Scroll down in the share sheet and tap <strong>"Add to Home Screen"</strong>' },
        { e: '✏️', t: 'Edit the name if you want, then tap <strong>Add</strong> (top-right)' },
        { e: '✅', t: 'HTIE icon now appears on your iPhone or iPad home screen!' },
      ],
    };
  }

  /* ── iOS other browser (Chrome, Firefox on iOS) ── */
  if (br.isIOS) {
    return {
      browser: 'iPhone / iPad',
      steps: [
        { e: '🌐', t: 'Open this page in <strong>Safari</strong> (not Chrome or Firefox — iOS only allows install from Safari)' },
        { e: '⎙', t: 'Tap the <strong>Share ⎙</strong> icon at the bottom of Safari' },
        { e: '🏠', t: 'Tap <strong>"Add to Home Screen"</strong>' },
        { e: '✅', t: 'Tap <strong>Add</strong> to confirm' },
      ],
    };
  }

  /* ── Mac Safari (Desktop) ── */
  if (br.isSafari && br.isMac) {
    return {
      browser: 'Safari (Mac)',
      steps: [
        { e: '⎙', t: 'In Safari, click <strong>File</strong> menu in the top menu bar' },
        { e: '📌', t: 'Select <strong>"Add to Dock…"</strong> or open the Share menu and choose <strong>"Add to Home Screen"</strong>' },
        { e: '✅', t: 'Click <strong>Add</strong> — HTIE appears in your Mac Dock' },
      ],
    };
  }

  /* ── Desktop Chrome / Edge / Brave (PC) ── */
  if (!br.isMobile && (br.isChrome || br.isEdge || br.isBrave)) {
    const name = br.isEdge ? 'Edge' : br.isBrave ? 'Brave' : 'Chrome';
    return {
      browser: `${name} (Desktop)`,
      steps: [
        { e: '🔗', t: `Look for the <strong>Install ⊕</strong> icon in the right side of your address bar` },
        { e: '📥', t: `Or click the <strong>⋮</strong> menu (top-right) → <strong>"Install HTIE…"</strong> / <strong>"Apps → Install this site as an app"</strong>` },
        { e: '✅', t: `Click <strong>Install</strong> in the popup — HTIE opens as a standalone desktop app!` },
      ],
      tip: `💡 If you don't see the install icon, make sure you're on HTTPS (the deployed URL, not localhost).`,
    };
  }

  /* ── Internet Explorer (legacy fallback) ── */
  if (br.isIE) {
    return {
      browser: 'Internet Explorer',
      steps: [
        { e: '⚙️', t: 'Click the <strong>⚙ Tools</strong> menu' },
        { e: '📌', t: 'Select <strong>"Add site to Apps"</strong>' },
        { e: '✅', t: 'Click <strong>Add</strong>' },
      ],
      tip: '⚠️ Internet Explorer has very limited PWA support. Please upgrade to Chrome or Edge for the best experience.',
    };
  }

  /* ── Android generic default ── */
  if (br.isAndroid) {
    return {
      browser: 'Android Browser',
      steps: [
        { e: '⋮', t: 'Tap the <strong>⋮</strong> menu or <strong>☰</strong> menu button' },
        { e: '📲', t: 'Select <strong>"Add to Home Screen"</strong>' },
        { e: '✅', t: 'Tap <strong>Add</strong> to confirm' },
      ],
    };
  }

  /* ── Desktop generic fallback ── */
  return {
    browser: 'Your Browser',
    steps: [
      { e: '🌐', t: 'Open this page in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for the best install experience' },
      { e: '⋮', t: 'Click the <strong>⋮</strong> or <strong>⊕</strong> icon in the browser address bar or menu' },
      { e: '📥', t: 'Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>' },
      { e: '✅', t: 'Click or tap <strong>Install</strong> to confirm' },
    ],
  };
}


/* ═══════════════════════════════════════════════════════════
   3. SHOW MANUAL INSTALL MODAL
   Builds the step-by-step modal for the detected browser.
═══════════════════════════════════════════════════════════ */
function pwa_showInstallModal() {
  const br  = pwa_detectBrowser();
  const cfg = pwa_getInstallSteps(br);

  const browserEl = document.getElementById('pwaModalBrowser');
  const stepsEl   = document.getElementById('pwaModalSteps');
  const modal     = document.getElementById('pwaModal');

  if (!browserEl || !stepsEl || !modal) return;

  browserEl.textContent = cfg.browser.toUpperCase();

  let html = '';
  cfg.steps.forEach((s, i) => {
    html += `
      <div class="pwa-step">
        <div class="pwa-step-num">${i + 1}</div>
        <div class="pwa-step-emoji">${s.e}</div>
        <div class="pwa-step-text">${s.t}</div>
      </div>`;
  });

  if (cfg.tip) {
    html += `<div class="pwa-wechat-tip">${cfg.tip}</div>`;
  }

  stepsEl.innerHTML = html;
  modal.classList.add('show');
}

/* Close modal when clicking outside the box */
function closePwaModal(e) {
  const modal = document.getElementById('pwaModal');
  if (modal && e.target === modal) modal.classList.remove('show');
}


/* ═══════════════════════════════════════════════════════════
   4. HANDLE INSTALL BUTTON CLICK
   Called by onclick="handleInstall()" on the button.
═══════════════════════════════════════════════════════════ */
async function handleInstall() {
  // Play click sound if HTIE audio engine is loaded
  try { if (typeof playBtnClick === 'function') playBtnClick(); } catch(e) {}

  const prompt = window.HTIE_deferredPrompt;

  // ── Case 1: Native OS install dialog available ──────────
  // Happens on Chrome/Edge/Samsung when served over HTTPS
  if (prompt) {
    try {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        pwa_hideBar();
        window.HTIE_deferredPrompt = null;
        return;
      }
    } catch (err) {
      // Native prompt failed — fall through to manual modal
    }
    window.HTIE_deferredPrompt = null;
  }

  // ── Case 2: Localhost HTTP detected ────────────────────
  // beforeinstallprompt NEVER fires on HTTP — browser blocks it.
  // Show a friendly explanation instead of confusing steps.
  const isLocalhost = (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '0.0.0.0' ||
    location.hostname.endsWith('.local')
  );

  if (isLocalhost) {
    pwa_showLocalhostNotice();
    return;
  }

  // ── Case 3: HTTPS but no native prompt ─────────────────
  // Covers: iOS Safari, all China browsers, Firefox, etc.
  // Show manual step-by-step install guide for this browser.
  pwa_showInstallModal();
}

/* ── Localhost / HTTP notice ─────────────────────────────── */
function pwa_showLocalhostNotice() {
  const browserEl = document.getElementById('pwaModalBrowser');
  const stepsEl   = document.getElementById('pwaModalSteps');
  const modal     = document.getElementById('pwaModal');
  if (!browserEl || !stepsEl || !modal) return;

  browserEl.textContent = 'INSTALL REQUIRES HTTPS';
  stepsEl.innerHTML = `
    <div class="pwa-step">
      <div class="pwa-step-num">1</div>
      <div class="pwa-step-emoji">🔒</div>
      <div class="pwa-step-text">You are on <strong>localhost HTTP</strong> — browsers block PWA install on plain HTTP by design. This is a Chrome/browser security rule, not a bug.</div>
    </div>
    <div class="pwa-step">
      <div class="pwa-step-num">2</div>
      <div class="pwa-step-emoji">🚀</div>
      <div class="pwa-step-text">Deploy to <strong>Render, Railway, Vercel, or any HTTPS host</strong> — the Install button will show the native OS dialog automatically on the live URL.</div>
    </div>
    <div class="pwa-step">
      <div class="pwa-step-num">3</div>
      <div class="pwa-step-emoji">📋</div>
      <div class="pwa-step-text">Your <strong>render.yaml</strong> is ready — push to GitHub, connect to Render, and deploy. Takes about 2 minutes.</div>
    </div>
    <div class="pwa-wechat-tip">
      💡 On the live HTTPS URL: Chrome/Edge shows a native <strong>"Install App"</strong> popup. iOS Safari shows <strong>"Add to Home Screen"</strong> in Share menu. All China browsers show step-by-step guides.
    </div>
  `;
  modal.classList.add('show');
}


/* ═══════════════════════════════════════════════════════════
   5. DISMISS BUTTON
   Hides the bar for this session only.
═══════════════════════════════════════════════════════════ */
function dismissPWA() {
  try { if (typeof playBtnClick === 'function') playBtnClick(); } catch(e) {}
  pwa_hideBar();
  try { sessionStorage.setItem('htie_pwa_dismissed', '1'); } catch(e) {}
}


/* ═══════════════════════════════════════════════════════════
   6. HELPERS
═══════════════════════════════════════════════════════════ */
function pwa_hideBar() {
  const bar = document.getElementById('pwaBar');
  if (bar) bar.classList.add('hidden');
}

function pwa_showBar() {
  const bar = document.getElementById('pwaBar');
  if (bar) bar.classList.remove('hidden');
}


/* ═══════════════════════════════════════════════════════════
   7. SETUP — called in DOMContentLoaded
   Bar is VISIBLE BY DEFAULT (CSS).
   This function HIDES it only when appropriate.
═══════════════════════════════════════════════════════════ */
function setupPWA() {
  const bar = document.getElementById('pwaBar');
  const sub = document.getElementById('pwaBarSub');
  const br  = pwa_detectBrowser();

  // ── Hide if already dismissed this browser session ──────
  try {
    if (sessionStorage.getItem('htie_pwa_dismissed')) {
      pwa_hideBar(); return;
    }
  } catch(e) {}

  // ── Hide if already running as an installed PWA ──────────
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches  ||
    window.navigator.standalone === true
  ) {
    pwa_hideBar(); return;
  }

  // ── Update subtitle text for this browser ────────────────
  const isLocalhost = (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '0.0.0.0' ||
    location.hostname.endsWith('.local')
  );

  if (sub) {
    if (isLocalhost) {
      sub.textContent = '⚠ Localhost — Deploy to HTTPS for native install dialog';
    } else if (br.isWeChat || br.isWeibo) {
      sub.textContent = 'Tap to install — open in browser first (在浏览器中打开)';
    } else if (br.isChinaBrowser) {
      sub.textContent = 'Tap for install guide (添加到桌面 / 添加到主屏幕)';
    } else if (br.isIOS) {
      sub.textContent = 'Tap → Share ⎙ → Add to Home Screen';
    } else if (br.isMobile) {
      sub.textContent = 'Tap to add to your home screen — works offline';
    } else {
      sub.textContent = 'Install as a desktop app — works offline, no browser UI';
    }
  }

  // ── Wire native beforeinstallprompt (Chrome/Edge/Samsung + HTTPS) ──
  // NOTE: The primary listener is at the TOP of this file (script parse time).
  // This secondary listener is a safety net in case setupPWA runs after the event.
  if (!window.HTIE_deferredPrompt) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.HTIE_deferredPrompt = e;
      pwa_showBar();
    });
  }

  // Bar is already visible — nothing more to do for other browsers
}


/* ═══════════════════════════════════════════════════════════
   8. AUTO-INIT
   Runs setupPWA() as soon as the DOM is ready.
   Works even if this script loads after DOMContentLoaded.
═══════════════════════════════════════════════════════════ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPWA);
} else {
  // DOM already ready (script loaded async/deferred)
  setupPWA();
}