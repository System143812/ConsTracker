# Analytics Functions Reference

## Complete Function List - Project Progress Analytics

### 📊 Main Section Functions

#### `createProjectProgressSection()` - Lines ~1177-1308
Creates the entire project progress analytics section with tabs and filters.

**Parameters:**
- None (uses global state)

**Returns:**
- `HTMLElement` - Complete section with filters, tabs, and content

**Features:**
- Creates all filter controls (project, date range, status)
- Sets up tab navigation system
- Initializes all tab content areas
- Adds event listeners for filter changes
- Handles dynamic content updates

**Usage:**
```javascript
const section = await createProjectProgressSection();
container.append(section);
```

---

#### `renderProjectProgressOverview(projectId, dateRange, statusFilter)` - Lines ~1310-1370
Renders the Overview tab content with overall and individual project progress.

**Parameters:**
- `projectId` (string, optional) - Filter by specific project ID
- `dateRange` (string, optional) - Date range for filtering
- `statusFilter` (string, optional) - Status filter (on-track, at-risk, delayed, completed)

**Returns:**
- `HTMLElement` - Overview container with project cards

**Features:**
- Fetches project data from API
- Calculates overall completion percentage
- Creates individual project cards
- Applies filters to project list
- Shows progress bars and status badges

---

#### `renderMilestonesTracking(projectId, dateRange)` - Lines ~1430-1470
Renders the Milestones Tracking tab with timeline visualization.

**Parameters:**
- `projectId` (string, optional) - Filter by specific project
- `dateRange` (string, optional) - Date range for filtering

**Returns:**
- `HTMLElement` - Milestones container with timelines per project

**Features:**
- Creates per-project milestone sections
- Shows milestone statistics
- Builds timeline visualization
- Displays milestone status indicators
- Handles overdue highlighting

---

#### `renderTaskAnalytics(projectId, dateRange)` - Lines ~1540-1750
Renders the Task Analytics tab with distribution and task lists.

**Parameters:**
- `projectId` (string, optional) - Filter by specific project
- `dateRange` (string, optional) - Date range for filtering

**Returns:**
- `HTMLElement` - Task analytics container with charts and lists

**Features:**
- Calculates task distribution statistics
- Creates pie chart visualization
- Builds summary cards
- Groups tasks by status/priority/assignee
- Makes tasks interactive

---

#### `renderActionableInsights(projectId, dateRange)` - Lines ~1750-1950
Renders the Actionable Insights tab with critical information.

**Parameters:**
- `projectId` (string, optional) - Filter by specific project
- `dateRange` (string, optional) - Date range for filtering

**Returns:**
- `HTMLElement` - Insights container with multiple sections

**Features:**
- Lists overdue items with details
- Identifies at-risk projects
- Calculates performance metrics
- Detects bottlenecks
- Provides recommendations

---

### 🎨 Component Builder Functions

#### `createProjectProgressCard(project)` - Lines ~1372-1422
Creates an individual project progress card.

**Parameters:**
- `project` (object) - Project data object

**Returns:**
- `HTMLElement` - Project card element

**Features:**
- Displays project name and status badge
- Shows dates and days remaining
- Creates progress bar
- Calculates project status
- Makes card clickable

**Expected Project Object:**
```javascript
{
  project_id: 1,
  project_name: "Downtown Plaza",
  project_location: "Downtown",
  project_status: "in progress",
  start_date: "2025-12-15",
  end_date: "2026-03-20",
  duedate: "2026-03-20",
  total_milestone: 5,
  completed_milestone: 2,
  total_personnel: 12
}
```

---

#### `createProgressBar(percent, width)` - Lines ~1424-1445
Creates a styled progress bar with color coding.

**Parameters:**
- `percent` (number) - Completion percentage (0-100)
- `width` (string, optional) - CSS width value, default '100%'

**Returns:**
- `HTMLElement` - Progress bar container with fill

**Color Coding:**
- 75-100% = Green (#388e3c)
- 50-74% = Blue (#1976d2)
- 25-49% = Orange (#f57c00)
- 0-24% = Red (#d32f2f)

---

#### `createMilestoneTimeline(project)` - Lines ~1488-1540
Creates a timeline visualization for project milestones.

**Parameters:**
- `project` (object) - Project object containing project_id

**Returns:**
- `HTMLElement` - Timeline container with milestone steps

**Features:**
- Fetches milestones from API
- Creates step indicators
- Shows status icons
- Displays dates
- Highlights overdue items
- Makes milestones clickable

---

#### `createTaskItem(task, status)` - Lines ~1515-1545
Creates an individual task item for display in lists.

**Parameters:**
- `task` (object) - Task data object
- `status` (string) - Current status of task

**Returns:**
- `HTMLElement` - Task item element

**Features:**
- Shows task name and priority badge
- Displays assignee information
- Shows due date with overdue styling
- Makes task clickable

**Expected Task Object:**
```javascript
{
  task_id: 1,
  task_name: "Finalize documentation",
  priority: "high",
  assignee: "John Smith",
  dueDate: new Date("2026-01-15"),
  status: "completed"
}
```

---

#### `createTaskPieChart(stats)` - Lines ~1545-1615
Creates a pie chart showing task distribution.

**Parameters:**
- `stats` (object) - Task statistics object

**Returns:**
- `HTMLElement` - Chart container with SVG pie chart and legend

**Expected Stats Object:**
```javascript
{
  completed: 45,
  inProgress: 28,
  pending: 32,
  overdue: 8
}
```

**Features:**
- Creates SVG pie chart
- Builds color-coded legend
- Shows task counts per status
- Responsive sizing

---

### 🎯 Status & Calculation Functions

#### `getProjectStatus(project)` - Lines ~1447-1465
Determines the status of a project based on completion and deadline.

**Parameters:**
- `project` (object) - Project object with completion and date data

**Returns:**
- `string` - Status: "Completed", "Delayed", "At Risk", or "On Track"

**Status Logic:**
- Completed: project_status === 'completed'
- Delayed: daysRemaining < 0
- At Risk: completion < 50% AND daysRemaining < 7, OR daysRemaining < 3
- On Track: Default

**Example:**
```javascript
const status = getProjectStatus(project);
// Returns: "At Risk"
```

---

#### `calculateDaysRemaining(endDate)` - Lines ~1467-1471
Calculates the number of days remaining until a deadline.

**Parameters:**
- `endDate` (Date or string) - End/due date

**Returns:**
- `number` - Days remaining (negative if overdue)

**Example:**
```javascript
const days = calculateDaysRemaining("2026-01-25");
// Returns: 9 (if today is Jan 16)
```

---

### 🖼️ Modal Functions

#### `showProjectDetailsModal(project)` - Lines ~1830-1890
Displays a modal with detailed project information.

**Parameters:**
- `project` (object) - Project data object

**Returns:**
- None (displays modal)

**Modal Contents:**
- Project name
- Current status
- Location
- Start and end dates
- Overall progress percentage
- Personnel count

---

#### `showMilestoneDetailsModal(milestone)` - Lines ~1892-1935
Displays a modal with detailed milestone information.

**Parameters:**
- `milestone` (object) - Milestone data object

**Returns:**
- None (displays modal)

**Modal Contents:**
- Milestone name
- Current status
- Due date
- Days overdue (if applicable)
- Description

---

#### `showTaskDetailsModal(task, status)` - Lines ~1937-1990
Displays a modal with detailed task information.

**Parameters:**
- `task` (object) - Task data object
- `status` (string) - Current task status

**Returns:**
- None (displays modal)

**Modal Contents:**
- Task name
- Current status
- Priority level
- Assigned team member
- Due date
- Progress percentage

---

### 🛠️ Helper & Utility Functions

#### `div(id, className)` - Built-in Helper
Creates a div element with optional ID and classes.

**Parameters:**
- `id` (string, optional) - Element ID
- `className` (string, optional) - CSS class names

**Returns:**
- `HTMLElement` - Div element

**Usage:**
```javascript
const container = div('main-container', 'flex-column');
```

---

#### `span(id, className)` - Built-in Helper
Creates a span element with optional ID and classes.

**Parameters:**
- `id` (string, optional) - Element ID
- `className` (string, optional) - CSS class names

**Returns:**
- `HTMLElement` - Span element

---

#### `fetchData(endpoint)` - Built-in Helper
Fetches data from API endpoint.

**Parameters:**
- `endpoint` (string) - API endpoint URL

**Returns:**
- `Promise` - Resolves to data object or 'error'

**Usage:**
```javascript
const projects = await fetchData('/api/projects');
if (projects !== 'error') {
  // Use projects data
}
```

---

#### `dateFormatting(date, format)` - Built-in Helper
Formats a date object to string.

**Parameters:**
- `date` (Date or string) - Date to format
- `format` (string) - Format type ('date', 'time', 'datetime')

**Returns:**
- `string` - Formatted date string

**Usage:**
```javascript
const formatted = dateFormatting(new Date(), 'date');
// Returns: "Jan 16, 2026"
```

---

## Function Dependencies

```
createProjectProgressSection()
├── renderProjectProgressOverview()
│   ├── fetchData('/api/projects')
│   ├── createProjectProgressCard()
│   │   ├── createProgressBar()
│   │   ├── getProjectStatus()
│   │   ├── calculateDaysRemaining()
│   │   └── showProjectDetailsModal()
│   └── dateFormatting()
├── renderMilestonesTracking()
│   ├── fetchData('/api/projects')
│   └── createMilestoneTimeline()
│       ├── fetchData('/api/milestones')
│       ├── showMilestoneDetailsModal()
│       └── dateFormatting()
├── renderTaskAnalytics()
│   ├── fetchData('/api/tasks')
│   ├── createTaskPieChart()
│   ├── createTaskItem()
│   │   ├── dateFormatting()
│   │   └── showTaskDetailsModal()
│   └── div(), span()
└── renderActionableInsights()
    ├── fetchData('/api/projects')
    ├── fetchData('/api/tasks')
    ├── fetchData('/api/milestones')
    ├── createProgressBar()
    └── dateFormatting()
```

---

## CSS Classes Reference

### Main Containers
- `.project-progress-analytics-section` - Main section
- `.project-progress-tabs` - Tab navigation
- `.project-progress-content-container` - Content area

### Filter Elements
- `.project-progress-filters` - Filter controls container
- `.filter-control` - Individual filter control
- `.filter-select` - Select dropdown

### Tab Buttons
- `.progress-tab-btn` - Tab button
- `.progress-tab-btn.active` - Active tab button

### Overview Tab
- `.progress-overview-container` - Overview content
- `.overall-completion-card` - Overall completion card
- `.project-progress-card` - Individual project card
- `.card-header` - Card header section
- `.status-badge` - Status indicator badge
- `.progress-bar-container` - Progress bar wrapper
- `.projects-progress-grid` - Grid of project cards

### Milestones Tab
- `.milestones-tracking-container` - Milestones content
- `.milestone-project-section` - Per-project section
- `.milestone-timeline` - Timeline container
- `.milestone-step` - Individual milestone step
- `.step-indicator` - Milestone status indicator

### Tasks Tab
- `.task-analytics-container` - Tasks content
- `.task-distribution-chart` - Chart container
- `.task-summary-grid` - Summary cards grid
- `.task-list-section` - Task list area
- `.task-group` - Grouped tasks section
- `.task-item` - Individual task item

### Insights Tab
- `.insights-container` - Insights content
- `.insight-section` - Individual insight section
- `.insight-item` - Insight item element

### Modals
- `.project-details-modal` - Project modal
- `.milestone-details-modal` - Milestone modal
- `.task-details-modal` - Task modal
- `.modal-content` - Modal content wrapper
- `.modal-header` - Modal header
- `.modal-body` - Modal body content

---

## Event Listeners

### Tab Navigation
```javascript
tabBtn.addEventListener('click', () => {
  // Switch active tab
  // Show/hide content
});
```

### Filter Changes
```javascript
projectSelect.addEventListener('change', updateAllContent);
dateSelect.addEventListener('change', updateAllContent);
statusSelect.addEventListener('change', updateAllContent);
```

### Card/Item Clicks
```javascript
card.addEventListener('click', () => {
  showProjectDetailsModal(project);
});

milestone.addEventListener('click', () => {
  showMilestoneDetailsModal(milestone);
});

taskItem.addEventListener('click', () => {
  showTaskDetailsModal(task, status);
});
```

### Modal Close
```javascript
closeBtn.addEventListener('click', () => {
  modal.remove();
  document.body.classList.remove('modal-open');
});
```

---

## Error Handling

All functions include error handling:

```javascript
const data = await fetchData('/api/endpoint');

if (data === 'error') {
  // Handle error
  const empty = div('', 'empty-state');
  empty.innerText = 'No data available';
  container.append(empty);
  return container;
}
```

---

## Data Flow

```
User opens Analytics page
    ↓
createProjectProgressSection() called
    ↓
Fetches initial data from APIs
    ↓
Renders all four tabs with sample/real data
    ↓
User selects filters
    ↓
updateAllContent() called
    ↓
Each tab re-renders with filtered data
    ↓
User clicks project/milestone/task
    ↓
showDetailsModal() displays information
    ↓
User can close modal and continue
```

---

## Performance Notes

- Functions use async/await for clean data handling
- DOM updates are batched where possible
- CSS animations are hardware-accelerated
- Charts use SVG for scalability
- No unnecessary DOM manipulation
- Efficient event delegation (coming in future updates)

---

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

---

**Total Functions: 15+ main functions**  
**Code Lines: ~1500 JavaScript**  
**Documentation: Complete**  
**Status: Production Ready ✅**
