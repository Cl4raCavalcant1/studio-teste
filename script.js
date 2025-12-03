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
    if (p === "vendas") renderVendas();
    if (p === "dashboard") renderDashboard();
    if (p === "eventos") renderEventos();

}

/* Alternar tema */
function toggleTheme() {
    const t = document.body.getAttribute("data-theme");
    document.body.setAttribute("data-theme", t === "light" ? "dark" : "light");
}

/* ===========================================================
   HOME — Mostra os agendamentos de hoje + NOTIFICAÇÃO
=========================================================== */
function renderHome() {
    const hoje = new Date().toISOString().slice(0, 10);
    const agHoje = AG.filter(a => a.data === hoje)
                     .sort((a,b)=>a.hora.localeCompare(b.hora));

    let html = `
    <div class='card'>
        <h2>Bem-vinda, Albany!</h2>
        <p>Resumo dos agendamentos de hoje (${hoje}):</p>
    `;

    if (!agHoje.length) {
        html += `<p>Nenhum agendamento hoje.</p></div>`;
    } else {
        agHoje.forEach(a => {
            html += `
                <div style="padding:12px;border-left:5px solid var(--accent);margin:10px 0;border-radius:10px;background:var(--card)">
                    <strong>${a.hora}</strong> — ${a.clienteNome || a.nome}<br>
                    <span class="status-pill st-${a.status}">${a.status}</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    content.innerHTML = html;

    /* 📢 NOVO — Notificação simples mostrando clientes do dia */
    if (Notification.permission !== "denied") {
        Notification.requestPermission().then(p => {
            if (p === "granted" && agHoje.length) {
                const nomes = agHoje.map(x => `${x.hora} — ${x.clienteNome}`).join("\n");
                new Notification("Agendamentos de hoje", { body: nomes });
            }
        });
    }
}

/* ===========================================================
   AGENDA — Com horários disponíveis + remarcar + PESQUISA
=========================================================== */
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

        <!-- NOVO: campo de busca -->
        <input id="ag_search" placeholder="Pesquisar cliente..." oninput="showAgendaList()" />

        <input type="date" id="ag_filter" onchange="showAgendaList()">
        <div id="ag_list" style="margin-top:15px">Selecione uma data</div>
    </div>
    `;
}

/* ✔ NOVO — Horários 09:00 → 20:00 */
const HORARIOS = [];
for (let h = 9; h <= 20; h++) {
    HORARIOS.push(String(h).padStart(2, "0") + ":00");
}

/* Carregar horários livres */
function carregarHorarios() {
    const data = ag_data.value;
    if (!data) return;
    const agendados = AG.filter(a => a.data === data).map(a => a.hora);

    let html = `<option value="">Selecione</option>`;
    HORARIOS.forEach(h => {
        if (agendados.includes(h)) {
            html += `<option disabled>${h} — Ocupado</option>`;
        } else {
            html += `<option value="${h}">${h}</option>`;
        }
    });

    ag_hora.innerHTML = html;
}

/* Salvar agendamento */
function saveAgenda() {
    const cliente = ag_cliente.value;
    const data = ag_data.value;
    const hora = ag_hora.value;
    const status = ag_status.value;

    if (!cliente || !data || !hora) {
        alert("Preencha todos os campos.");
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

/* Listar agendamentos com busca */
function showAgendaList() {
    const d = ag_filter.value;
    if (!d) return;

    const termo = (ag_search.value || "").toLowerCase(); // NOVO

    const list = AG.filter(x =>
        x.data === d &&
        x.clienteNome.toLowerCase().includes(termo)
    ).sort((a,b)=>a.hora.localeCompare(b.hora));

    if (!list.length) {
        ag_list.innerHTML = "<p>Nenhum agendamento.</p>";
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

    ag_list.innerHTML = html;
}

/* Remarcar agendamento */
function remarcar(id) {
    const ag = AG.find(x => x.id === id);
    const novaData = prompt("Nova data (YYYY-MM-DD):", ag.data);
    const novoHora = prompt("Novo horário (HH:MM):", ag.hora);

    if (!novaData || !novoHora) return;

    ag.data = novaData;
    ag.hora = novoHora;
    ag.status = "remarcado";

    save("albany_agenda", AG);
    showAgendaList();
}

/* Excluir */
function delAgenda(id) {
    if (!confirm("Confirmar exclusão?")) return;
    AG = AG.filter(x => x.id !== id);
    save("albany_agenda", AG);
    showAgendaList();
}

/* ===========================================================
   CLIENTES — COM BUSCA
=========================================================== */
function renderClientes() {
    content.innerHTML = `
    <div class='card'>
        <h3>👤 Novo Cliente</h3>

        <label>Nome</label>
        <input id="c_nome">

        <label>Telefone</label>
        <input id="c_tel">

        <label>Instagram</label>
        <input id="c_insta">

        <label>Observações</label>
        <textarea id="c_obs"></textarea>

        <button class="btn" onclick="saveCliente()">Salvar</button>
    </div>

    <div class="card">
        <h3>📄 Lista de Clientes</h3>

        <!-- NOVO: campo de busca -->
        <input id="c_search" placeholder="Pesquisar cliente..." oninput="showClientes()">

        <div id="c_list"></div>
    </div>
    `;

    showClientes();
}

function saveCliente() {
    const n = c_nome.value.trim();
    if (!n) return alert("Informe o nome");

    CL.push({
        id: Date.now(),
        nome: c_nome.value,
        tel: c_tel.value,
        insta: c_insta.value,
        obs: c_obs.value
    });

    save("albany_clientes", CL);
    renderClientes();
}

function showClientes() {
    const termo = (c_search.value || "").toLowerCase(); // NOVO

    const lista = CL.filter(c => c.nome.toLowerCase().includes(termo));

    if (!lista.length) {
        c_list.innerHTML = "<p>Nenhum cliente cadastrado.</p>";
        return;
    }

    let html = `<table><thead><tr>
        <th>Nome</th>
        <th>Telefone</th>
        <th>Instagram</th>
        <th>Ações</th>
    </tr></thead><tbody>`;

    lista.forEach(c => {
        html += `
        <tr>
            <td>${c.nome}</td>
            <td>${c.tel}</td>
            <td>${c.insta}</td>
            <td><button class="btn danger" onclick="delCliente(${c.id})">Excluir</button></td>
        </tr>`;
    });

    html += "</tbody></table>";
    c_list.innerHTML = html;
}

function delCliente(id) {
    if (!confirm("Excluir cliente?")) return;
    CL = CL.filter(x => x.id !== id);
    save("albany_clientes", CL);
    showClientes();
}

/* ===========================================================
   VENDAS + PDF
=========================================================== */
function renderVendas() {
    content.innerHTML = `
    <div class='card'>
        <h3>💰 Registrar Venda</h3>

        <label>Cliente</label>
        <select id="v_nome">
            ${CL.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("")}
        </select>

        <label>Pacote</label>
        <select id='v_pac'>
            <option value='p1'>Pacote 1 - R$70</option>
            <option value='p2'>Pacote 2 - R$100</option>
            <option value='cortesia'>Cortesia</option>
        </select>

        <label>Extras (quantidade)</label>
        <input type="number" id="v_ext" value="0">

        <label>Forma de Pagamento</label>
        <select id="v_pag">
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="credito">Crédito</option>
            <option value="debito">Débito</option>
        </select>

        <div class="row">
            <button class="btn" onclick="saveVenda()">Salvar</button>
            <button class="btn ghost" onclick="baixarPDF()">Baixar PDF</button>
        </div>
    </div>

    <div class='card'>
        <h3>📄 Histórico de Vendas</h3>
        <div id='v_list'></div>
    </div>
    `;

    showVendas();
}

function calcTotal(p, e) {
    if (p === "p1") return 70 + e * 10;
    if (p === "p2") return 100 + e * 15;
    return 0;
}

function saveVenda() {
    const nome = v_nome.value;
    const pac = v_pac.value;
    const ext = Number(v_ext.value || 0);
    const pag = v_pag.value;

    VD.push({
        id: Date.now(),
        nome,
        pacote: pac,
        extras: ext,
        pag,
        total: calcTotal(pac, ext),
        data: new Date().toISOString()
    });

    save("albany_vendas", VD);
    showVendas();
}

function showVendas() {
    if (!VD.length) {
        v_list.innerHTML = "<p>Nenhuma venda registrada.</p>";
        return;
    }

    let html = `<table><thead><tr>
        <th>Data</th><th>Cliente</th><th>Pacote</th><th>Extras</th><th>Pagamento</th><th>Total</th><th>Ações</th>
    </tr></thead><tbody>`;

    VD.slice().reverse().forEach(v => {
        html += `
        <tr>
            <td>${new Date(v.data).toLocaleString()}</td>
            <td>${v.nome}</td>
            <td>${v.pacote}</td>
            <td>${v.extras}</td>
            <td>${v.pag}</td>
            <td>R$ ${v.total.toFixed(2)}</td>
            <td><button class="btn danger" onclick="delVenda(${v.id})">Excluir</button></td>
        </tr>`;
    });

    html += "</tbody></table>";

    v_list.innerHTML = html;
}

function delVenda(id) {
    if (!confirm("Excluir venda?")) return;
    VD = VD.filter(v => v.id !== id);
    save("albany_vendas", VD);
    showVendas();
}

/* PDF em TXT */
function baixarPDF() {
    if (!VD.length) return alert("Nenhuma venda para exportar.");

    let doc = "";
    VD.forEach(v => {
        doc += `
Data: ${new Date(v.data).toLocaleString()}
Cliente: ${v.nome}
Pacote: ${v.pacote}
Extras: ${v.extras}
Pagamento: ${v.pag}
Total: R$ ${v.total.toFixed(2)}

`;
    });

    const blob = new Blob([doc], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vendas.txt";
    a.click();
}

/* ===========================================================
   DASHBOARD
=========================================================== */
function renderDashboard() {
    const total = VD.reduce((s, x) => s + x.total, 0);
    const qtd = VD.length;

    content.innerHTML = `
    <div class="card">
        <h3>📊 Dashboard</h3>
        <p><strong>Total faturado:</strong> R$ ${total.toFixed(2)}</p>
        <p><strong>Vendas registradas:</strong> ${qtd}</p>
    </div>`;
}

/* ===========================================================
   INÍCIO
=========================================================== */
renderHome();

/* ===========================================================
   SERVICE WORKER
=========================================================== */
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}
/* ===========================================================
   EVENTOS — Não conflitar com agenda existente
=========================================================== */
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

        <label id="lbl_hora">Horário</label>
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

    toggleEventoHorario();
}

function toggleEventoHorario() {
    const diaInteiro = ev_diaInteiro.value === "sim";
    document.getElementById("lbl_hora").style.display = diaInteiro ? "none" : "block";
    ev_hora.style.display = diaInteiro ? "none" : "block";
}

function carregarHorariosEvento() {
    const data = ev_data.value;
    if (!data) return;

    const existeDiaInteiro = EV.some(e => e.data === data && e.diaInteiro);

    const agendados = AG.filter(a => a.data === data).map(a => a.hora);
    const eventos = EV.filter(e => e.data === data && !e.diaInteiro).map(e => e.hora);

    let html = `<option value="">Selecione</option>`;

    HORARIOS.forEach(h => {
        if (existeDiaInteiro || agendados.includes(h) || eventos.includes(h)) {
            html += `<option disabled>${h} — Ocupado</option>`;
        } else {
            html += `<option value="${h}">${h}</option>`;
        }
    });

    ev_hora.innerHTML = html;
}

function saveEvento() {
    const cliente = ev_cliente.value;
    const data = ev_data.value;
    const hora = ev_hora.value;
    const diaInteiro = ev_diaInteiro.value === "sim";

    if (!cliente || !data) {
        alert("Preencha todos os campos.");
        return;
    }

    // Dia inteiro → bloqueia o dia
    if (diaInteiro) {
        const temAgenda = AG.some(a => a.data === data);
        const temEvento = EV.some(e => e.data === data);

        if (temAgenda || temEvento) {
            alert("⚠️ Já existe compromisso neste dia.");
            return;
        }

        EV.push({
            id: Date.now(),
            cliente,
            data,
            hora: null,
            diaInteiro: true
        });

        save("albany_eventos", EV);
        alert("Evento de dia inteiro salvo!");
        showEventos();
        return;
    }

    // Evento com horário → validar conflito
    if (!hora) return alert("Selecione o horário.");

    const conflitoAgenda = AG.some(a => a.data === data && a.hora === hora);
    const conflitoEvento = EV.some(e => e.data === data && e.hora === hora);
    const diaBloqueado = EV.some(e => e.data === data && e.diaInteiro);

    if (diaBloqueado) return alert("⚠️ O dia está bloqueado por um evento de dia inteiro.");
    if (conflitoAgenda) return alert("⚠️ Agendamento já existe neste horário.");
    if (conflitoEvento) return alert("⚠️ Evento já existe neste horário.");

    EV.push({
        id: Date.now(),
        cliente,
        data,
        hora,
        diaInteiro: false
    });

    save("albany_eventos", EV);
    alert("Evento salvo!");
    showEventos();
}

function showEventos() {
    const d = ev_filter.value;
    if (!d) return;

    const lista = EV.filter(e => e.data === d)
                    .sort((a,b)=> (a.hora || "00:00").localeCompare(b.hora || "00:00"));

    if (!lista.length) {
        ev_list.innerHTML = "<p>Nenhum evento nesta data.</p>";
        return;
    }

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
    EV = EV.filter(e => e.id !== id);
    save("albany_eventos", EV);
    showEventos();
}