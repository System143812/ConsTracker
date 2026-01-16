# Reusable Modal Component

A flexible, accessible, and beautifully designed modal system for the Constracker project.

## Features

- ✨ **Flexible Content**: Supports text, HTML elements, and dynamic content
- 🎨 **Status Badges**: Color-coded badges for different states (Completed, In Progress, Pending, Overdue)
- 🎬 **Smooth Animations**: Fade-in, slide-up effects with configurable transitions
- ♿ **Accessible**: ESC key support, overlay click, focus management, ARIA labels
- 📱 **Responsive Design**: Mobile-optimized with touch-friendly buttons
- 🎯 **Customizable**: Multiple button styles (primary, secondary, success, danger, warning)
- 🔄 **Reusable**: Single implementation works for milestones, tasks, projects, confirmations, and more

## Installation

The modal component is already integrated into the Constracker project:

**JavaScript**: `private/admin/adminJs/adminContent.js`  
**CSS**: `public/styles/project-progress-analytics.css`  
**Demo**: `public/modal-demo.html`

## Basic Usage

```javascript
const modal = createReusableModal({
    title: 'Milestone Details',
    content: 'Your content here',
    actions: {
        onClose: () => console.log('Closed'),
        onAction: () => console.log('Action clicked')
    }
});

document.body.append(modal);
```

## API Reference

### `createReusableModal(config)`

Creates a new modal instance.

#### Configuration Object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | **required** | Modal title text |
| `description` | string | `undefined` | Optional subtitle/description |
| `content` | HTMLElement \| string | **required** | Dynamic content area |
| `icon` | string | `undefined` | Optional emoji/icon to display |
| `statusBadge` | string | `undefined` | Optional status badge text |
| `statusClass` | string | `undefined` | CSS class for status badge styling |
| `modalClass` | string | `'reusable-modal'` | Custom CSS class for modal |
| `closeOnOverlay` | boolean | `true` | Close modal when clicking overlay |
| `actions` | object | `{}` | Action buttons configuration |

#### Actions Object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `onClose` | function | `undefined` | Callback when modal closes |
| `onAction` | function | `undefined` | Callback for primary action button |
| `actionLabel` | string | `'Confirm'` | Primary action button text |
| `actionClass` | string | `'primary'` | Button style class |
| `showAction` | boolean | `true` | Show/hide primary action button |

## Examples

### 1. Milestone Details Modal

```javascript
async function showMilestoneModal(milestone) {
    const tasks = await fetchData(`/api/tasks/${milestone.id}`);
    
    const detailsContent = createModalDetailGrid({
        'Due Date': dateFormatting(milestone.dueDate, 'date'),
        'Status': milestone.status,
        'Progress': `${milestone.progress}%`
    });
    
    const tasksList = createModalContentList(tasks, (task) => {
        const item = div('', 'task-item');
        item.innerText = task.task_name;
        return item;
    });
    
    const contentWrapper = div('', 'modal-combined-content');
    contentWrapper.append(detailsContent, tasksList);
    
    const modal = createReusableModal({
        title: milestone.name,
        icon: '📍',
        description: milestone.description,
        statusBadge: milestone.status,
        statusClass: 'status-in-progress',
        content: contentWrapper,
        actions: {
            actionLabel: 'Edit Milestone',
            onAction: async () => {
                // Edit logic here
                closeModal(document.querySelector('.modal-overlay'));
            }
        }
    });
    
    document.body.append(modal);
}
```

### 2. Task Details Modal

```javascript
function showTaskModal(task) {
    const detailsContent = createModalDetailGrid({
        'Assigned To': task.assignee,
        'Priority': task.priority,
        'Due Date': dateFormatting(task.dueDate, 'date'),
        'Status': task.status
    });
    
    const modal = createReusableModal({
        title: task.name,
        description: task.description,
        icon: '✓',
        statusBadge: task.status,
        statusClass: `status-${task.status.toLowerCase()}`,
        content: detailsContent,
        actions: {
            actionLabel: 'Mark Complete',
            actionClass: 'success',
            onAction: async () => {
                await markTaskComplete(task.id);
                alertPopup('Task completed!', warnType.good);
                closeModal(document.querySelector('.modal-overlay'));
            }
        }
    });
    
    document.body.append(modal);
}
```

### 3. Project Details Modal

```javascript
async function showProjectModal(project) {
    const milestones = await fetchData(`/api/milestones/${project.project_id}`);
    
    const detailsContent = createModalDetailGrid({
        'Project ID': project.project_id,
        'Location': project.project_location,
        'Start Date': dateFormatting(new Date(project.start_date), 'date'),
        'Due Date': dateFormatting(new Date(project.duedate), 'date'),
        'Total Milestones': milestones.length
    });
    
    const modal = createReusableModal({
        title: project.project_name,
        description: project.project_location,
        icon: '📊',
        statusBadge: project.project_status,
        statusClass: 'status-completed',
        content: detailsContent,
        actions: {
            actionLabel: 'View Details',
            onAction: () => {
                // Navigate to project page
            }
        }
    });
    
    document.body.append(modal);
}
```

### 4. Confirmation Modal

```javascript
function showDeleteConfirmation(itemName, onConfirm) {
    const contentEl = div('', 'confirmation-message');
    contentEl.innerHTML = `
        <p>Are you sure you want to delete "${itemName}"?</p>
        <p style="color: #999; font-size: 13px;">This action cannot be undone.</p>
    `;
    
    const modal = createReusableModal({
        title: 'Confirm Deletion',
        icon: '⚠️',
        content: contentEl,
        actions: {
            actionLabel: 'Delete',
            actionClass: 'danger',
            onAction: async () => {
                await onConfirm();
                closeModal(document.querySelector('.modal-overlay'));
            }
        }
    });
    
    document.body.append(modal);
}
```

### 5. Simple Info Modal

```javascript
function showInfoModal() {
    const modal = createReusableModal({
        title: 'Information',
        icon: '🎉',
        content: '<p style="padding: 20px; text-align: center;">Your changes have been saved successfully!</p>',
        actions: {
            actionLabel: 'OK',
            actionClass: 'primary'
        }
    });
    
    document.body.append(modal);
}
```

## Helper Functions

### `createModalDetailGrid(details)`

Creates a formatted grid of label-value pairs.

```javascript
const detailsGrid = createModalDetailGrid({
    'Label 1': 'Value 1',
    'Label 2': 'Value 2',
    'Label 3': 'Value 3'
});
```

### `createModalContentList(items, itemRenderer)`

Creates a list of items with custom rendering.

```javascript
const list = createModalContentList(tasks, (task) => {
    const item = div('', 'task-item');
    item.innerText = task.name;
    return item;
});
```

### `closeModal(modalBg)`

Programmatically closes a modal with animation.

```javascript
closeModal(document.querySelector('.modal-overlay'));
```

## Status Badge Classes

Available status classes for color-coding:

- `status-completed` - Green (Success)
- `status-in-progress` - Orange (Warning)
- `status-pending` - Blue (Info)
- `status-overdue` - Red (Danger)
- `status-not-started` - Gray (Neutral)

## Button Classes

Available action button classes:

- `primary` - Blue button for primary actions
- `secondary` - Gray button for secondary actions
- `success` - Green button for completion actions
- `danger` - Red button for destructive actions
- `warning` - Orange button for warning actions

## Closing Behavior

The modal automatically closes when:
- User clicks the X button (top right)
- User clicks the "Close" button (footer)
- User clicks outside the modal (on overlay)
- User presses the ESC key

All close actions trigger the `onClose` callback if provided.

## Responsive Design

The modal automatically adapts to different screen sizes:

- **Desktop**: Full-width up to 600px
- **Tablet (≤768px)**: 95% width, adjusted padding
- **Mobile (≤480px)**: 95% width, stacked footer buttons

## Accessibility

The modal includes:
- ARIA labels for screen readers
- ESC key support for keyboard users
- Focus management
- Semantic HTML structure
- High contrast for readability

## CSS Customization

Override default styles by targeting these classes:

```css
.modal-overlay {
    /* Overlay background */
}

.modal-container {
    /* Modal box */
}

.modal-header-section {
    /* Header area */
}

.modal-content-area {
    /* Content area */
}

.modal-footer-section {
    /* Footer area */
}
```

## Demo

View the live demo at: `http://localhost:3000/modal-demo.html`

Or open the demo file directly: `public/modal-demo.html`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Best Practices

1. **Keep content concise**: Modals should present focused information
2. **Use appropriate icons**: Visual cues help users understand context
3. **Choose the right button style**: Match button colors to action intent
4. **Provide clear actions**: Button labels should describe what will happen
5. **Handle errors gracefully**: Wrap async actions in try-catch blocks
6. **Clean up on close**: Remove event listeners and DOM references

## Troubleshooting

**Modal doesn't appear:**
- Ensure CSS file is loaded
- Check that modal is appended to document.body
- Verify no JavaScript errors in console

**Animation is choppy:**
- Check browser performance
- Reduce backdrop-filter blur on slower devices

**Content overflow:**
- Modal has max-height: 90vh with automatic scrolling
- For very tall content, consider pagination or tabs

## Contributing

When extending the modal component:

1. Maintain consistent styling with existing design
2. Test on mobile devices and tablets
3. Ensure accessibility features remain intact
4. Update this documentation with new examples

## License

Part of the Constracker project. Internal use only.

---

**Created:** January 2026  
**Last Updated:** January 16, 2026  
**Version:** 1.0.0
