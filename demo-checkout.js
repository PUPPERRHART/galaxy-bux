/* Finalização local: carregada exclusivamente pelo launcher demonstrativo. */
(() => {
  'use strict';
  if (window.GALAXY_DEMO !== true) return;
  const button = document.getElementById('cart-checkout');
  const status = document.getElementById('cart-checkout-status');
  const keyName = 'galaxy-demo-checkout-attempt';
  let busy = false;
  let ready = false;
  let completed = false;
  let currentAttempt = null;
  try {
    currentAttempt = JSON.parse(sessionStorage.getItem(keyName));
  } catch {
    /* Use memory when storage is unavailable. */
  }
  const money = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  function items() {
    try {
      const basket = JSON.parse(localStorage.getItem('galaxy-bux-cart-v1') || '{}');
      return Object.entries(basket)
        .filter(([, qty]) => Number.isSafeInteger(qty) && qty > 0)
        .map(([productId, qty]) => ({ productId, qty }));
    } catch {
      return [];
    }
  }
  function update() {
    button.disabled = busy || !ready || items().length === 0;
    if (!busy && ready && !items().length && !completed)
      status.textContent = 'Adicione produtos para finalizar seu pedido.';
  }
  function attempt(cart) {
    const signature = JSON.stringify(
      [...cart].sort((a, b) => a.productId.localeCompare(b.productId)),
    );
    let previous = currentAttempt;
    if (!previous || previous.signature !== signature) {
      previous = { signature, key: crypto.randomUUID() };
      currentAttempt = previous;
      try {
        sessionStorage.setItem(keyName, JSON.stringify(previous));
      } catch {
        /* Keep this attempt in memory. */
      }
    }
    return previous.key;
  }
  function confirmOrder(preview) {
    const dialog = document.createElement('dialog');
    dialog.className = 'order-confirmation';
    dialog.setAttribute('aria-label', 'Confirmar pedido');
    const title = document.createElement('h2');
    title.textContent = 'Revise seu pedido';
    const total = document.createElement('p');
    total.textContent = 'Total dos itens: ' + money(preview.total);
    const note = document.createElement('p');
    note.textContent = 'Ambiente demonstrativo. Nenhum pagamento será realizado.';
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'button primary';
    confirm.textContent = 'Confirmar pedido';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'button secondary';
    cancel.textContent = 'Voltar';
    dialog.append(title, total, note, confirm, cancel);
    document.body.append(dialog);
    return new Promise((resolve) => {
      const finish = (value) => {
        dialog.close();
        dialog.remove();
        resolve(value);
      };
      confirm.onclick = () => finish(true);
      cancel.onclick = () => finish(false);
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        finish(false);
      });
      dialog.showModal();
    });
  }
  async function request(url, cart, key) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      body: JSON.stringify({ items: cart }),
    });
    const result = await response.json();
    if (!response.ok)
      throw Object.assign(
        new Error(result.error || 'Não foi possível finalizar. Tente novamente.'),
        { status: response.status },
      );
    return result;
  }
  window.addEventListener('galaxy:cart-updated', update);
  button.addEventListener('click', async () => {
    if (busy || !ready) return;
    const cart = items();
    if (!cart.length) return;
    completed = false;
    busy = true;
    update();
    status.textContent = 'Conferindo seu pedido…';
    try {
      const accountResponse = await fetch('/api/me');
      const accountData = await accountResponse.json();
      if (!accountData.user)
        throw Object.assign(new Error('Entre para finalizar seu pedido.'), {
          status: 401,
        });
      const preview = await request('/api/demo/cart/preview', cart);
      if (!(await confirmOrder(preview))) {
        status.textContent = 'Você pode continuar ajustando o carrinho.';
        return;
      }
      const result = await request('/api/demo/checkout', cart, attempt(cart));
      currentAttempt = null;
      try {
        sessionStorage.removeItem(keyName);
      } catch {
        /* The confirmed order is already known. */
      }
      completed = true;
      window.dispatchEvent(
        new CustomEvent('galaxy:checkout-confirmed', { detail: { items: cart } }),
      );
      status.replaceChildren(
        document.createTextNode(
          'Pedido ' + result.order.id + ' recebido. Nenhum pagamento foi realizado. ',
        ),
      );
      const account = document.createElement('button');
      account.type = 'button';
      account.className = 'button secondary';
      account.textContent = 'Ver meus pedidos';
      account.onclick = () => {
        document.getElementById('close-cart').click();
        document.getElementById('account-button').click();
      };
      status.append(account);
    } catch (error) {
      status.textContent = error.message;
      if (error.status === 401) {
        const login = document.createElement('a');
        login.href = '/auth/demo';
        login.textContent = ' Entrar';
        status.append(login);
      }
    } finally {
      busy = false;
      update();
    }
  });
  fetch('/api/health')
    .then((response) => response.json())
    .then((health) => {
      ready =
        health.demo === true &&
        health.mode === 'demonstration' &&
        health.realPayments === false;
      status.textContent = ready
        ? 'Revise os itens antes de finalizar.'
        : 'A finalização não está disponível. Tente novamente mais tarde.';
      update();
    })
    .catch(() => {
      status.textContent = 'Não foi possível conectar à loja. Atualize a página.';
      update();
    });
})();
