import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path, { join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

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
        {role: 'admin', access: ['dashboard', 'projects', 'inventory', 'materialsRequest', 'personnel', 'logs']},
        {role: 'engineer', access: ['dashboard', 'logs']},
        {role: 'foreman', access: ['dashboard', 'logs']},
        {role: 'project manager', access: ['dashboard', 'logs']}
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

async function getAllMilestones(res, projectId) {
    try {
        const [result] = await pool.execute('SELECT pm.*, IFNULL(SUM(t.weights / 100 * t.task_progress), 0) AS milestone_progress FROM project_milestones pm LEFT JOIN tasks t ON pm.id = t.milestone_id WHERE pm.project_id = ? GROUP BY pm.id;', [projectId]);
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getMilestone(res, milestoneId) {
    try {
        const [result] = await pool.execute('SELECT pm.*, IFNULL(SUM(t.weights / 100 * t.task_progress), 0) AS milestone_progress FROM project_milestones pm LEFT JOIN tasks t ON pm.id = t.milestone_id WHERE pm.id = ? GROUP BY pm.id;', [milestoneId]);
        return result[0];
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getAllTasks(res, milestoneId) {
    try {
        const [result] = await pool.execute('SELECT * FROM tasks WHERE milestone_id = ?;', [milestoneId]);
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getTask(res, taskId) {
    try {
        const [result] = await pool.execute('SELECT * FROM tasks WHERE id = ?;', [taskId]);
        return result[0];
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getProjectCardData(res, project_id) {
    try {
        const [result] = await pool.execute('SELECT *, (SELECT SUM(weights / 100 * milestone_progress) AS milestone_progress FROM (SELECT p.weights, SUM(t.weights / 100 * t.task_progress) AS milestone_progress FROM project_milestones p JOIN tasks t ON p.id = t.milestone_id WHERE p.project_id = ? GROUP BY p.id) AS m) AS progress FROM projects WHERE project_id = ?;', [project_id, project_id]);
        return result[0];
    } catch (error) {
        failed(res, 500, `Database Error ${error}`);
    }
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
            "SELECT (SELECT COUNT(p.project_id) FROM projects p WHERE p.status = 'in progress') AS in_progress, (SELECT COUNT(p.project_id) FROM projects p WHERE p.status = 'completed') AS completed, COUNT(p.project_id) AS planning FROM projects p WHERE status = 'planning';"
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

async function createLogDetails(res, type, action, logId, logDetailsObj) {
    try {
        let logDetailQuery;
        let logDetailParams = [];
        if(type === 'non-item') {
            if(action === 'edit') {
                for (const logDetailObj of logDetailsObj) {
                    logDetailQuery = "INSERT INTO log_edit_details (log_id, var_name, old_value, new_value, label) VALUES (?, ?, ?, ?, ?)"
                    logDetailParams = [logId, logDetailObj.varName, logDetailObj.oldVal, logDetailObj.newVal, logDetailObj.label];
                    const [result] = await pool.execute(logDetailQuery, logDetailParams);    
                }          
            } else {

            }
        } else {
            if(action === 'edit') {

            } else {

            }
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function createLogs(res, req, body) {
    try {
        const [result] = await pool.execute("INSERT INTO logs (log_name, project_id, type, action, created_by) VALUES (?, ?, ?, ?, ?)", [body.logName, body.projectId, body.type, body.action, req.user.id]);
        await createLogDetails(res, body.type, body.action, result.insertId, body.logDetails);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

function filterQuery(defaultQuery, role, assignedProjects, filters, joinAbr = null) {
    let filteredQuery = defaultQuery;
    let filterParams = [];
    
    // Normalize project and category filters to arrays if they are single strings
    let projectsFilter = filters.project;
    if (projectsFilter && projectsFilter !== "all" && !Array.isArray(projectsFilter)) {
        projectsFilter = [projectsFilter];
    }
    let categoryFilter = filters.category;
    if (categoryFilter && categoryFilter !== "all" && !Array.isArray(categoryFilter)) {
        categoryFilter = [categoryFilter];
    }

    if(assignedProjects.length === 0 && role !== "admin") {
        filteredQuery += ` WHERE ${joinAbr}project_id = 'NULL'`;
        return { filteredQuery, filterParams };
    }
    if(assignedProjects) filterParams = assignedProjects;
    if(role !== 'admin') {
        const placeholders = filterParams.map(() => "?").join(",");
        filteredQuery += ` WHERE ${joinAbr}project_id IN(${placeholders})`;
    } else {
        filteredQuery += ` WHERE ${joinAbr}project_id IN (SELECT project_id FROM projects)`;
        filterParams = [];
    }
    
    if(filters.name && filters.name !== "all") {
        if(filters.searchType === 'username') {
            filteredQuery += (` AND u.full_name LIKE ?`);
            filterParams.push(`${filters.name}%`);
        } else if(filters.searchType === 'itemName') {
            filteredQuery += (` AND i.item_name LIKE ?`);
            filterParams.push(`${filters.name}%`);
        }
    }
    
    if(projectsFilter && projectsFilter !== "all") {
        const projectPlaceholders = projectsFilter.map(() => "?").join(",");
        for (const project of projectsFilter) {
            filterParams.push(project);
        }
        filteredQuery += (` AND ${joinAbr}project_id IN(${projectPlaceholders})`);
    }
    
    if(filters.dateFrom && filters.dateFrom !== "all") {
        filteredQuery += (` AND ${joinAbr}created_at >= ?`);
        filterParams.push(filters.dateFrom);
    }
    if(filters.dateTo && filters.dateTo !== "all") {
        filteredQuery += (` AND ${joinAbr}created_at <= ?`);
        filterParams.push(filters.dateTo);
    }
    
    if(categoryFilter && categoryFilter !== "all") {
        const categoryPlaceholders = categoryFilter.map(() => "?").join(",");
        for (const category of categoryFilter) {
            filterParams.push(category);
        }
        filteredQuery += (` AND i.item_category IN(${categoryPlaceholders})`);
    }

    if(filters.recent) {
        if(filters.recent === "newest") {
            filteredQuery += (` ORDER BY ${joinAbr}created_at DESC`);
        } else {
            filteredQuery += (` ORDER BY ${joinAbr}created_at ASC`);
        }
    } else {
        filteredQuery += (` ORDER BY ${joinAbr}created_at DESC`);
    }

    return {filteredQuery, filterParams};
}

async function getLogs(res, role, assignedProjects, filters) {
    const {filteredQuery, filterParams} = filterQuery("SELECT l.*, p.project_name, u.full_name FROM logs l JOIN projects p ON l.project_id = p.project_id JOIN users u ON l.created_by = u.user_id", role, assignedProjects, filters, 'l.');
    // console.log(`Eto query: ${filteredQuery}`);
    // console.log(`Eto params: ${filterParams}`);
    try {
        const [result] = await pool.execute(filteredQuery, filterParams);
        // console.log(`eto pool query: ${filteredQuery}`);
        // console.log(`eto result: `, result);
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateTaskWeights(res, body) {
    try {
        let allUpdated = true;
        for (const task of body) {
            const [result] =  await pool.execute("UPDATE tasks SET weights = ? WHERE id = ?", [task.value, task.id]);
            if(!result.affectedRows > 0) allUpdated = false;
        }
        if(allUpdated) return; 
        return res.status(500).json({message: "Failed to update all the weights"});
        
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateMilestoneWeights(res, body) {
    try {
        let allUpdated = true;
        for (const milestone of body) {
            const [result] =  await pool.execute("UPDATE project_milestones SET weights = ? WHERE id = ?", [milestone.value, milestone.id]);
            if(!result.affectedRows > 0) allUpdated = false;
        }
        if(allUpdated) return; 
        return res.status(500).json({message: "Failed to update all the weights"});
        
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateMilestone(res, body) {
    try {
        const [result] = await pool.execute("UPDATE project_milestones SET milestone_name = ?, milestone_description = ?, duedate = ?", [body.name, body.description, body.duedate]);
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateTask(res, body) {
    try {
        const [result] = await pool.execute("UPDATE tasks SET task_name = ?, task_progress = ?", [body.name, body.progress]);
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getSelection(res, req, type) {
    try {
        let selectionQuery;
        if(type === 'project') {
            if(req.user.role === 'admin') {
                selectionQuery = 'SELECT project_id AS id, project_name AS name FROM projects';
                const [result] = await pool.execute(selectionQuery);
                return result;
            } else {
                const projectPlaceholders = req.user.projects.map(() => "?").join(",");
                selectionQuery = `SELECT project_id AS id, project_name AS name FROM projects WHERE project_id IN(${projectPlaceholders})`;
                const [result] = await pool.execute(selectionQuery, req.user.projects);
                return result;
            }
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getCategories(res) {
    try {
        const [result] = await pool.execute('SELECT DISTINCT item_category AS id, item_category AS name FROM items');
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

app.get('/api/selection/:type', authMiddleware(['all']), async(req, res) => {
    if (req.params.type === 'category') {
        res.status(200).json(await getCategories(res));
    } else {
        res.status(200).json(await getSelection(res, req, req.params.type));    
    }
});

app.post('/api/edit/tasks', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    await updateTask(res, req.body);
    res.status(200).json({message: 'Saved successfully'});
});

app.post('/api/edit/milestones', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    await updateMilestone(res, req.body);
    res.status(200).json({message: 'Saved successfully'});
}); 

app.post('/api/edit/milestones/weights', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    await updateMilestoneWeights(res, req.body);
    res.status(200).json({message: 'Saved weights successfully'});
});

app.post('/api/edit/tasks/weights', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    await updateTaskWeights(res, req.body);
    res.status(200).json({message: 'Saved weights successfully'});
});

app.get('/api/logs', authMiddleware(['all']), async(req, res) => {
    const filters = req.query;
    //console.log(`These are the filters`, filters);
    res.status(200).json(await getLogs(res, req.user.role, req.user.projects, filters));
});

app.post('/api/logs', authMiddleware(['all']), async(req, res) => {
    await createLogs(res, req, req.body)
    res.status(200).json({message: 'success'});
})

app.get('/api/logs/:logId/details', authMiddleware(['all']), async(req, res) => {
    const { logId } = req.params;
    try {
        const [logResult] = await pool.execute("SELECT l.*, p.project_name, u.full_name FROM logs l JOIN projects p ON l.project_id = p.project_id JOIN users u ON l.created_by = u.user_id WHERE l.log_id = ?", [logId]);
        if (logResult.length === 0) {
            return failed(res, 404, 'Log not found');
        }
        const log = logResult[0];

        if (log.action === 'edit') {
            const [detailsResult] = await pool.execute("SELECT * FROM log_edit_details WHERE log_id = ?", [logId]);
            log.details = detailsResult;
        } else {
            const [detailsResult] = await pool.execute("SELECT * FROM log_details WHERE log_id = ?", [logId]);
            log.details = detailsResult;
        }
        
        res.status(200).json(log);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.get('/admin/dashboard', authMiddleware(['admin']), (req, res) => {
    if(req.user.role !== "admin") return failed(res, 401, "Authorization Failed");
    res.sendFile(path.join(privDir, 'admin', 'adminDashboard.html'));
});

app.get('/admin/:jsFile', authMiddleware(['admin']), (req, res) => {
    const file = req.params.jsFile;
    res.sendFile(path.join(privDir, 'admin', 'adminJs', file));
});

app.get('/user/dashboard', authMiddleware(['engineer', 'project manager', 'foreman']), (req, res) => {
    if(req.user.role === "admin") return  failed(res, 401, "Authorization Failed");
    res.sendFile(path.join(privDir, 'user', 'userDashboard.html'));
});

app.get('/user/:jsFile', authMiddleware(['engineer', 'project manager', 'foreman']), (req, res) => {
    const file = req.params.jsFile;
    res.sendFile(path.join(privDir, 'user', 'userJs', file));
});

app.get('/image/:imageName', authMiddleware(['all']), (req, res) => {
    const image = req.params.imageName;
    res.sendFile(path.join(privDir, 'privateAssets', 'pictures', image));
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
    if(!req.body) return showNotFound(res);
    const { email, password } = req.body;
    try {
        const [result] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        if(result.length === 0) return failed(res, 401, "Invalid Credentials");
        const user = result[0];
        const projects = [];
        const [assignedProjects] = await pool.execute('SELECT project_id FROM assigned_projects WHERE user_id = ?', [user.user_id]);
        for (const assigned of assignedProjects) {
            projects.push(assigned.project_id);
        }
        const match = await bcrypt.compare(password, user.password);
        if(!match) return failed(res, 401, "Invalid Credentials");
        const isProduction = process.env.DEV_ENV === "production";
        const token = jwt.sign({id: user.user_id, role: user.role, projects: user.role !== "admin" ? projects : []}, JWT_KEY, {expiresIn: "15m"});
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
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

app.get('/api/milestones/:projectId', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getAllMilestones(res, req.params.projectId));
});

app.get('/api/milestone/:milestoneId', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getMilestone(res, req.params.milestoneId));
});

app.get('/api/tasks/:milestoneId', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getAllTasks(res, req.params.milestoneId));
});

app.get('/api/task/:taskId', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getTask(res, req.params.taskId));
});

// Milestones
app.post('/api/milestones', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    const { milestone_name, milestone_description, project_id, duedate, weights } = req.body;
    const { id: userId } = req.user;

    if (!milestone_name || !project_id || !duedate) {
        return failed(res, 400, 'Missing required fields: milestone_name, project_id, and duedate are required.');
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO project_milestones (milestone_name, milestone_description, project_id, duedate, weights, updated_by) VALUES (?, ?, ?, ?, ?, ?)',
            [milestone_name, milestone_description, project_id, duedate, weights || 0, userId]
        );
        const milestoneId = result.insertId;

        // Create a log entry
        const logData = {
            logName: `created milestone ${milestone_name}`,
            projectId: project_id,
            type: 'non-item',
            action: 'create',
        };
        await createLogs(res, req, logData);

        const newMilestone = await getMilestone(res, milestoneId);
        res.status(201).json(newMilestone);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.put('/api/milestones/:milestoneId', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    const { milestoneId } = req.params;
    const { milestone_name, milestone_description, duedate, weights, status } = req.body;
    const { id: userId } = req.user;

    try {
        const oldMilestone = await getMilestone(res, milestoneId);
        if (!oldMilestone) {
            return failed(res, 404, 'Milestone not found.');
        }

        const updatedFields = {
            milestone_name: milestone_name !== undefined ? milestone_name : oldMilestone.milestone_name,
            milestone_description: milestone_description !== undefined ? milestone_description : oldMilestone.milestone_description,
            duedate: duedate !== undefined ? duedate : oldMilestone.duedate,
            weights: weights !== undefined ? weights : oldMilestone.weights,
            status: status !== undefined ? status : oldMilestone.status,
        };

        await pool.execute(
            'UPDATE project_milestones SET milestone_name = ?, milestone_description = ?, duedate = ?, weights = ?, status = ?, updated_by = ? WHERE id = ?',
            [updatedFields.milestone_name, updatedFields.milestone_description, updatedFields.duedate, updatedFields.weights, updatedFields.status, userId, milestoneId]
        );

        const logDetails = [];
        if (milestone_name !== undefined && milestone_name !== oldMilestone.milestone_name) {
            logDetails.push({ varName: 'milestone_name', oldVal: oldMilestone.milestone_name, newVal: milestone_name, label: 'Milestone Name' });
        }
        if (milestone_description !== undefined && milestone_description !== oldMilestone.milestone_description) {
            logDetails.push({ varName: 'milestone_description', oldVal: oldMilestone.milestone_description, newVal: milestone_description, label: 'Milestone Description' });
        }
        if (duedate !== undefined && duedate !== oldMilestone.duedate) {
            logDetails.push({ varName: 'duedate', oldVal: oldMilestone.duedate, newVal: duedate, label: 'Due Date' });
        }
        if (weights !== undefined && weights !== oldMilestone.weights) {
            logDetails.push({ varName: 'weights', oldVal: oldMilestone.weights, newVal: weights, label: 'Weights' });
        }
        if (status !== undefined && status !== oldMilestone.status) {
            logDetails.push({ varName: 'status', oldVal: oldMilestone.status, newVal: status, label: 'Status' });
        }

        if (logDetails.length > 0) {
            const logData = {
                logName: `updated milestone ${oldMilestone.milestone_name}`,
                projectId: oldMilestone.project_id,
                type: 'non-item',
                action: 'edit',
                logDetails: logDetails
            };
            await createLogs(res, req, logData);
        }

        const updatedMilestone = await getMilestone(res, milestoneId);
        res.status(200).json(updatedMilestone);

    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.delete('/api/milestones/:milestoneId', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    const { milestoneId } = req.params;

    try {
        const milestone = await getMilestone(res, milestoneId);
        if (!milestone) {
            return failed(res, 404, 'Milestone not found.');
        }

        await pool.execute('DELETE FROM project_milestones WHERE id = ?', [milestoneId]);

        const logData = {
            logName: `deleted milestone ${milestone.milestone_name}`,
            projectId: milestone.project_id,
            type: 'non-item',
            action: 'delete',
        };
        await createLogs(res, req, logData);

        res.status(200).json({ status: 'success', message: 'Milestone deleted successfully.' });
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

// Tasks
app.post('/api/tasks', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    const { milestone_id, task_name, duedate, weights } = req.body;
    const { id: userId } = req.user;

    if (!milestone_id || !task_name || !duedate) {
        return failed(res, 400, 'Missing required fields: milestone_id, task_name, and duedate are required.');
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO tasks (milestone_id, task_name, duedate, weights, updated_by) VALUES (?, ?, ?, ?, ?)',
            [milestone_id, task_name, duedate, weights || 0, userId]
        );
        const taskId = result.insertId;

        const milestone = await getMilestone(res, milestone_id);

        const logData = {
            logName: `created task ${task_name} for milestone ${milestone.milestone_name}`,
            projectId: milestone.project_id,
            type: 'non-item',
            action: 'create',
        };
        await createLogs(res, req, logData);

        const newTask = await getTask(res, taskId);
        res.status(201).json(newTask);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.put('/api/tasks/:taskId', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    const { taskId } = req.params;
    const { task_name, task_progress, status, duedate, weights } = req.body;
    const { id: userId } = req.user;

    try {
        const oldTask = await getTask(res, taskId);
        if (!oldTask) {
            return failed(res, 404, 'Task not found.');
        }

        const updatedFields = {
            task_name: task_name !== undefined ? task_name : oldTask.task_name,
            task_progress: task_progress !== undefined ? task_progress : oldTask.task_progress,
            status: status !== undefined ? status : oldTask.status,
            duedate: duedate !== undefined ? duedate : oldTask.duedate,
            weights: weights !== undefined ? weights : oldTask.weights,
        };

        await pool.execute(
            'UPDATE tasks SET task_name = ?, task_progress = ?, status = ?, duedate = ?, weights = ?, updated_by = ? WHERE id = ?',
            [updatedFields.task_name, updatedFields.task_progress, updatedFields.status, updatedFields.duedate, updatedFields.weights, userId, taskId]
        );

        const milestone = await getMilestone(res, oldTask.milestone_id);
        const logDetails = [];
        if (task_name !== undefined && task_name !== oldTask.task_name) {
            logDetails.push({ varName: 'task_name', oldVal: oldTask.task_name, newVal: task_name, label: 'Task Name' });
        }
        if (task_progress !== undefined && task_progress !== oldTask.task_progress) {
            logDetails.push({ varName: 'task_progress', oldVal: oldTask.task_progress, newVal: task_progress, label: 'Task Progress' });
        }
        if (status !== undefined && status !== oldTask.status) {
            logDetails.push({ varName: 'status', oldVal: oldTask.status, newVal: status, label: 'Status' });
        }
        if (duedate !== undefined && duedate !== oldTask.duedate) {
            logDetails.push({ varName: 'duedate', oldVal: oldTask.duedate, newVal: duedate, label: 'Due Date' });
        }
        if (weights !== undefined && weights !== oldTask.weights) {
            logDetails.push({ varName: 'weights', oldVal: oldTask.weights, newVal: weights, label: 'Weights' });
        }

        if (logDetails.length > 0) {
            const logData = {
                logName: `updated task ${oldTask.task_name} from milestone ${milestone.milestone_name}`,
                projectId: milestone.project_id,
                type: 'non-item',
                action: 'edit',
                logDetails: logDetails
            };
            await createLogs(res, req, logData);
        }

        const updatedTask = await getTask(res, taskId);
        res.status(200).json(updatedTask);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.delete('/api/tasks/:taskId', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    const { taskId } = req.params;

    try {
        const task = await getTask(res, taskId);
        if (!task) {
            return failed(res, 404, 'Task not found.');
        }

        const milestone = await getMilestone(res, task.milestone_id);

        await pool.execute('DELETE FROM tasks WHERE id = ?', [taskId]);

        const logData = {
            logName: `deleted task ${task.task_name} from milestone ${milestone.milestone_name}`,
            projectId: milestone.project_id,
            type: 'non-item',
            action: 'delete',
        };
        await createLogs(res, req, logData);

        res.status(200).json({ status: 'success', message: 'Task deleted successfully.' });
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.get('/api/getProjectCard/:projectId', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getProjectCardData(res, req.params.projectId));
});

app.get('/api/myProjects', authMiddleware(['all']), async(req, res) => {
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