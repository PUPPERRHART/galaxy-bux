/* Galaxy Bux 3.0 - Vitrine sincronizada com o ambiente de testes. */

(() => {
  'use strict';

  const host = document.getElementById('discord-sync');
  if (!host) return;

  const money = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  const make = (tag, cls, txt) => {
    const element = document.createElement(tag);

    if (cls) element.className = cls;
    if (txt !== undefined) element.textContent = txt;

    return element;
  };

  let data;
  let selected = null;
  let cart = [];
  let checkoutInProgress = false;

  // A chave pertence a uma tentativa de compra, nao a cada clique.
  const KEY_STORAGE = 'galaxy_bux_test_checkout_attempt_v1';

  const status = make('p', 'sync-status', 'Carregando catalogo do bot...');

  const filters = make('div', 'sync-filters');
  const products = make('div', 'sync-products');
  const summary = make('div', 'sync-summary');

  host.append(status, filters, products, summary);

  function cartItems() {
    return cart.map((item) => ({
      productId: item.id,
      qty: item.qty,
    }));
  }

  function cartFingerprint(items) {
    return JSON.stringify(
      [...items].sort((a, b) => a.productId.localeCompare(b.productId)),
    );
  }

  function readAttempt() {
    try {
      const raw = sessionStorage.getItem(KEY_STORAGE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveAttempt(attempt) {
    try {
      sessionStorage.setItem(KEY_STORAGE, JSON.stringify(attempt));
    } catch {
      // A chave permanece disponivel na memoria desta pagina.
    }
  }

  function clearStoredAttempt() {
    try {
      sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      // O armazenamento pode estar indisponivel.
    }
  }

  let currentAttempt = readAttempt();

  function clearAttempt() {
    currentAttempt = null;
    clearStoredAttempt();
  }

  function newKey() {
    if (!globalThis.crypto?.randomUUID) {
      throw new Error('O navegador precisa oferecer crypto.randomUUID.');
    }

    return crypto.randomUUID();
  }

  function checkoutAttempt(items) {
    const fingerprint = cartFingerprint(items);

    if (
      currentAttempt &&
      currentAttempt.fingerprint === fingerprint &&
      typeof currentAttempt.key === 'string'
    ) {
      return currentAttempt;
    }

    currentAttempt = {
      fingerprint,
      key: newKey(),
    };

    saveAttempt(currentAttempt);

    return currentAttempt;
  }

  function cartChanged() {
    clearAttempt();
    refreshSummary();
  }

  function refreshSummary() {
    summary.replaceChildren();

    summary.append(make('h3', '', 'Previa do carrinho do Discord (teste)'));

    if (!cart.length) {
      summary.append(
        make('p', '', 'Nenhum item selecionado. Nenhuma nova reserva foi solicitada.'),
      );
      return;
    }

    let total = 0;

    for (const line of cart) {
      const product = data.products.find((p) => String(p.id) === line.id);

      if (!product) continue;

      total += Number(product.price) * line.qty;

      const row = make('div', 'sync-line');

      row.append(
        make(
          'span',
          '',
          `${line.qty}x ${product.name} - ${money(Number(product.price) * line.qty)}`,
        ),
      );

      const remove = make('button', '', 'Remover');
      remove.type = 'button';
      remove.disabled = checkoutInProgress;

      remove.onclick = () => {
        if (checkoutInProgress) return;

        cart = cart.filter((item) => item.id !== line.id);
        cartChanged();
      };

      row.append(remove);
      summary.append(row);
    }

    summary.append(
      make('strong', '', `Total estimado: ${money(total)}`),
      make(
        'p',
        '',
        'Pedidos de TESTE nao realizam cobrancas nem alteram o estoque original do bot. No modo MongoDB, reservam apenas o estoque experimental.',
      ),
    );

    const preview = make('button', 'button secondary', 'Validar carrinho no servidor');

    preview.type = 'button';
    preview.disabled = checkoutInProgress;

    preview.onclick = async () => {
      if (checkoutInProgress) return;

      preview.disabled = true;

      try {
        const response = await fetch('/api/cart/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: cartItems(),
          }),
        });

        const result = await response.json();

        status.textContent = response.ok
          ? `Carrinho validado: ${money(result.total)}. Clique em Criar pedido de TESTE para continuar.`
          : result.error || 'Falha ao validar.';
      } catch {
        status.textContent = 'API indisponivel.';
      } finally {
        preview.disabled = false;
      }
    };

    summary.append(preview);

    const checkout = make(
      'button',
      'button primary',
      'Criar pedido de TESTE com Discord',
    );

    checkout.type = 'button';
    checkout.disabled = checkoutInProgress;

    checkout.onclick = async () => {
      if (checkoutInProgress || !cart.length) return;

      checkoutInProgress = true;
      checkout.disabled = true;

      // Captura o carrinho antes da requisicao.
      const items = cartItems();

      try {
        const attempt = checkoutAttempt(items);

        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': attempt.key,
          },
          body: JSON.stringify({ items }),
        });

        const result = await response.json();

        if (response.status === 401) {
          status.textContent =
            'Entre em Minha conta com Discord antes de criar o pedido.';
          return;
        }

        if (!response.ok) {
          status.textContent = result.error || 'Falha ao criar pedido.';

          // Mantem a chave para que uma tentativa repetida
          // nao seja confundida com uma compra nova.
          return;
        }

        // Somente uma resposta confirmada encerra a tentativa.
        clearAttempt();

        cart = [];

        status.textContent =
          `Pedido de TESTE ${result.order.id} criado! ` +
          `Total ${money(result.order.total)}. ` +
          'Sem cobranca e sem alterar o estoque original. ' +
          'Consulte Minha conta.';
      } catch {
        // Uma falha de rede nao significa que o servidor
        // deixou de criar o pedido. Por isso, nao troca a chave.
        status.textContent =
          'Falha de conexao. Se o pedido tiver sido criado, ' +
          'tentar novamente com o mesmo carrinho reutilizara ' +
          'a mesma chave de seguranca.';
      } finally {
        checkoutInProgress = false;
        refreshSummary();
      }
    };

    summary.append(checkout);
  }

  function render() {
    products.replaceChildren();

    const list = data.products.filter((product) => product.categoryId === selected);

    for (const product of list) {
      const card = make('article', 'sync-card');

      card.append(
        make(
          'small',
          '',
          data.subcategories.find((sub) => sub.id === product.subcategoryId)?.name ||
            'Produtos',
        ),
        make('h4', '', product.name),
        make('p', '', money(Number(product.price))),
        make('p', '', `Estoque de teste: ${product.stock}`),
      );

      const add = make(
        'button',
        'button secondary',
        Number(product.stock) > 0 ? 'Adicionar a previa' : 'Sem estoque',
      );

      add.type = 'button';
      add.disabled = Number(product.stock) <= 0 || checkoutInProgress;

      add.onclick = () => {
        if (checkoutInProgress) return;

        const line = cart.find((item) => item.id === String(product.id));

        if (line) {
          if (line.qty >= Number(product.stock) || line.qty >= 99) {
            status.textContent = 'Limite do estoque de teste atingido.';
            return;
          }

          line.qty++;
        } else {
          if (cart.length >= 30) {
            status.textContent = 'O carrinho aceita ate 30 produtos diferentes.';
            return;
          }

          cart.push({
            id: String(product.id),
            qty: 1,
          });
        }

        cartChanged();
      };

      card.append(add);
      products.append(card);
    }

    status.textContent =
      `${list.length} produtos do bot - ` +
      'banco de demonstracao - ' +
      'sem alterar o catalogo visual original.';
  }

  fetch('/api/catalog')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Catalogo indisponivel.');
      }

      return response.json();
    })
    .then((result) => {
      data = result;

      for (const category of result.categories) {
        const button = make('button', 'sync-tab', category.name);

        button.type = 'button';

        button.onclick = () => {
          selected = category.id;

          for (const element of filters.children) {
            element.classList.toggle('active', element === button);
          }

          render();
        };

        filters.append(button);
      }

      if (result.categories.length) {
        filters.firstChild.click();
      }

      refreshSummary();
    })
    .catch(() => {
      status.textContent =
        'Nao foi possivel carregar o catalogo do bot. ' +
        'Inicie o servidor com npm run web:test.';
    });
})();
