(() => {
  'use strict';
  const dialog = document.getElementById('gb-account-dialog'),
    content = document.getElementById('gb-account-content');
  if (!dialog || !content) return;
  const el = (tag, txt, cls) => {
    const n = document.createElement(tag);
    if (txt !== undefined) n.textContent = String(txt);
    if (cls) n.className = cls;
    return n;
  };
  const money = (n) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      Number(n) || 0,
    );
  const statuses = {
    aguardando_entrega: ['Aguardando entrega', 'waiting'],
    em_atendimento: ['Em atendimento', 'working'],
    entregue: ['Entregue', 'done'],
    aguardando_atendimento_teste: ['Aguardando atendimento', 'waiting'],
    em_atendimento_teste: ['Em atendimento', 'working'],
    concluido_teste: ['Concluído', 'done'],
    cancelado_teste: ['Cancelado', 'cancelled'],
  };
  let version = 0,
    activeTab = 'orders',
    filter = 'all',
    profile = null,
    orders = [];
  const demoMode = () => window.GALAXY_DEMO === true || profile?.demo === true;
  const avatarUrl = (u) =>
    u?.id && u?.avatar
      ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(u.id)}/${encodeURIComponent(u.avatar)}.${u.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
      : null;
  const bannerUrl = (u) =>
    u?.id && u?.banner
      ? `https://cdn.discordapp.com/banners/${encodeURIComponent(u.id)}/${encodeURIComponent(u.banner)}.${u.banner.startsWith('a_') ? 'gif' : 'png'}?size=1024`
      : null;

  function banner(u) {
    const wrap = el('section', undefined, 'gb-profile-banner');
    const avatarWrap = el('div', undefined, 'gb-discord-avatar-wrap');
    const photo = el('img', undefined, 'gb-profile-avatar');
    const name = el('div', undefined, 'gb-profile-name');

    photo.alt = 'Foto de perfil do Discord';

    const a = avatarUrl(u);
    photo.src =
      a ||
      (demoMode()
        ? 'assets/personagem.png'
        : 'https://cdn.discordapp.com/embed/avatars/0.png');

    avatarWrap.append(photo);

    // Usa exclusivamente a decoração equipada no Discord.
    const decoration = u?.avatar_decoration_data;
    const asset = decoration?.asset;

    if (typeof asset === 'string' && /^[a-zA-Z0-9_]+$/.test(asset)) {
      const overlay = el('img', undefined, 'gb-discord-avatar-decoration');

      overlay.alt = '';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.decoding = 'async';

      // O Discord distribui decorações por este endpoint.
      // Arquivos PNG podem conter animação APNG.
      overlay.src = `https://cdn.discordapp.com/avatar-decoration-presets/${encodeURIComponent(asset)}.png?size=240`;

      overlay.onerror = () => {
        overlay.remove();
      };

      avatarWrap.append(overlay);
    }

    const b = bannerUrl(u);

    if (b) {
      wrap.style.setProperty('--discord-banner', `url("${b}")`);
    }

    name.append(
      el('strong', u.username || 'Usuário Discord'),
      el('small', 'Minha conta'),
      el('span', demoMode() ? '◉ Sessão local' : '◉ Conta conectada', 'gb-discord-chip'),
    );

    wrap.append(avatarWrap, name);
    return wrap;
  }

  function heading(title, subtitle, refreshButton = false) {
    const wrap = el('div', undefined, 'gb-account-section-heading'),
      copy = el('div');
    copy.append(el('h3', title), el('p', subtitle));
    wrap.append(copy);
    if (refreshButton) {
      const b = el('button', '↻ Atualizar pedidos', 'button secondary');
      b.type = 'button';
      b.addEventListener('click', refresh);
      wrap.append(b);
    }
    return wrap;
  }
  function render() {
    content.replaceChildren();
    document.querySelectorAll('[data-account-tab]').forEach((b) => {
      const yes = b.dataset.accountTab === activeTab;
      b.classList.toggle('active', yes);
      b.setAttribute('aria-pressed', String(yes));
    });
    if (!profile) {
      content.append(
        el('p', 'Entre para acompanhar seus pedidos e favoritos.', 'gb-account-message'),
      );
      const a = el('a', 'Entrar', 'button primary');
      a.href = demoMode() ? '/auth/demo' : '/auth/discord';
      content.append(a);
      return;
    }
    content.append(banner(profile));
    if (activeTab === 'profile') {
      content.append(heading('MEU PERFIL', 'Sua conta na Galaxy Bux.'));
      const panel = el('section', undefined, 'gb16-profile-panel');
      const badge = el('span', '✦ PERFIL GALAXY', 'gb16-eyebrow');
      const title = el('h4', profile.username || 'Usuário Discord');
      const desc = el('p', 'Confira as informações do seu perfil.');
      const details = el('div', undefined, 'gb16-profile-details');
      const connected = el('div', undefined, 'gb16-info-tile');
      connected.append(
        el('small', 'CONEXÃO'),
        el('strong', demoMode() ? 'Sessão demonstrativa' : 'Discord conectado'),
      );
      const imageStatus = el('div', undefined, 'gb16-info-tile');
      imageStatus.append(
        el('small', 'IDENTIDADE VISUAL'),
        el('strong', profile.banner ? 'Banner personalizado' : 'Banner padrão da loja'),
      );
      details.append(connected, imageStatus);
      panel.append(badge, title, desc, details);
      content.append(panel);
      return;
    }
    if (activeTab === 'data') {
      content.append(heading('DADOS DA CONTA', 'Confira os dados da sua conta.'));
      const panel = el('section', undefined, 'gb16-data-panel');
      const row = (label, value) => {
        const r = el('div', undefined, 'gb16-data-row'),
          copy = el('div');
        copy.append(el('small', label), el('strong', value));
        r.append(copy);
        return r;
      };
      panel.append(row('NOME EXIBIDO', profile.username || 'Não informado'));
      const idRow = row('IDENTIFICADOR DA CONTA', profile.id || 'Não informado');
      if (profile.id) {
        const copy = el('button', 'Copiar ID', 'gb16-copy');
        copy.type = 'button';
        copy.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(String(profile.id));
            copy.textContent = 'Copiado ✓';
            setTimeout(() => {
              copy.textContent = 'Copiar ID';
            }, 1800);
          } catch {
            copy.textContent = 'Não foi possível copiar';
            setTimeout(() => {
              copy.textContent = 'Copiar ID';
            }, 2200);
          }
        });
        idRow.append(copy);
      }
      panel.append(
        idRow,
        row('AUTENTICAÇÃO', 'Conta conectada'),
        row('IMAGENS DO PERFIL', 'Atualizadas após um novo login'),
      );
      const note = el(
        'p',
        'Estas informações são apenas para consulta.',
        'gb16-data-note',
      );
      panel.append(note);
      content.append(panel);
      return;
    }
    if (activeTab === 'favorites') {
      const key = 'galaxy-bux-favorites-v2',
        catalog = window.GALAXY_CATALOGO;
      content.append(
        heading('MEUS FAVORITOS', 'Produtos marcados com o coração neste navegador.'),
      );
      if (!catalog || !Array.isArray(catalog.products)) {
        content.append(
          el(
            'p',
            'O catálogo ainda não está disponível. Atualize a página e tente novamente.',
            'gb-account-message',
          ),
        );
        return;
      }
      let ids = [];
      try {
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(saved)) ids = saved.filter((id) => typeof id === 'string');
      } catch {}
      const found = ids
        .map((id) => catalog.products.find((p) => p.id === id))
        .filter(
          (p) =>
            p &&
            (!window.GALAXY_CATALOG_POLICY || window.GALAXY_CATALOG_POLICY.isVisible(p)),
        );
      if (!found.length) {
        const empty = el('div', undefined, 'gb17-empty');
        empty.append(
          el('span', '♡', 'gb17-empty-icon'),
          el('h4', 'Sua galáxia de favoritos começa aqui'),
          el(
            'p',
            'Explore os jogos e clique no coração de um produto para guardá-lo nesta lista.',
          ),
        );
        const go = el('button', 'Explorar jogos ↗', 'button primary');
        go.type = 'button';
        go.addEventListener('click', () => {
          closeAccount();
          setTimeout(
            () => {
              location.hash = '#jogos';
            },
            reduced() ? 0 : 240,
          );
        });
        empty.append(go);
        content.append(empty);
        return;
      }
      const count = el(
          'p',
          found.length + ' produto(s) salvo(s) neste navegador.',
          'gb17-count',
        ),
        grid = el('div', undefined, 'gb17-grid');
      content.append(count, grid);
      for (const p of found) {
        const card = el('article', undefined, 'gb17-card'),
          img = el('img'),
          body = el('div', undefined, 'gb17-card-body');
        img.alt = p.name || 'Imagem do produto';
        img.loading = 'lazy';
        img.src = p.image || 'assets/oj.png';
        img.onerror = () => {
          img.onerror = null;
          img.src = 'assets/oj.png';
        };
        const game = catalog.categories?.find((g) => g.id === p.categoryId);
        body.append(
          el('small', game?.name || 'Galaxy Bux'),
          el('h4', p.name || 'Produto'),
          el('strong', money(p.price)),
        );
        const actions = el('div', undefined, 'gb17-actions'),
          view = el('button', 'Ver no catálogo ↗', 'gb17-view'),
          remove = el('button', 'Remover ♡', 'gb17-remove');
        view.type = remove.type = 'button';
        view.addEventListener('click', () => {
          closeAccount();
          setTimeout(
            () => {
              location.hash = '#pagina-jogo/' + encodeURIComponent(p.categoryId);
            },
            reduced() ? 0 : 240,
          );
        });
        remove.addEventListener('click', () => {
          ids = ids.filter((id) => id !== p.id);
          try {
            localStorage.setItem(key, JSON.stringify(ids));
          } catch {}
          card.remove();
          count.textContent = ids.length + ' produto(s) salvo(s) neste navegador.';
          window.dispatchEvent(
            new CustomEvent('galaxy:favorites-updated', {
              detail: { ids, source: 'account' },
            }),
          );
          if (!ids.length) render();
        });
        actions.append(view, remove);
        body.append(actions);
        card.append(img, body);
        grid.append(card);
      }
      return;
    }
    if (activeTab === 'support') {
      content.append(
        heading(
          'SUPORTE',
          'Consulte o andamento do seu pedido e as orientações da equipe.',
        ),
      );
      content.append(
        el(
          'p',
          'Os detalhes de atendimento aparecem junto aos seus pedidos, quando disponíveis.',
          'gb-account-message',
        ),
      );
      return;
    }
    content.append(
      heading('MEUS PEDIDOS', 'Acompanhe o andamento de cada pedido.', true),
    );
    const filters = el('div', undefined, 'gb-order-filters');
    const options = [
      ['all', 'Todos'],
      ['waiting', 'Aguardando'],
      ['working', 'Em atendimento'],
      ['done', 'Concluídos'],
      ['cancelled', 'Cancelados'],
    ];
    for (const [key, label] of options) {
      const count =
        key === 'all'
          ? orders.length
          : orders.filter((o) => (statuses[o.status] || [])[1] === key).length;
      const b = el('button', `${label} (${count})`, filter === key ? 'active' : '');
      b.type = 'button';
      b.addEventListener('click', () => {
        filter = key;
        render();
      });
      filters.append(b);
    }
    content.append(filters);
    const shown = orders.filter(
      (o) => filter === 'all' || (statuses[o.status] || [])[1] === filter,
    );
    if (!shown.length) {
      content.append(
        el(
          'p',
          filter === 'all'
            ? 'Você ainda não tem pedidos. Explore o catálogo para começar.'
            : 'Nenhum pedido encontrado neste filtro.',
          'gb-account-message',
        ),
      );
      return;
    }
    const list = el('div', undefined, 'gb-orders-list');
    content.append(list);
    for (const o of shown) {
      const card = el('article', undefined, 'gb-order-card'),
        top = el('div', undefined, 'gb-order-top'),
        id = el('div');
      id.append(
        el('small', 'PEDIDO'),
        el('strong', o.id || 'Sem identificação', 'gb-order-id'),
      );
      const status = statuses[o.status] || [o.status || 'Sem status', 'unknown'];
      top.append(
        id,
        el('span', status[0], 'gb-order-status gb-order-status--' + status[1]),
      );
      card.append(top);
      const raw = o.createdAt || o.created_at || o.date;
      if (raw) {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime()))
          card.append(
            el(
              'p',
              'Criado em ' +
                d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
              'gb-order-date',
            ),
          );
      }
      const items = Array.isArray(o.items)
        ? o.items
        : Array.isArray(o.itens)
          ? o.itens
          : [];
      if (items.length) {
        const ul = el('ul', undefined, 'gb-order-products');
        for (const i of items) {
          const li = el('li');
          li.append(
            el('span', i.name || i.nome || i.productName || i.title || 'Produto'),
            el('strong', String(i.qty ?? i.quantity ?? i.quantidade ?? 1) + '×'),
          );
          ul.append(li);
        }
        card.append(ul);
      } else card.append(el('p', 'Itens não detalhados pela API.', 'gb-order-muted'));
      const total = el('div', undefined, 'gb-order-total');
      total.append(el('span', 'Total'), el('strong', money(o.total)));
      card.append(total);
      if (o.source === 'site-teste' && o.channelId)
        card.append(el('p', '✓ Canal privado criado no Discord.', 'gb-order-channel'));
      if (
        o.source === 'site-teste' &&
        /^WEB-[A-F0-9-]{8,30}$/.test(o.id) &&
        o.status === 'aguardando_atendimento_teste' &&
        !o.channelId
      ) {
        const b = el('button', 'Cancelar pedido', 'button secondary gb-order-cancel');
        b.type = 'button';
        b.addEventListener('click', async () => {
          if (!confirm('Cancelar o pedido ' + o.id + '?')) return;
          b.disabled = true;
          try {
            const r = await fetch('/api/orders/' + encodeURIComponent(o.id) + '/cancel', {
              method: 'POST',
              credentials: 'same-origin',
            });
            if (!r.ok) {
              const j = await r.json().catch(() => ({}));
              throw Error(j.error || 'Não foi possível cancelar.');
            }
            await refresh();
          } catch (e) {
            alert(e.message);
            b.disabled = false;
          }
        });
        card.append(b);
      }
      list.append(card);
    }
  }
  async function refresh() {
    const v = ++version;
    content.replaceChildren(el('p', 'Carregando sua conta...', 'gb-account-message'));
    try {
      const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) throw Error('Falha ao consultar sua conta.');
      const data = await r.json();
      if (v !== version) return;
      profile = data.user || null;
      orders = [];
      if (profile) {
        const x = await fetch('/api/my-orders', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!x.ok) throw Error('Falha ao consultar pedidos.');
        const result = await x.json();
        if (v !== version) return;
        orders = Array.isArray(result.orders) ? result.orders : [];
      }
      render();
    } catch (e) {
      if (v === version)
        content.replaceChildren(
          el('p', e.message || 'API indisponível.', 'gb-account-message'),
        );
    }
  }
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closing = false,
    closeTimer,
    tabTimer,
    enterTimer,
    sequence = 0;
  const clearTransitions = () => {
    clearTimeout(closeTimer);
    clearTimeout(tabTimer);
    clearTimeout(enterTimer);
    content.classList.remove('gb-content-leaving', 'gb-content-entering');
  };
  function closeAccount() {
    if (!dialog.open || closing) return;
    sequence++;
    clearTransitions();
    if (reduced()) {
      dialog.close();
      return;
    }
    closing = true;
    dialog.classList.add('gb-account-closing');
    closeTimer = setTimeout(() => {
      if (dialog.open) dialog.close();
    }, 230);
  }
  document.querySelectorAll('[data-account-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      const next = b.dataset.accountTab;
      if (next === activeTab || closing || !dialog.open) return;
      const current = ++sequence;
      clearTimeout(tabTimer);
      clearTimeout(enterTimer);
      if (reduced()) {
        activeTab = next;
        render();
        return;
      }
      content.classList.remove('gb-content-entering');
      content.classList.add('gb-content-leaving');
      tabTimer = setTimeout(() => {
        if (current !== sequence || closing || !dialog.open) return;
        activeTab = next;
        render();
        content.classList.remove('gb-content-leaving');
        content.classList.add('gb-content-entering');
        enterTimer = setTimeout(() => {
          if (current === sequence) content.classList.remove('gb-content-entering');
        }, 240);
      }, 135);
    }),
  );
  document.getElementById('gb-account-close')?.addEventListener('click', closeAccount);
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeAccount();
  });
  document.getElementById('account-button')?.addEventListener('click', () => {
    if (closing) return;
    if (!dialog.open) {
      dialog.classList.remove('gb-account-closing');
      dialog.showModal();
      refresh();
    }
  });
  dialog.addEventListener('close', () => {
    version++;
    sequence++;
    clearTransitions();
    closing = false;
    dialog.classList.remove('gb-account-closing');
  });
  window.addEventListener('galaxy:favorites-updated', (e) => {
    if (e.detail?.source === 'account') return;
    if (dialog.open && activeTab === 'favorites' && profile && !closing) render();
  });
  if (location.hash === '#minha-conta') {
    try {
      if (sessionStorage.getItem('gb17-open-favorites') === '1') {
        activeTab = 'favorites';
        sessionStorage.removeItem('gb17-open-favorites');
      }
    } catch {}
    dialog.showModal();
    refresh();
  }
})();
