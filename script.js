/* ===== AlertaBairro - script.js =====
   Um único arquivo para as três páginas. Cada página diz quem ela é
   com <body data-pagina="...">, e no final do arquivo chamamos a função certa. */

// ---------- 1. DADOS (fonte única: localStorage) ----------
const CHAVE = "alertabairro_ocorrencias";

// Cada categoria tem um nome e um emoji. O emoji da ocorrência vem daqui.
const CATEGORIAS = {
  buraco:      { nome: "Buraco",      emoji: "🕳️" },
  iluminacao:  { nome: "Iluminação",  emoji: "💡" },
  lixo:        { nome: "Lixo",        emoji: "🗑️" },
  alagamento:  { nome: "Alagamento",  emoji: "🌧️" },
  outro:       { nome: "Outro",       emoji: "⚠️" }
};

// Lê a lista salva (ou lista vazia se não houver nada)
function carregar() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE)) || [];
    // Compatibilidade: ocorrências antigas sem "confirmacoes" passam a valer 0
    lista.forEach(o => { o.confirmacoes = Number(o.confirmacoes) || 0; });
    return lista;
  } catch (e) { return []; }
}
// Grava a lista inteira
function salvar(lista) { localStorage.setItem(CHAVE, JSON.stringify(lista)); }
// Remove uma ocorrência pelo id e grava de novo
function excluir(id) { salvar(carregar().filter(o => o.id !== id)); }

// ---------- CONFIRMAÇÕES (Etapa 4) ----------
// Os IDs que ESTE navegador já confirmou ficam numa chave separada.
const CHAVE_CONF = "alertabairro_confirmacoes";
function idsConfirmados() {
  try { return JSON.parse(localStorage.getItem(CHAVE_CONF)) || []; }
  catch (e) { return []; }
}
// Soma +1 na ocorrência e guarda o ID localmente (só uma vez por ocorrência)
function confirmar(id) {
  const ja = idsConfirmados();
  if (ja.includes(id)) return;                 // evita confirmação duplicada
  const lista = carregar();
  const o = lista.find(x => x.id === id);
  if (!o) return;
  o.confirmacoes += 1;
  salvar(lista);
  ja.push(id);
  localStorage.setItem(CHAVE_CONF, JSON.stringify(ja));
}
// Textos e botão reutilizados pela Home e pelo popup do mapa
function textoConfirmacoes(n) { return `👍 ${n} ${n === 1 ? "confirmação" : "confirmações"}`; }
function blocoConfirmacao(o) {
  const feito = idsConfirmados().includes(o.id);
  return `<div class="conf">${textoConfirmacoes(o.confirmacoes)}</div>
    <button class="btn-conf${feito ? " feito" : ""}" data-confirmar="${o.id}" ${feito ? "disabled" : ""}>${feito ? "✓ Problema confirmado" : "👍 Confirmar problema"}</button>`;
}

// Evita que texto digitado vire HTML (segurança básica)
function esc(t) {
  const d = document.createElement("div");
  d.textContent = t || "";
  return d.innerHTML;
}

// ---------- 2. HOME ----------
function iniciarHome() {
  const lista = document.getElementById("lista");
  function desenhar() {
    const ocorrencias = carregar().slice().reverse(); // mais recentes primeiro
    if (ocorrencias.length === 0) {
      lista.innerHTML = '<div class="vazio">Nenhum alerta por aqui ainda.<br>Toque em "+ Reportar problema" para registrar o primeiro.</div>';
      return;
    }
    lista.innerHTML = ocorrencias.map(o => `
      <article class="card">
        <div class="topo"><span class="emoji">${o.emoji}</span><b>${esc(o.categoria)}</b></div>
        <p>${esc(o.descricao)}</p>
        <small>📍 ${esc(o.localizacao)} (${o.latitude.toFixed(5)}, ${o.longitude.toFixed(5)})</small>
        ${o.foto ? `<img src="${o.foto}" alt="Foto da ocorrência">` : ""}
        ${blocoConfirmacao(o)}
        <button class="del" data-id="${o.id}">Excluir</button>
      </article>`).join("");
  }
  // Clique em "Excluir": remove do localStorage e redesenha a lista
  lista.addEventListener("click", e => {
    // Clique em "Confirmar problema": soma +1 e redesenha a lista
    if (e.target.dataset.confirmar) { confirmar(e.target.dataset.confirmar); desenhar(); return; }
    const id = e.target.dataset.id;
    if (id && confirm("Excluir este alerta?")) { excluir(id); desenhar(); }
  });
  desenhar();
}

// ---------- 3. REPORTAR ----------
function iniciarReportar() {
  let categoriaEscolhida = null; // chave da categoria (ex.: "buraco")
  let foto = null;               // foto em texto (data URL)
  let usouLocalizacaoAtual = false;

  const $ = id => document.getElementById(id);

  // Cria os cartões de categoria
  $("cats").innerHTML = Object.entries(CATEGORIAS).map(([k, c]) =>
    `<button type="button" class="cat" data-cat="${k}"><span>${c.emoji}</span>${c.nome}</button>`).join("");
  $("cats").addEventListener("click", e => {
    const b = e.target.closest(".cat");
    if (!b) return;
    categoriaEscolhida = b.dataset.cat;
    document.querySelectorAll(".cat").forEach(x => x.classList.toggle("ativa", x === b)); // destaque
  });

  // --- Foto: reduzimos a imagem para caber no localStorage (limite ~5 MB) ---
  function lerFoto(arquivo) {
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, 800 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * escala; c.height = img.height * escala;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        foto = c.toDataURL("image/jpeg", 0.7);
        $("preview").src = foto;
        $("preview").style.display = "block";
        $("removerFoto").style.display = "inline-block";
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  }
  $("btnCamera").onclick = () => $("inCamera").click();
  $("btnGaleria").onclick = () => $("inGaleria").click();
  $("inCamera").onchange = e => lerFoto(e.target.files[0]);
  $("inGaleria").onchange = e => lerFoto(e.target.files[0]);
  $("removerFoto").onclick = () => {
    foto = null;
    $("preview").style.display = "none";
    $("removerFoto").style.display = "none";
    $("inCamera").value = ""; $("inGaleria").value = "";
  };

 // --- Localização automática pelo navegador ---
$("btnLoc").onclick = () => {
  const st = $("statusLoc");

  if (!navigator.geolocation) {
    st.textContent = "Seu navegador não permite geolocalização. Informe manualmente.";
    return;
  }

  st.className = "";
  st.textContent = "Buscando sua localização...";

  navigator.geolocation.getCurrentPosition(
    pos => {
      $("lat").value = pos.coords.latitude.toFixed(6);
      $("lng").value = pos.coords.longitude.toFixed(6);

      usouLocalizacaoAtual = true;

      st.className = "ok";
      st.textContent = "✓ Localização atual selecionada";

      console.log("Latitude:", pos.coords.latitude);
      console.log("Longitude:", pos.coords.longitude);
      console.log("Precisão:", pos.coords.accuracy, "metros");
    },
    erro => {
      console.error("Erro de localização:", erro);

      st.className = "";
      st.textContent =
        "Não foi possível obter a localização. Informe manualmente abaixo.";
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
};

  // --- Publicar ---
  $("publicar").onclick = () => {
    const descricao = $("descricao").value.trim();
    const lat = parseFloat($("lat").value), lng = parseFloat($("lng").value);
    const erro = t => { $("erro").textContent = t; };

    if (!categoriaEscolhida) return erro("Escolha uma categoria.");
    if (!descricao) return erro("Escreva uma descrição.");
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180)
      return erro("Informe a localização: use sua posição atual ou digite latitude e longitude válidas.");

    const cat = CATEGORIAS[categoriaEscolhida];
    const nova = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), // ID único
      categoria: cat.nome,
      emoji: cat.emoji,
      descricao: descricao,
      latitude: lat,
      longitude: lng,
      foto: foto,
      localizacao: $("localizacao").value.trim() || (usouLocalizacaoAtual ? "Minha localização atual" : "Localização informada manualmente")
    };
    try {
      const lista = carregar(); lista.push(nova); salvar(lista);
    } catch (e) {
      return erro("Não foi possível salvar (armazenamento cheio). Tente sem foto ou exclua alertas antigos.");
    }
    location.href = "index.html"; // volta para a Home, onde o alerta já aparece
  };
}

// ---------- 4. MAPA ----------
function iniciarMapa() {
  const mapa = L.map("mapa").setView([-14.2, -51.9], 4); // visão do Brasil
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "© OpenStreetMap"
  }).addTo(mapa);

  const ocorrencias = carregar();
  const pontos = [];
  const marcadores = {}; // id da ocorrência -> marcador (para atualizar o popup)
  // Conteúdo do popup: categoria, descrição, confirmações e botões
  const htmlPopup = o => `<b>${o.emoji} ${esc(o.categoria)}</b><br>${esc(o.descricao)}${blocoConfirmacao(o)}<button class="del" data-id="${o.id}">Excluir</button>`;
  ocorrencias.forEach(o => {
    // Marcador personalizado: um círculo com o emoji da categoria
    const icone = L.divIcon({ className: "", html: `<div class="marcador">${o.emoji}</div>`, iconSize: [42, 42], iconAnchor: [21, 21] });
    // Posicionado pela latitude e longitude da ocorrência
    marcadores[o.id] = L.marker([o.latitude, o.longitude], { icon: icone }).addTo(mapa)
      .bindPopup(htmlPopup(o));
    pontos.push([o.latitude, o.longitude]);
  });
  // Enquadra o mapa para mostrar todas as ocorrências
  if (pontos.length === 1) mapa.setView(pontos[0], 16);
  else if (pontos.length > 1) mapa.fitBounds(pontos, { padding: [60, 60] });

  // Excluir dentro do balão: remove do localStorage e recarrega o mapa
  document.getElementById("mapa").addEventListener("click", e => {
    // Confirmar: soma +1 e atualiza o conteúdo do popup aberto (sem fechar)
    const idConf = e.target.dataset && e.target.dataset.confirmar;
    if (idConf) {
      confirmar(idConf);
      const o = carregar().find(x => x.id === idConf);
      if (o) marcadores[idConf].setPopupContent(htmlPopup(o));
      return;
    }
    const id = e.target.dataset && e.target.dataset.id;
    if (id && confirm("Excluir este alerta?")) { excluir(id); location.reload(); }
  });
}

// ---------- 5. Qual página estou? ----------
const pagina = document.body.dataset.pagina;
if (pagina === "home") iniciarHome();
if (pagina === "reportar") iniciarReportar();
if (pagina === "mapa") iniciarMapa();
