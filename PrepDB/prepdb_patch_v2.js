/**
 * PrepDB — Patch v2
 * Fonctionnalités : onglet 📄 PDF + séries/temps dans les exercices
 * Installation : ajouter avant </body> dans index.html :
 *   <script src="prepdb_patch_v2.js"></script>
 */

document.addEventListener('DOMContentLoaded', () => setTimeout(applyV2Patches, 300));

function applyV2Patches() {
  (function injectNavTab() {
    const nav = document.querySelector('.nav-tabs');
    if (!nav || nav.querySelector('[data-view="pdf"]')) return;
    const btn = document.createElement('button');
    btn.className = 'nav-tab'; btn.dataset.view = 'pdf';
    btn.textContent = '📄 PDF'; btn.onclick = () => switchView('pdf');
    const tabs = nav.querySelectorAll('.nav-tab'); let tb = null;
    tabs.forEach(t => { if (t.textContent.includes('Templates')) tb = t; });
    if (tb) tb.after(btn); else nav.appendChild(btn);
  })();
  (function injectPDFSection() {
    if (document.getElementById('view-pdf')) return;
    const main = document.querySelector('main'); if (!main) return;
    const sec = document.createElement('section');
    sec.className = 'view'; sec.id = 'view-pdf';
    sec.innerHTML = '<h1 class="page-title">📄 Export PDF</h1><div class="page-subtitle">Séances en PDF · par mois · séries/temps</div><div id="pdfSessionsList"></div>';
    main.appendChild(sec);
  })();
  const _osv = window.switchView;
  if (typeof _osv === 'function') {
    window.switchView = function(v, e) {
      _osv(v, e);
      if (v === 'pdf') {
        document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
        const t = document.querySelector('[data-view="pdf"]'); if (t) t.classList.add('active');
        renderPDFView();
      }
    };
  }
  const _orel = window.renderExercisesList;
  if (typeof _orel === 'function') {
    window.renderExercisesList = function() {
      _orel();
      if (!window.currentSession) return;
      const ex = window.currentSession.exercises || [];
      document.querySelectorAll('#exercisesList .exercise-block').forEach((block, i) => {
        const e = ex[i]; if (!e) return;
        const meta = block.querySelector('.exercise-meta');
        if (meta) {
          const s = e.tempsSerie > 0 ? `${e.series} sér. × ${e.tempsSerie}s` : (e.distSerie > 0 ? `${e.series} sér. × ${e.distSerie}m` : `${e.series} sér.`);
          meta.innerHTML = `<strong style="color:var(--accent);">${s}</strong> · ${e.duree} min · RPE ${e.rpe} · ${e.nbJoueurs}j`;
        }
        const grid = block.querySelector('.computed-grid');
        if (grid && !grid.querySelector('[data-sc]')) {
          const sc = document.createElement('div'); sc.className = 'computed accent'; sc.dataset.sc = '1';
          sc.innerHTML = `<div class="computed-label">Séries</div><div class="computed-value">${e.series}</div>`;
          const tc = document.createElement('div'); tc.className = 'computed accent'; tc.dataset.sc = '1';
          const tv = e.tempsSerie > 0 ? `${e.tempsSerie}s` : (e.distSerie > 0 ? `${e.distSerie}m` : '—');
          tc.innerHTML = `<div class="computed-label">Tps / série</div><div class="computed-value">${tv}</div>`;
          grid.prepend(tc); grid.prepend(sc);
        }
      });
    };
  }
  const _oosd = window.openSessionDetail;
  if (typeof _oosd === 'function') {
    window.openSessionDetail = function(id) {
      _oosd(id);
      setTimeout(() => {
        const s = (window.state?.sessions || []).find(x => x.id === id); if (!s) return;
        const body = document.getElementById('modalSessionBody'); if (!body) return;
        body.querySelectorAll('.exercise-block').forEach((block, i) => {
          const e = (s.exercises || [])[i]; if (!e) return;
          const meta = block.querySelector('.exercise-meta'); if (!meta) return;
          const str = e.tempsSerie > 0 ? `${e.series} sér. × ${e.tempsSerie}s` : (e.distSerie > 0 ? `${e.series} sér. × ${e.distSerie}m` : `${e.series} sér.`);
          meta.innerHTML = `<strong style="color:var(--accent);">${str}</strong> · ${e.duree} min · RPE ${e.rpe}`;
        });
      }, 50);
    };
  }
  console.log('✓ PrepDB Patch v2 (PDF + séries/temps)');
}

window.renderPDFView = function() {
  const el = document.getElementById('pdfSessionsList'); if (!el) return;
  const sessions = [...(window.state?.sessions||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
  if (!sessions.length) { el.innerHTML='<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-title">Aucune séance</div></div>'; return; }
  const byMonth={};
  sessions.forEach(s=>{ const k=s.date.slice(0,7); if(!byMonth[k])byMonth[k]=[]; byMonth[k].push(s); });
  let html='';
  Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([month,arr])=>{
    const dt=new Date(month+'-01');
    const label=dt.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
    const cap=label.charAt(0).toUpperCase()+label.slice(1);
    const tUA=arr.reduce((s,x)=>s+(x.ua||0),0);
    const tSer=arr.reduce((s,x)=>s+(x.exercises||[]).reduce((a,e)=>a+(e.series||0),0),0);
    html+=`<div class="card" style="margin-bottom:14px;"><div class="card-header">📅 ${cap}<div class="row" style="gap:8px;align-items:center;"><span class="text-xs text-dim">${arr.length} séance${arr.length>1?'s':''} · ${tUA} UA · ${tSer} séries</span><button class="btn btn-ghost btn-sm" onclick="exportMonthPDF('${month}')">📄 Tout le mois</button></div></div><div class="card-body" style="padding:0;">${arr.map(s=>{
      const MD=window.MD_DAYS||[]; const md=MD.find(m=>m.code===s.md);
      const exL=(s.exercises||[]).map(e=>{const p=e.tempsSerie>0?e.tempsSerie+'s':(e.distSerie>0?e.distSerie+'m':'—');return e.themeNom+' ('+e.series+'×'+p+')';}).slice(0,3).join(' · ');
      const tS=(s.exercises||[]).reduce((a,e)=>a+(e.series||0),0);
      return '<div class="session-item" style="cursor:default;border-radius:0;border-bottom:1px solid var(--border-soft);"><div class="session-meta-left"><div class="session-date">'+(window.fmtDate?fmtDate(s.date):s.date)+' · '+(s.exercises||[]).length+' exo · '+(s.duree||0)+' min · '+tS+' séries</div><div class="session-title">'+(s.title||(md?.filiere||'Séance'))+'</div><div class="session-desc">'+(exL||'—')+'</div></div><div class="session-badges"><span class="badge badge-md" style="background:'+(md?.color||'#1E5DA1')+';">'+s.md+'</span><span class="badge badge-ua">'+s.ua+' UA</span><button class="btn btn-primary btn-sm" onclick="exportSessionPDFById('+s.id+')">📄 PDF</button></div></div>';
    }).join('')}</div></div>`;
  });
  el.innerHTML=html;
};

window.exportSessionPDFById = function(id) {
  const saved=window.modalSessionId; window.modalSessionId=id;
  if (typeof window.exportSessionPDF==='function') window.exportSessionPDF();
  window.modalSessionId=saved;
};

window.exportMonthPDF = function(month) {
  const MD=window.MD_DAYS||[];
  const sessions=(window.state?.sessions||[]).filter(s=>s.date.startsWith(month)).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (!sessions.length){alert('Aucune séance ce mois.');return;}
  const dt=new Date(month+'-01');
  const label=dt.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
  const cap=label.charAt(0).toUpperCase()+label.slice(1);
  const tUA=sessions.reduce((s,x)=>s+(x.ua||0),0);
  const tMin=sessions.reduce((s,x)=>s+(x.duree||0),0);
  const tSer=sessions.reduce((s,x)=>s+(x.exercises||[]).reduce((a,e)=>a+(e.series||0),0),0);
  const tDist=sessions.reduce((s,x)=>s+(x.totalDistance||0),0);
  const fmtD=window.fmtDate||(d=>d);
  const body=sessions.map(s=>{
    const md=MD.find(m=>m.code===s.md);
    const rows=(s.exercises||[]).map((e,i)=>{
      const p=e.tempsSerie>0?e.tempsSerie+'s':(e.distSerie>0?e.distSerie+'m':'—');
      const ratio=e.tempsSerie>0&&e.recup>0?'1:'+(e.recup/e.tempsSerie).toFixed(1):'—';
      return '<tr><td style="padding:2mm 3mm;font-weight:600;color:#1E5DA1;">'+(i+1)+'. '+(e.name||e.themeNom)+'</td><td style="padding:2mm;text-align:center;"><b>'+e.series+'</b></td><td style="padding:2mm;text-align:center;"><b>'+p+'</b></td><td style="padding:2mm;text-align:center;">'+e.recup+'s ('+(e.recupType||'')+')</td><td style="padding:2mm;text-align:center;">'+e.duree+"'</td><td style=\"padding:2mm;text-align:center;\">"+ ratio+'</td><td style="padding:2mm;text-align:center;">RPE '+e.rpe+'</td><td style="padding:2mm;text-align:center;font-weight:700;color:#1E5DA1;">'+e.ua+'</td><td style="padding:2mm;text-align:center;">'+e.longueur+'×'+e.largeur+'m</td></tr>'+(e.notes?'<tr><td colspan="9" style="padding:1mm 3mm;font-size:8pt;color:#666;font-style:italic;">'+e.notes+'</td></tr>':'');
    }).join('');
    const bg=md?.color||'#1E5DA1';
    return '<div style="margin-bottom:8mm;page-break-inside:avoid;"><div style="background:'+bg+';color:white;padding:3mm 5mm;border-radius:2mm 2mm 0 0;display:flex;justify-content:space-between;"><div style="font-size:11pt;font-weight:700;">'+fmtD(s.date)+' · '+s.md+(s.title?' — '+s.title:'')+'</div><div style="font-size:9pt;">RPE '+s.rpe+' · '+s.ua+' UA · '+s.duree+"' · "+s.players+' joueurs</div></div>'+((s.exercises||[]).length>0?'<table style="width:100%;border-collapse:collapse;font-size:8.5pt;border:1px solid #ddd;border-top:none;"><thead><tr style="background:#eef4fb;"><th style="padding:2mm 3mm;text-align:left;">Exercice</th><th>Séries</th><th>/ Série</th><th>Récup</th><th>Durée</th><th>Ratio</th><th>RPE</th><th>UA</th><th>Surface</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p style="color:#999;font-size:9pt;">Aucun exercice</p>')+(s.notes?'<div style="background:#fff8e7;border-left:3px solid #f4b942;padding:2mm 4mm;font-size:9pt;">'+s.notes+'</div>':'')+'</div>';
  }).join('');
  const html='<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>PrepDB — '+cap+'</title><style>@page{size:A4;margin:12mm}body{font-family:Helvetica,Arial,sans-serif;color:#0A1929;font-size:10pt;margin:0}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}</style></head><body><div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;background:linear-gradient(135deg,#6CACE4,#1E5DA1);color:white;padding:12mm;margin:-12mm -12mm 8mm;"><h1 style="margin:0;font-size:20pt;font-weight:900;">UNION ROCHEFORTOISE</h1><div>Bilan mensuel · '+cap+'</div><div style="margin-top:5mm;display:flex;gap:10mm;flex-wrap:wrap;font-size:10pt;"><span>📋 <b>'+sessions.length+'</b> séances</span><span>⚡ <b>'+tUA+'</b> UA</span><span>⏱ <b>'+Math.floor(tMin/60)+'h'+String(tMin%60).padStart(2,'0')+'</b></span><span>🔁 <b>'+tSer+'</b> séries</span>'+(tDist>0?'<span>📏 <b>'+(tDist/1000).toFixed(1)+' km</b></span>':'')+'</div></div>'+body+'<div style="margin-top:10mm;text-align:center;font-size:7.5pt;color:#aaa;">Union Rochefortoise · PrepDB v1 · '+new Date().toLocaleDateString('fr-FR')+'</div></body></html>';
  const w=window.open('','_blank');
  if (!w){alert('Autorisez les pop-ups.');return;}
  w.document.write(html); w.document.close(); setTimeout(()=>w.print(),700);
};
