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
  setTimeout(() => { isMoving = false; }, DURATION);
}

// ── ホイールイベント ──
// セクション内に内部スクロールの余地があればそちらを優先し、
// 端まで来たら次／前セクションへ移動する
window.addEventListener('wheel', e => {
  const sec = e.target.closest(SELECTOR);
  if (sec) {
    const atTop    = sec.scrollTop <= 0;
    const atBottom = Math.abs(sec.scrollHeight - sec.scrollTop - sec.clientHeight) < 3;
    // スクロール方向に余地があれば内部スクロールに任せる
    if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) return;
  }
  e.preventDefault();
  if (isMoving) return;
  go(nearest() + (e.deltaY > 0 ? 1 : -1));
}, { passive: false });

// ── キーボード ──
document.addEventListener('keydown', e => {
  if (isMoving) return;
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
    e.preventDefault();
    go(nearest() + 1);
  } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
    e.preventDefault();
    go(nearest() - 1);
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
  if (Math.abs(delta) > 50) go(nearest() + (delta > 0 ? 1 : -1));
}, { passive: true });

// ── ドットナビゲーション＋進捗バー（生成）──
let fillEl = null;

function buildNav() {
  const nav = document.createElement('nav');
  nav.className = 'slide-nav';
  nav.setAttribute('aria-label', 'スライドナビゲーション');

  // 進捗フィルライン
  fillEl = document.createElement('div');
  fillEl.className = 'slide-progress-fill';
  nav.appendChild(fillEl);

  // ドット
  slides.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'slide-dot' + (i === 0 ? ' slide-dot--active' : '');
    btn.setAttribute('title', `スライド ${i + 1} / ${slides.length}`);
    btn.setAttribute('aria-label', `スライド ${i + 1}`);
    btn.addEventListener('click', () => go(i));
    nav.appendChild(btn);
  });

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

// ── ドット状態 ＋ 進捗バー更新 ──
function updateDots() {
  const dotEls = document.querySelectorAll('.slide-dot');

  dotEls.forEach((d, i) => {
    d.classList.toggle('slide-dot--active', i === current);
    d.classList.toggle('slide-dot--passed',  i < current);
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
// コンテンツがビューポートに収まらないスライドを zoom で縮小する。
// zoom はレイアウトごと縮小するため transform アニメーションと干渉しない。
function autoScaleSlides() {
  const viewH = window.innerHeight;

  slides.forEach(slide => {
    // inner コンテナを特定（section__inner / hero__inner / step-opener 自身）
    const inner = slide.querySelector('.section__inner, .hero__inner') || slide;

    // zoom をリセットしてから実測（正確な scrollHeight を得るため）
    inner.style.zoom = '';
    void inner.offsetHeight; // reflow を強制

    const contentH = inner.scrollHeight;
    if (contentH > viewH) {
      const scale = viewH / contentH;
      inner.style.zoom = scale;
    }
  });
}

// ── 初期化 ──
buildNav();
buildCounter();
// 最初のスライドをアクティブに
activateSlide(0);
// スライドを自動スケール（画像・フォント読み込み完了後に実行）
window.addEventListener('load', () => {
  autoScaleSlides();
  // フォントの遅延レンダリング対策で少し遅延させて再実行
  setTimeout(autoScaleSlides, 300);
});
window.addEventListener('resize', autoScaleSlides);
