/* ===========================================================
   1. DADOS, HELPERS E VARIÁVEIS GLOBAIS
=========================================================== */

// Função para carregar dados do localStorage
function load(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        return [];
    }
}

// Função para salvar dados no localStorage
function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Carregar os bancos de dados
let AG = load("albany_agenda");     // Agendamentos (Ensaios)
let VD = load("albany_vendas");     // Vendas (Financeiro)
let CL = load("albany_clientes");   // Clientes
let EV = load("albany_eventos");    // Eventos (Casamentos, Festas)

// Sistema de Notificações (Toasts) - Substitui o alert()
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return; 
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'warning-circle' : 'info');
    
    toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
            <i class="ph ph-${icon}" style="font-size:20px"></i>
            <span>${msg}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Remove após 3.5 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Formatar telefone para link do WhatsApp (remove letras/traços)
function formatPhone(phone) { 
    return phone.replace(/\D/g, ''); 
}

/* ===========================================================
   2. NAVEGAÇÃO
=========================================================== */
function nav(p) {
    // Esconde/Mostra lógica simples baseada em re-renderizar o conteúdo
    if (p === "home") renderHome();
    if (p === "agenda") renderAgendaVisual(); 
    if (p === "clientes") renderClientes();
    if (p === "vendas" || p === "pagamentos") renderPagamentos(); 
    if (p === "dashboard") renderDashboardAvancado(); 
    if (p === "eventos") renderEventos();
    if (p === "config") renderConfig();
}

function toggleTheme() {
    const t = document.body.getAttribute("data-theme");
    document.body.setAttribute("data-theme", t === "light" ? "dark" : "light");
}

/* ===========================================================
   3. HOME (RESUMO DO DIA)
=========================================================== */
function renderHome() {
    const hoje = new Date().toISOString().slice(0, 10);
    const content = document.getElementById('content');
    
    // Filtros do dia
    const agHoje = AG.filter(a => a.data === hoje).sort((a,b)=> (a.hora||"").localeCompare(b.hora||""));
    const evHoje = EV.filter(e => e.data === hoje).sort((a,b)=> (a.hora||"").localeCompare(b.hora||""));

    let html = `
    <div class='card'>
        <h2>Bem-vinda, Albany!</h2>
        <p>Resumo do dia (${hoje.split('-').reverse().join('/')}):</p>
    `;

    // Secção de Eventos
    if (evHoje.length) {
        html += `<h3 style="margin-top:20px">🎪 Eventos de Hoje</h3>`;
        evHoje.forEach(e => {
            html += `
            <div style="padding:12px;border-left:6px solid var(--accent);
                        border-radius:10px;background:var(--bg-body);margin-bottom:10px">
                <strong>${e.diaInteiro ? "Dia inteiro" : e.hora}</strong> — ${e.cliente}<br>
                <small>${e.tipo || 'Evento'}</small>
            </div>`;
        });
    } else {
        html += `<p style="margin-top:20px"><em>Nenhum evento especial hoje.</em></p>`;
    }

    // Secção de Ensaios
    html += `<h3 style="margin-top:20px">📷 Ensaios de Hoje</h3>`;
    if (!agHoje.length) {
        html += `<p>Nenhum agendamento hoje.</p></div>`;
    } else {
        agHoje.forEach(a => {
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
                    ${phone ? `<a href="${waLink}" target="_blank" class="btn whatsapp" title="Confirmar no Zap"><i class="ph ph-whatsapp-logo"></i></a>` : ''}
                </div>
            `;
        });
        html += `</div>`;
    }
    content.innerHTML = html;
}

/* ===========================================================
   4. AGENDA VISUAL (FULLCALENDAR) + EXPORTAÇÃO IOS
=========================================================== */
function renderAgendaVisual() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px; flex-wrap:wrap; gap:10px">
            <h3>📅 Agenda Visual</h3>
            <div style="display:flex; gap:10px">
                <button class="btn ghost" onclick="exportarParaIOS()" title="Salvar no iPhone">
                    <i class="ph ph-apple-logo"></i> Salvar no iOS
                </button>
                <button class="btn" onclick="renderAgendaForm()">+ Novo</button>
            </div>
        </div>
        <div id='calendar'></div>
    </div>`;

    // Mapeia os dados para o FullCalendar
    const eventosCalendario = [
        ...AG.map(a => ({
            title: `📷 ${a.clienteNome}`,
            start: `${a.data}T${a.hora}`,
            color: a.status === 'cancelado' ? '#ef4444' : (a.status === 'remarcado' ? '#f59e0b' : '#b7924b'),
            extendedProps: { tipo: 'ensaio', id: a.id }
        })),
        ...EV.map(e => ({
            title: `🎪 ${e.cliente} (${e.tipo})`,
            start: e.diaInteiro ? e.data : `${e.data}T${e.hora}`,
            color: '#10b981',
            extendedProps: { tipo: 'evento', id: e.id }
        }))
    ];

    setTimeout(() => {
        var calendarEl = document.getElementById('calendar');
        var calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
            locale: 'pt-br',
            buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Lista' },
            events: eventosCalendario,
            height: 650,
            eventClick: function(info) {
                // Ao clicar, mostra detalhes básicos
                alert(`Evento: ${info.event.title}\nInício: ${info.event.start.toLocaleString()}`);
            }
        });
        calendar.render();
    }, 100);
}

function renderAgendaForm() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>📅 Novo Agendamento (Ensaio)</h3>
        <label>Cliente</label>
        <select id="ag_cliente">
            <option>Selecione</option>
            ${CL.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('')}
        </select>
        
        <label>Data</label>
        <input type="date" id="ag_data">
        
        <label>Horário</label>
        <input type="time" id="ag_hora">
        
        <label>Status</label>
        <select id="ag_status">
            <option value="confirmado">Confirmado</option>
            <option value="remarcado">Remarcado</option>
            <option value="cancelado">Cancelado</option>
        </select>
        
        <div class="row">
            <button class="btn" onclick="saveAgenda()">Salvar</button>
            <button class="btn ghost" onclick="nav('agenda')">Voltar</button>
        </div>
    </div>`;
}

function saveAgenda() {
    const cliente = document.getElementById("ag_cliente").value;
    const data = document.getElementById("ag_data").value;
    const hora = document.getElementById("ag_hora").value;
    const status = document.getElementById("ag_status").value;
    
    if (!cliente || !data || !hora || cliente === 'Selecione') return showToast("Preencha todos os dados", "error");
    
    AG.push({ id: Date.now(), clienteNome: cliente, data, hora, status });
    save("albany_agenda", AG);
    showToast("Agendado com sucesso!");
    nav('agenda');
}

// Função para gerar arquivo .ics (Calendário iOS/Google)
function exportarParaIOS() {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//StudioAlbany//Agenda//PT\n";

    // Adicionar Ensaios
    AG.forEach(a => {
        let start = a.data.replace(/-/g, '') + 'T' + a.hora.replace(/:/g, '') + '00';
        // Assume 1 hora de duração
        let endHour = parseInt(a.hora.split(':')[0]) + 1;
        let end = a.data.replace(/-/g, '') + 'T' + String(endHour).padStart(2,'0') + a.hora.split(':')[1] + '00';
        icsContent += `BEGIN:VEVENT\nSUMMARY:📷 ${a.clienteNome}\nDTSTART:${start}\nDTEND:${end}\nDESCRIPTION:Status: ${a.status}\nEND:VEVENT\n`;
    });

    // Adicionar Eventos
    EV.forEach(e => {
        if(e.diaInteiro) {
             let date = e.data.replace(/-/g, '');
             icsContent += `BEGIN:VEVENT\nSUMMARY:🎪 ${e.cliente}\nDTSTART;VALUE=DATE:${date}\nDTEND;VALUE=DATE:${date}\nDESCRIPTION:${e.tipo}\nEND:VEVENT\n`;
        } else {
             let start = e.data.replace(/-/g, '') + 'T' + e.hora.replace(/:/g, '') + '00';
             let endHour = parseInt(e.hora.split(':')[0]) + 2; // Assume 2h para eventos
             let end = e.data.replace(/-/g, '') + 'T' + String(endHour).padStart(2,'0') + e.hora.split(':')[1] + '00';
             icsContent += `BEGIN:VEVENT\nSUMMARY:🎪 ${e.cliente}\nDTSTART:${start}\nDTEND:${end}\nDESCRIPTION:${e.tipo}\nEND:VEVENT\n`;
        }
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'agenda_albany.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Ficheiro gerado! Abra para adicionar ao calendário.");
}

/* ===========================================================
   5. DASHBOARD FINANCEIRO COM PERDAS (CHART.JS)
=========================================================== */
function renderDashboardAvancado() {
    const content = document.getElementById('content');
    
    const totalFaturado = VD.reduce((s, x) => s + Number(x.total), 0);
    const totalPerdido = VD.reduce((s, x) => s + Number(x.valorCortesia || 0), 0);
    const numVendas = VD.length;

    content.innerHTML = `
    <div class="card">
        <h3>📊 Performance Financeira</h3>
        
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:20px;margin-bottom:30px">
            <div style="padding:20px;background:var(--bg-body);border-radius:10px;text-align:center">
                <p>Faturamento Real</p>
                <h2 style="color:var(--success)">R$ ${totalFaturado.toFixed(2)}</h2>
            </div>
            
            <div style="padding:20px;background:#fff5f5;border-radius:10px;text-align:center;border:1px solid #ffcdd2">
                <p style="color:#c62828">Perdas (Cortesias)</p>
                <h2 style="color:#c62828">R$ ${totalPerdido.toFixed(2)}</h2>
            </div>
            
            <div style="padding:20px;background:var(--bg-body);border-radius:10px;text-align:center">
                <p>Total de Vendas</p>
                <h2>${numVendas}</h2>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="financeChart"></canvas>
        </div>
    </div>`;

    setTimeout(() => {
        const ctx = document.getElementById('financeChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Faturamento Real', 'Valor em Cortesias (Perdas)'],
                datasets: [{
                    data: [totalFaturado, totalPerdido],
                    backgroundColor: ['#2e7d32', '#c62828'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }, 100);
}

/* ===========================================================
   6. PAGAMENTOS E GERADOR DE PDF (JSPDF)
=========================================================== */
function renderPagamentos() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>💳 Nova Venda</h3>
        <label>Cliente</label>
        <select id="p_cliente">
            <option>Selecione</option>
            ${CL.map(c=>`<option>${c.nome}</option>`).join('')}
        </select>
        
        <label>Pacote</label>
        <select id='p_pac' onchange="atualizarPrevisao()">
            <option value='p1'>Pacote 1 - R$70 (Extra R$10)</option>
            <option value='p2'>Pacote 2 - R$100 (Extra R$15)</option>
            <option value='cortesia'>Cortesia</option>
        </select>
        
        <div class="row">
            <div style="flex:1"><label>Extras (Qtd)</label><input type="number" id="p_ext" value="0" onchange="atualizarPrevisao()"></div>
            <div style="flex:1"><label>Cortesias (Qtd)</label><input type="number" id="p_cortesia" value="0" onchange="atualizarPrevisao()"></div>
        </div>
        
        <p id="feedback_cortesia" style="color:#d32f2f;font-weight:bold;display:none;margin-top:10px"></p>
        
        <label>Total a Cobrar (R$)</label><input type="number" id="p_total">
        <label>Pago Agora</label><input type="number" id="p_pago_agora" value="0">
        <label>Forma</label>
        <select id="p_forma">
            <option>PIX</option>
            <option>Dinheiro</option>
            <option>Cartão</option>
        </select>
        
        <div class="row"><button class="btn" onclick="savePagamentoVenda()">Salvar Venda</button></div>
    </div>
    
    <div class='card'>
        <h3>📄 Histórico de Vendas</h3>
        <div id='p_list'></div>
    </div>`;
    
    atualizarPrevisao();
    showPagamentos();
}

function atualizarPrevisao() {
    const pac = document.getElementById('p_pac').value;
    const ext = Number(document.getElementById('p_ext').value);
    const cort = Number(document.getElementById('p_cortesia').value);
    const fb = document.getElementById('feedback_cortesia');
    
    let base = pac === 'p1' ? 70 : (pac === 'p2' ? 100 : 0);
    let extraVal = pac === 'p1' ? 10 : 15;
    
    document.getElementById('p_total').value = (pac === 'cortesia' ? 0 : base + (ext * extraVal)).toFixed(2);
    
    let perda = cort * extraVal;
    if (perda > 0) {
        fb.style.display = 'block';
        fb.innerText = `⚠️ Perda estimada: R$ ${perda.toFixed(2)}`;
    } else { fb.style.display = 'none'; }
}

function savePagamentoVenda() {
    const nome = document.getElementById('p_cliente').value;
    const pac = document.getElementById('p_pac').value;
    const ext = Number(document.getElementById('p_ext').value);
    const cort = Number(document.getElementById('p_cortesia').value);
    const total = Number(document.getElementById('p_total').value);
    const pago = Number(document.getElementById('p_pago_agora').value);
    const forma = document.getElementById('p_forma').value;

    if(nome === 'Selecione') return showToast("Selecione um cliente", "error");

    let extraVal = pac === 'p1' ? 10 : 15;
    let valorPerdido = cort * extraVal;

    VD.push({
        id: Date.now(), 
        nome, 
        pacote: pac, 
        extras: ext, 
        cortesia: cort, 
        valorCortesia: valorPerdido, 
        total, 
        pagamentos: pago > 0 ? [{valor: pago, forma, data: new Date().toISOString()}] : [], 
        createdAt: new Date().toISOString()
    });
    
    save("albany_vendas", VD);
    showToast("Venda registada!");
    renderPagamentos();
}

function showPagamentos() {
    const list = document.getElementById('p_list');
    if(!VD.length) { list.innerHTML = "<p>Nenhuma venda registada.</p>"; return; }
    
    let html = `<table><thead><tr><th>Data</th><th>Cliente</th><th>Total</th><th>Perda</th><th>Ações</th></tr></thead><tbody>`;
    VD.slice().reverse().forEach(v => {
        html += `<tr>
            <td>${new Date(v.createdAt).toLocaleDateString()}</td>
            <td>${v.nome}</td>
            <td>R$ ${v.total.toFixed(2)}</td>
            <td style="color:#c62828">R$ ${(v.valorCortesia || 0).toFixed(2)}</td>
            <td>
                <button class="btn ghost" onclick="gerarPDF(${v.id})" title="Baixar PDF"><i class="ph ph-file-pdf"></i></button>
                <button class="btn danger" onclick="delVenda(${v.id})">X</button>
            </td>
        </tr>`;
    });
    html += `</tbody></table>`;
    list.innerHTML = html;
}

// Gerar PDF
function gerarPDF(id) {
    const v = VD.find(x => x.id === id);
    if (!v) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(183, 146, 75);
    doc.text("STUDIO ALBANY", 105, 20, null, null, "center");
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Recibo de Venda", 105, 30, null, null, "center");

    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${v.nome}`, 20, 50);
    doc.text(`Data: ${new Date(v.createdAt).toLocaleDateString()}`, 140, 50);
    doc.text(`Pacote: ${v.pacote}`, 20, 60);
    
    if (v.extras > 0) doc.text(`Extras: ${v.extras}`, 20, 70);
    if (v.cortesia > 0) doc.text(`Cortesias: ${v.cortesia}`, 20, 80);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Valor Total: R$ ${v.total.toFixed(2)}`, 140, 100);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Obrigado pela preferência!", 105, 130, null, null, "center");

    doc.save(`Recibo_Albany_${v.nome}.pdf`);
    showToast("PDF descarregado!");
}

function delVenda(id) {
    if(confirm("Apagar venda?")) { 
        VD = VD.filter(x => x.id !== id); 
        save("albany_vendas", VD); 
        showPagamentos(); 
    }
}

/* ===========================================================
   7. EVENTOS (Restaurado Completo)
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
            <option value="Pre Wedding">Pre Wedding</option>
            <option value="Casamento">Casamento</option>
            <option value="Batizado">Batizado</option>
            <option value="Chá revelação">Chá revelação</option>
            <option value="Festa Infantil">Festa Infantil</option>
            <option value="Formatura">Formatura</option>
            <option value="Outros">Outros</option>
        </select>

        <label>Dia inteiro?</label>
        <select id="ev_diaInteiro" onchange="toggleEventoHorario()">
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
        </select>
        
        <label>Data</label>
        <input type="date" id="ev_data">
        
        <label id="lbl_ev_hora">Horário</label>
        <input type="time" id="ev_hora">
        
        <div class="row">
            <button class="btn" onclick="saveEvento()">Salvar</button>
        </div>
    </div>
    
    <div class="card">
        <h3>📄 Lista de Eventos</h3>
        <input type="date" id="ev_filter" onchange="showEventos()">
        <div id="ev_list" style="margin-top:15px">Selecione uma data</div>
    </div>
    `;
    
    // Inicia estado do horário
    setTimeout(() => toggleEventoHorario(), 100);
}

function toggleEventoHorario() {
    const el = document.getElementById("ev_diaInteiro");
    if (!el) return;
    const diaInteiro = el.value === "sim";
    const label = document.getElementById("lbl_ev_hora");
    const input = document.getElementById("ev_hora");
    
    if (diaInteiro) {
        input.style.display = "none";
        label.style.display = "none";
    } else {
        input.style.display = "block";
        label.style.display = "block";
    }
}

function saveEvento() {
    const cliente = document.getElementById("ev_cliente").value;
    const tipo = document.getElementById("ev_tipo").value;
    const data = document.getElementById("ev_data").value;
    const hora = document.getElementById("ev_hora").value;
    const diaInteiro = document.getElementById("ev_diaInteiro").value === "sim";

    if (!cliente || !data || !tipo || cliente === 'Selecione') return showToast("Preencha campos obrigatórios.", "error");
    
    EV.push({
        id: Date.now(),
        cliente, 
        tipo, 
        data, 
        hora: diaInteiro ? null : hora, 
        diaInteiro
    });
    save("albany_eventos", EV);
    showToast("Evento salvo!");
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
   8. CLIENTES
=========================================================== */
function renderClientes() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'><h3>👤 Novo Cliente</h3><label>Nome</label><input id="c_nome"><label>Tel</label><input id="c_tel"><div class="row"><button class="btn" onclick="saveCliente()">Salvar</button></div></div>
    <div class='card'><h3>📄 Clientes</h3><div id="c_list"></div></div>`;
    showClientes();
}
function saveCliente() {
    const nome = document.getElementById("c_nome").value;
    const tel = document.getElementById("c_tel").value;
    if(!nome) return showToast("Nome obrigatório", "error");
    CL.push({ id: Date.now(), nome, tel });
    save("albany_clientes", CL);
    showToast("Cliente salvo!");
    renderClientes();
}
function showClientes() {
    const div = document.getElementById("c_list");
    if(!CL.length) { div.innerHTML = "<p>Sem clientes.</p>"; return; }
    let html = `<table><thead><tr><th>Nome</th><th>Tel</th><th>Ação</th></tr></thead><tbody>`;
    CL.forEach(c => {
        let wa = c.tel ? `<a href="https://wa.me/55${formatPhone(c.tel)}" target="_blank" class="btn whatsapp" style="padding:4px 8px"><i class="ph ph-whatsapp-logo"></i></a>` : '';
        html += `<tr><td>${c.nome}</td><td>${c.tel} ${wa}</td><td><button class="btn danger" onclick="delCliente(${c.id})">X</button></td></tr>`;
    });
    div.innerHTML = html + "</tbody></table>";
}
function delCliente(id) { if(confirm("Excluir?")) { CL = CL.filter(c=>c.id!==id); save("albany_clientes", CL); showClientes(); } }

/* ===========================================================
   9. CONFIGURAÇÕES & BACKUP (Restaurado)
=========================================================== */
function renderConfig() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class='card'>
        <h3>Configurações & Backup</h3>
        <p>Segurança dos dados:</p>
        
        <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
            <h4>Salvar Backup</h4>
            <p>Baixe um ficheiro com todos os dados.</p>
            <button class="btn" onclick="exportarDados()">Baixar Backup</button>
        </div>

        <div style="margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
            <h4>Restaurar Backup</h4>
            <input type="file" id="file_import" accept=".json">
            <button class="btn ghost" onclick="importarDados()">Carregar Backup</button>
        </div>

        <div style="margin-top:30px; border-top:1px solid #eee; padding-top:15px;">
            <button class="btn danger" onclick="limparTudo()">Reset Total (Apagar Tudo)</button>
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
    showToast("Backup baixado!");
}

function importarDados() {
    const input = document.getElementById('file_import');
    if (!input.files.length) return showToast("Selecione um ficheiro", "error");
    
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
                showToast("Dados restaurados! A recarregar...");
                setTimeout(() => location.reload(), 1500);
            } else {
                showToast("Ficheiro inválido", "error");
            }
        } catch (err) {
            showToast("Erro ao ler ficheiro", "error");
        }
    };
    reader.readAsText(file);
}

function limparTudo() { 
    if(confirm("CUIDADO: Isso apagará todos os dados do sistema!")) { 
        localStorage.clear(); 
        location.reload(); 
    } 
}

// Iniciar a aplicação na Home
renderHome();