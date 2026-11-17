/* Galaxy Bux 5E.11 — checkout experimental integrado ao carrinho visual. */
(() => {
  'use strict';
  const CART_KEY = 'galaxy-bux-cart-v1';
  const ATTEMPT_KEY = 'galaxy_bux_lateral_checkout_attempt_v1';
  const button = document.getElementById('cart-checkout');
  const status = document.getElementById('cart-checkout-status');
  if (!button || !status) return;
  let busy = false;
  let enabled = false;
  let products = new Map();
  let attempt = null;
  try {
    attempt = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) || 'null');
  } catch (_) {}
  const money = (n) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  const say = (message) => {
    status.textContent = message;
  };
  const items = () => {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    } catch (_) {
      raw = {};
    }
    if (!raw || Array.isArray(raw) || typeof raw !== 'object') return [];
    return Object.entries(raw)
      .filter(([id, qty]) => products.has(id) && Number.isSafeInteger(qty) && qty > 0)
      .map(([productId, qty]) => ({ productId, qty }));
  };
  const fingerprint = (list) =>
    JSON.stringify([...list].sort((a, b) => a.productId.localeCompare(b.productId)));
  const clearAttempt = () => {
    attempt = null;
    try {
      sessionStorage.removeItem(ATTEMPT_KEY);
    } catch (_) {}
  };
  const update = () => {
    button.disabled = busy || !enabled || items().length === 0;
  };
  window.addEventListener('galaxy:cart-updated', () => {
    if (attempt && fingerprint(items()) !== attempt.fingerprint) clearAttempt();
    update();
  });
  async function initialize() {
    try {
      const [healthResponse, catalogResponse] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/catalog'),
      ]);
      if (!healthResponse.ok || !catalogResponse.ok)
        throw Error('A loja está indisponível no momento. Tente novamente.');
      const health = await healthResponse.json();
      const catalog = await catalogResponse.json();
      if (!Array.isArray(catalog.products))
        throw Error('Não foi possível carregar os produtos.');
      products = new Map(catalog.products.map((p) => [String(p.id), p]));
      const visual = window.GALAXY_CATALOGO?.products || [];
      if (
        visual.length !== products.size ||
        visual.some((p) => !products.has(String(p.id)))
      )
        throw Error('O catálogo foi atualizado. Atualize a página antes de continuar.');
      enabled =
        health.ok === true &&
        health.mode === 'mongo-integration-test' &&
        health.storage === 'mongo' &&
        health.checkout === true &&
        health.realPayments === false;
      say(
        enabled
          ? 'Confira seus itens antes de finalizar.'
          : 'A finalização não está disponível neste ambiente.',
      );
    } catch (error) {
      enabled = false;
      say(error.message || 'Não foi possível conectar à loja.');
    }
    update();
  }
  button.addEventListener('click', async () => {
    if (busy || !enabled) return;
    const cart = items();
    if (!cart.length) return;
    busy = true;
    update();
    say('Validando o carrinho no servidor...');
    try {
      const previewResponse = await fetch('/api/cart/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      });
      const preview = await previewResponse.json();
      if (!previewResponse.ok) {
        say(preview.error || 'Não foi possível validar o carrinho.');
        return;
      }
      if (fingerprint(items()) !== fingerprint(cart)) {
        say('O carrinho mudou. Confira os itens e tente novamente.');
        return;
      }
      const fp = fingerprint(cart);
      if (!attempt || attempt.fingerprint !== fp || typeof attempt.key !== 'string') {
        if (!crypto?.randomUUID)
          throw Error('Abra a loja por uma conexão segura para continuar.');
        attempt = { fingerprint: fp, key: crypto.randomUUID() };
        try {
          sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
        } catch (_) {}
      }
      say(
        'Total validado: ' + money(Number(preview.total)) + '. Finalizando seu pedido…',
      );
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key },
        body: JSON.stringify({ items: cart }),
      });
      const result = await response.json();
      if (response.status === 401) {
        status.replaceChildren(
          document.createTextNode(
            'Entre com Discord em Minha conta antes de finalizar. ',
          ),
        );
        const link = document.createElement('a');
        link.href = '/auth/discord';
        link.textContent = 'Entrar';
        status.append(link);
        return;
      }
      if (!response.ok) {
        say(
          result.error ||
            'Pedido não confirmado. Confira o histórico antes de tentar novamente.',
        );
        return;
      }
      if (!result.order?.id) {
        say('Resposta incompleta. Confira Minha conta antes de tentar novamente.');
        return;
      }
      clearAttempt();
      window.dispatchEvent(new Event('galaxy:checkout-confirmed'));
      say(
        'Pedido ' +
          result.order.id +
          ' recebido. Total: ' +
          money(Number(result.order.total)) +
          '. Acompanhe o atendimento em Minha conta.',
      );
    } catch (error) {
      say(
        'Não foi possível confirmar a resposta. Confira Minha conta antes de tentar novamente; a mesma tentativa mantém sua chave de segurança.',
      );
    } finally {
      busy = false;
      update();
    }
  });
  initialize();
})();
