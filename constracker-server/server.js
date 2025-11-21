import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { fail } from 'assert';

dotenv.config();
const PORT = process.env.PORT;
const app = express();
app.use(express.json());
app.use(cookieParser());

const __fileName = fileURLToPath(import.meta.url);
const __dirName = path.dirname(__fileName);
const indexDir = path.join(__dirName, "public");
const privDir = path.join(__dirName, "private");
const JWT_KEY = process.env.JWT_SECRET_KEY;

const limitRegistration = rateLimit({
    windowMs: 1000 * 60 * 20,
    max: 5,
    message: "Too many requests"
});

app.use('/', express.static(indexDir));

function authMiddleware(role){
    return function(req, res, next) {
        const isJsonReq = req.headers.accept.includes('application/json');
        const isPlainText = req.headers.accept.includes('text/plain');
        if(isJsonReq || isPlainText) {
            try {
                const cookieToken = req.cookies.token;
                if(!cookieToken) return noToken(res);
                jwt.verify(cookieToken, JWT_KEY, async(err, decoded) => {
                    if(err && err.name === "TokenExpiredError"){
                        const payload = jwt.decode(cookieToken);
                        if(payload?.id){
                            await pool.execute("UPDATE users SET is_active = 0 WHERE user_id = ?", [payload.id]);
                            return expiredToken(res);
                        }
                    }
                    if(err) return invalidToken(res);
                    req.user = decoded;
                    if(role.includes('all')) {
                        return next();
                    }
                    if(!role.includes(req.user.role)) return invalidToken(res);
                    return next(); 
                });
            } catch (error) {
                return noToken(res);
            }
        } else {
            try {
                const cookieToken = req.cookies.token;
                if(!cookieToken) return authErrorReturn(res);
                jwt.verify(cookieToken, JWT_KEY, async(err, decoded) => {
                    if(err && err.name === "TokenExpiredError") {
                        const payload = jwt.decode(cookieToken);
                        if(payload?.id){
                            await pool.execute("UPDATE users SET is_active = 0 WHERE user_id = ?", [payload.id]);
                            return authErrorReturn(res);
                        }
                    }
                    if(err) return authErrorReturn(res);
                    req.user = decoded;
                    if(role.includes('all')) {
                        return next();
                    }
                    if(!role.includes(req.user.role)) return authErrorReturn(res);
                    return next(); 
                });
            } catch (error) {
                return authErrorReturn(res);
            }
        }
    };   
}

async function clearCookies(req, res) {
    const cookieToken = req.cookies.token;
    const payload = jwt.decode(cookieToken);
    if(payload?.id) await pool.execute("UPDATE users SET is_active = 0 WHERE user_id = ?", [payload.id]);
    res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
    });
}

function validateToken(req, res) {
    const cookieToken = req.cookies.token;
    if(!cookieToken) return success(res, "No token Exists");
    jwt.verify(cookieToken, JWT_KEY, async(err) => {
        if(err && err.name === "TokenExpiredError") {
            const payload = jwt.decode(cookieToken);
            if(payload?.id){
                await pool.execute("UPDATE users SET is_active = 0 WHERE user_id = ?", [payload.id]);
                return expiredToken(res);
            }
            await clearCookies(req, res);
            return expiredToken(res);
        };
        if(err) return invalidToken(res);
        return success(res, "Valid Token");
    });
}

function showNotFound(res) {
    res.status(404).sendFile(path.join(indexDir, "404.html"));
}
function authErrorReturn(res) {
    res.redirect('/');
}
function noToken(res) {
    res.status(401).json({status: 'missing token', message: 'Missing Token'});
}
function invalidToken(res) {
    res.status(401).json({status: 'invalid token', message: 'Invalid Token'});
}
function expiredToken(res) {
    res.status(401).json({status: 'expired token', message: 'Expired Token'});
}
function success(res, message) {
    res.status(200).json({status: 'success', message: message});
}
function failed(res, status, message) {
    res.status(status).json({status: 'failed', message: message});
}
function dashboardRoleAccess(req, res) {
    const roles = [
        {role: 'admin', access: ['dashboard', 'projects', 'inventory', 'materialsRequest', 'personnel']},
        {role: 'engineer', access: ['dashboard']},
        {role: 'foreman', access: ['dashboard']}
    ];
    const userRole = roles.find(obj => obj.role === req.user.role);
    if(userRole) return res.status(200).json(userRole.access);
    return failed(res, 401, "Unauthorized Role");
}

async function getUser(uid) {
    const [result] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [uid]);
    return result.length > 0 ? result[0] : null;
}

async function isUserExist(email) {
    const [result] = await pool.execute('SELECT * FROM users WHERE email = ?;', [email]);
    return result.length > 0 ? true : false;
}

async function getAssignedProject(res, user_id, user_role) {
    let adminQuery = 'SELECT project_id, project_name FROM projects';
    try {
        let projects;
        if(user_role === 'admin'){
            const [rows] = await pool.execute(adminQuery);
            projects = rows;
        } else {
            const [rows] = await pool.execute('SELECT ap.project_id, p.project_name FROM assigned_projects ap JOIN projects p ON ap.project_id = p.project_id WHERE ap.user_id = ?;', [user_id]);
            projects = rows;
        }
        return projects;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
} 

async function getSummaryCards(res, tabName) {
    const tabSqlQueries = {
        dashboard: {
            getQuery: () => { return "SELECT COUNT(project_id) AS active_projects, (SELECT COUNT(project_id) FROM projects) AS total_projects, (SELECT COUNT(user_id) FROM users WHERE is_active) AS active_personnel, (SELECT COUNT(user_id) FROM users) AS total_personnel, (SELECT COUNT(id) FROM material_requests WHERE status = 'pending') AS pending_requests FROM projects WHERE status = 'in progress';"; }
        },
        inventory:  () => {},
        maetrialsRequest: () => {},
        personnel: () => {}
    }
    try {
        const [result] = await pool.execute(tabSqlQueries[tabName].getQuery());
        return result;
    } catch (error) {
        failed(res, 500, `Database error: ${error}`);
    }
}

async function getProjectStatus(res) {
    try {
        
        const [result] = await pool.execute(
            "SELECT (SELECT COUNT(p.project_id) FROM projects p WHERE p.status = 'in progress') AS in_progress, COUNT(p.project_id) AS planning FROM projects p WHERE status = 'planning';"
        );
        return result;
    } catch (error) {
        failed(res, 500, `Database error: ${error}`);
    }
}

async function getInprogressProjects(res) {
    try {
        const [result] = await pool.execute(
            "SELECT p.project_name, p.status as project_status, p.project_location, (SELECT COUNT(*) FROM assigned_projects ap WHERE ap.project_id = p.project_id) AS total_personnel, p.duedate, (SELECT COUNT(*) FROM project_milestones pm WHERE pm.status = 'completed' AND pm.project_id = p.project_id) AS completed_milestone, (SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.project_id) AS total_milestone FROM projects p WHERE p.status = 'in progress';"
        );
        return result;
    } catch (error) {
        failed(res, 500, `Database error: ${error}`);
    }
}

async function getAllProjects(res) {
    try {
        const [result] = await pool.execute(
            "SELECT p.project_name, p.status as project_status, p.project_location, (SELECT COUNT(*) FROM assigned_projects ap WHERE ap.project_id = p.project_id) AS total_personnel, p.duedate, (SELECT COUNT(*) FROM project_milestones pm WHERE pm.status = 'completed' AND pm.project_id = p.project_id) AS completed_milestone, (SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.project_id) AS total_milestone FROM projects p;"
        );
        return result;
    } catch (error) {
        failed(res, 500, `Database error: ${error}`);
    }
}

async function recentMaterialsRequest(res) {
    try {
        const [result] = await pool.execute("SELECT mr.id AS request_id, p.project_name, mr.priority_level, u.full_name AS requested_by, COUNT(mri.id) AS item_count, SUM(mri.quantity * i.item_price) AS cost, mr.status, mr.created_at AS request_date FROM material_requests mr JOIN material_request_items mri ON mr.id = mri.mr_id JOIN projects p ON mr.project_id = p.project_id JOIN users u ON mr.user_id = u.user_id JOIN items i ON mri.item_id = i.item_id GROUP BY mr.id;");
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}


app.get('/admin/dashboard', authMiddleware(['admin']), (req, res) => {
    if(req.user.role !== "admin") return failed(res, 401, "Authorization Failed");
    res.sendFile(path.join(privDir, 'admin', 'adminDashboard.html'));
});

app.get('/admin/:jsFile', authMiddleware(['admin']), (req, res) => {
    const file = req.params.jsFile;
    res.sendFile(path.join(privDir, 'admin', 'adminJs', file));
});

app.get('/user/dashboard', authMiddleware(['engineer', 'foreman']), (req, res) => {
    if(req.user.role === "admin") return  failed(res, 401, "Authorization Failed");
    res.sendFile(path.join(privDir, 'user', 'userDashboard.html'));
});

app.get('/user/:jsFile', authMiddleware(['engineer', 'foreman']), (req, res) => {
    const file = req.params.jsFile;
    res.sendFile(path.join(privDir, 'user', 'userJs', file));
});

app.get('/mainJs/:jsFile', authMiddleware(['all']), (req, res) => {
    const file = req.params.jsFile;
    res.sendFile(path.join(privDir, 'privateJs', file));
});

app.post('/registerUser', limitRegistration, async(req, res) => {
    if(!req.body) return showNotFound(res);
    const { email, password, role, full_name } = req.body;
    const hashedPass = await bcrypt.hash(password, 10);
    if(await isUserExist(email)) return failed(res, 400, "User already exists");
    try {
        const [result] = await pool.execute(
            'INSERT INTO users (email, password, role, full_name) VALUES (?, ?, ?, ?)',
            [email, hashedPass, role, full_name]
        );
        res.status(200).json({status: "success", message: "Registered Successfully", id: result.insertId});
    } catch (error) {
        res.status(500).json({status: "failed", message: "Database error", error: error});
    }
});

app.post('/login', async(req, res) => {
    if(!req.body) return showNotFound(res);;
    const { email, password } = req.body;
    try {
        const [result] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        if(result.length === 0) return failed(res, 401, "Invalid Credentials");
        const user = result[0];
        const match = await bcrypt.compare(password, user.password);
        if(!match) return failed(res, 401, "Invalid Credentials");
        const token = jwt.sign({id: user.user_id, role: user.role}, JWT_KEY, {expiresIn: "15m"});
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 1000 * 3600
        });
        await pool.execute("UPDATE users SET is_active = 1 WHERE user_id = ?", [user.user_id]);
        res.status(200).json({status: "success", message: "Logged in successfully", role: user.role});
    } catch (error) {
        res.status(500).json({status: "failed", message: "Database error", error: error});
    } 
});

app.get('/profile', authMiddleware(['all']), async(req, res) => {
    try {
        const user = await getUser(req.user.id);
        if(!user) return failed(res, 404, "User not found");
        res.status(200).json(user);
    } catch (error) {
        failed(res, 500, "Database error");
    }
});

app.get('/api/projects', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getAssignedProject(res, req.user.id, req.user.role));
});

app.get('/api/adminSummaryCards/:tabName', authMiddleware(['admin']), async(req, res) => { 
    res.status(200).json(await getSummaryCards(res, req.params.tabName));
});

app.get('/api/projectStatusGraph', authMiddleware(['admin']), async(req, res) => { 
    res.status(200).json(await getProjectStatus(res));
});

app.get('/api/allProjects', authMiddleware(['admin', 'engineer']), async(req, res) => { 
    res.status(200).json(await getAllProjects(res));
});

app.get('/api/inprogressProjects', authMiddleware(['admin']), async(req, res) => { 
    res.status(200).json(await getInprogressProjects(res));
});

app.get('/api/recentMatReqs', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await recentMaterialsRequest(res));
});

app.get('/access', authMiddleware(['all']), (req, res) => {
    dashboardRoleAccess(req, res);
});

app.get('/checkToken', (req, res) => {
    validateToken(req, res);
});

app.get('/logout', async(req, res) => {
    await clearCookies(req, res);
    success(res, "Logged out successfully.");
});

app.use((req, res) => {
    showNotFound(res);
});

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});