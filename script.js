/* =========================================================
   AlertaBairro — versão de demonstração/piloto
   Armazenamento: localStorage
   Mapa: Leaflet + OpenStreetMap
   CEP: ViaCEP
   Geocodificação: Photon com alternativa Nominatim
   ========================================================= */

const CHAVE = "alertabairro_ocorrencias";
const CHAVE_CONF = "alertabairro_confirmacoes";

const CATEGORIAS = {
  buraco: { nome: "Buraco", emoji: "🕳️" },
  iluminacao: { nome: "Iluminação", emoji: "💡" },
  lixo: { nome: "Lixo", emoji: "🗑️" },
  alagamento: { nome: "Alagamento", emoji: "🌧️" },
  outro: { nome: "Outro", emoji: "⚠️" }
};

const STATUS = ["Recebido", "Em análise", "Resolvido"];
const $ = id => document.getElementById(id);

// ---------- DADOS E FUNÇÕES GERAIS ----------

function carregar() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE)) || [];

    return lista.map(ocorrencia => ({
      ...ocorrencia,
      confirmacoes: Number(ocorrencia.confirmacoes) || 0,
      status: STATUS.includes(ocorrencia.status)
        ? ocorrencia.status
        : "Recebido"
    }));
  } catch (erro) {
    console.error("Não foi possível ler as ocorrências:", erro);
    return [];
  }
}

function salvar(lista) {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
}

function idsConfirmados() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CONF)) || [];
  } catch (erro) {
    return [];
  }
}

function confirmar(id) {
  const jaConfirmados = idsConfirmados();

  if (jaConfirmados.includes(id)) return false;

  const lista = carregar();
  const ocorrencia = lista.find(item => item.id === id);

  if (!ocorrencia) return false;

  ocorrencia.confirmacoes += 1;
  salvar(lista);

  jaConfirmados.push(id);
  localStorage.setItem(CHAVE_CONF, JSON.stringify(jaConfirmados));

  return true;
}

function excluir(id) {
  salvar(carregar().filter(item => item.id !== id));

  const restantes = idsConfirmados().filter(itemId => itemId !== id);

  localStorage.setItem(CHAVE_CONF, JSON.stringify(restantes));
}

function escaparHTML(valor) {
  const elemento = document.createElement("div");
  elemento.textContent = valor ?? "";
  return elemento.innerHTML;
}

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function classeStatus(status) {
  if (status === "Em análise") return "status-analise";
  if (status === "Resolvido") return "status-resolvido";

  return "status-recebido";
}

function etiquetaStatus(status) {
  return `<span class="status-pill ${classeStatus(status)}">${escaparHTML(status)}</span>`;
}

function atualizarStatus(id, novoStatus) {
  if (!STATUS.includes(novoStatus)) return;

  const lista = carregar();
  const ocorrencia = lista.find(item => item.id === id);

  if (!ocorrencia) return;

  ocorrencia.status = novoStatus;
  salvar(lista);
}

// ---------- TELA INICIAL ----------

function iniciarHome() {
  const listaElemento = $("lista");
  const campoBusca = $("busca");
  const filtroCategoria = $("filtroCategoria");
  const filtroStatus = $("filtroStatus");
  const estatisticas = $("estatisticas");

  function desenharEstatisticas() {
    const ocorrencias = carregar();

    const totalConfirmacoes = ocorrencias.reduce(
      (soma, item) => soma + item.confirmacoes,
      0
    );

    const resolvidos = ocorrencias.filter(
      item => item.status === "Resolvido"
    ).length;

    const emAnalise = ocorrencias.filter(
      item => item.status === "Em análise"
    ).length;

    estatisticas.innerHTML = `
      <div class="stat">
        <strong>${ocorrencias.length}</strong>
        <span>ocorrências</span>
      </div>

      <div class="stat">
        <strong>${totalConfirmacoes}</strong>
        <span>confirmações</span>
      </div>

      <div class="stat">
        <strong>${resolvidos}</strong>
        <span>resolvidos</span>
      </div>

      <div class="stat">
        <strong>${emAnalise}</strong>
        <span>em análise</span>
      </div>
    `;
  }

  function desenhar() {
    const termo = campoBusca.value.trim().toLowerCase();
    const categoria = filtroCategoria.value;
    const status = filtroStatus.value;

    const ocorrencias = carregar()
      .filter(item => {
        const texto = `${item.categoria} ${item.descricao} ${item.localizacao}`.toLowerCase();

        return (!termo || texto.includes(termo))
          && (categoria === "todas" || item.categoria === categoria)
          && (status === "todos" || item.status === status);
      })
      .sort((a, b) => {
        if (b.confirmacoes !== a.confirmacoes) {
          return b.confirmacoes - a.confirmacoes;
        }

        return String(b.id).localeCompare(String(a.id));
      });

    desenharEstatisticas();

    if (ocorrencias.length === 0) {
      listaElemento.innerHTML = `
        <div class="vazio">
          Nenhum alerta encontrado com esses filtros.
        </div>
      `;

      return;
    }

    listaElemento.innerHTML = ocorrencias.map(item => {
      const jaConfirmou = idsConfirmados().includes(item.id);

      return `
        <article class="card">

          <div class="topo">
            <span class="emoji">${item.emoji}</span>

            <div>
              <b>${escaparHTML(item.categoria)}</b><br>
              ${etiquetaStatus(item.status)}
            </div>
          </div>

          <p>${escaparHTML(item.descricao)}</p>

          <small>
            📍 ${escaparHTML(item.localizacao || "Localização não informada")}
          </small>

          ${item.foto
            ? `<img src="${item.foto}" alt="Foto da ocorrência">`
            : ""
          }

          <div class="conf">
            👍 ${item.confirmacoes}
            ${item.confirmacoes === 1 ? "confirmação" : "confirmações"}
          </div>

          <div class="card-actions">

            <button
              class="btn-conf ${jaConfirmou ? "feito" : ""}"
              data-confirmar="${item.id}"
              ${jaConfirmou ? "disabled" : ""}
            >
              ${jaConfirmou ? "✓ Confirmado" : "👍 Confirmar problema"}
            </button>

            <select data-status="${item.id}" aria-label="Alterar status">
              ${STATUS.map(statusItem => `
                <option
                  value="${statusItem}"
                  ${statusItem === item.status ? "selected" : ""}
                >
                  ${statusItem}
                </option>
              `).join("")}
            </select>

          </div>

          <button class="del" data-excluir="${item.id}">
            Excluir
          </button>

        </article>
      `;
    }).join("");
  }

  [campoBusca, filtroCategoria, filtroStatus].forEach(elemento => {
    elemento.addEventListener("input", desenhar);
    elemento.addEventListener("change", desenhar);
  });

  listaElemento.addEventListener("click", evento => {
    const botaoConfirmar = evento.target.closest("[data-confirmar]");

    if (botaoConfirmar) {
      confirmar(botaoConfirmar.dataset.confirmar);
      desenhar();
      return;
    }

    const botaoExcluir = evento.target.closest("[data-excluir]");

    if (botaoExcluir && confirm("Excluir esta ocorrência?")) {
      excluir(botaoExcluir.dataset.excluir);
      desenhar();
    }
  });

  listaElemento.addEventListener("change", evento => {
    const seletor = evento.target.closest("[data-status]");

    if (!seletor) return;

    atualizarStatus(seletor.dataset.status, seletor.value);
    desenhar();
  });

  desenhar();
}

// ---------- TELA DE REGISTRO ----------

function iniciarReportar() {
  let categoriaEscolhida = null;
  let foto = null;
  let usouGPS = false;
  let latitude = null;
  let longitude = null;

  // Cria os botões de categoria.
  $("cats").innerHTML = Object.entries(CATEGORIAS).map(([chave, categoria]) => `
    <button type="button" class="cat" data-cat="${chave}">
      <span>${categoria.emoji}</span>${categoria.nome}
    </button>
  `).join("");

  $("cats").addEventListener("click", evento => {
    const botao = evento.target.closest("[data-cat]");

    if (!botao) return;

    categoriaEscolhida = botao.dataset.cat;

    document.querySelectorAll(".cat").forEach(elemento => {
      elemento.classList.toggle("ativa", elemento === botao);
    });
  });

  // Redimensiona a foto antes de guardá-la no navegador.
  function lerFoto(arquivo) {
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      $("erro").textContent = "Selecione um arquivo de imagem.";
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      const imagem = new Image();

      imagem.onload = () => {
        const tamanhoMaximo = 1000;

        const escala = Math.min(
          1,
          tamanhoMaximo / Math.max(imagem.width, imagem.height)
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.round(imagem.width * escala);
        canvas.height = Math.round(imagem.height * escala);

        canvas.getContext("2d").drawImage(
          imagem,
          0,
          0,
          canvas.width,
          canvas.height
        );

        foto = canvas.toDataURL("image/jpeg", 0.72);

        $("preview").src = foto;
        $("preview").style.display = "block";
        $("removerFoto").style.display = "inline-block";
      };

      imagem.onerror = () => {
        $("erro").textContent = "Não foi possível carregar essa imagem.";
      };

      imagem.src = leitor.result;
    };

    leitor.onerror = () => {
      $("erro").textContent = "Não foi possível ler o arquivo escolhido.";
    };

    leitor.readAsDataURL(arquivo);
  }

  $("btnCamera").onclick = () => $("inCamera").click();
  $("btnGaleria").onclick = () => $("inGaleria").click();

  $("inCamera").onchange = evento => lerFoto(evento.target.files[0]);
  $("inGaleria").onchange = evento => lerFoto(evento.target.files[0]);

  $("removerFoto").onclick = () => {
    foto = null;

    $("preview").src = "";
    $("preview").style.display = "none";
    $("removerFoto").style.display = "none";

    $("inCamera").value = "";
    $("inGaleria").value = "";
  };

  $("descricao").addEventListener("input", () => {
    $("contadorDescricao").textContent = $("descricao").value.length;
  });

  // Seleciona a localização do dispositivo.
  $("btnLoc").onclick = () => {
    const status = $("statusLoc");

    if (!navigator.geolocation) {
      status.textContent = "Seu navegador não permite geolocalização. Informe o endereço abaixo.";
      return;
    }

    status.className = "status-msg";
    status.textContent = "Buscando sua localização...";

    navigator.geolocation.getCurrentPosition(
      posicao => {
        latitude = posicao.coords.latitude;
        longitude = posicao.coords.longitude;
        usouGPS = true;

        status.className = "status-msg ok";

        status.textContent =
          `✓ Localização selecionada (precisão aproximada: ${Math.round(posicao.coords.accuracy)} m)`;
      },

      erro => {
        console.error("Erro de geolocalização:", erro);

        usouGPS = false;
        latitude = null;
        longitude = null;

        status.className = "status-msg";

        status.textContent =
          "Não foi possível obter sua localização. Informe o endereço abaixo.";
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Ao editar o endereço, troca a opção de GPS pela localização manual.
  ["cep", "rua", "numero", "bairro", "complemento"].forEach(id => {
    $(id).addEventListener("input", () => {
      usouGPS = false;
      latitude = null;
      longitude = null;

      $("statusLoc").textContent = "";
      $("statusLoc").className = "status-msg";
    });
  });

  // Formata o CEP como 00000-000.
  $("cep").addEventListener("input", () => {
    let cep = $("cep").value.replace(/\D/g, "").slice(0, 8);

    if (cep.length > 5) {
      cep = `${cep.slice(0, 5)}-${cep.slice(5)}`;
    }

    $("cep").value = cep;
  });

  // Procura coordenadas por endereço: primeiro Photon, depois Nominatim.
  async function buscarCoordenadas(endereco) {
    const urlPhoton =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(endereco)}&limit=1`;

    try {
      const respostaPhoton = await fetch(urlPhoton);

      if (respostaPhoton.ok) {
        const dadosPhoton = await respostaPhoton.json();

        const coordenadas =
          dadosPhoton?.features?.[0]?.geometry?.coordinates;

        if (Array.isArray(coordenadas) && coordenadas.length >= 2) {
          return {
            latitude: Number(coordenadas[1]),
            longitude: Number(coordenadas[0])
          };
        }
      }
    } catch (erro) {
      console.warn(
        "Photon não respondeu; tentando serviço alternativo.",
        erro
      );
    }

    const parametros = new URLSearchParams({
      q: endereco,
      format: "jsonv2",
      limit: "1",
      addressdetails: "1",
      countrycodes: "br"
    });

    const respostaNominatim = await fetch(
      `https://nominatim.openstreetmap.org/search?${parametros}`
    );

    if (respostaNominatim.ok) {
      const resultados = await respostaNominatim.json();

      if (resultados.length > 0) {
        return {
          latitude: Number(resultados[0].lat),
          longitude: Number(resultados[0].lon)
        };
      }
    }

    throw new Error(
      "Não foi possível encontrar esse endereço no mapa. Confira o CEP, a rua, o número e o bairro."
    );
  }

  // Publica uma ocorrência com GPS ou endereço informado.
  $("publicar").onclick = async () => {
    const mostrarErro = mensagem => {
      $("erro").textContent = mensagem;
    };

    $("erro").textContent = "";

    const descricao = $("descricao").value.trim();

    if (!categoriaEscolhida) {
      return mostrarErro("Escolha uma categoria.");
    }

    if (!descricao) {
      return mostrarErro("Escreva uma descrição.");
    }

    const botaoPublicar = $("publicar");

    botaoPublicar.disabled = true;
    botaoPublicar.textContent = "PUBLICANDO...";

    try {
      let localizacao = "Minha localização atual";

      if (!usouGPS) {
        const cep = $("cep").value.replace(/\D/g, "");
        const rua = $("rua").value.trim();
        const numero = $("numero").value.trim();
        const bairroDigitado = $("bairro").value.trim();
        const complemento = $("complemento").value.trim();

        if (cep.length !== 8) {
          throw new Error("Informe um CEP válido.");
        }

        if (!rua) {
          throw new Error("Informe a rua.");
        }

        if (!numero) {
          throw new Error("Informe o número.");
        }

        botaoPublicar.textContent = "CONSULTANDO CEP...";

        const respostaCEP = await fetch(
          `https://viacep.com.br/ws/${cep}/json/`
        );

        if (!respostaCEP.ok) {
          throw new Error("Não foi possível consultar o CEP.");
        }

        const dadosCEP = await respostaCEP.json();

        if (dadosCEP.erro) {
          throw new Error("CEP não encontrado.");
        }

        const cidade = dadosCEP.localidade || "";
        const estado = dadosCEP.uf || "";
        const bairro = bairroDigitado || dadosCEP.bairro || "";
        const ruaFinal = rua || dadosCEP.logradouro || "";

        const endereco = [
          `${ruaFinal} ${numero}`,
          bairro,
          cidade,
          estado,
          "Brasil"
        ].filter(Boolean).join(", ");

        botaoPublicar.textContent = "LOCALIZANDO NO MAPA...";

        let coordenadas;

        try {
          coordenadas = await buscarCoordenadas(endereco);
        } catch (erroCompleto) {
          // Segunda pesquisa sem número: alguns serviços não localizam o imóvel exato.
          const enderecoSemNumero = [
            ruaFinal,
            bairro,
            cidade,
            estado,
            "Brasil"
          ].filter(Boolean).join(", ");

          coordenadas = await buscarCoordenadas(enderecoSemNumero);
        }

        latitude = coordenadas.latitude;
        longitude = coordenadas.longitude;

        localizacao = [
          `${ruaFinal}, ${numero}`,
          bairro,
          `${cidade} - ${estado}`,
          complemento
        ].filter(Boolean).join(", ");
      }

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        throw new Error("A localização não possui coordenadas válidas.");
      }

      const categoria = CATEGORIAS[categoriaEscolhida];

      const novaOcorrencia = {
        id: novoId(),
        categoria: categoria.nome,
        emoji: categoria.emoji,
        descricao,
        latitude,
        longitude,
        foto,
        localizacao,
        complemento: $("complemento").value.trim(),
        status: "Recebido",
        confirmacoes: 0,
        criadoEm: new Date().toISOString()
      };

      const ocorrencias = carregar();

      ocorrencias.push(novaOcorrencia);

      salvar(ocorrencias);

      window.location.href = "index.html";

    } catch (erro) {
      console.error("Erro ao publicar ocorrência:", erro);

      mostrarErro(
        erro.message || "Não foi possível publicar o alerta."
      );

      botaoPublicar.disabled = false;
      botaoPublicar.textContent = "PUBLICAR ALERTA";
    }
  };
}

// ---------- MAPA DE OCORRÊNCIAS ----------

function iniciarMapa() {
  const mapa = L.map("mapa").setView([-5.7945, -35.211], 12);

  const grupoMarcadores = L.featureGroup().addTo(mapa);

  let marcadorUsuario = null;

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  }).addTo(mapa);

  function desenharMarcadores() {
    grupoMarcadores.clearLayers();

    const categoria = $("mapFiltroCategoria").value;
    const status = $("mapFiltroStatus").value;

    const ocorrencias = carregar().filter(item =>
      (categoria === "todas" || item.categoria === categoria)
      && (status === "todos" || item.status === status)
    );

    ocorrencias.forEach(item => {
      const icone = L.divIcon({
        className: "",

        html: `
          <div class="marcador">
            ${item.emoji}
            <span class="contador-mapa">${item.confirmacoes}</span>
          </div>
        `,

        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      const jaConfirmou = idsConfirmados().includes(item.id);

      const popup = `
        <div class="popup-card">

          <h3>${item.emoji} ${escaparHTML(item.categoria)}</h3>

          ${etiquetaStatus(item.status)}

          <p>${escaparHTML(item.descricao)}</p>

          <div class="popup-location">
            📍 ${escaparHTML(item.localizacao || "Localização não informada")}
          </div>

          ${item.foto
            ? `<img class="popup-photo" src="${item.foto}" alt="Foto da ocorrência">`
            : ""
          }

          <div class="conf">
            👍 ${item.confirmacoes}
            ${item.confirmacoes === 1 ? "confirmação" : "confirmações"}
          </div>

          <button
            class="btn-conf ${jaConfirmou ? "feito" : ""}"
            data-map-confirmar="${item.id}"
            ${jaConfirmou ? "disabled" : ""}
          >
            ${jaConfirmou ? "✓ Confirmado" : "👍 Confirmar problema"}
          </button>

          <button class="del" data-map-excluir="${item.id}">
            Excluir
          </button>

        </div>
      `;

      L.marker(
        [item.latitude, item.longitude],
        { icon: icone }
      )
        .bindPopup(popup)
        .addTo(grupoMarcadores);
    });

    if (ocorrencias.length === 1) {
      mapa.setView(
        [ocorrencias[0].latitude, ocorrencias[0].longitude],
        16
      );

    } else if (ocorrencias.length > 1) {
      mapa.fitBounds(grupoMarcadores.getBounds(), {
        padding: [60, 60],
        maxZoom: 16
      });
    }
  }

  $("mapFiltroCategoria").addEventListener(
    "change",
    desenharMarcadores
  );

  $("mapFiltroStatus").addEventListener(
    "change",
    desenharMarcadores
  );

  $("btnMinhaPosicao").onclick = () => {
    if (!navigator.geolocation) {
      alert("Seu navegador não permite geolocalização.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      posicao => {
        if (marcadorUsuario) {
          mapa.removeLayer(marcadorUsuario);
        }

        marcadorUsuario = L.circleMarker(
          [posicao.coords.latitude, posicao.coords.longitude],
          { radius: 9 }
        )
          .addTo(mapa)
          .bindPopup("📍 Você está aqui")
          .openPopup();

        mapa.setView(
          [posicao.coords.latitude, posicao.coords.longitude],
          16
        );
      },

      erro => {
        console.error("Não foi possível obter a posição:", erro);

        alert(
          "Não foi possível obter sua localização. Confira a permissão do navegador."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Os botões dos popups são tratados no elemento do mapa.
  $("mapa").addEventListener("click", evento => {
    const botaoConfirmar = evento.target.closest("[data-map-confirmar]");

    if (botaoConfirmar) {
      confirmar(botaoConfirmar.dataset.mapConfirmar);
      desenharMarcadores();
      return;
    }

    const botaoExcluir = evento.target.closest("[data-map-excluir]");

    if (
      botaoExcluir &&
      confirm("Excluir esta ocorrência?")
    ) {
      excluir(botaoExcluir.dataset.mapExcluir);
      desenharMarcadores();
    }
  });

  desenharMarcadores();
}

// ---------- INICIALIZAÇÃO ----------

const paginaAtual = document.body.dataset.pagina;

if (paginaAtual === "home") iniciarHome();
if (paginaAtual === "reportar") iniciarReportar();
if (paginaAtual === "mapa") iniciarMapa();