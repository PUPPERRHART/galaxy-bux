(() => {
  'use strict';
  const KEY = 'galaxy-bux-cart-v1';
  const catalog = window.GALAXY_CATALOGO;
  const games = catalog.categories,
    categories = catalog.subcategories,
    products = catalog.products.filter(
      (product) =>
        !window.GALAXY_CATALOG_POLICY || window.GALAXY_CATALOG_POLICY.isVisible(product),
    );
  const byId = new Map(products.map((p) => [p.id, p]));
  const FAV_KEY = 'galaxy-bux-favorites-v2';
  let favorites = new Set();
  try {
    const stored = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    if (Array.isArray(stored)) favorites = new Set(stored.filter((id) => byId.has(id)));
  } catch (_) {}
  const saveFavorites = () => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
    } catch (_) {}
  };
  let cart = {};
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      for (const [id, qty] of Object.entries(saved)) {
        if (byId.has(id) && Number.isSafeInteger(qty) && qty > 0)
          cart[id] = Math.min(qty, byId.get(id).stock || 0);
      }
    }
  } catch (_) {
    cart = {};
  }
  const $ = (id) => document.getElementById(id);
  const money = (value) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const overlay = $('cart-overlay'),
    panel = $('cart-panel'),
    openButton = $('open-cart');
  let lastFocus = null,
    toastTimer;
  const recentAdds = new Map();
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch (_) {}
  }
  function toast(message) {
    const el = $('site-toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }
  const reducedCartMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function render() {
    const container = $('cart-items'),
      existing = new Map(
        [...container.querySelectorAll('.cart-item')].map((row) => [row.dataset.id, row]),
      );
    let total = 0,
      count = 0;
    const ordered = [];
    for (const [id, rawQty] of Object.entries(cart)) {
      const product = byId.get(id),
        stock = Math.max(0, Math.floor(Number(product?.stock) || 0));
      if (!product || !stock) {
        delete cart[id];
        continue;
      }
      const qty = Math.min(stock, Math.max(0, Math.floor(Number(rawQty) || 0)));
      if (!qty) {
        delete cart[id];
        continue;
      }
      cart[id] = qty;
      count += qty;
      total += Number(product.price) * qty;
      let row = existing.get(id);
      if (!row) {
        row = document.createElement('article');
        row.className = 'cart-item gb23-row';
        row.dataset.id = id;
        const img = document.createElement('img');
        img.src = product.image || 'assets/personagem.png';
        img.alt = 'Imagem de ' + product.name;
        img.loading = 'lazy';
        const details = document.createElement('div');
        details.className = 'gb23-details';
        const title = document.createElement('h3');
        title.textContent = product.name;
        const unit = document.createElement('small');
        unit.className = 'gb23-unit';
        const price = document.createElement('strong');
        price.className = 'gb23-subtotal';
        const controls = document.createElement('div');
        controls.className = 'cart-qty';
        const minus = document.createElement('button');
        minus.type = 'button';
        minus.dataset.action = 'minus';
        minus.setAttribute('aria-label', 'Diminuir quantidade de ' + product.name);
        minus.textContent = '−';
        const amount = document.createElement('output');
        amount.setAttribute('aria-label', 'Quantidade');
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.dataset.action = 'plus';
        plus.setAttribute('aria-label', 'Aumentar quantidade de ' + product.name);
        plus.textContent = '+';
        controls.append(minus, amount, plus);
        details.append(title, unit, price, controls);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cart-remove';
        remove.dataset.action = 'remove';
        remove.setAttribute('aria-label', 'Remover ' + product.name);
        remove.textContent = 'Remover';
        row.append(img, details, remove);
        if (!reducedCartMotion()) row.classList.add('gb23-new');
      }
      row.querySelector('.gb23-unit').textContent =
        'Unidade: ' + money(Number(product.price) || 0);
      row.querySelector('.gb23-subtotal').textContent =
        'Subtotal: ' + money((Number(product.price) || 0) * qty);
      row.querySelector('output').textContent = String(qty);
      row.querySelector('[data-action="minus"]').disabled = qty <= 1;
      row.querySelector('[data-action="plus"]').disabled = qty >= stock;
      row.querySelector('[data-action="plus"]').title =
        qty >= stock ? 'Limite do estoque exibido' : 'Aumentar quantidade';
      ordered.push(row);
      existing.delete(id);
    }
    for (const row of existing.values()) row.remove();
    for (const row of ordered) container.append(row);
    if (!count) {
      let empty = container.querySelector('.gb23-empty');
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'gb23-empty';
        const symbol = document.createElement('span');
        symbol.className = 'gb23-empty-icon';
        symbol.textContent = '✦';
        const heading = document.createElement('h3');
        heading.textContent = 'Sua galáxia de compras está vazia';
        const message = document.createElement('p');
        message.textContent = 'Explore os jogos e escolha seus próximos itens.';
        const browse = document.createElement('button');
        browse.type = 'button';
        browse.textContent = 'Explorar catálogo ↗';
        browse.addEventListener('click', () => {
          closeCart();
          location.hash = '#jogos';
        });
        empty.append(symbol, heading, message, browse);
        container.append(empty);
      }
    } else container.querySelector('.gb23-empty')?.remove();
    $('cart-count').textContent = String(count);
    $('cart-total').textContent = money(total);
    $('gb23-item-count').textContent = count + ' ' + (count === 1 ? 'item' : 'itens');
    $('clear-cart').disabled = count === 0;
    save();
    window.dispatchEvent(
      new CustomEvent('galaxy:cart-updated', {
        detail: {
          items: Object.entries(cart)
            .filter(([, qty]) => qty > 0)
            .map(([productId, qty]) => ({ productId, qty })),
        },
      }),
    );
  }
  function change(id, delta) {
    const product = byId.get(id);
    if (!product) return;
    const stock = Math.max(0, Math.floor(Number(product.stock) || 0)),
      current = cart[id] || 0,
      next = Math.min(stock, Math.max(0, current + delta));
    if (next === current) return;
    if (!next) delete cart[id];
    else cart[id] = next;
    render();
    const cartButton = $('open-cart');
    cartButton.classList.remove('cart-pulse');
    if (!reducedCartMotion()) {
      void cartButton.offsetWidth;
      cartButton.classList.add('cart-pulse');
    }
  }
  function openCart() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    openButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('cart-open');
    $('close-cart').focus();
  }
  function closeCart() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    overlay.hidden = true;
    openButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('cart-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }
  openButton.addEventListener('click', openCart);
  $('close-cart').addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = [...panel.querySelectorAll('button:not(:disabled)')];
    if (!focusable.length) return;
    if (e.shiftKey && document.activeElement === focusable[0]) {
      e.preventDefault();
      focusable.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === focusable.at(-1)) {
      e.preventDefault();
      focusable[0].focus();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) closeCart();
  });
  $('cart-items').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('.cart-item').dataset.id;
    if (btn.dataset.action === 'remove') {
      delete cart[id];
      render();
    }
    if (btn.dataset.action === 'plus') change(id, 1);
    if (btn.dataset.action === 'minus') {
      if ((cart[id] || 0) <= 1) {
        delete cart[id];
        render();
      } else change(id, -1);
    }
  });
  $('clear-cart').addEventListener('click', () => {
    cart = {};
    render();
    toast('Carrinho esvaziado.');
  });
  window.addEventListener('galaxy:checkout-confirmed', (event) => {
    if (Array.isArray(event.detail?.items)) {
      for (const item of event.detail.items) {
        const next = Math.max(0, (cart[item.productId] || 0) - item.qty);
        if (next) cart[item.productId] = next;
        else delete cart[item.productId];
      }
    } else cart = {};
    render();
    toast('Pedido recebido! Acompanhe em Minha conta.');
  });
  // Produtos ficam exclusivamente dentro do jogo e da classe cadastrada no banco.
  const localImages = {
    'Blox Fruits': 'assets/bf.png',
    'Anime Expeditions': 'assets/ae.png',
    'King Legacy': 'assets/kl.png',
  };
  const gameImage = (g) => localImages[g.name] || g.image || 'assets/oj.png';
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const gameHash = (g) => '#pagina-jogo/' + encodeURIComponent(g.id);
  const makeGame = (g) => {
    const a = document.createElement('a');
    a.className = 'game-card';
    a.href = gameHash(g);
    a.innerHTML = `<img src="${esc(gameImage(g))}" alt="${esc(g.name)}" loading="lazy"><div class="game-info"><strong>${esc(g.name.toLocaleUpperCase('pt-BR'))}</strong><span>→</span></div>`;
    return a;
  };
  const homeGrid = $('home-games-grid'),
    allGrid = $('all-games-grid');
  games.forEach((g, i) => {
    allGrid.append(makeGame(g));
    if (i < 5) homeGrid.append(makeGame(g));
  });
  const other = document.createElement('a');
  other.className = 'game-card';
  other.href = '#todos-jogos';
  other.innerHTML =
    '<img src="assets/oj.png" alt="Outros jogos" loading="lazy"><div class="game-info"><strong>OUTROS JOGOS</strong><span>→</span></div>';
  homeGrid.append(other);
  let selectedGame = null,
    selectedCategory = 'all',
    shown = 12,
    displayedRoute = null,
    changing = false,
    queued = false;
  const gameFilters = new Map();
  let pendingProduct = null;
  const gameSearch = $('game-search'),
    gameSort = $('game-sort');
  function filtered() {
    let list = products.filter(
      (p) =>
        p.categoryId === selectedGame?.id &&
        (selectedCategory === 'all' || p.subcategoryId === selectedCategory),
    );
    const q = gameSearch.value.trim().toLocaleLowerCase('pt-BR');
    if (q)
      list = list.filter((p) =>
        (p.name + ' ' + (p.description || '')).toLocaleLowerCase('pt-BR').includes(q),
      );
    if (gameSort.value === 'low') list.sort((a, b) => a.price - b.price);
    if (gameSort.value === 'high') list.sort((a, b) => b.price - a.price);
    if (gameSort.value === 'name')
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (gameSort.value === 'available')
      list.sort((a, b) => (Number(b.stock) > 0) - (Number(a.stock) > 0));
    if ($('favorites-only').checked) list = list.filter((p) => favorites.has(p.id));
    return list;
  }
  const fruitArt = {
    'Rocket': 'assets/frutas-blox-fruits/rocket.png',
    'Spin': 'assets/frutas-blox-fruits/spin.png',
    'Blade': 'assets/frutas-blox-fruits/corte.png',
    'Spring': 'assets/frutas-blox-fruits/spring.png',
    'Bomb': 'assets/frutas-blox-fruits/bomb.png',
    'Smoke': 'assets/frutas-blox-fruits/smoke.png',
    'Spike': 'assets/frutas-blox-fruits/spike.png',
    'Flame': 'assets/frutas-blox-fruits/flame.png',
    'Ice': 'assets/frutas-blox-fruits/ice.png',
    'Areia': 'assets/frutas-blox-fruits/sand.png',
    'Dark': 'assets/frutas-blox-fruits/dark.png',
    'Eagle': 'assets/frutas-blox-fruits/falcon.png',
    'Diamante': 'assets/frutas-blox-fruits/diamond.png',
    'Luz': 'assets/frutas-blox-fruits/light.png',
    'Rubber': 'assets/frutas-blox-fruits/rubber.png',
    'Ghost': 'assets/frutas-blox-fruits/ghost.png',
    'Magma': 'assets/frutas-blox-fruits/magma.png',
    'Quake': 'assets/frutas-blox-fruits/quake.png',
    'Buddha': 'assets/frutas-blox-fruits/budda.png',
    'Love': 'assets/frutas-blox-fruits/love.png',
    'Creation': 'assets/frutas-blox-fruits/creation.png',
    'Sound': 'assets/frutas-blox-fruits/sound.png',
    'Phoenix': 'assets/frutas-blox-fruits/phoenix.png',
    'Portal': 'assets/frutas-blox-fruits/portal.png',
    'Lightning': 'assets/frutas-blox-fruits/relampago.png',
    'Pain': 'assets/frutas-blox-fruits/pain.png',
    'Nevasca': 'assets/frutas-blox-fruits/nevasca.png',
    'Gravity': 'assets/frutas-blox-fruits/gravity.png',
    'Mamute': 'assets/frutas-blox-fruits/mamute.png',
    'T-Rex': 'assets/frutas-blox-fruits/t-rex.png',
    'Massa': 'assets/frutas-blox-fruits/massa.png',
    'Shadow': 'assets/frutas-blox-fruits/shadow.png',
    'Venom': 'assets/frutas-blox-fruits/venom.png',
    'Gas': 'assets/frutas-blox-fruits/gas.png',
    'Spirit': 'assets/frutas-blox-fruits/spirit.png',
    'Tiger': 'assets/frutas-blox-fruits/tiger.png',
    'Yeti': 'assets/frutas-blox-fruits/yeti.png',
    'Kitsune': 'assets/frutas-blox-fruits/kitsune.png',
    'Control': 'assets/frutas-blox-fruits/control.png',
    'Dragon': 'assets/frutas-blox-fruits/dragon.png',
    'Spider': 'assets/frutas-blox-fruits/spider.png',
  };
  function renderProducts() {
    const list = filtered(),
      grid = $('game-products');
    const clear = $('gb21-clear-filters');
    clear.hidden =
      selectedCategory === 'all' &&
      !gameSearch.value.trim() &&
      gameSort.value === 'default' &&
      !$('favorites-only').checked;
    grid.replaceChildren();
    list.slice(0, shown).forEach((p) => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.dataset.productId = p.id;
      const sub = categories.find((s) => s.id === p.subcategoryId);
      const available = Number(p.stock) > 0;
      const isPerm =
        p.categoryId === games.find((g) => g.name === 'Blox Fruits')?.id &&
        /perm/i.test(sub?.name || '');
      const fruitKey = p.name.replace(/\s+Fruit\s+Perm.*$/i, '').trim();
      const art = isPerm ? fruitArt[fruitKey] : null;
      const missingFruitArt = isPerm && !art;
      card.classList.toggle('permanent-fruit', isPerm);
      card.classList.toggle('fruit-art-unavailable', missingFruitArt);
      card.innerHTML = `<div class="product-image"><button type="button" class="favorite-button ${favorites.has(p.id) ? 'is-favorite' : ''}" aria-label="${favorites.has(p.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" aria-pressed="${favorites.has(p.id)}">${favorites.has(p.id) ? '♥' : '♡'}</button>${missingFruitArt ? `<span class="fruit-no-art">${esc(fruitKey)}<small>Arte original pendente</small></span>` : `<img src="${esc(art || p.image || gameImage(selectedGame))}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.style.display='none';this.parentElement.classList.add('fruit-art-unavailable')">`}<span class="badge purple">${esc(sub?.name || 'Itens')}</span></div><div class="product-info"><h3>${esc(p.name)}</h3><small>${esc(sub?.name || 'Outros')} · ${available ? 'Estoque: ' + esc(p.stock) : 'Esgotado'}</small><strong>${money(Number(p.price) || 0)}</strong><button type="button" class="details-button">VER DETALHES ↗</button><button type="button" class="add-to-cart" ${available ? '' : 'disabled'}>${available ? '🛒 COMPRAR' : 'INDISPONÍVEL'}</button></div>`;
      card.querySelector('.favorite-button').addEventListener('click', () => {
        if (favorites.has(p.id)) favorites.delete(p.id);
        else favorites.add(p.id);
        saveFavorites();
        const marked = favorites.has(p.id);
        const heart = card.querySelector('.favorite-button');
        heart.classList.toggle('is-favorite', marked);
        heart.setAttribute('aria-pressed', String(marked));
        heart.setAttribute(
          'aria-label',
          marked ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
        );
        heart.textContent = marked ? '♥' : '♡';
        heart.classList.remove('gb20-heart-feedback');
        void heart.offsetWidth;
        heart.classList.add('gb20-heart-feedback');
        heart.addEventListener(
          'animationend',
          () => heart.classList.remove('gb20-heart-feedback'),
          { once: true },
        );
        window.dispatchEvent(
          new CustomEvent('galaxy:favorites-updated', {
            detail: { ids: [...favorites] },
          }),
        );
        if ($('favorites-only').checked && !marked) {
          card.remove();
          const remaining = filtered();
          $('game-empty').hidden = remaining.length > 0;
          $('load-more').hidden = shown >= remaining.length;
          $('game-view-subtitle').textContent =
            remaining.length + ' produto(s) nesta seleção';
          $('catalog-count').textContent = remaining.length + ' resultados';
        }
        toast(marked ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
      });
      card
        .querySelector('.details-button')
        .addEventListener('click', () =>
          showDetails(p, art || p.image || gameImage(selectedGame), sub?.name || 'Itens'),
        );
      card.querySelector('.add-to-cart').addEventListener('click', () => {
        if ((cart[p.id] || 0) >= Number(p.stock)) {
          toast('Estoque disponível atingido.');
          return;
        }
        const now = Date.now();
        if (now - (recentAdds.get(p.id) || 0) < 650) return;
        recentAdds.set(p.id, now);
        change(p.id, 1);
        const addButton = card.querySelector('.add-to-cart');
        addButton.classList.add('gb20-added');
        addButton.textContent = '✓ ADICIONADO';
        setTimeout(() => {
          if (addButton.isConnected) {
            addButton.classList.remove('gb20-added');
            addButton.textContent = '🛒 COMPRAR';
          }
        }, 900);
        toast(p.name + ' adicionado ao carrinho!');
        openCart();
      });
      grid.append(card);
    });
    $('game-empty').hidden = list.length > 0;
    $('game-empty').textContent = gameSearch.value.trim()
      ? 'Nenhum produto encontrado para “' +
        gameSearch.value.trim() +
        '”. Tente outro nome ou limpe a busca.'
      : $('favorites-only').checked
        ? 'Nenhum favorito encontrado nesta seleção. Marque produtos com ♡ ou desative o filtro de favoritos.'
        : 'Nenhum produto encontrado nesta categoria. Experimente outra classe.';
    $('load-more').hidden = shown >= list.length;
    $('game-view-subtitle').textContent = list.length + ' produto(s) nesta seleção';
    $('catalog-count').textContent = list.length + ' resultados';
    requestAnimationFrame(() => {
      prepareReveals(grid);
      updateScrollUI();
      if (pendingProduct) {
        const card = [...grid.children].find(
          (c) => c.dataset.productId === pendingProduct,
        );
        if (card) {
          pendingProduct = null;
          card.classList.add('gb21-highlight');
          card.scrollIntoView({
            behavior: pageReducedMotion ? 'instant' : 'smooth',
            block: 'center',
          });
          setTimeout(() => card.classList.remove('gb21-highlight'), 1800);
        }
      }
    });
  }
  function renderCategories() {
    const holder = $('game-categories');
    holder.replaceChildren();
    const subs = categories.filter((s) => s.categoryId === selectedGame.id);
    const options = [{ id: 'all', name: 'Todas as classes' }, ...subs];
    options.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'category-tab' + (selectedCategory === s.id ? ' selected' : '');
      b.textContent =
        s.name +
        ' (' +
        products.filter(
          (p) =>
            p.categoryId === selectedGame.id &&
            (s.id === 'all' || p.subcategoryId === s.id),
        ).length +
        ')';
      b.addEventListener('click', () => {
        selectedCategory = s.id;
        shown = 12;
        renderCategories();
        renderProducts();
      });
      holder.append(b);
    });
  }
  function showView(kind, game) {
    const internal = kind !== 'home';
    document.body.classList.toggle('game-page-active', internal);
    $('todos-jogos').hidden = kind !== 'all';
    $('pagina-jogo').hidden = kind !== 'game';
    if (kind === 'game' && game) {
      if (selectedGame && selectedGame.id !== game.id)
        gameFilters.set(selectedGame.id, {
          category: selectedCategory,
          shown,
          search: gameSearch.value,
          sort: gameSort.value,
          favs: $('favorites-only').checked,
        });
      selectedGame = game;
      const saved = gameFilters.get(game.id);
      selectedCategory = saved?.category || 'all';
      shown = saved?.shown || 12;
      gameSearch.value = saved?.search || '';
      gameSort.value = saved?.sort || 'default';
      $('favorites-only').checked = !!saved?.favs;
      $('game-view-title').textContent = game.name.toLocaleUpperCase('pt-BR');
      renderCategories();
      renderProducts();
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => {
      prepareReveals();
      updateScrollUI();
    });
  }
  function getRoute() {
    let hash = '';
    try {
      hash = decodeURIComponent(location.hash);
    } catch {}
    if (hash === '#todos-jogos') return { key: 'all', kind: 'all' };
    if (hash.startsWith('#pagina-jogo/')) {
      const game = games.find((g) => g.id === hash.slice(13));
      if (game) return { key: game.id, kind: 'game', game };
    }
    return {
      key: 'home',
      kind: 'home',
      scrollGames: hash === '#jogos' || hash === '#catalogo',
    };
  }
  const pageReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function route() {
    if (changing) {
      queued = true;
      return;
    }
    const next = getRoute();
    if (next.key === displayedRoute) {
      if (next.scrollGames)
        $('jogos').scrollIntoView({ behavior: pageReducedMotion ? 'instant' : 'smooth' });
      return;
    }
    if (displayedRoute === null || pageReducedMotion) {
      showView(next.kind, next.game);
      displayedRoute = next.key;
      if (next.scrollGames) $('jogos').scrollIntoView({ behavior: 'instant' });
      return;
    }
    changing = true;
    document.body.classList.add('page-transitioning', 'page-leaving');
    await new Promise((r) => setTimeout(r, 230));
    document.body.classList.remove('page-leaving');
    const current = getRoute();
    showView(current.kind, current.game);
    displayedRoute = current.key;
    document.body.classList.add('page-entering');
    await new Promise((r) => setTimeout(r, 430));
    document.body.classList.remove('page-transitioning', 'page-entering');
    changing = false;
    if (queued || getRoute().key !== displayedRoute) {
      queued = false;
      route();
    }
  }
  window.addEventListener('hashchange', route);
  route();
  $('load-more').addEventListener('click', () => {
    shown += 12;
    renderProducts();
  });
  $('favorites-only').addEventListener('change', () => {
    shown = 12;
    renderProducts();
  });
  gameSearch.addEventListener('input', () => {
    shown = 12;
    renderProducts();
  });
  gameSort.addEventListener('change', () => {
    shown = 12;
    renderProducts();
  });
  const globalSearch = $('product-search'),
    suggestions = $('gb21-suggestions');
  globalSearch.setAttribute('autocomplete', 'off');
  globalSearch.setAttribute('aria-controls', 'gb21-suggestions');
  globalSearch.setAttribute('aria-expanded', 'false');
  const normalize = (v) =>
    String(v || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  const hideSuggestions = () => {
    suggestions.hidden = true;
    globalSearch.setAttribute('aria-expanded', 'false');
  };
  const navigateSuggestion = (game, product) => {
    hideSuggestions();
    globalSearch.value = '';
    if (product) {
      gameFilters.set(game.id, {
        category: 'all',
        shown: Math.max(
          12,
          products
            .filter((p) => p.categoryId === game.id)
            .findIndex((p) => p.id === product.id) + 1,
        ),
        search: product.name,
        sort: 'default',
        favs: false,
      });
      pendingProduct = product.id;
    }
    location.hash = gameHash(game);
    if (displayedRoute === game.id && !changing) {
      showView('game', game);
    }
  };
  function showSuggestions() {
    const q = normalize(globalSearch.value.trim());
    suggestions.replaceChildren();
    if (!q) {
      hideSuggestions();
      return;
    }
    const matches = products
      .filter((p) => normalize(p.name).includes(q))
      .sort(
        (a, b) =>
          Number(normalize(b.name).startsWith(q)) -
          Number(normalize(a.name).startsWith(q)),
      )
      .slice(0, 7);
    const matchedGames = games.filter((g) => normalize(g.name).includes(q)).slice(0, 3);
    for (const product of matches) {
      const game = games.find((g) => g.id === product.categoryId);
      if (!game) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gb21-suggestion';
      b.setAttribute('role', 'option');
      const name = document.createElement('span');
      name.textContent = product.name;
      const meta = document.createElement('small');
      meta.textContent = game.name + ' · ' + money(Number(product.price) || 0);
      b.append(name, meta);
      b.addEventListener('click', () => navigateSuggestion(game, product));
      suggestions.append(b);
    }
    for (const game of matchedGames) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gb21-suggestion';
      b.setAttribute('role', 'option');
      b.textContent = '🎮 ' + game.name;
      b.addEventListener('click', () => navigateSuggestion(game, null));
      suggestions.append(b);
    }
    if (suggestions.querySelector('button')) {
      const hint = document.createElement('p');
      hint.className = 'gb21-hint';
      hint.textContent =
        'Selecione um resultado para abrir. Enter não escolhe automaticamente.';
      suggestions.append(hint);
    }
    if (!suggestions.querySelector('button')) {
      const empty = document.createElement('p');
      empty.textContent = 'Nenhum jogo ou produto encontrado.';
      suggestions.append(empty);
    }
    suggestions.hidden = false;
    globalSearch.setAttribute('aria-expanded', 'true');
  }
  globalSearch.addEventListener('input', showSuggestions);
  globalSearch.addEventListener('focus', () => {
    if (globalSearch.value.trim()) showSuggestions();
  });
  globalSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideSuggestions();
      return;
    }
    if (e.key === 'ArrowDown' && !suggestions.hidden) {
      e.preventDefault();
      suggestions.querySelector('button')?.focus();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.hidden) showSuggestions();
      else if (!globalSearch.value.trim())
        hideSuggestions(); /* Não seleciona automaticamente um resultado. */
    }
  });
  suggestions.addEventListener('keydown', (e) => {
    const buttons = [...suggestions.querySelectorAll('button')],
      i = buttons.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      hideSuggestions();
      globalSearch.focus();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      buttons[Math.min(i + 1, buttons.length - 1)]?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (i === 0) globalSearch.focus();
      else buttons[i - 1]?.focus();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!globalSearch.closest('.header-actions .search')?.contains(e.target))
      hideSuggestions();
  });
  $('gb21-clear-filters').addEventListener('click', () => {
    selectedCategory = 'all';
    shown = 12;
    gameSearch.value = '';
    gameSort.value = 'default';
    $('favorites-only').checked = false;
    renderCategories();
    renderProducts();
  });
  let detailProduct = null,
    detailQty = 1,
    detailClosing = false,
    detailCloseTimer = null;
  const detailDialog = $('product-dialog');
  function updateDetailFavorite() {
    if (!detailProduct) return;
    const active = favorites.has(detailProduct.id),
      b = $('detail-favorite');
    b.textContent = active ? '♥ Nos favoritos' : '♡ Favoritar';
    b.classList.toggle('is-favorite', active);
    b.setAttribute('aria-pressed', String(active));
  }
  function detailRemaining() {
    return detailProduct
      ? Math.max(
          0,
          Math.floor(Number(detailProduct.stock) || 0) - (cart[detailProduct.id] || 0),
        )
      : 0;
  }
  function updateDetailQty(syncInput = true) {
    if (!detailProduct) return;
    const available = Math.max(0, Math.floor(Number(detailProduct.stock) || 0)),
      remaining = detailRemaining(),
      input = $('detail-qty');
    detailQty = remaining
      ? Math.min(remaining, Math.max(1, Math.floor(Number(detailQty) || 1)))
      : 0;
    input.max = String(remaining);
    input.disabled = !remaining;
    if (syncInput) input.value = String(detailQty);
    $('detail-minus').disabled = !remaining || detailQty <= 1;
    $('detail-plus').disabled = !remaining || detailQty >= remaining;
    $('detail-buy').disabled = !remaining;
    $('detail-buy').textContent = remaining
      ? '🛒 ADICIONAR ' + detailQty + ' AO CARRINHO'
      : 'INDISPONÍVEL';
    $('detail-stock').textContent = remaining
      ? 'Disponíveis para adicionar: ' +
        remaining +
        ' · Estoque no catálogo: ' +
        available
      : 'Estoque indisponível ou quantidade já adicionada ao carrinho';
  }
  const detailInput = $('detail-qty');
  detailInput.addEventListener('input', () => {
    if (!detailProduct) return;
    const max = detailRemaining(),
      raw = detailInput.value;
    if (raw === '') {
      detailQty = 1;
      $('detail-buy').disabled = true;
      return;
    }
    const parsed = Number(raw);
    detailQty = Math.min(
      max,
      Math.max(1, Math.floor(Number.isFinite(parsed) ? parsed : 1)),
    );
    updateDetailQty(false);
    if (parsed > max || parsed < 1 || !Number.isInteger(parsed))
      detailInput.value = String(detailQty);
  });
  detailInput.addEventListener('change', () => updateDetailQty(true));
  detailInput.addEventListener('blur', () => updateDetailQty(true));
  function showDetails(p, img, category) {
    clearTimeout(detailCloseTimer);
    detailClosing = false;
    detailDialog.classList.remove('gb22-closing');
    detailProduct = p;
    detailQty = 1;
    $('detail-image').src = img;
    $('detail-image').alt = p.name;
    $('detail-title').textContent = p.name;
    $('detail-game').textContent =
      games.find((g) => g.id === p.categoryId)?.name || 'Galaxy Bux';
    $('detail-category').textContent = category;
    $('detail-description').textContent =
      p.description || 'Confira este item no catálogo Galaxy Bux.';
    $('detail-price').textContent = money(Number(p.price) || 0);
    updateDetailFavorite();
    updateDetailQty();
    if (!detailDialog.open) detailDialog.showModal();
  }
  function closeDetails() {
    if (!detailDialog.open || detailClosing) return;
    detailClosing = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      detailDialog.close();
      return;
    }
    detailDialog.classList.add('gb22-closing');
    detailCloseTimer = setTimeout(() => {
      if (detailDialog.open) detailDialog.close();
    }, 190);
  }
  $('detail-close').addEventListener('click', closeDetails);
  detailDialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeDetails();
  });
  detailDialog.addEventListener('click', (e) => {
    if (e.target === detailDialog) closeDetails();
  });
  detailDialog.addEventListener('close', () => {
    clearTimeout(detailCloseTimer);
    detailClosing = false;
    detailDialog.classList.remove('gb22-closing');
  });
  $('detail-minus').addEventListener('click', () => {
    detailQty--;
    updateDetailQty();
  });
  $('detail-plus').addEventListener('click', () => {
    detailQty++;
    updateDetailQty();
  });
  $('detail-favorite').addEventListener('click', () => {
    if (!detailProduct) return;
    const id = detailProduct.id;
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    saveFavorites();
    const marked = favorites.has(id);
    const heart = [...document.querySelectorAll('.product-card')]
      .find((c) => c.dataset.productId === id)
      ?.querySelector('.favorite-button');
    if (heart) {
      heart.classList.toggle('is-favorite', marked);
      heart.textContent = marked ? '♥' : '♡';
      heart.setAttribute('aria-pressed', String(marked));
      heart.setAttribute(
        'aria-label',
        marked ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
      );
    }
    updateDetailFavorite();
    window.dispatchEvent(
      new CustomEvent('galaxy:favorites-updated', { detail: { ids: [...favorites] } }),
    );
    toast(marked ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
  });
  $('detail-buy').addEventListener('click', () => {
    if (!detailProduct || detailClosing) return;
    const remaining = Math.max(
      0,
      (Number(detailProduct.stock) || 0) - (cart[detailProduct.id] || 0),
    );
    if (!remaining) {
      toast('Estoque disponível atingido.');
      updateDetailQty();
      return;
    }
    updateDetailQty(true);
    const qty = Math.min(detailQty, remaining);
    if (qty < 1) return;
    $('detail-buy').disabled = true;
    cart[detailProduct.id] = (cart[detailProduct.id] || 0) + qty;
    render();
    const cartButton = $('open-cart');
    cartButton.classList.remove('cart-pulse');
    void cartButton.offsetWidth;
    cartButton.classList.add('cart-pulse');
    $('detail-buy').textContent = '✓ ADICIONADO';
    toast(qty + ' × ' + detailProduct.name + ' adicionado ao carrinho!');
    closeDetails();
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 205;
    setTimeout(() => openCart(), delay);
  });
  window.addEventListener('galaxy:favorites-updated', (e) => {
    if (e.detail?.source !== 'account' || !Array.isArray(e.detail.ids)) return;
    favorites = new Set(e.detail.ids.filter((id) => byId.has(id)));
    saveFavorites();
    document.querySelectorAll('.product-card[data-product-id]').forEach((card) => {
      const marked = favorites.has(card.dataset.productId),
        heart = card.querySelector('.favorite-button');
      if (!heart) return;
      heart.classList.toggle('is-favorite', marked);
      heart.textContent = marked ? '♥' : '♡';
      heart.setAttribute('aria-pressed', String(marked));
      heart.setAttribute(
        'aria-label',
        marked ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
      );
    });
    updateDetailFavorite();
    if ($('favorites-only').checked && selectedGame) renderProducts();
  });
  $('mobile-cart').addEventListener('click', openCart);
  $('mobile-search').addEventListener('click', () => {
    if (
      selectedGame &&
      document.body.classList.contains('game-page-active') &&
      !$('pagina-jogo').hidden
    ) {
      gameSearch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      gameSearch.focus();
    } else {
      $('product-search').focus();
      $('product-search').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  // A abertura de Minha Conta é controlada exclusivamente por integracao.js.
  // Revelação suave apenas quando os elementos entram na tela.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealSelector =
    '.section-heading, .game-card, .product-card, .promo, .benefits article, .reviews';
  let revealObserver;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px 40px 0px' },
    );
  }
  function prepareReveals(root = document) {
    if (!revealObserver) return;
    root.querySelectorAll(revealSelector).forEach((el) => {
      if (el.dataset.revealInitialized) return;
      el.dataset.revealInitialized = '1';
      el.classList.add('reveal-ready');
      revealObserver.observe(el);
    });
  }
  prepareReveals();
  const topButton = $('back-to-top'),
    progress = $('reading-progress');
  let scrollQueued = false;
  function updateScrollUI() {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';
    document.querySelector('.topbar').classList.toggle('is-scrolled', y > 18);
    topButton.classList.toggle('visible', y > 400);
    scrollQueued = false;
  }
  window.addEventListener(
    'scroll',
    () => {
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(updateScrollUI);
      }
    },
    { passive: true },
  );
  window.addEventListener('resize', updateScrollUI);
  topButton.addEventListener('click', () =>
    window.scrollTo({ top: 0, behavior: pageReducedMotion ? 'instant' : 'smooth' }),
  );
  window.addEventListener('hashchange', () => {
    requestAnimationFrame(() => {
      prepareReveals();
      updateScrollUI();
    });
  });
  updateScrollUI();
  render();
})();
