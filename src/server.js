// CarePoint Hospital MVP — Node.js built-ins only; no .env or npm packages required.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data.json');
const PORT = process.env.PORT || 3002;
const sessions = new Map();
function today(offset = 0) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); }
function initialData() { return { users:[], patients:[], doctors:[], appointments:[], beds:[], admissions:[], invoices:[], nextPatient:1, nextAppointment:1, nextAdmission:1, nextInvoice:1, nextDoctor:1, nextBed:1 }; }
function loadData() { try { return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); } catch { const d=initialData(); saveData(d); return d; } }
function saveData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d,null,2)); }
let data = loadData();
function send(res,status,obj,headers={}) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj)); }
function getCookie(req,name) { const m=(req.headers.cookie||'').match(new RegExp(`(?:^|; )${name}=([^;]*)`));return m?decodeURIComponent(m[1]):''; }
function sessionFor(req) { const sid=getCookie(req,'carepoint.sid');return sessions.get(sid); }
function body(req) { return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>20000)reject(new Error('Request is too large.'));});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{});}catch{reject(new Error('Send valid JSON.'));}});}); }
function safeText(v,max=250) { return typeof v==='string'?v.trim().slice(0,max):''; }
function api(req,res,url) {
  (async()=>{
    if(req.method==='POST'&&url==='/api/setup'){
      if(data.users.length)return send(res,409,{error:'Administrator setup is already complete.'});
      const b=await body(req),name=safeText(b.name,100),email=safeText(b.email,200).toLowerCase(),pw=typeof b.password==='string'?b.password:'';
      if(!name||!/^\S+@\S+\.\S+$/.test(email)||pw.length<10)return send(res,400,{error:'Enter your name, valid email, and a password with at least 10 characters.'});
      const salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(pw,salt,64).toString('hex');data.users.push({id:1,name,email,role:'Administrator',salt,hash});saveData(data);return send(res,201,{ok:true});
    }
    if(req.method==='POST'&&url==='/api/login'){
      const b=await body(req),email=safeText(b.email,200).toLowerCase(),pw=typeof b.password==='string'?b.password:'',account=data.users.find(u=>u.email===email);
      if(!account)return send(res,401,{error:'Email or password is incorrect.'});
      const hash=crypto.scryptSync(pw,account.salt,64).toString('hex');
      if(!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(account.hash)))return send(res,401,{error:'Email or password is incorrect.'});
      const sid=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(32).toString('hex');sessions.set(sid,{csrf,user:{name:account.name,role:account.role,email}});
      return send(res,200,{user:sessions.get(sid).user,csrf},{'Set-Cookie':`carepoint.sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`});
    }
    if(req.method==='GET'&&url==='/api/session') { const s=sessionFor(req);return send(res,200,{user:s?.user||null,csrf:s?.csrf||null,setupRequired:data.users.length===0}); }
    if(req.method==='POST'&&url==='/api/logout') { const s=sessionFor(req);const sid=getCookie(req,'carepoint.sid');if(sid)sessions.delete(sid);return send(res,200,{ok:true},{'Set-Cookie':'carepoint.sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'}); }
    const session=sessionFor(req);if(!session)return send(res,401,{error:'Please sign in.'});
    if(req.method!=='GET') { const origin=req.headers.origin; if(origin&&origin!==`http://${req.headers.host}`)return send(res,403,{error:'Cross-origin request blocked.'});if(req.headers['x-csrf-token']!==session.csrf)return send(res,403,{error:'Refresh the page and try again.'}); }
    if(req.method==='GET'&&url==='/api/dashboard')return send(res,200,{patients:data.patients.length,doctors:data.doctors.length,appointments:data.appointments.filter(a=>a.date===today()&&a.status!=='Cancelled').length,beds:data.beds.length,occupied:data.beds.filter(b=>b.status==='Occupied').length,unpaid:data.invoices.filter(i=>i.status==='Unpaid').reduce((n,i)=>n+Number(i.amount),0),today:today(),appointmentsList:data.appointments.filter(a=>a.date>=today()&&a.status!=='Cancelled').sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,8).map(a=>({...a,patient:data.patients.find(p=>p.id===a.patientId)?.name||''}))});
    if(req.method==='GET'&&url==='/api/patients')return send(res,200,data.patients);
    if(req.method==='POST'&&url==='/api/patients'){const b=await body(req);if(!safeText(b.name,100))return send(res,400,{error:'Patient name is required.'});const p={id:Date.now(),patientNo:`CP-${data.nextPatient++}`,name:safeText(b.name,100),dob:safeText(b.dob,10),gender:safeText(b.gender,20),phone:safeText(b.phone,30),email:safeText(b.email,200),bloodType:safeText(b.bloodType,5),emergency:safeText(b.emergency,120)};data.patients.unshift(p);saveData(data);return send(res,201,p);}
    if(req.method==='GET'&&url==='/api/doctors')return send(res,200,data.doctors);
    if(req.method==='POST'&&url==='/api/doctors'){const b=await body(req),name=safeText(b.name,100),specialty=safeText(b.specialty,100);if(!name||!specialty)return send(res,400,{error:'Doctor name and specialty are required.'});const d={id:data.nextDoctor++,name,specialty,department:safeText(b.department,80),phone:safeText(b.phone,30),email:safeText(b.email,200)};data.doctors.push(d);saveData(data);return send(res,201,d);}
    if(req.method==='GET'&&url==='/api/appointments')return send(res,200,data.appointments.map(a=>({...a,patient:data.patients.find(p=>p.id===a.patientId)?.name||'Unknown',doctor:data.doctors.find(d=>d.id===a.doctorId)?.name||'Unknown'})).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)));
    if(req.method==='POST'&&url==='/api/appointments'){const b=await body(req),patient=data.patients.find(p=>p.id===Number(b.patientId)),doctor=data.doctors.find(d=>d.id===Number(b.doctorId));if(!patient||!doctor||!/^\d{4}-\d\d-\d\d$/.test(b.date)||!/^\d\d:\d\d$/.test(b.time))return send(res,400,{error:'Choose a patient, doctor, date and time.'});if(data.appointments.some(a=>a.doctorId===doctor.id&&a.date===b.date&&a.time===b.time&&a.status!=='Cancelled'))return send(res,409,{error:'That doctor already has an appointment at this time.'});const a={id:data.nextAppointment++,patientId:patient.id,doctorId:doctor.id,date:b.date,time:b.time,reason:safeText(b.reason,300),status:'Scheduled'};data.appointments.push(a);saveData(data);return send(res,201,a);}
    if(req.method==='PATCH'&&url.startsWith('/api/appointments/')){const id=Number(url.split('/').pop()),b=await body(req),a=data.appointments.find(x=>x.id===id);if(!a)return send(res,404,{error:'Appointment not found.'});if(!['Scheduled','Checked In','Completed','Cancelled','No Show'].includes(b.status))return send(res,400,{error:'Invalid appointment status.'});a.status=b.status;saveData(data);return send(res,200,a);}
    if(req.method==='GET'&&url==='/api/beds')return send(res,200,data.beds.map(b=>({...b,patient:data.patients.find(p=>p.id===b.patientId)?.name||''})));
    if(req.method==='POST'&&url==='/api/beds'){const b=await body(req),number=safeText(b.number,20),ward=safeText(b.ward,80);if(!number||!ward)return send(res,400,{error:'Bed number and ward are required.'});if(data.beds.some(x=>x.number.toLowerCase()===number.toLowerCase()))return send(res,409,{error:'That bed number already exists.'});const bed={id:data.nextBed++,number,ward,type:safeText(b.type,40)||'General',status:'Available',patientId:null};data.beds.push(bed);saveData(data);return send(res,201,bed);}
    if(req.method==='POST'&&url==='/api/admissions'){const b=await body(req),p=data.patients.find(x=>x.id===Number(b.patientId)),bed=data.beds.find(x=>x.id===Number(b.bedId));if(!p||!bed||bed.status!=='Available')return send(res,409,{error:'Choose a patient and an available bed.'});bed.status='Occupied';bed.patientId=p.id;const a={id:data.nextAdmission++,patientId:p.id,bedId:bed.id,admitted:today(),diagnosis:safeText(b.diagnosis,300),status:'Admitted'};data.admissions.unshift(a);saveData(data);return send(res,201,a);}
    if(req.method==='POST'&&url.startsWith('/api/admissions/')&&url.endsWith('/discharge')){const id=Number(url.split('/')[3]),a=data.admissions.find(x=>x.id===id&&x.status==='Admitted');if(!a)return send(res,404,{error:'Active admission not found.'});a.status='Discharged';a.discharged=today();const bed=data.beds.find(x=>x.id===a.bedId);if(bed){bed.status='Cleaning';bed.patientId=null;}saveData(data);return send(res,200,a);}
    if(req.method==='GET'&&url==='/api/admissions')return send(res,200,data.admissions.map(a=>({...a,patient:data.patients.find(p=>p.id===a.patientId)?.name,bed:data.beds.find(b=>b.id===a.bedId)?.number})));
    if(req.method==='POST'&&url.startsWith('/api/beds/')&&url.endsWith('/clean')){const id=Number(url.split('/')[3]),bed=data.beds.find(x=>x.id===id);if(!bed||bed.status!=='Cleaning')return send(res,409,{error:'Bed is not awaiting cleaning.'});bed.status='Available';saveData(data);return send(res,200,bed);}
    if(req.method==='GET'&&url==='/api/invoices')return send(res,200,data.invoices.map(i=>({...i,patient:data.patients.find(p=>p.id===i.patientId)?.name||'Unknown'})));
    if(req.method==='POST'&&url==='/api/invoices'){const b=await body(req),p=data.patients.find(x=>x.id===Number(b.patientId)),amount=Number(b.amount),description=safeText(b.description,200);if(!p||!description||!Number.isFinite(amount)||amount<0)return send(res,400,{error:'Choose a patient, description and valid amount.'});const invoice={id:data.nextInvoice++,patientId:p.id,description,amount,status:'Unpaid',date:today()};data.invoices.unshift(invoice);saveData(data);return send(res,201,invoice);}
    if(req.method==='POST'&&url.startsWith('/api/invoices/')&&url.endsWith('/pay')){const id=Number(url.split('/')[3]),invoice=data.invoices.find(x=>x.id===id);if(!invoice||invoice.status==='Paid')return send(res,409,{error:'Invoice not found or already paid.'});invoice.status='Paid';invoice.paymentNote='Demo payment record only; no funds processed.';saveData(data);return send(res,200,{invoice,notice:invoice.paymentNote});}
    return send(res,404,{error:'Not found.'});
  })().catch(e=>{console.error(e);send(res,400,{error:e.message||'Request failed.'});});
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,`http://${req.headers.host}`).pathname;if(url.startsWith('/api/'))return api(req,res,url);const file=url==='/'?'index.html':path.basename(url);const target=path.join(PUBLIC,file);fs.readFile(target,(e,b)=>{if(e)return send(res,404,{error:'Page not found.'});res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'no-store'});res.end(b);});});
server.listen(PORT,()=>console.log(`CarePoint Hospital is running at http://localhost:${PORT}\nCreate your administrator account on first use.\nLocal records are saved in src/data.json.`));
