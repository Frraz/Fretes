let G='ALL',P='dashboard';
const SYNC=5*60*1000;
const fmt=v=>'R$ '+Math.abs(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK=v=>Math.abs(v)>=1000?'R$ '+(Math.abs(v)/1000).toFixed(1)+'k':'R$ '+Math.abs(v).toFixed(0);
const fmtN=v=>v.toLocaleString('pt-BR',{maximumFractionDigits:0});
const fmtD=d=>{if(!d)return'—';const p=d.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:d};
const vc=v=>v>0.01?'v-pos':v<-0.01?'v-neg':'v-zero';
const sitB=s=>s==='A RECEBER'?'<span class="badge b-grn">A RECEBER</span>':s==='DEVEDOR'?'<span class="badge b-red">DEVEDOR</span>':'<span class="badge b-blu">QUITADO</span>';
const staB=s=>s==='FECHADO'?'<span class="badge b-red">FECHADO</span>':s==='LANÇADO'?'<span class="badge b-amb">LANÇADO</span>':'<span class="badge b-blu">EM ABERTO</span>';
const SI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
function esc(s){return s.replace(/'/g,"\\'").replace(/"/g,'&quot;')}
async function api(u){try{return await(await fetch(u)).json()}catch(e){console.error(e);return null}}

/* ═══ THEME ═══ */
function toggleTheme(){
  const h=document.documentElement,n=h.getAttribute('data-theme')==='light'?'dark':'light';
  h.setAttribute('data-theme',n);localStorage.setItem('theme',n);
  const m=document.getElementById('meta-theme');if(m)m.content=n==='dark'?'#0e0e11':'#f3f1ec';
  const l=document.getElementById('theme-label');if(l)l.textContent=n==='light'?'Tema escuro':'Tema claro';
}
(function(){const l=document.getElementById('theme-label');if(l)l.textContent=document.documentElement.getAttribute('data-theme')==='light'?'Tema escuro':'Tema claro'})();

/* ═══ SYNC ═══ */
async function syncData(){
  const b=document.getElementById('sync-btn'),t=document.getElementById('sync-text');if(!b)return;
  b.classList.add('syncing');t.textContent='Sincronizando...';
  try{
    const r=await api('/api/sync/');
    if(r&&r.status==='ok'){
      t.textContent='OK';
      document.getElementById('last-update').textContent=r.atualizado||'Agora';
      setTimeout(()=>{t.textContent='Sincronizar';b.classList.remove('syncing')},1200);
      load();
    }else{t.textContent='Falha';setTimeout(()=>{t.textContent='Sincronizar';b.classList.remove('syncing')},2500)}
  }catch{t.textContent='Erro';setTimeout(()=>{t.textContent='Sincronizar';b.classList.remove('syncing')},2500)}
}
setInterval(()=>{
  fetch('/api/sync/').then(r=>r.json()).then(d=>{
    if(d&&d.status==='ok'){
      document.getElementById('last-update').textContent=d.atualizado||'';
      if(P==='dashboard')load();
    }
  }).catch(()=>{});
},SYNC);

/* ═══ NAV ═══ */
function nav(p){
  P=p;closeSidebar();
  document.querySelectorAll('.sb-link').forEach(n=>n.classList.toggle('active',n.dataset.page===p));
  document.querySelectorAll('.bnav-btn').forEach(n=>n.classList.toggle('active',n.dataset.page===p));
  const t={dashboard:'Painel',motoristas:'Motoristas',colheita:'Colheita',romaneios:'Romaneios',abastecimentos:'Abastecimentos',adiantamentos:'Adiantamentos'};
  document.getElementById('page-title').textContent=t[p]||'Painel';
  window.scrollTo(0,0);
  load();
}
function setGrupo(g){G=g;document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.grupo===g));load()}
function load(){
  document.getElementById('content').innerHTML='<div class="loading"><div class="spinner"></div>Carregando...</div>';
  ({dashboard:loadDash,motoristas:loadMot,colheita:loadCol,romaneios:loadRom,abastecimentos:loadAb,adiantamentos:loadAd})[P]();
}

/* ═══ HELPERS ═══ */
/* tblWrap: scroll horizontal global (funciona em qualquer breakpoint) */
function tblWrap(inner,maxH){
  const style=maxH?`style="max-height:${maxH};overflow-y:auto"`:'';
  return `<div class="tbl-scroll-x" ${style}><table>${inner}</table></div>`;
}

/* Card de motorista — visível só em mobile via CSS */
function motCard(x){
  return `<div class="mot-card" onclick="openMot(${x.id},'${esc(x.motorista)}','${x.placa}')">
    <div class="mot-card-top">
      <span class="mot-card-name">${x.motorista}</span>
      <span class="mot-card-placa">${x.placa}</span>
    </div>
    <div class="mot-card-row">
      <div class="mot-card-item"><span class="mot-card-lbl">Romaneios</span><span class="mot-card-val v-blu">${x.romaneios?fmtK(x.romaneios):'—'}</span></div>
      <div class="mot-card-item"><span class="mot-card-lbl">Abast.</span><span class="mot-card-val v-amb">${x.abastecimentos?fmtK(x.abastecimentos):'—'}</span></div>
      <div class="mot-card-item"><span class="mot-card-lbl">Adiant.</span><span class="mot-card-val v-neg">${x.adiantamentos?fmtK(x.adiantamentos):'—'}</span></div>
    </div>
    <div class="mot-card-footer">
      <span class="mono ${vc(x.saldo)}" style="font-weight:700;font-size:13px">${x.saldo<0?'- ':''}${fmt(x.saldo)}</span>
      ${sitB(x.situacao)}
    </div>
  </div>`;
}

/* ═══ DASHBOARD ═══ */
async function loadDash(){
  const[k,r]=await Promise.all([api('/api/kpis/?grupo='+G),api('/api/resumo/?grupo='+G)]);
  if(!k||!r)return;
  document.getElementById('last-update').textContent=k.atualizado;
  const a=r.resumo.filter(x=>x.situacao!=='QUITADO'),s=[...a].sort((a,b)=>b.saldo-a.saldo),d=s.filter(x=>x.situacao==='DEVEDOR').reverse(),mx=Math.max(...a.map(x=>Math.abs(x.saldo)),1);

  const tblRows=s.map(x=>`<tr class="click" onclick="openMot(${x.id},'${esc(x.motorista)}','${x.placa}')">
    <td class="mono tb">${x.placa}</td><td>${x.motorista}</td>
    <td class="mono tr">${x.romaneios?fmt(x.romaneios):'—'}</td>
    <td class="mono tr v-amb">${x.abastecimentos?fmt(x.abastecimentos):'—'}</td>
    <td class="mono tr v-neg">${x.adiantamentos?fmt(x.adiantamentos):'—'}</td>
    <td class="mono tr tb ${vc(x.saldo)}">${x.saldo<0?'- ':''}${fmt(x.saldo)}</td>
    <td class="tc">${sitB(x.situacao)}</td>
  </tr>`).join('');

  document.getElementById('content').innerHTML=`
<div class="kpi-grid">
  <div class="kpi c-blu"><div class="kpi-label">Romaneios</div><div class="kpi-value v-blu">${fmt(k.total_romaneios)}</div><div class="kpi-sub">${r.resumo.filter(x=>x.romaneios>0).length} motoristas</div></div>
  <div class="kpi c-amb"><div class="kpi-label">Abastecimentos</div><div class="kpi-value v-amb">${fmt(k.total_abastecimentos)}</div><div class="kpi-sub">${k.total_descontos>0?((k.total_abastecimentos/k.total_descontos)*100).toFixed(0)+'% descontos':''}</div></div>
  <div class="kpi c-red"><div class="kpi-label">Adiantamentos</div><div class="kpi-value v-neg">${fmt(k.total_adiantamentos)}</div><div class="kpi-sub">${r.resumo.filter(x=>x.adiantamentos>0).length} com adiant.</div></div>
  <div class="kpi c-grn"><div class="kpi-label">Saldo</div><div class="kpi-value ${vc(k.saldo_liquido)}">${k.saldo_liquido<0?'- ':''}${fmt(k.saldo_liquido)}</div><div class="kpi-sub">Rom. − descontos</div></div>
  <div class="kpi c-pur"><div class="kpi-label">Motoristas</div><div class="kpi-value" style="color:var(--pur)">${k.qtd_ativos}</div><div class="kpi-sub">${k.qtd_a_receber} receber · ${k.qtd_devedores} devendo</div></div>
</div>
<div class="g2">
  <div class="card"><div class="card-h"><div class="card-t"><div class="dot grn"></div>Distribuição</div></div>
    <div class="st-row">
      <div class="st-card rec"><div class="st-num">${k.qtd_a_receber}</div><div class="st-lbl">A Receber</div><div class="st-val v-pos">${fmtK(k.total_a_receber)}</div></div>
      <div class="st-card dev"><div class="st-num">${k.qtd_devedores}</div><div class="st-lbl">Devedores</div><div class="st-val v-neg">${fmtK(k.total_devendo)}</div></div>
      <div class="st-card qui"><div class="st-num">${k.qtd_quitados}</div><div class="st-lbl">Quitados</div><div class="st-val v-zero">R$ 0,00</div></div>
    </div>
  </div>
  <div class="card"><div class="card-h"><div class="card-t"><div class="dot amb"></div>Descontos</div><div class="card-badge">${fmt(k.total_descontos)}</div></div>
    <div style="display:flex;flex-direction:column;gap:13px;margin-top:3px">
      <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:var(--txd)">Abastecimentos</span><span class="mono v-amb">${fmt(k.total_abastecimentos)}</span></div><div class="bar-trk"><div class="bar-fill" style="width:${k.total_descontos?((k.total_abastecimentos/k.total_descontos)*100):0}%;background:var(--amb)"></div></div></div>
      <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:var(--txd)">Adiantamentos</span><span class="mono v-neg">${fmt(k.total_adiantamentos)}</span></div><div class="bar-trk"><div class="bar-fill" style="width:${k.total_descontos?((k.total_adiantamentos/k.total_descontos)*100):0}%;background:var(--red)"></div></div></div>
    </div>
  </div>
</div>
<div class="g21">
  <div class="card"><div class="card-h"><div class="card-t"><div class="dot blu"></div>Saldo por Motorista</div><div class="card-badge">${a.length}</div></div>
    <div class="scroll-t">${s.map(x=>`<div class="bar-row" style="cursor:pointer" onclick="openMot(${x.id},'${esc(x.motorista)}','${x.placa}')"><div class="bar-lbl" title="${x.motorista}">${x.motorista}</div><div class="bar-trk"><div class="bar-fill ${x.saldo>=0?'grn':'red'}" style="width:${(Math.abs(x.saldo)/mx*100).toFixed(1)}%"></div></div><div class="bar-val ${vc(x.saldo)}">${x.saldo<0?'- ':''}${fmtK(x.saldo)}</div></div>`).join('')}</div>
  </div>
  <div class="card"><div class="card-h"><div class="card-t"><div class="dot red"></div>Devedores</div></div>
    ${d.length===0?'<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Nenhum devedor</div>':
    `<div class="scroll-t">${d.map((x,i)=>`<div style="padding:9px;border-bottom:1px solid var(--bd);${i===0?'background:var(--redB);border-radius:6px 6px 0 0':''};cursor:pointer" onclick="openMot(${x.id},'${esc(x.motorista)}','${x.placa}')"><div style="display:flex;justify-content:space-between;align-items:center;gap:5px"><div style="min-width:0"><div style="font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.motorista}</div><div class="mono" style="font-size:10px;color:var(--txm);margin-top:1px">${x.placa}</div></div><div class="mono v-neg" style="font-size:12px;font-weight:600;flex-shrink:0">- ${fmt(Math.abs(x.saldo))}</div></div>${x.adiantamentos>0?`<div style="font-size:10px;color:var(--amb);margin-top:2px">Adiant: ${fmtK(x.adiantamentos)}</div>`:''}</div>`).join('')}</div>`}
  </div>
</div>
<div class="card">
  <div class="card-h"><div class="card-t"><div class="dot pur"></div>Tabela Completa</div></div>
  <div class="search-bar">${SI}<input placeholder="Buscar motorista ou placa..." oninput="filtDash(this)"></div>
  <div id="dash-cards">${s.map(x=>motCard(x)).join('')}</div>
  <div class="tbl-desk-only tbl-scroll-x" style="max-height:440px;overflow-y:auto">
    <table id="td">
      <thead><tr><th>Placa</th><th>Motorista</th><th class="tr">Rom.</th><th class="tr">Abast.</th><th class="tr">Adiant.</th><th class="tr">Saldo</th><th class="tc">Sit.</th></tr></thead>
      <tbody id="td-body">${tblRows}</tbody>
      <tfoot><tr style="border-top:2px solid var(--bd)"><td colspan="2" class="tb">TOTAL</td><td class="mono tr tb v-blu">${fmt(k.total_romaneios)}</td><td class="mono tr tb v-amb">${fmt(k.total_abastecimentos)}</td><td class="mono tr tb v-neg">${fmt(k.total_adiantamentos)}</td><td class="mono tr tb ${vc(k.saldo_liquido)}">${k.saldo_liquido<0?'- ':''}${fmt(k.saldo_liquido)}</td><td></td></tr></tfoot>
    </table>
  </div>
</div>`;
}

function filtDash(inp){
  const q=inp.value.toLowerCase();
  document.querySelectorAll('#dash-cards .mot-card').forEach(c=>{c.style.display=c.textContent.toLowerCase().includes(q)?'':'none'});
  document.querySelectorAll('#td-body tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q)?'':'none'});
}

/* ═══ MODAL ═══ */
async function openMot(id,nome,placa){
  document.getElementById('modal-title').textContent=nome+' — '+placa;
  document.getElementById('modal-body').innerHTML='<div class="loading"><div class="spinner"></div>Carregando...</div>';
  document.getElementById('modal-overlay').classList.add('show');
  document.body.style.overflow='hidden';
  const d=await api('/api/motorista/'+id+'/?grupo='+G);if(!d)return;const s=d.saldo;
  document.getElementById('modal-body').innerHTML=`
<div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:13px">
  <div class="kpi c-blu" style="padding:9px"><div class="kpi-label">Romaneios</div><div class="kpi-value v-blu" style="font-size:13px">${fmt(d.total_romaneios)}</div><div class="kpi-sub">${d.romaneios.length} viag.</div></div>
  <div class="kpi c-amb" style="padding:9px"><div class="kpi-label">Abast.</div><div class="kpi-value v-amb" style="font-size:13px">${fmt(d.total_abastecimentos)}</div><div class="kpi-sub">${d.abastecimentos.length} reg.</div></div>
  <div class="kpi c-red" style="padding:9px"><div class="kpi-label">Adiant.</div><div class="kpi-value v-neg" style="font-size:13px">${fmt(d.total_adiantamentos)}</div><div class="kpi-sub">${d.adiantamentos.length} reg.</div></div>
  <div class="kpi ${s>=0?'c-grn':'c-red'}" style="padding:9px"><div class="kpi-label">Saldo</div><div class="kpi-value ${vc(s)}" style="font-size:13px">${s<0?'- ':''}${fmt(s)}</div><div class="kpi-sub">${s>=0?'A pagar':'Devendo'}</div></div>
</div>
<p class="note">Somente <strong>EM ABERTO</strong> e <strong>LANÇADO</strong>.</p>
${d.romaneios.length?`<details open><summary style="color:var(--blu)">Romaneios (${d.romaneios.length}) — ${fmt(d.total_romaneios)}</summary>
${tblWrap(`<thead><tr><th>Data</th><th>NF</th><th>Talhão</th><th class="tr">Sacas</th><th class="tr">Valor</th><th class="tc">St.</th></tr></thead><tbody>${d.romaneios.map(x=>`<tr><td class="mono">${fmtD(x.data)}</td><td class="mono">${x.nota_fiscal}</td><td>${x.talhao||'—'}</td><td class="mono tr v-eme">${(x.peso_liquido/60).toFixed(0)}</td><td class="mono tr tb">${fmt(x.valor_total)}</td><td class="tc">${staB(x.status)}</td></tr>`).join('')}</tbody>`,'240px')}
</details>`:''}
${d.abastecimentos.length?`<details open><summary style="color:var(--amb)">Abastecimentos (${d.abastecimentos.length}) — ${fmt(d.total_abastecimentos)}</summary>
${tblWrap(`<thead><tr><th>Data</th><th class="tr">Litros</th><th class="tr">Vl. Desc.</th><th class="tc">St.</th></tr></thead><tbody>${d.abastecimentos.map(x=>`<tr><td class="mono">${fmtD(x.data_requisicao)}</td><td class="mono tr">${x.qtd_litros.toLocaleString('pt-BR',{minimumFractionDigits:1})}</td><td class="mono tr tb">${fmt(x.vl_desconto_total)}</td><td class="tc">${staB(x.status)}</td></tr>`).join('')}</tbody>`,'200px')}
</details>`:''}
${d.adiantamentos.length?`<details open><summary style="color:var(--red)">Adiantamentos (${d.adiantamentos.length}) — ${fmt(d.total_adiantamentos)}</summary>
${tblWrap(`<thead><tr><th>Data</th><th>Descrição</th><th class="tr">Valor</th><th class="tc">St.</th></tr></thead><tbody>${d.adiantamentos.map(x=>`<tr><td class="mono">${fmtD(x.data)}</td><td style="max-width:130px;overflow:hidden;text-overflow:ellipsis" title="${x.descricao}">${x.descricao}</td><td class="mono tr tb">${fmt(x.valor)}</td><td class="tc">${staB(x.status)}</td></tr>`).join('')}</tbody>`,'200px')}
</details>`:''}`
}

function closeModal(){
  document.getElementById('modal-overlay').classList.remove('show');
  document.body.style.overflow='';
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

(function(){
  let sy=0;
  document.addEventListener('touchstart',e=>{if(document.getElementById('modal-overlay').classList.contains('show'))sy=e.touches[0].clientY},{passive:true});
  document.addEventListener('touchend',e=>{
    if(!document.getElementById('modal-overlay').classList.contains('show'))return;
    const dy=e.changedTouches[0].clientY-sy;
    if(dy>80)closeModal();
  },{passive:true});
})();

/* ═══ MOTORISTAS ═══ */
async function loadMot(){
  const d=await api('/api/resumo/?grupo='+G);if(!d)return;
  const a=d.resumo.filter(x=>x.situacao!=='QUITADO').sort((a,b)=>b.saldo-a.saldo);
  document.getElementById('content').innerHTML=`
<div class="card">
  <div class="card-h"><div class="card-t"><div class="dot pur"></div>Motoristas</div><div class="card-badge" id="mot-cnt">${a.length}</div></div>
  <div class="search-bar">${SI}<input placeholder="Buscar..." oninput="filtMot(this)" data-all='${JSON.stringify(a).replace(/'/g,"&#39;")}'></div>
  <div id="mot-cards">${a.map(x=>motCard(x)).join('')}</div>
  <div class="tbl-desk-only tbl-scroll-x" style="max-height:600px;overflow-y:auto">
    <table id="tm">
      <thead><tr><th>Placa</th><th>Motorista</th><th class="tr">Rom.</th><th class="tr">Abast.</th><th class="tr">Adiant.</th><th class="tr">Saldo</th><th class="tc">Sit.</th></tr></thead>
      <tbody id="tm-body">${a.map(x=>`<tr class="click" onclick="openMot(${x.id},'${esc(x.motorista)}','${x.placa}')"><td class="mono tb">${x.placa}</td><td>${x.motorista}</td><td class="mono tr">${x.romaneios?fmt(x.romaneios):'—'}</td><td class="mono tr v-amb">${x.abastecimentos?fmt(x.abastecimentos):'—'}</td><td class="mono tr v-neg">${x.adiantamentos?fmt(x.adiantamentos):'—'}</td><td class="mono tr tb ${vc(x.saldo)}">${x.saldo<0?'- ':''}${fmt(x.saldo)}</td><td class="tc">${sitB(x.situacao)}</td></tr>`).join('')}</tbody>
    </table>
  </div>
</div>`;
}

function filtMot(inp){
  const q=inp.value.toLowerCase();
  const all=JSON.parse(inp.dataset.all);
  const f=all.filter(x=>(x.motorista+x.placa).toLowerCase().includes(q));
  document.getElementById('mot-cnt').textContent=f.length;
  document.getElementById('mot-cards').innerHTML=f.map(x=>motCard(x)).join('');
  document.querySelectorAll('#tm-body tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q)?'':'none'});
}

/* ═══ COLHEITA ═══ */
async function loadCol(){
  const d=await api('/api/colheita/?grupo='+G);if(!d)return;
  const t=d.totais,mx=Math.max(...d.talhoes.map(x=>x.sacas),1);
  document.getElementById('content').innerHTML=`
<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="kpi c-eme"><div class="kpi-label">Sacas</div><div class="kpi-value v-eme">${fmtN(t.sacas)}</div><div class="kpi-sub">${d.talhoes.length} talhões</div></div>
  <div class="kpi c-blu"><div class="kpi-label">Peso</div><div class="kpi-value v-blu">${(t.peso_kg/1000).toFixed(1)}t</div><div class="kpi-sub">${fmtN(t.peso_kg)} kg</div></div>
  <div class="kpi c-amb"><div class="kpi-label">Viagens</div><div class="kpi-value v-amb">${t.viagens}</div><div class="kpi-sub">Ativos</div></div>
  <div class="kpi c-pur"><div class="kpi-label">Frete</div><div class="kpi-value" style="color:var(--pur)">${fmt(t.valor_total)}</div><div class="kpi-sub">Total</div></div>
</div>
<div class="g2">
  <div class="card"><div class="card-h"><div class="card-t"><div class="dot eme"></div>Sacas por Talhão</div></div>
    <div class="scroll-t">${d.talhoes.map(x=>`<div class="bar-row"><div class="bar-lbl" title="${x.talhao}">${x.talhao}</div><div class="bar-trk"><div class="bar-fill eme" style="width:${(x.sacas/mx*100).toFixed(1)}%"></div></div><div class="bar-val v-eme">${fmtN(x.sacas)}</div></div>`).join('')}</div>
  </div>
  <div class="card"><div class="card-h"><div class="card-t"><div class="dot blu"></div>Detalhes</div></div>
    ${tblWrap(`<thead><tr><th>Talhão</th><th class="tr">Sacas</th><th class="tr">Peso</th><th class="tr">Viag.</th><th class="tr">Frete</th></tr></thead><tbody>${d.talhoes.map(x=>`<tr><td class="tb">${x.talhao}</td><td class="mono tr tb v-eme">${fmtN(x.sacas)}</td><td class="mono tr">${fmtN(x.peso_kg)}</td><td class="mono tr">${x.viagens}</td><td class="mono tr">${fmt(x.valor_total)}</td></tr>`).join('')}</tbody><tfoot><tr style="border-top:2px solid var(--bd)"><td class="tb">TOTAL</td><td class="mono tr tb v-eme">${fmtN(t.sacas)}</td><td class="mono tr tb">${fmtN(t.peso_kg)}</td><td class="mono tr tb">${t.viagens}</td><td class="mono tr tb">${fmt(t.valor_total)}</td></tr></tfoot>`)}
  </div>
</div>`;
}

/* ═══ ROMANEIOS ═══ */
let allR=[],allF=null;
async function loadRom(){
  const[d,f]=await Promise.all([api('/api/romaneios/?grupo='+G),allF||api('/api/filtros/')]);
  if(!d)return;allR=d;allF=f;
  const a=d.filter(x=>x.status!=='FECHADO'),tv=a.reduce((s,x)=>s+x.valor_total,0),tp=a.reduce((s,x)=>s+x.peso_liquido,0);
  document.getElementById('content').innerHTML=`
<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="kpi c-blu"><div class="kpi-label">Total</div><div class="kpi-value v-blu">${d.length}</div><div class="kpi-sub">${a.length} ativos</div></div>
  <div class="kpi c-grn"><div class="kpi-label">Valor</div><div class="kpi-value v-pos">${fmt(tv)}</div><div class="kpi-sub">Ativos</div></div>
  <div class="kpi c-eme"><div class="kpi-label">Sacas</div><div class="kpi-value v-eme">${fmtN(tp/60)}</div><div class="kpi-sub">${(tp/1000).toFixed(1)}t</div></div>
  <div class="kpi c-amb"><div class="kpi-label">Viagens</div><div class="kpi-value v-amb">${a.length}</div><div class="kpi-sub">Aberto+Lanç.</div></div>
</div>
<div class="card">
  <div class="card-h"><div class="card-t"><div class="dot blu"></div>Romaneios</div><div class="card-badge" id="rc">${d.length}</div></div>
  <div class="filter-row">
    <select class="filter-select" id="ft" onchange="fR()"><option value="">Talhões</option>${(f?.talhoes||[]).map(t=>'<option>'+t+'</option>').join('')}</select>
    <select class="filter-select" id="fs" onchange="fR()"><option value="">Status</option><option>EM ABERTO</option><option>LANÇADO</option><option>FECHADO</option></select>
    <select class="filter-select" id="fo" onchange="fR()"><option value="">Origens</option>${(f?.origens||[]).map(t=>'<option>'+t+'</option>').join('')}</select>
  </div>
  <div class="search-bar">${SI}<input placeholder="Buscar..." id="rs" oninput="fR()"></div>
  ${tblWrap(`<thead><tr><th>Data</th><th>NF</th><th>Talhão</th><th>Motorista</th><th>Placa</th><th class="tr">Sacas</th><th class="tr">Valor</th><th class="tc">St.</th></tr></thead><tbody id="rb"></tbody>`,'520px')}
</div>`;
  rR(d);
}
function fR(){const t=document.getElementById('ft').value,s=document.getElementById('fs').value,o=document.getElementById('fo').value,q=(document.getElementById('rs').value||'').toLowerCase();let f=allR;if(t)f=f.filter(x=>x.talhao===t);if(s)f=f.filter(x=>x.status===s);if(o)f=f.filter(x=>x.origem===o);if(q)f=f.filter(x=>(x.motorista+x.placa+x.nota_fiscal+x.talhao).toLowerCase().includes(q));document.getElementById('rc').textContent=f.length;rR(f)}
function rR(d){document.getElementById('rb').innerHTML=d.map(x=>`<tr><td class="mono">${fmtD(x.data)}</td><td class="mono">${x.nota_fiscal}</td><td>${x.talhao||'—'}</td><td>${x.motorista}</td><td class="mono tb">${x.placa}</td><td class="mono tr v-eme">${x.sacas.toFixed(0)}</td><td class="mono tr tb">${fmt(x.valor_total)}</td><td class="tc">${staB(x.status)}</td></tr>`).join('')}

/* ═══ ABASTECIMENTOS ═══ */
async function loadAb(){
  const d=await api('/api/abastecimentos/?grupo='+G);if(!d)return;
  const a=d.filter(x=>x.status!=='FECHADO'),t=a.reduce((s,x)=>s+x.vl_desc_total,0),l=a.reduce((s,x)=>s+x.qtd_litros,0);
  document.getElementById('content').innerHTML=`
<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
  <div class="kpi c-amb"><div class="kpi-label">Total</div><div class="kpi-value v-amb">${d.length}</div><div class="kpi-sub">${a.length} ativos</div></div>
  <div class="kpi c-red"><div class="kpi-label">Desconto</div><div class="kpi-value v-neg">${fmt(t)}</div><div class="kpi-sub">A descontar</div></div>
  <div class="kpi c-blu"><div class="kpi-label">Litros</div><div class="kpi-value v-blu">${fmtN(l)} L</div><div class="kpi-sub">Diesel</div></div>
</div>
<div class="card">
  <div class="card-h"><div class="card-t"><div class="dot amb"></div>Abastecimentos</div><div class="card-badge">${d.length}</div></div>
  <div class="search-bar">${SI}<input placeholder="Buscar..." oninput="filt(this,'ta-body')"></div>
  ${tblWrap(`<thead><tr><th>Data</th><th>Motorista</th><th>Placa</th><th class="tr">Litros</th><th class="tr">Vl.Desc.</th><th class="tc">St.</th></tr></thead><tbody id="ta-body">${d.map(x=>`<tr><td class="mono">${fmtD(x.data_requisicao)}</td><td>${x.motorista}</td><td class="mono tb">${x.placa}</td><td class="mono tr">${x.qtd_litros.toLocaleString('pt-BR',{minimumFractionDigits:1})}</td><td class="mono tr tb">${fmt(x.vl_desc_total)}</td><td class="tc">${staB(x.status)}</td></tr>`).join('')}</tbody>`,'520px')}
</div>`;
}

/* ═══ ADIANTAMENTOS ═══ */
async function loadAd(){
  const d=await api('/api/adiantamentos/?grupo='+G);if(!d)return;
  const a=d.filter(x=>x.status!=='FECHADO'),t=a.reduce((s,x)=>s+x.valor,0);
  document.getElementById('content').innerHTML=`
<div class="kpi-grid" style="grid-template-columns:repeat(2,1fr)">
  <div class="kpi c-red"><div class="kpi-label">Total</div><div class="kpi-value v-neg">${d.length}</div><div class="kpi-sub">${a.length} ativos</div></div>
  <div class="kpi c-amb"><div class="kpi-label">Valor</div><div class="kpi-value v-amb">${fmt(t)}</div><div class="kpi-sub">A descontar</div></div>
</div>
<div class="card">
  <div class="card-h"><div class="card-t"><div class="dot red"></div>Adiantamentos</div><div class="card-badge">${d.length}</div></div>
  <div class="search-bar">${SI}<input placeholder="Buscar..." oninput="filt(this,'tad-body')"></div>
  ${tblWrap(`<thead><tr><th>Data</th><th>Motorista</th><th>Placa</th><th>Descrição</th><th class="tr">Valor</th><th class="tc">St.</th></tr></thead><tbody id="tad-body">${d.map(x=>`<tr><td class="mono">${fmtD(x.data)}</td><td>${x.motorista}</td><td class="mono tb">${x.placa}</td><td style="max-width:130px;overflow:hidden;text-overflow:ellipsis" title="${x.descricao}">${x.descricao}</td><td class="mono tr tb">${fmt(x.valor)}</td><td class="tc">${staB(x.status)}</td></tr>`).join('')}</tbody>`,'520px')}
</div>`;
}

/* ═══ UTILS ═══ */
function filt(inp,tbodyId){
  const q=inp.value.toLowerCase();
  document.querySelectorAll('#'+tbodyId+' tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q)?'':'none'});
}

load();