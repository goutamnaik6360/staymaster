const pool = require('./db/pool');
const roles = {admin:['*'],manager:['*'],receptionist:['dashboard','rooms','guests','reservations','invoices','housekeeping','notifications'],housekeeping:['dashboard','rooms','housekeeping','notifications'],accountant:['dashboard','invoices','reports','notifications']};
function requireAuth(req,res,next){if(!req.session.user)return res.status(401).json({error:'Please sign in.'});next();}
function requireRole(...allowed){return(req,res,next)=>{if(!req.session.user)return res.status(401).json({error:'Please sign in.'});if(!allowed.includes(req.session.user.role))return res.status(403).json({error:'You do not have permission for this action.'});next();};}
async function audit(req,action,entity,id,details={}){await pool.query('INSERT INTO audit_logs(user_id,action,entity,entity_id,details) VALUES($1,$2,$3,$4,$5)',[req.session.user?.id||null,action,entity,id,details]);}
module.exports={roles,requireAuth,requireRole,audit};
