/* Galaxy Bux 5E.26 — catalog first, then existing scripts. Same-origin API. */
(async () => {
  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Não foi possível carregar ' + src));
      document.head.append(script);
    });
  let source = 'api';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    let response;
    try {
      response = await fetch('/api/catalog', {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error('Catálogo HTTP ' + response.status);
    const data = await response.json();
    if (
      !Array.isArray(data.categories) ||
      !Array.isArray(data.subcategories) ||
      !Array.isArray(data.products)
    )
      throw new Error('Formato inválido');
    window.GALAXY_CATALOGO = data;
  } catch (error) {
    source = 'fallback';
    console.warn('[Galaxy Bux] API indisponível; usando catálogo local.', error.message);
    await loadScript('catalogo.js');
  }
  // Site-only art override for the seven Blox Fruits gamepasses; no database writes.
  const gamepassImages = {
    '8cf54ec6-0a07-4f81-86fe-022f189ea8c3':
      'assets/gamepasses-blox-fruits/+1 storage.jpeg',
    '01882bc1-b6e1-4492-b4ff-0375adfa5579': 'assets/gamepasses-blox-fruits/2x drop.jpeg',
    '8523aab4-fe45-411e-a4aa-c48730675329':
      'assets/gamepasses-blox-fruits/2x mastria.jpeg',
    'e867815c-8dfc-40dd-936a-b5c31d49636f': 'assets/gamepasses-blox-fruits/2x money.jpeg',
    '4d6cb5d9-31e5-4151-8589-31ba32c57461':
      'assets/gamepasses-blox-fruits/dark blade.jpeg',
    '175678fa-dfe2-4cf3-af9b-333a7459fbcd':
      'assets/gamepasses-blox-fruits/fast boats.jpeg',
    '57990556-616a-481e-b36e-808a73147128':
      'assets/gamepasses-blox-fruits/fruit notifier.jpeg',
  };
  for (const product of window.GALAXY_CATALOGO.products || []) {
    if (gamepassImages[product.id]) product.image = gamepassImages[product.id];
  }
  // Reference art by product ID, applied to API and fallback without database writes.
  const referenceImages = {
    "8a97b96e-ba49-443d-ba5a-5af7570864b2": "/assets/produtos-referencias/4a7a9625c2b354a0b98a.jpeg",
    "b1938519-5923-4955-a3d9-88062a8dfb33": "/assets/produtos-referencias/dc259b3f67612b4f4b40.jpeg",
    "88b85fad-9863-4931-bef6-57995bf5b803": "/assets/produtos-referencias/ffbeb5bd38e6cd131965.jpeg",
    "c7bca73a-be05-4374-afac-3b1fff825fab": "/assets/produtos-referencias/b0a179b48455ce5ca857.jpeg",
    "730c72cd-09c3-4a01-88af-93a8e3eb7e31": "/assets/produtos-referencias/549090a8ebda5fa2c1d9.jpeg",
    "ace68284-05c1-4478-a3d0-2bf165d34653": "/assets/produtos-referencias/0341d8ad1e922dd3fc6d.jpeg",
    "baccf84b-26af-48c4-af9b-c5d7524391e9": "/assets/produtos-referencias/12cf27e674c326e74569.jpeg",
    "153c3c85-fea7-4c0b-9173-379716803ada": "/assets/produtos-referencias/69c3b93f33a99b0a6e85.jpeg",
    "ceebf5ef-db7d-4a20-8dc7-c53969474e2b": "/assets/produtos-referencias/a3f08fa166ba3e018ae3.jpeg",
    "6510a870-f216-416f-81d2-e8c3f9f408fd": "/assets/produtos-referencias/899c47c9bede72d02709.jpeg",
    "13db11cb-a70d-4f0d-8d90-4f9b68dda9e4": "/assets/produtos-referencias/e36dc9fbddeb75b4419e.jpeg",
    "2985146c-322b-48d2-af5d-a35b83606221": "/assets/produtos-referencias/6278e50535f930b79262.jpeg",
    "f8dc7b56-5d7d-414e-9203-a9f5f677a41a": "/assets/produtos-referencias/56e7105454b53a7b261b.jpeg",
    "f651fe44-d57d-4595-a686-29158d9ab498": "/assets/produtos-referencias/4dd29af47220d195146a.jpeg",
    "f9e19d93-fd24-42c2-ace2-90104f5e8319": "/assets/produtos-referencias/3ad249f0d6e4d14e1441.jpeg",
    "60019e04-9428-4c8b-b585-a02a789615cc": "/assets/produtos-referencias/d97e4110a9cab5303470.jpeg",
    "6e10ba0d-6688-49a3-8e80-98fd8beae33d": "/assets/produtos-referencias/29a4c549b7ee17a61854.jpeg",
    "40034ffe-653e-4c14-a638-dd8d29fcc43f": "/assets/produtos-referencias/734e903282ec286770e9.jpeg",
    "e174947f-c577-4a41-8b71-24bb5f6df8e4": "/assets/produtos-referencias/ebe9d7d2c2f759be623e.jpeg",
    "b66e2222-aaa3-4f4c-a004-3469ca6b7360": "/assets/produtos-referencias/e96d5bd673a852012d10.jpeg",
    "d41db9b2-ca12-4811-a518-d18b3a488483": "/assets/produtos-referencias/a8ef28dc7cb95b0ceecc.jpeg",
    "6331718f-dd45-4004-b5bc-49b0bb564529": "/assets/produtos-referencias/83c626a4004216895832.jpeg",
    "1f384931-cc49-44b9-b9f2-cb45d98d60d4": "/assets/produtos-referencias/44421745e0019d1687ed.jpeg",
    "dcd08c75-3f17-4473-bcda-f8177830117a": "/assets/produtos-referencias/3ef190e3070fd92543fd.jpeg",
    "b0baf868-339f-4530-8263-6cb6d6450678": "/assets/produtos-referencias/1b62bb59a5fca6918651.jpeg",
    "34a16921-d81c-4f34-baa5-30c483c9ec6b": "/assets/produtos-referencias/e12f2b3424b8c16bad28.jpeg",
    "060cfd6d-3ffb-4b93-bb31-c9fa7d4e1372": "/assets/produtos-referencias/cf7f12c27e01d59e635e.jpeg",
    "a844337d-62b3-43d1-b14d-457e7a87f9ba": "/assets/produtos-referencias/3667a110e742ea5e21ff.jpeg",
    "3590295b-ea76-4bdd-865a-31bffbbea078": "/assets/produtos-referencias/b81c62168cc3a7ababdf.jpeg",
    "1c5f7f97-f559-48a7-ad4b-c6baddcc9dc3": "/assets/produtos-referencias/ee52eb777e3b910da67a.jpeg",
    "7f0c415a-eaf0-409a-865d-02d897f3eb4e": "/assets/produtos-referencias/2e94d9f77e34a4473286.jpeg",
    "9123d923-36cc-4805-9598-93b067d863b2": "/assets/produtos-referencias/f62eecf126709218aead.jpeg",
    "aed29b15-4c39-4e3e-a38a-19dcba5af874": "/assets/produtos-referencias/f36de8d92857bd27be73.jpeg",
    "c23dff4f-a12c-4f09-a877-bc11f9349a6f": "/assets/produtos-referencias/daf2655ecb84133a9756.jpeg",
    "c72eb914-e2b9-4b99-a648-b1a1146cb545": "/assets/produtos-referencias/39ded4f668a8453ba3cb.jpeg",
    "51eea81b-320b-4ff2-908b-5e3e5f07578c": "/assets/produtos-referencias/2b82f4ad8be957876995.jpeg",
    "0b67e8c7-9b30-4755-8f85-985ea4d96ae3": "/assets/produtos-referencias/90d66a66b50d0915838f.jpeg",
    "dce582e5-8a1c-4889-8878-b47e2ec18ea6": "/assets/produtos-referencias/f409416f4868a1cd1e9b.jpeg",
    "72ddc537-026d-4100-b66d-9086f3a7ddf1": "/assets/produtos-referencias/18081f841039440e82f1.jpeg",
    "667aa8d0-3d8c-4f0c-89af-3ee3b535312b": "/assets/produtos-referencias/d716faf39a47c0b01d96.jpeg",
    "5d3f51f8-6b65-4c59-8f70-c2ba2be6e554": "/assets/produtos-referencias/20f4c0ae7d2a7e620ccf.jpeg",
    "1bbf3127-61bf-4f6b-a483-5be9844b6fa3": "/assets/produtos-referencias/10efbdba8dc0101fb6c1.jpeg",
    "05c1afe2-97ac-4515-b7ff-ccb0f8a97332": "/assets/produtos-referencias/c1a0c6eb6c87bd15837f.jpeg",
    "94b50898-d1c7-4641-a6bc-568c8c82d7cf": "/assets/produtos-referencias/7ae63249cd43cbfc35b8.jpeg",
    "1ae0d5f6-0825-4399-bd04-3551f7754267": "/assets/produtos-referencias/c6e276a0c447576d6c72.jpeg",
    "213b7e08-ddb1-4cb6-8aa6-c0adea3318a0": "/assets/produtos-referencias/487baa7ac64b24c2c98c.jpeg",
    "71c7afed-cacf-4a0e-ac7c-3c57153dca87": "/assets/produtos-referencias/b44dd4196910aa838cda.jpeg",
    "fb0b4f34-2947-40c4-8c66-738d12ade2a2": "/assets/produtos-referencias/8f8eb1c5fe0aaa21b2ac.jpeg",
    "c0494866-ce89-4a42-8859-12eccedcdba7": "/assets/produtos-referencias/5ca2b7b9477c6e6052bb.jpeg",
    "2057a7fb-c852-4615-86b0-1344e3ea8629": "/assets/produtos-referencias/98f2b305dc3d16a4e31e.jpeg",
    "75b81825-a970-4911-907a-57d1ca5acd4c": "/assets/produtos-referencias/69c42caf4a0167c2516e.jpeg",
    "9445250a-7097-454c-a07c-7e5b098adf2c": "/assets/produtos-referencias/271b1578759640338502.jpeg",
    "a68f61fb-6fb4-4e92-b15c-74d2e0ab137c": "/assets/produtos-referencias/3bb8dae99d5cd08bd482.jpeg",
    "03fc5f88-0fd0-4269-91dd-9d9ef1c188de": "/assets/produtos-referencias/509cec6a25aeaadd30ae.jpeg",
    "3db751e6-03e4-4934-9b55-dc144fc881ab": "/assets/produtos-referencias/bc8902089a800370d189.jpeg",
    "c0b9cac8-986d-4e3d-887b-5e439510de93": "/assets/produtos-referencias/d5d1264c41cf51f4fb19.jpeg",
    "4e4cc2cb-367a-4e65-bbed-f1e4f134fa6a": "/assets/produtos-referencias/3226327d22fea8fc24af.jpeg",
    "5037fc5b-11bb-46c0-abea-95798579e38d": "/assets/produtos-referencias/f3d4214573281379edfc.jpeg",
    "bf23f004-58f7-46ac-a285-80964e26f274": "/assets/produtos-referencias/d6adf57039349447d7bf.jpeg",
    "e0a2f1af-0785-47b8-b782-373c98739fca": "/assets/produtos-referencias/349147863489366ff014.jpeg",
    "c11cd1c8-ffef-49f2-8a02-8d463319aff1": "/assets/produtos-referencias/b83454a0070289306deb.jpeg",
    "3974552b-9d83-4973-b2f6-c70423eb41a8": "/assets/produtos-referencias/1de919c43eebe466d75d.jpeg",
    "61f888c0-c239-4837-8fc4-a03b2de3c665": "/assets/produtos-referencias/bdc707a0ec1c9802fa2a.jpeg",
    "0c99afc0-cd97-455f-9857-6757b46eaca3": "/assets/produtos-referencias/f0321aaa1cef11cdf151.jpeg",
    "ccf3cd4b-d925-4edd-950f-317058825644": "/assets/produtos-referencias/8f10c0c8d9821f9771ff.jpeg",
    "2206be63-8ca4-4bda-a823-a79e9eaaa932": "/assets/produtos-referencias/eb97203c327a63093ee1.jpeg",
    "d8ed4873-070f-4aac-84d9-ab8899ddd49a": "/assets/produtos-referencias/bb26d228a80ccf0053c4.jpeg",
    "5db0f52e-9369-4789-9a67-48281a74979a": "/assets/produtos-referencias/2400461005437aeb4aad.jpeg",
    "ec44db72-fbc3-43cc-aa55-06984dd0bf90": "/assets/produtos-referencias/ed8b11c2cdcb7f8ba531.jpeg",
    "87199de7-9f90-4814-961e-f954f8ce2b5c": "/assets/produtos-referencias/f3ebd54b18f0c76e5142.jpeg",
    "c8e6e9f5-b023-405f-b6d9-f80b427fc255": "/assets/produtos-referencias/fdc89a4a6aad6942fadc.jpeg",
    "f3a4fb1f-eaa6-493a-bc1c-32157d3e871b": "/assets/produtos-referencias/6e573dab58275c6d4d58.jpeg",
    "d3a55f88-3446-49ab-a2b5-c21e9dc52355": "/assets/produtos-referencias/33dd96a502e36652110d.jpeg",
    "71b4c7dc-a98e-449e-a71b-dc61080ba6d8": "/assets/produtos-referencias/cbfff666c2b3769420e8.jpeg",
    "b4a870a6-c559-4ae4-93ce-1562644b1933": "/assets/produtos-referencias/041fa26bf8582dd7f28b.jpeg",
    "7e82c800-33bf-420e-a65d-be9ff9fa2dcb": "/assets/produtos-referencias/c276bee99332b1f429d9.jpeg"
  };
  for (const product of window.GALAXY_CATALOGO.products || []) {
    if (referenceImages[product.id]) product.image = referenceImages[product.id];
  }
  // Visual ordering for Blox Fruits gamepasses only, preserving other products' positions.
  const preferredGamepassOrder = [
    '8523aab4-fe45-411e-a4aa-c48730675329',
    '01882bc1-b6e1-4492-b4ff-0375adfa5579',
    '4d6cb5d9-31e5-4151-8589-31ba32c57461',
    '175678fa-dfe2-4cf3-af9b-333a7459fbcd',
    'e867815c-8dfc-40dd-936a-b5c31d49636f',
    '57990556-616a-481e-b36e-808a73147128',
    '8cf54ec6-0a07-4f81-86fe-022f189ea8c3',
  ];
  const positions = preferredGamepassOrder.map((id) =>
    window.GALAXY_CATALOGO.products.findIndex((p) => p.id === id),
  );
  if (positions.every((index) => index >= 0)) {
    const originalSlots = [...positions].sort((a, b) => a - b);
    const orderedCards = preferredGamepassOrder.map((id) =>
      window.GALAXY_CATALOGO.products.find((p) => p.id === id),
    );
    originalSlots.forEach((slot, i) => {
      window.GALAXY_CATALOGO.products[slot] = orderedCards[i];
    });
  }
  window.GALAXY_CATALOGO_ORIGEM = source;
  await loadScript('script.js');
  await loadScript('integracao.js');
  await loadScript(
    window.GALAXY_DEMO === true ? 'demo-checkout.js' : 'checkout-lateral.js',
  );
  if (source === 'fallback') {
    const banner = document.createElement('div');
    banner.className = 'gb26-offline';
    banner.setAttribute('role', 'status');
    banner.textContent =
      'Você está consultando o catálogo salvo. Reconecte para finalizar seu pedido.';
    document.body.prepend(banner);
  }
})().catch((error) => {
  console.error('[Galaxy Bux] Falha ao iniciar o site:', error);
  const el = document.createElement('p');
  el.setAttribute('role', 'alert');
  el.textContent =
    'Não foi possível carregar a loja. Atualize a página para tentar novamente.';
  document.body.prepend(el);
});
