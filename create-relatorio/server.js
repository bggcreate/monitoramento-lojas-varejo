const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const app = express();
const PORT = 3000;

// --- CONFIGURAÇÃO ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }
const DB_PATH = path.join(dataDir, 'relatorios.db');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'chave-definitiva-123', resave: false, saveUninitialized: false, cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }}));

// --- MIDDLEWARES ---
const requirePageLogin = (req, res, next) => {
    if (req.session && req.session.userId) return next();
    res.redirect('/login');
};

const requireAdmin = (req, res, next) => {
    if (req.session && req.session.role === 'admin') {
        return next();
    }
    res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador.' });
};

// --- BANCO DE DADOS ---
const db = new sqlite3.Database(DB_PATH, err => {
    if (err) return console.error("Erro fatal:", err.message);
    console.log("Conectado ao banco de dados.");
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL)`);
        db.run(`CREATE TABLE IF NOT EXISTS lojas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE NOT NULL, status TEXT, funcao_especial TEXT, observacoes TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS relatorios (id INTEGER PRIMARY KEY AUTOINCREMENT, loja TEXT, data TEXT, hora_abertura TEXT, hora_fechamento TEXT, gerente_entrada TEXT, gerente_saida TEXT, clientes_monitoramento INTEGER, vendas_monitoramento INTEGER, clientes_loja INTEGER, vendas_loja INTEGER, vendas_cartao INTEGER, vendas_pix INTEGER, vendas_dinheiro INTEGER, quantidade_trocas INTEGER, nome_funcao_especial TEXT, quantidade_funcao_especial INTEGER, quantidade_omni INTEGER, vendedores TEXT, nome_arquivo TEXT, enviado_por_usuario TEXT, enviado_em DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS demandas (id INTEGER PRIMARY KEY AUTOINCREMENT, loja_nome TEXT NOT NULL, descricao TEXT NOT NULL, tag TEXT DEFAULT 'Normal', status TEXT DEFAULT 'pendente', criado_por_usuario TEXT, concluido_por_usuario TEXT, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, concluido_em DATETIME)`);
        const adminUsername = 'admin'; const correctPassword = 'admin';
        db.get('SELECT * FROM usuarios WHERE username = ?', [adminUsername], (err, row) => {
            if (err) return;
            if (!row) { db.run('INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)', [adminUsername, correctPassword, 'admin']);
            } else if (row.password !== correctPassword) { db.run('UPDATE usuarios SET password = ? WHERE username = ?', [correctPassword, adminUsername]); }
        });
    });
});

// =================================================================
// ROTAS DE PÁGINAS E CONTEÚDO
// =================================================================
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/live', requirePageLogin, (req, res) => res.sendFile(path.join(__dirname, 'views', 'live.html')));
app.get(['/', '/admin', '/consulta', '/demandas', '/gerenciar-lojas', '/novo-relatorio', '/gerenciar-usuarios'], requirePageLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});
app.get('/content/:page', requirePageLogin, (req, res) => {
    const allowedPages = ['admin', 'consulta', 'demandas', 'gerenciar-lojas', 'novo-relatorio', 'gerenciar-usuarios'];
    if (allowedPages.includes(req.params.page)) {
        res.sendFile(path.join(__dirname, 'views', `${req.params.page}.html`));
    } else { res.status(404).send('Página não encontrada'); }
});

// =================================================================
// ROTAS DE API (AÇÕES E DADOS)
// =================================================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM usuarios WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err || !user) return res.status(401).json({ message: 'Credenciais inválidas.' });
        req.session.userId = user.id; req.session.username = user.username; req.session.role = user.role;
        res.json({ success: true });
    });
});
app.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });
app.get('/api/session-info', requirePageLogin, (req, res) => { res.json({ id: req.session.userId, username: req.session.username, role: req.session.role }); });

// --- API DE USUÁRIOS (NOVO) ---
app.get('/api/usuarios', requirePageLogin, requireAdmin, (req, res) => {
    db.all("SELECT id, username, role FROM usuarios ORDER BY username", (err, users) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(users || []);
    });
});
app.post('/api/usuarios', requirePageLogin, requireAdmin, (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    const sql = `INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)`;
    db.run(sql, [username, password, role], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao criar usuário. O nome de usuário já pode existir.' });
        res.status(201).json({ success: true, id: this.lastID });
    });
});
app.put('/api/usuarios/:id', requirePageLogin, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;
    
    if (!username || !role) {
        return res.status(400).json({ error: 'Username e Cargo são obrigatórios.' });
    }

    if (password) {
        
        const sql = `UPDATE usuarios SET username = ?, password = ?, role = ? WHERE id = ?`;
        db.run(sql, [username, password, role, id], function(err) {
            if (err) return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
            res.json({ success: true });
        });
    } else {
        // Se a senha estiver em branco, atualiza sem tocar na senha
        const sql = `UPDATE usuarios SET username = ?, role = ? WHERE id = ?`;
        db.run(sql, [username, role, id], function(err) {
            if (err) return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
            res.json({ success: true });
        });
    }
});
app.delete('/api/usuarios/:id', requirePageLogin, requireAdmin, (req, res) => {
    const { id } = req.params;

    if (id == req.session.userId) {
        return res.status(403).json({ error: 'Não é permitido excluir o próprio usuário logado.' });
    }

    db.run("DELETE FROM usuarios WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao excluir usuário.' });
        if (this.changes === 0) return res.status(404).json({ error: "Usuário não encontrado." });
        res.json({ success: true });
    });
});

// --- API DE LOJAS ---
app.get('/api/lojas', requirePageLogin, (req, res) => {
    db.all("SELECT * FROM lojas ORDER BY nome", (err, lojas) => { if (err) return res.status(500).json({ error: err.message }); res.json(lojas || []); });
});
app.post('/api/lojas', requirePageLogin, (req, res) => {
    const { nome, status, funcao_especial, observacoes } = req.body;
    const sql = `INSERT INTO lojas (nome, status, funcao_especial, observacoes) VALUES (?, ?, ?, ?)`;
    db.run(sql, [nome, status, funcao_especial, observacoes], function (err) {
        if (err) return res.status(500).json({ error: 'Erro ao criar loja. O nome já pode existir.' });
        res.status(201).json({ success: true, id: this.lastID });
    });
});
app.put('/api/lojas/:id', requirePageLogin, (req, res) => {
    const { id } = req.params;
    const { nome, status, funcao_especial, observacoes } = req.body;
    const sql = `UPDATE lojas SET nome = ?, status = ?, funcao_especial = ?, observacoes = ? WHERE id = ?`;
    db.run(sql, [nome, status, funcao_especial, observacoes, id], function (err) {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar loja.' });
        res.json({ success: true });
    });
});
app.delete('/api/lojas/:id', requirePageLogin, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM lojas WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao excluir loja.' });
        if (this.changes === 0) return res.status(404).json({ error: "Loja não encontrada." });
        res.json({ success: true });
    });
});

const processarRelatorio = (r) => {
    if (!r) return null;
    const vendas_monitoramento_total = (r.vendas_monitoramento || 0) + (r.quantidade_omni || 0);
    const tx_conversao_monitoramento = r.clientes_monitoramento > 0 ? (vendas_monitoramento_total / r.clientes_monitoramento) * 100 : 0;
    const tx_conversao_loja = r.clientes_loja > 0 ? (r.vendas_loja / r.clientes_loja) * 100 : 0;
    const total_vendas_geral = (r.vendas_cartao || 0) + (r.vendas_pix || 0) + (r.vendas_dinheiro || 0);
    let vendedores_processados = [];
    try {
        const vendedores = JSON.parse(r.vendedores || '[]');
        vendedores_processados = vendedores.map(v => {
            const tx = v.atendimentos > 0 ? ((v.vendas / v.atendimentos) * 100) : 0;
            return { ...v, tx_conversao: tx.toFixed(2) };
        });
    } catch (e) { /* ignora erro */ }
    return { ...r, vendas_monitoramento_total, tx_conversao_monitoramento: tx_conversao_monitoramento.toFixed(2), tx_conversao_loja: tx_conversao_loja.toFixed(2), total_vendas: total_vendas_geral, vendedores_processados };
};

app.get('/api/relatorios', requirePageLogin, (req, res) => {
    const whereClauses = []; 
    const params = [];
    if (req.query.loja) { whereClauses.push("loja = ?"); params.push(req.query.loja); }
    if (req.query.data_inicio) { whereClauses.push("data >= ?"); params.push(req.query.data_inicio); }
    if (req.query.data_fim) { whereClauses.push("data <= ?"); params.push(req.query.data_fim); }
    
    const whereString = whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";
    
    const countQuery = `SELECT COUNT(*) as total FROM relatorios` + whereString;
    db.get(countQuery, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = row.total;
        
        let query = `SELECT id, loja, data FROM relatorios` + whereString + " ORDER BY id DESC";
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        query += " LIMIT ? OFFSET ?";
        const finalParams = [...params, limit, offset];
        
        db.all(query, finalParams, (err, relatorios) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ relatorios: relatorios || [], total });
        });
    });
});
app.post('/api/relatorios', requirePageLogin, (req, res) => {
    const d = req.body;
    const sql = `INSERT INTO relatorios (loja, data, hora_abertura, hora_fechamento, gerente_entrada, gerente_saida, clientes_monitoramento, vendas_monitoramento, clientes_loja, vendas_loja, vendas_cartao, vendas_pix, vendas_dinheiro, quantidade_trocas, quantidade_omni, quantidade_funcao_especial, vendedores, enviado_por_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [d.loja, d.data, d.hora_abertura, d.hora_fechamento, d.gerente_entrada, d.gerente_saida, d.clientes_monitoramento || 0, d.vendas_monitoramento || 0, d.clientes_loja || 0, d.vendas_loja || 0, d.vendas_cartao || 0, d.vendas_pix || 0, d.vendas_dinheiro || 0, d.quantidade_trocas || 0, d.quantidade_omni || 0, d.quantidade_funcao_especial || 0, d.vendedores || '[]', req.session.username];
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: 'Falha ao salvar relatório.' });
        res.status(201).json({ success: true, id: this.lastID });
    });
});
app.get('/api/relatorios/:id', requirePageLogin, (req, res) => {
    db.get("SELECT * FROM relatorios WHERE id = ?", [req.params.id], (err, relatorio) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!relatorio) return res.status(404).json({ error: "Relatório não encontrado" });
        let vendedores_parsed = [];
        try {
            vendedores_parsed = JSON.parse(relatorio.vendedores || '[]');
        } catch(e) {/* ignora */}
        res.json({ relatorio, vendedores: vendedores_parsed });
    });
});
app.put('/api/relatorios/:id', requirePageLogin, (req, res) => {
    const { id } = req.params;
    const d = req.body;
    const sql = `UPDATE relatorios SET loja = ?, data = ?, hora_abertura = ?, hora_fechamento = ?, gerente_entrada = ?, gerente_saida = ?, clientes_monitoramento = ?, vendas_monitoramento = ?, clientes_loja = ?, vendas_loja = ?, vendas_cartao = ?, vendas_pix = ?, vendas_dinheiro = ?, quantidade_trocas = ?, quantidade_omni = ?, quantidade_funcao_especial = ?, vendedores = ? WHERE id = ?`;
    const params = [d.loja, d.data, d.hora_abertura, d.hora_fechamento, d.gerente_entrada, d.gerente_saida, d.clientes_monitoramento || 0, d.vendas_monitoramento || 0, d.clientes_loja || 0, d.vendas_loja || 0, d.vendas_cartao || 0, d.vendas_pix || 0, d.vendas_dinheiro || 0, d.quantidade_trocas || 0, d.quantidade_omni || 0, d.quantidade_funcao_especial || 0, d.vendedores || '[]', id];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: 'Falha ao atualizar o relatório.' });
        if (this.changes === 0) return res.status(404).json({ error: "Relatório não encontrado." });
        res.json({ success: true, id: id });
    });
});
app.delete('/api/relatorios/:id', requirePageLogin, (req, res) => {
    db.run("DELETE FROM relatorios WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Relatório não encontrado" });
        res.json({ success: true, message: "Relatório excluído." });
    });
});

const formatarRelatorioTexto = (r) => {
    const relatorioProcessado = processarRelatorio(r);
    let content = `${relatorioProcessado.loja.toUpperCase()}\n\nDATA: ${new Date(relatorioProcessado.data).toLocaleDateString('pt-BR',{timeZone:'UTC'})}\n\n`;
    content += `Clientes: ${relatorioProcessado.clientes_monitoramento}\nBluve: ${relatorioProcessado.clientes_loja}\nVendas / Monitoramento: ${relatorioProcessado.vendas_monitoramento_total}\nVendas / Loja: ${relatorioProcessado.vendas_loja}\n`;
    content += `Taxa de conversão da loja: ${relatorioProcessado.tx_conversao_loja}%\nTaxa de conversão do monitoramento: ${relatorioProcessado.tx_conversao_monitoramento}%\n\n`;
    content += `Abertura: ${relatorioProcessado.hora_abertura || 'N/A'} - ${relatorioProcessado.hora_fechamento || 'N/A'}\nGerente: ${relatorioProcessado.gerente_entrada || 'N/A'} - ${relatorioProcessado.gerente_saida || 'N/A'}\n`;
    content += `Vendas em Cartão: ${relatorioProcessado.vendas_cartao}\nVendas em Pix: ${relatorioProcessado.vendas_pix}\nVendas em Dinheiro: ${relatorioProcessado.vendas_dinheiro}\n`;
    const especialVal = (relatorioProcessado.quantidade_omni || 0) + (relatorioProcessado.quantidade_funcao_especial || 0);
    if (especialVal > 0) content += `Busca por assist tec/Omni: ${especialVal}\n`;
    content += `Total vendas: ${relatorioProcessado.total_vendas}\nTroca/Devolução: ${relatorioProcessado.quantidade_trocas}\n\n`;
    content += `Desempenho Equipe:\n\n`;
    if (relatorioProcessado.vendedores_processados && relatorioProcessado.vendedores_processados.length > 0) { relatorioProcessado.vendedores_processados.forEach(v => { content += `${v.nome}: ${v.atendimentos} Atendimentos / ${v.vendas} Vendas / ${v.tx_conversao}%\n`; });
    } else { content += 'Nenhum vendedor registrado.\n'; }
    return content;
};

app.get('/api/relatorios/:id/txt', requirePageLogin, (req, res) => {
    db.get("SELECT * FROM relatorios WHERE id = ?", [req.params.id], (err, r) => {
        if (err || !r) return res.status(404).send('Relatório não encontrado');
        const content = formatarRelatorioTexto(r);
        const fileName = `relatorio_${r.loja.replace(/ /g, '_')}_${r.data}.txt`;
        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-type', 'text/plain; charset=utf-8');
        res.send(content);
    });
});
app.get('/api/relatorios/:id/pdf', requirePageLogin, (req, res) => {
    db.get("SELECT * FROM relatorios WHERE id = ?", [req.params.id], (err, r) => {
        if (err || !r) return res.status(404).send('Relatório não encontrado');
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const fileName = `relatorio_${r.loja.replace(/ /g, '_')}_${r.data}.pdf`;
        res.setHeader('Content-disposition', `inline; filename="${fileName}"`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);
        const textoCompleto = formatarRelatorioTexto(r);
        const [titulo, ...corpo] = textoCompleto.split('\n\n');
        doc.fontSize(18).font('Helvetica-Bold').text(r.loja.toUpperCase(), { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(new Date(r.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}), { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(11).font('Helvetica').text(corpo.join('\n\n'), { align: 'left' });
        doc.end();
    });
});
app.get('/api/export/excel', requirePageLogin, async (req, res) => {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({error: 'Mês e ano são obrigatórios.'});
    const monthFormatted = month.toString().padStart(2, '0');
    db.all("SELECT nome, funcao_especial FROM lojas", [], (err, lojas) => {
        if (err) return res.status(500).json({error: 'Erro ao buscar dados das lojas.'});
        const lojasMap = lojas.reduce((acc, loja) => { acc[loja.nome] = loja.funcao_especial; return acc; }, {});
        const sql = `SELECT * FROM relatorios WHERE strftime('%Y-%m', data) = ? ORDER BY loja, data`;
        db.all(sql, [`${year}-${monthFormatted}`], async (err, rows) => {
            if (err) return res.status(500).json({error: 'Erro ao buscar relatórios.'});
            if (rows.length === 0) return res.status(404).json({error: 'Nenhum relatório encontrado para o período.'});
            const relatoriosPorLoja = rows.reduce((acc, row) => { (acc[row.loja] = acc[row.loja] || []).push(processarRelatorio(row)); return acc; }, {});
            const workbook = new ExcelJS.Workbook();
            const sheetColors = ['FFFF00', '00FF00', '00FFFF', 'FF00FF', '00B0F0', 'FFC000'];
            let colorIndex = 0;
            for (const lojaNome in relatoriosPorLoja) {
                const worksheet = workbook.addWorksheet(lojaNome.substring(0, 30));
                worksheet.properties.tabColor = { argb: sheetColors[colorIndex++ % sheetColors.length] };
                worksheet.mergeCells('A1:L1');
                const titleCell = worksheet.getCell('A1');
                titleCell.value = lojaNome;
                titleCell.font = { name: 'Calibri', size: 18, bold: true };
                titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
                worksheet.getRow(1).height = 30;
                const headers = [ 'Data', 'Loja Abertura - Fechamento', 'Gerente Entrada - Saída', 'Clientes (M)', 'Vendas (M)', 'Taxa de Conversão (M)', 'Clientes (L)', 'Vendas (L)', 'Taxa de Conversão (L)', 'V. Cartão', 'V. PIX', 'V. Dinheiro', 'Total de Vendas' ];
                const funcaoEspecialDaLoja = lojasMap[lojaNome];
                let especialHeader = null;
                if (funcaoEspecialDaLoja === "Omni") { especialHeader = "Omni"; headers.splice(9, 0, especialHeader);
                } else if (funcaoEspecialDaLoja === "Busca por Assist. Tec.") { especialHeader = "Assist. Tec."; headers.splice(9, 0, especialHeader); }
                const headerRow = worksheet.getRow(3);
                headerRow.values = headers;
                headerRow.font = { name: 'Calibri', size: 12, bold: true };
                headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'FFE0E0E0'} }; cell.border = { bottom: { style: 'thin' } }; });
                const fillMonitoramento = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                const fillLoja = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FFE6' } };
                relatoriosPorLoja[lojaNome].forEach(r => {
                    const lojaHorario = `${r.hora_abertura || '--:--'} - ${r.hora_fechamento || '--:--'}`;
                    const gerenteHorario = `${r.gerente_entrada || '--:--'} - ${r.gerente_saida || '--:--'}`;
                    const rowData = [ new Date(r.data), lojaHorario, gerenteHorario, r.clientes_monitoramento, r.vendas_monitoramento_total, parseFloat(r.tx_conversao_monitoramento) / 100, r.clientes_loja, r.vendas_loja, parseFloat(r.tx_conversao_loja) / 100, r.vendas_cartao, r.vendas_pix, r.vendas_dinheiro, r.total_vendas ];
                    if (especialHeader === "Omni") { rowData.splice(9, 0, r.quantidade_omni);
                    } else if (especialHeader === "Assist. Tec.") { rowData.splice(9, 0, r.quantidade_funcao_especial); }
                    const row = worksheet.addRow(rowData);
                    row.alignment = { vertical: 'middle', horizontal: 'center' };
                    row.getCell(1).numFmt = 'dd/mm/yyyy;@';
                    const percentColMonitoramento = 6;
                    const percentColLoja = especialHeader ? 10 : 9;
                    row.getCell(percentColMonitoramento).numFmt = '0.00%';
                    row.getCell(percentColLoja).numFmt = '0.00%';
                    for (let i = 4; i <= 6; i++) { row.getCell(i).fill = fillMonitoramento; }
                    const endLojaCol = especialHeader ? 10 : 9;
                    for (let i = 7; i <= endLojaCol; i++) { row.getCell(i).fill = fillLoja; }
                });
                worksheet.columns.forEach(column => { column.width = 22; });
            }
            const monthName = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' });
            const fileName = `Relatorios_${monthName}_${year}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            await workbook.xlsx.write(res);
            res.end();
        });
    });
});
app.post('/api/demandas', requirePageLogin, (req, res) => {
    const { loja_nome, descricao, tag } = req.body;
    const sql = `INSERT INTO demandas (loja_nome, descricao, tag, criado_por_usuario) VALUES (?, ?, ?, ?)`;
    db.run(sql, [loja_nome, descricao, tag, req.session.username], function(err) {
        if (err) return res.status(500).json({ error: 'Falha ao salvar demanda.' });
        res.status(201).json({ success: true, id: this.lastID });
    });
});
app.get('/api/demandas/:status', requirePageLogin, (req, res) => {
    const status = req.params.status === 'pendentes' ? 'pendente' : (req.params.status === 'concluidas' ? 'concluido' : '');
    if (!status) return res.status(400).json({error: 'Status inválido'});
    db.all(`SELECT * FROM demandas WHERE status = ? ORDER BY criado_em DESC`, [status], (err, demandas) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(demandas || []);
    });
});
app.put('/api/demandas/:id/concluir', requirePageLogin, (req, res) => {
    const { id } = req.params;
    const sql = `UPDATE demandas SET status = 'concluido', concluido_por_usuario = ?, concluido_em = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(sql, [req.session.username, id], function (err) {
        if (err) return res.status(500).json({ error: 'Erro ao concluir demanda.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Demanda não encontrada.' });
        res.json({ success: true });
    });
});
app.delete('/api/demandas/:id', requirePageLogin, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM demandas WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao excluir demanda.' });
        if (this.changes === 0) return res.status(404).json({ error: "Demanda não encontrada." });
        res.json({ success: true });
    });
});
app.get('/api/dashboard-data', requirePageLogin, (req, res) => {
    let whereClauses = []; let params = [];
    if (req.query.loja && req.query.loja !== 'todas') { whereClauses.push('loja = ?'); params.push(req.query.loja); }
    if (req.query.data_inicio) { whereClauses.push('data >= ?'); params.push(req.query.data_inicio); }
    if (req.query.data_fim) { whereClauses.push('data <= ?'); params.push(req.query.data_fim); }
    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const sql = `SELECT COALESCE(SUM(clientes_monitoramento), 0) as total_clientes_monitoramento, COALESCE(SUM(vendas_monitoramento), 0) as total_vendas_monitoramento, COALESCE(SUM(clientes_loja), 0) as total_clientes_loja, COALESCE(SUM(vendas_loja), 0) as total_vendas_loja, COALESCE(SUM(quantidade_omni), 0) as total_omni FROM relatorios ${whereString}`;
    db.get(sql, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const vendas_monitoramento_total = (row.total_vendas_monitoramento || 0) + (row.total_omni || 0);
        const tx_m = row.total_clientes_monitoramento > 0 ? (vendas_monitoramento_total / row.total_clientes_monitoramento) * 100 : 0;
        const tx_l = row.total_clientes_loja > 0 ? (row.total_vendas_loja / row.total_clientes_loja) * 100 : 0;
        res.json({ ...row, tx_conversao_monitoramento: tx_m.toFixed(2), tx_conversao_loja: tx_l.toFixed(2) });
    });
});
app.get('/api/ranking', requirePageLogin, (req, res) => {
    let whereClauses = []; let params = [];
    if (req.query.data_inicio) { whereClauses.push('data >= ?'); params.push(req.query.data_inicio); }
    if (req.query.data_fim) { whereClauses.push('data <= ?'); params.push(req.query.data_fim); }
    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const sql = `SELECT loja, SUM(clientes_loja) as total_clientes_loja, SUM(vendas_loja) as total_vendas_loja, SUM(clientes_monitoramento) as total_clientes_monitoramento, SUM(vendas_monitoramento) as total_vendas_monitoramento, SUM(quantidade_omni) as total_omni FROM relatorios ${whereString} GROUP BY loja`;
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const ranking = rows.map(row => {
            const tx_l = row.total_clientes_loja > 0 ? (row.total_vendas_loja / row.total_clientes_loja) * 100 : 0;
            const vendas_monitoramento_total = (row.total_vendas_monitoramento || 0) + (row.total_omni || 0);
            const tx_m = row.total_clientes_monitoramento > 0 ? (vendas_monitoramento_total / row.total_clientes_monitoramento) * 100 : 0;
            return { ...row, tx_loja: tx_l.toFixed(2), tx_monitoramento: tx_m.toFixed(2) };
        }).sort((a, b) => b.tx_loja - a.tx_loja);
        res.json(ranking);
    });
});

// --- INICIALIZAÇÃO ---
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));