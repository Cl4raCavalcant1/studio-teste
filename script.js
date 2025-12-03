/* ===========================================================
   LOCAL STORAGE HELPERS
=========================================================== */
function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
}
function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/* Bancos de dados */
let AG = load("albany_agenda");
let VD = load("albany_vendas");
let CL = load("albany_clientes");
let EV = load("albany_eventos");

/* ===========================================================
   NAVEGAÇÃO
=========================================================== */
function nav(p) {
    if (p === "home") renderHome();
    if (p === "agenda") renderAgenda();
    if (p === "clientes") renderClientes();
    // Ajuste: aceita tanto 'vendas' quanto 'pagamentos' para evitar erro no menu
    if (p === "vendas" || p === "pagamentos") renderPagamentos(); 
    if (p === "dashboard") renderDashboard();
    if (p === "eventos") renderEventos();
}

/* Alternar tema */
function toggleTheme() {
    const t = document.body.getAttribute("data-theme");
    document.body.setAttribute("data-theme", t === "light" ? "dark" : "light");
}

/* ===========================================================
   HOME — Mostra os agendamentos de hoje + NOTIFICAÇÃO + Eventos
=========================================================== */
function renderHome() {
    const hoje = new Date().toISOString().slice(0, 10);
    const content = document.getElementById('content');

    /* Agendamentos do dia */
    const agHoje = AG.filter(a => a.data === hoje)
                     .sort((a,b)=> (a.hora || "00:00").localeCompare(b.hora || "00:00"));

    /* Eventos do dia */
    const evHoje = EV.filter(e => e.data === hoje)
                     .sort((a,b)=> (a.hora || "00:00").localeCompare(b.hora || "00:00"));

    let html = `
    <div class='card'>
        <h2>Bem-vinda, Albany!</h2>
        <p>Resumo do dia (${hoje}):</p>
    `;

    /* EVENTOS DO DIA */
    if (evHoje.length) {
        html += `<h3 style="margin-top:20px">🎪 Eventos de Hoje</h3>`;
        evHoje.forEach(e => {
            html += `
            <div style="padding:12px;border-left:6px solid var(--accent);
                        border-radius:10px;background:var(--card);margin-bottom:10px">
                <strong>${e.diaInteiro ? "Dia inteiro" : e.hora}</strong> — ${e.cliente}<br>
                <small>${e.tipo || 'Evento'}</small>
            </div>
            `;
        });
    } else {
        html += `<p style="margin-top:20px"><em>Nenhum evento hoje.</em></p>`;
    }

    /* AGENDAMENTOS DO DIA */
    html += `<h3 style="margin-top:20px">📷 Agendamentos de Hoje</h3>`;

    if (!agHoje.length) {
        html += `<p>Nenhum agendamento hoje.</p></div>`;
    } else {
        agHoje.forEach(a => {
            html += `
                <div style="padding:12px;border-left:5px solid var(--accent);
                            margin:10px 0;border-radius:10px;background:var(--card)">
                    <strong>${a.hora}</strong> — ${a.clienteNome || a.nome}<br>
                    <span class="status-pill st-${a.status}">${a.status}</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    content.innerHTML = html;

    /* NOTIFICAÇÃO (opcional) */
    if (Notification.permission !== "denied") {
        Notification.requestPermission().then(p => {
            if (p === "granted" && (agHoje.length || evHoje.length)) {
                let corpo = "";
                if (evHoje.length) {
                    corpo += "Eventos:\n" + evHoje.map(e =>
                        `${e.diaInteiro ? "Dia inteiro" : e.hora} — ${e.cliente} (${e.tipo || ''})`
                    ).join("\n") + "\n\n";
                }
                if (agHoje.length) {
                    corpo += "Agendamentos:\n" + agHoje.map(a =>
                        `${a.hora} — ${a.clienteNome}`
                    ).join("\n");
                }
                new Notification("Resumo do dia", { body: corpo });
            }
        });
    }
}

/* ===========================================================
   AGENDA
=========================================================== */
function renderAgenda() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>📅 Novo Agendamento</h3>

        <label>Cliente</label>
        <select id="ag_cliente">
            <option value="">Selecione</option>
            ${CL.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("")}
        </select>

        <label>Data</label>
        <input type="date" id="ag_data" onchange="carregarHorarios()">

        <label>Horário</label>
        <select id="ag_hora"></select>

        <label>Status</label>
        <select id="ag_status">
            <option value="confirmado">Confirmado</option>
            <option value="cancelado">Cancelado</option>
            <option value="remarcado">Remarcado</option>
        </select>

        <div class="row">
            <button class="btn" onclick="saveAgenda()">Salvar</button>
            <button class="btn ghost" onclick="renderAgenda()">Limpar</button>
        </div>
    </div>

    <div class='card'>
        <h3>📌 Agendamentos do Dia</h3>
        <input id="ag_search" placeholder="Pesquisar cliente..." oninput="showAgendaList()" />
        <input type="date" id="ag_filter" onchange="showAgendaList()">
        <div id="ag_list" style="margin-top:15px">Selecione uma data</div>
    </div>
    `;
}

/* Horários 09:00 → 20:00 */
const HORARIOS = [];
for (let h = 9; h <= 20; h++) {
    HORARIOS.push(String(h).padStart(2, "0") + ":00");
}

function carregarHorarios() {
    const data = document.getElementById("ag_data").value;
    if (!data) return;
    const agendados = AG.filter(a => a.data === data).map(a => a.hora);
    const eventosHora = EV.filter(e => e.data === data && !e.diaInteiro).map(e => e.hora);
    const diaInteiroEvento = EV.some(e => e.data === data && e.diaInteiro);

    let html = `<option value="">Selecione</option>`;
    HORARIOS.forEach(h => {
        if (diaInteiroEvento || agendados.includes(h) || eventosHora.includes(h)) {
            html += `<option disabled>${h} — Ocupado</option>`;
        } else {
            html += `<option value="${h}">${h}</option>`;
        }
    });

    document.getElementById("ag_hora").innerHTML = html;
}

function saveAgenda() {
    const cliente = document.getElementById("ag_cliente").value;
    const data = document.getElementById("ag_data").value;
    const hora = document.getElementById("ag_hora").value;
    const status = document.getElementById("ag_status").value;

    if (!cliente || !data || !hora) {
        alert("Preencha todos os campos.");
        return;
    }

    if (EV.some(e => e.data === data && e.diaInteiro)) {
        alert("⚠️ Este dia está bloqueado por um evento de dia inteiro.");
        return;
    }
    if (EV.some(e => e.data === data && e.hora === hora)) {
        alert("⚠️ Já existe um evento neste horário.");
        return;
    }

    AG.push({
        id: Date.now(),
        clienteNome: cliente,
        data, hora, status
    });

    save("albany_agenda", AG);
    alert("Agendamento salvo!");
    showAgendaList();
}

function showAgendaList() {
    const d = document.getElementById("ag_filter").value;
    if (!d) return;

    const termo = (document.getElementById("ag_search").value || "").toLowerCase();
    const list = AG.filter(x =>
        x.data === d &&
        x.clienteNome.toLowerCase().includes(termo)
    ).sort((a,b)=> (a.hora || "00:00").localeCompare(b.hora || "00:00"));

    const agList = document.getElementById("ag_list");
    if (!list.length) {
        agList.innerHTML = "<p>Nenhum agendamento.</p>";
        return;
    }

    let html = "";
    list.forEach(a => {
        html += `
        <div style="border-left:6px solid var(--accent);padding:12px;border-radius:10px;margin-bottom:10px;background:var(--card)">
            <div style="display:flex;justify-content:space-between">
                <div>
                    <strong>${a.hora}</strong> — ${a.clienteNome}<br>
                    <span class="status-pill st-${a.status}">${a.status}</span>
                </div>
                <div style="display:flex;gap:6px">
                    <button class="btn" onclick="remarcar(${a.id})">Remarcar</button>
                    <button class="btn danger" onclick="delAgenda(${a.id})">Excluir</button>
                </div>
            </div>
        </div>`;
    });

    agList.innerHTML = html;
}

function remarcar(id) {
    const ag = AG.find(x => x.id === id);
    const novaData = prompt("Nova data (YYYY-MM-DD):", ag.data);
    const novoHora = prompt("Novo horário (HH:MM):", ag.hora);

    if (!novaData || !novoHora) return;

    if (EV.some(e => e.data === novaData && e.diaInteiro)) {
        alert("⚠️ Não é possível remarcar: dia bloqueado.");
        return;
    }
    if (EV.some(e => e.data === novaData && e.hora === novoHora)) {
        alert("⚠️ Não é possível remarcar: horário ocupado.");
        return;
    }

    ag.data = novaData;
    ag.hora = novoHora;
    ag.status = "remarcado";

    save("albany_agenda", AG);
    showAgendaList();
}

function delAgenda(id) {
    if (!confirm("Confirmar exclusão?")) return;
    AG = AG.filter(x => x.id !== id);
    save("albany_agenda", AG);
    showAgendaList();
}

/* ===========================================================
   CLIENTES
=========================================================== */
function renderClientes() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>👤 Novo Cliente</h3>
        <label>Nome</label><input id="c_nome">
        <label>Telefone</label><input id="c_tel">
        <label>Instagram</label><input id="c_insta">
        <label>Observações</label><textarea id="c_obs"></textarea>
        <button class="btn" onclick="saveCliente()">Salvar</button>
    </div>

    <div class="card">
        <h3>📄 Lista de Clientes</h3>
        <input id="c_search" placeholder="Pesquisar..." oninput="showClientes()">
        <div id="c_list"></div>
    </div>`;
    showClientes();
}

function saveCliente() {
    const nome = document.getElementById("c_nome").value.trim();
    if (!nome) return alert("Informe o nome");

    CL.push({
        id: Date.now(),
        nome: nome,
        tel: document.getElementById("c_tel").value,
        insta: document.getElementById("c_insta").value,
        obs: document.getElementById("c_obs").value
    });

    save("albany_clientes", CL);
    renderClientes();
}

function showClientes() {
    const termo = (document.getElementById("c_search").value || "").toLowerCase();
    const lista = CL.filter(c => c.nome.toLowerCase().includes(termo));
    const cList = document.getElementById("c_list");

    if (!lista.length) {
        cList.innerHTML = "<p>Nenhum cliente cadastrado.</p>";
        return;
    }

    let html = `<table><thead><tr><th>Nome</th><th>Telefone</th><th>Instagram</th><th>Ações</th></tr></thead><tbody>`;
    lista.forEach(c => {
        html += `<tr>
            <td>${c.nome}</td>
            <td>${c.tel}</td>
            <td>${c.insta}</td>
            <td><button class="btn danger" onclick="delCliente(${c.id})">Excluir</button></td>
        </tr>`;
    });
    html += "</tbody></table>";
    cList.innerHTML = html;
}

function delCliente(id) {
    if (!confirm("Excluir cliente?")) return;
    CL = CL.filter(x => x.id !== id);
    save("albany_clientes", CL);
    showClientes();
}

/* ===========================================================
   PAGAMENTOS (CORRIGIDO E COM CORTESIA)
=========================================================== */
function renderPagamentos() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>💳 Registrar Venda / Pagamento</h3>

        <label>Cliente</label>
        <select id="p_cliente">
            <option value="">Selecione</option>
            ${CL.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("")}
        </select>

        <label>Pacote</label>
        <select id='p_pac' onchange="atualizarPrevisao()">
            <option value='p1'>Pacote 1 - R$70 (Extra R$10)</option>
            <option value='p2'>Pacote 2 - R$100 (Extra R$15)</option>
            <option value='cortesia'>Cortesia</option>
        </select>

        <div class="row">
            <div style="flex:1">
                <label>Extras Pagos (Qtd)</label>
                <input type="number" id="p_ext" value="0" min="0" onchange="atualizarPrevisao()">
            </div>
            <div style="flex:1">
                <label>Cortesias (Qtd)</label>
                <input type="number" id="p_cortesia" value="0" min="0" onchange="atualizarPrevisao()">
            </div>
        </div>
        <p id="feedback_cortesia" style="font-size:13px;color:#d32f2f;margin:5px 0 0 0;display:none;font-weight:bold"></p>

        <label>Valor total (R$)</label>
        <input type="number" id="p_total" placeholder="Ex: 150" step="0.01">

        <label>Pagamento agora (R$)</label>
        <input type="number" id="p_pago_agora" value="0" step="0.01">

        <label>Forma de Pagamento</label>
        <select id="p_forma">
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="credito">Crédito</option>
            <option value="debito">Débito</option>
        </select>

        <div class="row">
            <button class="btn" onclick="savePagamentoVenda()">Salvar Venda</button>
            <button class="btn ghost" onclick="renderPagamentos()">Limpar</button>
        </div>
    </div>

    <div class='card'>
        <h3>📄 Lista de Pagamentos</h3>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
            <label style="margin:0">Filtrar:</label>
            <select id="p_filter_status" onchange="showPagamentos()">
                <option value="todos">Todos</option>
                <option value="pago">Pago</option>
                <option value="parcial">Parcial</option>
                <option value="pendente">Pendente</option>
            </select>
            <input id="p_search" placeholder="Pesquisar..." oninput="showPagamentos()" style="margin-left:10px;flex:1" />
        </div>
        <div style="margin-bottom:10px">
            <button class="btn ghost" onclick="baixarPDF()" style="width:100%">📄 Exportar Relatório Geral (TXT)</button>
        </div>
        <div id='p_list'></div>
    </div>
    <div id="p_details_container"></div>
    `;
    
    atualizarPrevisao(); // Preenche valor inicial
    showPagamentos();
}

/* Calcular valor base */
function calcTotal(p, e) {
    e = Number(e) || 0; // Garante que é número
    if (p === "p1") return 70 + (e * 10);
    if (p === "p2") return 100 + (e * 15);
    if (p === "cortesia") return 0;
    return 0;
}

/* Atualiza o campo de preço automaticamente e mostra perda de cortesia */
function atualizarPrevisao() {
    const pac = document.getElementById('p_pac').value;
    const ext = document.getElementById('p_ext').value; // Pagas
    const cortesia = Number(document.getElementById('p_cortesia').value || 0);
    const elTotal = document.getElementById('p_total');
    const fbCortesia = document.getElementById('feedback_cortesia');
    
    // Atualiza Total a Cobrar
    const valor = calcTotal(pac, ext);
    if (pac !== 'cortesia') {
        elTotal.value = valor.toFixed(2);
    } else {
        elTotal.value = "0.00";
    }

    // Calcula Perda com Cortesia
    let precoExtra = 0;
    if (pac === 'p1') precoExtra = 10;
    if (pac === 'p2') precoExtra = 15;
    
    const valorPerdido = cortesia * precoExtra;
    
    if (valorPerdido > 0) {
        fbCortesia.style.display = 'block';
        fbCortesia.innerText = `⚠️ Valor em cortesias (não cobrado): R$ ${valorPerdido.toFixed(2)}`;
    } else {
        fbCortesia.style.display = 'none';
    }
}

function savePagamentoVenda() {
    const nome = document.getElementById('p_cliente').value;
    const pacote = document.getElementById('p_pac').value;
    const extras = Number(document.getElementById('p_ext').value || 0); // Pagas
    const cortesia = Number(document.getElementById('p_cortesia').value || 0); // Grátis
    const totalInput = Number(document.getElementById('p_total').value || 0);
    const pagoAgora = Number(document.getElementById('p_pago_agora').value || 0);
    const forma = document.getElementById('p_forma').value;

    if (!nome) return alert("Informe o cliente.");
    
    const totalFinal = totalInput > 0 ? totalInput : calcTotal(pacote, extras);

    // Validação
    if (totalFinal <= 0 && pacote !== "cortesia") {
        return alert("Informe o valor total do serviço.");
    }

    // Calcula valor estimado da cortesia
    let precoExtra = 0;
    if (pacote === 'p1') precoExtra = 10;
    if (pacote === 'p2') precoExtra = 15;
    const valorCortesia = cortesia * precoExtra;

    const venda = {
        id: Date.now(),
        nome,
        pacote,
        extras,
        cortesia,
        valorCortesia,
        total: Number(totalFinal.toFixed(2)),
        pagamentos: [],
        createdAt: new Date().toISOString()
    };

    if (pagoAgora > 0) {
        venda.pagamentos.push({
            valor: Number(pagoAgora.toFixed(2)),
            forma,
            data: new Date().toISOString()
        });
    }

    VD.push(venda);
    save("albany_vendas", VD);

    alert("Venda registrada com sucesso!");
    renderPagamentos();
}

function totalPago(v) {
    if (!v.pagamentos || !v.pagamentos.length) return 0;
    return v.pagamentos.reduce((s,x) => s + Number(x.valor || 0), 0);
}

function statusVenda(v) {
    const pago = totalPago(v);
    if (pago >= (v.total - 0.01)) return "pago"; // Margem pequena pra erro de arredondamento
    if (pago > 0) return "parcial";
    return "pendente";
}

function showPagamentos() {
    const termo = (document.getElementById("p_search").value || "").toLowerCase();
    const filtro = (document.getElementById("p_filter_status").value || "todos");

    let lista = VD.slice().reverse();

    if (filtro !== "todos") {
        lista = lista.filter(v => statusVenda(v) === filtro);
    }

    if (termo) {
        lista = lista.filter(v => v.nome.toLowerCase().includes(termo) || (v.pacote || "").toLowerCase().includes(termo));
    }

    const pList = document.getElementById("p_list");
    if (!lista.length) {
        pList.innerHTML = "<p>Nenhuma venda encontrada.</p>";
        return;
    }

    let html = `<table><thead><tr>
        <th>Data</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Status</th><th>Ações</th>
    </tr></thead><tbody>`;

    lista.forEach(v => {
        const pago = totalPago(v);
        const stat = statusVenda(v);
        
        // Ajuste de classes CSS
        let stClass = "st-cancelado"; // vermelho
        let stLabel = "Pendente";
        if(stat === 'pago') { stClass = "st-confirmado"; stLabel = "Pago"; }
        if(stat === 'parcial') { stClass = "st-remarcado"; stLabel = "Parcial"; }

        html += `
        <tr>
            <td>${new Date(v.createdAt).toLocaleDateString()}</td>
            <td>${v.nome}<br><small>${v.pacote}</small></td>
            <td>R$ ${v.total.toFixed(2)}</td>
            <td>R$ ${pago.toFixed(2)}</td>
            <td><span class="status-pill ${stClass}">${stLabel}</span></td>
            <td style="display:flex;gap:6px">
                <button class="btn" onclick="openPagamentoDetalhes(${v.id})">Detalhes</button>
                <button class="btn ghost" onclick="baixarVendaPDF(${v.id})">PDF</button>
                <button class="btn danger" onclick="delVenda(${v.id})">X</button>
            </td>
        </tr>`;
    });

    html += "</tbody></table>";
    pList.innerHTML = html;
}

function openPagamentoDetalhes(id) {
    const v = VD.find(x => x.id === id);
    if (!v) return alert("Registro não encontrado.");

    const pago = totalPago(v);
    const falta = Math.max(0, v.total - pago);
    const container = document.getElementById("p_details_container");

    // Lógica visual da cortesia nos detalhes
    let infoCortesia = "";
    if (v.cortesia > 0) {
        infoCortesia = `<p style="color:#d32f2f"><strong>Cortesias:</strong> ${v.cortesia} fotos (Deixou de ganhar: R$ ${Number(v.valorCortesia||0).toFixed(2)})</p>`;
    }

    let html = `
    <div class="card" style="border:2px solid var(--accent)">
        <h3>Detalhes — ${v.nome}</h3>
        <p><strong>Pacote:</strong> ${v.pacote} — <strong>Extras Pagos:</strong> ${v.extras || 0}</p>
        ${infoCortesia}
        <p><strong>Total a Receber:</strong> R$ ${v.total.toFixed(2)}</p>
        <p><strong>Pago:</strong> R$ ${pago.toFixed(2)} — <strong style="color:${falta>0?'red':'green'}">Falta: R$ ${falta.toFixed(2)}</strong></p>

        <h4>Histórico de pagamentos</h4>
    `;

    if (!v.pagamentos || !v.pagamentos.length) {
        html += "<p>Nenhum pagamento registrado.</p>";
    } else {
        html += `<table><thead><tr><th>Data</th><th>Valor</th><th>Forma</th></tr></thead><tbody>`;
        v.pagamentos.slice().reverse().forEach(p => {
            html += `<tr><td>${new Date(p.data).toLocaleString()}</td><td>R$ ${Number(p.valor).toFixed(2)}</td><td>${p.forma}</td></tr>`;
        });
        html += `</tbody></table>`;
    }

    html += `
        <h4>Adicionar pagamento</h4>
        <label>Valor</label>
        <input id="p_add_valor_${id}" type="number" placeholder="Ex: 50" step="0.01">
        <label>Forma</label>
        <select id="p_add_forma_${id}">
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="credito">Crédito</option>
            <option value="debito">Débito</option>
        </select>

        <div class="row" style="margin-top:10px">
            <button class="btn" onclick="addPagamento(${id})">Adicionar Pagamento</button>
            <button class="btn ghost" onclick="document.getElementById('p_details_container').innerHTML=''">Fechar</button>
        </div>
    </div>
    `;

    container.innerHTML = html;
    container.scrollIntoView({ behavior: 'smooth' });
}

function addPagamento(id) {
    const v = VD.find(x => x.id === id);
    if (!v) return alert("Erro.");

    const inputId = document.getElementById(`p_add_valor_${id}`);
    const inputForma = document.getElementById(`p_add_forma_${id}`);

    const valor = Number(inputId.value || 0);
    const forma = inputForma.value || "pix";

    if (!valor || valor <= 0) return alert("Informe um valor válido.");

    v.pagamentos.push({
        valor: Number(valor.toFixed(2)),
        forma,
        data: new Date().toISOString()
    });

    save("albany_vendas", VD);
    alert("Pagamento registrado.");

    openPagamentoDetalhes(id);
    showPagamentos();
}

function delVenda(id) {
    if (!confirm("Excluir venda?")) return;
    VD = VD.filter(v => v.id !== id);
    save("albany_vendas", VD);
    document.getElementById("p_details_container").innerHTML = "";
    showPagamentos();
}

function baixarVendaPDF(id) {
    const v = VD.find(x => x.id === id);
    if (!v) return;
    const pago = totalPago(v);
    const falta = Math.max(0, v.total - pago);

    let doc = `Venda: ${v.nome}\nPacote: ${v.pacote}\nTotal: R$ ${v.total.toFixed(2)}\n`;
    if (v.cortesia > 0) doc += `Cortesias: ${v.cortesia} fotos (R$ ${Number(v.valorCortesia).toFixed(2)})\n`;
    doc += `\nPagamentos:\n`;

    if (!v.pagamentos.length) doc += "Nenhum.\n";
    else {
        v.pagamentos.forEach(p => {
            doc += `${new Date(p.data).toLocaleDateString()} - R$ ${Number(p.valor).toFixed(2)} (${p.forma})\n`;
        });
    }
    doc += `\nTotal Pago: R$ ${pago.toFixed(2)}\nFalta: R$ ${falta.toFixed(2)}`;

    const blob = new Blob([doc], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `comprovante_${v.id}.txt`;
    a.click();
}

/* (Função Restaurada) Exportar todas vendas */
function baixarPDF() {
    if (!VD.length) return alert("Nenhuma venda para exportar.");

    let doc = "Relatório de Vendas / Pagamentos\n\n";
    VD.forEach(v => {
        const pago = totalPago(v);
        const falta = Math.max(0, v.total - pago);
        doc += `Cliente: ${v.nome}\nPacote: ${v.pacote}\nTotal: R$ ${v.total.toFixed(2)}\nPago: R$ ${pago.toFixed(2)}\nFalta: R$ ${falta.toFixed(2)}\nPagamentos:\n`;
        if (!v.pagamentos.length) doc += "  - nenhum\n";
        else v.pagamentos.forEach(p => {
            doc += `  - ${new Date(p.data).toLocaleString()} — R$ ${Number(p.valor).toFixed(2)} — ${p.forma}\n`;
        });
        doc += "\n-----------------\n\n";
    });

    const blob = new Blob([doc], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pagamentos_relatorio.txt";
    a.click();
}

/* ===========================================================
   EVENTOS
=========================================================== */
function renderEventos() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>🎪 Novo Evento</h3>
        <label>Cliente</label>
        <select id="ev_cliente">
            <option value="">Selecione</option>
            ${CL.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("")}
        </select>
        
        <label>Tipo de Evento</label>
        <select id="ev_tipo">
            <option value="">Selecione</option>
            <option value="Pre Wedding">Pre Wedding</option>
            <option value="Casamento">Casamento</option>
            <option value="Batizado">Batizado</option>
            <option value="Chá revelação">Chá revelação</option>
            <option value="Inauguração de Loja">Inauguração de Loja</option>
            <option value="Festa Infantil">Festa Infantil</option>
            <option value="Festa de Adulto">Festa de Adulto</option>
            <option value="Formatura">Formatura</option>
            <option value="Ensaio Externo Formatura Infantil">Ensaio Externo Formatura Infantil</option>
            <option value="Ensaio Externo Formatura Adulto">Ensaio Externo Formatura Adulto</option>
            <option value="Ensaio Externo">Ensaio Externo</option>
            <option value="Outros">Outros</option>
        </select>

        <label>Dia inteiro?</label>
        <select id="ev_diaInteiro" onchange="toggleEventoHorario()">
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
        </select>
        <label>Data</label>
        <input type="date" id="ev_data" onchange="carregarHorariosEvento()">
        <label id="lbl_ev_hora">Horário</label>
        <select id="ev_hora"></select>
        <div class="row">
            <button class="btn" onclick="saveEvento()">Salvar</button>
            <button class="btn ghost" onclick="renderEventos()">Limpar</button>
        </div>
    </div>
    <div class="card">
        <h3>📄 Lista de Eventos</h3>
        <input type="date" id="ev_filter" onchange="showEventos()">
        <div id="ev_list" style="margin-top:15px">Selecione uma data</div>
    </div>
    `;
    setTimeout(() => { try { toggleEventoHorario(); } catch (err) {} }, 0);
}

function toggleEventoHorario() {
    const el = document.getElementById("ev_diaInteiro");
    if (!el) return;
    const diaInteiro = el.value === "sim";
    const label = document.getElementById("lbl_ev_hora");
    const select = document.getElementById("ev_hora");
    
    if (diaInteiro) {
        select.style.display = "none";
        label.style.display = "none";
    } else {
        select.style.display = "block";
        label.style.display = "block";
    }
}

function carregarHorariosEvento() {
    const data = document.getElementById("ev_data").value;
    if (!data) return;
    let html = `<option value="">Selecione</option>`;
    HORARIOS.forEach(h => html += `<option value="${h}">${h}</option>`);
    document.getElementById("ev_hora").innerHTML = html;
}

function saveEvento() {
    const cliente = document.getElementById("ev_cliente").value;
    const tipo = document.getElementById("ev_tipo").value;
    const data = document.getElementById("ev_data").value;
    const hora = document.getElementById("ev_hora").value;
    const diaInteiro = document.getElementById("ev_diaInteiro").value === "sim";

    if (!cliente || !data || !tipo) return alert("Preencha todos os campos obrigatórios.");
    
    EV.push({
        id: Date.now(),
        cliente, 
        tipo, 
        data, 
        hora: diaInteiro ? null : hora, 
        diaInteiro
    });
    save("albany_eventos", EV);
    alert("Evento salvo!");
    showEventos();
}

function showEventos() {
    const d = document.getElementById("ev_filter").value;
    if (!d) return;
    const lista = EV.filter(e => e.data === d);
    const div = document.getElementById("ev_list");
    
    if (!lista.length) {
        div.innerHTML = "<p>Nenhum evento.</p>";
        return;
    }
    let html = "";
    lista.forEach(e => {
        html += `<div style="padding:10px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between">
            <div>
                <strong>${e.diaInteiro ? "Dia Todo" : e.hora}</strong> — ${e.cliente}<br>
                <small>${e.tipo || 'Evento'}</small>
            </div>
            <button class="btn danger" onclick="delEvento(${e.id})">Excluir</button>
        </div>`;
    });
    div.innerHTML = html;
}

function delEvento(id) {
    if(!confirm("Excluir?")) return;
    EV = EV.filter(e => e.id !== id);
    save("albany_eventos", EV);
    showEventos();
}

/* ===========================================================
   DASHBOARD
=========================================================== */
function renderDashboard() {
    const total = VD.reduce((s, x) => s + Number(x.total), 0);
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class="card">
        <h3>📊 Dashboard</h3>
        <p><strong>Total faturado:</strong> R$ ${total.toFixed(2)}</p>
        <p><strong>Vendas registradas:</strong> ${VD.length}</p>
    </div>`;
}

/* INÍCIO */
renderHome();

/* ===========================================================
   SERVICE WORKER (Restaurado)
=========================================================== */
if ("serviceWorker" in navigator) {
    try { navigator.serviceWorker.register("sw.js"); } catch (err) {}
}