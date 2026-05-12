const CATEGORIES = {
  bread: {
    title: 'Хліб',
    description: 'Пшеничний, житній і на заквасці: усе, що пахне справжнім домом.'
  },
  croissants: {
    title: 'Калачі',
    description: 'Хрусткі зовні, ніжні всередині, класичні та з начинками.'
  },
  buns: {
    title: 'Булочки',
    description: 'М\'які здобні булочки для ранку, кави або полуденка.'
  },
  sweets: {
    title: 'Солодка випічка',
    description: 'Тістечка, штруделі та інші солодощі до родинного столу.'
  },
  pies: {
    title: 'Фастфуд',
    description: 'Закриті й відкриті пироги з традиційними начинками.'
  },
  seasonal: {
    title: 'Великодні вироби',
    description: 'Рецепти, натхненні природою Покуття та локальними смаками.'
  }
};

const FALLBACK_PRODUCTS = [
  {
    id: 'bread-sourdough',
    name: 'Хліб на заквасці',
    category: 'bread',
    description: 'Жива закваска, довге бродіння, щільна скоринка і м\'який ароматний м\'якуш.',
    image: 'imagines/sourdough.png'
  },
  {
    id: 'bread-baguette',
    name: 'Багет французький',
    category: 'bread',
    description: 'Хрусткий зовні, м\'який усередині, з ароматом свіжого борошна.',
    image: 'imagines/baguette.png'
  },
  {
    id: 'buns-cinnamon',
    name: 'Булочка з корицею',
    category: 'buns',
    description: 'Ніжне здобне тісто, справжня кориця і легка карамельна глазур.',
    image: 'imagines/cinnamon.png'
  },
  {
    id: 'buns-cheese-snail',
    name: 'Сирний равлик',
    category: 'buns',
    description: 'Листкове тісто з ніжним сиром і зеленню, добре смакує до кави.',
    image: 'imagines/cheese-snail.png'
  },
  {
    id: 'croissants-classic',
    name: 'Круасан класичний',
    category: 'croissants',
    description: 'Багатошарове тісто, вершкове масло і золотиста скоринка.',
    image: 'imagines/croissan-clasic.png'
  },
  {
    id: 'croissants-chocolate',
    name: 'Круасан шоколадний',
    category: 'croissants',
    description: 'Класичний круасан із шоколадною начинкою та хрусткою скоринкою.',
    image: 'imagines/croissan-choco.png'
  }
];

const params = new URLSearchParams(window.location.search);
const categorySlug = params.get('category') || 'bread';
const category = CATEGORIES[categorySlug] || CATEGORIES.bread;

document.title = `${category.title} | ПОКУТСЬКА ПЕКАРНЯ`;
document.getElementById('categoryTitle').textContent = category.title;
document.getElementById('categoryDescription').textContent = category.description;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderProducts(products) {
  const holder = document.getElementById('categoryProducts');
  const list = products.filter((product) => product.category === categorySlug);

  if (list.length === 0) {
    holder.innerHTML = '<div class="empty-state">У цій категорії поки немає товарів. Додайте їх через адмін-панель.</div>';
    return;
  }


  holder.innerHTML = list.map((product) => `
    <article class="category-product">
      <img class="category-product__img" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" onclick="openLightbox('${escapeHtml(product.image)}')" />
      <div class="category-product__body">
        <span class="category-product__category">${escapeHtml(category.title)}</span>
        <h2 class="category-product__title">${escapeHtml(product.name)}</h2>
        <p class="category-product__desc">${escapeHtml(product.description)}</p>
      </div>
    </article>
  `).join('');
}

async function loadProducts() {
  if (window.location.protocol === 'file:') {
    renderProducts(FALLBACK_PRODUCTS);
    return;
  }

  try {
    const response = await fetch(`/api/products?category=${encodeURIComponent(categorySlug)}`);
    if (!response.ok) throw new Error('Products request failed');
    const products = await response.json();
    renderProducts(products);
  } catch (_) {
    renderProducts(FALLBACK_PRODUCTS);
  }
}
// Функції для повноекранного фото
window.openLightbox = function(src) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  if (lightbox && lightboxImg) {
    lightboxImg.src = src;
    lightbox.classList.add('show');
    document.body.style.overflow = 'hidden';
  } else {
    console.error('Не знайдено HTML-блок для Lightbox!');
  }
};

window.closeLightbox = function() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('show');
    document.body.style.overflow = 'auto';
  }
};
loadProducts();
// Підсвічування активної кнопки категорії
document.addEventListener('DOMContentLoaded', () => {
  const activeLink = document.querySelector(`.category-nav__link[data-category="${categorySlug}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
    
    // Автоматично прокручуємо панель до активної кнопки на мобільних телефонах
    activeLink.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
});
