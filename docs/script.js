// MOSH LP — Full-page snap scroll
// ================================================================
// セクションごとに 100vh でスナップするプレゼン風スクロール
// ・ホイール / キーボード / タッチ に対応
// ・コンテンツが 100vh を超えるセクションは内部スクロール可能
//   （内部スクロールの端まで来たら次セクションへ）
// ================================================================

const DURATION = 750; // スクロールアニメーション時間 (ms)
const SELECTOR = '.hero, .section, .step-opener, footer.footer';
const slides   = Array.from(document.querySelectorAll(SELECTOR));

let isMoving = false;
let current  = 0;

// ── 現在ビューポートに最も近いスライドのインデックスを返す ──
function nearest() {
  return slides.reduce((best, s, i) =>
    Math.abs(s.getBoundingClientRect().top) <
    Math.abs(slides[best].getBoundingClientRect().top) ? i : best
  , 0);
}

// ── アクティブスライドのアニメーション切り替え ──
function activateSlide(idx) {
  slides.forEach((s, i) => {
    if (i === idx) {
      // 一旦クラスを外して付け直すことでアニメーションを再トリガー
      s.classList.remove('slide--active');
      // 次フレームで追加（reflow を強制）
      requestAnimationFrame(() => {
        requestAnimationFrame(() => s.classList.add('slide--active'));
      });
    } else {
      s.classList.remove('slide--active');
    }
  });
}

// ── 指定インデックスへ移動 ──
function go(idx) {
  if (idx < 0 || idx >= slides.length || isMoving) return;
  isMoving = true;
  current  = idx;
  slides[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  activateSlide(idx);
  updateDots();
  updateCounter();
  setTimeout(() => {
    isMoving = false;
    lastWheelTime = Date.now(); // アニメーション完了後に慣性スクロールをリセット
  }, DURATION);
}

// ── ホイールイベント ──
// nearest() はアニメーション中にズレるため、常に current を基準にする。
// トラックパッドの慣性スクロール対策でクールダウン + deltaY 閾値を設ける。
let lastWheelTime = 0;
const WHEEL_COOLDOWN = 400; // アニメーション後に受け付けるまでの待機 (ms)

window.addEventListener('wheel', e => {
  e.preventDefault();
  if (isMoving) return;
  if (Math.abs(e.deltaY) < 8) return;            // 慣性スクロールの微小イベントを除外
  const now = Date.now();
  if (now - lastWheelTime < WHEEL_COOLDOWN) return; // 連続発火を抑制
  lastWheelTime = now;
  go(current + (e.deltaY > 0 ? 1 : -1));
}, { passive: false });

// ── キーボード ──
document.addEventListener('keydown', e => {
  const navKeys = ['ArrowDown', 'PageDown', ' ', 'ArrowUp', 'PageUp'];
  if (!navKeys.includes(e.key)) return;
  // デフォルトスクロールを常にブロック（isMoving中も）
  e.preventDefault();
  if (isMoving) return;
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
    go(current + 1);
  } else {
    go(current - 1);
  }
});

// ── タッチ（スワイプ）──
let touchY = 0;
document.addEventListener('touchstart', e => {
  touchY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', e => {
  if (isMoving) return;
  const delta = touchY - e.changedTouches[0].clientY;
  if (Math.abs(delta) > 50) go(current + (delta > 0 ? 1 : -1));
}, { passive: true });

// ── スライド設定（ラベル + 大項目フラグ）──
// major: true  → 大項目（STEP opener・独立スライド）
// major: false → 小項目（各 STEP の詳細スライド）
const SLIDE_CONFIG = [
  { label: 'TOP',             major: true  },
  { label: '今日のアジェンダ', major: true  },
  { label: 'MOSHとは？',      major: true  },
  { label: '事例紹介',         major: false },
  { label: '利用者',           major: false },
  { label: '今日の流れ',       major: false },
  { label: 'STEP 1',          major: true  },
  { label: 'プロフィールリンク', major: false },
  { label: 'ページビルダー',   major: false },
  { label: 'STEP 1 まとめ',   major: false },
  { label: 'STEP 2',          major: true  },
  { label: '販売スタイル',     major: false },
  { label: '決済方法',         major: false },
  { label: '申込後の自動化',   major: false },
  { label: 'STEP 2 まとめ',   major: false },
  { label: 'STEP 3',          major: true  },
  { label: '申込者向けサイト', major: false },
  { label: '購入者の体験',     major: false },
  { label: 'STEP 3 まとめ',   major: false },
  { label: '料金プラン',       major: true  },
  { label: 'サポート',         major: false },
  { label: 'はじめよう',       major: true  },
];

// ── ナビゲーション（目次 + 進捗）生成 ──
let fillEl = null;

function buildNav() {
  const nav = document.createElement('nav');
  nav.className = 'slide-nav';
  nav.setAttribute('aria-label', 'スライドナビゲーション');

  // ドット列を囲むトラック（進捗ライン含む）
  const track = document.createElement('div');
  track.className = 'slide-nav__track';

  // 進捗フィルライン
  fillEl = document.createElement('div');
  fillEl.className = 'slide-progress-fill';
  track.appendChild(fillEl);

  // ラベル + ドット（1行ずつ）
  slides.forEach((_, i) => {
    const cfg   = SLIDE_CONFIG[i] || { label: `スライド ${i + 1}`, major: false };
    const label = cfg.label;
    const isMajor = cfg.major;

    const item = document.createElement('div');
    item.className = [
      'slide-dot-item',
      isMajor ? 'slide-dot-item--major' : 'slide-dot-item--minor',
      i === 0 ? 'slide-dot-item--active' : '',
    ].filter(Boolean).join(' ');
    item.addEventListener('click', () => go(i));

    const labelEl = document.createElement('span');
    labelEl.className = 'slide-dot-label';
    labelEl.textContent = label;

    const dot = document.createElement('button');
    dot.className = 'slide-dot' + (i === 0 ? ' slide-dot--active' : '');
    dot.setAttribute('aria-label', `${label}（${i + 1} / ${slides.length}）`);
    dot.tabIndex = -1; // クリックは item 側で処理

    item.appendChild(labelEl);
    item.appendChild(dot);
    track.appendChild(item);
  });

  nav.appendChild(track);
  document.body.appendChild(nav);
}

// ── スライド番号カウンター（右下）──
let counterEl;
function buildCounter() {
  counterEl = document.createElement('div');
  counterEl.className = 'slide-counter';
  counterEl.textContent = `1 / ${slides.length}`;
  document.body.appendChild(counterEl);
}

// ── ドット状態 ＋ ラベル状態 ＋ 進捗バー更新 ──
function updateDots() {
  const dotEls  = document.querySelectorAll('.slide-dot');
  const itemEls = document.querySelectorAll('.slide-dot-item');

  dotEls.forEach((d, i) => {
    d.classList.toggle('slide-dot--active', i === current);
    d.classList.toggle('slide-dot--passed',  i < current);
  });

  itemEls.forEach((item, i) => {
    item.classList.toggle('slide-dot-item--active', i === current);
    item.classList.toggle('slide-dot-item--passed',  i < current);
  });

  // 進捗バーの高さ：最初〜最後のドット中心間を current/total-1 で埋める
  if (fillEl && slides.length > 1) {
    const pct = (current / (slides.length - 1)) * 100;
    fillEl.style.height = `calc(${pct}% - 0px)`;
  }
}

function updateCounter() {
  if (counterEl) counterEl.textContent = `${current + 1} / ${slides.length}`;
}

// ── アンカーリンク ──
document.querySelectorAll('a[href^="#"]').forEach(a =>
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  })
);

// ── 自動スケーラー ──
// 画面に余白があれば拡大、溢れれば縮小する双方向スケーラー。
// zoom はレイアウトごとスケールするため transform アニメーションと干渉しない。
const SCALE_TARGET = 0.90; // 画面高さの何割を目標にするか
const SCALE_MAX    = 1.00; // 拡大の上限（スケールアップ無効化でフォント一貫性を確保）
const SCALE_MIN    = 0.55; // 縮小の下限（小さすぎ防止）

function autoScaleSlides() {
  const viewH = window.innerHeight;

  slides.forEach(slide => {
    // inner コンテナを特定（section__inner / hero__inner / step-opener 自身）
    const inner = slide.querySelector('.section__inner, .hero__inner') || slide;

    // zoom をリセットしてから実測（正確な scrollHeight を得るため）
    inner.style.zoom = '';
    void inner.offsetHeight; // reflow を強制

    const contentH = inner.scrollHeight;
    const ratio = (viewH * SCALE_TARGET) / contentH;
    // 上限・下限でクランプ。ほぼ 1.0 の場合はリセット（不要な zoom を避ける）
    const scale = Math.min(Math.max(ratio, SCALE_MIN), SCALE_MAX);
    if (Math.abs(scale - 1) > 0.02) {
      inner.style.zoom = scale;
    }
  });
}

// ── 初期化 ──
buildNav();
buildCounter();
// 最初のスライドをアクティブに（暫定）
activateSlide(0);
// スライドを自動スケール（画像・フォント読み込み完了後に実行）
window.addEventListener('load', () => {
  autoScaleSlides();
  // フォントの遅延レンダリング対策で少し遅延させて再実行
  setTimeout(autoScaleSlides, 300);
  // リフレッシュ時：ブラウザのスクロール復元が終わったあとに
  // 実際に表示中のスライドへ目次・カウンターを同期する
  setTimeout(() => {
    const idx = nearest();
    if (idx !== current) {
      current = idx;
      activateSlide(idx);
      updateDots();
      updateCounter();
    }
  }, 100);
});
window.addEventListener('resize', autoScaleSlides);
