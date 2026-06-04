/**
 * PrepDB — Patch v2 (rev 2)
 * Corrections :
 *  1. "3x0m" -> affichage correct du temps/serie en secondes
 *  2. PDF : temps/serie en secondes + detail duree totale
 *  3. Recap seance : series + temps/serie + duree totale par exercice
 *  4. Bouton Telecharger dans les popups PDF
 * Installation : ajouter avant </body> dans index.html :
 *   <script src="prepdb_patch_v2.js"></script>
 */

document.addEventListener('DOMContentLoaded', () => setTimeout(applyV2Patches, 300));

function _fmtSec(sec) {
  if (!sec || sec <= 0) return null;
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60), s = sec % 60;
  return s > 0 ? m + 'min' + s + 's' : m + 'min';
}
function _serieLabel(e) {
  if (e.tempsSerie > 0) return e.series + ' ser. x ' + _fmtSec(e.tempsSerie);
  if (e.distSerie  > 0) return e.series + ' ser. x ' + e.distSerie + 'm';
  return e.series + ' ser.';
}
function _totalExoSec(e) {
  if (e.dureeTotaleSec > 0) return e.dureeTotaleSec;
  if (e.tempsSerie > 0 && e.series > 0)
    return e.tempsSerie * e.series + (e.recup || 0) * Math.max(0, e.series - 1);
  return (e.duree || 0) * 60;
}

function applyV2Patches() {
  (function injectNavTab() {
    const nav = document.querySelector('.nav-tabs');
    if (!nav || nav.querySelector('[data-view="pdf"]')) return;
    const btn = document.createElement('button');
    btn.className = 'nav-tab'; btn.dataset.view = 'pdf';
    btn.textContent = '\uD83D\uDCC4 PDF'; btn.onclick = () => switchView('pdf');
    const tabs = nav.querySelectorAll('.nav-tab'); let tb = null;
    tabs.forEach(t => { if (t.textContent.includes('Templates')) tb = t; });
    if (tb) tb.after(btn); else nav.appendChild(btn);
  })();
  (function injectPDFSection() {
    if (document.getElementById('view-pdf')) return;
    const main = document.querySelector('main'); if (!main) return;
    const sec = document.createElement('section');
    sec.className = 'view'; sec.id = 'view-pdf';
    sec.innerHTML = '<h1 class="page-title">\uD83D\uDCC4 Export PDF</h1><div class="page-subtitle">Telecharger vos seances · par mois · series/temps</div><div id="pdfSessionsList"></div>';
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
          const totalSec = _totalExoSec(e);
          meta.innerHTML = '<strong style="color:var(--accent);">' + _serieLabel(e) + '</strong>'
            + ' · ' + e.duree + ' min · RPE ' + e.rpe + ' · ' + e.nbJoueurs + 'j'
            + (totalSec > 0 ? ' · ⏱ ' + _fmtSec(totalSec) + ' total' : '');
        }
        const grid = block.querySelector('.computed-grid');
        if (grid && !grid.querySelector('[data-sc]')) {
          const sc = document.createElement('div'); sc.className = 'computed accent'; sc.dataset.sc = '1';
          sc.innerHTML = '<div class="computed-label">Series</div><div class="computed-value">' + e.series + '</div>';
          const tc = document.createElement('div'); tc.className = 'computed accent'; tc.dataset.sc = '1';
          const tv = e.tempsSerie > 0 ? e.tempsSerie + '<span style="font-size:11px;">s</span>'
            : (e.distSerie > 0 ? e.distSerie + '<span style="font-size:11px;">m</span>' : '—');
          tc.innerHTML = '<div class="computed-label">/ Serie</div><div class="computed-value">' + tv + '</div>';
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
        const s = (window.state && window.state.sessions || []).find(x => x.id === id); if (!s) return;
        const body = document.getElementById('modalSessionBody'); if (!body) return;
        body.querySelectorAll('.exercise-block').forEach((block, i) => {
          const e = (s.exercises || [])[i]; if (!e) return;
          const meta = block.querySelector('.exercise-meta');
          if (meta) {
            const totalSec = _totalExoSec(e);
            meta.innerHTML = '<strong style="color:var(--accent);">' + _serieLabel(e) + '</strong>'
              + ' · ' + e.duree + ' min · RPE ' + e.rpe
              + (totalSec > 0 ? ' · ⏱ ' + _fmtSec(totalSec) : '');
          }
          const grid = block.querySelector('.computed-grid');
          if (grid && !grid.querySelector('[data-sc]')) {
            const sc = document.createElement('div'); sc.className = 'computed accent'; sc.dataset.sc = '1';
            sc.innerHTML = '<div class="computed-label">Series</div><div class="computed-value">' + e.series + '</div>';
            const tc = document.createElement('div'); tc.className = 'computed accent'; tc.dataset.sc = '1';
            const tv = e.tempsSerie > 0 ? e.tempsSerie + 's' : (e.distSerie > 0 ? e.distSerie + 'm' : '—');
            tc.innerHTML = '<div class="computed-label">/ Serie</div><div class="computed-value">' + tv + '</div>';
            grid.prepend(tc); grid.prepend(sc);
          }
        });
      }, 80);
    };
  }
  const _onr = window.renderNewRecap;
  if (typeof _onr === 'function') {
    window.renderNewRecap = function() {
      _onr();
      if (!window.currentSession) return;
      const ex = window.currentSession.exercises || [];
      if (!ex.length) return;
      const el = document.getElementById('newRecap'); if (!el) return;
      if (el.querySelector('[data-series-recap]')) return;
      const rows = ex.map((e, i) => {
        const totalSec = _totalExoSec(e);
        const ps = e.tempsSerie > 0 ? e.tempsSerie + 's' : (e.distSerie > 0 ? e.distSerie + 'm' : '—');
        const ratio = e.tempsSerie > 0 && e.recup > 0 ? '1:' + (e.recup / e.tempsSerie).toFixed(1) : '—';
        return '<tr style="border-bottom:1px solid var(--border-soft);"><td style="padding:6px 8px;color:var(--text-dim);font-size:11px;">#' + (i+1) + ' ' + (e.name||e.themeNom) + '</td><td style="padding:6px 8px;text-align:center;font-weight:700;color:var(--accent);">' + e.series + '</td><td style="padding:6px 8px;text-align:center;font-weight:700;color:var(--accent);">' + ps + '</td><td style="padding:6px 8px;text-align:center;color:var(--text-dim);">' + ratio + '</td><td style="padding:6px 8px;text-align:center;color:var(--text-dim);">' + (e.recup > 0 ? e.recup + 's' : '—') + '</td><td style="padding:6px 8px;text-align:center;font-weight:700;color:var(--primary);">' + (totalSec > 0 ? _fmtSec(totalSec) : e.duree + 'min') + '</td></tr>';
      }).join('');
      const tS = ex.reduce((a, e) => a + (e.series || 0), 0);
      const div = document.createElement('div'); div.dataset.seriesRecap = '1';
      div.style.cssText = 'grid-column:1/-1;margin-top:10px;';
      div.innerHTML = '<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px;">Detail series · <strong style=\"color:var(--accent);\">'
        + tS + ' series au total</strong></div>'
        + '<table style="width:100%;border-collapse:collapse;background:var(--bg-2);border-radius:6px;overflow:hidden;font-size:12px;">'
        + '<thead><tr style="background:var(--bg-3);"><th style="padding:6px 8px;text-align:left;font-size:10px;color:var(--text-muted);">Exercice</th><th style="padding:6px;text-align:center;font-size:10px;color:var(--text-muted);">Series</th><th style="padding:6px;text-align:center;font-size:10px;color:var(--text-muted);">/ Serie</th><th style="padding:6px;text-align:center;font-size:10px;color:var(--text-muted);">Ratio</th><th style="padding:6px;text-align:center;font-size:10px;color:var(--text-muted);">Recup</th><th style="padding:6px;text-align:center;font-size:10px;color:var(--text-muted);">Duree</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>';
      el.appendChild(div);
    };
  }
  console.log('PrepDB Patch v2 rev2 OK');
}
window.renderPDFView = function() {
  const el = document.getElementById('pdfSessionsList'); if (!el) return;
  const sessions = [...((window.state && window.state.sessions)||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
  if (!sessions.length) { el.innerHTML='<div class="empty-state"><div class="empty-state-icon">\uD83D\uDCC4</div><div class="empty-state-title">Aucune seance</div></div>'; return; }
  const byMonth={};
  sessions.forEach(s=>{ const k=s.date.slice(0,7); if(!byMonth[k])byMonth[k]=[]; byMonth[k].push(s); });
  let html='';
  Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([month,arr])=>{
    const dt=new Date(month+'-01');
    const cap=(dt.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})).replace(/^./, c=>c.toUpperCase());
    const tUA=arr.reduce((s,x)=>s+(x.ua||0),0);
    const tSer=arr.reduce((s,x)=>s+(x.exercises||[]).reduce((a,e)=>a+(e.series||0),0),0);
    html+='<div class="card" style="margin-bottom:14px;"><div class="card-header">\uD83D\uDCC5 '+cap
      +'<div class="row" style="gap:8px;align-items:center;"><span class="text-xs text-dim">'+arr.length+' seance'+(arr.length>1?'s':'')+' · '+tUA+' UA · '+tSer+' series</span>'
      +'<button class="btn btn-ghost btn-sm" onclick="exportMonthPDF(\''+month+'\')">\uD83D\uDCC4 Tout le mois</button></div></div>'
      +'<div class="card-body" style="padding:0;">'
      +arr.map(s=>{
        const MD=window.MD_DAYS||[]; const md=MD.find(m=>m.code===s.md);
        const exL=(s.exercises||[]).map(e=>e.themeNom+' ('+_serieLabel(e)+')').slice(0,3).join(' · ');
        const tS=(s.exercises||[]).reduce((a,e)=>a+(e.series||0),0);
        return '<div class="session-item" style="cursor:default;border-radius:0;border-bottom:1px solid var(--border-soft);">'
          +'<div class="session-meta-left"><div class="session-date">'+(window.fmtDate?fmtDate(s.date):s.date)+' · '+(s.exercises||[]).length+' exo · '+(s.duree||0)+' min · '+tS+' series</div>'
          +'<div class="session-title">'+(s.title||(md&&md.filiere||'Seance'))+'</div><div class="session-desc">'+(exL||'—')+'</div></div>'
          +'<div class="session-badges"><span class="badge badge-md" style="background:'+(md&&md.color||'#1E5DA1')+';">'+s.md+'</span>'
          +'<span class="badge badge-ua">'+s.ua+' UA</span>'
          +'<button class="btn btn-primary btn-sm" onclick="exportSessionPDFById('+s.id+')">\uD83D\uDCC4 PDF</button></div></div>';
      }).join('')+'</div></div>';
  });
  el.innerHTML=html;
};

window.exportSessionPDFById = function(id) {
  const saved=window.modalSessionId; window.modalSessionId=id;
  if (typeof window.exportSessionPDF==='function') window.exportSessionPDF();
  window.modalSessionId=saved;
};
setTimeout(function patchPDF(){
  if(typeof window.exportSessionPDF!=='function'){setTimeout(patchPDF,500);return;}
  window.exportSessionPDF=function(){
    const s=(window.state&&window.state.sessions||[]).find(x=>x.id===window.modalSessionId);
    if(!s)return;
    const MD=window.MD_DAYS||[];
    const md=MD.find(m=>m.code===s.md);
    const fmtD=window.fmtDate||(d=>d);
    const exosHtml=(s.exercises||[]).map((e,i)=>{
      const totalSec=_totalExoSec(e);
      const totalStr=totalSec>0?_fmtSec(totalSec):(e.duree+'min');
      const ratio=e.tempsSerie>0&&e.recup>0?'1:'+(e.recup/e.tempsSerie).toFixed(1):'—';
      const recupStr=e.recup>0?e.recup+'s ('+(e.recupType||'')+')'  :'—';
      return '<div style="background:#f8fafd;border:1px solid #ddd;border-radius:3mm;padding:4mm;margin-bottom:3mm;">'
        +'<div style="font-weight:700;color:#1E5DA1;font-size:11pt;margin-bottom:2mm;">'+(i+1)+'. '+(e.name||e.themeNom)
        +'<span style="float:right;background:#1E5DA1;color:white;padding:1mm 3mm;border-radius:2mm;font-size:9pt;">RPE '+e.rpe+' · '+e.ua+' UA</span></div>'
        +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;font-size:9.5pt;">'
        +'<div style="background:#eef4fb;padding:2.5mm;border-radius:2mm;text-align:center;"><div style="font-size:8pt;color:#666;text-transform:uppercase;margin-bottom:1mm;">Series</div><div style="font-weight:900;font-size:16pt;color:#1E5DA1;">'+e.series+'</div></div>'
        +'<div style="background:#eef4fb;padding:2.5mm;border-radius:2mm;text-align:center;"><div style="font-size:8pt;color:#666;text-transform:uppercase;margin-bottom:1mm;">/ Serie</div><div style="font-weight:900;font-size:16pt;color:#1E5DA1;">'+(e.tempsSerie>0?e.tempsSerie+'s':(e.distSerie>0?e.distSerie+'m':'—'))+'</div></div>'
        +'<div style="background:#eef4fb;padding:2.5mm;border-radius:2mm;text-align:center;"><div style="font-size:8pt;color:#666;text-transform:uppercase;margin-bottom:1mm;">Duree totale</div><div style="font-weight:900;font-size:16pt;color:#1E5DA1;">'+totalStr+'</div></div></div>'
        +'<div style="display:flex;gap:6mm;font-size:9pt;margin-top:2mm;flex-wrap:wrap;"><span>Ratio T/R : <b>'+ratio+'</b></span><span>Recup : <b>'+recupStr+'</b></span><span>'+e.longueur+'x'+e.largeur+'m · <b>'+e.surfaceParJoueur+'m2/j</b></span><span>'+e.nbJoueurs+' joueurs</span>'+(e.distanceTotale>0?'<span>'+e.distanceTotale+'m total</span>':'')+'</div>'
        +(e.notes?'<div style="background:#fff8e7;border-left:3px solid #f4b942;padding:2mm 4mm;font-size:9pt;margin-top:2mm;">'+e.notes+'</div>':'')+'</div>';
    }).join('');
    const tDuree=(s.exercises||[]).reduce((a,e)=>a+(e.duree||0),0);
    const tSer=(s.exercises||[]).reduce((a,e)=>a+(e.series||0),0);
    const html='<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Seance '+fmtD(s.date)+'</title>'
      +'<style>@page{size:A4;margin:12mm}body{font-family:Helvetica,Arial,sans-serif;color:#0A1929;font-size:10pt;margin:0}@media print{.np{display:none!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}.np{position:fixed;top:10px;right:10px;display:flex;gap:8px;z-index:999}.db{padding:10px 16px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;}</style></head><body>'
      +'<div class="np"><button class="db" style="background:#1E5DA1;color:white;" onclick="window.print()">\uD83D\uDDA8 Imprimer / PDF</button><button class="db" style="background:#22c55e;color:white;" onclick="_dl()">\u2B07\uFE0F Telecharger</button></div>'
      +'<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;background:linear-gradient(135deg,#6CACE4,#1E5DA1);color:white;padding:12mm;margin:-12mm -12mm 8mm;">'
      +'<h1 style="margin:0;font-size:20pt;font-weight:900;">UNION ROCHEFORTOISE</h1>'
      +'<div style="opacity:.9;font-size:10pt;margin-top:2mm;">Fiche de seance · '+fmtD(s.date)+'</div>'
      +'<div style="margin-top:5mm;display:flex;gap:10mm;flex-wrap:wrap;font-size:10pt;">'
      +'<span>\uD83D\uDCC5 <b>'+s.md+'</b>'+(md?' — '+md.filiere:'')+'</span>'
      +'<span>\u26A1 <b>'+s.ua+' UA</b></span><span>RPE <b>'+s.rpe+'/10</b></span>'
      +'<span>\u23F1 <b>'+tDuree+'min</b></span><span>\uD83D\uDD01 <b>'+tSer+' series</b></span>'
      +'<span>\uD83D\uDC65 <b>'+s.players+' joueurs</b></span></div></div>'
      +(s.title?'<h2 style="color:#1E5DA1;border-bottom:2px solid #6CACE4;padding-bottom:2mm;margin-bottom:6mm;">'+s.title+'</h2>':'')
      +exosHtml
      +(s.notes?'<div style="background:#f0f7fc;border-left:3px solid #1E5DA1;padding:3mm 5mm;font-size:9.5pt;margin-top:4mm;"><strong>Coaching points :</strong><br>'+s.notes+'</div>':'')
      +'<div style="margin-top:10mm;text-align:center;font-size:7.5pt;color:#aaa;">Union Rochefortoise · PrepDB v1 · '+fmtD(s.date)+'</div>'
      +'<script>function _dl(){const b=new Blob([document.documentElement.outerHTML],{type:\'text\/html;charset=utf-8\'});const u=URL.createObjectURL(b);const a=document.createElement(\'a\');a.href=u;a.download=\'seance_'+s.date.replace(/-/g,\'\')+'\'.html\';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}<\/script>'
      +'</body></html>';
    const w=window.open('','_blank');
    if(!w){alert('Autorisez les pop-ups.');return;}
    w.document.write(html);w.document.close();
  };
},600);
window.exportMonthPDF=function(month){
  const MD=window.MD_DAYS||[];
  const sessions=(window.state&&window.state.sessions||[]).filter(s=>s.date.startsWith(month)).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(!sessions.length){alert('Aucune seance ce mois.');return;}
  const dt=new Date(month+'-01');
  const cap=(dt.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})).replace(/^./, c=>c.toUpperCase());
  const fmtD=window.fmtDate||(d=>d);
  const tUA=sessions.reduce((s,x)=>s+(x.ua||0),0);
  const tMin=sessions.reduce((s,x)=>s+(x.duree||0),0);
  const tSer=sessions.reduce((s,x)=>s+(x.exercises||[]).reduce((a,e)=>a+(e.series||0),0),0);
  const seancesHtml=sessions.map(s=>{
    const md=MD.find(m=>m.code===s.md); const bg=md&&md.color||'#1E5DA1';
    const rows=(s.exercises||[]).map((e,i)=>{
      const totalSec=_totalExoSec(e);
      const ps=e.tempsSerie>0?e.tempsSerie+'s':(e.distSerie>0?e.distSerie+'m':'—');
      const ratio=e.tempsSerie>0&&e.recup>0?'1:'+(e.recup/e.tempsSerie).toFixed(1):'—';
      return '<tr><td style="padding:2mm 3mm;font-weight:600;color:#1E5DA1;">'+(i+1)+'. '+(e.name||e.themeNom)+'</td>'
        +'<td style="padding:2mm;text-align:center;font-weight:700;">'+e.series+'</td>'
        +'<td style="padding:2mm;text-align:center;font-weight:700;color:#1E5DA1;">'+ps+'</td>'
        +'<td style="padding:2mm;text-align:center;">'+(e.recup>0?e.recup+'s ':'')+(e.recupType||'')+'</td>'
        +'<td style="padding:2mm;text-align:center;">'+ratio+'</td>'
        +'<td style="padding:2mm;text-align:center;">'+(totalSec>0?_fmtSec(totalSec):e.duree+'min')+'</td>'
        +'<td style="padding:2mm;text-align:center;">RPE '+e.rpe+'</td>'
        +'<td style="padding:2mm;text-align:center;font-weight:700;color:#1E5DA1;">'+e.ua+'</td></tr>'
        +(e.notes?'<tr><td colspan="8" style="padding:1mm 3mm;font-size:8pt;color:#666;font-style:italic;">'+e.notes+'</td></tr>':'');
    }).join('');
    return '<div style="margin-bottom:8mm;page-break-inside:avoid;">'
      +'<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;background:'+bg+';color:white;padding:3mm 5mm;border-radius:2mm 2mm 0 0;display:flex;justify-content:space-between;align-items:center;">'
      +'<div style="font-size:11pt;font-weight:700;">'+fmtD(s.date)+' · '+s.md+(s.title?' — '+s.title:'')+'</div>'
      +'<div style="font-size:9pt;">RPE '+s.rpe+' · '+s.ua+' UA · '+s.duree+'min</div></div>'
      +((s.exercises||[]).length>0
        ?'<table style="width:100%;border-collapse:collapse;font-size:8.5pt;border:1px solid #ddd;border-top:none;"><thead><tr style="background:#eef4fb;">'
          +'<th style="padding:2mm 3mm;text-align:left;">Exercice</th><th style="padding:2mm;text-align:center;">Series</th>'
          +'<th style="padding:2mm;text-align:center;color:#1E5DA1;">/ Serie</th><th style="padding:2mm;text-align:center;">Recup</th>'
          +'<th style="padding:2mm;text-align:center;">Ratio</th><th style="padding:2mm;text-align:center;">Duree</th>'
          +'<th style="padding:2mm;text-align:center;">RPE</th><th style="padding:2mm;text-align:center;">UA</th></tr></thead><tbody>'+rows+'</tbody></table>'
        :'<div style="background:#f5f5f5;padding:2mm;font-size:9pt;color:#999;">Aucun exercice</div>')
      +(s.notes?'<div style="background:#fff8e7;border-left:3px solid #f4b942;padding:2mm 4mm;font-size:9pt;">'+s.notes+'</div>':'')
      +'</div>';
  }).join('');
  const html='<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>PrepDB — '+cap+'</title>'
    +'<style>@page{size:A4;margin:12mm}body{font-family:Helvetica,Arial,sans-serif;color:#0A1929;font-size:10pt;margin:0}@media print{.np{display:none!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}.np{position:fixed;top:10px;right:10px;display:flex;gap:8px}.db{padding:10px 16px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;}</style></head><body>'
    +'<div class="np"><button class="db" style="background:#1E5DA1;color:white;" onclick="window.print()">\uD83D\uDDA8 Imprimer / PDF</button><button class="db" style="background:#22c55e;color:white;" onclick="_dl()">\u2B07\uFE0F Telecharger</button></div>'
    +'<div style="-webkit-print-color-adjust:exact;print-color-adjust:exact;background:linear-gradient(135deg,#6CACE4,#1E5DA1);color:white;padding:12mm;margin:-12mm -12mm 8mm;">'
    +'<h1 style="margin:0;font-size:20pt;font-weight:900;">UNION ROCHEFORTOISE</h1>'
    +'<div>Bilan mensuel · '+cap+'</div>'
    +'<div style="margin-top:5mm;display:flex;gap:10mm;flex-wrap:wrap;font-size:10pt;">'
    +'<span>\uD83D\uDCCB <b>'+sessions.length+'</b> seances</span><span>\u26A1 <b>'+tUA+'</b> UA</span>'
    +'<span>\u23F1 <b>'+Math.floor(tMin/60)+'h'+String(tMin%60).padStart(2,'0')+'</b></span>'
    +'<span>\uD83D\uDD01 <b>'+tSer+'</b> series</span></div></div>'
    +seancesHtml
    +'<div style="margin-top:10mm;text-align:center;font-size:7.5pt;color:#aaa;">Union Rochefortoise · PrepDB v1 · '+new Date().toLocaleDateString('fr-FR')+'</div>'
    +'<script>function _dl(){const b=new Blob([document.documentElement.outerHTML],{type:\'text\/html;charset=utf-8\'});const u=URL.createObjectURL(b);const a=document.createElement(\'a\');a.href=u;a.download=\'bilan_'+month.replace('-','')+'\'.html\';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}<\/script>'
    +'</body></html>';
  const w=window.open('','_blank');
  if(!w){alert('Autorisez les pop-ups.');return;}
  w.document.write(html);w.document.close();
};
