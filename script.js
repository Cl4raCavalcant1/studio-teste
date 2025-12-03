/* ===========================================================
   script.js completo — Albany Fotografias
   - Home (com alerta de eventos)
   - Agenda (considera eventos / bloqueios)
   - Clientes
   - Pagamentos (antigo VENDAS) — histórico, status, UI melhorada
   - Eventos (dia inteiro + bloqueios)
   - Dashboard
   - Service Worker registration
=========================================================== */

/* =========================
   HELPERS DE LOCALSTORAGE
   ========================= */
function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
}
function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/* =========================
   BANCOS LOCAIS
   ========================= */
let AG = load("albany_agenda");
let VD = load("albany_vendas");
let CL = load("albany_clientes");
let EV = load("albany_eventos");

/* =========================
   NAVEGAÇÃO
   ========================= */
function nav(p) {
    if (p === "home") return renderHome();
    if (p === "agenda") return renderAgenda();
    if (p === "clientes") return renderClientes();
    if (p === "pagamentos") return renderPagamentos();
    if (p === "vendas") return renderPagamentos(); // compatibilidade
    if (p === "dashboard") return renderDashboard();
    if (p === "eventos") return renderEventos();
    // default
    renderHome();
}

/* Alternar tema */
function toggleTheme() {
    const t = document.body.getAttribute("data-theme");
    document.body.setAttribute("data-theme", t === "light" ? "dark" : "light");
}

/* =========================
   HOME (COM ALERTA DE EVENTOS)
   ========================= */
function renderHome() {
    const hoje = new Date().toISOString().slice(0, 10);

    const agHoje = AG.filter(a => a.data === hoje)
                     .sort((a,b)=> (a.hora || "00:00").localeCompare(b.hora || "00:00"));

    const evHoje = EV.filter(e => e.data === hoje)
                     .sort((a,b)=> (a.hora || "00:00").localeCompare(b.hora || "00:00"));

    let html = `
    <div class='card'>
      <h2>Bem-vinda, Albany!</h2>
      <p>Resumo do dia — <strong>${hoje}</strong></p>
    `;

    // Eventos
    html += `<div style="margin-top:12px">`;
    if (evHoje.length) {
        html += `<h3 style="margin:8px 0">🎪 Eventos de Hoje (${evHoje.length})</h3>`;
        evHoje.forEach(e => {
            html += `
            <div style="padding:10px;border-left:6px solid var(--accent);
                        border-radius:8px;background:var(--card);margin-bottom:8px">
                <strong>${e.diaInteiro ? "Dia inteiro" : e.hora}</strong> — ${e.cliente}
            </div>`;
        });
    } else {
        html += `<p style="margin:8px 0"><em>Nenhum evento hoje.</em></p>`;
    }
    html += `</div>`;

    // Agendamentos
    html += `<div style="margin-top:14px"><h3 style="margin:8px 0">📷 Agendamentos de Hoje (${agHoje.length})</h3>`;
    if (!agHoje.length) {
        html += `<p>Nenhum agendamento hoje.</p>`;
    } else {
        agHoje.forEach(a => {
            html += `
            <div style="padding:10px;border-left:5px solid var(--accent);
                        margin:8px 0;border-radius:8px;background:var(--card)">
                <strong>${a.hora}</strong> — ${a.clienteNome || a.nome}<br>
                <span class="status-pill st-${a.status}">${a.status}</span>
            </div>`;
        });
    }
    html += `</div></div>`;

    content.innerHTML = html;

    // Notification (optional)
    if (Notification.permission !== "denied") {
        Notification.requestPermission().then(p => {
            if (p === "granted" && (agHoje.length || evHoje.length)) {
                let corpo = "";
                if (evHoje.length) corpo += "Eventos:\n" + evHoje.map(e => `${e.diaInteiro ? "Dia inteiro" : e.hora} — ${e.cliente}`).join("\n") + "\n\n";
                if (agHoje.length) corpo += "Agendamentos:\n" + agHoje.map(a => `${a.hora} — ${a.clienteNome}`).join("\n");
                new Notification("Resumo do dia", { body: corpo });
            }
        });
    }
}

/* =========================
   AGENDA
   ========================= */
function renderAgenda() {
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
for (let h = 9; h <= 20; h++) HORARIOS.push(String(h).padStart(2, "0") + ":00");

/* Carregar horários (considera eventos) */
function carregarHorarios() {
    const data = ag_data.value;
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

    ag_hora.innerHTML = html;
}

function saveAgenda() {
    const cliente = ag_cliente.value;
    const data = ag_data.value;
    const hora = ag_hora.value;
    const status = ag_status.value;

    if (!cliente || !data || !hora) return alert("Preencha todos os campos.");

    if (EV.some(e => e.data === data && e.diaInteiro)) return alert("⚠️ Este dia está bloqueado por um evento de dia inteiro.");
    if (EV.some(e => e.data === data && e.hora === hora)) return alert("⚠️ Já existe um evento neste horário.");

    AG.push({ id: Date.now(), clienteNome: cliente, data, hora, status });
    save("albany_agenda", AG);
    alert("Agendamento salvo!");
    showAgendaList();
}

function showAgendaList() {
    const d = ag_filter.value; if (!d) return;
    const termo = (ag_search.value || "").toLowerCase();

    const list = AG.filter(x => x.data === d && x.clienteNome.toLowerCase().includes(termo))
                   .sort((a,b)=> (a.hora || "00:00").localeCompare(b.hora || "00:00"));

    if (!list.length) { ag_list.innerHTML = "<p>Nenhum agendamento.</p>"; return; }

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

    ag_list.innerHTML = html;
}

function remarcar(id) {
    const ag = AG.find(x => x.id === id);
    const novaData = prompt("Nova data (YYYY-MM-DD):", ag.data);
    const novoHora = prompt("Novo horário (HH:MM):", ag.hora);
    if (!novaData || !novoHora) return;

    if (EV.some(e => e.data === novaData && e.diaInteiro)) return alert("⚠️ Novo dia bloqueado por evento de dia inteiro.");
    if (EV.some(e => e.data === novaData && e.hora === novoHora)) return alert("⚠️ Já existe um evento neste horário.");

    ag.data = novaData; ag.hora = novoHora; ag.status = "remarcado";
    save("albany_agenda", AG);
    showAgendaList();
}

function delAgenda(id) {
    if (!confirm("Confirmar exclusão?")) return;
    AG = AG.filter(x => x.id !== id);
    save("albany_agenda", AG);
    showAgendaList();
}

/* =========================
   CLIENTES
   ========================= */
function renderClientes() {
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
        <input id="c_search" placeholder="Pesquisar cliente..." oninput="showClientes()">
        <div id="c_list"></div>
    </div>`;
    showClientes();
}

function saveCliente() {
    const n = c_nome.value.trim(); if (!n) return alert("Informe o nome");
    CL.push({ id: Date.now(), nome: c_nome.value, tel: c_tel.value, insta: c_insta.value, obs: c_obs.value });
    save("albany_clientes", CL); renderClientes();
}

function showClientes() {
    const termo = (c_search.value || "").toLowerCase();
    const lista = CL.filter(c => c.nome.toLowerCase().includes(termo));
    if (!lista.length) { c_list.innerHTML = "<p>Nenhum cliente cadastrado.</p>"; return; }

    let html = `<table><thead><tr><th>Nome</th><th>Telefone</th><th>Instagram</th><th>Ações</th></tr></thead><tbody>`;
    lista.forEach(c => {
        html += `<tr><td>${c.nome}</td><td>${c.tel}</td><td>${c.insta}</td><td><button class="btn danger" onclick="delCliente(${c.id})">Excluir</button></td></tr>`;
    });
    html += "</tbody></table>";
    c_list.innerHTML = html;
}

function delCliente(id) {
    if (!confirm("Excluir cliente?")) return;
    CL = CL.filter(x => x.id !== id); save("albany_clientes", CL); showClientes();
}

/* =========================
   PAGAMENTOS (melhorado) — Opção A (histórico)
   ========================= */

function renderPagamentos() {
    // resumo financeiro (totais)
    const totalFaturado = VD.reduce((s, v) => s + (v.total || 0), 0);
    const totalPago = VD.reduce((s, v) => s + totalPago(v), 0);
    const totalPendente = Math.max(0, totalFaturado - totalPago);

    content.innerHTML = `
    <div class="card" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:180px;padding:12px;border-radius:10px;background:linear-gradient(180deg,#fff,#fbf7ef);box-shadow:var(--shadow)">
            <div style="font-size:12px;color:var(--muted)">Total faturado</div>
            <div style="font-size:20px;font-weight:800">R$ ${totalFaturado.toFixed(2)}</div>
        </div>
        <div style="flex:1;min-width:180px;padding:12px;border-radius:10px;background:linear-gradient(180deg,#fff,#f1fff6);box-shadow:var(--shadow)">
            <div style="font-size:12px;color:var(--muted)">Total recebido</div>
            <div style="font-size:20px;font-weight:800">R$ ${totalPago.toFixed(2)}</div>
        </div>
        <div style="flex:1;min-width:180px;padding:12px;border-radius:10px;background:linear-gradient(180deg,#fff,#fff6f6);box-shadow:var(--shadow)">
            <div style="font-size:12px;color:var(--muted)">Total pendente</div>
            <div style="font-size:20px;font-weight:800;color:var(--danger)">R$ ${totalPendente.toFixed(2)}</div>
        </div>
    </div>

    <div class='card'>
        <h3>💳 Registrar Venda / Pagamento</h3>

        <label>Cliente</label>
        <select id="p_cliente">
            <option value="">Selecione</option>
            ${CL.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("")}
        </select>

        <label>Pacote</label>
        <select id='p_pac'>
            <option value='p1'>Pacote 1 - R$70</option>
            <option value='p2'>Pacote 2 - R$100</option>
            <option value='cortesia'>Cortesia</option>
        </select>

        <label>Extras (quantidade)</label>
        <input type="number" id="p_ext" value="0" min="0">

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

            <input id="p_search" placeholder="Pesquisar cliente..." oninput="showPagamentos()" style="margin-left:10px;flex:1" />
        </div>

        <div id='p_list'></div>
    </div>

    <div id="p_details_container"></div>
    `;

    showPagamentos();
}

/* calcTotal compatível */
function calcTotal(p, e) {
    if (p === "p1") return 70 + e * 10;
    if (p === "p2") return 100 + e * 15;
    if (p === "cortesia") return 0;
    return 0;
}

/* salvar venda com possível pagamento inicial */
function savePagamentoVenda() {
    const nome = p_cliente.value;
    const pacote = p_pac.value;
    const extras = Number(p_ext.value || 0);
    const totalInput = Number(p_total.value || 0);
    const pagoAgora = Number(p_pago_agora.value || 0);
    const forma = p_forma.value;

    if (!nome) return alert("Informe o cliente.");
    if (!totalInput && pacote !== "cortesia") return alert("Informe o valor total do serviço.");

    const total = totalInput || calcTotal(pacote, extras);

    const venda = { id: Date.now(), nome, pacote, extras, total: Number(total.toFixed(2)), pagamentos: [], createdAt: new Date().toISOString() };

    if (pagoAgora > 0) venda.pagamentos.push({ valor: Number(pagoAgora.toFixed(2)), forma, data: new Date().toISOString() });

    VD.push(venda);
    save("albany_vendas", VD);

    alert("Venda registrada com sucesso!");
    renderPagamentos();
}

/* total pago */
function totalPago(v) {
    if (!v || !v.pagamentos || !v.pagamentos.length) return 0;
    return v.pagamentos.reduce((s,x) => s + Number(x.valor || 0), 0);
}

/* status */
function statusVenda(v) {
    const pago = totalPago(v);
    if (pago >= v.total && v.total > 0) return "pago";
    if (pago > 0 && pago < v.total) return "parcial";
    return "pendente";
}

/* indicador visual de progresso (0..100) */
function progressoVendaPct(v) {
    const pago = totalPago(v);
    if (!v.total) return 0;
    return Math.min(100, Math.round((pago / v.total) * 100));
}

/* mostrar lista de pagamentos */
function showPagamentos() {
    const termo = (p_search.value || "").toLowerCase();
    const filtro = (p_filter_status.value || "todos");
    let lista = VD.slice().reverse();

    if (filtro !== "todos") lista = lista.filter(v => statusVenda(v) === filtro);
    if (termo) lista = lista.filter(v => v.nome.toLowerCase().includes(termo) || (v.pacote || "").toLowerCase().includes(termo));

    if (!lista.length) { p_list.innerHTML = "<p>Nenhuma venda encontrada.</p>"; return; }

    let html = `<table><thead><tr>
        <th>Data</th><th>Cliente</th><th>Pacote</th><th>Total</th><th>Pago</th><th>Falta</th><th>Status</th><th>Ações</th>
    </tr></thead><tbody>`;

    lista.forEach(v => {
        const pago = totalPago(v);
        const falta = Math.max(0, v.total - pago);
        const stat = statusVenda(v);
        const label = stat === "pago" ? "Pago" : (stat === "parcial" ? "Parcial" : "Pendente");
        const pct = progressoVendaPct(v);

        // cor do status
        const color = stat === "pago" ? "var(--success)" : (stat === "parcial" ? "var(--warning)" : "var(--danger)");

        html += `
        <tr>
            <td>${new Date(v.createdAt).toLocaleDateString()}</td>
            <td>${v.nome}</td>
            <td>${v.pacote}</td>
            <td>R$ ${v.total.toFixed(2)}</td>
            <td>R$ ${pago.toFixed(2)}</td>
            <td>R$ ${falta.toFixed(2)}</td>
            <td><span style="padding:6px 10px;border-radius:8px;background:${color};color:#fff;font-weight:700">${label}</span></td>
            <td style="display:flex;gap:6px;align-items:center">
                <div style="width:80px;background:#eee;border-radius:8px;height:8px;overflow:hidden">
                    <div style="height:8px;width:${pct}%;background:linear-gradient(90deg, #4caf50, #8bc34a)"></div>
                </div>
                <button class="btn" onclick="openPagamentoDetalhes(${v.id})">Detalhes</button>
                <button class="btn ghost" onclick="baixarVendaPDF(${v.id})">PDF</button>
                <button class="btn danger" onclick="delVenda(${v.id})">Excluir</button>
            </td>
        </tr>`;
    });

    html += "</tbody></table>";
    p_list.innerHTML = html;
}

/* detalhes + adicionar pagamento */
function openPagamentoDetalhes(id) {
    const v = VD.find(x => x.id === id); if (!v) return alert("Registro não encontrado.");

    const pago = totalPago(v);
    const falta = Math.max(0, v.total - pago);
    const detalhesId = `p_det_${id}`;

    let html = `
    <div class="card" id="${detalhesId}">
        <h3>Detalhes — ${v.nome}</h3>
        <p><strong>Pacote:</strong> ${v.pacote} — <strong>Total:</strong> R$ ${v.total.toFixed(2)}</p>
        <p><strong>Total pago:</strong> R$ ${pago.toFixed(2)} — <strong>Falta:</strong> R$ ${falta.toFixed(2)}</p>
        <h4>Histórico de pagamentos</h4>`;

    if (!v.pagamentos || !v.pagamentos.length) html += "<p>Nenhum pagamento registrado.</p>";
    else {
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
            <button class="btn ghost" onclick="document.getElementById('${detalhesId}').remove();">Fechar</button>
        </div>
    </div>`;

    document.getElementById("p_details_container").innerHTML = html;
}

/* adicionar pagamento */
function addPagamento(id) {
    const v = VD.find(x => x.id === id); if (!v) return alert("Registro não encontrado.");
    const inputId = document.getElementById(`p_add_valor_${id}`);
    const inputForma = document.getElementById(`p_add_forma_${id}`);
    const valor = Number(inputId.value || 0);
    const forma = inputForma.value || "pix";
    if (!valor || valor <= 0) return alert("Informe um valor válido.");
    v.pagamentos.push({ valor: Number(valor.toFixed(2)), forma, data: new Date().toISOString() });
    save("albany_vendas", VD);
    alert("Pagamento registrado.");
    openPagamentoDetalhes(id);
    showPagamentos();
}

/* excluir venda */
function delVenda(id) {
    if (!confirm("Excluir venda?")) return;
    VD = VD.filter(v => v.id !== id); save("albany_vendas", VD); showPagamentos();
}

/* gerar PDF texto de uma venda */
function baixarVendaPDF(id) {
    const v = VD.find(x => x.id === id); if (!v) return alert("Registro não encontrado.");
    const pago = totalPago(v); const falta = Math.max(0, v.total - pago);
    let doc = `Venda — ${v.nome}\n\nPacote: ${v.pacote}\nTotal: R$ ${v.total.toFixed(2)}\n\nPagamentos:\n`;
    if (!v.pagamentos.length) doc += "Nenhum pagamento registrado.\n";
    else v.pagamentos.forEach(p => doc += `${new Date(p.data).toLocaleString()} — R$ ${Number(p.valor).toFixed(2)} — ${p.forma}\n`);
    doc += `\nTotal pago: R$ ${pago.toFixed(2)}\nFalta: R$ ${falta.toFixed(2)}\n`;
    const blob = new Blob([doc], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `venda_${v.id}.txt`; a.click();
}

/* exportar todas vendas */
function baixarPDF() {
    if (!VD.length) return alert("Nenhuma venda para exportar.");
    let doc = "Relatório de Vendas / Pagamentos\n\n";
    VD.forEach(v => {
        const pago = totalPago(v); const falta = Math.max(0, v.total - pago);
        doc += `Cliente: ${v.nome}\nPacote: ${v.pacote}\nTotal: R$ ${v.total.toFixed(2)}\nPago: R$ ${pago.toFixed(2)}\nFalta: R$ ${falta.toFixed(2)}\nPagamentos:\n`;
        if (!v.pagamentos.length) doc += "  - nenhum\n";
        else v.pagamentos.forEach(p => doc += `  - ${new Date(p.data).toLocaleString()} — R$ ${Number(p.valor).toFixed(2)} — ${p.forma}\n`);
        doc += "\n-----------------\n\n";
    });
    const blob = new Blob([doc], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pagamentos_relatorio.txt"; a.click();
}

/* =========================
   EVENTOS (corrigido)
   ========================= */

function renderEventos() {
    content.innerHTML = `
    <div class='card'>
        <h3>🎪 Novo Evento</h3>

        <label>Cliente</label>
        <select id="ev_cliente">
            <option value="">Selecione</option>
            ${CL.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("")}
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
    setTimeout(()=>{ try { toggleEventoHorario(); } catch(e) {} }, 0);
}

function toggleEventoHorario() {
    if (typeof ev_diaInteiro === "undefined" || typeof ev_hora === "undefined") return;
    const diaInteiro = ev_diaInteiro.value === "sim";
    const label = document.getElementById("lbl_ev_hora");
    if (!label) return;
    if (diaInteiro) { ev_hora.style.display = "none"; label.style.display = "none"; }
    else { ev_hora.style.display = "block"; label.style.display = "block"; }
}

function carregarHorariosEvento() {
    const data = ev_data.value; if (!data) return;
    const existeDiaInteiro = EV.some(e => e.data === data && e.diaInteiro);
    const agendados = AG.filter(a => a.data === data).map(a => a.hora);
    const eventosHora = EV.filter(e => e.data === data && !e.diaInteiro).map(e => e.hora);
    let html = `<option value="">Selecione</option>`;
    HORARIOS.forEach(h => {
        if (existeDiaInteiro || agendados.includes(h) || eventosHora.includes(h)) html += `<option disabled>${h} — Ocupado</option>`;
        else html += `<option value="${h}">${h}</option>`;
    });
    ev_hora.innerHTML = html;
}

function saveEvento() {
    const cliente = ev_cliente.value; const data = ev_data.value; const hora = ev_hora.value;
    const diaInteiro = ev_diaInteiro.value === "sim";
    if (!cliente || !data) return alert("Preencha todos os campos.");

    if (diaInteiro) {
        const existeAgenda = AG.some(a => a.data === data);
        const existeEvento = EV.some(e => e.data === data);
        if (existeAgenda || existeEvento) return alert("⚠️ Já existe compromisso neste dia. Evento de dia inteiro não permitido.");
        EV.push({ id: Date.now(), cliente, data, hora: null, diaInteiro: true });
        save("albany_eventos", EV); alert("Evento de dia inteiro salvo!"); showEventos(); return;
    }

    if (!hora) return alert("Selecione o horário.");
    if (EV.some(e => e.data === data && e.diaInteiro)) return alert("⚠️ Dia bloqueado por evento de dia inteiro.");
    if (AG.some(a => a.data === data && a.hora === hora)) return alert("⚠️ Já existe um agendamento neste horário.");
    if (EV.some(e => e.data === data && e.hora === hora)) return alert("⚠️ Já existe um evento neste horário.");

    EV.push({ id: Date.now(), cliente, data, hora, diaInteiro: false });
    save("albany_eventos", EV); alert("Evento salvo!"); showEventos();
}

function showEventos() {
    const d = ev_filter.value; if (!d) return;
    const lista = EV.filter(e => e.data === d).sort((a,b)=> (a.hora || "00:00").localeCompare(b.hora || "00:00"));
    if (!lista.length) { ev_list.innerHTML = "<p>Nenhum evento nesta data.</p>"; return; }
    let html = "";
    lista.forEach(e => {
        html += `
<div style="padding:12px;border-left:6px solid var(--accent);margin-bottom:10px;background:var(--card);border-radius:10px">
    <div style="display:flex;justify-content:space-between">
        <div><strong>${e.diaInteiro ? "Dia inteiro" : e.hora}</strong> — ${e.cliente}</div>
        <button class="btn danger" onclick="delEvento(${e.id})">Excluir</button>
    </div>
</div>`;
    });
    ev_list.innerHTML = html;
}

function delEvento(id) {
    if (!confirm("Excluir evento?")) return;
    EV = EV.filter(e => e.id !== id); save("albany_eventos", EV); showEventos();
}

/* =========================
   DASHBOARD
   ========================= */
function renderDashboard() {
    const total = VD.reduce((s, x) => s + (x.total || 0), 0);
    const qtd = VD.length;
    content.innerHTML = `
    <div class="card">
        <h3>📊 Dashboard</h3>
        <p><strong>Total faturado:</strong> R$ ${total.toFixed(2)}</p>
        <p><strong>Vendas registradas:</strong> ${qtd}</p>
    </div>`;
}

/* =========================
   INICIALIZAÇÃO
   ========================= */
renderHome();

/* Service Worker */
if ("serviceWorker" in navigator) {
    try { navigator.serviceWorker.register("sw.js"); } catch (err) {}
}
