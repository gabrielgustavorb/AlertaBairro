/* ===== AlertaBairro - script.js =====
   Um único arquivo para as três páginas.
   Cada página diz quem ela é com <body data-pagina="...">.
*/

// ---------- 1. DADOS ----------
const CHAVE = "alertabairro_ocorrencias";

const CATEGORIAS = {
  buraco:      { nome: "Buraco",      emoji: "🕳️" },
  iluminacao:  { nome: "Iluminação",  emoji: "💡" },
  lixo:        { nome: "Lixo",        emoji: "🗑️" },
  alagamento:  { nome: "Alagamento",  emoji: "🌧️" },
  outro:       { nome: "Outro",       emoji: "⚠️" }
};

// ---------- FUNÇÕES GERAIS ----------

function carregar() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE)) || [];

    lista.forEach(o => {
      o.confirmacoes = Number(o.confirmacoes) || 0;
    });

    return lista;
  } catch (e) {
    return [];
  }
}

function salvar(lista) {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
}

function excluir(id) {
  salvar(carregar().filter(o => o.id !== id));
}

// ---------- CONFIRMAÇÕES ----------

const CHAVE_CONF = "alertabairro_confirmacoes";

function idsConfirmados() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CONF)) || [];
  } catch (e) {
    return [];
  }
}

function confirmar(id) {
  const ja = idsConfirmados();

  if (ja.includes(id)) return;

  const lista = carregar();
  const o = lista.find(x => x.id === id);

  if (!o) return;

  o.confirmacoes += 1;

  salvar(lista);

  ja.push(id);
  localStorage.setItem(CHAVE_CONF, JSON.stringify(ja));
}

function textoConfirmacoes(n) {
  return `👍 ${n} ${n === 1 ? "confirmação" : "confirmações"}`;
}

function blocoConfirmacao(o) {
  const feito = idsConfirmados().includes(o.id);

  return `
    <div class="conf">${textoConfirmacoes(o.confirmacoes)}</div>

    <button
      class="btn-conf${feito ? " feito" : ""}"
      data-confirmar="${o.id}"
      ${feito ? "disabled" : ""}
    >
      ${feito ? "✓ Problema confirmado" : "👍 Confirmar problema"}
    </button>
  `;
}

// Evita que texto digitado vire HTML
function esc(t) {
  const d = document.createElement("div");
  d.textContent = t || "";
  return d.innerHTML;
}

// ---------- 2. HOME ----------

function iniciarHome() {
  const lista = document.getElementById("lista");

  function desenhar() {
    const ocorrencias = carregar().slice().sort((a, b) => {
      if (b.confirmacoes !== a.confirmacoes) {
        return b.confirmacoes - a.confirmacoes;
      }

      return String(b.id).localeCompare(String(a.id));
    });

    if (ocorrencias.length === 0) {
      lista.innerHTML =
        '<div class="vazio">Nenhum alerta por aqui ainda.<br>Toque em "+ Reportar problema" para registrar o primeiro.</div>';

      return;
    }

    lista.innerHTML = ocorrencias.map(o => `
      <article class="card">

        <div class="topo">
          <span class="emoji">${o.emoji}</span>
          <b>${esc(o.categoria)}</b>
        </div>

        <p>${esc(o.descricao)}</p>

        <small>
          📍 ${esc(o.localizacao || "Localização não informada")}
          (${Number(o.latitude).toFixed(5)}, ${Number(o.longitude).toFixed(5)})
        </small>

        ${o.foto ? `<img src="${o.foto}" alt="Foto da ocorrência">` : ""}

        ${blocoConfirmacao(o)}

        <button class="del" data-id="${o.id}">
          Excluir
        </button>

      </article>
    `).join("");
  }

  lista.addEventListener("click", e => {

    if (e.target.dataset.confirmar) {
      confirmar(e.target.dataset.confirmar);
      desenhar();
      return;
    }

    const id = e.target.dataset.id;

    if (id && confirm("Excluir este alerta?")) {
      excluir(id);
      desenhar();
    }
  });

  desenhar();
}

// ---------- 3. REPORTAR ----------

function iniciarReportar() {

  let categoriaEscolhida = null;
  let foto = null;

  // Localização atual do aparelho
  let usouLocalizacaoAtual = false;
  let latitudeAtual = null;
  let longitudeAtual = null;

  const $ = id => document.getElementById(id);

  // ---------- CATEGORIAS ----------

  $("cats").innerHTML = Object.entries(CATEGORIAS)
    .map(([k, c]) =>
      `<button type="button" class="cat" data-cat="${k}">
        <span>${c.emoji}</span>${c.nome}
      </button>`
    )
    .join("");

  $("cats").addEventListener("click", e => {

    const b = e.target.closest(".cat");

    if (!b) return;

    categoriaEscolhida = b.dataset.cat;

    document.querySelectorAll(".cat").forEach(x => {
      x.classList.toggle("ativa", x === b);
    });
  });

  // ---------- FOTO ----------

  function lerFoto(arquivo) {

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = () => {

      const img = new Image();

      img.onload = () => {

        const escala = Math.min(
          1,
          800 / Math.max(img.width, img.height)
        );

        const c = document.createElement("canvas");

        c.width = img.width * escala;
        c.height = img.height * escala;

        c.getContext("2d").drawImage(
          img,
          0,
          0,
          c.width,
          c.height
        );

        foto = c.toDataURL("image/jpeg", 0.7);

        $("preview").src = foto;
        $("preview").style.display = "block";
        $("removerFoto").style.display = "inline-block";
      };

      img.src = leitor.result;
    };

    leitor.readAsDataURL(arquivo);
  }

  $("btnCamera").onclick = () => {
    $("inCamera").click();
  };

  $("btnGaleria").onclick = () => {
    $("inGaleria").click();
  };

  $("inCamera").onchange = e => {
    lerFoto(e.target.files[0]);
  };

  $("inGaleria").onchange = e => {
    lerFoto(e.target.files[0]);
  };

  $("removerFoto").onclick = () => {

    foto = null;

    $("preview").style.display = "none";
    $("removerFoto").style.display = "none";

    $("inCamera").value = "";
    $("inGaleria").value = "";
  };

  // ---------- LOCALIZAÇÃO ATUAL ----------

  $("btnLoc").onclick = () => {

    const st = $("statusLoc");

    if (!navigator.geolocation) {

      st.textContent =
        "Seu navegador não permite geolocalização. Informe manualmente.";

      return;
    }

    st.className = "";
    st.textContent = "Buscando sua localização...";

    navigator.geolocation.getCurrentPosition(

      pos => {

        latitudeAtual = pos.coords.latitude;
        longitudeAtual = pos.coords.longitude;

        usouLocalizacaoAtual = true;

        st.className = "ok";
        st.textContent = "✓ Localização atual selecionada";

        console.log("Latitude:", latitudeAtual);
        console.log("Longitude:", longitudeAtual);
        console.log(
          "Precisão:",
          pos.coords.accuracy,
          "metros"
        );
      },

      erro => {

        console.error("Erro de localização:", erro);

        usouLocalizacaoAtual = false;
        latitudeAtual = null;
        longitudeAtual = null;

        st.className = "";

        st.textContent =
          "Não foi possível obter a localização. Informe o endereço abaixo.";
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // ---------- ENDEREÇO MANUAL ----------
  // Se o usuário começar a preencher o endereço,
  // consideramos que ele quer usar o endereço manual.

  ["cep", "rua", "numero", "bairro", "complemento"].forEach(id => {

    $(id).addEventListener("input", () => {

      usouLocalizacaoAtual = false;
      latitudeAtual = null;
      longitudeAtual = null;

      $("statusLoc").textContent = "";
      $("statusLoc").className = "";
    });
  });

  // ---------- PUBLICAR ----------

  $("publicar").onclick = async () => {

    const descricao = $("descricao").value.trim();

    const cep = $("cep").value.trim();
    const rua = $("rua").value.trim();
    const numero = $("numero").value.trim();
    const bairro = $("bairro").value.trim();
    const complemento = $("complemento").value.trim();

    const erro = t => {
      $("erro").textContent = t;
    };

    $("erro").textContent = "";

    // ---------- VALIDAÇÕES BÁSICAS ----------

    if (!categoriaEscolhida) {
      return erro("Escolha uma categoria.");
    }

    if (!descricao) {
      return erro("Escreva uma descrição.");
    }

    // ---------- LOCALIZAÇÃO ATUAL ----------

    if (usouLocalizacaoAtual) {

      if (
        latitudeAtual === null ||
        longitudeAtual === null
      ) {
        return erro(
          "Não foi possível obter sua localização. Tente novamente."
        );
      }

    }

    // ---------- ENDEREÇO MANUAL ----------

    else {

      if (!cep) {
        return erro("Informe o CEP.");
      }

      if (!rua) {
        return erro("Informe a rua.");
      }

      if (!numero) {
        return erro("Informe o número.");
      }

      // Remove caracteres que não sejam números do CEP
      const cepLimpo = cep.replace(/\D/g, "");

      if (cepLimpo.length !== 8) {
        return erro("Informe um CEP válido.");
      }

      // ---------- CONSULTA DO CEP ----------

      $("publicar").disabled = true;
      $("publicar").textContent = "LOCALIZANDO...";

      try {

        const respostaCep = await fetch(
          `https://viacep.com.br/ws/${cepLimpo}/json/`
        );

        if (!respostaCep.ok) {
          throw new Error("Falha ao consultar CEP.");
        }

        const dadosCep = await respostaCep.json();

        if (dadosCep.erro) {
          throw new Error("CEP não encontrado.");
        }

        // ---------- MONTA ENDEREÇO COMPLETO ----------

        const cidade = dadosCep.localidade || "";
        const estado = dadosCep.uf || "";

        const bairroFinal =
          bairro || dadosCep.bairro || "";

        const ruaFinal =
          rua || dadosCep.logradouro || "";

        const partesEndereco = [
          `${ruaFinal}, ${numero}`,
          bairroFinal,
          cidade,
          estado,
          cepLimpo,
          "Brasil"
        ].filter(Boolean);

        const enderecoCompleto =
          partesEndereco.join(", ");

        console.log(
          "Endereço para localização:",
          enderecoCompleto
        );

        // ---------- GEOCODIFICAÇÃO ----------

        // PRIMEIRA TENTATIVA:
        // usa o Photon para localizar o endereço

        const enderecoBusca = [
          `${ruaFinal} ${numero}`,
          bairroFinal,
          cidade,
          estado,
          "Brasil"
        ].filter(Boolean).join(", ");

        const parametrosPhoton = new URLSearchParams({
          q: enderecoBusca,
          limit: "1"
        });

        const respostaPhoton = await fetch(
          `https://photon.komoot.io/api/?${parametrosPhoton.toString()}`
        );

        if (respostaPhoton.ok) {

          const dadosPhoton = await respostaPhoton.json();

          if (
            dadosPhoton.features &&
            dadosPhoton.features.length > 0 &&
            dadosPhoton.features[0].geometry &&
            Array.isArray(
              dadosPhoton.features[0].geometry.coordinates
            )
          ) {

            const coordenadas =
              dadosPhoton.features[0].geometry.coordinates;

            longitudeAtual =
              parseFloat(coordenadas[0]);

            latitudeAtual =
              parseFloat(coordenadas[1]);
          }
        }

        // SEGUNDA TENTATIVA:
        // se o Photon não encontrar, tenta o Nominatim

        if (
          latitudeAtual === null ||
          longitudeAtual === null ||
          isNaN(latitudeAtual) ||
          isNaN(longitudeAtual)
        ) {

          const parametrosNominatim = new URLSearchParams({
            q: enderecoBusca,
            format: "jsonv2",
            limit: "1",
            addressdetails: "1",
            countrycodes: "br"
          });

          const respostaNominatim = await fetch(
            `https://nominatim.openstreetmap.org/search?${parametrosNominatim.toString()}`
          );

          if (respostaNominatim.ok) {

            const resultadosNominatim =
              await respostaNominatim.json();

            if (resultadosNominatim.length) {

              latitudeAtual =
                parseFloat(resultadosNominatim[0].lat);

              longitudeAtual =
                parseFloat(resultadosNominatim[0].lon);
            }
          }
        }

        // TERCEIRA TENTATIVA:
        // procura somente pela rua, bairro e cidade

        if (
          latitudeAtual === null ||
          longitudeAtual === null ||
          isNaN(latitudeAtual) ||
          isNaN(longitudeAtual)
        ) {

          const enderecoSemNumero = [
            ruaFinal,
            bairroFinal,
            cidade,
            estado,
            "Brasil"
          ].filter(Boolean).join(", ");

          const parametrosRua = new URLSearchParams({
            q: enderecoSemNumero,
            format: "jsonv2",
            limit: "1",
            addressdetails: "1",
            countrycodes: "br"
          });

          const respostaRua = await fetch(
            `https://nominatim.openstreetmap.org/search?${parametrosRua.toString()}`
          );

          if (respostaRua.ok) {

            const resultadosRua =
              await respostaRua.json();

            if (resultadosRua.length) {

              latitudeAtual =
                parseFloat(resultadosRua[0].lat);

              longitudeAtual =
                parseFloat(resultadosRua[0].lon);
            }
          }
        }

        // Se nenhuma tentativa encontrou o endereço

        if (
          latitudeAtual === null ||
          longitudeAtual === null ||
          isNaN(latitudeAtual) ||
          isNaN(longitudeAtual)
        ) {
          throw new Error(
            "Não foi possível encontrar esse endereço no mapa. Confira o CEP, a rua, o número e o bairro."
          );
        }

        usouLocalizacaoAtual = false;

        // ---------- ENDEREÇO QUE SERÁ MOSTRADO ----------

        const localizacao = [
          `${ruaFinal}, ${numero}`,
          bairroFinal,
          `${cidade} - ${estado}`
        ]
          .filter(Boolean)
          .join(", ");

        // ---------- SALVAR OCORRÊNCIA ----------

        const cat = CATEGORIAS[categoriaEscolhida];

        const nova = {

          id:
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 6),

          categoria: cat.nome,

          emoji: cat.emoji,

          descricao: descricao,

          latitude: latitudeAtual,

          longitude: longitudeAtual,

          foto: foto,

          localizacao: localizacao
        };

        try {

          const lista = carregar();

          lista.push(nova);

          salvar(lista);

        } catch (e) {

          $("publicar").disabled = false;
          $("publicar").textContent = "PUBLICAR ALERTA";

          return erro(
            "Não foi possível salvar (armazenamento cheio). Tente sem foto ou exclua alertas antigos."
          );
        }

        location.href = "index.html";

      } catch (e) {

        console.error(e);

        $("publicar").disabled = false;
        $("publicar").textContent = "PUBLICAR ALERTA";

        return erro(
          e.message ||
          "Não foi possível localizar esse endereço."
        );
      }

      return;
    }

    // ---------- SALVAR COM LOCALIZAÇÃO ATUAL ----------

    const cat = CATEGORIAS[categoriaEscolhida];

    const nova = {

      id:
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 6),

      categoria: cat.nome,

      emoji: cat.emoji,

      descricao: descricao,

      latitude: latitudeAtual,

      longitude: longitudeAtual,

      foto: foto,

      localizacao: "Minha localização atual"
    };

    try {

      const lista = carregar();

      lista.push(nova);

      salvar(lista);

    } catch (e) {

      return erro(
        "Não foi possível salvar (armazenamento cheio). Tente sem foto ou exclua alertas antigos."
      );
    }

    location.href = "index.html";
  };
}

// ---------- 4. MAPA ----------

function iniciarMapa() {

  const mapa = L
    .map("mapa")
    .setView([-14.2, -51.9], 4);

  L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }
  ).addTo(mapa);

  const ocorrencias = carregar();

  const pontos = [];

  const marcadores = {};

  const htmlPopup = o => `
    <b>${o.emoji} ${esc(o.categoria)}</b>
    <br>
    ${esc(o.descricao)}

    ${blocoConfirmacao(o)}

    <button class="del" data-id="${o.id}">
      Excluir
    </button>
  `;

  ocorrencias.forEach(o => {

    const icone = L.divIcon({

      className: "",

      html: `
        <div class="marcador">
          ${o.emoji}
          <span class="contador-mapa">
            ${o.confirmacoes}
          </span>
        </div>
      `,

      iconSize: [42, 42],

      iconAnchor: [21, 21]
    });

    marcadores[o.id] = L
      .marker(
        [o.latitude, o.longitude],
        { icon: icone }
      )
      .addTo(mapa)
      .bindPopup(htmlPopup(o));

    pontos.push([
      o.latitude,
      o.longitude
    ]);
  });

  if (pontos.length === 1) {

    mapa.setView(
      pontos[0],
      16
    );

  } else if (pontos.length > 1) {

    mapa.fitBounds(
      pontos,
      {
        padding: [60, 60]
      }
    );
  }

  document
    .getElementById("mapa")
    .addEventListener("click", e => {

      // Confirmar ocorrência
      const idConf =
        e.target.dataset &&
        e.target.dataset.confirmar;

      if (idConf) {

        confirmar(idConf);

        const o =
          carregar().find(
            x => x.id === idConf
          );

        if (o) {

          marcadores[idConf]
            .setPopupContent(
              htmlPopup(o)
            );
        }

        return;
      }

      // Excluir ocorrência
      const id =
        e.target.dataset &&
        e.target.dataset.id;

      if (
        id &&
        confirm("Excluir este alerta?")
      ) {

        excluir(id);

        location.reload();
      }
    });
}

// ---------- 5. QUAL PÁGINA ESTOU? ----------

const pagina =
  document.body.dataset.pagina;

if (pagina === "home") {
  iniciarHome();
}

if (pagina === "reportar") {
  iniciarReportar();
}

if (pagina === "mapa") {
  iniciarMapa();
}