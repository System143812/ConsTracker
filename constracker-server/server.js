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
import multer from 'multer'; // Import multer
import fs from 'fs'; // Import fs module
import crypto from 'crypto';
import nodemailer from 'nodemailer';


const __fileName = fileURLToPath(import.meta.url);
const __dirName = path.dirname(__fileName);

dotenv.config({ path: path.join(__dirName, '.env') });
console.log("CRITICAL DEBUG -> EMAIL_USER is:", process.env.EMAIL_USER);
const PORT = process.env.PORT;
const app = express();
app.use(express.json());
app.use(cookieParser());

const indexDir = path.join(__dirName, "public");
const privDir = path.join(__dirName, "private");
const JWT_KEY = process.env.JWT_SECRET_KEY;

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirName, 'public', 'itemImages'));
    },
    filename: function (req, file, cb) {
        const hash = crypto.createHash('sha256').update(file.originalname + Date.now()).digest('hex');
        const extension = path.extname(file.originalname);
        cb(null, `${hash}${extension}`);
    }
});

const upload = multer({ storage: storage });

const limitRegistration = rateLimit({
    windowMs: 1000 * 60 * 20,
    max: 5,
    message: "Too many requests"
});


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
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

// Generate random password
function generatePassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required character type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 26));
    password += 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26));
    password += '0123456789'.charAt(Math.floor(Math.random() * 10));
    password += '!@#$%^&*'.charAt(Math.floor(Math.random() * 8));
    
    // Fill the rest
    for (let i = 4; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Register route
app.post('/api/register/generate-password', async (req, res) => {
    try {
        const { email, role, fullName } = req.body;
        
        // Debugging logs (Remove these once it works)
        console.log("Checking Credentials:");
        console.log("USER:", process.env.EMAIL_USER ? "Present" : "MISSING");
        console.log("PASS:", process.env.EMAIL_PASS ? "Present" : "MISSING");

        // 1. Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email' });
        }
        if (!fullName || !fullName.trim()) {
            return res.status(400).json({ success: false, message: 'Full Name is required' });
        }

        // 2. Generate and Hash Password
        const password = crypto.randomBytes(6).toString('hex'); 
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 3. Database Update
        // Note: Using is_active = 1 to match your SQL schema
        await pool.execute(
            `INSERT INTO users (email, password, role, full_name, is_active) 
             VALUES (?, ?, ?, ?, 1) 
             ON DUPLICATE KEY UPDATE 
                password = VALUES(password), 
                role = VALUES(role), 
                full_name = VALUES(full_name)`,
            [email, hashedPassword, role, fullName]
        );
        
        // 4. Nodemailer Setup
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { 
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS 
            }
        });

        // 5. Send Email
        await transporter.sendMail({
            from: `"ConsTracker System" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Account Created - ConsTracker Access',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #333;">Welcome, ${fullName}!</h2>
                    <p>Your personnel account has been set up successfully.</p>
                    <p><strong>Login Email:</strong> ${email}</p>
                    <p><strong>Temporary Password:</strong> <code>${password}</code></p>
                    <p><strong>Assigned Role:</strong> ${role}</p>
                    <br>
                    <p style="color: #666; font-size: 12px;">Please change your password upon your first login.</p>
                </div>
            `
        });

        res.json({ success: true, message: 'Personnel registered and email sent!' });
        
    } catch (error) {
        console.error("Registration Error:", error);
        // Sending the specific error message back to the frontend for debugging
        res.status(500).json({ success: false, message: error.message });
    }
});


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
        {role: 'admin', access: ['dashboard', 'projects', 'inventory', 'materials', 'material-requests', 'assets', 'personnel', 'reports', 'analytics', 'logs']},
        {role: 'engineer', access: ['dashboard', 'materials', 'material-requests', 'assets', 'reports', 'logs']},
        {role: 'foreman', access: ['dashboard', 'materials', 'material-requests', 'assets', 'reports', 'logs']},
        {role: 'project manager', access: ['dashboard', 'materials', 'material-requests', 'assets', 'reports', 'logs']}
    ];
    const userRole = roles.find(obj => obj.role === req.user.role);
    if(userRole) {
        // Check if user has no assigned projects and if 'materials' is in their access
        if (req.user.role !== 'admin' && req.user.projects && req.user.projects.length === 0 && userRole.access.includes('materials')) {
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

async function isMaterialExist(name) {
    const [result] = await pool.execute('SELECT item_id FROM items WHERE item_name = ?', [name]);
    return result.length > 0;
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

async function updateTask(res, body) {
    const { id, task_name, task_progress, status, duedate, weights } = body;
    try {
        await pool.execute('UPDATE tasks SET task_name = ?, task_progress = ?, status = ?, duedate = ?, weights = ? WHERE id = ?', [task_name, task_progress, status, duedate, weights, id]);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateMilestone(res, body) {
    const { id, milestone_name, milestone_description, duedate, weights, status } = body;
    try {
        await pool.execute('UPDATE project_milestones SET milestone_name = ?, milestone_description = ?, duedate = ?, weights = ?, status = ? WHERE id = ?', [milestone_name, milestone_description, duedate, weights, status, id]);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateMilestoneWeights(res, body) {
    try {
        for (const milestone of body) {
            await pool.execute('UPDATE project_milestones SET weights = ? WHERE id = ?', [milestone.value, milestone.id]);
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateTaskWeights(res, body) {
    try {
        for (const task of body) {
            await pool.execute('UPDATE tasks SET weights = ? WHERE id = ?', [task.value, task.id]);
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getProjectCardData(res, project_id) {
    try {
        const [result] = await pool.execute('SELECT *, (SELECT SUM(weights / 100 * milestone_progress) AS milestone_progress FROM (SELECT p.weights, SUM(t.weights / 100 * t.task_progress) AS milestone_progress FROM project_milestones p JOIN tasks t ON p.id = t.milestone_id WHERE p.project_id = ? GROUP BY p.id) AS m) AS progress FROM projects WHERE project_id = ?;', [project_id, project_id]);
        return result[0];
    }  catch (error) {
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
            getQuery: () => { 
                return `
                    SELECT 
                        (SELECT COUNT(project_id) FROM projects WHERE status = 'in progress') AS active_projects, 
                        (SELECT COUNT(project_id) FROM projects) AS total_projects, 
                        (SELECT COUNT(user_id) FROM users WHERE is_active) AS active_personnel, 
                        (SELECT COUNT(user_id) FROM users) AS total_personnel, 
                        (SELECT COUNT(id) FROM material_requests WHERE status = 'pending') AS pending_requests,
                        (SELECT COUNT(id) FROM material_requests WHERE current_stage IN ('ordered', 'awaiting_delivery')) AS awaiting_deliveries,
                        (SELECT COUNT(id) FROM material_requests WHERE current_stage = 'partially_verified') AS partially_verified,
                        (SELECT COUNT(id) FROM material_requests WHERE current_stage = 'disputed') AS disputed_requests
                `;
            }
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

async function getAllProjects(res, filters) {
    const { page = 1, limit = 10, name, dateFrom, dateTo, sort } = filters;
    console.log(sort);
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    let baseQuery = `
        FROM 
            projects p
    `;
    let filterParams = [];
    let whereClauses = [];

    if (name && name !== "all") {
        whereClauses.push(`p.project_name LIKE ?`);
        filterParams.push(`%${name}%`);
    }

    if (dateFrom && dateFrom !== "all") {
        whereClauses.push(`p.created_at >= ?`);
        filterParams.push(dateFrom);
    }

    if (dateTo && dateTo !== "all") {
        whereClauses.push(`p.created_at <= ?`);
        filterParams.push(dateTo);
    }
    
    let whereClause = '';
    if (whereClauses.length > 0) {
        whereClause = ` WHERE ` + whereClauses.join(' AND ');
    }

    let orderByClause = '';
    if (sort) {
        switch (sort) {
            case 'newest':
                orderByClause = 'ORDER BY p.created_at DESC, p.project_id DESC';
                break;
            case 'oldest':
                orderByClause = 'ORDER BY p.created_at ASC, p.project_id ASC';
                break;
            case 'atoz':
                orderByClause = 'ORDER BY p.project_name ASC, p.project_id ASC';
                break;
            case 'ztoa':
                orderByClause = 'ORDER BY p.project_name DESC, p.project_id DESC';
                break;
            default:
                orderByClause = 'ORDER BY p.created_at DESC, p.project_id DESC';
                break;
        }
    } else {
        orderByClause = 'ORDER BY p.created_at DESC, p.project_id DESC';
    }

    const countQuery = `SELECT COUNT(p.project_id) AS total ${baseQuery} ${whereClause}`;
    
    const dataQuery = `
        SELECT 
            p.project_id, p.project_name, p.status as project_status, p.project_location, p.created_at,
            (SELECT COUNT(*) FROM assigned_projects ap WHERE ap.project_id = p.project_id) AS total_personnel, 
            p.duedate, 
            (SELECT COUNT(*) FROM project_milestones pm WHERE pm.status = 'completed' AND pm.project_id = p.project_id) AS completed_milestone, 
            (SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.project_id) AS total_milestone 
        ${baseQuery}
        ${whereClause}
        ${orderByClause}
        LIMIT ${limitInt}
        OFFSET ${offset}
    `;

    try {
        const [countResult] = await pool.execute(countQuery, filterParams);
        const total = countResult[0].total;

        const [projects] = await pool.execute(dataQuery, filterParams);
        
        return { projects, total };
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
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

async function createSupplier(res, supplierData) {
    const { name, address, contact_number, email } = supplierData;
    try {
        const [result] = await pool.execute(
            'INSERT INTO suppliers (supplier_name, supplier_address, supplier_contact, supplier_email) VALUES (?, ?, ?, ?)',
            [name, address, contact_number, email]
        );
        return result.insertId;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateSupplier(res, supplierId, supplierData) {
    const { name, address, contact_number, email } = supplierData;
    try {
        const [result] = await pool.execute(
            'UPDATE suppliers SET supplier_name = ?, supplier_address = ?, supplier_contact = ?, supplier_email = ? WHERE supplier_id = ?',
            [name, address, contact_number, email, supplierId]
        );
        return result.affectedRows > 0;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function deleteSupplier(res, supplierId) {
    try {
        const [result] = await pool.execute('DELETE FROM suppliers WHERE supplier_id = ?', [supplierId]);
        return result.affectedRows > 0;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function createCategory(res, categoryData) {
    const { name } = categoryData;
    try {
        const [result] = await pool.execute('INSERT INTO material_categories (category_name) VALUES (?)', [name]);
        return result.insertId;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateCategory(res, categoryId, categoryData) {
    const { name } = categoryData;
    try {
        const [result] = await pool.execute('UPDATE material_categories SET category_name = ? WHERE category_id = ?', [name, categoryId]);
        return result.affectedRows > 0;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function deleteCategory(res, categoryId) {
    try {
        const [result] = await pool.execute('DELETE FROM material_categories WHERE category_id = ?', [categoryId]);
        return result.affectedRows > 0;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function createUnit(res, unitData) {
    const { name } = unitData;
    try {
        const [result] = await pool.execute('INSERT INTO units (unit_name) VALUES (?)', [name]);
        return result.insertId;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function updateUnit(res, unitId, unitData) {
    const { name } = unitData;
    try {
        const [result] = await pool.execute('UPDATE units SET unit_name = ? WHERE unit_id = ?', [name, unitId]);
        return result.affectedRows > 0;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function deleteUnit(res, unitId) {
    try {
        const [result] = await pool.execute('DELETE FROM units WHERE unit_id = ?', [unitId]);
        return result.affectedRows > 0;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function getAllMaterials(res, role, assignedProjects, filters) {
    const { page = 1, limit = 10, name, category, sort, status } = filters;
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;
    
    let baseQuery = `
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

    if (name && name !== "all") {
        whereClauses.push(`i.item_name LIKE ?`);
        filterParams.push(`%${name}%`);
    }

    if (category && category !== "all") {
        const categories = Array.isArray(category) ? category : [category];
        if (categories.length > 0) {
            const placeholders = categories.map(() => "?").join(",");
            whereClauses.push(`i.category_id IN (${placeholders})`);
            filterParams.push(...categories);
        }
    }

    if (status && status !== "all") {
        const statuses = status.split(',');
        if (statuses.length > 0) {
            const placeholders = statuses.map(() => "?").join(",");
            whereClauses.push(`i.status IN (${placeholders})`);
            filterParams.push(...statuses);
        }
    }
    
    let whereClause = '';
    if (whereClauses.length > 0) {
        whereClause = ` WHERE ` + whereClauses.join(' AND ');
    }

    let orderByClause = '';
    if (sort) {
        switch (sort) {
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
                orderByClause = 'ORDER BY i.created_at DESC';
                break;
        }
    } else {
        orderByClause = 'ORDER BY i.created_at DESC';
    }

    const countQuery = `SELECT COUNT(i.item_id) AS total ${baseQuery} ${whereClause}`;
    
    const dataQuery = `
        SELECT 
            i.item_id, i.item_name, i.item_description, i.price, i.size, 
            i.status, i.image_url, i.created_at, i.created_by,
            i.category_id, i.supplier_id, i.unit_id,
            mc.category_name, s.supplier_name, s.supplier_email,
            s.supplier_address, u.unit_name
        ${baseQuery}
        ${whereClause}
        ${orderByClause}
        LIMIT ${limitInt}
        OFFSET ${offset}
    `;

    try {
        const [countResult] = await pool.execute(countQuery, filterParams);
        const total = countResult[0].total;

        const [materials] = await pool.execute(dataQuery, filterParams);
        
        return { materials, total };
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}


async function createMaterial(res, materialData, userId, userRole) {
    const { item_name, item_description, price, unit_id, category_id, supplier_id, size, image_url, item_type, track_condition } = materialData;
    const status = (userRole === 'engineer' || userRole === 'admin') ? 'approved' : 'pending';
    try {
        const [result] = await pool.execute(
            'INSERT INTO items (item_name, item_description, price, unit_id, category_id, supplier_id, size, status, created_by, image_url, item_type, track_condition) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [item_name, item_description, price, unit_id, category_id, supplier_id, size, status, userId, image_url || 'constrackerWhite.svg', item_type, track_condition]
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
    const { item_name, item_description, price, unit_id, category_id, supplier_id, size, image_url, item_type, track_condition } = materialData;
    try {
        const [result] = await pool.execute(
            'UPDATE items SET item_name = ?, item_description = ?, price = ?, unit_id = ?, category_id = ?, supplier_id = ?, size = ?, updated_by = ?, image_url = ?, item_type = ?, track_condition = ? WHERE item_id = ?',
            [item_name, item_description, price, unit_id, category_id, supplier_id, size, userId, image_url || 'constrackerWhite.svg', item_type, track_condition, materialId]
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

async function createLogDetails(res, type, action, logId, logDetailsObj, itemId) { // added itemId
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
            }
        } else { // type === 'item'
            if(action === 'approved') {
                if (logDetailsObj && logDetailsObj.creator_id) {
                    logDetailQuery = "INSERT INTO log_details (log_id, log_details) VALUES (?, ?)";
                    logDetailParams = [logId, JSON.stringify({ creator_id: logDetailsObj.creator_id })];
                    await pool.execute(logDetailQuery, logDetailParams);
                }
            } else if(action === 'edit') {
                for (const logDetailObj of logDetailsObj) {
                    logDetailQuery = "INSERT INTO log_item_edit (log_id, item_id, var_name, old_value, new_value, label) VALUES (?, ?, ?, ?, ?, ?)";
                    logDetailParams = [logId, itemId, logDetailObj.varName, logDetailObj.oldVal, logDetailObj.newVal, logDetailObj.label];
                    const [result] = await pool.execute(logDetailQuery, logDetailParams);
                }
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
        filteredQuery += ` WHERE (${joinAbr}project_id IN (${placeholders}) OR ${joinAbr}project_id IS NULL)`;
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
        filterParams.push(`%${filters.name}%`);
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
        "SELECT l.*, p.project_name, u.full_name, ld.log_details FROM logs l LEFT JOIN projects p ON l.project_id = p.project_id LEFT JOIN users u ON l.created_by = u.user_id LEFT JOIN log_details ld on l.log_id = ld.log_id",
        role,
        assignedProjects,
        filters,
        'l.'
    );
    try {
        const [result] = await pool.execute(filteredQuery, filterParams);
        for (const log of result) {
            if (log.log_details) {
                try {
                    const details = JSON.parse(log.log_details);
                    if (details.creator_id) {
                        const [creatorResult] = await pool.execute('SELECT full_name FROM users WHERE user_id = ?', [details.creator_id]);
                        if (creatorResult.length > 0) {
                            log.creator_name = creatorResult[0].full_name;
                        }
                    }
                } catch (e) {
                    // not json
                }
            }
        }
        return result;
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
}

async function createLogs(res, req, body) {
    try {
        const [result] = await pool.execute("INSERT INTO logs (log_name, project_id, type, action, created_by) VALUES (?, ?, ?, ?, ?)", [body.logName, body.projectId, body.type, body.action, req.user.id]);
        await createLogDetails(res, body.type, body.action, result.insertId, body.logDetails, body.itemId);
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


app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/selection/:type', authMiddleware(['all']), async(req, res) => {
    if (req.params.type === 'category') {
        res.status(200).json(await getCategories(res));
    } else {
        res.status(200).json(await getSelection(res, req, req.params.type));    
    }
});

app.get('/api/users/all', async (req, res) => {
    try {
        // Correct column names: user_id instead of id
        const [rows] = await pool.execute(
            'SELECT user_id, full_name, email, is_active FROM users ORDER BY full_name ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        // Fetch users from database
        // We select full_name, email, role, and is_active (the column in your SQL)
        const [rows] = await pool.execute(
            'SELECT user_id, full_name, email, role, is_active FROM users ORDER BY full_name ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.get('/api/roles', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT DISTINCT role FROM users WHERE role IS NOT NULL');
        res.json(rows.map(row => row.role)); 
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not fetch roles' });
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
        const [logResult] = await pool.execute("SELECT l.*, p.project_name, u.full_name FROM logs l LEFT JOIN projects p ON l.project_id = p.project_id LEFT JOIN users u ON l.created_by = u.user_id WHERE l.log_id = ?", [logId]);
        if (logResult.length === 0) {
            return failed(res, 404, 'Log not found');
        }
        const log = logResult[0];

        if (log.action === 'edit') {
            if (log.type === 'item') {
                const [detailsResult] = await pool.execute("SELECT * FROM log_item_edit WHERE log_id = ?", [logId]);
                log.details = detailsResult;
            } else {
                const [detailsResult] = await pool.execute("SELECT * FROM log_edit_details WHERE log_id = ?", [logId]);
                log.details = detailsResult;
            }
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
    res.status(200).json(await getAllProjects(res, req.query));
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

app.post('/api/materials/categories', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    const { name } = req.body;
    if (!name) {
        return failed(res, 400, 'Category name is required.');
    }
    try {
        const categoryId = await createCategory(res, { name });
        res.status(201).json({ status: 'success', message: 'Category created successfully.', categoryId });
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.put('/api/materials/categories/:categoryId', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    const { categoryId } = req.params;
    const { name } = req.body;
    if (!name) {
        return failed(res, 400, 'Category name is required.');
    }
    try {
        const success = await updateCategory(res, categoryId, { name });
        if (success) {
            res.status(200).json({ status: 'success', message: 'Category updated successfully.' });
        } else {
            failed(res, 400, 'Failed to update category.');
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.delete('/api/materials/categories/:categoryId', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    const { categoryId } = req.params;
    try {
        const success = await deleteCategory(res, categoryId);
        if (success) {
            res.status(200).json({ status: 'success', message: 'Category deleted successfully.' });
        } else {
            failed(res, 400, 'Failed to delete category.');
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.get('/api/materials/suppliers', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getAllSuppliers(res));
});

app.get('/api/materials/units', authMiddleware(['all']), async(req, res) => {
    res.status(200).json(await getAllUnits(res));
});

app.post('/api/materials/units', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    const { name } = req.body;
    if (!name) {
        return failed(res, 400, 'Unit name is required.');
    }
    try {
        const unitId = await createUnit(res, { name });
        res.status(201).json({ status: 'success', message: 'Unit created successfully.', unitId });
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.put('/api/materials/units/:unitId', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    const { unitId } = req.params;
    const { name } = req.body;
    if (!name) {
        return failed(res, 400, 'Unit name is required.');
    }
    try {
        const success = await updateUnit(res, unitId, { name });
        if (success) {
            res.status(200).json({ status: 'success', message: 'Unit updated successfully.' });
        } else {
            failed(res, 400, 'Failed to update unit.');
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.delete('/api/materials/units/:unitId', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    const { unitId } = req.params;
    try {
        const success = await deleteUnit(res, unitId);
        if (success) {
            res.status(200).json({ status: 'success', message: 'Unit deleted successfully.' });
        } else {
            failed(res, 400, 'Failed to delete unit.');
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.post('/api/materials/suppliers', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    const { name, address, contact_number, email } = req.body;
    if (!name) {
        return failed(res, 400, 'Supplier name is required.');
    }
    try {
        const supplierId = await createSupplier(res, { name, address, contact_number, email });
        res.status(201).json({ status: 'success', message: 'Supplier created successfully.', supplierId });
    }  catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.put('/api/materials/suppliers/:supplierId', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    const { supplierId } = req.params;
    const { name, address, contact_number, email } = req.body;
    if (!name) {
        return failed(res, 400, 'Supplier name is required.');
    }
    try {
        const success = await updateSupplier(res, supplierId, { name, address, contact_number, email });
        if (success) {
            res.status(200).json({ status: 'success', message: 'Supplier updated successfully.' });
        } else {
            failed(res, 400, 'Failed to update supplier.');
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.delete('/api/materials/suppliers/:supplierId', authMiddleware(['admin', 'engineer', 'project manager']), async(req, res) => {
    const { supplierId } = req.params;
    try {
        const success = await deleteSupplier(res, supplierId);
        if (success) {
            res.status(200).json({ status: 'success', message: 'Supplier deleted successfully.' });
        } else {
            failed(res, 400, 'Failed to delete supplier.');
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.get('/api/inventory', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                i.item_id,
                i.item_name,
                i.item_description,
                mc.category_name,
                u.unit_name,
                SUM(CASE WHEN im.movement_type = 'in' THEN im.quantity ELSE 0 END) as total_in,
                SUM(CASE WHEN im.movement_type = 'out' THEN im.quantity ELSE 0 END) as total_out,
                (SUM(CASE WHEN im.movement_type = 'in' THEN im.quantity ELSE 0 END) - SUM(CASE WHEN im.movement_type = 'out' THEN im.quantity ELSE 0 END)) as stock_balance
            FROM
                items i
            LEFT JOIN
                inventory_movements im ON i.item_id = im.item_id AND im.project_id IS NULL
            LEFT JOIN
                material_categories mc ON i.category_id = mc.category_id
            LEFT JOIN
                units u ON i.unit_id = u.unit_id
            GROUP BY
                i.item_id, i.item_name, i.item_description, mc.category_name, u.unit_name
            ORDER BY
                i.item_name;
        `);
        res.status(200).json(rows);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.get('/api/inventory/project/:projectId', authMiddleware(['admin', 'engineer', 'project manager', 'foreman']), async (req, res) => {
    const { projectId } = req.params;
    try {
        const [rows] = await pool.execute(`
            SELECT
                i.item_id,
                i.item_name,
                i.item_description,
                mc.category_name,
                u.unit_name,
                SUM(CASE WHEN im.movement_type = 'in' THEN im.quantity ELSE 0 END) as total_in,
                SUM(CASE WHEN im.movement_type = 'out' THEN im.quantity ELSE 0 END) as total_out,
                (SUM(CASE WHEN im.movement_type = 'in' THEN im.quantity ELSE 0 END) - SUM(CASE WHEN im.movement_type = 'out' THEN im.quantity ELSE 0 END)) as stock_balance
            FROM
                items i
            LEFT JOIN
                inventory_movements im ON i.item_id = im.item_id
            LEFT JOIN
                material_categories mc ON i.category_id = mc.category_id
            LEFT JOIN
                units u ON i.unit_id = u.unit_id
            WHERE
                im.project_id = ?
            GROUP BY
                i.item_id, i.item_name, i.item_description, mc.category_name, u.unit_name
            ORDER BY
                i.item_name;
        `, [projectId]);
        res.status(200).json(rows);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.get('/api/material-requests', authMiddleware(['all']), async (req, res) => {
    const { page = 1, limit = 10, project, request_type, current_stage, dateFrom, dateTo, requester, sort } = req.query;
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    let baseQuery = `
        FROM 
            material_requests mr
        JOIN 
            projects p ON mr.project_id = p.project_id
        JOIN 
            users u ON mr.user_id = u.user_id
    `;
    let filterParams = [];
    let whereClauses = [];

    if (project && project !== "all") {
        whereClauses.push(`mr.project_id = ?`);
        filterParams.push(project);
    }
    if (request_type && request_type !== "all") {
        whereClauses.push(`mr.request_type = ?`);
        filterParams.push(request_type);
    }
    if (current_stage && current_stage !== "all") {
        whereClauses.push(`mr.current_stage = ?`);
        filterParams.push(current_stage);
    }
    if (dateFrom && dateFrom !== "all") {
        whereClauses.push(`mr.created_at >= ?`);
        filterParams.push(dateFrom);
    }
    if (dateTo && dateTo !== "all") {
        whereClauses.push(`mr.created_at <= ?`);
        filterParams.push(dateTo);
    }
    if (requester && requester !== "all") {
        whereClauses.push(`u.full_name LIKE ?`);
        filterParams.push(`%${requester}%`);
    }
    
    let whereClause = '';
    if (whereClauses.length > 0) {
        whereClause = ` WHERE ` + whereClauses.join(' AND ');
    }

    let orderByClause = 'ORDER BY mr.created_at DESC';
    if (sort) {
        switch (sort) {
            case 'newest':
                orderByClause = 'ORDER BY mr.created_at DESC';
                break;
            case 'oldest':
                orderByClause = 'ORDER BY mr.created_at ASC';
                break;
        }
    }

    const countQuery = `SELECT COUNT(mr.id) AS total ${baseQuery} ${whereClause}`;
    
    const dataQuery = `
        SELECT 
            mr.id,
            p.project_name,
            u.full_name AS requester_name,
            mr.request_type,
            mr.current_stage,
            mr.created_at,
            (SELECT COUNT(*) FROM material_request_items mri WHERE mri.mr_id = mr.id) as item_count,
            (SELECT SUM(mri.quantity * i.price) FROM material_request_items mri JOIN items i ON mri.item_id = i.item_id WHERE mri.mr_id = mr.id) as total_cost
        ${baseQuery}
        ${whereClause}
        ${orderByClause}
        LIMIT ${limitInt}
        OFFSET ${offset}
    `;

    try {
        const [countResult] = await pool.execute(countQuery, filterParams);
        const total = countResult[0].total;

        const [requests] = await pool.execute(dataQuery, filterParams);
        
        res.status(200).json({ requests, total });
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.get('/api/material-requests/:id', authMiddleware(['all']), async (req, res) => {
    const { id } = req.params;

    try {
        const [headerResult] = await pool.execute(`
            SELECT
                mr.id,
                p.project_name,
                mr.request_type,
                s.supplier_name,
                mr.current_stage AS status,
                u.full_name AS requester_name,
                a.full_name AS approver_name,
                mr.approved_at
            FROM
                material_requests mr
            JOIN
                projects p ON mr.project_id = p.project_id
            JOIN
                users u ON mr.user_id = u.user_id
            LEFT JOIN
                suppliers s ON mr.supplier_id = s.supplier_id
            LEFT JOIN
                users a ON mr.approved_by = a.user_id
            WHERE
                mr.id = ?;
        `, [id]);

        if (headerResult.length === 0) {
            return failed(res, 404, 'Material request not found.');
        }

        const [itemsResult] = await pool.execute(`
            SELECT
                mri.id,
                i.item_name,
                mri.quantity AS requested_quantity,
                mri.received_quantity,
                mri.accepted_quantity,
                mri.rejected_quantity,
                (mri.quantity - mri.received_quantity) AS pending_quantity
            FROM
                material_request_items mri
            JOIN
                items i ON mri.item_id = i.item_id
            WHERE
                mri.mr_id = ?;
        `, [id]);

        res.status(200).json({
            header: headerResult[0],
            items: itemsResult
        });

    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.post('/api/material-requests', authMiddleware(['all']), async (req, res) => {
    const { id: userId } = req.user;
    const { project_id, request_type, supplier_id, items, status } = req.body;

    if (!project_id || !request_type || !items || !Array.isArray(items) || items.length === 0) {
        return failed(res, 400, 'Missing required fields.');
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            'INSERT INTO material_requests (user_id, project_id, request_type, supplier_id, current_stage) VALUES (?, ?, ?, ?, ?)',
            [userId, project_id, request_type, supplier_id, status || 'DRAFT']
        );
        const materialRequestId = result.insertId;

        for (const item of items) {
            await connection.execute(
                'INSERT INTO material_request_items (mr_id, item_id, quantity) VALUES (?, ?, ?)',
                [materialRequestId, item.item_id, item.quantity]
            );
        }

        await connection.commit();
        res.status(201).json({ status: 'success', message: 'Material request created successfully.', id: materialRequestId });

    } catch (error) {
        await connection.rollback();
        failed(res, 500, `Database Error: ${error}`);
    } finally {
        connection.release();
    }
});

async function updateMaterialRequestStage(res, req, mrId, newStage, newStatus, action, remarks) {
    const { id: userId } = req.user;

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [updateResult] = await connection.execute(
            'UPDATE material_requests SET current_stage = ?, status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
            [newStage, newStatus, userId, mrId]
        );

        if (updateResult.affectedRows === 0) {
            await connection.rollback();
            return failed(res, 404, 'Material request not found or no change made.');
        }

        await connection.execute(
            'INSERT INTO material_request_actions (mr_id, action, performed_by, remarks) VALUES (?, ?, ?, ?)',
            [mrId, action, userId, remarks]
        );

        await connection.commit();
        res.status(200).json({status: 'success', message: `Material request ${action} successfully.`});

    } catch (error) {
        await connection.rollback();
        return failed(res, 500, `Database Error: ${error}`);
    } finally {
        connection.release();
    }
}

app.put('/api/material-requests/:id/approve', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;
    await updateMaterialRequestStage(res, req, id, 'approved', 'approved', 'approved', remarks);
});

app.put('/api/material-requests/:id/decline', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;
    await updateMaterialRequestStage(res, req, id, 'cancelled', 'rejected', 'declined', remarks);
});

app.put('/api/material-requests/:id/order', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;
    await updateMaterialRequestStage(res, req, id, 'ordered', 'approved', 'ordered', remarks);
});

async function recordDelivery(res, req, mrId, deliveryData) {
    const { id: userId } = req.user;
    const { delivered_by, delivery_date, delivery_status } = deliveryData;
    const user = await getUser(userId);

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Insert into material_deliveries
        await connection.execute(
            'INSERT INTO material_deliveries (mr_id, delivered_by, delivery_date, delivery_status, acknowledged_by) VALUES (?, ?, ?, ?, ?)',
            [mrId, delivered_by, delivery_date, delivery_status, userId]
        );

        // Update material_requests stage
        await connection.execute(
            'UPDATE material_requests SET current_stage = ? WHERE id = ?',
            ['verifying', mrId]
        );

        // Insert into material_request_actions
        await connection.execute(
            'INSERT INTO material_request_actions (mr_id, action, performed_by, remarks) VALUES (?, ?, ?, ?)',
            [mrId, 'marked_delivered', userId, `Delivery recorded by ${user.full_name}`]
        );

        await connection.commit();
        res.status(200).json({status: 'success', message: 'Delivery recorded successfully.'});

    } catch (error) {
        await connection.rollback();
        return failed(res, 500, `Database Error: ${error}`);
    } finally {
        connection.release();
    }
}

app.post('/api/material-requests/:id/deliveries', authMiddleware(['admin', 'foreman']), async (req, res) => {
    const { id } = req.params;
    const { delivered_by, delivery_date, delivery_status } = req.body;
    if (!delivered_by || !delivery_date || !delivery_status) {
        return failed(res, 400, 'Missing required fields.');
    }
    await recordDelivery(res, req, id, req.body);
});

app.get('/api/material-requests/:id/deliveries', authMiddleware(['all']), async (req, res) => {
    const { id } = req.params;
    try {
        const [deliveries] = await pool.execute(
            `SELECT md.*, u.full_name as acknowledged_by_name 
             FROM material_deliveries md
             JOIN users u ON md.acknowledged_by = u.user_id
             WHERE md.mr_id = ? 
             ORDER BY md.delivery_date DESC`,
            [id]
        );
        res.status(200).json(deliveries);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

async function verifyDelivery(res, req, mrId, verificationData) {
    const { id: userId } = req.user;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const item of verificationData) {
            const { mr_item_id, accepted_qty, rejected_qty, remarks } = item;

            // 1. Insert into material_verifications
            await connection.execute(
                `INSERT INTO material_verifications (mr_item_id, verified_by, status, accepted_qty, rejected_qty, remarks)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [mr_item_id, userId, (rejected_qty > 0 ? 'partial' : 'accepted'), accepted_qty, rejected_qty, remarks]
            );

            // 2. Update material_request_items
            const [itemToUpdate] = await connection.execute('SELECT * FROM material_request_items WHERE id = ? FOR UPDATE', [mr_item_id]);
            
            const new_received = itemToUpdate[0].received_quantity + accepted_qty + rejected_qty;
            const new_accepted = itemToUpdate[0].accepted_quantity + accepted_qty;
            const new_rejected = itemToUpdate[0].rejected_quantity + rejected_qty;

            await connection.execute(
                `UPDATE material_request_items 
                 SET received_quantity = ?, accepted_quantity = ?, rejected_quantity = ?
                 WHERE id = ?`,
                [new_received, new_accepted, new_rejected, mr_item_id]
            );

            // 3. Automatic Inventory Update
            if (accepted_qty > 0) {
                const [[requestDetails]] = await connection.execute(
                    `SELECT mr.project_id, mr.request_type, i.item_id 
                     FROM material_requests mr
                     JOIN material_request_items mri ON mr.id = mri.mr_id
                     JOIN items i ON mri.item_id = i.item_id
                     WHERE mri.id = ?`,
                    [mr_item_id]
                );
                
                const source = requestDetails.request_type === 'supplier' ? 'supplier' : 'main_inventory';
                
                await connection.execute(
                    `INSERT INTO inventory_movements (item_id, project_id, movement_type, quantity, source, reference_type, reference_id, performed_by)
                     VALUES (?, ?, 'in', ?, ?, 'material_request', ?, ?)`,
                    [requestDetails.item_id, requestDetails.project_id, accepted_qty, source, mrId, userId]
                );

                if (source === 'main_inventory') {
                    await connection.execute(
                        `INSERT INTO inventory_movements (item_id, project_id, movement_type, quantity, source, reference_type, reference_id, performed_by)
                         VALUES (?, NULL, 'out', ?, 'project_inventory', 'material_request', ?, ?)`,
                        [requestDetails.item_id, accepted_qty, mrId, userId]
                    );
                }
            }
        }

        // 4. Update overall material_request status
        const [allItems] = await connection.execute('SELECT quantity, accepted_quantity, rejected_quantity FROM material_request_items WHERE mr_id = ?', [mrId]);
        const total_requested = allItems.reduce((sum, item) => sum + item.quantity, 0);
        const total_accepted = allItems.reduce((sum, item) => sum + item.accepted_quantity, 0);
        const total_rejected = allItems.reduce((sum, item) => sum + item.rejected_quantity, 0);
        
        let newStage = 'verifying';
        if (total_accepted === total_requested) {
            newStage = 'completed';
        } else if (total_accepted + total_rejected >= total_requested) {
            newStage = total_rejected > 0 ? 'disputed' : 'completed';
        } else if (total_accepted > 0 || total_rejected > 0) {
            newStage = 'partially_verified';
        }

        await connection.execute('UPDATE material_requests SET current_stage = ? WHERE id = ?', [newStage, mrId]);

        // 5. Log the action
        await connection.execute(
            `INSERT INTO material_request_actions (mr_id, action, performed_by, remarks) VALUES (?, ?, ?, ?)`,
            [mrId, 'verification_submitted', userId, 'Verification submitted']
        );

        await connection.commit();
        res.status(200).json({status: 'success', message: 'Verification submitted successfully.'});

    } catch (error) {
        await connection.rollback();
        return failed(res, 500, `Database Error: ${error}`);
    } finally {
        connection.release();
    }
}

app.post('/api/material-requests/:id/verify', authMiddleware(['admin', 'foreman']), async (req, res) => {
    const { id } = req.params;
    if (!Array.isArray(req.body) || req.body.length === 0) {
        return failed(res, 400, 'Invalid verification data.');
    }
    await verifyDelivery(res, req, id, req.body);
});

app.get('/api/material-requests/:id/actions', authMiddleware(['all']), async (req, res) => {
    const { id } = req.params;
    try {
        const [actions] = await pool.execute(
            `SELECT mra.*, u.full_name as performed_by_name 
             FROM material_request_actions mra
             JOIN users u ON mra.performed_by = u.user_id
             WHERE mra.mr_id = ? 
             ORDER BY mra.created_at ASC`,
            [id]
        );
        res.status(200).json(actions);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.post('/api/material-requests/:id/review', authMiddleware(['admin', 'engineer', 'project manager']), async (req, res) => {
    const { id: mrId } = req.params;
    const { id: userId } = req.user;
    const { remarks } = req.body;

    if (!remarks) {
        return failed(res, 400, 'Remarks are required for the review.');
    }

    try {
        await pool.execute(
            'INSERT INTO material_request_actions (mr_id, action, performed_by, remarks) VALUES (?, ?, ?, ?)',
            [mrId, 'verification_reviewed', userId, remarks]
        );
        res.status(201).json({ status: 'success', message: 'Review recorded successfully.' });
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.get('/api/assets', authMiddleware(['all']), async (req, res) => {
    try {
        const [assets] = await pool.execute(`
            SELECT 
                a.asset_id, a.serial_number, a.condition_status, a.usage_status, a.last_inspected_at,
                i.item_name,
                p.project_name
            FROM assets a
            JOIN items i ON a.item_id = i.item_id
            LEFT JOIN projects p ON a.project_id = p.project_id
            ORDER BY i.item_name, a.asset_id
        `);
        res.status(200).json(assets);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.get('/api/assets/items', authMiddleware(['all']), async (req, res) => {
    try {
        const [assetItems] = await pool.execute(
            `SELECT item_id, item_name FROM items WHERE item_type = 'asset' ORDER BY item_name`
        );
        res.status(200).json(assetItems);
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.post('/api/assets', authMiddleware(['admin']), async (req, res) => {
    const { item_id, serial_number, condition_status, usage_status, project_id, last_inspected_at } = req.body;
    if (!item_id) {
        return failed(res, 400, 'Item ID is required.');
    }
    try {
        const [result] = await pool.execute(
            `INSERT INTO assets (item_id, serial_number, condition_status, usage_status, project_id, last_inspected_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [item_id, serial_number, condition_status, usage_status, project_id, last_inspected_at]
        );
        res.status(201).json({ status: 'success', message: 'Asset created successfully.', id: result.insertId });
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.put('/api/assets/:id', authMiddleware(['admin']), async (req, res) => {
    const { id } = req.params;
    const { serial_number, condition_status, usage_status, project_id, last_inspected_at } = req.body;
    try {
        const [result] = await pool.execute(
            `UPDATE assets SET serial_number = ?, condition_status = ?, usage_status = ?, project_id = ?, last_inspected_at = ?
             WHERE asset_id = ?`,
            [serial_number, condition_status, usage_status, project_id, last_inspected_at, id]
        );
        if (result.affectedRows === 0) {
            return failed(res, 404, 'Asset not found.');
        }
        res.status(200).json({ status: 'success', message: 'Asset updated successfully.' });
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.delete('/api/assets/:id', authMiddleware(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute('DELETE FROM assets WHERE asset_id = ?', [id]);
        if (result.affectedRows === 0) {
            return failed(res, 404, 'Asset not found.');
        }
        res.status(200).json({ status: 'success', message: 'Asset deleted successfully.' });
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.get('/api/materials', authMiddleware(['all']), async(req, res) => {
    const filters = req.query;
    res.status(200).json(await getAllMaterials(res, req.user.role, req.user.projects, filters));
});

app.post('/api/materials', authMiddleware(['admin', 'engineer', 'project manager', 'foreman']), upload.single('image'), async(req, res) => {
    const { item_name, item_description, price, unit_id, category_id, supplier_id, size, item_type, track_condition } = req.body;
    const image_url = req.file ? req.file.filename : 'constrackerWhite.svg'; // Get filename if uploaded
    const { id: userId, role: userRole } = req.user;

    if (await isMaterialExist(item_name)) {
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Failed to delete uploaded file for duplicate item:", err);
            });
        }
        return failed(res, 409, "Item already exist"); 
    }

    // Validate incoming data
    if (!item_name || !price || !category_id || !supplier_id || !unit_id) {
        // If validation fails and a file was uploaded, delete it to prevent orphaned files
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Failed to delete uploaded file:", err);
            });
        }
        return failed(res, 400, 'Missing required fields: item_name, price, unit, category, and supplier are required.');
    }

    try {
        const materialData = { item_name, item_description, price, unit_id, category_id, supplier_id, size, image_url, item_type, track_condition };
        const materialId = await createMaterial(res, materialData, userId, userRole);
        
        if (userRole === 'admin' || userRole === 'engineer') {
            const user = await getUser(userId);
            const logData = {
                logName: `${user.full_name} approved the creation of material ${item_name}`,
                projectId: null,
                type: 'item',
                action: 'approved',
                logDetails: { creator_id: userId }
            };
            await createLogs(res, req, logData);
        }
        
        const message = (userRole === 'engineer' || userRole === 'admin') ? 'Material created and approved successfully.' : 'Material created successfully, awaiting approval.';
        res.status(201).json({ status: 'success', message, materialId });
    } catch (error) {
        // If an error occurs and a file was uploaded, delete it
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Failed to delete uploaded file on error:", err);
            });
        }
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.put('/api/materials/:materialId/approve', authMiddleware(['engineer']), async(req, res) => {
    const { materialId } = req.params;
    const { id: userId } = req.user;

    try {
        // Fetch material to get its name and creator for logging
        const [materialResult] = await pool.execute('SELECT item_name, created_by FROM items WHERE item_id = ?', [materialId]);
        if (materialResult.length === 0) {
            return failed(res, 404, 'Material not found.');
        }
        const material = materialResult[0];

        const success = await approveMaterial(res, materialId, userId);

        if (success) {
            // Fetch creator's name (for frontend "Created by:" display)
            const [creatorResult] = await pool.execute('SELECT full_name FROM users WHERE user_id = ?', [material.created_by]);
            const creatorName = creatorResult.length > 0 ? creatorResult[0].full_name : 'An unknown user';

            // Fetch approver's name (for log message)
            const [approverResult] = await pool.execute('SELECT full_name FROM users WHERE user_id = ?', [userId]);
            const approverName = approverResult.length > 0 ? approverResult[0].full_name : 'An unknown engineer';

            const logData = {
                logName: `${approverName} approved the creation of material ${material.item_name}`,
                projectId: null,
                type: 'item',
                action: 'approved',
                logDetails: { creator_id: material.created_by }
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

app.put('/api/materials/:materialId/decline', authMiddleware(['engineer']), async(req, res) => {
    const { materialId } = req.params;
    const { id: userId } = req.user;

    try {
        const [materialResult] = await pool.execute('SELECT item_name FROM items WHERE item_id = ?', [materialId]);
        if (materialResult.length === 0) {
            return failed(res, 404, 'Material not found.');
        }
        const material = materialResult[0];

        // For now, let's just delete the material as a "decline" action.
        // A better implementation would be to set a 'declined' status.
        const [result] = await pool.execute('DELETE FROM items WHERE item_id = ?', [materialId]);

        if (result.affectedRows > 0) {
            const logData = {
                logName: `declined material ${material.item_name}`,
                projectId: null,
                type: 'item',
                action: 'declined',
            };
            await createLogs(res, req, logData);
            res.status(200).json({ status: 'success', message: 'Material declined successfully.' });
        } else {
            failed(res, 400, 'Failed to decline material.');
        }
    } catch (error) {
        failed(res, 500, `Database Error: ${error}`);
    }
});

app.put('/api/materials/:materialId', authMiddleware(['admin', 'engineer']), upload.single('image'), async(req, res) => {
    const { materialId } = req.params;
    const { id: userId } = req.user;
    const { item_name, item_description, size, image_url: old_image_url_from_body, item_type, track_condition } = req.body;
    const price = parseFloat(req.body.price);
    const unit_id = req.body.unit_id ? parseInt(req.body.unit_id, 10) : undefined;
    const category_id = req.body.category_id ? parseInt(req.body.category_id, 10) : undefined;
    const supplier_id = req.body.supplier_id ? parseInt(req.body.supplier_id, 10) : undefined;

    const new_image_filename = req.file ? req.file.filename : old_image_url_from_body; // Use new file if uploaded, otherwise keep old

    try {
        // Fetch old material data for logging changes and to get original image_url if not updated
        const [oldMaterialResult] = await pool.execute('SELECT item_name, item_description, price, unit_id, category_id, supplier_id, size, image_url, item_type, track_condition FROM items WHERE item_id = ?', [materialId]);
        if (oldMaterialResult.length === 0) {
            // If new file was uploaded but material not found, delete it
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error("Failed to delete uploaded file:", err);
                });
            }
            return failed(res, 404, 'Material not found.');
        }
        const oldMaterial = oldMaterialResult[0];

        const materialData = { 
            item_name: item_name, 
            item_description: item_description, 
            price: price, 
            unit_id: unit_id, 
            category_id: category_id, 
            supplier_id: supplier_id, 
            size: size, 
            image_url: new_image_filename || oldMaterial.image_url, // Ensure image_url is always set
            item_type: item_type,
            track_condition: track_condition
        };

        const success = await updateMaterial(res, materialId, materialData, userId);
        if (success) {
            // If a new file was uploaded and old image was not default, delete the old file
            if (req.file && oldMaterial.image_url && oldMaterial.image_url !== 'constrackerWhite.svg') {
                fs.unlink(path.join(__dirName, 'private', 'privateAssets', 'pictures', oldMaterial.image_url), (err) => {
                    if (err) console.error("Failed to delete old image file:", err);
                });
            }

            const logDetails = [];
            // Compare fields and add to logDetails if changed
            if (item_name !== undefined && item_name !== oldMaterial.item_name) {
                logDetails.push({ varName: 'item_name', oldVal: oldMaterial.item_name, newVal: item_name, label: 'Material Name' });
            }
            if (item_description !== undefined && item_description !== oldMaterial.item_description) {
                logDetails.push({ varName: 'item_description', oldVal: oldMaterial.item_description, newVal: item_description, label: 'Description' });
            }
            if (price !== undefined && price !== parseFloat(oldMaterial.price)) {
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
            if (new_image_filename !== oldMaterial.image_url) {
                logDetails.push({ varName: 'image_url', oldVal: oldMaterial.image_url, newVal: new_image_filename, label: 'Image' });
            }
            if (item_type !== undefined && item_type !== oldMaterial.item_type) {
                logDetails.push({ varName: 'item_type', oldVal: oldMaterial.item_type, newVal: item_type, label: 'Item Type' });
            }
            if (track_condition !== undefined && track_condition !== oldMaterial.track_condition) {
                logDetails.push({ varName: 'track_condition', oldVal: oldMaterial.track_condition, newVal: track_condition, label: 'Track Condition' });
            }

            if (logDetails.length > 0) {
                const logData = {
                    logName: `updated material ${oldMaterial.item_name}`,
                    projectId: null,
                    type: 'item',
                    action: 'edit',
                    logDetails: logDetails,
                    itemId: materialId
                };
                await createLogs(res, req, logData);
                res.status(200).json({ status: 'success', message: 'Material updated successfully.' });
            } else {
                res.status(200).json({ status: 'success', message: 'No changes made to material.' });
            }
        } else {
            // If update failed and a new file was uploaded, delete it
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error("Failed to delete uploaded file:", err);
                });
            }
            failed(res, 400, 'Failed to update material.');
        }
    } catch (error) {
        // If an error occurs and a new file was uploaded, delete it
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Failed to delete uploaded file on error:", err);
            });
        }
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
                projectId: null,
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

app.post('/api/projects', authMiddleware(['admin']), upload.single('image'), async(req, res) => {
    const { project_name, project_location, project_budget, duedate, status } = req.body;
    const image = req.file ? req.file.filename : 'default.jpg';

    if (!project_name || !project_location || !project_budget || !duedate) {
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Failed to delete uploaded file for invalid project creation:", err);
            });
        }
        return failed(res, 400, 'Missing required fields.');
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO projects (project_name, project_location, project_budget, duedate, status, image) VALUES (?, ?, ?, ?, ?, ?)',
            [project_name, project_location, project_budget, duedate, status || 'planning', image]
        );
        res.status(201).json({ status: 'success', message: 'Project created successfully', projectId: result.insertId });
    } catch (error) {
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Failed to delete uploaded file on db error:", err);
            });
        }
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