
const DAYS=[
['Грудь + трицепс',[['chestpress','Жим в грудном тренажёре',3,8,12,2.5,1],['incline','Жим гантелей под наклоном',2,8,12,2,2],['trirope','Разгибание рук с канатом',3,10,15,2.5,1]]],
['Спина + бицепс',[['latpulldown','Тяга верхнего блока',3,8,12,2.5,1],['cable-row','Горизонтальная тяга',2,8,12,2.5,1],['barcurl','Подъём штанги на бицепс',3,10,12,2.5,1]]],
['Ноги + плечи',[['legpress','Жим ногами',3,10,12,5,1],['rdl','Румынская тяга с гантелями',3,8,12,2,2],['lateral','Махи гантелями в стороны',2,12,15,1,2]]],
['Грудь + трицепс',[['incline','Жим гантелей под наклоном',3,8,12,2,2],['fly','Сведение рук в тренажёре',2,12,15,2.5,1],['overheadtri','Разгибание из-за головы на блоке',3,10,15,2.5,1]]],
['Спина + бицепс',[['chestrow','Горизонтальная тяга с опорой',3,8,12,2.5,1],['close-lat','Тяга верхнего блока узким хватом',2,10,12,2.5,1],['hammer','Молотковые сгибания',3,10,12,2,2]]],
['Ноги + плечи',[['legcurl','Сгибание ног в тренажёре',3,10,15,2.5,1],['legpress','Жим ногами',3,10,12,5,1],['shoulderpress','Жим гантелей сидя',2,10,12,2,2]]],
['Кардио + пресс',[['walking','Ходьба в комфортном темпе',1,20,20,1,0],['crunch','Скручивания',2,15,15,1,0],['plank','Планка (секунды)',2,30,30,5,0]]]
];
const KEY='train_iphone_prototype_v1';
const empty=()=>({v:1,cycle:1,sessions:{},drafts:{},rest:null,history:[],demo:false,order:DAYS.map((_,i)=>i)});
let S;try{S={...empty(),...JSON.parse(localStorage.getItem(KEY))}}catch{S=empty()}
const validOrder=o=>Array.isArray(o)&&o.length===DAYS.length&&new Set(o).size===DAYS.length&&o.every(i=>Number.isInteger(i)&&i>=0&&i<DAYS.length);
if(!validOrder(S.order)){S.order=DAYS.map((_,i)=>i);try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}}
let view='home',day=0,timed=null;
const $=s=>document.querySelector(s);
const app=$('#app');
const fmt=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n||0);
const minfmt=ms=>{let s=Math.max(0,Math.floor(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const hdur=ms=>{let n=Math.round(ms/60000);return n>=60?Math.floor(n/60)+' ч '+n%60+' мин':n+' мин'};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{toast('Не удалось сохранить данные')}};
const ses=i=>S.sessions[i]||(S.sessions[i]={startAt:0,endAt:0,pausedAt:0,pausedTotal:0,done:false,logs:{}});
const count=i=>DAYS[i][1].reduce((a,e)=>a+e[2],0);
const logged=i=>Object.values(ses(i).logs).flat().filter(Boolean).length;
const finished=()=>DAYS.reduce((a,_,i)=>a+(ses(i).done?1:0),0);
const next=()=>S.order.find(i=>!ses(i).done)??-1;
const w=e=>{if(!e[6])return 0;if(S.drafts[e[0]]?.w!==undefined)return +S.drafts[e[0]].w||0;
for(let i=6;i>=0;i--){const s=S.sessions[i]?.logs[e[0]];if(s){const k=s.filter(Boolean).at(-1);if(k?.w)return k.w}}
for(const h of S.history){if(h.weights?.[e[0]])return h.weights[e[0]]}return 0};
const reps=e=>S.drafts[e[0]]?.r??e[3];
const dur=s=>!s.startAt?0:Math.max(0,(s.endAt||s.pausedAt||Date.now())-s.startAt-(s.pausedTotal||0));
const tonne=()=>DAYS.reduce((sum,d,i)=>sum+d[1].reduce((a,e)=>a+(ses(i).logs[e[0]]||[]).filter(Boolean).reduce((t,l)=>t+l.w*l.r*e[6],0),0),0);
const timedone=()=>DAYS.reduce((t,_,i)=>t+(ses(i).done?dur(ses(i)):0),0);
const doneSets=()=>DAYS.reduce((t,_,i)=>t+logged(i),0);
function weights(){const a={};DAYS.forEach((d,i)=>d[1].forEach(e=>{if(!e[6])return;const logs=(ses(i).logs[e[0]]||[]).filter(Boolean);if(logs.length)a[e[0]]=logs.at(-1).w;}));return a}
const report=()=>({cycle:S.cycle,date:Date.now(),volume:tonne(),time:timedone(),sets:doneSets(),days:finished(),weights:weights(),order:[...S.order]});
function toast(msg){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.append(el);setTimeout(()=>el.remove(),3200)}
function signal(){try{navigator.vibrate?.([120,65,120]);const C=window.AudioContext||window.webkitAudioContext;if(C){const c=new C(),o=c.createOscillator(),g=c.createGain();o.frequency.value=940;g.gain.value=.07;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.18);setTimeout(()=>c.close(),300)}}catch{}}
function nav(){return '<nav class="tabbar"><button data-act="home" class="'+(view==='home'?'sel':'')+'"><b>▦</b>Цикл</button><button data-act="report" class="'+(view==='report'?'sel':'')+'"><b>▤</b>Отчёт</button><button data-act="settings" class="'+(view==='settings'?'sel':'')+'"><b>⚙</b>Настройки</button></nav>'}
function home(){
const f=finished(),n=next();
const tabs=S.order.map((id,p)=>'<button class="daytile '+(ses(id).done?'done':id===n?'active':'')+'" data-act="day" data-i="'+id+'">'+(ses(id).done?'✓':p+1)+'<small>Д'+(p+1)+'</small></button>').join('');
const cards=S.order.map((id,p)=>{
const d=DAYS[id],done=ses(id).done;
return '<div class="card workout-row '+(done?'done':id===n?'active':'')+'" data-workout="'+id+'"><button class="card-main" data-act="day" data-i="'+id+'"><span class="num">'+(done?'✓':String(p+1).padStart(2,'0'))+'</span><span class="grow"><h3>'+d[0]+'</h3><p>'+(done?'Завершено':d[1].length+' упражнения · '+count(id)+' подходов'+(id===n?' · следующий':''))+'</p></span><span class="chev">›</span></button><button class="draghandle" data-i="'+id+'" aria-label="Переместить занятие '+(p+1)+'. Перетаскивай или используй стрелки клавиатуры" title="Перетащить занятие">⠿</button></div>';
}).join('');
return '<main class="page"><div class="top"><div><div class="kicker">ТРЕНИРОВКИ / TRAIN</div><div class="muted">30 минут · 7 занятий · рост мышц</div></div><button class="smallbtn" data-act="settings">⚙</button></div><div class="kicker">'+(S.demo?'ДЕМОНСТРАЦИЯ':'ТВОЙ ПРОГРЕСС')+'</div><div class="h1">Цикл № '+S.cycle+'</div><div class="muted">Занятия не привязаны к календарным датам</div><div class="panel hero"><div class="kicker">Завершено занятий</div><div style="font-weight:900;font-size:40px;margin-top:5px">'+f+' <span style="font-size:20px;color:#a2bfad">/ 7</span></div><div class="bar"><i style="width:'+(f/7*100)+'%"></i></div></div><div class="statgrid"><div class="stat"><div class="bigstat">'+fmt(tonne())+'</div><div class="label">Кг поднято</div></div><div class="stat"><div class="bigstat">'+doneSets()+'</div><div class="label">Подходов</div></div><div class="stat"><div class="bigstat">'+hdur(timedone())+'</div><div class="label">Времени</div></div></div><div class="daystrip">'+tabs+'</div><div class="section">Семь занятий</div><div class="muted drag-instruction">Перетаскивай за значок ⠿ справа, чтобы изменить порядок</div><div class="workout-list">'+cards+'</div>'+(f===7?'<button class="btn" data-act="report">Посмотреть отчёт →</button>':'<button class="btn" data-act="day" data-i="'+n+'">Открыть занятие '+(S.order.indexOf(n)+1)+' →</button>')+'<div class="note">Порядок сохраняется автоматически и переносится в следующий цикл. Выполненные подходы и веса не меняются.</div></main>';
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
function exercise(e,i,idx){
let s=ses(i),logs=s.logs[e[0]]||[],done=logs.filter(Boolean).length,ok=done===e[2],isweight=e[6]>0;
let head='<div class="kicker">УПРАЖНЕНИЕ '+(idx+1)+'</div><div class="extitle" style="margin-top:5px">'+e[1]+'</div><div class="exmeta">'+e[2]+' × '+e[3]+(e[3]===e[4]?'':'–'+e[4])+(e[0]==='walking'?' мин':e[0]==='plank'?' сек':' повт.')+'</div>';
let ctrl=isweight?'<div class="control"><span class="muted">Вес '+(e[6]===2?'гантели':'снаряда')+'</span><div class="counter"><button data-act="w-" data-i="'+i+'" data-e="'+e[0]+'" '+(ok||s.done?'disabled':'')+'>−</button><input data-input="w" data-e="'+e[0]+'" type="number" inputmode="decimal" min="0" step="0.5" value="'+w(e)+'" '+(ok||s.done?'disabled':'')+'><button data-act="w+" data-i="'+i+'" data-e="'+e[0]+'" '+(ok||s.done?'disabled':'')+'>+</button></div></div>':'';
if(!ok&&!s.done)ctrl+='<div class="control"><span class="muted">'+(e[0]==='walking'?'Минуты':e[0]==='plank'?'Секунды':'Повторы')+'</span><div class="counter"><button data-act="r-" data-i="'+i+'" data-e="'+e[0]+'">−</button><b>'+reps(e)+'</b><button data-act="r+" data-i="'+i+'" data-e="'+e[0]+'">+</button></div></div>';
let rows=Array.from({length:e[2]},(_,k)=>{const l=logs[k],isnext=k===done;
return '<div class="set '+(l?'done':'')+'"><div><div style="font-size:13px;font-weight:750">'+(k+1)+'-й подход '+(l?'✓':'')+'</div><div class="tiny" style="margin-top:3px">'+(l?l.r+' '+(e[0]==='walking'?'мин':e[0]==='plank'?'сек':'повт.')+(isweight?' · '+fmt(l.w)+' кг':''):isnext?'Следующий':'Не выполнен')+'</div></div>'+(l?'<button class="smallbtn" data-act="undo" data-i="'+i+'" data-e="'+e[0]+'" data-set="'+k+'" '+(s.done?'disabled':'')+'>↶</button>':isnext&&!s.done?(e[0]==='walking'||(count(i)-logged(i)===1)?'<button class="smallbtn" data-act="mark" data-i="'+i+'" data-e="'+e[0]+'" data-rest="0">Готово ✓</button>':'<div class="times">'+[1,2,3].map(x=>'<button data-act="mark" data-i="'+i+'" data-e="'+e[0]+'" data-rest="'+x+'">'+x+' м</button>').join('')+'</div>'):'')+'</div>'}).join('');
return '<div class="exercise '+(ok?'done':'')+'">'+head+ctrl+rows+'</div>'}
function training(i){const d=DAYS[i],s=ses(i),done=logged(i),all=count(i),rest=S.rest?.i===i?S.rest:null;
return '<main class="page"><div class="top"><button class="smallbtn" data-act="home">‹ Назад</button><div class="kicker">'+(S.order.indexOf(i)+1)+' / 07</div></div><div class="h1">'+d[0]+'</div><div class="muted">'+done+' из '+all+' подходов выполнено</div><div class="bar"><i style="width:'+(done/all*100)+'%"></i></div><div class="clockbox"><div><div class="tiny">Время тренировки</div><div class="timer" id="session-time">'+minfmt(dur(s))+'</div></div>'+(s.done?'<b>Готово ✓</b>':!s.startAt?'<button class="smallbtn" data-act="start" data-i="'+i+'">▶ Начать</button>':s.pausedAt?'<button class="smallbtn" data-act="resume" data-i="'+i+'">▶ Продолжить</button>':'<button class="smallbtn" data-act="pause" data-i="'+i+'">Ⅱ Пауза</button>')+'</div>'+(rest?'<div class="rest"><div class="kicker">ОТДЫХ</div><div style="display:flex;align-items:center;justify-content:space-between"><div class="timer" id="rest-time">'+minfmt(rest.end-Date.now())+'</div><button class="smallbtn" data-act="skip"> '+(rest.end<=Date.now()?'Понятно':'Пропустить')+' </button></div><div class="muted">При блокировке телефона оповещение требует подключения Web Push.</div></div>':'')+d[1].map((e,j)=>exercise(e,i,j)).join('')+(s.done?'<div class="panel">Завершено за '+hdur(dur(s))+'<button class="btn secondary" data-act="home">На главную</button></div>':'<button class="btn" data-act="finish" data-i="'+i+'" '+(!done?'disabled':'')+'>Завершить тренировку ✓</button>')+'<div class="note">Для гантелей указывается вес одной гантели; в тоннаже учитываются обе.</div></main>'}
function review(){let cur=report(),prev=S.history[0],obs={};DAYS.forEach((d,i)=>d[1].forEach(e=>{if(!e[6])return;let logs=(ses(i).logs[e[0]]||[]).filter(Boolean);if(logs.length)(obs[e[0]]??=[]).push({name:e[1],w:logs.at(-1).w})}));
let changes=Object.entries(obs).flatMap(([id,list])=>{let from=prev?.weights?.[id]||list[0].w,to=list.at(-1).w;return from>0&&(prev||list.length>1)?[{name:list[0].name,from,to,pct:Math.round((to/from-1)*1000)/10}]:[]});
return '<main class="page"><div class="top"><button class="smallbtn" data-act="home">‹ Цикл</button><div class="kicker">ОТЧЁТ</div></div><div class="h1">Цикл № '+S.cycle+'</div><div class="muted">'+cur.days+' из 7 занятий завершено</div><div class="reportgrid"><div class="reportmetric"><b>'+fmt(cur.volume)+'</b><span>Всего поднято, кг</span></div><div class="reportmetric"><b>'+hdur(cur.time)+'</b><span>Время занятий</span></div><div class="reportmetric"><b>'+cur.sets+'</b><span>Подходов</span></div><div class="reportmetric"><b>'+(cur.days?Math.round(cur.time/60000/cur.days):0)+' мин</b><span>Среднее время</span></div></div><div class="section">Рабочие веса '+(prev?'к прошлому циклу':'внутри цикла')+'</div>'+(changes.length?'<div class="panel"><table>'+changes.map(c=>'<tr><td>'+c.name+'</td><td>'+fmt(c.from)+' → '+fmt(c.to)+'</td><td class="'+(c.pct>0?'positive':'')+'">'+(c.pct>0?'+':'')+c.pct+'%</td></tr>').join('')+'</table></div>':'<div class="note">Сравнение появится, когда упражнение будет повторено, или со следующего цикла.</div>')+'<div class="note">Тоннаж = сумма (вес × повторы). Кардио и упражнения с собственным весом учитываются отдельно от килограммов.</div>'+(cur.days===7?'<button class="btn" data-act="newcycle">Начать следующий цикл →</button>':'<button class="btn secondary" data-act="home">Продолжить тренировки</button>')+(S.history.length?'<div class="section">Предыдущие циклы</div>'+S.history.map(h=>'<div class="panel">Цикл № '+h.cycle+' · '+fmt(h.volume)+' кг · '+hdur(h.time)+'</div>').join(''):'')+'</main>'}
function settings(){let standalone=matchMedia('(display-mode:standalone)').matches||navigator.standalone;
return '<main class="page"><div class="top"><button class="smallbtn" data-act="home">‹ Цикл</button><div class="kicker">НАСТРОЙКИ</div></div><div class="h1">Приложение</div><div class="panel"><b>Установка на iPhone</b><p class="muted">Открой в Safari → Поделиться → На экран Домой. Затем запускай приложение по иконке.</p><div class="install">'+(standalone?'Приложение открыто с главного экрана.':'Открой это приложение через иконку на рабочем столе iPhone.')+'</div></div><div class="panel"><b>Уведомления при блокировке</b><p class="muted">Для сигнала нужен подключённый сервер Web Push и интернет. Сервер сейчас не подключён. При открытом экране таймер работает без интернета.</p><button class="btn secondary" disabled>Web Push: не подключён</button></div><div class="panel"><b>Порядок занятий</b><p class="muted">На главном экране тяни карточку за значок ⠿. Порядок сохраняется автоматически.</p><button class="btn secondary" data-act="defaultorder">Вернуть первоначальный порядок</button></div><div class="panel"><b>Резервное копирование</b><p class="muted">Тренировки хранятся на этом устройстве. Экспортируй JSON перед сменой телефона или удалением веб-приложения.</p><div class="two"><button class="smallbtn" data-act="export">Экспорт JSON</button><button class="smallbtn" data-act="import">Импорт JSON</button></div></div><div class="panel"><b>Демонстрация отчёта</b><p class="muted">Тестовые записи заменят текущий цикл.</p><button class="btn secondary" data-act="demo">Показать демо-цикл</button><button class="btn danger" data-act="reset">Удалить все данные</button></div><div class="note">Версия 0.4. Без аккаунта. Данные тренировок не отправляются на сервер.</div></main>'}
function render(){app.innerHTML=(view==='home'?home():view==='day'?training(day):view==='report'?review():settings())+nav();update()}
function update(){let s=$('#session-time');if(s)s.textContent=minfmt(dur(ses(day)));let r=$('#rest-time');if(r&&S.rest)r.textContent=minfmt(S.rest.end-Date.now());if(S.rest&&Date.now()>=S.rest.end&&!S.rest.expired){S.rest.expired=true;save();if(!document.hidden){toast('Отдых завершён');signal()}}}
function restOff(){S.rest=null;save();render()}
function mark(i,id,minutes){let e=DAYS[i][1].find(x=>x[0]===id),s=ses(i);if(!e||s.done||s.pausedAt)return;let logs=s.logs[id]||(s.logs[id]=[]),at=Array.from({length:e[2]},(_,k)=>k).find(k=>!logs[k]);if(at===undefined)return;let weight=w(e),r=reps(e);if(e[6]&&weight<=0){toast('Сначала укажи рабочий вес');return}if(!s.startAt)s.startAt=Date.now();logs[at]={w:weight,r,time:Date.now()};let all=DAYS[i][1].every(x=>(s.logs[x[0]]||[]).filter(Boolean).length===x[2]);S.rest=minutes>0&&!all?{i,end:Date.now()+minutes*60000,expired:false}:null;save();render();if(all)toast('Все подходы выполнены. Заверши занятие.')}
function finish(i){let s=ses(i);if(!logged(i)||s.done)return;if(logged(i)<count(i)&&!confirm('Не все подходы завершены. Закончить занятие?'))return;if(s.pausedAt){s.pausedTotal+=Date.now()-s.pausedAt;s.pausedAt=0;}s.endAt=Date.now();s.done=true;S.rest=null;save();view=finished()===7?'report':'home';render()}
app.addEventListener('change',e=>{let t=e.target;if(t.matches('[data-input=w]')){let n=Number(t.value);if(!Number.isFinite(n)||n<0||n>1500){toast('Неверный вес');render();return}S.drafts[t.dataset.e]={...S.drafts[t.dataset.e],w:n};save()}});
app.addEventListener('click',e=>{let b=e.target.closest('button[data-act]');if(!b||b.disabled)return;let a=b.dataset.act,i=Number(b.dataset.i),id=b.dataset.e;
if(['home','report','settings'].includes(a)){view=a;render();return}
if(a==='day'){day=i;view='day';render();return}
if(a==='defaultorder'){S.order=DAYS.map((_,i)=>i);save();render();toast('Исходный порядок восстановлен');return}
if(a==='start'){ses(i).startAt=Date.now();save();render();return}
if(a==='pause'){ses(i).pausedAt=Date.now();save();render();return}
if(a==='resume'){let s=ses(i);s.pausedTotal+=Date.now()-s.pausedAt;s.pausedAt=0;save();render();return}
if(a==='skip'){restOff();return}
if(a==='mark'){mark(i,id,+b.dataset.rest);return}
if(a==='finish'){finish(i);return}
if(a==='undo'){let logs=ses(i).logs[id]||[],last=logs.map((x,k)=>x?k:-1).filter(k=>k>=0).at(-1);if(last!==+b.dataset.set){toast('Отменить можно только последний подход');return}delete logs[last];S.rest=null;save();render();return}
if(['w+','w-','r+','r-'].includes(a)){let ex=DAYS[i][1].find(x=>x[0]===id),change=a.endsWith('+')?1:-1,field=a[0];let current=field==='w'?w(ex):reps(ex),step=field==='w'?ex[5]:ex[0]==='plank'?5:1;S.drafts[id]={...S.drafts[id],[field]:Math.max(field==='w'?0:1,Math.round((current+change*step)*10)/10)};save();render();return}
if(a==='newcycle'){if(finished()!==7)return;if(!S.demo){S.history.unshift(report());S.cycle++}else{S=empty()}S.sessions={};S.rest=null;S.demo=false;save();view='home';render();return}
if(a==='demo'){if(!confirm('Текущие записи будут заменены демонстрационными. Продолжить?'))return;S.sessions={};S.demo=true;let now=Date.now();DAYS.forEach((d,j)=>{let s=ses(j);s.startAt=now-(7-j)*86400000;s.endAt=s.startAt+(25+j%4)*60000;s.done=true;d[1].forEach((x,k)=>{s.logs[x[0]]=Array.from({length:x[2]},(_,m)=>({w:x[6]?(20+k*12+(j>2?2:0)):0,r:x[4],time:s.startAt+(m+k*4+1)*60000}))})});S.rest=null;save();view='report';render();return}
if(a==='reset'){if(confirm('Удалить ВСЕ циклы и подходы?')){S=empty();save();view='home';render()}return}
if(a==='export'){let data=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),url=URL.createObjectURL(data),link=document.createElement('a');link.href=url;link.download='train-backup-'+S.cycle+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);return}
if(a==='import'){let input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=()=>input.files[0]?.text().then(t=>{try{let z=JSON.parse(t);if(z.v!==1||!z.sessions||!z.history)throw Error('bad');if(confirm('Заменить текущие данные?')){S={...empty(),...z,rest:null};if(!validOrder(S.order))S.order=DAYS.map((_,i)=>i);save();view='home';render()}}catch{toast('Неверный файл')}});input.click();return}
});
window.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
setInterval(update,600);render();
