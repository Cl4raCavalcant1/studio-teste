/* ===========================================================
   1. HELPERS (FUNÇÕES DE AJUDA) E DADOS
=========================================================== */

// Função para carregar dados do navegador
function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
}

// Função para salvar dados no navegador
function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Carregar os bancos de dados
let AG = load("albany_agenda");
let VD = load("albany_vendas");
let CL = load("albany_clientes");
let EV = load("albany_eventos");

/* === SISTEMA DE TOAST (NOTIFICAÇÕES VISUAIS) === */
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return; // Proteção caso o HTML não tenha o container

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Ícone baseado no tipo (sucesso, erro ou aviso)
    let icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'warning-circle' : 'info');
    
    toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
            <i class="ph ph-${icon}" style="font-size:20px"></i>
            <span>${msg}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Remove a notificação após 3.5 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* === HELPER PARA FORMATAR TELEFONE (WHATSAPP) === */
function formatPhone(phone) {
    // Remove tudo que não é número (espaços, traços, parênteses)
    return phone.replace(/\D/g, '');
}

/* ===========================================================
   2. NAVEGAÇÃO ENTRE TELAS
=========================================================== */
function nav(p) {
    if (p === "home") renderHome();
    if (p === "agenda") renderAgenda();
    if (p === "clientes") renderClientes();
    if (p === "vendas" || p === "pagamentos") renderPagamentos(); 
    if (p === "dashboard") renderDashboard();
    if (p === "eventos") renderEventos();
    if (p === "config") renderConfig(); // Tela de Backup
}

// Alternar entre modo claro e escuro
function toggleTheme() {
    const t = document.body.getAttribute("data-theme");
    document.body.setAttribute("data-theme", t === "light" ? "dark" : "light");
}

/* ===========================================================
   3. HOME (DASHBOARD DIÁRIO)
=========================================================== */
function renderHome() {
    const hoje = new Date().toISOString().slice(0, 10);
    const content = document.getElementById('content');

    // Filtra agendamentos e eventos de hoje
    const agHoje = AG.filter(a => a.data === hoje)
                      .sort((a,b)=> (a.hora || "00:00").localeCompare(b.hora || "00:00"));

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
                        border-radius:10px;background:var(--bg-body);margin-bottom:10px">
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
            // Busca telefone do cliente para criar link do WhatsApp
            const cliData = CL.find(c => c.nome === a.clienteNome);
            const phone = cliData ? formatPhone(cliData.tel) : '';
            const msg = `Olá ${a.clienteNome}, passando para confirmar nosso ensaio hoje às ${a.hora}.`;
            const waLink = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}` : '#';

            html += `
                <div style="padding:12px;border-left:5px solid var(--accent);
                            margin:10px 0;border-radius:10px;background:var(--bg-body); 
                            display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${a.hora}</strong> — ${a.clienteNome}<br>
                        <span class="status-pill st-${a.status}">${a.status}</span>
                    </div>
                    <!-- Botão do WhatsApp só aparece se tiver telefone -->
                    ${phone ? `<a href="${waLink}" target="_blank" class="btn whatsapp" title="Confirmar no Zap"><i class="ph ph-whatsapp-logo"></i></a>` : ''}
                </div>
            `;
        });
        html += `</div>`;
    }

    content.innerHTML = html;
}

/* ===========================================================
   4. AGENDA COMPLETA
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
        <h3>📌 Buscar na Agenda</h3>
        <input id="ag_search" placeholder="Pesquisar cliente..." oninput="showAgendaList()" />
        <input type="date" id="ag_filter" onchange="showAgendaList()">
        <div id="ag_list" style="margin-top:15px">Selecione uma data para ver os horários.</div>
    </div>
    `;
}

/* Gera horários das 09:00 às 20:00 */
const HORARIOS = [];
for (let h = 9; h <= 20; h++) {
    HORARIOS.push(String(h).padStart(2, "0") + ":00");
}

function carregarHorarios() {
    const data = document.getElementById("ag_data").value;
    if (!data) return;
    
    // Verifica horários ocupados
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

    if (!cliente || !data || !hora) return showToast("Preencha todos os campos.", "error");

    if (EV.some(e => e.data === data && e.diaInteiro)) return showToast("Dia bloqueado por evento.", "error");
    if (EV.some(e => e.data === data && e.hora === hora)) return showToast("Horário já ocupado.", "error");

    AG.push({ id: Date.now(), clienteNome: cliente, data, hora, status });
    save("albany_agenda", AG);
    showToast("Agendamento salvo!", "success");
    showAgendaList();
}

function showAgendaList() {
    const d = document.getElementById("ag_filter").value;
    if (!d) return;

    const termo = (document.getElementById("ag_search").value || "").toLowerCase();
    const list = AG.filter(x => x.data === d && x.clienteNome.toLowerCase().includes(termo))
                   .sort((a,b)=> (a.hora || "00:00").localeCompare(b.hora || "00:00"));

    const agList = document.getElementById("ag_list");
    if (!list.length) { agList.innerHTML = "<p>Nenhum agendamento encontrado.</p>"; return; }

    let html = "";
    list.forEach(a => {
        html += `
        <div style="border-left:6px solid var(--accent);padding:12px;border-radius:10px;margin-bottom:10px;background:var(--bg-body)">
            <div style="display:flex;justify-content:space-between;align-items:center;">
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

    if (EV.some(e => e.data === novaData && e.diaInteiro)) return showToast("Dia bloqueado.", "error");
    if (EV.some(e => e.data === novaData && e.hora === novoHora)) return showToast("Horário ocupado.", "error");

    ag.data = novaData; ag.hora = novoHora; ag.status = "remarcado";
    save("albany_agenda", AG);
    showToast("Remarcado com sucesso!", "success");
    showAgendaList();
}

function delAgenda(id) {
    if (!confirm("Confirmar exclusão?")) return;
    AG = AG.filter(x => x.id !== id);
    save("albany_agenda", AG);
    showToast("Agendamento excluído.", "success");
    showAgendaList();
}

/* ===========================================================
   5. CLIENTES
=========================================================== */
function renderClientes() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>👤 Novo Cliente</h3>
        <label>Nome</label><input id="c_nome">
        <label>Telefone</label><input id="c_tel" placeholder="(00) 00000-0000">
        <label>Instagram</label><input id="c_insta">
        <label>Observações</label><textarea id="c_obs"></textarea>
        <div class="row">
            <button class="btn" onclick="saveCliente()">Salvar</button>
        </div>
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
    if (!nome) return showToast("Informe o nome", "error");

    CL.push({
        id: Date.now(),
        nome: nome,
        tel: document.getElementById("c_tel").value,
        insta: document.getElementById("c_insta").value,
        obs: document.getElementById("c_obs").value
    });
    save("albany_clientes", CL);
    showToast("Cliente salvo!", "success");
    renderClientes();
}

function showClientes() {
    const termo = (document.getElementById("c_search").value || "").toLowerCase();
    const lista = CL.filter(c => c.nome.toLowerCase().includes(termo));
    const cList = document.getElementById("c_list");

    if (!lista.length) { cList.innerHTML = "<p>Nenhum cliente cadastrado.</p>"; return; }

    let html = `<table><thead><tr><th>Nome</th><th>Contato</th><th>Insta</th><th>Ações</th></tr></thead><tbody>`;
    lista.forEach(c => {
        const phone = formatPhone(c.tel || "");
        // Cria botão do WhatsApp se tiver número
        const waBtn = phone 
            ? `<a href="https://wa.me/55${phone}" target="_blank" class="btn whatsapp" style="padding:6px 10px"><i class="ph ph-whatsapp-logo"></i></a>` 
            : `<button class="btn ghost" disabled style="opacity:0.5;padding:6px 10px"><i class="ph ph-whatsapp-logo"></i></button>`;

        html += `<tr>
            <td>${c.nome}</td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    ${c.tel}
                    ${waBtn}
                </div>
            </td>
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
    showToast("Cliente removido.", "success");
    showClientes();
}

/* ===========================================================
   6. PAGAMENTOS E VENDAS
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
            <div style="flex:1"><label>Extras Pagos</label><input type="number" id="p_ext" value="0" min="0" onchange="atualizarPrevisao()"></div>
            <div style="flex:1"><label>Cortesias</label><input type="number" id="p_cortesia" value="0" min="0" onchange="atualizarPrevisao()"></div>
        </div>
        <p id="feedback_cortesia" style="font-size:13px;color:#d32f2f;margin:5px 0 0 0;display:none;font-weight:bold"></p>
        <label>Valor total (R$)</label><input type="number" id="p_total" placeholder="Ex: 150" step="0.01">
        <label>Pagamento agora (R$)</label><input type="number" id="p_pago_agora" value="0" step="0.01">
        <label>Forma</label>
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
        <h3>📄 Vendas Recentes</h3>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
            <label style="margin:0">Status:</label>
            <select id="p_filter_status" onchange="showPagamentos()" style="width:auto">
                <option value="todos">Todos</option>
                <option value="pago">Pago</option>
                <option value="parcial">Parcial</option>
                <option value="pendente">Pendente</option>
            </select>
            <input id="p_search" placeholder="Pesquisar..." oninput="showPagamentos()" style="margin-left:10px;flex:1" />
        </div>
        <div id='p_list'></div>
    </div>
    <div id="p_details_container"></div>
    `;
    atualizarPrevisao();
    showPagamentos();
}

function calcTotal(p, e) {
    e = Number(e) || 0;
    if (p === "p1") return 70 + (e * 10);
    if (p === "p2") return 100 + (e * 15);
    return 0;
}

function atualizarPrevisao() {
    const pac = document.getElementById('p_pac').value;
    const ext = document.getElementById('p_ext').value;
    const cortesia = Number(document.getElementById('p_cortesia').value || 0);
    const elTotal = document.getElementById('p_total');
    const fbCortesia = document.getElementById('feedback_cortesia');
    
    const valor = calcTotal(pac, ext);
    if (pac !== 'cortesia') elTotal.value = valor.toFixed(2);
    else elTotal.value = "0.00";

    let precoExtra = (pac === 'p1') ? 10 : (pac === 'p2' ? 15 : 0);
    const valorPerdido = cortesia * precoExtra;
    
    if (valorPerdido > 0) {
        fbCortesia.style.display = 'block';
        fbCortesia.innerText = `⚠️ Valor em cortesias (não cobrado): R$ ${valorPerdido.toFixed(2)}`;
    } else { fbCortesia.style.display = 'none'; }
}

function savePagamentoVenda() {
    const nome = document.getElementById('p_cliente').value;
    const pacote = document.getElementById('p_pac').value;
    const extras = Number(document.getElementById('p_ext').value || 0);
    const cortesia = Number(document.getElementById('p_cortesia').value || 0);
    const totalInput = Number(document.getElementById('p_total').value || 0);
    const pagoAgora = Number(document.getElementById('p_pago_agora').value || 0);
    const forma = document.getElementById('p_forma').value;

    if (!nome) return showToast("Informe o cliente.", "error");
    
    const totalFinal = totalInput > 0 ? totalInput : calcTotal(pacote, extras);
    if (totalFinal <= 0 && pacote !== "cortesia") return showToast("Valor total inválido.", "error");

    let precoExtra = (pacote === 'p1') ? 10 : (pacote === 'p2' ? 15 : 0);
    const venda = {
        id: Date.now(),
        nome, pacote, extras, cortesia,
        valorCortesia: cortesia * precoExtra,
        total: Number(totalFinal.toFixed(2)),
        pagamentos: [],
        createdAt: new Date().toISOString()
    };

    if (pagoAgora > 0) {
        venda.pagamentos.push({ valor: Number(pagoAgora.toFixed(2)), forma, data: new Date().toISOString() });
    }

    VD.push(venda);
    save("albany_vendas", VD);
    showToast("Venda registrada!", "success");
    renderPagamentos();
}

function totalPago(v) {
    if (!v.pagamentos || !v.pagamentos.length) return 0;
    return v.pagamentos.reduce((s,x) => s + Number(x.valor || 0), 0);
}

function statusVenda(v) {
    const pago = totalPago(v);
    if (pago >= (v.total - 0.01)) return "pago";
    if (pago > 0) return "parcial";
    return "pendente";
}

function showPagamentos() {
    const termo = (document.getElementById("p_search").value || "").toLowerCase();
    const filtro = (document.getElementById("p_filter_status").value || "todos");
    let lista = VD.slice().reverse();

    if (filtro !== "todos") lista = lista.filter(v => statusVenda(v) === filtro);
    if (termo) lista = lista.filter(v => v.nome.toLowerCase().includes(termo) || (v.pacote || "").toLowerCase().includes(termo));

    const pList = document.getElementById("p_list");
    if (!lista.length) { pList.innerHTML = "<p>Nenhuma venda encontrada.</p>"; return; }

    let html = `<table><thead><tr><th>Data</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Status</th><th>Ações</th></tr></thead><tbody>`;
    lista.forEach(v => {
        const pago = totalPago(v);
        const stat = statusVenda(v);
        let stClass = stat === 'pago' ? "st-pago" : (stat === 'parcial' ? "st-parcial" : "st-pendente");
        let stLabel = stat === 'pago' ? "Pago" : (stat === 'parcial' ? "Parcial" : "Pendente");

        html += `
        <tr>
            <td>${new Date(v.createdAt).toLocaleDateString()}</td>
            <td>${v.nome}<br><small>${v.pacote}</small></td>
            <td>R$ ${v.total.toFixed(2)}</td>
            <td>R$ ${pago.toFixed(2)}</td>
            <td><span class="status-pill ${stClass}">${stLabel}</span></td>
            <td style="display:flex;gap:6px">
                <button class="btn" onclick="openPagamentoDetalhes(${v.id})">Detalhes</button>
                <button class="btn danger" onclick="delVenda(${v.id})">X</button>
            </td>
        </tr>`;
    });
    html += "</tbody></table>";
    pList.innerHTML = html;
}

function openPagamentoDetalhes(id) {
    const v = VD.find(x => x.id === id);
    if (!v) return;
    const pago = totalPago(v);
    const falta = Math.max(0, v.total - pago);
    const container = document.getElementById("p_details_container");

    let infoCortesia = v.cortesia > 0 ? `<p style="color:#d32f2f"><strong>Cortesias:</strong> ${v.cortesia} fotos</p>` : "";

    let html = `
    <div class="card" style="border:2px solid var(--accent); margin-top:20px;">
        <h3>Detalhes — ${v.nome}</h3>
        <p><strong>Pacote:</strong> ${v.pacote} — <strong>Extras:</strong> ${v.extras || 0}</p>
        ${infoCortesia}
        <p><strong>Total:</strong> R$ ${v.total.toFixed(2)} — <strong>Falta:</strong> <span style="color:${falta>0?'red':'green'}">R$ ${falta.toFixed(2)}</span></p>

        <h4>Histórico</h4>
        ${v.pagamentos.length ? '<table><thead><tr><th>Data</th><th>Valor</th><th>Forma</th></tr></thead><tbody>' : '<p>Sem pagamentos.</p>'}
        ${v.pagamentos.map(p => `<tr><td>${new Date(p.data).toLocaleString()}</td><td>R$ ${Number(p.valor).toFixed(2)}</td><td>${p.forma}</td></tr>`).join('')}
        ${v.pagamentos.length ? '</tbody></table>' : ''}

        <h4 style="margin-top:15px">Adicionar Pagamento</h4>
        <div class="row">
            <input id="p_add_valor_${id}" type="number" placeholder="Valor" step="0.01">
            <select id="p_add_forma_${id}"><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option></select>
            <button class="btn" onclick="addPagamento(${id})">Adicionar</button>
        </div>
        <button class="btn ghost" style="margin-top:15px" onclick="document.getElementById('p_details_container').innerHTML=''">Fechar</button>
    </div>
    `;
    container.innerHTML = html;
    container.scrollIntoView({ behavior: 'smooth' });
}

function addPagamento(id) {
    const v = VD.find(x => x.id === id);
    const inputId = document.getElementById(`p_add_valor_${id}`);
    const inputForma = document.getElementById(`p_add_forma_${id}`);
    const valor = Number(inputId.value || 0);

    if (valor <= 0) return showToast("Valor inválido.", "error");

    v.pagamentos.push({ valor: Number(valor.toFixed(2)), forma: inputForma.value, data: new Date().toISOString() });
    save("albany_vendas", VD);
    showToast("Pagamento adicionado!", "success");
    openPagamentoDetalhes(id);
    showPagamentos();
}

function delVenda(id) {
    if (!confirm("Excluir venda?")) return;
    VD = VD.filter(v => v.id !== id);
    save("albany_vendas", VD);
    document.getElementById("p_details_container").innerHTML = "";
    showToast("Venda excluída.", "success");
    showPagamentos();
}

/* ===========================================================
   7. EVENTOS
=========================================================== */
function renderEventos() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>🎪 Novo Evento</h3>
        <label>Cliente</label>
        <select id="ev_cliente"><option value="">Selecione</option>${CL.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("")}</select>
        <label>Tipo</label>
        <select id="ev_tipo">
            <option value="">Selecione</option>
            <option value="Pre Wedding">Pre Wedding</option><option value="Casamento">Casamento</option>
            <option value="Batizado">Batizado</option><option value="Chá revelação">Chá revelação</option>
            <option value="Festa Infantil">Festa Infantil</option><option value="Formatura">Formatura</option>
            <option value="Ensaio Externo">Ensaio Externo</option><option value="Outros">Outros</option>
        </select>
        <label>Dia inteiro?</label>
        <select id="ev_diaInteiro" onchange="toggleEventoHorario()"><option value="nao">Não</option><option value="sim">Sim</option></select>
        <label>Data</label><input type="date" id="ev_data" onchange="carregarHorariosEvento()">
        <label id="lbl_ev_hora">Horário</label><select id="ev_hora"></select>
        <div class="row"><button class="btn" onclick="saveEvento()">Salvar</button></div>
    </div>
    <div class="card">
        <h3>📄 Lista de Eventos</h3>
        <input type="date" id="ev_filter" onchange="showEventos()">
        <div id="ev_list" style="margin-top:15px">Selecione uma data</div>
    </div>`;
    setTimeout(() => { try { toggleEventoHorario(); } catch (err) {} }, 0);
}

function toggleEventoHorario() {
    const diaInteiro = document.getElementById("ev_diaInteiro").value === "sim";
    const label = document.getElementById("lbl_ev_hora");
    const select = document.getElementById("ev_hora");
    if (diaInteiro) { select.style.display = "none"; label.style.display = "none"; } 
    else { select.style.display = "block"; label.style.display = "block"; }
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

    if (!cliente || !data || !tipo) return showToast("Preencha campos obrigatórios.", "error");
    
    EV.push({ id: Date.now(), cliente, tipo, data, hora: diaInteiro ? null : hora, diaInteiro });
    save("albany_eventos", EV);
    showToast("Evento salvo!", "success");
    showEventos();
}

function showEventos() {
    const d = document.getElementById("ev_filter").value;
    if (!d) return;
    const lista = EV.filter(e => e.data === d);
    const div = document.getElementById("ev_list");
    if (!lista.length) { div.innerHTML = "<p>Nenhum evento.</p>"; return; }
    
    let html = "";
    lista.forEach(e => {
        html += `<div style="padding:10px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between">
            <div><strong>${e.diaInteiro ? "Dia Todo" : e.hora}</strong> — ${e.cliente}<br><small>${e.tipo}</small></div>
            <button class="btn danger" onclick="delEvento(${e.id})">Excluir</button>
        </div>`;
    });
    div.innerHTML = html;
}

function delEvento(id) {
    if(!confirm("Excluir?")) return;
    EV = EV.filter(e => e.id !== id);
    save("albany_eventos", EV);
    showToast("Evento excluído.", "success");
    showEventos();
}

/* ===========================================================
   8. DASHBOARD & CONFIGURAÇÕES (BACKUP)
=========================================================== */
function renderDashboard() {
    const total = VD.reduce((s, x) => s + Number(x.total), 0);
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class="card">
        <h3>📊 Dashboard Financeiro</h3>
        <p><strong>Total faturado (Geral):</strong> R$ ${total.toFixed(2)}</p>
        <p><strong>Vendas registradas:</strong> ${VD.length}</p>
        <p><strong>Clientes cadastrados:</strong> ${CL.length}</p>
    </div>`;
}

/* === NOVA TELA: CONFIGURAÇÕES E BACKUP === */
function renderConfig() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class="card">
        <h3>⚙️ Configurações & Segurança</h3>
        <p>Use esta área para salvar seus dados e evitar perdas.</p>
        
        <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:20px">
            <h4>💾 Backup (Salvar Dados)</h4>
            <p>Baixe um arquivo com todos os seus agendamentos e clientes.</p>
            <button class="btn" onclick="exportarDados()">
                <i class="ph ph-download-simple"></i> Baixar Backup
            </button>
        </div>

        <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:20px">
            <h4>📂 Restaurar Dados</h4>
            <p>Carregue um arquivo de backup salvo anteriormente.</p>
            <input type="file" id="file_import" accept=".json" style="margin-bottom:10px">
            <button class="btn ghost" onclick="importarDados()">
                <i class="ph ph-upload-simple"></i> Restaurar Dados
            </button>
        </div>
        
        <div style="margin-top:30px; background:#fff5f5; padding:15px; border-radius:10px; border:1px solid #ffcdd2">
            <h4 style="color:var(--danger)">⚠️ Área de Perigo</h4>
            <button class="btn danger" onclick="limparTudo()">Apagar TUDO do sistema</button>
        </div>
    </div>`;
}

function exportarDados() {
    const dados = {
        agenda: AG,
        vendas: VD,
        clientes: CL,
        eventos: EV,
        dataBackup: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dados));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "backup_studio_albany.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Backup baixado com sucesso!", "success");
}

function importarDados() {
    const input = document.getElementById('file_import');
    if (!input.files.length) return showToast("Selecione um arquivo .json", "error");
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (json.agenda) {
                AG = json.agenda; save("albany_agenda", AG);
                VD = json.vendas; save("albany_vendas", VD);
                CL = json.clientes; save("albany_clientes", CL);
                EV = json.eventos; save("albany_eventos", EV);
                showToast("Dados restaurados! A página será recarregada.", "success");
                setTimeout(() => location.reload(), 2000);
            } else {
                showToast("Arquivo inválido.", "error");
            }
        } catch (err) {
            showToast("Erro ao ler arquivo.", "error");
        }
    };
    reader.readAsText(file);
}

function limparTudo() {
    if(confirm("TEM CERTEZA? Isso apagará todos os clientes e agendamentos para sempre!")) {
        localStorage.clear();
        location.reload();
    }
}

/* INICIALIZAÇÃO */
renderHome();