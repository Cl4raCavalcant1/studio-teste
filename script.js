/* ===========================================================
   1. BANCO DE DADOS (LOCAL STORAGE)
=========================================================== */
function load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
}
function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Carrega dados iniciais
let AG = load("albany_agenda");
let VD = load("albany_vendas");
let CL = load("albany_clientes");
let EV = load("albany_eventos");

// Variáveis globais para os Gráficos
let chartFaturamentoInstance = null;
let chartTiposInstance = null;

/* ===========================================================
   2. NAVEGAÇÃO E TEMA
=========================================================== */
function nav(p) {
    // Atualiza visual do menu
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`button[onclick*="'${p}'"]`);
    if(btn) btn.classList.add('active');

    // Renderiza a tela correta
    if (p === "home") renderHome();
    if (p === "agenda") renderAgenda();
    if (p === "clientes") renderClientes();
    if (p === "vendas" || p === "pagamentos") renderPagamentos();
    if (p === "dashboard") renderDashboard();
    if (p === "eventos") renderEventos();
}

function toggleTheme() {
    const t = document.body.getAttribute("data-theme");
    document.body.setAttribute("data-theme", t === "light" ? "dark" : "light");
}

/* ===========================================================
   3. FUNÇÕES AUXILIARES (WHATSAPP, FORMAT, DATA, COPIAR)
=========================================================== */
function formatMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getClienteTel(nome) {
    const cli = CL.find(c => c.nome.toLowerCase() === nome.toLowerCase());
    return cli ? cli.tel : "";
}

// --- NOVA FUNÇÃO DE COPIAR ---
function copiarTexto(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        // Mostra um alerta rápido ou usa o alert padrão
        alert("Copiado: " + texto);
    }).catch(err => {
        console.error('Erro ao copiar', err);
    });
}

// ATUALIZADO: Aceita valorFalta para mensagem de cobrança personalizada
function abrirWhatsapp(nome, data, hora, tipo = 'confirmacao', valorFalta = 0) {
    const tel = getClienteTel(nome);
    if (!tel) return alert(`Telefone do cliente "${nome}" não encontrado no cadastro. Vá em Clientes e adicione.`);

    const telClean = tel.replace(/\D/g, '');
    let msg = "";
    
    if (tipo === 'confirmacao') {
        msg = `Olá ${nome}, tudo bem? Aqui é do Studio Albany. Gostaria de confirmar seu agendamento para ${data.split('-').reverse().join('/')} às ${hora}. Podemos confirmar?`;
    } else if (tipo === 'evento') {
        msg = `Olá ${nome}, tudo bem? Passando para confirmar os detalhes do seu evento (${tipo}) no dia ${data.split('-').reverse().join('/')}.`;
    } else if (tipo === 'cobranca') {
        // Formata o valor faltante para moeda brasileira
        const valorFormatado = Number(valorFalta).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        msg = `Olá ${nome}, tudo bem? Aqui é do Studio Albany. Consta em nosso sistema um saldo pendente de ${valorFormatado} referente ao seu pacote. Podemos agendar o pagamento?`;
    }

    const link = `https://wa.me/55${telClean}?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
}

/* ===========================================================
   4. HOME — Resumo do Dia + WhatsApp + Notificação
=========================================================== */
function renderHome() {
    const hoje = new Date().toISOString().slice(0, 10);
    const content = document.getElementById('content');

    const agHoje = AG.filter(a => a.data === hoje).sort((a,b)=> (a.hora||"").localeCompare(b.hora||""));
    const evHoje = EV.filter(e => e.data === hoje);

    let html = `
    <div class='card'>
        <h2>Bem-vinda, Albany!</h2>
        <p>Resumo do dia (${hoje.split('-').reverse().join('/')}):</p>
    `;

    /* EVENTOS DO DIA */
    if (evHoje.length) {
        html += `<h3 style="margin-top:20px; color:var(--primary)">🎪 Eventos de Hoje</h3>`;
        evHoje.forEach(e => {
            html += `
            <div style="padding:15px; border-left:6px solid var(--accent); border-radius:8px; background:var(--bg-body); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${e.diaInteiro ? "Dia inteiro" : e.hora}</strong> — ${e.cliente}
                    <i class="ph ph-copy" style="cursor:pointer; margin-left:5px;" onclick="copiarTexto('${e.cliente}')" title="Copiar Nome"></i><br>
                    <small>${e.tipo || 'Evento'}</small>
                </div>
                <button class="btn-whatsapp" onclick="abrirWhatsapp('${e.cliente}', '${e.data}', '${e.hora}', 'evento')">
                    <i class="ph ph-whatsapp-logo"></i> Confirmar
                </button>
            </div>`;
        });
    }

    /* AGENDAMENTOS DO DIA */
    html += `<h3 style="margin-top:20px; color:var(--text-main)">📷 Agendamentos de Hoje</h3>`;

    if (!agHoje.length) {
        html += `<p>Nenhum agendamento para hoje.</p></div>`;
    } else {
        agHoje.forEach(a => {
            html += `
            <div style="padding:15px; border-left:5px solid var(--accent); margin:10px 0; border-radius:8px; background:var(--bg-body); display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${a.hora}</strong> — ${a.clienteNome}
                    <i class="ph ph-copy" style="cursor:pointer; margin-left:5px;" onclick="copiarTexto('${a.clienteNome}')" title="Copiar Nome"></i><br>
                    <span class="status-pill st-${a.status}">${a.status}</span>
                </div>
                <button class="btn-whatsapp" onclick="abrirWhatsapp('${a.clienteNome}', '${a.data}', '${a.hora}', 'confirmacao')">
                    <i class="ph ph-whatsapp-logo"></i> Confirmar
                </button>
            </div>`;
        });
        html += `</div>`;
    }

    content.innerHTML = html;
    
    // Notificação do navegador
    if (Notification.permission !== "denied" && (agHoje.length || evHoje.length)) {
        Notification.requestPermission().then(p => {
            if (p === "granted") {
                const qtd = agHoje.length + evHoje.length;
                new Notification("Studio Albany", {
                    body: `Você tem ${qtd} compromissos hoje!`,
                    icon: "https://cdn-icons-png.flaticon.com/512/747/747376.png"
                });
            }
        });
    }
}

/* ===========================================================
   5. AGENDA (Completa com Remarcar)
=========================================================== */
const HORARIOS = [];
for (let h = 9; h <= 20; h++) HORARIOS.push(String(h).padStart(2, "0") + ":00");

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
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
            <div>
                <label>Data</label>
                <input type="date" id="ag_data" onchange="carregarHorarios()">
            </div>
            <div>
                <label>Horário</label>
                <select id="ag_hora"></select>
            </div>
        </div>

        <label>Status</label>
        <select id="ag_status">
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
            <option value="remarcado">Remarcado</option>
        </select>

        <div style="margin-top:20px; display:flex; gap:10px;">
            <button class="btn" onclick="saveAgenda()">Salvar</button>
        </div>
    </div>

    <div class='card'>
        <h3>📌 Consultar Agenda</h3>
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <input type="date" id="ag_filter" onchange="showAgendaList()">
            <input type="text" id="ag_search" placeholder="Pesquisar cliente..." oninput="showAgendaList()">
        </div>
        <div id="ag_list">Selecione uma data acima.</div>
    </div>
    `;
}

function carregarHorarios() {
    const data = document.getElementById("ag_data").value;
    if (!data) return;
    const agendados = AG.filter(a => a.data === data).map(a => a.hora);
    const eventos = EV.filter(e => e.data === data);
    
    const diaBloqueado = eventos.some(e => e.diaInteiro);
    const horasBloqueadas = eventos.map(e => e.hora);

    let html = `<option value="">Selecione</option>`;
    HORARIOS.forEach(h => {
        let disabled = "";
        let texto = h;
        if (diaBloqueado) { disabled = "disabled"; texto += " (Evento Dia Todo)"; }
        else if (agendados.includes(h) || horasBloqueadas.includes(h)) { disabled = "disabled"; texto += " (Ocupado)"; }
        html += `<option value="${h}" ${disabled}>${texto}</option>`;
    });
    document.getElementById("ag_hora").innerHTML = html;
}

function saveAgenda() {
    const cliente = document.getElementById("ag_cliente").value;
    const data = document.getElementById("ag_data").value;
    const hora = document.getElementById("ag_hora").value;
    const status = document.getElementById("ag_status").value;

    if (!cliente || !data || !hora) return alert("Preencha todos os campos.");

    // Validação extra de conflito
    if (EV.some(e => e.data === data && e.diaInteiro)) return alert("Dia bloqueado por evento.");
    
    AG.push({ id: Date.now(), clienteNome: cliente, data, hora, status });
    save("albany_agenda", AG);
    alert("Agendado com sucesso!");
    renderAgenda();
}

function showAgendaList() {
    const d = document.getElementById("ag_filter").value;
    const termo = (document.getElementById("ag_search").value || "").toLowerCase();
    
    // Se não tiver data selecionada, tenta mostrar algo ou pede data
    if (!d && !termo) { 
        document.getElementById("ag_list").innerHTML = "<p>Selecione uma data ou pesquise por nome.</p>";
        return; 
    }

    let list = AG;
    if(d) list = list.filter(x => x.data === d);
    if(termo) list = list.filter(x => x.clienteNome.toLowerCase().includes(termo));
    
    list.sort((a,b)=> (a.hora||"").localeCompare(b.hora||""));

    const div = document.getElementById("ag_list");
    if (!list.length) { div.innerHTML = "<p>Nenhum agendamento encontrado.</p>"; return; }

    let html = "";
    list.forEach(a => {
        // Busca telefone para habilitar copia
        const tel = getClienteTel(a.clienteNome);
        
        html += `
        <div style="border-bottom:1px solid var(--border); padding:10px 0; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${a.data ? a.data.split('-').reverse().join('/') : ''} - ${a.hora}</strong> - ${a.clienteNome}
                <i class="ph ph-copy" style="cursor:pointer; margin-left:5px;" onclick="copiarTexto('${a.clienteNome}')" title="Copiar Nome"></i>
                ${tel ? `<i class="ph ph-phone" style="cursor:pointer; margin-left:5px; font-size:0.9em" onclick="copiarTexto('${tel}')" title="Copiar Tel: ${tel}"></i>` : ''} 
                <span class="status-pill st-${a.status}">${a.status}</span>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="btn-whatsapp" title="Zap" onclick="abrirWhatsapp('${a.clienteNome}', '${a.data}', '${a.hora}')"><i class="ph ph-whatsapp-logo"></i></button>
                <button class="btn" style="padding:5px 10px;" onclick="remarcar(${a.id})">Remarcar</button>
                <button class="btn danger" style="padding:5px 10px;" onclick="delAgenda(${a.id})"><i class="ph ph-trash"></i></button>
            </div>
        </div>`;
    });
    div.innerHTML = html;
}

function remarcar(id) {
    const ag = AG.find(x => x.id === id);
    if(!ag) return;
    
    const novaData = prompt("Nova data (YYYY-MM-DD):", ag.data);
    const novoHora = prompt("Novo horário (HH:MM):", ag.hora);

    if (!novaData || !novoHora) return;

    // Simples validação
    if (EV.some(e => e.data === novaData && e.diaInteiro)) return alert("Dia bloqueado!");
    
    ag.data = novaData;
    ag.hora = novoHora;
    ag.status = "remarcado";
    save("albany_agenda", AG);
    showAgendaList();
}

function delAgenda(id) {
    if(confirm("Excluir agendamento?")) {
        AG = AG.filter(x => x.id !== id);
        save("albany_agenda", AG);
        showAgendaList();
    }
}

/* ===========================================================
   6. CLIENTES
=========================================================== */
function renderClientes() {
    const content = document.getElementById('content');
    // ALTERAÇÃO: Adicionado maxlength="11" e filtro de números no oninput
    content.innerHTML = `
    <div class='card'>
        <h3>👤 Novo Cliente</h3>
        <label>Nome</label><input id="c_nome">
        <label>Telefone (WhatsApp)</label>
        <input id="c_tel" type="tel" maxlength="11" oninput="this.value = this.value.replace(/[^0-9]/g, '')" placeholder="Ex: 11999999999 (Apenas números)">
        <label>Instagram</label><input id="c_insta">
        <label>Obs</label><textarea id="c_obs"></textarea>
        <button class="btn" style="margin-top:15px;" onclick="saveCliente()">Salvar Cliente</button>
    </div>
    <div class="card">
        <h3>Lista de Clientes</h3>
        <input id="c_search" placeholder="Pesquisar..." oninput="showClientes()" style="margin-bottom:10px;">
        <div id="c_list"></div>
    </div>`;
    showClientes();
}

function saveCliente() {
    const nome = document.getElementById("c_nome").value;
    const tel = document.getElementById("c_tel").value;
    if(!nome) return alert("Nome obrigatório");
    
    CL.push({ id: Date.now(), nome, tel, insta: document.getElementById("c_insta").value, obs: document.getElementById("c_obs").value });
    save("albany_clientes", CL);
    renderClientes();
}

function showClientes() {
    const termo = (document.getElementById("c_search")?.value || "").toLowerCase();
    const lista = CL.filter(c => c.nome.toLowerCase().includes(termo));
    const div = document.getElementById("c_list");

    if(!lista.length) { div.innerHTML = "<p>Nenhum cliente.</p>"; return; }
    
    let html = `<table><thead><tr><th>Nome</th><th>Tel</th><th>Ações</th></tr></thead><tbody>`;
    lista.forEach(c => {
        const telClean = c.tel ? c.tel.replace(/\D/g, '') : '';
        // ALTERAÇÃO: Adicionado ícone de copiar ao lado do nome e telefone
        html += `<tr>
            <td>
                ${c.nome} 
                <i class="ph ph-copy" style="cursor:pointer; opacity:0.6;" onclick="copiarTexto('${c.nome}')" title="Copiar Nome"></i>
            </td>
            <td>
                ${c.tel}
                <i class="ph ph-copy" style="cursor:pointer; opacity:0.6;" onclick="copiarTexto('${c.tel}')" title="Copiar Tel"></i>
            </td>
            <td style="display:flex; gap:5px;">
                ${telClean ? `<a href="https://wa.me/55${telClean}" target="_blank" class="btn-whatsapp" style="padding:5px 8px;"><i class="ph ph-whatsapp-logo"></i></a>` : ''}
                <button class="btn danger" onclick="delCliente(${c.id})" style="padding:5px 8px;"><i class="ph ph-trash"></i></button>
            </td>
        </tr>`;
    });
    html += "</tbody></table>";
    div.innerHTML = html;
}

function delCliente(id) {
    if(confirm("Excluir cliente?")) {
        CL = CL.filter(c => c.id !== id);
        save("albany_clientes", CL);
        showClientes();
    }
}

/* ===========================================================
   7. FINANCEIRO & VENDAS
=========================================================== */
function renderPagamentos() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>💳 Nova Venda</h3>
        <label>Cliente</label>
        <select id="p_cliente">
            <option value="">Selecione</option>
            ${CL.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("")}
        </select>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div><label>Pacote</label>
            <select id='p_pac' onchange="calcPrev()"><option value='p1'>Pacote 1 (R$70)</option><option value='p2'>Pacote 2 (R$100)</option><option value='cortesia'>Cortesia</option></select></div>
            <div><label>Extras Pagos (Qtd)</label><input type="number" id="p_ext" value="0" onchange="calcPrev()"></div>
        </div>

        <label style="color:var(--danger)">Qtd. Cortesias (Não cobrado)</label>
        <input type="number" id="p_cortesia" value="0" onchange="calcPrev()">
        <p id="p_feedback_cortesia" style="font-size:12px; color:var(--danger); font-weight:bold;"></p>

        <label>Total Final (R$)</label>
        <input type="number" id="p_total">
        
        <label>Valor Pago Agora (Entrada)</label>
        <input type="number" id="p_pago_agora" value="0">
        
        <label>Forma</label>
        <select id="p_forma"><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="credito">Crédito</option></select>

        <button class="btn" style="margin-top:15px;" onclick="saveVenda()">Registrar Venda</button>
    </div>

    <div class='card'>
        <h3>📄 Histórico de Vendas</h3>
        <div style="display:flex; gap:10px; margin-bottom:10px;">
             <button class="btn ghost" onclick="baixarPDF()">📄 Exportar Relatório</button>
             <input placeholder="Buscar..." id="p_search" oninput="showPagamentos()">
        </div>
        <div id='p_list'></div>
    </div>
    <div id="p_details_container"></div>
    `;
    calcPrev();
    showPagamentos();
}

function calcTotal(p, e) {
    if (p === "p1") return 70 + (e * 10);
    if (p === "p2") return 100 + (e * 15);
    return 0;
}

function calcPrev() {
    const pac = document.getElementById('p_pac').value;
    const ext = Number(document.getElementById('p_ext').value);
    const cort = Number(document.getElementById('p_cortesia').value);
    
    let custoUnit = pac === 'p2' ? 15 : 10;
    const perda = cort * custoUnit;

    const total = calcTotal(pac, ext);
    if(pac !== 'cortesia') document.getElementById('p_total').value = total;
    else document.getElementById('p_total').value = 0;

    const fb = document.getElementById('p_feedback_cortesia');
    if(perda > 0) fb.innerText = `Você está deixando de ganhar R$ ${perda.toFixed(2)} em cortesias.`;
    else fb.innerText = "";
}

function saveVenda() {
    const nome = document.getElementById('p_cliente').value;
    const pacote = document.getElementById('p_pac').value;
    const total = Number(document.getElementById('p_total').value);
    const cortesiaQtd = Number(document.getElementById('p_cortesia').value);
    const pagoAgora = Number(document.getElementById('p_pago_agora').value || 0);
    const forma = document.getElementById('p_forma').value;
    
    let custoUnit = pacote === 'p2' ? 15 : 10;
    const valorCortesia = cortesiaQtd * custoUnit;

    if(!nome) return alert("Selecione o cliente");

    const novaVenda = {
        id: Date.now(),
        nome, pacote, total, valorCortesia, cortesiaQtd,
        pagamentos: [],
        createdAt: new Date().toISOString()
    };

    if (pagoAgora > 0) {
        novaVenda.pagamentos.push({ valor: pagoAgora, forma, data: new Date().toISOString() });
    }

    VD.push(novaVenda);
    save("albany_vendas", VD);
    alert("Venda registrada!");
    renderPagamentos();
}

function totalPago(v) {
    if (!v.pagamentos || !v.pagamentos.length) return 0;
    return v.pagamentos.reduce((s,x) => s + Number(x.valor || 0), 0);
}

function showPagamentos() {
    const termo = (document.getElementById("p_search")?.value || "").toLowerCase();
    let lista = VD.slice().reverse();

    if (termo) lista = lista.filter(v => v.nome.toLowerCase().includes(termo));

    const pList = document.getElementById("p_list");
    if (!lista.length) { pList.innerHTML = "<p>Nenhuma venda.</p>"; return; }

    let html = `<table><thead><tr><th>Data</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Status</th><th>Ações</th></tr></thead><tbody>`;

    lista.forEach(v => {
        const pago = totalPago(v);
        const falta = Math.max(0, v.total - pago); // Calcula valor que falta

        // Status Lógica
        let stClass = "st-cancelado"; 
        let stLabel = "Pendente";
        if(pago >= v.total - 0.1) { stClass = "st-confirmado"; stLabel = "Pago"; }
        else if(pago > 0) { stClass = "st-parcial"; stLabel = "Parcial"; }

        // ALTERAÇÃO: Adicionado ícone de copiar ao lado do nome e passado "falta" para o whatsapp
        html += `
        <tr>
            <td>${new Date(v.createdAt).toLocaleDateString()}</td>
            <td>
                ${v.nome} <i class="ph ph-copy" style="cursor:pointer; opacity:0.6;" onclick="copiarTexto('${v.nome}')" title="Copiar Nome"></i>
                <br><small>${v.pacote}</small>
            </td>
            <td>${formatMoeda(v.total)}</td>
            <td>${formatMoeda(pago)}</td>
            <td><span class="status-pill ${stClass}">${stLabel}</span></td>
            <td style="display:flex; gap:5px">
                <button class="btn" style="padding:5px 8px" onclick="openPagamentoDetalhes(${v.id})">Detalhes</button>
                <button class="btn ghost" style="padding:5px 8px" title="Comprovante Individual" onclick="baixarVendaPDF(${v.id})">📄</button>
                <button class="btn-whatsapp" style="padding:5px 8px" onclick="abrirWhatsapp('${v.nome}', '', '', 'cobranca', ${falta})"><i class="ph ph-whatsapp-logo"></i></button>
                <button class="btn danger" style="padding:5px 8px" onclick="delVenda(${v.id})">X</button>
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

    let html = `
    <div class="card" style="border:2px solid var(--accent); margin-top:20px; animation: fadeIn 0.3s;">
        <h3>Detalhes — ${v.nome}</h3>
        <p><strong>Pacote:</strong> ${v.pacote}</p>
        <p style="color:var(--danger)"><strong>Cortesias dadas:</strong> ${v.cortesiaQtd || 0} (R$ ${(v.valorCortesia||0).toFixed(2)})</p>
        <p><strong>Total:</strong> ${formatMoeda(v.total)} | <strong>Pago:</strong> ${formatMoeda(pago)} | <strong style="color:${falta>0?'red':'green'}">Falta: ${formatMoeda(falta)}</strong></p>

        <h4>Histórico</h4>
    `;

    if (!v.pagamentos || !v.pagamentos.length) html += "<p>Nada pago ainda.</p>";
    else {
        html += `<ul>`;
        v.pagamentos.forEach(p => {
            html += `<li>${new Date(p.data).toLocaleDateString()} - ${formatMoeda(p.valor)} (${p.forma})</li>`;
        });
        html += `</ul>`;
    }

    if (falta > 0) {
        html += `
        <h4 style="margin-top:10px">Adicionar Parcela</h4>
        <div style="display:flex; gap:10px; align-items:flex-end;">
            <div><label>Valor</label><input type="number" id="p_add_valor_${id}" value="${falta.toFixed(2)}"></div>
            <div><label>Forma</label><select id="p_add_forma_${id}"><option>Pix</option><option>Dinheiro</option></select></div>
            <button class="btn" onclick="addPagamento(${id})">Lançar</button>
        </div>
        `;
    }

    html += `<button class="btn ghost" style="margin-top:15px; width:100%" onclick="document.getElementById('p_details_container').innerHTML=''">Fechar Detalhes</button></div>`;

    container.innerHTML = html;
    container.scrollIntoView({ behavior: 'smooth' });
}

function addPagamento(id) {
    const v = VD.find(x => x.id === id);
    const valor = Number(document.getElementById(`p_add_valor_${id}`).value);
    const forma = document.getElementById(`p_add_forma_${id}`).value;

    if (valor <= 0) return alert("Valor inválido");

    if(!v.pagamentos) v.pagamentos = [];
    v.pagamentos.push({ valor, forma, data: new Date().toISOString() });
    
    save("albany_vendas", VD);
    alert("Pagamento adicionado!");
    openPagamentoDetalhes(id); // Recarrega detalhes
    showPagamentos(); // Recarrega lista
}

function delVenda(id) {
    if(confirm("Tem certeza que quer apagar essa venda?")) {
        VD = VD.filter(v => v.id !== id);
        save("albany_vendas", VD);
        showPagamentos();
        document.getElementById("p_details_container").innerHTML = "";
    }
}

function baixarPDF() {
    if (!VD.length) return alert("Nenhuma venda para exportar.");
    let doc = "RELATÓRIO DE VENDAS - STUDIO ALBANY\n=================================\n\n";
    VD.forEach(v => {
        const pago = totalPago(v);
        doc += `CLIENTE: ${v.nome}\nPACOTE: ${v.pacote}\nTOTAL: ${formatMoeda(v.total)}\nPAGO: ${formatMoeda(pago)}\nSTATUS: ${pago >= v.total ? 'PAGO' : 'PENDENTE'}\n\n`;
    });
    
    const blob = new Blob([doc], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "relatorio_financeiro.txt";
    a.click();
}

// FUNÇÃO RESTAURADA: Comprovante Individual
function baixarVendaPDF(id) {
    const v = VD.find(x => x.id === id);
    if (!v) return;
    const pago = totalPago(v);
    const falta = Math.max(0, v.total - pago);

    let doc = `COMPROVANTE STUDIO ALBANY\n=========================\n`;
    doc += `Data: ${new Date().toLocaleDateString()}\n`;
    doc += `Cliente: ${v.nome}\n`;
    doc += `Pacote: ${v.pacote}\n`;
    doc += `\nVALORES:\n`;
    doc += `Total Contratado: ${formatMoeda(v.total)}\n`;
    doc += `Total Pago: ${formatMoeda(pago)}\n`;
    doc += `Restante: ${formatMoeda(falta)}\n`;
    
    doc += `\nHISTÓRICO DE PAGAMENTOS:\n`;
    if(!v.pagamentos || !v.pagamentos.length) doc += " - Nenhum pagamento.\n";
    else v.pagamentos.forEach(p => {
        doc += ` - ${new Date(p.data).toLocaleDateString()}: ${formatMoeda(p.valor)} (${p.forma})\n`;
    });
    
    const blob = new Blob([doc], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `recibo_${v.nome.replace(/ /g,'_')}.txt`;
    a.click();
}

/* ===========================================================
   8. DASHBOARD COM GRÁFICOS
=========================================================== */
function renderDashboard() {
    const content = document.getElementById('content');
    
    // 1. Cálculos de KPIs
    const totalFaturado = VD.reduce((acc, v) => acc + Number(v.total), 0);
    const totalVendas = VD.length;
    const totalCortesiasPerdidas = VD.reduce((acc, v) => acc + Number(v.valorCortesia || 0), 0);

    // 2. HTML Estrutural
    content.innerHTML = `
    <div class="dashboard-grid">
        <div class="kpi-card">
            <span class="kpi-title">Faturamento Total</span>
            <span class="kpi-value">${formatMoeda(totalFaturado)}</span>
            <span class="kpi-sub" style="color:var(--success)">Receita acumulada</span>
        </div>
        <div class="kpi-card">
            <span class="kpi-title">Vendas Realizadas</span>
            <span class="kpi-value">${totalVendas}</span>
            <span class="kpi-sub" style="color:var(--text-muted)">Contratos</span>
        </div>
        <div class="kpi-card" style="border-color: var(--danger);">
            <span class="kpi-title" style="color:var(--danger)">Potencial em Cortesias</span>
            <span class="kpi-value" style="color:var(--danger)">${formatMoeda(totalCortesiasPerdidas)}</span>
            <span class="kpi-sub">Valor que deixou de ganhar</span>
        </div>
    </div>

    <div class="charts-row">
        <div class="card">
            <h3>📈 Faturamento vs Cortesias (Últimos Meses)</h3>
            <div class="chart-box"><canvas id="chartFaturamento"></canvas></div>
        </div>
        <div class="card">
            <h3> Tipos de Eventos</h3>
            <div class="chart-box"><canvas id="chartTipos"></canvas></div>
        </div>
    </div>
    `;

    setTimeout(gerarGraficos, 100);
}

function gerarGraficos() {
    // --- GRÁFICO 1 ---
    const dadosMes = {}; 
    VD.forEach(v => {
        const mes = v.createdAt.slice(0, 7); 
        if (!dadosMes[mes]) dadosMes[mes] = { faturamento: 0, cortesia: 0 };
        dadosMes[mes].faturamento += Number(v.total);
        dadosMes[mes].cortesia += Number(v.valorCortesia || 0);
    });

    const labelsMes = Object.keys(dadosMes).sort();
    const dataFat = labelsMes.map(m => dadosMes[m].faturamento);
    const dataCort = labelsMes.map(m => dadosMes[m].cortesia);

    if(chartFaturamentoInstance) chartFaturamentoInstance.destroy();
    const ctx1 = document.getElementById('chartFaturamento').getContext('2d');
    chartFaturamentoInstance = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: labelsMes,
            datasets: [
                { label: 'Faturamento (R$)', data: dataFat, backgroundColor: '#b7924b' },
                { label: 'Perda Cortesia (R$)', data: dataCort, backgroundColor: '#c62828' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // --- GRÁFICO 2 ---
    const dadosTipos = {};
    EV.forEach(e => {
        const t = e.tipo || "Outros";
        dadosTipos[t] = (dadosTipos[t] || 0) + 1;
    });

    if(chartTiposInstance) chartTiposInstance.destroy();
    const ctx2 = document.getElementById('chartTipos').getContext('2d');
    chartTiposInstance = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dadosTipos),
            datasets: [{
                data: Object.values(dadosTipos),
                backgroundColor: ['#b7924b', '#ef6c00', '#2e7d32', '#1f2937', '#6b7280']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

/* ===========================================================
   9. EVENTOS (Restaurado Toggle Horário)
=========================================================== */
function renderEventos() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>🎪 Novo Evento</h3>
        <label>Cliente</label>
        <select id="ev_cliente">${CL.map(c => `<option value="${c.nome}">${c.nome}</option>`).join("")}</select>
        <label>Tipo</label>
        <select id="ev_tipo">
            <option>Casamento</option><option>Aniversário</option><option>Formatura</option><option>Batizado</option>
            <option>Outros</option>
        </select>
        <label>Data</label><input type="date" id="ev_data">
        
        <label>Dia Inteiro?</label>
        <select id="ev_diaInteiro" onchange="toggleEventoHorario()">
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
        </select>
        
        <div id="div_ev_hora">
            <label>Hora</label><input type="time" id="ev_hora">
        </div>
        
        <button class="btn" style="margin-top:15px" onclick="saveEvento()">Salvar Evento</button>
    </div>
    <div class="card">
        <h3>Lista de Eventos</h3>
        <div id="ev_list"></div>
    </div>`;
    showEventosList();
}

function toggleEventoHorario() {
    const diaInteiro = document.getElementById("ev_diaInteiro").value === "sim";
    document.getElementById("div_ev_hora").style.display = diaInteiro ? "none" : "block";
}

function saveEvento() {
    const cli = document.getElementById("ev_cliente").value;
    const tipo = document.getElementById("ev_tipo").value;
    const data = document.getElementById("ev_data").value;
    const diaInteiro = document.getElementById("ev_diaInteiro").value === "sim";
    const hora = diaInteiro ? null : document.getElementById("ev_hora").value;

    if(!cli || !data) return alert("Preencha os dados");

    EV.push({ id: Date.now(), cliente: cli, tipo, data, hora, diaInteiro });
    save("albany_eventos", EV);
    renderEventos();
}

function showEventosList() {
    const div = document.getElementById("ev_list");
    let html = "";
    EV.forEach(e => {
        // ALTERAÇÃO: Adicionado ícone de copiar
        html += `
        <div style="border-bottom:1px solid var(--border); padding:10px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${e.data.split('-').reverse().join('/')}</strong> - ${e.tipo} (${e.cliente})
                <i class="ph ph-copy" style="cursor:pointer; margin-left:5px;" onclick="copiarTexto('${e.cliente}')" title="Copiar Nome"></i>
                <br><small>${e.diaInteiro ? "Dia Todo" : "Às " + e.hora}</small>
            </div>
            <div style="display:flex; gap:5px">
                <button class="btn-whatsapp" onclick="abrirWhatsapp('${e.cliente}', '${e.data}', '${e.hora}', 'evento')">
                    <i class="ph ph-whatsapp-logo"></i>
                </button>
                <button class="btn danger" onclick="delEvento(${e.id})"><i class="ph ph-trash"></i></button>
            </div>
        </div>`;
    });
    div.innerHTML = html || "<p>Nenhum evento.</p>";
}

function delEvento(id) {
    if(confirm("Excluir?")) {
        EV = EV.filter(e => e.id !== id);
        save("albany_eventos", EV);
        renderEventos();
    }
}

// RESTAURADO: Service Worker (para funcionar melhor em celulares)
if ("serviceWorker" in navigator) {
    try { navigator.serviceWorker.register("sw.js"); } catch (err) {}
}

// INICIA NA HOME
renderHome();