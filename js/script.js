// ==========================================================================
// Apna Sheikhpura — core interactions
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Ticker: duplicate content for seamless infinite scroll ---- */
  const tickerTrack = document.getElementById('tickerTrack');
  if (tickerTrack) {
    tickerTrack.innerHTML += tickerTrack.innerHTML; // duplicate once
  }

  /* ---- Header: add shadow/blur boost after scrolling ---- */
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    if (window.scrollY > 20) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile nav toggle ---- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
    navToggle.classList.toggle('is-active', isOpen);
  });

  // Close mobile menu when a link is tapped
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.classList.remove('is-active');
    });
  });

  // Close the menu when tapping outside it, or pressing Escape
  document.addEventListener('click', (e) => {
    if (!navLinks.classList.contains('open')) return;
    if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.classList.remove('is-active');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.classList.remove('is-active');
    }
  });

  /* ---- Footer year ---- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Image fade-in: photos ease in softly once they finish loading.
     Without JS, images stay fully visible (progressive enhancement). ---- */
  document.querySelectorAll('img').forEach(img => {
    const markLoaded = () => {
      img.classList.remove('img-loading');
      img.classList.add('img-loaded');
    };
    if (img.complete && img.naturalWidth) return; // already visible, nothing to do
    img.classList.add('img-loading');
    img.addEventListener('load', markLoaded, { once: true });
    img.addEventListener('error', markLoaded, { once: true }); // never leave an image stuck hidden
  });

  /* ---- Reading progress bar + scrollspy + back-to-top ----
     One rAF-throttled scroll handler drives all three, so scrolling
     stays smooth even with all the extra UI. */
  const progressBar = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');
  const spyLinks = Array.from(document.querySelectorAll('.nav-links a:not(.nav-cta)'));
  const spySections = spyLinks
    .map(link => {
      const id = (link.getAttribute('href') || '').replace('#', '');
      const section = id ? document.getElementById(id) : null;
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateScrollUi = () => {
    const y = window.scrollY;

    if (progressBar) {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      progressBar.style.width = max > 0 ? `${Math.min((y / max) * 100, 100)}%` : '0%';
    }

    if (backToTop) backToTop.classList.toggle('visible', y > 640);

    if (spySections.length) {
      const probe = y + window.innerHeight * 0.35;
      let current = spySections[0];
      for (const item of spySections) {
        if (item.section.offsetTop <= probe) current = item;
      }
      spyLinks.forEach(link => link.classList.remove('active'));
      if (y > 60) current.link.classList.add('active');
    }
  };

  let scrollUiTicking = false;
  window.addEventListener('scroll', () => {
    if (scrollUiTicking) return;
    scrollUiTicking = true;
    requestAnimationFrame(() => {
      updateScrollUi();
      scrollUiTicking = false;
    });
  }, { passive: true });
  updateScrollUi();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---- Scroll reveal: fade/slide elements in as they enter viewport ---- */
  const revealEls = document.querySelectorAll('.reveal');

  // Mark an element visible, then drop the reveal classes once the entrance
  // finishes — hover transitions then run instantly again (no stagger delay
  // left over) and :hover transforms aren't overridden by the reveal's
  // own transform (a specificity quirk that used to mute card hovers).
  const revealNow = (el) => {
    if (el.classList.contains('is-visible')) return;
    el.classList.add('is-visible');

    const delaySec = parseFloat(getComputedStyle(el).transitionDelay) || 0;
    setTimeout(() => {
      el.classList.remove('reveal', 'is-visible', 'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3');
      el.classList.add('reveal-done');
    }, delaySec * 1000 + 800);
  };

  if (revealEls.length) {
    if (!('IntersectionObserver' in window)) {
      // Very old browser: just show everything immediately.
      revealEls.forEach(el => el.classList.add('is-visible'));
    } else {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            revealNow(entry.target);
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      revealEls.forEach(el => revealObserver.observe(el));

      // Safety net 1: whatever is on the first screen right now must be
      // visible shortly after load, even if the observer misses it.
      setTimeout(() => {
        revealEls.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) revealNow(el);
        });
      }, 600);

      // Safety net 2 (belt & braces): a light poll that reveals anything
      // that should already be on screen — content must never get stuck
      // invisible, even in a buggy embedded webview. Stops once the page
      // has been scrolled to the bottom.
      const revealFallback = setInterval(() => {
        let pending = false;
        revealEls.forEach(el => {
          if (el.classList.contains('is-visible')) return;
          const rect = el.getBoundingClientRect();
          // Anything at or above the viewport's bottom edge should be
          // visible by now (covers fast scrolling past a section too).
          if (rect.top < window.innerHeight) revealNow(el);
          else pending = true;
        });
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        if (!pending && atBottom) clearInterval(revealFallback);
      }, 800);
    }
  }

  /* ---- Gallery photo wall: each tile independently crossfades to a
     random photo from the pool every ~2.5s. To add more photos, just add
     the file to assets/images/gallery/ and add its path below — nothing
     else needs to change. */
  const GALLERY_PHOTOS = [
    'assets/images/gallery/gallery-1.jpg',
    'assets/images/gallery/gallery-2.jpg',
    'assets/images/gallery/gallery-3.jpg',
    'assets/images/gallery/gallery-4.jpg',
    'assets/images/gallery/gallery-5.jpg',
    'assets/images/gallery/gallery-6.jpg',
    'assets/images/gallery/gallery-7.jpg',
    'assets/images/gallery/gallery-8.jpg',
    'assets/images/gallery/gallery-9.jpg',
    'assets/images/gallery/gallery-10.jpg',
    'assets/images/gallery/gallery-11.jpg',
    'assets/images/gallery/gallery-12.jpg',
    'assets/images/gallery/gallery-13.jpg',
    'assets/images/gallery/gallery-14.jpg',
    'assets/images/gallery/gallery-15.jpg',
    'assets/images/gallery/gallery-16.jpg',
    'assets/images/gallery/gallery-17.jpg',
    'assets/images/gallery/gallery-18.jpg',
    'assets/images/gallery/gallery-19.jpg',
    'assets/images/gallery/gallery-20.jpg',
    'assets/images/gallery/gallery-21.jpg',
    'assets/images/gallery/gallery-22.jpg',
    'assets/images/gallery/gallery-23.jpg',
    'assets/images/gallery/gallery-24.jpg',
    'assets/images/gallery/gallery-25.jpg',
    'assets/images/gallery/gallery-26.jpg',
    'assets/images/gallery/gallery-27.jpg',
  ];

  const galleryTileImgs = document.querySelectorAll('.gallery-tile img');

  if (galleryTileImgs.length && GALLERY_PHOTOS.length > galleryTileImgs.length) {
    const tilesArr = Array.from(galleryTileImgs);
    tilesArr.forEach(img => { img.dataset.current = img.getAttribute('src'); });

    // Make each tile's shape match whatever photo is currently in it —
    // portrait photos get a tall slot, wide landscape photos get a wide
    // slot, everything else gets a normal square-ish slot. This is only
    // applied ONCE per tile (on first load) — not on every rotation —
    // because changing a tile's shape mid-rotation shifts the whole grid's
    // height, which pushes the sections below it up and down. Fixing the
    // shape once keeps the page layout stable; only the photo itself
    // crossfades after that.
    function matchTileShapeToPhoto(img) {
      const tile = img.closest('.gallery-tile');
      if (!tile || !img.naturalWidth || !img.naturalHeight) return;
      const ratio = img.naturalWidth / img.naturalHeight;
      tile.classList.remove('gtile-tall', 'gtile-wide');
      if (ratio < 0.85) {
        tile.classList.add('gtile-tall');
      } else if (ratio > 1.6) {
        tile.classList.add('gtile-wide');
      }
    }

    tilesArr.forEach(img => {
      const applyOnce = () => {
        matchTileShapeToPhoto(img);
        img.removeEventListener('load', applyOnce);
      };
      img.addEventListener('load', applyOnce);
      if (img.complete && img.naturalWidth) applyOnce();
    });

    // A few tiles cycle noticeably faster (5s / 8s / 10s) for a bit of
    // life, while most tiles stay calm at 15-17s. Fast tiles are spread
    // out across the grid (not next to each other) so it doesn't look like
    // one corner is doing all the work.
    const FAST_TILE_INDEXES = { 1: 5000, 5: 8000, 9: 10000 };

    function pickDifferentPhoto(currentSrc, currentlyShown) {
      let choice;
      let attempts = 0;
      do {
        choice = GALLERY_PHOTOS[Math.floor(Math.random() * GALLERY_PHOTOS.length)];
        attempts++;
      } while ((choice === currentSrc || currentlyShown.has(choice)) && attempts < 20);
      return choice;
    }

    function rotateOneTile(img) {
      const currentlyShown = new Set(tilesArr.map(el => el.dataset.current));
      const next = pickDifferentPhoto(img.dataset.current, currentlyShown);

      img.classList.add('gtile-fading');
      setTimeout(() => {
        img.src = next;
        img.dataset.current = next;
        img.classList.remove('gtile-fading');
      }, 400);
    }

    tilesArr.forEach((img, i) => {
      const interval = FAST_TILE_INDEXES[i] || (15000 + Math.random() * 2000); // 15-17s for the rest
      const initialDelay = interval; // first change happens after one full interval, not sooner
      setTimeout(function tick() {
        rotateOneTile(img);
        setInterval(() => rotateOneTile(img), interval);
      }, initialDelay);
    });
  }

  /* ---- Photo Puzzle Game ----
     3x3 puzzle. currentOrder[i] = which piece (0-8) sits at grid position i.
     Solved when currentOrder[i] === i for all i.
     Supports both: drag a tile onto another to swap (mouse or finger),
     and a simple tap-tap fallback for anyone who doesn't drag. */
  const puzzleGrid = document.getElementById('puzzleGrid');

  // Pool of puzzle photos — a random one is picked each new game.
  // Add more paths here any time; no other code changes needed.
  const PUZZLE_PHOTOS = [
    'assets/images/puzzle-photo.jpg',
    'assets/images/puzzle-photo-2.jpg',
    'assets/images/puzzle-photo-3.jpg',
    'assets/images/puzzle-photo-4.jpg',
  ];

  // Paste the Google Apps Script Web App URL here once deployed (see setup
  // steps) to start saving Name / Instagram / Moves to the Google Sheet.
  const PUZZLE_SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwKZfGAg1oXuLK8fpe-RUblQ1IioUGgicCsgbRUOJBYEm3qb7LqnA7-CAkO6cqqiDY2/exec';

  if (puzzleGrid) {
    const GRID_SIZE = 3;
    const TOTAL = GRID_SIZE * GRID_SIZE;
    const DRAG_THRESHOLD = 8; // px of movement before a tap becomes a drag

    let currentOrder = [];
    let selectedIndex = null;   // used for tap-tap fallback
    let moveCount = 0;
    let currentPhoto = PUZZLE_PHOTOS[0];

    // cosmetic: grid positions of the last swap, so those tiles can "pop"
    let lastSwapPositions = null;

    // drag state
    let dragTile = null;
    let dragFromPos = null;
    let dragStartX = 0, dragStartY = 0;
    let isDragging = false;
    let dropTargetEl = null;

    const movesEl = document.getElementById('puzzleMoves');
    const shuffleBtn = document.getElementById('puzzleShuffle');
    const celebrationEl = document.getElementById('puzzleCelebration');
    const confettiEl = document.getElementById('puzzleConfetti');
    const resultEl = document.getElementById('puzzleResult');
    const resultHeadingEl = document.getElementById('puzzleResultHeading');
    const resultFormEl = document.getElementById('puzzleResultForm');
    const resultThanksEl = document.getElementById('puzzleResultThanks');

    function pieceBackgroundPosition(pieceIndex) {
      const col = pieceIndex % GRID_SIZE;
      const row = Math.floor(pieceIndex / GRID_SIZE);
      const step = 100 / (GRID_SIZE - 1); // 0%, 50%, 100% for a 3x3 grid
      return `${col * step}% ${row * step}%`;
    }

    function isSolved() {
      return currentOrder.every((piece, i) => piece === i);
    }

    function shuffleOrder() {
      let arr = Array.from({ length: TOTAL }, (_, i) => i);
      do {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
      } while (arr.every((piece, i) => piece === i)); // avoid an already-solved shuffle
      return arr;
    }

    function swapPositions(posA, posB) {
      [currentOrder[posA], currentOrder[posB]] = [currentOrder[posB], currentOrder[posA]];
      moveCount++;
      movesEl.textContent = `Moves: ${moveCount}`;
      lastSwapPositions = [posA, posB];
      selectedIndex = null;
      render();

      if (isSolved()) {
        setTimeout(celebrate, 150);
      }
    }

    function render() {
      puzzleGrid.innerHTML = '';
      currentOrder.forEach((pieceIndex, gridPos) => {
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';
        tile.style.backgroundImage = `url('${currentPhoto}')`;
        tile.style.backgroundPosition = pieceBackgroundPosition(pieceIndex);
        tile.dataset.gridPos = gridPos;
        tile.setAttribute('role', 'button');
        tile.setAttribute('aria-label', `Puzzle piece, position ${gridPos + 1}`);
        tile.style.touchAction = 'none'; // let us handle the gesture ourselves
        tile.addEventListener('pointerdown', (e) => onPointerDown(e, gridPos, tile));
        // small pop on the two tiles that were just swapped
        if (lastSwapPositions && lastSwapPositions.includes(gridPos)) {
          tile.classList.add('puzzle-swap');
          tile.addEventListener('animationend', () => tile.classList.remove('puzzle-swap'), { once: true });
        }
        puzzleGrid.appendChild(tile);
      });
    }

    function onPointerDown(e, gridPos, tileEl) {
      if (celebrationEl.classList.contains('puzzle-celebration-visible')) return;
      dragTile = tileEl;
      dragFromPos = gridPos;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      isDragging = false;
      tileEl.setPointerCapture(e.pointerId);
      tileEl.addEventListener('pointermove', onPointerMove);
      tileEl.addEventListener('pointerup', onPointerUp);
      tileEl.addEventListener('pointercancel', onPointerCancel);
    }

    function onPointerMove(e) {
      if (!dragTile) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      if (!isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        isDragging = true;
        dragTile.classList.add('puzzle-dragging');
      }

      if (isDragging) {
        dragTile.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;

        // figure out which tile we're hovering over
        dragTile.style.pointerEvents = 'none';
        const under = document.elementFromPoint(e.clientX, e.clientY);
        dragTile.style.pointerEvents = '';

        const hoveredTile = under ? under.closest('.puzzle-tile') : null;

        if (dropTargetEl && dropTargetEl !== hoveredTile) {
          dropTargetEl.classList.remove('puzzle-drop-target');
          dropTargetEl = null;
        }
        if (hoveredTile && hoveredTile !== dragTile) {
          hoveredTile.classList.add('puzzle-drop-target');
          dropTargetEl = hoveredTile;
        }
      }
    }

    function onPointerUp(e) {
      if (!dragTile) return;

      if (isDragging) {
        dragTile.style.transform = '';
        dragTile.classList.remove('puzzle-dragging');
        if (dropTargetEl) {
          dropTargetEl.classList.remove('puzzle-drop-target');
          const toPos = parseInt(dropTargetEl.dataset.gridPos, 10);
          swapPositions(dragFromPos, toPos);
        }
      } else {
        // treated as a simple tap — fall back to tap-to-select-then-swap
        handleTap(dragFromPos, dragTile);
      }

      cleanupDrag();
    }

    function onPointerCancel() {
      if (dragTile) {
        dragTile.style.transform = '';
        dragTile.classList.remove('puzzle-dragging');
      }
      if (dropTargetEl) dropTargetEl.classList.remove('puzzle-drop-target');
      cleanupDrag();
    }

    function cleanupDrag() {
      if (dragTile) {
        dragTile.removeEventListener('pointermove', onPointerMove);
        dragTile.removeEventListener('pointerup', onPointerUp);
        dragTile.removeEventListener('pointercancel', onPointerCancel);
      }
      dragTile = null;
      dragFromPos = null;
      isDragging = false;
      dropTargetEl = null;
    }

    function handleTap(gridPos, tileEl) {
      if (selectedIndex === null) {
        selectedIndex = gridPos;
        tileEl.classList.add('puzzle-selected');
        return;
      }
      if (selectedIndex === gridPos) {
        tileEl.classList.remove('puzzle-selected');
        selectedIndex = null;
        return;
      }
      swapPositions(selectedIndex, gridPos);
    }

    function spawnConfetti() {
      confettiEl.innerHTML = '';
      const colors = ['#E3A73C', '#A63D2F', '#4C6B4F', '#1E2A38', '#F1E9D6'];
      const pieceCount = 36;
      for (let i = 0; i < pieceCount; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = `${1.2 + Math.random() * 1}s`;
        piece.style.animationDelay = `${Math.random() * 0.4}s`;
        confettiEl.appendChild(piece);
      }
    }

    function celebrate() {
      spawnConfetti();
      celebrationEl.classList.add('puzzle-celebration-visible');

      // reveal the name/mobile capture form with the final move count
      resultHeadingEl.textContent = `Wah! Aapne ${moveCount} moves mein solve kar diya! 🎉`;
      resultFormEl.classList.remove('puzzle-result-hidden');
      resultFormEl.reset();
      resultThanksEl.classList.remove('puzzle-result-thanks-visible');
      resultEl.classList.add('puzzle-result-visible');
    }

    function pickRandomPhoto() {
      if (PUZZLE_PHOTOS.length === 1) return PUZZLE_PHOTOS[0];
      let choice;
      do {
        choice = PUZZLE_PHOTOS[Math.floor(Math.random() * PUZZLE_PHOTOS.length)];
      } while (choice === currentPhoto); // avoid repeating the same photo twice in a row
      return choice;
    }

    function newGame() {
      currentPhoto = pickRandomPhoto();
      currentOrder = shuffleOrder();
      moveCount = 0;
      selectedIndex = null;
      lastSwapPositions = null;
      movesEl.textContent = 'Moves: 0';
      celebrationEl.classList.remove('puzzle-celebration-visible');
      confettiEl.innerHTML = '';
      resultEl.classList.remove('puzzle-result-visible');
      render();
    }

    async function submitScore(name, instagram, moves) {
      if (!PUZZLE_SHEET_WEBAPP_URL) {
        console.warn('Puzzle: PUZZLE_SHEET_WEBAPP_URL is not set yet — score was not saved anywhere.');
        return;
      }
      try {
        await fetch(PUZZLE_SHEET_WEBAPP_URL, {
          method: 'POST',
          mode: 'no-cors', // Apps Script web apps don't return CORS headers;
                            // no-cors still delivers the request, we just can't read the response
          headers: { 'Content-Type': 'text/plain' }, // avoids a CORS preflight
          body: JSON.stringify({ name, instagram, moves }),
        });
      } catch (err) {
        console.error('Puzzle: failed to save score', err);
      }
    }

    resultFormEl.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('puzzleName').value.trim();
      const instagram = document.getElementById('puzzleInstagram').value.trim();

      console.log('Puzzle submit payload:', { name, instagram, moves: moveCount });

      submitScore(name, instagram, moveCount);

      resultFormEl.classList.add('puzzle-result-hidden');
      resultThanksEl.classList.add('puzzle-result-thanks-visible');
    });

    shuffleBtn.addEventListener('click', newGame);
    celebrationEl.addEventListener('click', newGame);

    newGame();
  }

  /* ---- Terms & Conditions modal (puzzle collaboration) ---- */
  const termsBtn = document.getElementById('puzzleTermsBtn');
  const termsModal = document.getElementById('puzzleTermsModal');
  const termsClose = document.getElementById('puzzleTermsClose');

  if (termsBtn && termsModal) {
    const openTerms = () => termsModal.classList.add('modal-visible');
    const closeTerms = () => termsModal.classList.remove('modal-visible');

    termsBtn.addEventListener('click', openTerms);
    termsClose.addEventListener('click', closeTerms);
    termsModal.addEventListener('click', (e) => {
      if (e.target === termsModal) closeTerms(); // click on the dark backdrop
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeTerms();
    });
  }

  /* ---- Help & Feedback form ----
     No backend yet, so this opens the user's email app pre-filled
     with their message, addressed to apnasheikhpura50@gmail.com.
     TODO: swap this for a real backend/form service once ready. */
  const feedbackForm = document.getElementById('feedbackForm');
  const formStatus = document.getElementById('formStatus');

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('fbName').value.trim();
      const contact = document.getElementById('fbContact').value.trim();
      const type = document.getElementById('fbType').value;
      const message = document.getElementById('fbMessage').value.trim();

      const subject = encodeURIComponent(`[${type}] from ${name} — Apna Sheikhpura website`);
      const body = encodeURIComponent(
        `Name: ${name}\nContact: ${contact}\nType: ${type}\n\nMessage:\n${message}`
      );

      // Gmail's web compose is far more reliable than mailto: — most people
      // don't have a desktop mail client configured, so mailto: silently
      // fails to open anything for them.
      const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=apnasheikhpura50@gmail.com&su=${subject}&body=${body}`;
      window.open(gmailComposeUrl, '_blank');

      formStatus.textContent = 'Opening Gmail in a new tab — just hit "Send" once it loads.';
      feedbackForm.reset();
    });
  }

});