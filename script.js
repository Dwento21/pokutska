

document.addEventListener('DOMContentLoaded', () => {

  
  const header    = document.getElementById('header');
  const scrollTop = document.getElementById('scrollTop');
  function setImageFallback(img) {
    if (!img || img.dataset.fallbackApplied === '1') return;
    img.dataset.fallbackApplied = '1';
    const label = (img.alt || 'Фото')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#f4efe8"/><rect x="30" y="30" width="1140" height="740" rx="24" fill="none" stroke="#d3c4b2" stroke-width="6"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#7f6349" font-family="Arial, sans-serif" font-size="42">${label}</text></svg>`;
    img.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    img.classList.add('img-fallback');
  }

  document.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => setImageFallback(img));
  });

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 80);
    scrollTop.classList.toggle('visible', y > 400);
  }, { passive: true });
  scrollTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  
  const burger  = document.getElementById('burger');
  const nav     = document.getElementById('nav');
  function closeNav() {
    nav.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
    document.body.classList.remove('nav-open');
    document.body.style.overflow = '';
  }
  burger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', isOpen);
    document.body.classList.toggle('nav-open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', closeNav);
  });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) closeNav();
  });
  let navTouchStartX = 0;
  nav.addEventListener('touchstart', (e) => { navTouchStartX = e.touches[0].clientX; }, { passive: true });
  nav.addEventListener('touchend', (e) => {
    if (e.changedTouches[0].clientX - navTouchStartX > 60) closeNav();
  });

  
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const headerH = header.offsetHeight;
      const y = target.getBoundingClientRect().top + window.scrollY - headerH - 8;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  function createMobileLoopScroller(trackSelector, cardSelector, cloneClass, align = 'start') {
    const track = document.querySelector(trackSelector);
    if (!track) return;

    const mobileQuery = window.matchMedia('(max-width: 768px)');
    let loopReady = false;
    let scrollFrame = null;
    let jumping = false;

    const getOriginalCards = () => Array.from(track.children)
      .filter((card) => card.matches(cardSelector) && !card.classList.contains(cloneClass));

    const getAllCards = () => Array.from(track.children)
      .filter((card) => card.matches(cardSelector));

    const getCardScrollLeft = (card) => (
      align === 'center'
        ? card.offsetLeft - ((track.clientWidth - card.offsetWidth) / 2)
        : card.offsetLeft - (parseFloat(window.getComputedStyle(track).paddingLeft || '0') || 0)
    );

    function createClone(card) {
      const clone = card.cloneNode(true);
      clone.classList.add(cloneClass);
      clone.classList.remove('reveal', 'visible');
      clone.tabIndex = -1;
      return clone;
    }

    function jumpTo(left) {
      jumping = true;
      const oldBehavior = track.style.scrollBehavior;
      const oldSnap = track.style.scrollSnapType;
      track.style.scrollBehavior = 'auto';
      track.style.scrollSnapType = 'none';
      track.scrollLeft = left;

      requestAnimationFrame(() => {
        track.style.scrollBehavior = oldBehavior;
        track.style.scrollSnapType = oldSnap;
        requestAnimationFrame(() => {
          jumping = false;
        });
      });
    }

    function removeClones() {
      track.querySelectorAll(`.${cloneClass}`).forEach((clone) => clone.remove());
    }

    function initLoop() {
      if (loopReady) return;
      const originalCards = getOriginalCards();
      if (originalCards.length < 2) return;

      originalCards.map(createClone).forEach((clone) => track.insertBefore(clone, track.firstChild));
      originalCards.map(createClone).forEach((clone) => track.appendChild(clone));
      loopReady = true;

      requestAnimationFrame(() => {
        const firstRealCard = getAllCards()[originalCards.length];
        if (firstRealCard) jumpTo(getCardScrollLeft(firstRealCard));
      });
    }

    function destroyLoop() {
      if (!loopReady) return;
      removeClones();
      loopReady = false;
      jumping = false;
      track.style.scrollBehavior = '';
      track.style.scrollSnapType = '';
      track.scrollLeft = 0;
    }

    function normalizePosition() {
      if (!loopReady || jumping) return;

      const originalCount = getOriginalCards().length;
      const allCards = getAllCards();
      const firstRealCard = allCards[originalCount];
      const lastRealCard = allCards[(originalCount * 2) - 1];
      const firstAfterClone = allCards[originalCount * 2];
      if (!firstRealCard || !lastRealCard || !firstAfterClone) return;

      const span = getCardScrollLeft(firstAfterClone) - getCardScrollLeft(firstRealCard);
      const threshold = firstRealCard.offsetWidth / 2;

      if (track.scrollLeft < getCardScrollLeft(firstRealCard) - threshold) {
        jumpTo(track.scrollLeft + span);
      } else if (track.scrollLeft > getCardScrollLeft(lastRealCard) + threshold) {
        jumpTo(track.scrollLeft - span);
      }
    }

    function syncLoop() {
      if (mobileQuery.matches) {
        initLoop();
      } else {
        destroyLoop();
      }
    }

    track.addEventListener('scroll', () => {
      if (!mobileQuery.matches) return;
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(normalizePosition);
    }, { passive: true });

    window.addEventListener('resize', () => {
      const shouldRecenter = loopReady && mobileQuery.matches;
      syncLoop();
      if (shouldRecenter) {
        requestAnimationFrame(() => {
          const firstRealCard = getAllCards()[getOriginalCards().length];
          if (firstRealCard) jumpTo(getCardScrollLeft(firstRealCard));
        });
      }
    }, { passive: true });

    syncLoop();
  }

  createMobileLoopScroller('.menu__grid', '.menu-card', 'menu-card--clone', 'center');
  createMobileLoopScroller('.products__grid', '.product-card', 'product-card--clone', 'center');

  const heroNewsText = document.getElementById('heroNewsText');
  
  const heroNewsImg = document.getElementById('heroNewsImg'); // Знаходимо елемент картинки

  async function loadHeroNews() {
    if (!heroNewsText) return;
    const endpoint = (heroNewsText.dataset.newsEndpoint || '').trim();
    if (!endpoint || window.location.protocol === 'file:') return;

    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json();
      
      // Відображаємо текст
      if (payload?.text) {
        heroNewsText.textContent = payload.text;
      }
      
      // Відображаємо фото новини
      if (payload?.image && heroNewsImg) {
        heroNewsImg.src = payload.image;
        heroNewsImg.style.display = 'block'; 
      }
    } catch (_) {
      // Залишається текст за замовчуванням
    }
  }
  
  loadHeroNews();

  
  const revealItems = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, 80);
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  revealItems.forEach(el => revealObserver.observe(el));

  
  const track = document.getElementById('reviewsTrack');
  const dotsWrap = document.getElementById('reviewsDots');
  const reviewsPrev = document.getElementById('reviewsPrev');
  const reviewsNext = document.getElementById('reviewsNext');

  let currentSlide = 0;
  let autoplayTimer;
  let startX = 0;

  function sanitizeText(value = '') {
    return String(value)
      .replace(/[<>]/g, '')
      .replace(/ /g, ' ')
      .replace(/[ -​  　]/g, ' ')
      .replace(/s+/g, ' ')
      .trim();
  }

  function normalizeReviewText(value = '') {
    return sanitizeText(value).replace(/(S{28})(?=S)/g, '$1​');
  }

  function getVisibleReviews() {
    if (window.innerWidth <= 768) return 1;
    if (window.innerWidth <= 1100) return 2;
    return 3;
  }

  function getMaxSlide() {
    if (!track) return 0;
    const cards = track.querySelectorAll('.review-card').length;
    return Math.max(0, cards - getVisibleReviews());
  }

  function setReviewCardWidths() {
    if (!track) return;
    const visible = getVisibleReviews();
    const gap = parseFloat(window.getComputedStyle(track).gap || '0') || 0;
    const width = (track.parentElement.getBoundingClientRect().width - gap * (visible - 1)) / visible;
    track.querySelectorAll('.review-card').forEach((card) => {
      card.style.flexBasis = `${width}px`;
    });
  }

  function buildReviewDots() {
    if (!dotsWrap || !track) return;
    const total = getMaxSlide() + 1;
    dotsWrap.innerHTML = Array.from({ length: total }, (_, i) => (
      `<button class="dot" type="button" data-index="${i}" aria-label="Показати відгуки ${i + 1}"></button>`
    )).join('');

    dotsWrap.querySelectorAll('.dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        goToReviewSlide(Number(dot.dataset.index));
        restartReviewAutoplay();
      });
    });
  }

  function updateReviewDots() {
    if (!dotsWrap) return;
    dotsWrap.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  function goToReviewSlide(index) {
    if (!track) return;
    const maxSlide = getMaxSlide();
    currentSlide = ((index % (maxSlide + 1)) + (maxSlide + 1)) % (maxSlide + 1);

    const firstCard = track.querySelector('.review-card');
    if (!firstCard) return;
    const gap = parseFloat(window.getComputedStyle(track).gap || '0') || 0;
    const offset = currentSlide * (firstCard.getBoundingClientRect().width + gap);
    track.style.transform = `translateX(-${offset}px)`;
    updateReviewDots();
  }

  function initReviewSlider() {
    if (!track) return;
    track.querySelectorAll('.review-card__text').forEach((el) => {
      el.textContent = normalizeReviewText(el.textContent || '');
    });
    setReviewCardWidths();
    buildReviewDots();
    currentSlide = Math.min(currentSlide, getMaxSlide());
    goToReviewSlide(currentSlide);
  }

  function startReviewAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(() => {
      goToReviewSlide(currentSlide + 1);
    }, 5200);
  }

  function restartReviewAutoplay() {
    startReviewAutoplay();
  }

  if (track) {
    reviewsPrev?.addEventListener('click', () => {
      goToReviewSlide(currentSlide - 1);
      restartReviewAutoplay();
    });
    reviewsNext?.addEventListener('click', () => {
      goToReviewSlide(currentSlide + 1);
      restartReviewAutoplay();
    });
    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });
    track.addEventListener('touchend', (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 45) {
        goToReviewSlide(diff > 0 ? currentSlide + 1 : currentSlide - 1);
        restartReviewAutoplay();
      }
    });
    window.addEventListener('resize', initReviewSlider, { passive: true });
    initReviewSlider();
    startReviewAutoplay();
  }

    const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput  = document.getElementById('name');
      const phoneInput = document.getElementById('phone');
      const nameError  = document.getElementById('nameError');
      const phoneError = document.getElementById('phoneError');

      let valid = true;
      nameInput.classList.remove('error');
      phoneInput.classList.remove('error');
      nameError.textContent  = '';
      phoneError.textContent = '';
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.classList.add('error');
        nameError.textContent = 'Будь ласка, вкажіть ваше ім\'я';
        valid = false;
      } else if (name.length < 2) {
        nameInput.classList.add('error');
        nameError.textContent = 'Ім\'я занадто коротке';
        valid = false;
      }
      const phone = phoneInput.value.trim().replace(/\s/g, '');
      const phoneRegex = /^(\+?38)?0\d{9}$/;
      if (!phone) {
        phoneInput.classList.add('error');
        phoneError.textContent = 'Будь ласка, вкажіть ваш телефон';
        valid = false;
      } else if (!phoneRegex.test(phone)) {
        phoneInput.classList.add('error');
        phoneError.textContent = 'Введіть коректний номер телефону (напр. +380501234567)';
        valid = false;
      }

      if (!valid) return;
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Надсилаємо...';

      const endpoint = (contactForm.dataset.endpoint || '').trim();
      const messageInput = document.getElementById('message');

      let isDemoMode = !endpoint;
      let sendFailed = false;

      if (endpoint) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({
              name,
              phone,
              message: (messageInput?.value || '').trim()
            })
          });
          if (!response.ok) sendFailed = true;
        } catch (_) {
          sendFailed = true;
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      submitBtn.disabled = false;
      submitBtn.textContent = 'Надіслати';
      formSuccess.hidden = false;

      if (sendFailed) {
        formSuccess.classList.add('is-error');
        formSuccess.textContent = 'Не вдалося надіслати форму. Спробуйте ще раз або перевірте data-endpoint.';
        return;
      }

      formSuccess.classList.remove('is-error');
      formSuccess.textContent = isDemoMode
        ? '✓ Дані прийнято в демо-режимі. Додайте data-endpoint у form для реальної відправки.'
        : '✓ Дякуємо! Ми зв’яжемося з вами найближчим часом.';

      contactForm.reset();
      setTimeout(() => { formSuccess.hidden = true; }, 6000);
    });
    ['name', 'phone'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        document.getElementById(id).classList.remove('error');
        document.getElementById(id + 'Error').textContent = '';
      });
    });
  }

});
