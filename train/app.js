
const DAYS=[
['Грудь + трицепс',[['chestpress','Жим в грудном тренажёре',3,8,12,2.5,1],['incline','Жим гантелей под наклоном',2,8,12,2,2],['trirope','Разгибание рук с канатом',3,10,15,2.5,1]]],
['Спина + бицепс',[['latpulldown','Тяга верхнего блока',3,8,12,2.5,1],['cable-row','Горизонтальная тяга',2,8,12,2.5,1],['barcurl','Подъём штанги на бицепс',3,10,12,2.5,1]]],
['Ноги + грудь',[['legpress','Жим ногами',3,10,12,5,1],['rdl','Румынская тяга с гантелями',3,8,12,2,2],['butterfly','Тренажёр «Бабочка»',2,12,15,2.5,1]]],
['Грудь + трицепс',[['incline','Жим гантелей под наклоном',3,8,12,2,2],['fly','Сведение рук в тренажёре',2,12,15,2.5,1],['overheadtri','Разгибание из-за головы на блоке',3,10,15,2.5,1]]],
['Спина + бицепс',[['chestrow','Горизонтальная тяга с опорой',3,8,12,2.5,1],['close-lat','Тяга верхнего блока узким хватом',2,10,12,2.5,1],['hammer','Молотковые сгибания',3,10,12,2,2]]],
['Ноги + плечи',[['legcurl','Сгибание ног в тренажёре',3,10,15,2.5,1],['legpress','Жим ногами',3,10,12,5,1],['shoulderpress','Жим гантелей сидя',2,10,12,2,2]]],
['Кардио + пресс',[['walking','Ходьба в комфортном темпе',1,20,20,1,0],['crunch','Скручивания',2,15,15,1,0],['plank','Планка (секунды)',2,30,30,5,0]]]
];
const LEGACY_LATERAL=['lateral','Махи гантелями в стороны · архив',2,12,15,1,2];
const MAX_EXTRA_SETS=12;
const KEY='train_iphone_prototype_v1';
const empty=()=>({v:1,cycle:1,sessions:{},drafts:{},rest:null,history:[],demo:false,order:DAYS.map((_,i)=>i),soundEnabled:true});
let S;try{S={...empty(),...JSON.parse(localStorage.getItem(KEY))}}catch{S=empty()}
const validOrder=o=>Array.isArray(o)&&o.length===DAYS.length&&new Set(o).size===DAYS.length&&o.every(i=>Number.isInteger(i)&&i>=0&&i<DAYS.length);
if(!validOrder(S.order)){S.order=DAYS.map((_,i)=>i);try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}}
let view='home',day=0,timed=null;
const $=s=>document.querySelector(s);
const app=$('#app');
const fmt=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n||0);
const minfmt=ms=>{let s=Math.max(0,Math.floor(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const hdur=ms=>{let n=Math.round(ms/60000);return n>=60?Math.floor(n/60)+' ч '+n%60+' мин':n+' мин'};
const save=()=>{const snap=JSON.stringify(S);try{localStorage.setItem(KEY,snap)}catch{toast('Не удалось сохранить')}mirrorSave(snap)};

const LOCAL_DB='train_local_backup_v1';
let mirrorChain=Promise.resolve();
function snapshotDB(){return new Promise((ok,no)=>{
 if(!('indexedDB'in window))return no(new Error('No IDB'));
 const r=indexedDB.open(LOCAL_DB,1);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('data'))r.result.createObjectStore('data')};
 r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);
})}
function mirrorSave(snapshot){
 mirrorChain=mirrorChain.catch(()=>{}).then(async()=>{
  let db=await snapshotDB();
  try{await new Promise((ok,no)=>{let tx=db.transaction('data','readwrite');
   tx.objectStore('data').put(snapshot,KEY);tx.oncomplete=ok;tx.onerror=()=>no(tx.error);
  })}finally{db.close()}
 }).catch(()=>{});
}
async function restoreSnapshot(){
 let hasLocal=false;try{hasLocal=!!localStorage.getItem(KEY)}catch{}
 if(hasLocal)return;
 try{let db=await snapshotDB(),json=await new Promise((ok,no)=>{
  let req=db.transaction('data','readonly').objectStore('data').get(KEY);
  req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error)
 });db.close();if(!json)return;let z=JSON.parse(json);
 if(z.v!==1||!z.sessions||!z.history)return;
 S={...empty(),...z,rest:null};if(!validOrder(S.order))S.order=DAYS.map((_,i)=>i);
 try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}
 render();toast('Локальная история восстановлена');
 }catch{}
}
const ses=i=>S.sessions[i]||(S.sessions[i]={startAt:0,endAt:0,pausedAt:0,pausedTotal:0,done:false,logs:{},warmupStartedAt:0,warmupEndAt:0,warmupDoneAt:0,warmupAlerted:false,distanceKm:0});
const legacyExercises=i=>i===2&&Array.isArray(S.sessions[2]?.logs?.lateral)&&S.sessions[2].logs.lateral.some(Boolean)?[LEGACY_LATERAL]:[];
const activeExercises=i=>i===2&&S.sessions[2]?.done&&legacyExercises(i).length?DAYS[2][1].filter(e=>e[0]!=='butterfly'):DAYS[i][1];
const dayExercises=i=>[...activeExercises(i),...legacyExercises(i)];
const setTarget=(e,i)=>e[0]==='lateral'?Math.max(e[2],S.sessions[i]?.logs?.lateral?.length||0):e[2]+Math.max(0,Math.min(MAX_EXTRA_SETS,Math.trunc(Number(S.sessions[i]?.extraSets?.[e[0]])||0)));
const count=i=>dayExercises(i).reduce((a,e)=>a+(e[0]==='lateral'?(S.sessions[i]?.logs?.lateral||[]).filter(Boolean).length:setTarget(e,i)),0);
const findExercise=(i,id)=>dayExercises(i).find(e=>e[0]===id);
const logged=i=>Object.values(ses(i).logs).flat().filter(Boolean).length;
const finished=()=>DAYS.reduce((a,_,i)=>a+(ses(i).done?1:0),0);
const next=()=>S.order.find(i=>!ses(i).done)??-1;
const w=e=>{if(!e[6])return 0;if(S.drafts[e[0]]?.w!==undefined)return +S.drafts[e[0]].w||0;
for(let i=6;i>=0;i--){const s=S.sessions[i]?.logs[e[0]];if(s){const k=s.filter(Boolean).at(-1);if(k?.w)return k.w}}
for(const h of S.history){if(h.weights?.[e[0]])return h.weights[e[0]]}return 0};
const reps=e=>S.drafts[e[0]]?.r??e[3];
const dur=s=>!s.startAt?0:Math.max(0,(s.endAt||s.pausedAt||Date.now())-s.startAt-(s.pausedTotal||0));
/* One auditable rule for every tonnage number (session, cycle, week and history).
   e[6]: 0 = not weighted, 1 = one apparatus, 2 = two dumbbells.
   w = weight of one dumbbell when e[6] is 2. */
const setVolume=(e,l)=>{
 if(!l||!e||!(e[6]>0))return 0;
 const weight=Number(l.w),repetitions=Number(l.r),multiplier=Number(e[6]);
 if(!Number.isFinite(weight)||!Number.isFinite(repetitions)||weight<=0||repetitions<=0||
    !Number.isFinite(multiplier)||weight>1500||repetitions>500)return 0;
 return Math.round(weight*repetitions*multiplier*100)/100;
};
const loggedSets=(e,i)=>{
 const rows=S.sessions[i]?.logs?.[e[0]];
 return Array.isArray(rows)?rows.slice(0,setTarget(e,i)).filter(Boolean):[];
};
const exerciseVolume=(e,i)=>loggedSets(e,i).reduce((sum,l)=>sum+setVolume(e,l),0);
const volumeForDay=i=>dayExercises(i).reduce((sum,e)=>sum+exerciseVolume(e,i),0);
const tonne=()=>DAYS.reduce((sum,_,i)=>sum+volumeForDay(i),0);
function tonnagePanel(i){
 const volume=volumeForDay(i),rows=dayExercises(i).filter(e=>loggedSets(e,i).length);
 const breakdown=rows.map(e=>{
  const sets=loggedSets(e,i),subtotal=exerciseVolume(e,i);
  const parts=sets.map((l,k)=>{
   if(!(e[6]>0))return '<div class="tonnage-line">'+(k+1)+'-й подход: без дополнительного веса — 0 кг</div>';
   const w=Number(l.w)||0,r=Number(l.r)||0,m=e[6];
   return '<div class="tonnage-line">'+(k+1)+'-й: '+fmt(w)+' кг × '+fmt(r)+' повт.'+(m===2?' × 2 гантели':'')+' = <b>'+fmt(setVolume(e,l))+' кг</b></div>';
  }).join('');
  return '<div class="tonnage-group"><strong>'+e[1]+'</strong><span class="tonnage-subtotal">'+fmt(subtotal)+' кг</span>'+parts+'</div>';
 }).join('');
 return '<div class="panel tonnage-panel"><div class="section-inline"><b>Тоннаж этого занятия</b><span class="muted">записанные подходы</span></div><div class="tonnage-total">'+fmt(volume)+' <small>кг</small></div><details class="tonnage-details"><summary>Проверить расчёт по подходам</summary>'+(breakdown||'<div class="muted">Пока нет выполненных подходов.</div>')+'</details><div class="tiny">Вес одной гантели умножается на 2. Разминка, ходьба и упражнения без отягощения не учитываются.</div></div>';
}
const timedone=()=>DAYS.reduce((t,_,i)=>t+(ses(i).done?dur(ses(i)):0),0);
const doneSets=()=>DAYS.reduce((t,_,i)=>t+logged(i),0);
const kmTotal=()=>DAYS.reduce((t,_,i)=>t+(Number(S.sessions[i]?.distanceKm)||0),0);
function weights(){const a={};DAYS.forEach((d,i)=>dayExercises(i).forEach(e=>{if(!e[6])return;const logs=loggedSets(e,i);if(logs.length)a[e[0]]=logs.at(-1).w;}));return a}
const report=()=>({cycle:S.cycle,date:Date.now(),volume:tonne(),time:timedone(),sets:doneSets(),days:finished(),weights:weights(),order:[...S.order],distanceKm:kmTotal()});
function toast(msg){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.append(el);setTimeout(()=>el.remove(),3200)}

let audioCtx=null;
function unlockAudio(){
 if(!S.soundEnabled)return;
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!audioCtx)audioCtx=new Audio();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});}catch{}
}
function signal(){
 if(!S.soundEnabled)return;
 try{
  navigator.vibrate?.([400,120,400,120,400]);
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  if(!audioCtx)audioCtx=new Audio();
  if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
  const start=audioCtx.currentTime+.02;
  // Eight high-volume non-overlapping tones: 8 x .30 s = 2.40 s.
  // Device volume, iOS silent mode and background execution are controlled by the phone.
  for(let i=0;i<8;i++){
   const at=start+i*.30,frequency=i%2?1046:880;
   const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
   osc.type='square';osc.frequency.setValueAtTime(frequency,at);
   gain.gain.setValueAtTime(.0001,at);
   gain.gain.linearRampToValueAtTime(.85,at+.025);
   gain.gain.setValueAtTime(.85,at+.23);
   gain.gain.linearRampToValueAtTime(.0001,at+.29);
   osc.connect(gain);gain.connect(audioCtx.destination);
   osc.start(at);osc.stop(at+.295);
  }
 }catch{}
}
function warmupCountdown(i){const s=ses(i);return s.warmupEndAt?Math.max(0,s.warmupEndAt-(s.pausedAt||Date.now())):300000;}
function warmupPanel(i){
 const s=ses(i);
 if(s.done)return '';
 const finished=Boolean(s.warmupDoneAt),active=Boolean(s.warmupEndAt),expired=active&&warmupCountdown(i)===0;
 const label=finished?'Разминка выполнена':!active?'Перед тренировкой':expired?'Время вышло':'Идёт разминка';
 const button=finished?'<span class="warmup-completed">✓ Готово</span>':
   !active?'<button class="smallbtn" data-act="warmupstart" data-i="'+i+'">▶ Начать 5 мин</button>':
   '<button class="smallbtn" data-act="warmupdone" data-i="'+i+'">'+(expired?'✓ Завершить':'Готово ✓')+'</button>';
 return '<div class="warmup-panel '+(finished?'completed':'')+'"><div class="warmup-head"><div><div class="kicker">РАЗМИНКА · 5 МИН</div><strong>'+label+'</strong></div><span class="warmup-time" id="warmup-time">'+(finished?'✓':minfmt(warmupCountdown(i)))+'</span></div><div class="warmup-bottom"><span class="muted">Ходьба, мобилизация и подготовка суставов</span>'+button+'</div></div>';
}
function startWarmup(i){
 const s=ses(i);if(s.done||s.warmupDoneAt)return;
 if(!s.startAt)s.startAt=Date.now();
 if(!s.warmupEndAt){s.warmupStartedAt=Date.now();s.warmupEndAt=s.warmupStartedAt+300000;s.warmupAlerted=false;}
 save();render();
}
function finishWarmup(i){
 const s=ses(i);if(s.done)return;
 if(!s.startAt)s.startAt=Date.now();
 if(!s.warmupStartedAt)s.warmupStartedAt=Date.now();
 if(!s.warmupEndAt)s.warmupEndAt=Date.now();
 s.warmupDoneAt=Date.now();s.warmupAlerted=true;
 save();render();toast('Разминка завершена');
}
function connectionIndicator(){
 const on=navigator.onLine!==false;
 return '<span class="connection-tag '+(on?'online':'offline')+'"><span class="status-dot '+(on?'status-done':'status-idle')+'"></span>'+(on?'Сохранено на iPhone':'Офлайн · сохранено на iPhone')+'</span>';
}


/* v0.6 UI and progress analytics; data stays in existing local storage schema */
let colorTheme=localStorage.getItem('train_theme')==='light'?'light':'dark';
function applyTheme(){document.documentElement.dataset.theme=colorTheme;let meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=colorTheme==='light'?'#f4f7f8':'#0c1119';}
function toggleTheme(){colorTheme=colorTheme==='dark'?'light':'dark';try{localStorage.setItem('train_theme',colorTheme)}catch{}applyTheme();render();}
applyTheme();
function icon(type){
 const icons={
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5m0-14.2-1.5 1.5M6.4 17.6l-1.5 1.5"/>',
 moon:'<path d="M20.3 14a8.5 8.5 0 0 1-10.3-10.3A8.5 8.5 0 1 0 20.3 14z"/>',
 push:'<path d="M3 9v6m3-8v10m3-6h6m0-4v10m3-8v6m3-4v2"/>',
 pull:'<path d="M4 4h16M12 4v14m-5-5 5 5 5-5M7 7l-2 4m12-4 2 4"/>',
 legs:'<path d="M7 3l3 7-2 5-2 5m9-17-2 7 3 5 2 5M6 20h4m4 0h4"/>',
 recovery:'<path d="M20.8 8.4c0 5.1-8.8 10.9-8.8 10.9S3.2 13.5 3.2 8.4a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8z"/><path d="M4 12h4l2-3 3 6 2-3h5"/>',
 trophy:'<path d="M7 3h10v5c0 4-2 6-5 6s-5-2-5-6zM7 5H4v2c0 3 2 4 4 4m9-6h3v2c0 3-2 4-4 4m-4 3v4m-4 3h8m-8-3h8"/>',
 chart:'<path d="M3 20V5m0 15h18M6 16l5-5 4 2 5-8"/>'
 };
 return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[type]||icons.push)+'</svg>';
}
function themeToggle(){return '<button type="button" class="theme-toggle" data-act="theme" aria-label="'+(colorTheme==='dark'?'Включить светлую тему':'Включить тёмную тему')+'" title="Светлая / тёмная тема">'+icon(colorTheme==='dark'?'sun':'moon')+'</button>';}
function typeFor(i){return i===6?'recovery':i===0||i===3?'push':i===1||i===4?'pull':'legs'}
const TYPE={push:{label:'Жим',short:'PUSH'},pull:{label:'Тяга',short:'PULL'},legs:{label:'Ноги',short:'LEGS'},recovery:{label:'Восстановление',short:'REST'}};
function typeChip(i){let t=typeFor(i);return '<span class="type-chip type-'+t+'">'+icon(t)+'<span>'+TYPE[t].short+'</span></span>';}
function stateFor(i){let s=ses(i);return s.done?'done':s.startAt||logged(i)?'work':'idle';}
function loadByType(){return ['push','pull','legs','recovery'].map(t=>{let all=0,actual=0;DAYS.forEach((d,i)=>{if(typeFor(i)!==t)return;all+=count(i);actual+=logged(i)});return {t,all,actual};});}

function dailyViz(){
 const rows=S.order.map((id,pos)=>{
  const t=typeFor(id),total=count(id),actual=logged(id),pct=total?Math.min(100,Math.round(actual/total*100)):0;
  return '<div class="daily-item" title="Занятие '+(pos+1)+': '+actual+' из '+total+' подходов"><span class="daily-count">'+actual+'/'+total+'</span><div class="daily-track"><div class="daily-fill type-bg-'+t+'" style="height:'+pct+'%"></div></div><div class="daily-number">'+(pos+1)+'</div></div>';
 }).join('');
 return '<div class="panel viz-panel"><div class="section-inline"><b>Нагрузка по занятиям</b><span class="muted">подходы / план</span></div><div class="daily-bars">'+rows+'</div></div>';
}
function weeklyBestProgress(){
 const since=Date.now()-7*86400000,all=[];
 for(let i=0;i<7;i++){let s=S.sessions[i];if(!s)continue;for(let [id,sets] of Object.entries(s.logs||{})){let vals=(sets||[]).filter(Boolean);let v=vals.at(-1);if(v?.w>0&&v.time>=since)all.push({id,w:v.w,t:v.time});}}
 for(let h of S.history)for(let [id,v] of Object.entries(h.lastSets||{}))if(v.w>0&&v.time>=since)all.push({id,w:v.w,t:v.time});
 const groups={};for(let r of all)(groups[r.id]??=[]).push(r);
 let best=null;for(let [id,vals] of Object.entries(groups)){vals.sort((a,b)=>a.t-b.t);if(vals.length<2||!vals[0].w)continue;const pct=(vals.at(-1).w/vals[0].w-1)*100;if(pct>0&&(!best||pct>best.pct))best={id,pct};}
 if(!best)return null;let names={};DAYS.forEach(d=>d[1].forEach(e=>names[e[0]]=e[1]));return {pct:Math.round(best.pct*10)/10,name:names[best.id]||best.id};
}
function loadViz(){return '<div class="panel viz-panel"><div class="section-inline"><b>Нагрузка по типам</b><span class="muted">выполнено / план</span></div>'+loadByType().map(({t,all,actual})=>'<div class="load-row"><div class="load-label">'+icon(t)+'<span>'+TYPE[t].label+'</span></div><div class="load-track"><div class="load-fill type-bg-'+t+'" style="width:'+(all?Math.min(100,actual/all*100):0)+'%"></div></div><span class="load-value">'+actual+'/'+all+'</span></div>').join('')+'<div class="tiny">По числу рабочих подходов, без условных процентов нагрузки.</div></div>';}
function observations(id){
 const points=[];
 for(const h of [...S.history].reverse()){let e=h.lastSets?.[id],w=Number(e?.w??h.weights?.[id]);if(Number.isFinite(w)&&w>0)points.push({w,r:e?.r||null,t:h.date||0,cycle:h.cycle});}
 DAYS.forEach((d,i)=>{if(!d[1].some(x=>x[0]===id))return;let sets=(S.sessions[i]?.logs?.[id]||[]).filter(Boolean);if(sets.length){let last=sets[sets.length-1];if(last.w>0)points.push({w:last.w,r:last.r,t:last.time||S.sessions[i]?.endAt||0,cycle:S.cycle,day:i})}});
 return points.sort((a,b)=>a.t-b.t);
}
function bestWeights(){let best={};for(let h of S.history){let data=h.maxWeights||h.weights||{};for(let [id,w] of Object.entries(data))if(w>0)best[id]=Math.max(best[id]||0,w);}
 DAYS.forEach((d,i)=>dayExercises(i).forEach(e=>{if(!e[6])return;for(let a of loggedSets(e,i))if(a.w>0)best[e[0]]=Math.max(best[e[0]]||0,a.w)}));
 return best;
}
function previousExerciseResult(id,excludeDay=null){
 const found=[];
 for(let i=0;i<DAYS.length;i++){
  if(i===excludeDay)continue;
  const session=S.sessions[i],sets=(session?.logs?.[id]||[]).filter(Boolean);
  if(!sets.length)continue;
  const when=sets.at(-1)?.time||session.endAt||session.startAt||0;
  found.push({sets:sets.map(x=>({...x})),when,day:i,source:'cycle',distanceKm:id==='walking'?Number(session.distanceKm)||0:0});
 }
 for(const h of S.history){
  let full=h.exerciseResults?.[id];
  if(full?.sets?.length){
   found.push({sets:full.sets.filter(Boolean).map(x=>({...x})),when:full.when||h.date||0,day:full.day,source:'history',distanceKm:Number(full.distanceKm)||0});
   continue;
  }
  const single=h.lastSets?.[id],legacyWeight=h.weights?.[id];
  if(single||legacyWeight){
   found.push({sets:[single?{...single}:{w:legacyWeight,r:null,time:h.date||0}],when:single?.time||h.date||0,source:'history',partial:true,day:null});
  }
 }
 if(!found.length)return null;
 found.sort((a,b)=>b.when-a.when);
 return found[0];
}
function lastSetOf(id,withoutDay=null){
 const p=previousExerciseResult(id,withoutDay);
 return p?.sets.at(-1)||null;
}
function previousExerciseCard(e,i){
 const p=previousExerciseResult(e[0],i);
 if(!p)return '<div class="prev-exercise empty"><span class="prev-caption">ПРОШЛЫЙ РЕЗУЛЬТАТ</span><span class="prev-muted">Первой записи пока нет</span></div>';
 const unit=e[0]==='walking'?'мин':e[0]==='plank'?'сек':'повт.';
 const values=p.sets.map((set,k)=>{
  const num=Number(set.r);const repetition=Number.isFinite(num)&&num>0?fmt(num)+' '+unit:'повторы не сохранены';
  const weight=e[6]>0&&Number(set.w)>0?fmt(set.w)+' кг × ':'';
  return '<span class="previous-set">'+(k+1)+'. '+weight+repetition+'</span>';
 }).join('');
 const date=p.when?new Date(p.when).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'}):'без даты';
 const km=e[0]==='walking'&&p.distanceKm?'<span class="previous-distance">'+fmt(p.distanceKm)+' км</span>':'';
 return '<div class="prev-exercise"><div class="prev-head"><span class="prev-caption">ПРОШЛЫЙ РЕЗУЛЬТАТ</span><span class="prev-date">'+date+'</span></div><div class="previous-sets">'+values+km+'</div>'+(p.partial?'<div class="prev-muted">Для старых циклов сохранён последний подход</div>':'')+'</div>';
}
function progressFor(id,i){const current=(S.sessions[i]?.logs?.[id]||[]).filter(Boolean).at(-1);const before=lastSetOf(id,i);if(!current||!before||!current.w||!before.w)return null;return Math.round((current.w/before.w-1)*1000)/10;}
function progressBadge(id,i){
 let p=progressFor(id,i);
 if(p===null)return '';
 let cls=p>0?'up':p<0?'down':'flat';
 return '<span class="trend '+cls+'">'+(p>0?'↗ +':p<0?'↘ ':'→ ')+fmt(p)+'%</span>';
}
function plot(points){
 if(!points.length)return '<div class="chart-empty">Пока нет данных. График появится после записи подходов.</div>';
 const values=points.slice(-10),min=Math.min(...values.map(p=>p.w)),max=Math.max(...values.map(p=>p.w));
 const coords=values.map((p,j)=>{let x=15+(values.length===1?130:j*260/(values.length-1));let y=79-(max===min?33:(p.w-min)/(max-min)*58);return {x,y,w:p.w}});
 const path=coords.map((p,j)=>(j?'L':'M')+' '+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
 const dots=coords.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="var(--accent)"><title>'+fmt(p.w)+' кг</title></circle>').join('');
 return '<svg class="weight-chart" viewBox="0 0 290 98" role="img" aria-label="График рабочего веса"><line x1="10" y1="45" x2="280" y2="45" stroke="var(--line)"/><line x1="10" y1="80" x2="280" y2="80" stroke="var(--line)"/><path d="'+path+'" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';
}
function chartSection(){
 let ex=[['incline','Жим гантелей'],['latpulldown','Верхний блок'],['legpress','Жим ногами']];
 let selected=S.chartExercise||ex.find(([id])=>observations(id).length)?.[0]||'incline';if(!ex.some(([id])=>id===selected))selected='incline';
 const points=observations(selected),first=points[0],last=points.at(-1),pct=first&&last&&points.length>1?Math.round((last.w/first.w-1)*1000)/10:null;
 return '<div class="panel viz-panel"><div class="section-inline"><b>Рабочий вес</b><span class="muted">по занятиям</span></div><div class="chart-tabs">'+ex.map(([id,name])=>'<button class="chart-tab '+(selected===id?'selected':'')+'" data-act="chart" data-e="'+id+'">'+name+'</button>').join('')+'</div><div class="chart-flex">'+plot(points)+'<div class="chart-side">'+(last?'<strong>'+fmt(last.w)+' кг</strong><span class="muted">'+(pct===null?'Первый результат':(pct>0?'+':'')+fmt(pct)+'%')+'</span>':'<span class="muted">Нет данных</span>')+'</div></div><div class="tiny">Вес последнего записанного подхода. Отображается только фактическая история.</div></div>';
}
function recordsSection(){
 let best=bestWeights(),items=Object.entries(best).filter(([id])=>Object.values(DAYS).some(d=>d[1].some(x=>x[0]===id)));
 items.sort((a,b)=>b[1]-a[1]);
 const names={};DAYS.forEach(d=>d[1].forEach(e=>names[e[0]]||=e[1]));
 return '<div class="panel viz-panel"><div class="section-inline"><b>'+icon('trophy')+' Лучшие рабочие веса</b><span class="muted">сохранённая история</span></div>'+(items.length?items.slice(0,4).map(([id,w])=>'<div class="record-row"><span>'+names[id]+'</span><b>'+fmt(w)+' кг</b></div>').join(''):'<div class="muted">Появятся после первых подходов.</div>')+'</div>';
}
function rollingWeek(){
 let since=Date.now()-7*86400000,days=0,volume=0,minutes=0,sets=0,kilometers=0;
 const sessions=[];
 for(let i=0;i<7;i++)if(S.sessions[i]?.done&&S.sessions[i].endAt>=since)sessions.push({s:S.sessions[i],i});
 for(let h of S.history)for(let sesrow of (h.sessionStats||[]))if(sesrow.endAt>=since)sessions.push({archive:sesrow});
 for(let x of sessions){
 days++;if(x.archive){volume+=x.archive.volume||0;minutes+=x.archive.time||0;sets+=x.archive.sets||0;kilometers+=x.archive.distanceKm||0;}
 else{let i=x.i,s=x.s;minutes+=dur(s);sets+=logged(i);kilometers+=Number(s.distanceKm)||0;volume+=volumeForDay(i)}
 }
 return {days,volume,minutes,sets,kilometers};
}
function weekSection(){
 let a=rollingWeek(),best=weeklyBestProgress();
 return '<div class="panel viz-panel"><div class="section-inline"><b>Последние 7 дней</b><span class="muted">скользящая неделя</span></div><div class="week-grid"><div><strong>'+a.days+'/7</strong><small>тренировки</small></div><div><strong>'+fmt(a.volume)+'</strong><small>кг тоннаж</small></div><div><strong>'+hdur(a.minutes)+'</strong><small>время</small></div></div>'+(a.kilometers?'<div class="distance-week">Ходьба: <b>'+fmt(a.kilometers)+' км</b></div>':'')+'<div class="week-footer"><span>План на неделю: <b>'+Math.round(a.days/7*100)+'%</b></span><span>'+(best?'<b>↗ +'+fmt(best.pct)+'%</b> · '+best.name:'Прогресс: пока нет сравнения')+'</span></div><div class="tiny">Учитываются завершённые тренировки с доступными датами. Нагрузка — по записанным подходам.</div></div>';
}
function dayStatsForHistory(){
 return DAYS.map((d,i)=>{let s=ses(i);return {id:i,endAt:s.endAt||0,time:s.done?dur(s):0,sets:logged(i),distanceKm:Number(s.distanceKm)||0,volume:volumeForDay(i)}});
}
function historyExtras(){
 let maxWeights={},lastSets={},exerciseResults={};
 DAYS.forEach((d,i)=>dayExercises(i).forEach(e=>{
  const id=e[0],session=ses(i),sets=loggedSets(e,i);
  if(!sets.length)return;
  if(e[6]){maxWeights[id]=Math.max(maxWeights[id]||0,...sets.map(v=>v.w));const latest=sets.at(-1);if(!lastSets[id]||(latest.time||0)>(lastSets[id].time||0))lastSets[id]=latest;}
  const when=sets.at(-1)?.time||session.endAt||session.startAt||0;
  if(!exerciseResults[id]||when>exerciseResults[id].when)exerciseResults[id]={
   sets:sets.map(v=>({...v})),day:i,when,distanceKm:id==='walking'?Number(session.distanceKm)||0:0
  };
 }));
 return {maxWeights,lastSets,exerciseResults,sessionStats:dayStatsForHistory()};
}
function nav(){return '<nav class="tabbar"><button data-act="home" class="'+(view==='home'?'sel':'')+'"><b>▦</b>Цикл</button><button data-act="report" class="'+(view==='report'?'sel':'')+'"><b>▤</b>Отчёт</button><button data-act="settings" class="'+(view==='settings'?'sel':'')+'"><b>⚙</b>Настройки</button></nav>'}

function home(){
 const f=finished(),n=next(),planned=DAYS.reduce((x,_,i)=>x+count(i),0);
 const total=doneSets(),completedPct=Math.round(f/7*100);
 const tabs=S.order.map((id,p)=>'<button class="daytile '+(ses(id).done?'done':id===n?'active':'')+'" data-act="day" data-i="'+id+'">'+(ses(id).done?'✓':p+1)+'<small>Д'+(p+1)+'</small></button>').join('');
 const cards=S.order.map((id,p)=>{
  const d=DAYS[id],state=stateFor(id),number=String(p+1).padStart(2,'0'),counted=logged(id),total=count(id);
  const subtitle=(state==='done'?'Завершено · '+counted+' подходов':state==='work'?'Выполнено '+counted+' из '+total+' подходов':d[1].length+' упражнения · '+total+' подходов')+(volumeForDay(id)?' · '+fmt(volumeForDay(id))+' кг тоннаж':'');
  return '<div class="card workout-row '+(state==='done'?'done':id===n?'active':'')+'" data-workout="'+id+'"><button class="card-main" data-act="day" data-i="'+id+'"><span class="num">'+(state==='done'?'✓':number)+'</span><span class="grow"><span class="workout-title"><span class="workout-title-text">'+d[0]+'</span>'+typeChip(id)+'</span><span class="card-status"><span class="status-dot status-'+state+'"></span><span>'+(state==='done'?'Готово':state==='work'?'В процессе':'Не начато')+'</span></span><p>'+subtitle+'</p></span><span class="chev">›</span></button><button class="draghandle" data-i="'+id+'" aria-label="Переместить занятие '+(p+1)+'. Перетаскивай или используй стрелки клавиатуры" title="Перетащить занятие">⠿</button></div>';
 }).join('');
 const main='<main class="page"><div class="top"><div><div class="kicker">ТРЕНИРОВКИ / TRAIN</div><div class="muted">30 минут · 7 занятий · рост мышц</div></div><div class="top-controls">'+themeToggle()+'<button class="smallbtn" data-act="settings" aria-label="Настройки">⚙</button></div></div>'+
 '<div class="kicker">'+(S.demo?'ДЕМОНСТРАЦИЯ':'ПРОГРЕСС ЦИКЛА')+'</div><div class="h1">Цикл № '+S.cycle+'</div><div class="muted">Занятия не привязаны к календарным датам</div>'+connectionIndicator()+
 '<div class="panel hero"><div class="hero-progress"><div class="ring" style="--percentage:'+completedPct+'"><div><strong>'+f+'/7</strong><span>занятий</span></div></div><div class="hero-summary"><div class="kicker">Завершено</div><strong>'+completedPct+'%</strong><span class="muted">'+total+' / '+planned+' подходов</span><div class="bar"><i style="width:'+(planned?total/planned*100:0)+'%"></i></div></div></div></div>'+
 '<div class="statgrid"><div class="stat"><div class="bigstat">'+fmt(tonne())+'</div><div class="label">Тоннаж цикла, кг</div></div><div class="stat"><div class="bigstat">'+doneSets()+'</div><div class="label">Подходов</div></div><div class="stat"><div class="bigstat">'+hdur(timedone())+'</div><div class="label">Времени</div></div></div>'+
 '<div class="daystrip">'+tabs+'</div><div class="section">Семь занятий</div><div class="muted drag-instruction">Изменить порядок — потяни карточку за ⠿</div><div class="workout-list">'+cards+'</div>'+
 (f===7?'<button class="btn" data-act="report">Посмотреть отчёт →</button>':'<button class="btn" data-act="day" data-i="'+n+'">Открыть занятие '+(S.order.indexOf(n)+1)+' →</button>')+
 '<div class="section">Аналитика</div>'+dailyViz()+loadViz()+chartSection()+weekSection()+recordsSection()+
 '<div class="note">Порядок занятий и тема сохраняются на iPhone. Графики учитывают только записанные результаты.</div></main>';
 return main;
}

function moveWorkout(fromId,toId){
 const from=S.order.indexOf(fromId),to=S.order.indexOf(toId);
 if(from<0||to<0||from===to)return false;
 S.order.splice(from,1);S.order.splice(to,0,fromId);save();toast('Порядок занятий сохранён');return true;
}
function clearDrag(commit){
 if(!drag)return;
 const d=drag;drag=null;
 d.ghost.remove();
 document.querySelectorAll('.workout-row').forEach(el=>el.classList.remove('drop-target','dragging'));
 if(commit&&moveWorkout(d.fromId,d.toId))render();
}
let drag=null;
app.addEventListener('pointerdown',e=>{
const handle=e.target.closest('.draghandle');
if(!handle||view!=='home'||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;
e.preventDefault();
const card=handle.closest('.workout-row'),id=Number(handle.dataset.i),rect=card.getBoundingClientRect();
const ghost=document.createElement('div');ghost.className='dragghost';ghost.textContent=DAYS[id][0];ghost.style.width=Math.min(rect.width-20,350)+'px';document.body.appendChild(ghost);
const offsetY=e.clientY-rect.top;
drag={pointerId:e.pointerId,fromId:id,toId:id,ghost,offsetY};
card.classList.add('dragging');
ghost.style.left=Math.max(10,Math.min(innerWidth-ghost.offsetWidth-10,rect.left+10))+'px';
ghost.style.top=(e.clientY-offsetY)+'px';
try{handle.setPointerCapture(e.pointerId)}catch{}
});
app.addEventListener('pointermove',e=>{
if(!drag||e.pointerId!==drag.pointerId)return;
e.preventDefault();
drag.ghost.style.top=Math.max(7,Math.min(innerHeight-55,e.clientY-drag.offsetY))+'px';
const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.workout-row');
if(target){drag.toId=Number(target.dataset.workout);document.querySelectorAll('.workout-row').forEach(el=>el.classList.toggle('drop-target',el===target&&drag.toId!==drag.fromId));}
if(e.clientY<78)window.scrollBy(0,-10);else if(e.clientY>innerHeight-95)window.scrollBy(0,10);
});
app.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.pointerId)clearDrag(true)});
app.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.pointerId)clearDrag(false)});
app.addEventListener('keydown',e=>{
const h=e.target.closest('.draghandle');if(!h||view!=='home'||!['ArrowUp','ArrowDown'].includes(e.key))return;
e.preventDefault();const id=Number(h.dataset.i),p=S.order.indexOf(id),to=p+(e.key==='ArrowUp'?-1:1);
if(to>=0&&to<S.order.length&&moveWorkout(id,S.order[to])){render();app.querySelector('.draghandle[data-i="'+id+'"]')?.focus();}
});

function timeForecast(i){
 const rem=Math.max(0,count(i)-logged(i));
 if(!rem)return 0;
 const session=ses(i),warmupLeft=session.warmupDoneAt?0:session.warmupEndAt?warmupCountdown(i)/60000:5;return Math.max(1,Math.round(rem*2.25+warmupLeft));
}
function exercise(e,i,idx){
 const s=ses(i),id=e[0],archive=id==='lateral',logs=s.logs[id]||[],done=logs.filter(Boolean).length,target=setTarget(e,i),ok=done>=target,isweight=e[6]>0;
 const prev=archive?null:lastSetOf(id,i),best=bestWeights()[id],trend=archive?'':progressBadge(id,i);
 const head='<div class="exercise-top"><div><div class="kicker">'+(archive?'АРХИВ · СОХРАНЁННОЕ УПРАЖНЕНИЕ':'УПРАЖНЕНИЕ '+(idx+1))+'</div><div class="extitle" style="margin-top:5px">'+e[1]+'</div><div class="exmeta">'+target+' × '+e[3]+(e[3]===e[4]?'':'–'+e[4])+(id==='walking'?' мин':id==='plank'?' сек':' повт.')+'</div></div><div class="exercise-marks">'+trend+(best?'<span class="record-badge">'+icon('trophy')+fmt(best)+' кг</span>':'')+'</div></div>';
 if(archive){
  const items=logs.filter(Boolean).map((l,k)=>'<div class="set done"><div><b>'+(k+1)+'-й подход ✓</b><div class="tiny">'+fmt(l.w)+' кг × '+fmt(l.r)+' повт. × 2 гантели = '+fmt(setVolume(e,l))+' кг</div></div></div>').join('');
  return '<div class="exercise archived-exercise">'+head+'<div class="muted">Результаты сохранены из старой программы. В новых тренировках вместо махов — тренажёр «Бабочка».</div>'+items+'</div>';
 }
 let ctrl=isweight?'<div class="control"><span class="muted">Вес '+(e[6]===2?'гантели':'снаряда')+'</span><div class="counter"><button data-act="w-" data-i="'+i+'" data-e="'+id+'" '+(ok||s.done?'disabled':'')+'>−</button><input data-input="w" data-e="'+id+'" type="number" inputmode="decimal" min="0" step="0.5" value="'+w(e)+'" '+(ok||s.done?'disabled':'')+'><button data-act="w+" data-i="'+i+'" data-e="'+id+'" '+(ok||s.done?'disabled':'')+'>+</button></div></div>':'';
 if(!ok&&!s.done){
  ctrl+='<div class="control"><span class="muted">'+(id==='walking'?'Минуты':id==='plank'?'Секунды':'Повторы')+'</span><div class="counter"><button data-act="r-" data-i="'+i+'" data-e="'+id+'">−</button><b>'+reps(e)+'</b><button data-act="r+" data-i="'+i+'" data-e="'+id+'">+</button></div></div>';
  if(isweight&&prev)ctrl+='<button class="copy-previous" data-act="previous" data-i="'+i+'" data-e="'+id+'">⎘ Как в прошлый раз: '+fmt(prev.w)+' кг'+(prev.r?' × '+prev.r:'')+'</button>';
 }
 if(id==='walking')ctrl+='<div class="distance-field"><label for="km-'+i+'">Пройдено километров</label><div class="distance-input"><input id="km-'+i+'" data-input="distance" data-i="'+i+'" type="number" inputmode="decimal" min="0" step="0.1" placeholder="Например, 2.5" value="'+(Number(s.distanceKm)||'')+'"><span>км</span></div></div>';
 const rows=Array.from({length:target},(_,k)=>{
  const l=logs[k],isnext=k===done;
  const buttons=l?'<button class="smallbtn" data-act="undo" data-i="'+i+'" data-e="'+id+'" data-set="'+k+'" '+(s.done?'disabled':'')+'>↶</button>':isnext&&!s.done?(id==='walking'||(count(i)-logged(i)===1)?'<button class="smallbtn" data-act="mark" data-i="'+i+'" data-e="'+id+'" data-rest="0">Готово ✓</button>':'<div class="times">'+[1,2,3].map(x=>'<button data-act="mark" data-i="'+i+'" data-e="'+id+'" data-rest="'+x+'">'+x+' м</button>').join('')+'</div>'):'';
  return '<div class="set '+(l?'done':'')+'"><div><div style="font-size:13px;font-weight:750">'+(k+1)+'-й подход '+(l?'✓':'')+'</div><div class="tiny" style="margin-top:3px">'+(l?l.r+' '+(id==='walking'?'мин':id==='plank'?'сек':'повт.')+(isweight?' · '+fmt(l.w)+' кг':''):isnext?'Следующий':'Не выполнен')+'</div></div>'+buttons+'</div>';
 }).join('');
 const added=target-e[2];
 const setControls=!s.done?'<div class="sets-controls"><span class="muted">План: '+target+' подходов'+(added?' (+'+added+')':'')+'</span><div><button class="smallbtn" data-act="removeset" data-i="'+i+'" data-e="'+id+'" '+(!added||done>=target?'disabled':'')+' aria-label="Убрать лишний подход">−</button><button class="smallbtn" data-act="addset" data-i="'+i+'" data-e="'+id+'" '+(added>=MAX_EXTRA_SETS?'disabled':'')+'>+ Подход</button></div></div>':'';
 return '<div class="exercise '+(ok?'done':'')+'">'+head+previousExerciseCard(e,i)+ctrl+rows+setControls+'</div>';
}
function stickyTimer(i){
 const session=ses(i),rest=S.rest?.i===i?S.rest:null;
 if(session.done||!session.startAt)return '';
 const warming=session.warmupEndAt&&!session.warmupDoneAt;
 const primary=rest?'<span class="sticky-timer-main" id="sticky-rest-time">'+minfmt(rest.end-Date.now())+'</span><span class="sticky-timer-label">Отдых</span>':
  warming?'<span class="sticky-timer-main" id="sticky-warmup-time">'+minfmt(warmupCountdown(i))+'</span><span class="sticky-timer-label">Разминка</span>':
  '<span class="sticky-timer-main" id="sticky-session-time">'+minfmt(dur(session))+'</span><span class="sticky-timer-label">Тренировка</span>';
 return '<div class="sticky-timer" role="timer" aria-label="Время текущего этапа"><span class="sticky-timer-dot"></span><div>'+primary+'</div><span class="sticky-timer-state">'+(session.pausedAt?'Пауза':'Таймер запущен')+'</span></div>';
}
function training(i){
 const d=DAYS[i],s=ses(i),done=logged(i),all=count(i),rest=S.rest?.i===i?S.rest:null;
 const forecast='<div class="remaining"><span>Осталось <b>'+(all-done)+'</b> подходов</span><span>≈ '+timeForecast(i)+' мин</span></div>';
 const rt=rest?'<div class="rest"><div class="kicker">ОТДЫХ</div><div style="display:flex;align-items:center;justify-content:space-between"><div class="timer" id="rest-time">'+minfmt(rest.end-Date.now())+'</div><button class="smallbtn" data-act="skip"> '+(rest.end<=Date.now()?'Понятно':'Пропустить')+' </button></div><div class="muted">Сигнал при заблокированном экране пока недоступен — требуется Web Push.</div></div>':'';
 return '<main class="page workout-page"><div class="top"><button class="smallbtn" data-act="home">‹ Назад</button><div class="top-controls">'+typeChip(i)+themeToggle()+'</div></div>'+stickyTimer(i)+'<div class="h1">'+d[0]+'</div><div class="muted">Занятие '+(S.order.indexOf(i)+1)+' из 7</div><div class="bar"><i style="width:'+(done/all*100)+'%"></i></div>'+forecast+
 tonnagePanel(i)+'<div class="clockbox"><div><div class="tiny">Время тренировки</div><div class="timer" id="session-time">'+minfmt(dur(s))+'</div></div>'+(s.done?'<b>Готово ✓</b>':!s.startAt?'<button class="smallbtn" data-act="start" data-i="'+i+'">▶ Начать</button>':s.pausedAt?'<button class="smallbtn" data-act="resume" data-i="'+i+'">▶ Продолжить</button>':'<button class="smallbtn" data-act="pause" data-i="'+i+'">Ⅱ Пауза</button>')+'</div>'+warmupPanel(i)+rt+
 dayExercises(i).map((e,j)=>exercise(e,i,j)).join('')+
 (s.done?'<div class="panel">Завершено за '+hdur(dur(s))+'<button class="btn secondary" data-act="home">На главную</button></div>':'<button class="btn" data-act="finish" data-i="'+i+'" '+(!done?'disabled':'')+'>Завершить тренировку ✓</button>')+
 '<div class="note">«≈ мин» — ориентировочное оставшееся время, не норматив. Для гантелей указан вес одной гантели; в тоннаже учитываются обе.</div></main>';
}


function archivedLateralHistory(){
 const cycles=S.history.filter(h=>h?.exerciseResults?.lateral?.sets?.length||h?.lastSets?.lateral||h?.weights?.lateral);
 if(!cycles.length)return '';
 return '<div class="section">Архив: махи гантелями в стороны</div>'+cycles.map(h=>{
  const sets=h.exerciseResults?.lateral?.sets||[h.lastSets?.lateral].filter(Boolean);
  const rows=sets.length?sets.map((l,k)=>'<div class="tonnage-line">'+(k+1)+'. '+fmt(l.w)+' кг'+(l.r?' × '+fmt(l.r)+' повт. × 2 = '+fmt(setVolume(LEGACY_LATERAL,l))+' кг':' · повторения не сохранены')+'</div>').join(''):
   '<div class="tonnage-line">Последний рабочий вес: '+fmt(h.weights?.lateral)+' кг (одна гантель)</div>';
  return '<div class="panel"><b>Цикл № '+h.cycle+'</b><div class="muted">Сохранено до замены на «Бабочку»</div>'+rows+'</div>';
 }).join('');
}
function review(){
 const cur=report(),prev=S.history[0],obs={};
 DAYS.forEach((d,i)=>d[1].forEach(e=>{if(!e[6])return;let logs=(ses(i).logs[e[0]]||[]).filter(Boolean);if(logs.length)(obs[e[0]]??=[]).push({name:e[1],w:logs.at(-1).w,time:logs.at(-1).time||0});}));
 const changes=Object.entries(obs).flatMap(([id,vals])=>{
  vals.sort((a,b)=>a.time-b.time);
  const from=prev?.weights?.[id]||vals[0].w,to=vals.at(-1).w;
  return from>0&&(prev||vals.length>1)?[{name:vals[0].name,from,to,pct:Math.round((to/from-1)*1000)/10}]:[];
 });
 const summary='<div class="reportgrid"><div class="reportmetric"><b>'+fmt(cur.volume)+'</b><span>Всего поднято, кг</span></div><div class="reportmetric"><b>'+hdur(cur.time)+'</b><span>Время занятий</span></div><div class="reportmetric"><b>'+cur.sets+'</b><span>Подходов</span></div><div class="reportmetric"><b>'+(cur.days?Math.round(cur.time/60000/cur.days):0)+' мин</b><span>Среднее время</span></div></div>'+(cur.distanceKm?'<div class="panel"><b>Ходьба: '+fmt(cur.distanceKm)+' км</b><div class="muted">Расстояние введено вручную</div></div>':'');
 const changeTable=changes.length?'<div class="panel"><table>'+changes.map(c=>'<tr><td>'+c.name+'</td><td>'+fmt(c.from)+' → '+fmt(c.to)+'</td><td class="'+(c.pct>0?'positive':'')+'">'+(c.pct>0?'+':'')+fmt(c.pct)+'%</td></tr>').join('')+'</table></div>':'<div class="note">Сравнение появится после повторной тренировки этого упражнения или со следующего цикла.</div>';
 return '<main class="page"><div class="top"><button class="smallbtn" data-act="home">‹ Цикл</button>'+themeToggle()+'</div><div class="kicker">ОТЧЁТ ПО ТРЕНИРОВКАМ</div><div class="h1">Цикл № '+S.cycle+'</div><div class="muted">'+cur.days+' из 7 занятий завершено</div>'+summary+
 '<div class="section">Тоннаж по занятиям</div><div class="panel tonnage-report">'+S.order.filter(i=>logged(i)).map(i=>'<div class="tonnage-report-row"><span>'+DAYS[i][0]+' <small>№ '+(S.order.indexOf(i)+1)+'</small></span><b>'+fmt(volumeForDay(i))+' кг</b></div>').join('')+'<div class="tonnage-report-row total"><span>Всего за цикл</span><b>'+fmt(cur.volume)+' кг</b></div></div><div class="section">Изменение рабочих весов</div>'+changeTable+chartSection()+recordsSection()+weekSection()+loadViz()+
 '<div class="note">Тоннаж = сумма (вес × повторы). Кардио и упражнения с собственным весом учитываются отдельно. Изменение рабочих весов не равно измерению мышечной массы.</div>'+
 (cur.days===7?'<button class="btn" data-act="newcycle">Начать следующий цикл →</button>':'<button class="btn secondary" data-act="home">Продолжить тренировки</button>')+
 archivedLateralHistory()+
 (S.history.length?'<div class="section">Предыдущие циклы</div>'+S.history.map(h=>'<div class="panel">Цикл № '+h.cycle+' · '+fmt(h.volume)+' кг · '+hdur(h.time)+'</div>').join(''):'')+'</main>';
}


const APP_VERSION='1.1';
function firstWorkoutSummary(){
 const session=S.sessions[0],logs=session?.logs||{};
 const countSaved=DAYS[0][1].reduce((total,e)=>total+(Array.isArray(logs[e[0]])?logs[e[0]].filter(x=>x&&x.r!=null).length:0),0);
 return {count:countSaved,done:Boolean(session?.done),total:count(0)};
}
function restoreFirstWorkoutFromBackup(source){
 const entry=source?.sessions?.['0']||source?.sessions?.[0];
 if(!source||source.v!==1||!entry||!entry.logs||typeof entry.logs!=='object')throw Error('Не найден журнал первой тренировки');
 const restored={};let copied=0;
 for(const e of DAYS[0][1]){
  const rows=entry.logs[e[0]];
  if(!Array.isArray(rows))continue;
  const valid=rows.slice(0,e[2]).map(x=>{
   if(!x)return null;
   const w=Number(x.w),r=Number(x.r);
   if(!Number.isFinite(w)||w<=0||w>1500||!Number.isFinite(r)||r<=0||r>500)return null;
   copied++;return {w,r,time:Number(x.time)||Date.now()};
  });
  if(valid.some(Boolean))restored[e[0]]=valid;
 }
 if(!copied)throw Error('В файле нет записанных подходов первой тренировки');
 const current=firstWorkoutSummary();
 if(current.count&&!confirm('В текущей первой тренировке есть '+current.count+' подходов. Заменить только её данные из файла?'))return false;
 const before=S.sessions[0]||{startAt:0,endAt:0,pausedAt:0,pausedTotal:0,done:false,logs:{}};
 S.sessions[0]={...before,...entry,logs:restored,
  startAt:Number(entry.startAt)||0,endAt:Number(entry.endAt)||0,
  pausedAt:0,pausedTotal:Number(entry.pausedTotal)||0,done:entry.done===true
 };
 if(S.rest?.i===0)S.rest=null;
 save();view='home';render();toast('Перенесено '+copied+' подходов первой тренировки');return true;
}
function restoreFirstWorkoutFile(){
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.onchange=async()=>{try{
   if(!input.files?.length)return;
   const text=await input.files[0].text();
   restoreFirstWorkoutFromBackup(JSON.parse(text));
 }catch(e){toast(e?.message||'Не удалось открыть файл сохранения')}};
 input.click();
}
function checkAppUpdate(){
 if(navigator.onLine===false){toast('Для обновления включи интернет. Записи останутся на телефоне.');return;}
 location.assign('./refresh.html');
}

function settings(){let standalone=matchMedia('(display-mode:standalone)').matches||navigator.standalone;
return '<main class="page"><div class="top"><button class="smallbtn" data-act="home">‹ Цикл</button><div class="top-controls"><div class="kicker">НАСТРОЙКИ</div>'+themeToggle()+'</div></div><div class="h1">Приложение</div><div class="panel"><b>Обновление приложения</b><p class="muted">Версия 1.1. Дополнительные подходы, закреплённый таймер, новая «Бабочка»; результаты не удаляются.</p><button class="btn secondary" data-act="updateapp">Проверить обновление</button></div><div class="panel"><b>Первая тренировка</b><p class="muted">Проверь результаты первого занятия или перенеси из резервной копии старой версии, не затрагивая другие дни.</p><div class="two"><button class="smallbtn" data-act="checkfirst">Проверить</button><button class="smallbtn" data-act="importfirst">Из JSON</button></div></div><div class="panel"><b>Тема оформления</b><p class="muted">Нажми на солнце или луну в верхнем углу. Выбранная тема сохранится на iPhone.</p><div class="install">Сейчас: '+(colorTheme==='dark'?'тёмная':'светлая')+' тема</div></div><div class="panel"><b>Установка на iPhone</b><p class="muted">Открой в Safari → Поделиться → На экран Домой. Затем запускай приложение по иконке.</p><div class="install">'+(standalone?'Приложение открыто с главного экрана.':'Открой это приложение через иконку на рабочем столе iPhone.')+'</div></div><div class="panel"><b>Звуковой сигнал</b><p class="muted">Звуковой сигнал по завершении 5-минутной разминки, отдыха и занятия — когда приложение открыто.</p><button class="btn secondary" data-act="soundtoggle">Звук: '+(S.soundEnabled?'Включён':'Выключен')+'</button><button class="btn secondary" data-act="soundtest">Проверить сигнал</button></div><div class="panel"><b>Офлайн-режим и сохранение</b><p class="muted">Приложение открывается без интернета после первой загрузки. Результаты сразу записываются на iPhone и дублируются в локальном хранилище IndexedDB. Для автоматической отправки копии на сервер нужен отдельный сервис синхронизации — пока он не подключён.</p>'+connectionIndicator()+'</div><div class="panel"><b>Уведомления при блокировке</b><p class="muted">Для сигнала нужен подключённый сервер Web Push и интернет. Сервер сейчас не подключён. При открытом экране таймер работает без интернета.</p><button class="btn secondary" disabled>Web Push: не подключён</button></div><div class="panel"><b>Порядок занятий</b><p class="muted">На главном экране тяни карточку за значок ⠿. Порядок сохраняется автоматически.</p><button class="btn secondary" data-act="defaultorder">Вернуть первоначальный порядок</button></div><div class="panel"><b>Резервное копирование</b><p class="muted">Тренировки хранятся на этом устройстве. Экспортируй JSON перед сменой телефона или удалением веб-приложения.</p><div class="two"><button class="smallbtn" data-act="export">Экспорт JSON</button><button class="smallbtn" data-act="import">Импорт JSON</button></div></div><div class="panel"><b>Демонстрация отчёта</b><p class="muted">Тестовые записи заменят текущий цикл.</p><button class="btn secondary" data-act="demo">Показать демо-цикл</button><button class="btn danger" data-act="reset">Удалить все данные</button></div><div class="note">Версия 1.1. Без аккаунта. Данные тренировок не отправляются на сервер.</div></main>'}
function render(){app.innerHTML=(view==='home'?home():view==='day'?training(day):view==='report'?review():settings())+nav();update()}
function update(){
 let c=$('#session-time');if(c)c.textContent=minfmt(dur(ses(day)));
 let stickySession=$('#sticky-session-time');if(stickySession)stickySession.textContent=minfmt(dur(ses(day)));
 let stickyRest=$('#sticky-rest-time');if(stickyRest&&S.rest)stickyRest.textContent=minfmt(S.rest.end-Date.now());
 let stickyWarmup=$('#sticky-warmup-time');if(stickyWarmup)stickyWarmup.textContent=minfmt(warmupCountdown(day));
 let r=$('#rest-time');if(r&&S.rest)r.textContent=minfmt(S.rest.end-Date.now());
 if(S.rest&&Date.now()>=S.rest.end&&!S.rest.expired){const late=Date.now()-S.rest.end;S.rest.expired=true;save();if(!document.hidden){toast('Отдых завершён');if(late<15000)signal()}}
 let a=S.sessions[day],w=$('#warmup-time');
 if(a?.warmupEndAt&&!a.warmupDoneAt){
  if(w)w.textContent=minfmt(warmupCountdown(day));
  if(!a.pausedAt&&Date.now()>=a.warmupEndAt){
   const late=Date.now()-a.warmupEndAt;a.warmupDoneAt=a.warmupEndAt;a.warmupAlerted=true;save();
   if(!document.hidden){toast('Разминка закончена');if(late<15000)signal()}render();
  }
 }
}
function restOff(){S.rest=null;save();render()}
function mark(i,id,minutes){let e=activeExercises(i).find(x=>x[0]===id),s=ses(i);if(!e||s.done||s.pausedAt)return;if(!s.warmupDoneAt&&!logged(i)){toast('Сначала выполни разминку 5 минут');return;}let logs=s.logs[id]||(s.logs[id]=[]),at=Array.from({length:setTarget(e,i)},(_,k)=>k).find(k=>!logs[k]);if(at===undefined)return;let weight=w(e),r=reps(e);if(e[6]&&weight<=0){toast('Сначала укажи рабочий вес');return}if(!s.startAt)s.startAt=Date.now();logs[at]={w:weight,r,time:Date.now()};let all=activeExercises(i).every(x=>(s.logs[x[0]]||[]).filter(Boolean).length>=setTarget(x,i));S.rest=minutes>0&&!all?{i,end:Date.now()+minutes*60000,expired:false}:null;save();render();if(all)toast('Все подходы выполнены. Заверши занятие.')}
function finish(i){let s=ses(i);if(!logged(i)||s.done)return;if(logged(i)<count(i)&&!confirm('Не все подходы завершены. Закончить занятие?'))return;if(s.pausedAt){s.pausedTotal+=Date.now()-s.pausedAt;s.pausedAt=0;}s.endAt=Date.now();s.done=true;S.rest=null;save();if(!document.hidden)signal();view=finished()===7?'report':'home';render()}
app.addEventListener('change',e=>{
 const t=e.target;
 if(t.matches('[data-input=distance]')){
  const n=Number(String(t.value).replace(',','.'));if(!Number.isFinite(n)||n<0||n>200){toast('Укажи расстояние от 0 до 200 км');render();return}
  const i=Number(t.dataset.i);ses(i).distanceKm=Math.round(n*100)/100;save();toast('Километры сохранены');return;
 }
 if(t.matches('[data-input=w]')){let n=Number(t.value);if(!Number.isFinite(n)||n<0||n>1500){toast('Неверный вес');render();return}S.drafts[t.dataset.e]={...S.drafts[t.dataset.e],w:n};save()}
});
app.addEventListener('click',e=>{let b=e.target.closest('button[data-act]');if(!b||b.disabled)return;let a=b.dataset.act,i=Number(b.dataset.i),id=b.dataset.e;
if(['home','report','settings'].includes(a)){view=a;render();return}
if(['start','warmupstart','mark','warmupdone','soundtest','finish'].includes(a))unlockAudio();
if(a==='addset'||a==='removeset'){
 let ex=activeExercises(i).find(e=>e[0]===id),session=ses(i);if(!ex||session.done)return;
 const recorded=(session.logs[id]||[]).filter(Boolean).length,extra=Math.max(0,Math.min(MAX_EXTRA_SETS,Number(session.extraSets?.[id])||0));
 if(a==='addset'&&extra<MAX_EXTRA_SETS){(session.extraSets??={})[id]=extra+1;save();render();toast('Подход добавлен');return}
 if(a==='removeset'&&extra>0&&recorded<setTarget(ex,i)){
  (session.extraSets??={})[id]=extra-1;save();render();toast('Лишний подход убран');return
 }
 return;
}
if(a==='soundtoggle'){S.soundEnabled=!S.soundEnabled;save();render();return}
if(a==='soundtest'){signal();toast(S.soundEnabled?'Тестовый сигнал':'Звук выключен');return}
if(a==='warmupstart'){startWarmup(i);return}
if(a==='warmupdone'){finishWarmup(i);return}
if(a==='theme'){toggleTheme();return}
if(a==='updateapp'){checkAppUpdate();return}
if(a==='checkfirst'){let z=firstWorkoutSummary();toast('Первая тренировка: '+z.count+' из '+z.total+' подходов'+(z.done?' · завершена':''));return}
if(a==='importfirst'){restoreFirstWorkoutFile();return}
if(a==='chart'){S.chartExercise=id;save();render();return}
if(a==='previous'){let old=lastSetOf(id,i);if(!old){toast('Прошлого результата нет');return}S.drafts[id]={...S.drafts[id],w:old.w,r:old.r||S.drafts[id]?.r||DAYS[i][1].find(e=>e[0]===id)[3]};save();render();toast('Предыдущий результат подставлен');return}
if(a==='day'){day=i;view='day';render();return}
if(a==='defaultorder'){S.order=DAYS.map((_,i)=>i);save();render();toast('Исходный порядок восстановлен');return}
if(a==='start'){startWarmup(i);return}
if(a==='pause'){ses(i).pausedAt=Date.now();save();render();return}
if(a==='resume'){let s=ses(i),paused=Date.now()-s.pausedAt;if(s.warmupEndAt&&!s.warmupDoneAt)s.warmupEndAt+=paused;s.pausedTotal+=paused;s.pausedAt=0;save();render();return}
if(a==='skip'){restOff();return}
if(a==='mark'){mark(i,id,+b.dataset.rest);return}
if(a==='finish'){finish(i);return}
if(a==='undo'){let logs=ses(i).logs[id]||[],last=logs.map((x,k)=>x?k:-1).filter(k=>k>=0).at(-1);if(last!==+b.dataset.set){toast('Отменить можно только последний подход');return}delete logs[last];S.rest=null;save();render();return}
if(['w+','w-','r+','r-'].includes(a)){let ex=activeExercises(i).find(x=>x[0]===id);if(!ex)return;let change=a.endsWith('+')?1:-1,field=a[0];let current=field==='w'?w(ex):reps(ex),step=field==='w'?ex[5]:ex[0]==='plank'?5:1;S.drafts[id]={...S.drafts[id],[field]:Math.max(field==='w'?0:1,Math.round((current+change*step)*10)/10)};save();render();return}
if(a==='newcycle'){if(finished()!==7)return;if(!S.demo){S.history.unshift({...report(),...historyExtras()});S.cycle++}else{S=empty()}S.sessions={};S.rest=null;S.demo=false;save();view='home';render();return}
if(a==='demo'){if(!confirm('Текущие записи будут заменены демонстрационными. Продолжить?'))return;S.sessions={};S.demo=true;let now=Date.now();DAYS.forEach((d,j)=>{let s=ses(j);s.startAt=now-(7-j)*86400000;s.endAt=s.startAt+(25+j%4)*60000;s.done=true;d[1].forEach((x,k)=>{s.logs[x[0]]=Array.from({length:x[2]},(_,m)=>({w:x[6]?(20+k*12+(j>2?2:0)):0,r:x[4],time:s.startAt+(m+k*4+1)*60000}))})});S.rest=null;save();view='report';render();return}
if(a==='reset'){if(confirm('Удалить ВСЕ циклы и подходы?')){S=empty();save();view='home';render()}return}
if(a==='export'){let data=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),url=URL.createObjectURL(data),link=document.createElement('a');link.href=url;link.download='train-backup-'+S.cycle+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);return}
if(a==='import'){let input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=()=>input.files[0]?.text().then(t=>{try{let z=JSON.parse(t);if(z.v!==1||!z.sessions||!z.history)throw Error('bad');if(confirm('Заменить текущие данные?')){S={...empty(),...z,rest:null};if(!validOrder(S.order))S.order=DAYS.map((_,i)=>i);save();view='home';render()}}catch{toast('Неверный файл')}});input.click();return}
});
window.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
if('serviceWorker'in navigator){
 let updateReloading=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(updateReloading)return;
  if(view==='day'){toast('Новая версия готова. Закрой и открой приложение после тренировки.');return;}
  updateReloading=true;location.reload();
 });
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'})
  .then(reg=>{if(navigator.onLine!==false)reg.update().catch(()=>{})})
  .catch(()=>{});
}
setInterval(update,600);render();
try{if(localStorage.getItem(KEY))mirrorSave(JSON.stringify(S));else restoreSnapshot()}catch{restoreSnapshot()}
window.addEventListener('online',()=>{if(view==='home'||view==='settings')render();toast('Интернет доступен · история сохранена на iPhone')});
window.addEventListener('offline',()=>{if(view==='home'||view==='settings')render();toast('Офлайн · тренировки продолжают сохраняться')});
