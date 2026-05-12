const CATEGORY_LABELS = {
  bread: 'Хліб',
  croissants: 'Калачі',
  buns: 'Булочки',
  sweets: 'Солодка випічка',
  pies: 'Фастфуд',
  seasonal: 'Великодні вироби'
};

document.getElementById('logoutButton')?.addEventListener('click', async () => {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } finally {
    window.location.href = '/login';
  }
});

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      window.location.href = '/login';
      throw new Error('Потрібен вхід в адмін-панель.');
    }
    const text = await response.text();
    throw new Error(text || 'Помилка запиту');
  }
  return response.json();
}

function renderAdminProducts(products) {
  const holder = document.getElementById('adminProducts');
  if (!products || !products.length) {
    holder.innerHTML = '<div class="empty-state">Товарів поки немає.</div>';
    return;
  }

 holder.innerHTML = products.slice(0, 20).map((product) => `
    <article class="admin-product" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border: 1px solid var(--cream-dark); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />
      <div style="flex-grow: 1;">
        <strong style="display: block;">${escapeHtml(product.name)}</strong>
        <span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(CATEGORY_LABELS[product.category] || product.category)}</span>
      </div>
      
      <button class="btn btn--sm btn--outline" onclick="prepareEdit('${product.id}')" style="margin-right: 5px;">
        Ред.
      </button>

      <button class="btn btn--sm" onclick="deleteProduct('${product.id}')" style="background: #e05555; color: white; border: none; cursor: pointer;">
        Видалити
      </button>
    </article>
  `).join('');
}

async function loadAdminData() {
  const newsText = document.getElementById('newsText');
  const adminNewsPreview = document.getElementById('adminNewsPreview');

  try {
    const [news, products] = await Promise.all([
      api('/api/settings/news'),
      api('/api/products')
    ]);
    
    if (newsText) newsText.value = news.text || news.value || '';
    
    if (news.image && adminNewsPreview) {
      adminNewsPreview.src = news.image;
      adminNewsPreview.style.display = 'block';
    } else if (adminNewsPreview) {
      adminNewsPreview.style.display = 'none';
    }

    renderAdminProducts(products);
  } catch (error) {
    console.error('Помилка завантаження:', error);
  }
}
window.prepareEdit = async (id) => {
  try {
    // Отримуємо актуальний список товарів
    const products = await api('/api/products');
    const item = products.find(p => p.id === id);
    
    if (item) {
      // Заповнюємо поля форми даними товару
      document.getElementById('productId').value = item.id; // Це те саме приховане поле
      document.getElementById('productName').value = item.name;
      document.getElementById('productCategory').value = item.category;
      document.getElementById('productDescription').value = item.description;
      
      // Скролимо сторінку вгору до форми, щоб почати редагування
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Змінюємо статус, щоб було зрозуміло, що ми в режимі редагування
      document.getElementById('productStatus').textContent = 'Редагуємо: ' + item.name;
    }
  } catch (e) {
    console.error('Не вдалося завантажити дані для редагування');
  }
};
// Глобальна функція видалення
window.deleteProduct = async (id) => {
  if (!confirm('Ви впевнені, що хочете видалити цей товар?')) return;

  try {
    await api(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    loadAdminData();
  } catch (error) {
    console.error('Помилка:', error);
    alert(error.message || 'Помилка звʼязку з сервером при видаленні');
  }
};
// Обробник для новин
// --- ОБРОБНИКИ ФОРМ ---

// Збереження новин
document.getElementById('newsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('newsStatus');
  status.textContent = 'Зберігаємо...';
  try {
    const formData = new FormData(event.currentTarget);
    await api('/api/settings/news', { method: 'POST', body: formData });
    status.textContent = 'Новину оновлено.';
    loadAdminData();
  } catch (error) {
    status.textContent = error.message || 'Помилка оновлення.';
  }
});

// Додавання/Редагування товару
document.getElementById('productForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById('productStatus');
  status.textContent = 'Зберігаємо...';
  try {
    const formData = new FormData(form);
    await api('/api/products', {
      method: 'POST',
      body: formData
    });
    form.reset();
    document.getElementById('productId').value = ''; // Очищаємо ID після збереження
    
    status.textContent = 'Успішно збережено.';
    loadAdminData();
  } catch (error) {
    status.textContent = error.message || 'Не вдалося зберегти.';
  }
});


loadAdminData();
