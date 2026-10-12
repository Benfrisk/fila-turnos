const services=[...document.querySelectorAll('.service-card')];let selected=services[0],nextNumber=1,waiting=[],toastTimer,activeTicket=null,ticketIds=[];
const desks=[{number:1,turn:null},{number:2,turn:null},{number:3,turn:null},{number:4,turn:null}],deskTimers=new Map(),TURN_DURATION_MS=3000;
const $=id=>document.getElementById(id);
function scheduleDeskRelease(desk){
 clearTimeout(deskTimers.get(desk.number));
 if(!desk.turn)return;
 const turnId=desk.turn.id,assignedAt=desk.turn.assignedAt||Date.now();
 desk.turn.assignedAt=assignedAt;
 deskTimers.set(desk.number,setTimeout(()=>{
  if(desk.turn?.id===turnId&&desk.turn.assignedAt===assignedAt)finishDesk(desk.number);
 },Math.max(0,assignedAt+TURN_DURATION_MS-Date.now())));
}
function assignTurn(desk,turn){desk.turn={...turn,assignedAt:Date.now()};scheduleDeskRelease(desk)}
function restoreBoard(data){
 try{
  const saved=data||JSON.parse(localStorage.getItem('fila-board')||'null');
  if(!saved||saved.version!==2||!Array.isArray(saved.desks)||!Array.isArray(saved.waiting)){if(!data)localStorage.removeItem('fila-board');return;}
  desks.forEach(d=>{
   const savedDesk=saved.desks.find(item=>Number(item.number)===d.number);
   if(savedDesk){d.turn=savedDesk.turn&&Number.isFinite(Number(savedDesk.turn.id))?{id:Number(savedDesk.turn.id),service:String(savedDesk.turn.service||''),assignedAt:Number(savedDesk.turn.assignedAt)||Date.now()}:null;scheduleDeskRelease(d)}
  });
  waiting=saved.waiting.filter(t=>t&&Number.isFinite(Number(t.id))).map(t=>({id:Number(t.id),service:String(t.service||'')}));
  const tickets=[...desks.map(d=>d.turn),...waiting].filter(Boolean);
  const highestTicket=Math.max(0,...tickets.map(t=>t.id));
  nextNumber=Math.max(1,Number(saved.nextNumber)||1,highestTicket+1);
  const savedIds=Array.isArray(saved.ticketIds)?saved.ticketIds:[saved.activeTicketId];
  ticketIds=savedIds.map(Number).filter(id=>Number.isInteger(id)&&tickets.some(t=>t.id===id));
  activeTicket=[...ticketIds].reverse().map(id=>tickets.find(t=>t.id===id)).find(Boolean)||null;
 }catch{}
}
function syncTicketControls(){
 const tickets=[...desks.map(d=>d.turn),...waiting].filter(Boolean);
 ticketIds=ticketIds.filter(id=>tickets.some(t=>t.id===id));
 activeTicket=[...ticketIds].reverse().map(id=>tickets.find(t=>t.id===id)).find(Boolean)||null;
 $('takeTurn').disabled=false;
 $('takeTurn').innerHTML='Tomar turno <span>→</span>';
 $('ticketCountMessage').textContent=ticketIds.length===1?'Tienes 1 turno activo en esta página.':`Tienes ${ticketIds.length} turnos activos en esta página.`;
 if(activeTicket){
  $('ticketNumber').textContent=activeTicket.id;
  $('ticketService').textContent=activeTicket.service;
  $('ticketPanel').classList.remove('hidden');
 }else{
  $('ticketPanel').classList.add('hidden');
  $('ticketPanel').classList.remove('called');
  $('takeTurn').disabled=false;
  $('takeTurn').innerHTML='Tomar turno <span>→</span>';
 }
}
function updateClock(){ $('currentTime').textContent=new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) }updateClock();setInterval(updateClock,30000);
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
function displayTurn(turn){return turn?`Turno ${turn.id}`:'Disponible'}
function render(persist=true){
 if(persist)try{localStorage.setItem('fila-board',JSON.stringify({version:2,desks:desks.map(d=>({number:d.number,turn:d.turn})),waiting:waiting.map(t=>({id:t.id,service:t.service})),nextNumber,activeTicketId:activeTicket?.id??null,ticketIds,updatedAt:Date.now()}))}catch{}
 $('deskBoard').innerHTML=desks.map(d=>`<div class="desk-tile ${d.turn?'occupied':'free'}"><span class="desk-label">MESA ${d.number}</span><strong>${displayTurn(d.turn)}</strong><small>${d.turn?d.turn.service:'Esperando turno'}</small></div>`).join('');
 $('busyCount').textContent=desks.filter(d=>d.turn).length;$('waitingCount').textContent=waiting.length;
 $('adminDeskList').innerHTML=desks.map(d=>`<div><span>Mesa ${d.number}${d.turn?' · '+displayTurn(d.turn):' · Libre'}</span><b>${d.turn?d.turn.service:'Disponible'}</b><button type="button" class="finish-btn" data-desk="${d.number}" ${d.turn?'':'disabled'}>${d.turn?'Terminar atención':'Mesa libre'}</button></div>`).join('')+(waiting.length?`<div class="waiting-line"><span>En espera</span><b>${waiting.map(t=>t.id).join(' · ')}</b></div>`:'<div class="waiting-line"><span>En espera</span><b>Sin turnos pendientes</b></div>');
 document.querySelectorAll('.finish-btn').forEach(btn=>btn.addEventListener('click',()=>finishDesk(Number(btn.dataset.desk))));
 if(activeTicket){const assigned=desks.find(d=>d.turn===activeTicket);const isWaiting=waiting.includes(activeTicket);if(assigned){$('ticketStatus').textContent='ES TU TURNO';$('ticketHeading').textContent=`Pasa a la mesa ${assigned.number}.`;$('ticketMessage').textContent='Tu mesa ya está lista para atenderte.';$('ticketWait').textContent='Ahora';$('ticketDesk').textContent=`Mesa ${assigned.number}`;$('ticketPanel').classList.add('called')}else if(isWaiting){$('ticketStatus').textContent='TURNO EN ESPERA';$('ticketHeading').textContent='Espera a que se desocupe una mesa.';$('ticketMessage').textContent='Tu turno avanzará en orden cuando una mesa quede libre.';const ahead=waiting.indexOf(activeTicket);$('ticketWait').textContent=ahead===0?'Siguiente':`${ahead} antes`;$('ticketDesk').textContent='Te avisaremos aquí';$('ticketPanel').classList.remove('called')}}
}
function takeNextFor(desk){if(waiting.length){const next=waiting.shift();assignTurn(desk,next);if(next.id===activeTicket?.id)toast(`¡Turno ${next.id}! Pasa a la mesa ${desk.number}.`);return next}return null}
function finishDesk(number){const desk=desks.find(d=>d.number===number);if(!desk||!desk.turn)return;clearTimeout(deskTimers.get(number));deskTimers.delete(number);const finished=desk.turn;desk.turn=null;const next=takeNextFor(desk);ticketIds=ticketIds.filter(id=>id!==finished.id);syncTicketControls();render();if(next)toast(`Turno ${next.id}: pase a mesa ${number}.`);else toast(`Mesa ${number} libre. En espera: ${waiting.length}.`)}
services.forEach(card=>card.addEventListener('click',()=>{services.forEach(c=>c.classList.remove('selected'));card.classList.add('selected');selected=card}));
$('takeTurn').addEventListener('click',()=>{activeTicket={id:nextNumber++,service:selected.dataset.service};ticketIds.push(activeTicket.id);const available=desks.find(d=>!d.turn);if(available){assignTurn(available,activeTicket);toast(`Turno ${activeTicket.id}: pase a la mesa ${available.number}.`)}else{waiting.push(activeTicket);$('ticketStatus').textContent='EN ESPERA';$('ticketHeading').textContent='Espera a que se desocupe una mesa.';$('ticketMessage').textContent='Tu turno avanzará en orden cuando una mesa quede libre.';toast(`Tu turno es ${activeTicket.id}. Espera a que se desocupe una mesa.`)}syncTicketControls();render()});
$('cancelTicket').addEventListener('click',()=>{if(!activeTicket)return;const canceled=activeTicket;const queuedIndex=waiting.indexOf(canceled);if(queuedIndex>=0)waiting.splice(queuedIndex,1);else{const desk=desks.find(d=>d.turn?.id===canceled.id);if(desk){clearTimeout(deskTimers.get(desk.number));deskTimers.delete(desk.number);desk.turn=null;takeNextFor(desk)}}ticketIds=ticketIds.filter(id=>id!==canceled.id);syncTicketControls();render();toast('Turno cancelado.')});
 $('adminBtn').addEventListener('click',()=>$('adminDialog').showModal());$('helpBtn').addEventListener('click',()=>toast('Acércate al módulo de información y con gusto te ayudamos.'));
restoreBoard();syncTicketControls();render();
window.addEventListener('storage',event=>{if(event.key!=='fila-board'||!event.newValue)return;try{restoreBoard(JSON.parse(event.newValue));syncTicketControls();render(false)}catch{}});

