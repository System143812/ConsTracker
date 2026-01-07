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
        {role: 'admin', access: ['dashboard', 'projects', 'inventory', 'materialsRequest', 'personnel', 'logs', 'materials']},
        {role: 'engineer', access: ['dashboard', 'logs', 'materials']},
        {role: 'foreman', access: ['dashboard', 'logs', 'materials']},
        {role: 'project manager', access: ['dashboard', 'logs', 'materials']}
    ];
    const userRole = roles.find(obj => obj.role === req.user.role);
    if(userRole) {
        // Check if user has no assigned projects and if 'materials' is in their access
        if (req.user.projects && req.user.projects.length === 0 && userRole.access.includes('materials')) {
            // Remove 'materials' from their access list
            userRole.access = userRole.access.filter(item => item !== 'materials');
        }
        return res.status(200).json(userRole.access);
    }
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
        const [result] = await pool.execute("SELECT mr.id AS request_id, p.project_name, mr.priority_level, u.full_name AS requested_by, COUNT(mri.id) AS item_count, SUM(mri.quantity * i.price) AS cost, mr.status, mr.created_at AS request_date FROM material_requests mr JOIN material_request_items mri ON mr.id = mri.mr_id JOIN projects p ON mr.project_id = p.project_id JOIN users u ON mr.user_id = u.user_id JOIN items i ON mri.item_id = i.item_id GROUP BY mr.id;");
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getAllMaterialCategories(res) {
    try {
        const [result] = await pool.execute('SELECT category_id AS id, category_name AS name FROM material_categories ORDER BY category_name ASC');
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getAllSuppliers(res) {
    try {
        const [result] = await pool.execute('SELECT supplier_id AS id, supplier_name AS name FROM suppliers ORDER BY supplier_name ASC');
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getAllUnits(res) {
    try {
        const [result] = await pool.execute('SELECT unit_id AS id, unit_name AS name FROM units ORDER BY unit_name ASC');
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getAllMaterials(res, role, assignedProjects, filters) {
    let defaultQuery = `
        SELECT 
            i.item_id, 
            i.item_name, 
            i.item_description, 
            i.price, 
            i.size, 
            i.status, 
            i.image_url, 
            i.created_at,
            i.created_by,
            mc.category_name,
            s.supplier_name,
            s.supplier_email,
            s.supplier_address,
            u.unit_name
        FROM 
            items i
        LEFT JOIN 
            material_categories mc ON i.category_id = mc.category_id
        LEFT JOIN 
            suppliers s ON i.supplier_id = s.supplier_id
        LEFT JOIN 
            units u ON i.unit_id = u.unit_id
    `;
    let filterParams = [];
    let whereClauses = [];
    let orderByClause = '';

    // Project filtering (materials are not project-specific, but the user's project association might still be relevant for future extensions)
    // For now, materials are available to all users with the tab, regardless of project context.
    // If we want to restrict materials by project later, we would need a junction table.
    // The user said: "this materials is available to all users no matter what project you are holding"
    // So, no project filtering for now, but keep the \`role\` and \`assignedProjects\` parameters for consistency if needed later.

    // Search by item_name
    if (filters.name && filters.name !== "all") {
        whereClauses.push(`i.item_name LIKE ?`);
        filterParams.push(`${filters.name}%`);
    }

    // Filter by category
    if (filters.category && filters.category !== "all") {
        const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
        const placeholders = categories.map(() => "?").join(",");
        whereClauses.push(`mc.category_name IN (${placeholders})`);
        filterParams.push(...categories);
    }

    // Sorting
    if (filters.sort) {
        switch (filters.sort) {
            case 'newest':
                orderByClause = 'ORDER BY i.created_at DESC';
                break;
            case 'oldest':
                orderByClause = 'ORDER BY i.created_at ASC';
                break;
            case 'atoz':
                orderByClause = 'ORDER BY i.item_name ASC';
                break;
            case 'ztoa':
                orderByClause = 'ORDER BY i.item_name DESC';
                break;
            default:
                orderByClause = 'ORDER BY i.created_at DESC'; // Default sort
                break;
        }
    } else {
        orderByClause = 'ORDER BY i.created_at DESC'; // Default sort
    }

    let finalQuery = defaultQuery;
    if (whereClauses.length > 0) {
        finalQuery += ` WHERE ` + whereClauses.join(' AND ');
    }
    finalQuery += ` ${orderByClause}`;

    try {
        const [result] = await pool.execute(finalQuery, filterParams);
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}


async function createMaterial(res, materialData, userId, userRole) {
    const { item_name, item_description, price, unit_id, category_id, supplier_id, size, image_url } = materialData;
    const status = userRole === 'engineer' ? 'approved' : 'pending';
    try {
        const [result] = await pool.execute(
            'INSERT INTO items (item_name, item_description, price, unit_id, category_id, supplier_id, size, status, created_by, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [item_name, item_description, price, unit_id, category_id, supplier_id, size, status, userId, image_url || 'constrackerWhite.svg']
        );
        return result.insertId;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function approveMaterial(res, materialId, userId) {
    try {
        const [result] = await pool.execute(
            'UPDATE items SET status = "approved", approved_by = ? WHERE item_id = ?',
            [userId, materialId]
        );
        return result.affectedRows > 0;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateMaterial(res, materialId, materialData, userId) {
    const { item_name, item_description, price, unit_id, category_id, supplier_id, size, image_url } = materialData;
    try {
        const [result] = await pool.execute(
            'UPDATE items SET item_name = ?, item_description = ?, price = ?, unit_id = ?, category_id = ?, supplier_id = ?, size = ?, updated_by = ?, image_url = ? WHERE item_id = ?',
            [item_name, item_description, price, unit_id, category_id, supplier_id, size, userId, image_url || 'constrackerWhite.svg', materialId]
        );
        return result.affectedRows > 0;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function deleteMaterial(res, materialId) {
    try {
        const [result] = await pool.execute(
            'DELETE FROM items WHERE item_id = ?',
            [materialId]
        );
        return result.affectedRows > 0;
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

function filterLogsQuery(defaultQuery, role, assignedProjects, filters, joinAbr = null) {
    let filteredQuery = defaultQuery;
    let filterParams = [];

    let projectsFilter = filters.project;
    if (projectsFilter && projectsFilter !== "all" && !Array.isArray(projectsFilter)) {
        projectsFilter = [projectsFilter];
    }

    if (assignedProjects.length === 0 && role !== "admin") {
        filteredQuery += ` WHERE ${joinAbr}project_id IS NULL`;
        return { filteredQuery, filterParams };
    }

    if (role !== 'admin') {
        const placeholders = assignedProjects.map(() => "?").join(",");
        filteredQuery += ` WHERE ${joinAbr}project_id IN (${placeholders})`;
        filterParams.push(...assignedProjects);
    } else {
        // No initial WHERE clause for admin, they can see all projects.
        // A WHERE clause will be added if there are other filters.
    }

    let whereClauses = [];
    if (role !== 'admin') {
        // The initial WHERE clause is already added for non-admins
    } else {
        // For admin, we start adding WHERE clauses if filters exist
    }

    if (filters.name && filters.name !== "all") {
        whereClauses.push(`u.full_name LIKE ?`);
        filterParams.push(`${filters.name}%`);
    }

    if (projectsFilter && projectsFilter !== "all") {
        const projectPlaceholders = projectsFilter.map(() => "?").join(",");
        whereClauses.push(`${joinAbr}project_id IN (${projectPlaceholders})`);
        filterParams.push(...projectsFilter);
    }

    if (filters.dateFrom && filters.dateFrom !== "all") {
        whereClauses.push(`${joinAbr}created_at >= ?`);
        filterParams.push(filters.dateFrom);
    }

    if (filters.dateTo && filters.dateTo !== "all") {
        whereClauses.push(`${joinAbr}created_at <= ?`);
        filterParams.push(filters.dateTo);
    }
    
    if (whereClauses.length > 0) {
        if (filteredQuery.includes('WHERE')) {
            filteredQuery += ' AND ' + whereClauses.join(' AND ');
        } else {
            filteredQuery += ' WHERE ' + whereClauses.join(' AND ');
        }
    }

    if (filters.sort) {
        if (filters.sort === "newest") {
            filteredQuery += ` ORDER BY ${joinAbr}created_at DESC`;
        } else {
            filteredQuery += ` ORDER BY ${joinAbr}created_at ASC`;
        }
    } else {
        filteredQuery += ` ORDER BY ${joinAbr}created_at DESC`;
    }

    return { filteredQuery, filterParams };
}

async function getLogs(res, role, assignedProjects, filters) {
    const { filteredQuery, filterParams } = filterLogsQuery(
        "SELECT l.*, p.project_name, u.full_name FROM logs l LEFT JOIN projects p ON l.project_id = p.project_id JOIN users u ON l.created_by = u.user_id",
        role,
        assignedProjects,
        filters,
        'l.'
    );
    try {
        const [result] = await pool.execute(filteredQuery, filterParams);
        return result;
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
        const [result] = await pool.execute('SELECT category_id AS id, category_name AS name FROM material_categories ORDER BY name ASC');
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

app.get('/api/materials/categories', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getAllMaterialCategories(res));
});

app.get('/api/materials/suppliers', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getAllSuppliers(res));
});

app.get('/api/materials/units', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getAllUnits(res));
});

app.get('/api/materials', authMiddleware(['all']), async(req, res) => {
    const filters = req.query;
    res.status(200).json(await getAllMaterials(res, req.user.role, req.user.projects, filters));
});

app.post('/api/materials', authMiddleware(['admin', 'engineer', 'project manager', 'foreman']), async(req, res) => {
    const { item_name } = req.body;
    const { id: userId, role: userRole } = req.user;

    if (!req.body.item_name || !req.body.price || !req.body.category_id || !req.body.supplier_id || !req.body.unit_id) {
        return failed(res, 400, 'Missing required fields: item_name, price, unit, category, and supplier are required.');
    }

    try {
        const materialId = await createMaterial(res, req.body, userId, userRole);
        const logData = {
            logName: `created material ${item_name}`,
            projectId: 0, // Materials are not project-specific, using 0 or null as placeholder
            type: 'item',
            action: 'create',
        };
        await createLogs(res, req, logData);
        const message = userRole === 'engineer' ? 'Material created and approved successfully.' : 'Material created successfully, awaiting approval.';
        res.status(201).json({ status: 'success', message, materialId });
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.put('/api/materials/:materialId/approve', authMiddleware(['engineer']), async(req, res) => {
    const { materialId } = req.params;
    const { id: userId } = req.user;

    try {
        // Fetch material to get its name for logging and to check existence
        const [materialResult] = await pool.execute('SELECT item_name, category_id, supplier_id, unit_id FROM items WHERE item_id = ?', [materialId]);
        if (materialResult.length === 0) {
            return failed(res, 404, 'Material not found.');
        }
        const material = materialResult[0];

        const success = await approveMaterial(res, materialId, userId);
        if (success) {
            const logData = {
                logName: `approved material ${material.item_name}`,
                projectId: 0,
                type: 'item',
                action: 'approved',
            };
            await createLogs(res, req, logData);
            res.status(200).json({ status: 'success', message: 'Material approved successfully.' });
        } else {
            failed(res, 400, 'Failed to approve material.');
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.put('/api/materials/:materialId', authMiddleware(['admin', 'engineer']), async(req, res) => {
    const { materialId } = req.params;
    const { id: userId } = req.user;
    const { item_name, item_description, price, unit_id, category_id, supplier_id, size, image_url } = req.body;

    try {
        // Fetch old material data for logging changes
        const [oldMaterialResult] = await pool.execute('SELECT item_name, item_description, price, unit_id, category_id, supplier_id, size, image_url FROM items WHERE item_id = ?', [materialId]);
        if (oldMaterialResult.length === 0) {
            return failed(res, 404, 'Material not found.');
        }
        const oldMaterial = oldMaterialResult[0];

        const success = await updateMaterial(res, materialId, req.body, userId);
        if (success) {
            const logDetails = [];
            // Compare fields and add to logDetails if changed
            if (item_name !== undefined && item_name !== oldMaterial.item_name) {
                logDetails.push({ varName: 'item_name', oldVal: oldMaterial.item_name, newVal: item_name, label: 'Material Name' });
            }
            if (item_description !== undefined && item_description !== oldMaterial.item_description) {
                logDetails.push({ varName: 'item_description', oldVal: oldMaterial.item_description, newVal: item_description, label: 'Description' });
            }
            if (price !== undefined && price !== oldMaterial.price) {
                logDetails.push({ varName: 'price', oldVal: oldMaterial.price, newVal: price, label: 'Base Price' });
            }
            if (unit_id !== undefined && unit_id !== oldMaterial.unit_id) { 
                const units = await getAllUnits(res);
                const oldUnit = units.find(u => u.id === oldMaterial.unit_id)?.name || oldMaterial.unit_id;
                const newUnit = units.find(u => u.id === unit_id)?.name || unit_id;
                logDetails.push({ varName: 'unit_id', oldVal: oldUnit, newVal: newUnit, label: 'Unit' });
            }
            if (category_id !== undefined && category_id !== oldMaterial.category_id) {
                const categories = await getAllMaterialCategories(res);
                const oldCategory = categories.find(c => c.id === oldMaterial.category_id)?.name || oldMaterial.category_id;
                const newCategory = categories.find(c => c.id === category_id)?.name || category_id;
                logDetails.push({ varName: 'category_id', oldVal: oldCategory, newVal: newCategory, label: 'Category' });
            }
            if (supplier_id !== undefined && supplier_id !== oldMaterial.supplier_id) {
                const suppliers = await getAllSuppliers(res);
                const oldSupplier = suppliers.find(s => s.id === oldMaterial.supplier_id)?.name || oldMaterial.supplier_id;
                const newSupplier = suppliers.find(s => s.id === supplier_id)?.name || supplier_id;
                logDetails.push({ varName: 'supplier_id', oldVal: oldSupplier, newVal: newSupplier, label: 'Supplier' });
            }
            if (size !== undefined && size !== oldMaterial.size) {
                logDetails.push({ varName: 'size', oldVal: oldMaterial.size, newVal: size, label: 'Size' });
            }
            if (image_url !== undefined && image_url !== oldMaterial.image_url) {
                logDetails.push({ varName: 'image_url', oldVal: oldMaterial.image_url, newVal: image_url, label: 'Image URL' });
            }

            if (logDetails.length > 0) {
                const logData = {
                    logName: `updated material ${oldMaterial.item_name}`,
                    projectId: 0,
                    type: 'item',
                    action: 'edit',
                    logDetails: logDetails
                };
                await createLogs(res, req, logData);
            }
            res.status(200).json({ status: 'success', message: 'Material updated successfully.' });
        } else {
            failed(res, 400, 'Failed to update material.');
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.delete('/api/materials/:materialId', authMiddleware(['admin', 'engineer']), async(req, res) => {
    const { materialId } = req.params;

    try {
        const [materialResult] = await pool.execute('SELECT item_name FROM items WHERE item_id = ?', [materialId]);
        if (materialResult.length === 0) {
            return failed(res, 404, 'Material not found.');
        }
        const material = materialResult[0];

        const success = await deleteMaterial(res, materialId);
        if (success) {
            const logData = {
                logName: `deleted material ${material.item_name}`,
                projectId: 0,
                type: 'item',
                action: 'delete',
            };
            await createLogs(res, req, logData);
            res.status(200).json({ status: 'success', message: 'Material deleted successfully.' });
        } else {
            failed(res, 400, 'Failed to delete material.');
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
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