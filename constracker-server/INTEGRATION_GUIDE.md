# Integration Guide for Real Data

## Overview
This guide explains how to integrate the Project Progress Analytics section with real data from your backend API.

---

## 📊 Current State
The analytics section currently uses **sample data** for demonstration. All visual components, interactions, and UI are fully functional.

---

## 🔗 Backend API Integration

### Step 1: Identify Backend Endpoints

Your backend should provide these endpoints:

```
GET /api/projects              - List all projects with milestones data
GET /api/projects/:id          - Get specific project details
GET /api/tasks                 - List all tasks
GET /api/tasks?project=:id     - Get tasks for specific project
GET /api/milestones            - List all milestones
GET /api/milestones?project=:id - Get milestones for specific project
```

### Step 2: Update Project Fetch in `renderProjectProgressOverview()`

**Current (Line ~1236):**
```javascript
const projects = await fetchData('/api/projects');
```

**Expected Response Format:**
```json
[
  {
    "project_id": 1,
    "project_name": "Downtown Plaza Renovation",
    "project_location": "Downtown Area",
    "project_status": "in progress",
    "start_date": "2025-12-15",
    "duedate": "2026-03-20",
    "total_milestone": 5,
    "completed_milestone": 2,
    "pending_milestone": 2,
    "total_personnel": 12
  },
  ...
]
```

---

### Step 3: Update Milestone Fetch in `createMilestoneTimeline()`

**Current (Line ~1380):**
```javascript
const milestones = [
    { id: 1, name: 'Site Preparation', status: 'completed', dueDate: new Date('2026-01-10'), isOverdue: false },
    ...
];
```

**Replace with:**
```javascript
// Fetch milestones from API
const milestonesRes = await fetchData(`/api/milestones?project=${project.project_id}`);
const milestones = (milestonesRes !== 'error' ? milestonesRes : []).map(m => ({
    id: m.milestone_id,
    name: m.milestone_name,
    status: determineStatus(m), // Add status determination logic
    dueDate: new Date(m.due_date),
    isOverdue: new Date(m.due_date) < new Date()
}));
```

**Expected Response Format:**
```json
[
  {
    "milestone_id": 1,
    "milestone_name": "Site Preparation",
    "due_date": "2026-01-10",
    "status": "completed",
    "description": "Clear and prepare the construction site"
  },
  ...
]
```

---

### Step 4: Update Tasks Fetch in `renderTaskAnalytics()`

**Current (Line ~1440):**
```javascript
const taskStats = {
    completed: 45,
    inProgress: 28,
    pending: 32,
    overdue: 8
};
```

**Replace with:**
```javascript
// Fetch tasks and calculate stats
const tasksRes = await fetchData('/api/tasks');
const tasks = tasksRes !== 'error' ? tasksRes : [];

const taskStats = {
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    overdue: tasks.filter(t => new Date(t.due_date) < new Date() && t.status !== 'completed').length
};
```

**Expected Response Format:**
```json
[
  {
    "task_id": 1,
    "task_name": "Finalize project documentation",
    "project_id": 1,
    "status": "completed",
    "priority": "high",
    "assigned_to": "John Smith",
    "assigned_user_id": 5,
    "due_date": "2026-01-15",
    "created_date": "2026-01-05"
  },
  ...
]
```

---

## 🔄 Function-by-Function Update Guide

### 1. `createProjectProgressSection()` - Filter Project Dropdown

**Location:** Line ~1180

**Update this section (around line 1205):**
```javascript
// OLD
const projects = await fetchData('/api/projects');
if (projects !== 'error' && projects.length > 0) {
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.project_id;
        option.innerText = project.project_name;
        projectSelect.append(option);
    });
}

// NEW - Ensure project ID field is correct
const projects = await fetchData('/api/projects');
if (projects !== 'error' && Array.isArray(projects) && projects.length > 0) {
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.project_id || project.id; // Handle both naming conventions
        option.innerText = project.project_name || project.name;
        projectSelect.append(option);
    });
}
```

---

### 2. `renderProjectProgressOverview()` - Main Project Data

**Location:** Line ~1230

```javascript
// Ensure all required fields exist
const projects = await fetchData('/api/projects');
if (projects === 'error' || !Array.isArray(projects) || projects.length === 0) {
    const empty = div('', 'empty-state');
    empty.innerText = 'No projects available';
    container.append(empty);
    return container;
}

// Add data validation
const validProjects = projects.map(p => ({
    project_id: p.project_id || p.id,
    project_name: p.project_name || p.name,
    project_location: p.project_location || 'N/A',
    project_status: p.project_status || 'planning',
    start_date: p.start_date || new Date(),
    end_date: p.end_date || p.duedate || new Date(),
    duedate: p.duedate || p.end_date || new Date(),
    total_milestone: p.total_milestone || 0,
    completed_milestone: p.completed_milestone || 0,
    pending_milestone: p.pending_milestone || 0,
    total_personnel: p.total_personnel || 0
}));
```

---

### 3. `createMilestoneTimeline()` - Real Milestones

**Location:** Line ~1370

**Replace sample data:**
```javascript
// OLD - Replace this entire section
const milestones = [
    { id: 1, name: 'Site Preparation', status: 'completed', dueDate: new Date('2026-01-10'), isOverdue: false },
    ...
];

// NEW
async function createMilestoneTimeline(project) {
    const timeline = div('', 'milestone-timeline');
    
    // Fetch real milestones
    const milestonesRes = await fetchData(`/api/milestones?project=${project.project_id}`);
    
    if (milestonesRes === 'error' || !Array.isArray(milestonesRes)) {
        const empty = div('', 'empty-state');
        empty.innerText = 'No milestones available for this project';
        timeline.append(empty);
        return timeline;
    }
    
    // Transform API data to match component expectations
    const milestones = milestonesRes.map(m => {
        const now = new Date();
        const dueDate = new Date(m.due_date);
        return {
            id: m.milestone_id,
            name: m.milestone_name,
            status: mapMilestoneStatus(m.status), // Use your status values
            dueDate: dueDate,
            isOverdue: dueDate < now && m.status !== 'completed',
            description: m.description
        };
    });
    
    // ... rest of the function
}
```

---

### 4. `renderTaskAnalytics()` - Real Task Data

**Location:** Line ~1430

**Replace sample data:**
```javascript
// OLD
const taskStats = {
    completed: 45,
    inProgress: 28,
    pending: 32,
    overdue: 8
};

// NEW
async function renderTaskAnalytics(projectId = null, dateRange = 'this-month') {
    const container = div('', 'task-analytics-container');
    
    // Fetch real tasks
    let tasksQuery = '/api/tasks';
    if (projectId) {
        tasksQuery += `?project=${projectId}`;
    }
    
    const tasksRes = await fetchData(tasksQuery);
    
    if (tasksRes === 'error' || !Array.isArray(tasksRes)) {
        const empty = div('', 'empty-state');
        empty.innerText = 'No tasks available';
        container.append(empty);
        return container;
    }
    
    // Filter by date range if needed
    const filteredTasks = filterTasksByDateRange(tasksRes, dateRange);
    
    // Calculate stats
    const taskStats = {
        completed: filteredTasks.filter(t => t.status === 'completed').length,
        inProgress: filteredTasks.filter(t => t.status === 'in-progress' || t.status === 'in_progress').length,
        pending: filteredTasks.filter(t => t.status === 'pending').length,
        overdue: filteredTasks.filter(t => {
            const due = new Date(t.due_date);
            return due < new Date() && t.status !== 'completed';
        }).length
    };
    
    // ... rest of the function
}

// Helper function to filter by date range
function filterTasksByDateRange(tasks, dateRange) {
    const now = new Date();
    return tasks.filter(task => {
        const created = new Date(task.created_date);
        
        switch(dateRange) {
            case 'this-week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return created >= weekAgo;
            case 'this-month':
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            case 'this-quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                return Math.floor(created.getMonth() / 3) === quarter && created.getFullYear() === now.getFullYear();
            case 'this-year':
                return created.getFullYear() === now.getFullYear();
            default: // 'all'
                return true;
        }
    });
}
```

---

### 5. `renderActionableInsights()` - Dynamic Insights

**Location:** Line ~1580

**Replace sample data with calculations:**
```javascript
async function renderActionableInsights(projectId = null, dateRange = 'this-month') {
    const container = div('', 'insights-container');
    
    // Fetch all data
    const projectsRes = await fetchData('/api/projects');
    const tasksRes = await fetchData('/api/tasks');
    const milestonesRes = await fetchData('/api/milestones');
    
    if (projectsRes === 'error' || tasksRes === 'error') {
        const empty = div('', 'empty-state');
        empty.innerText = 'Unable to load insights data';
        container.append(empty);
        return container;
    }
    
    // Process data to find overdue items
    const overdueItems = findOverdueItems(tasksRes, milestonesRes);
    const atRiskProjects = identifyAtRiskProjects(projectsRes);
    const performanceMetrics = calculatePerformanceMetrics(projectsRes);
    const bottlenecks = identifyBottlenecks(tasksRes, projectsRes);
    
    // Render sections with real data
    // ...
}
```

---

## 🛠️ Helper Functions to Add

Add these utility functions to handle data transformation:

```javascript
// Map API status values to component status values
function mapProjectStatus(apiStatus) {
    const statusMap = {
        'planning': 'planning',
        'in-progress': 'in progress',
        'in_progress': 'in progress',
        'completed': 'completed',
        'on-hold': 'on-hold'
    };
    return statusMap[apiStatus] || apiStatus;
}

function mapTaskStatus(apiStatus) {
    const statusMap = {
        'todo': 'pending',
        'pending': 'pending',
        'in-progress': 'in-progress',
        'in_progress': 'in-progress',
        'done': 'completed',
        'completed': 'completed'
    };
    return statusMap[apiStatus] || apiStatus;
}

function mapMilestoneStatus(apiStatus) {
    const statusMap = {
        'not-started': 'upcoming',
        'pending': 'pending',
        'in-progress': 'in-progress',
        'in_progress': 'in-progress',
        'completed': 'completed'
    };
    return statusMap[apiStatus] || apiStatus;
}

// Calculate overdue items
function findOverdueItems(tasks, milestones) {
    const now = new Date();
    const overdue = [];
    
    if (Array.isArray(tasks)) {
        tasks.forEach(task => {
            const due = new Date(task.due_date);
            if (due < now && task.status !== 'completed') {
                overdue.push({
                    type: 'Task',
                    name: task.task_name,
                    daysOverdue: Math.floor((now - due) / (1000 * 60 * 60 * 24)),
                    project: task.project_name
                });
            }
        });
    }
    
    if (Array.isArray(milestones)) {
        milestones.forEach(milestone => {
            const due = new Date(milestone.due_date);
            if (due < now && milestone.status !== 'completed') {
                overdue.push({
                    type: 'Milestone',
                    name: milestone.milestone_name,
                    daysOverdue: Math.floor((now - due) / (1000 * 60 * 60 * 24)),
                    project: milestone.project_name
                });
            }
        });
    }
    
    return overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

// Identify at-risk projects
function identifyAtRiskProjects(projects) {
    return projects.map(p => {
        const completion = p.total_milestone > 0 ? (p.completed_milestone / p.total_milestone) * 100 : 0;
        const daysRemaining = calculateDaysRemaining(p.duedate);
        
        let reason = '';
        if (completion < 50 && daysRemaining < 7) {
            reason = `Only ${Math.round(completion)}% complete with ${daysRemaining} days remaining`;
        } else if (daysRemaining < 3 && completion < 100) {
            reason = 'Approaching deadline with incomplete tasks';
        } else if (daysRemaining < 0) {
            reason = 'Project deadline has passed';
        }
        
        return {
            name: p.project_name,
            reason: reason,
            completion: Math.round(completion),
            status: 'at-risk'
        };
    }).filter(p => p.status === 'at-risk');
}
```

---

## ✅ Testing Checklist

After integrating real data:

- [ ] Projects dropdown populates with real project names
- [ ] Overview tab shows real project data
- [ ] Progress bars reflect actual completion percentages
- [ ] Status badges update based on real data
- [ ] Milestone timeline shows actual milestones
- [ ] Task analytics shows real task distribution
- [ ] Filters work with actual projects
- [ ] Date range filters affect data display
- [ ] Modals display correct information
- [ ] No console errors appear

---

## 🔍 Debugging Tips

1. **Check API Response**: Log the response from each API call
   ```javascript
   const projects = await fetchData('/api/projects');
   console.log('Projects Response:', projects);
   ```

2. **Verify Field Names**: Ensure your API field names match the code
   ```javascript
   // If API uses different field names, add mapping
   project.project_id = project.project_id || project.id;
   ```

3. **Handle Missing Data**: Add null checks
   ```javascript
   const completion = project.total_milestone ? 
       (project.completed_milestone / project.total_milestone) * 100 : 0;
   ```

4. **Monitor Network**: Check browser DevTools Network tab for API calls

---

## 📞 Support

If you encounter issues during integration:
1. Check browser console for JavaScript errors
2. Verify API endpoint URLs and responses
3. Ensure API returns expected data format
4. Review field name mappings
5. Test with sample data first, then switch to real data

---

**Integration Complete!** Your analytics section is now connected to real data.
