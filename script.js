

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

  
  const galleryItems = document.querySelectorAll('.gallery__item');
  const lightbox     = document.getElementById('lightbox');
  const lightboxImg  = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev  = document.getElementById('lightboxPrev');
  const lightboxNext  = document.getElementById('lightboxNext');

  let currentIndex = 0;
  const srcs = Array.from(galleryItems).map(el => el.dataset.src);

  function openLightbox(index) {
    currentIndex = index;
    lightboxImg.src = srcs[currentIndex];
    lightboxImg.alt = `Галерея ${currentIndex + 1}`;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { lightboxImg.src = ''; }, 300);
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + srcs.length) % srcs.length;
    lightboxImg.src = srcs[currentIndex];
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % srcs.length;
    lightboxImg.src = srcs[currentIndex];
  }

  galleryItems.forEach((item, i) => {
    item.addEventListener('click', () => openLightbox(i));
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', showPrev);
  lightboxNext.addEventListener('click', showNext);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft')  showPrev();
    if (e.key === 'ArrowRight') showNext();
  });

  
  const track = document.getElementById('reviewsTrack');
  const dots  = document.querySelectorAll('.dot');

  let currentSlide = 0;
  let autoplayTimer;
  let startX = 0;
  const totalSlides = dots.length;

  function goToSlide(index) {
    if (!track) return;
    currentSlide = (index + totalSlides) % totalSlides;
    const cards = track.querySelectorAll('.review-card');
    if (cards.length === 0) return;
    const isMob = window.innerWidth <= 768;
    const sliderW = track.parentElement.offsetWidth;
    let offset;

    if (isMob) {
      offset = currentSlide * sliderW;
    } else {
      const cardW = (sliderW - 28 * 2) / 3;
      offset = currentSlide * (cardW + 28);
    }

    track.style.transform = `translateX(-${offset}px)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
  }
  function initSlider() {
    if (!track) return;
    track.style.flexDirection = 'row';
    const cards = track.querySelectorAll('.review-card');
    const isMob = window.innerWidth <= 768;
    const sliderW = track.parentElement.offsetWidth;

    cards.forEach(card => {
      card.style.minWidth = isMob ? `${sliderW}px` : '';
      card.style.display = '';
    });
    goToSlide(currentSlide);
  }
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goToSlide(+dot.dataset.index);
      restartAutoplay();
    });
  });
  function startAutoplay() {
    autoplayTimer = setInterval(() => {
      goToSlide(currentSlide + 1);
    }, 4500);
  }
  function restartAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }
  if (track) {
    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });
    track.addEventListener('touchend', (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 45) {
        goToSlide(diff > 0 ? currentSlide + 1 : currentSlide - 1);
        restartAutoplay();
      }
    });
  }
  window.addEventListener('resize', initSlider, { passive: true });
  initSlider();
  startAutoplay();

  
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

