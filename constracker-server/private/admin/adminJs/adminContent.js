import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, button, createButton, createFilterContainer, createPaginationControls, createInput, createFilterInput, editFormButton, validateInput } from "/js/components.js";
import { createMilestoneOl, milestoneFullOl, showLogDetailsOverlay, createOverlayWithBg, hideOverlayWithBg, showDeleteConfirmation, showOverlayWithBg } from "/mainJs/overlays.js";

const defaultImageBackgroundColors = [
    '#B388EB', '#FFD180', '#80CBC4', '#E1BEE7', '#C5E1A5',
    '#F48FB1', '#81D4FA', '#FFF59D', '#A7FFEB', '#FFAB91'
];

// ======================================================
// REUSABLE MODAL COMPONENT SYSTEM
// ======================================================
/**
 * Creates a reusable modal with consistent design across the application
 * 
 * @param {Object} config - Modal configuration object
 * @param {string} config.title - Modal title text
 * @param {string} [config.description] - Optional description/subtitle
 * @param {HTMLElement|string} config.content - Dynamic content area (HTML element or string)
 * @param {Object} [config.actions] - Footer action buttons configuration
 * @param {Function} [config.actions.onClose] - Close button callback
 * @param {Function} [config.actions.onAction] - Primary action button callback
 * @param {string} [config.actions.actionLabel='Confirm'] - Primary action button text
 * @param {string} [config.actions.actionClass='primary'] - Action button style class
 * @param {boolean} [config.actions.showAction=true] - Show/hide primary action button
 * @param {string} [config.statusBadge] - Optional status badge text
 * @param {string} [config.statusClass] - Status badge CSS class
 * @param {string} [config.icon] - Optional icon/emoji to display
 * @param {string} [config.modalClass='reusable-modal'] - Custom modal class
 * @param {boolean} [config.closeOnOverlay=true] - Close modal when clicking overlay
 * 
 * @returns {HTMLElement} Modal background element (append to document.body)
 * 
 * @example
 * // Simple modal
 * const modal = createReusableModal({
 *     title: 'Milestone Details',
 *     content: 'This is the milestone content',
 *     actions: {
 *         onClose: () => console.log('Closed'),
 *         onAction: () => console.log('Action clicked'),
 *         actionLabel: 'Save Changes'
 *     }
 * });
 * document.body.append(modal);
 * 
 * @example
 * // Modal with dynamic content
 * const contentEl = div('', 'custom-content');
 * contentEl.innerHTML = '<ul><li>Item 1</li><li>Item 2</li></ul>';
 * const modal = createReusableModal({
 *     title: 'Task List',
 *     description: 'Associated tasks for this milestone',
 *     content: contentEl,
 *     statusBadge: 'In Progress',
 *     statusClass: 'status-in-progress'
 * });
 * document.body.append(modal);
 */
function createReusableModal(config) {
    const {
        title,
        description,
        content,
        actions = {},
        statusBadge,
        statusClass,
        icon,
        modalClass = 'reusable-modal',
        closeOnOverlay = true
    } = config;
    
    const {
        onClose,
        onAction,
        actionLabel = 'Confirm',
        actionClass = 'primary',
        showAction = true
    } = actions;
    
    // Create modal structure
    const modalBg = div('', 'modal-overlay');
    const modal = div('', `modal-container ${modalClass}`);
    
    // HEADER SECTION
    const header = div('', 'modal-header-section');
    const headerContent = div('', 'modal-header-content-wrapper');
    
    // Icon (if provided)
    if (icon) {
        const iconEl = span('', 'modal-icon');
        iconEl.innerText = icon;
        headerContent.append(iconEl);
    }
    
    // Title
    const titleEl = span('', 'modal-title-text');
    titleEl.innerText = title;
    headerContent.append(titleEl);
    
    // Status badge (if provided)
    if (statusBadge) {
        const badge = span('', `modal-status-badge ${statusClass || ''}`);
        badge.innerText = statusBadge;
        headerContent.append(badge);
    }
    
    header.append(headerContent);
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-button';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close modal');
    header.append(closeBtn);
    
    modal.append(header);
    
    // DESCRIPTION SECTION (if provided)
    if (description) {
        const descEl = div('', 'modal-description');
        descEl.innerText = description;
        modal.append(descEl);
    }
    
    // CONTENT SECTION
    const contentWrapper = div('', 'modal-content-area');
    if (typeof content === 'string') {
        contentWrapper.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        contentWrapper.append(content);
    }
    modal.append(contentWrapper);
    
    // FOOTER SECTION
    const footer = div('', 'modal-footer-section');
    
    const closeBtnFooter = createButton('Close', 'modal-btn-close', ['secondary-btn']);
    footer.append(closeBtnFooter);
    
    if (showAction && onAction) {
        const actionBtn = createButton(actionLabel, 'modal-btn-action', [actionClass + '-btn']);
        footer.append(actionBtn);
        
        // Action button click handler
        actionBtn.addEventListener('click', async () => {
            try {
                await onAction();
            } catch (error) {
                console.error('Modal action error:', error);
                alertPopup('An error occurred', warnType.bad);
            }
        });
    }
    
    modal.append(footer);
    modalBg.append(modal);
    
    // EVENT HANDLERS
    
    // Close button (header X)
    closeBtn.addEventListener('click', () => {
        closeModal(modalBg);
        if (onClose) onClose();
    });
    
    // Close button (footer)
    closeBtnFooter.addEventListener('click', () => {
        closeModal(modalBg);
        if (onClose) onClose();
    });
    
    // Overlay click
    if (closeOnOverlay) {
        modalBg.addEventListener('click', (e) => {
            if (e.target === modalBg) {
                closeModal(modalBg);
                if (onClose) onClose();
            }
        });
    }
    
    // ESC key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal(modalBg);
            if (onClose) onClose();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Add animation class after append
    requestAnimationFrame(() => {
        modalBg.classList.add('modal-fade-in');
    });
    
    return modalBg;
}

/**
 * Closes modal with fade-out animation
 */
function closeModal(modalBg) {
    modalBg.classList.add('modal-fade-out');
    setTimeout(() => {
        if (modalBg.parentElement) {
            modalBg.remove();
        }
    }, 300);
}

/**
 * Helper function to create content lists for modals
 */
function createModalContentList(items, itemRenderer) {
    const list = div('', 'modal-content-list');
    
    if (!items || items.length === 0) {
        const empty = span('', 'modal-empty-message');
        empty.innerText = 'No items to display';
        list.append(empty);
        return list;
    }
    
    items.forEach(item => {
        const itemEl = itemRenderer(item);
        list.append(itemEl);
    });
    
    return list;
}

/**
 * Helper function to create detail rows for modals
 */
function createModalDetailGrid(details) {
    const grid = div('', 'modal-detail-grid');
    
    Object.entries(details).forEach(([label, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            const row = div('', 'modal-detail-row');
            
            const labelEl = span('', 'modal-detail-label');
            labelEl.innerText = label;
            
            const valueEl = span('', 'modal-detail-value');
            if (typeof value === 'string' || typeof value === 'number') {
                valueEl.innerText = value;
            } else if (value instanceof HTMLElement) {
                valueEl.append(value);
            }
            
            row.append(labelEl, valueEl);
            grid.append(row);
        }
    });
    
    return grid;
}

// ======================================================
// EXAMPLE IMPLEMENTATIONS - Using Reusable Modal
// ======================================================

/**
 * Example 1: Milestone Details Modal using reusable component
 */
async function showMilestoneModalExample(milestone) {
    // Fetch associated tasks
    const tasks = milestone.id ? await fetchData(`/api/tasks/${milestone.id}`) : [];
    
    // Create detail grid
    const detailsContent = createModalDetailGrid({
        'Due Date': dateFormatting(milestone.dueDate, 'date'),
        'Status': milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1),
        'Progress': milestone.progress ? `${Math.round(milestone.progress)}%` : 'Not started',
        'Days Until Due': milestone.dueDate ? Math.ceil((milestone.dueDate - new Date()) / (1000 * 60 * 60 * 24)) : 'N/A'
    });
    
    // Create tasks list
    const tasksList = createModalContentList(
        tasks !== 'error' && Array.isArray(tasks) ? tasks : [],
        (task) => {
            const taskItem = div('', 'milestone-task-item');
            const taskName = span('', 'task-item-name');
            taskName.innerText = task.task_name;
            const taskStatus = span('', `task-item-status status-${(task.status || 'pending').toLowerCase()}`);
            taskStatus.innerText = (task.status || 'pending').charAt(0).toUpperCase() + (task.status || 'pending').slice(1);
            taskItem.append(taskName, taskStatus);
            return taskItem;
        }
    );
    
    // Combine content
    const contentWrapper = div('', 'modal-combined-content');
    
    if (milestone.description) {
        const descSection = div('', 'content-section');
        const descTitle = span('', 'section-title');
        descTitle.innerText = 'Description';
        const descText = span('', 'section-text');
        descText.innerText = milestone.description;
        descSection.append(descTitle, descText);
        contentWrapper.append(descSection);
    }
    
    const detailsSection = div('', 'content-section');
    const detailsTitle = span('', 'section-title');
    detailsTitle.innerText = 'Details';
    detailsSection.append(detailsTitle, detailsContent);
    contentWrapper.append(detailsSection);
    
    const tasksSection = div('', 'content-section');
    const tasksTitle = span('', 'section-title');
    tasksTitle.innerText = 'Associated Tasks';
    tasksSection.append(tasksTitle, tasksList);
    contentWrapper.append(tasksSection);
    
    // Create and show modal
    const modal = createReusableModal({
        title: milestone.name,
        icon: milestone.isOverdue ? '⚠️' : '📍',
        statusBadge: milestone.status,
        statusClass: `status-${milestone.status.toLowerCase().replace(/\s+/g, '-')}`,
        content: contentWrapper,
        actions: {
            actionLabel: 'Edit Milestone',
            onAction: async () => {
                console.log('Edit milestone:', milestone);
                alertPopup('Edit functionality coming soon', warnType.info);
            },
            onClose: () => {
                console.log('Modal closed');
            }
        }
    });
    
    document.body.append(modal);
}

/**
 * Example 2: Task Details Modal using reusable component
 */
function showTaskModalExample(task) {
    const detailsContent = createModalDetailGrid({
        'Assigned To': task.assignee || 'Unassigned',
        'Priority': task.priority || 'Medium',
        'Due Date': task.dueDate ? dateFormatting(task.dueDate, 'date') : 'Not set',
        'Status': task.status || 'Pending',
        'Progress': task.progress ? `${task.progress}%` : '0%'
    });
    
    const modal = createReusableModal({
        title: task.name,
        description: task.description || 'No description provided',
        icon: '✓',
        statusBadge: task.status || 'Pending',
        statusClass: `status-${(task.status || 'pending').toLowerCase()}`,
        content: detailsContent,
        actions: {
            actionLabel: 'Mark Complete',
            actionClass: 'success',
            onAction: async () => {
                console.log('Mark task complete:', task);
                alertPopup('Task marked as complete', warnType.good);
                closeModal(document.querySelector('.modal-overlay'));
            }
        }
    });
    
    document.body.append(modal);
}

/**
 * Example 3: Project Details Modal using reusable component
 */
async function showProjectModalExample(project) {
    const milestones = await fetchData(`/api/milestones/${project.project_id}`);
    
    const detailsContent = createModalDetailGrid({
        'Project ID': project.project_id,
        'Location': project.project_location || 'Not specified',
        'Start Date': project.start_date ? dateFormatting(new Date(project.start_date), 'date') : 'N/A',
        'Due Date': project.duedate ? dateFormatting(new Date(project.duedate), 'date') : 'N/A',
        'Status': project.project_status || 'Active',
        'Total Milestones': milestones !== 'error' && Array.isArray(milestones) ? milestones.length : 0,
        'Completed Milestones': project.completed_milestone || 0
    });
    
    const modal = createReusableModal({
        title: project.project_name,
        description: `${project.project_location || 'Project'} - ${project.project_status || 'Active'}`,
        icon: '📊',
        statusBadge: project.project_status || 'Active',
        statusClass: `status-${(project.project_status || 'active').toLowerCase()}`,
        content: detailsContent,
        actions: {
            actionLabel: 'View Full Details',
            onAction: () => {
                console.log('View project details:', project);
                alertPopup('Navigating to project details...', warnType.info);
            }
        }
    });
    
    document.body.append(modal);
}

/**
 * Example 4: Confirmation Modal using reusable component
 */
function showConfirmationModal(title, message, onConfirm) {
    const contentEl = div('', 'confirmation-message');
    contentEl.innerText = message;
    contentEl.style.textAlign = 'center';
    contentEl.style.padding = '20px';
    contentEl.style.fontSize = '15px';
    contentEl.style.color = '#333';
    
    const modal = createReusableModal({
        title: title,
        icon: '⚠️',
        content: contentEl,
        modalClass: 'confirmation-modal',
        actions: {
            actionLabel: 'Confirm',
            actionClass: 'danger',
            onAction: async () => {
                await onConfirm();
                closeModal(document.querySelector('.modal-overlay'));
            }
        }
    });
    
    document.body.append(modal);
}

/**
 * Example 5: Simple info modal with trigger button
 */
function createTriggerButtonExample() {
    const triggerBtn = createButton('Show Modal Example', 'trigger-modal-btn', ['primary-btn']);
    
    triggerBtn.addEventListener('click', () => {
        const modal = createReusableModal({
            title: 'Welcome to Reusable Modals!',
            description: 'This is a demonstration of the reusable modal component',
            icon: '🎉',
            content: '<p style="padding: 20px; text-align: center;">You can use this modal system for milestones, tasks, projects, confirmations, and more!</p>',
            actions: {
                actionLabel: 'Got It!',
                actionClass: 'primary',
                showAction: true
            }
        });
        
        document.body.append(modal);
    });
    
    return triggerBtn;
}

function roundDecimal(number) {
    return Math.floor(number * 100) / 100;
}

function createMaterialCard(material, role, currentUserId, refreshMaterialsContentFn) {
    const card = div(`material-card-${material.item_id}`, 'material-card');

    let imageUrl;
    if (material.image_url) {
        // Heuristic to check if it's a new hashed image (SHA256 hex length is 64)
        if (material.image_url.length > 60 && !material.image_url.includes('-')) {
            imageUrl = `/itemImages/${material.image_url}`;
        } else if (material.image_url !== 'constrackerWhite.svg') {
            imageUrl = `/image/${material.image_url}`;
        } else {
            imageUrl = `/assets/pictures/constrackerWhite.svg`;
        }
    } else {
        imageUrl = `/assets/pictures/constrackerWhite.svg`;
    }

    const colorIndex = material.item_id % defaultImageBackgroundColors.length;
    const backgroundColor = defaultImageBackgroundColors[colorIndex];

    const imageContainer = div('materialImageContainer', 'material-image-container');
    imageContainer.style.backgroundImage = `url(${imageUrl})`;
    if (material.image_url === 'constrackerWhite.svg' || !material.image_url) {
        imageContainer.style.backgroundColor = backgroundColor;
        imageContainer.classList.add('default-image-bg');
    }

    const infoContainer = div('materialInfoContainer', 'material-info-container');
    
    const titleStatusContainer = div('material-title-status');
    const name = span('materialName', 'material-name');
    name.innerText = material.item_name;
    const status = span('materialStatus', 'material-status');
    status.innerText = material.status;
    if (material.status === 'pending') {
        warnType(status, 'solid', 'yellow');
    } else if (material.status === 'approved') {
        warnType(status, 'solid', 'green');
    }
    titleStatusContainer.append(name, status);

    const detailsContainer = div('material-details');
    const createDetailItem = (label, value) => {
        const item = div('', 'material-detail-item');
        const labelSpan = span('', 'label');
        labelSpan.innerText = label;
        const valueSpan = span('', 'value');
        valueSpan.innerText = value;
        item.append(labelSpan, valueSpan);
        return item;
    };

    detailsContainer.append(
        createDetailItem('Category:', material.category_name || 'N/A'),
        createDetailItem('Unit:', material.unit_name || 'N/A'),
        createDetailItem('Size:', material.size || 'N/A'),
        createDetailItem('Supplier:', material.supplier_name || 'N/A')
    );

    const price = div('materialPrice', 'material-price');
    price.innerText = `₱${material.price.toLocaleString()}`;

    const statusActions = div('materialStatusActions', 'material-status-actions');
    const actionsContainer = div('materialActionsContainer', 'material-actions-container');

    if (role === 'engineer' && material.status === 'pending') {
        // Approve Button
        const approveSpan = span('approveMaterialAction', 'material-action-btn green-text');
        approveSpan.innerText = 'Approve';
        approveSpan.addEventListener('click', async () => {
            const response = await fetch(`/api/materials/${material.item_id}/approve`, { method: 'PUT' });
            if (response.ok) {
                alertPopup('success', `${material.item_name} approved successfully!`);
                refreshMaterialsContentFn();
            } else {
                alertPopup('error', `Failed to approve ${material.item_name}.`);
            }
        });

        // Decline Button
        const declineSpan = span('declineMaterialAction', 'material-action-btn red-text');
        declineSpan.innerText = 'Decline';
        declineSpan.addEventListener('click', async () => {
            const response = await fetch(`/api/materials/${material.item_id}/decline`, { method: 'PUT' });
            if (response.ok) {
                alertPopup('success', `${material.item_name} declined.`);
                refreshMaterialsContentFn();
            } else {
                alertPopup('error', `Failed to decline ${material.item_name}.`);
            }
        });
        actionsContainer.append(approveSpan, declineSpan);
    }

    const isCreator = material.created_by === currentUserId;
    const isEngineer = role === 'engineer';
    const isAdmin = role === 'admin';
    let canEdit = false;

    if (material.status === 'pending') {
        if (isEngineer || isCreator) canEdit = true;
    } else {
        if (isAdmin || isEngineer) canEdit = true;
    }

    if (canEdit) {
        const editIcon = div('editMaterialIcon', 'edit-material-icon');
        editIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click event if any
            createMaterialOverlay(material, refreshMaterialsContentFn);
        });
        imageContainer.append(editIcon);
    }
    
    statusActions.append(actionsContainer);
    infoContainer.append(titleStatusContainer, detailsContainer, price, statusActions);
    card.append(imageContainer, infoContainer);
    return card;
}

async function createMaterialOverlay(material = null, refreshMaterialsContentFn) {
    const isEditMode = material !== null;
    const overlayTitle = isEditMode ? `Edit Material: ${material.item_name}` : 'Add New Material';

    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = overlayTitle;
    overlayHeader.append(overlayHeaderContainer);

    const categories = await fetchData('/api/materials/categories');
    const suppliers = await fetchData('/api/materials/suppliers');
    const units = await fetchData('/api/materials/units');

    if (categories === 'error' || suppliers === 'error' || units === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load material data for form.');
    }

    const form = document.createElement('form');
    form.id = 'materialForm';
    form.classList.add('form-edit-forms');
    form.enctype = 'multipart/form-data';

    const createMaterialFormHeader = div('createMaterialFormHeader', 'create-form-headers');
    const createMaterialFormFooter = div('createMaterialFormFooter', 'create-form-footers');

    const materialNameInput = createInput('text', 'edit', 'Material Name', 'materialName', 'item_name', material?.item_name || '', 'Enter material name', null, 255);
    const materialDescriptionInput = createInput('textarea', 'edit', 'Description', 'materialDescription', 'item_description', material?.item_description || '', 'Enter description', null, 255);
    const materialPriceInput = createInput('text', 'edit', 'Base Price (₱)', 'materialPrice', 'price', material?.price || '', '0.00', 0.01, 99999999.99, 'decimal', 'Minimum 0.01');
    const materialSizeInput = createInput('text', 'edit', 'Size', 'materialSize', 'size', material?.size || '', 'e.g., 2x4, 1/2 inch', null, 255);

    const imageDropAreaContainer = div('imageDropAreaContainer', 'input-box-containers');
    const imageLabelContainer = div('imageLabelContainer', 'label-container');
    const imageLabel = document.createElement('label');
    imageLabel.className = 'input-labels';
    imageLabel.innerText = 'Material Image';
    const imageSubLabel = span('imageSubLabel', 'input-sub-labels');
    imageSubLabel.innerText = 'Optional, but recommended';
    imageLabelContainer.append(imageLabel);

    const imageDropArea = div('imageDropArea', 'image-drop-area');
    const imageDropAreaText = span('', 'image-drop-text');
    imageDropAreaText.innerText = 'Drag & drop an image or click to select';
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.name = 'image';
    imageInput.accept = 'image/*';
    imageInput.style.display = 'none';

    const imagePreview = div('imagePreview', 'image-preview');
    if (isEditMode && material?.image_url && material.image_url !== 'constrackerWhite.svg') {
        // Heuristic to check if it's a new hashed image (SHA256 hex length is 64)
        if (material.image_url.length > 60 && !material.image_url.includes('-')) {
            imagePreview.style.backgroundImage = `url('/itemImages/${material.image_url}')`;
        } else {
            imagePreview.style.backgroundImage = `url('/image/${material.image_url}')`;
        }
        imagePreview.style.display = 'block';
        // Removed: imageDropAreaText.innerText = material.image_url;
    } else {
        imagePreview.style.display = 'none';
    }

    imageDropArea.append(imageDropAreaText, imageInput, imagePreview);
    imageDropAreaContainer.append(imageLabelContainer, imageDropArea, imageSubLabel);


    imageDropArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) {
            imageDropAreaText.innerText = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.style.backgroundImage = `url(${e.target.result})`;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imageDropAreaText.innerText = 'Drag & drop an image or click to select';
            imagePreview.style.backgroundImage = 'none';
            imagePreview.style.display = 'none';
        }
    });
    // Drag and Drop listeners
    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageDropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'dragover') imageDropArea.classList.add('drag-over');
            if (eventName === 'dragleave' || eventName === 'drop') imageDropArea.classList.remove('drag-over');
            if (eventName === 'drop') {
                const file = e.dataTransfer.files[0];
                 if (file) {
                    imageInput.files = e.dataTransfer.files;
                    imageDropAreaText.innerText = file.name;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        imagePreview.style.backgroundImage = `url(${e.target.result})`;
                        imagePreview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    });

    // --- Selects (Category, Supplier, Unit) ---
    const createSelect = (id, labelText, apiEndpoint, initialData, editValue, options) => {
        const container = div(`${id}Container`, 'input-box-containers');
        const label = document.createElement('label');
        label.htmlFor = id;
        label.classList.add('input-labels');
        label.innerText = labelText;
        const select = createFilterInput('select', 'dropdown', id, `material ${labelText.toLowerCase()}`, editValue, '', '', 'single', 1, options);
        container.append(label, select);
        return { container, select };
    };
    
    const { container: categorySelectContainer, select: categorySelect } = createSelect('materialCategorySelect', 'Category', '/api/materials/categories', material, material?.category_id, categories);
    const { container: supplierSelectContainer, select: supplierSelect } = createSelect('materialSupplierSelect', 'Supplier', '/api/materials/suppliers', material, material?.supplier_id, suppliers);
    const { container: unitSelectContainer, select: unitSelect } = createSelect('materialUnitSelect', 'Unit', '/api/materials/units', material, material?.unit_id, units);


    createMaterialFormHeader.append(
        materialNameInput,
        materialDescriptionInput,
        categorySelectContainer,
        supplierSelectContainer,
        unitSelectContainer,
        materialPriceInput,
        materialSizeInput,
        imageDropAreaContainer
    );

    const cancelBtn = createButton('cancelCreateBtn', 'wide-buttons', 'Cancel', 'cancelCreateText');
    cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    const saveMaterialData = async () => {
        const itemNameEl = materialNameInput.querySelector('input');
        const priceEl = materialPriceInput.querySelector('input');

        let isValid = true;
        if (!validateInput(itemNameEl)) isValid = false;
        if (!validateInput(priceEl)) isValid = false;

        // Validation for select dropdowns
        if (!categorySelect.dataset.value || categorySelect.dataset.value === 'all') {
            categorySelect.classList.add('error');
            isValid = false;
        } else {
            categorySelect.classList.remove('error');
        }
        if (!supplierSelect.dataset.value || supplierSelect.dataset.value === 'all') {
            supplierSelect.classList.add('error');
            isValid = false;
        } else {
            supplierSelect.classList.remove('error');
        }
        if (!unitSelect.dataset.value || unitSelect.dataset.value === 'all') {
            unitSelect.classList.add('error');
            isValid = false;
        } else {
            unitSelect.classList.remove('error');
        }

        const payload = {
            item_name: itemNameEl.value,
            item_description: materialDescriptionInput.querySelector('textarea').value,
            price: parseFloat(priceEl.value),
            size: materialSizeInput.querySelector('input').value,
            category_id: parseInt(categorySelect.dataset.value),
            supplier_id: parseInt(supplierSelect.dataset.value),
            unit_id: parseInt(unitSelect.dataset.value)
        };
        
        if (!isValid || isNaN(payload.price) || payload.price <= 0) {
            alertPopup('error', 'Please fill in all required fields correctly (ensure price is a positive number).');
            return false;
        }

        const formData = new FormData();
        for (const key in payload) {
            if (payload[key]) formData.append(key, payload[key]);
        }

        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        } else if (isEditMode && material?.image_url) {
            // Preserve existing image if no new one is uploaded during edit
            formData.append('image_url', material.image_url);
        }

        const url = isEditMode ? `/api/materials/${material.item_id}` : '/api/materials';
        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, { method, body: formData });

        if (response.ok) {
            const responseData = await response.json();
            if (responseData.message === 'No changes made to material.') {
                hideOverlayWithBg(overlayBackground);
                return true;
            }
            alertPopup('success', responseData.message);
            hideOverlayWithBg(overlayBackground);
            refreshMaterialsContentFn();
            return true; // Indicate success
        } else {
            const errorData = await response.json();
            alertPopup('error', errorData.message || 'Failed to save material.');
            if (errorData.message === "Item already exist") {
                const inputElement = materialNameInput.querySelector('input');
                inputElement.classList.add('error');
                inputElement.addEventListener('input', () => {
                    inputElement.classList.remove('error');
                }, { once: true });
            }
            return false; // Indicate failure
        }
    };

    const actionButton = createButton('createMaterialBtn', 'wide-buttons', isEditMode ? 'Save Changes' : 'Create Material', 'createBtnText');
    createMaterialFormFooter.append(cancelBtn, actionButton);

    actionButton.addEventListener('click', async () => {
        await saveMaterialData();
    });

    form.append(createMaterialFormHeader, createMaterialFormFooter);
    overlayBody.append(form);



    showOverlayWithBg(overlayBackground);
}

async function createSupplierOverlay(supplier = null, refreshCallback) {
    const isEditMode = supplier !== null;
    const overlayTitle = 'Manage Suppliers';

    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = overlayTitle;
    
    const addSupplierBtn = createButton('addSupplierBtn', 'solid-buttons', 'Add Supplier', 'addSupplierBtnText', 'addSupplierBtnIcon');
    addSupplierBtn.addEventListener('click', () => {
        renderEditView(null); // Switch to the add/edit view
    });

    overlayHeader.append(overlayHeaderContainer, addSupplierBtn);

    let suppliers = await fetchData('/api/materials/suppliers');
    if (suppliers === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load suppliers.');
    }

    const renderListView = () => {
        overlayBody.innerHTML = '';
        addSupplierBtn.style.display = 'block'; // Show add button in list view
        overlayHeaderContainer.innerText = 'Manage Suppliers';

        if (suppliers.length === 0) {
            showEmptyPlaceholder('/assets/icons/person.png', overlayBody, () => renderEditView(null), "No suppliers found.", "Add a Supplier");
            return;
        }

        const listContainer = div('supplier-list-container', 'list-container');
        suppliers.forEach(sup => {
            const listItem = div(`supplier-item-${sup.id}`, 'list-item');
            const supplierName = span('', 'item-name');
            supplierName.innerText = sup.name;

            const actionsContainer = div('', 'item-actions');
            const editBtn = createButton('editSupplier', 'icon-buttons', '', 'edit-icon', 'editBlack.png');
            editBtn.addEventListener('click', () => renderEditView(sup));
            
            const deleteBtn = createButton('deleteSupplier', 'icon-buttons', '', 'delete-icon', 'deleteBlack.png');
            deleteBtn.addEventListener('click', () => {
                showDeleteConfirmation(`Are you sure you want to delete supplier "${sup.name}"?`, async () => {
                    const response = await fetchData(`/api/materials/suppliers/${sup.id}`, { method: 'DELETE' });
                    if (response.status === 'success') {
                        alertPopup('success', 'Supplier deleted successfully!');
                        // Re-fetch suppliers and re-render the list to reflect changes
                        suppliers = await fetchData('/api/materials/suppliers');
                        renderListView(); // Re-render the list
                    } else {
                        alertPopup('error', response.message || 'Failed to delete supplier.');
                    }
                });
            });

            actionsContainer.append(editBtn, deleteBtn);
            listItem.append(supplierName, actionsContainer);
            listContainer.append(listItem);
        });
        overlayBody.append(listContainer);
    };

    const renderEditView = (sup = null) => {
        const isEdit = sup !== null;
        overlayBody.innerHTML = '';
        addSupplierBtn.style.display = 'none';
        overlayHeaderContainer.innerText = isEdit ? `Edit Supplier: ${sup.name}` : 'Add New Supplier';

        const form = document.createElement('form');
        form.id = 'supplierForm';
        form.classList.add('form-edit-forms');

        const formHeader = div('createFormHeader', 'create-form-headers');
        const nameInput = createInput('text', 'edit', 'Supplier Name', 'supplierName', 'name', sup?.name || '', 'Enter supplier name', null, 255);
        const addressInput = createInput('text', 'edit', 'Address', 'supplierAddress', 'address', sup?.address || '', 'Enter address', null, 255);
        const contactInput = createInput('text', 'edit', 'Contact', 'supplierContact', 'contact', sup?.contact_number || '', 'Enter contact number', null, 50);
        const emailInput = createInput('email', 'edit', 'Email', 'supplierEmail', 'email', sup?.email || '', 'Enter email address', null, 255);
        
        formHeader.append(nameInput, addressInput, contactInput, emailInput);

        const formFooter = div('createFormFooter', 'create-form-footers');
        const cancelBtn = createButton('cancelBtn', 'wide-buttons', 'Cancel', 'cancelText');
        cancelBtn.addEventListener('click', renderListView);

        const saveBtn = createButton('saveBtn', 'wide-buttons', isEdit ? 'Save Changes' : 'Create Supplier', 'saveText');
        saveBtn.addEventListener('click', async () => {
            const nameEl = nameInput.querySelector('input');
            if (!validateInput(nameEl)) {
                return alertPopup('error', 'Supplier name is required.');
            }

            const payload = {
                name: nameEl.value,
                address: addressInput.querySelector('input').value,
                contact_number: contactInput.querySelector('input').value,
                email: emailInput.querySelector('input').value,
            };

            const url = isEdit ? `/api/materials/suppliers/${sup.id}` : '/api/materials/suppliers';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetchPostJson(url, method, payload);

            if (response.status === 'success') {
                alertPopup('success', isEdit ? 'Supplier updated!' : 'Supplier created!');
                hideOverlayWithBg(overlayBackground);
                refreshCallback();
            } else {
                alertPopup('error', response.message || 'Failed to save supplier.');
            }
        });

        formFooter.append(cancelBtn, saveBtn);
        form.append(formHeader, formFooter);
        overlayBody.append(form);
    };

    renderListView();
    showOverlayWithBg(overlayBackground);
}

async function createCategoryOverlay(category = null, refreshCallback) {
    const isEditMode = category !== null;
    const overlayTitle = 'Manage Categories';

    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = overlayTitle;
    
    const addCategoryBtn = createButton('addCategoryBtn', 'solid-buttons', 'Add Category', 'addCategoryBtnText', 'addCategoryBtnIcon');
    addCategoryBtn.addEventListener('click', () => {
        renderEditView(null);
    });

    overlayHeader.append(overlayHeaderContainer, addCategoryBtn);

    let categories = await fetchData('/api/materials/categories'); // Changed to let
    if (categories === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load categories.');
    }

    const renderListView = () => {
        overlayBody.innerHTML = '';
        addCategoryBtn.style.display = 'block';
        overlayHeaderContainer.innerText = 'Manage Categories';

        if (categories.length === 0) {
            showEmptyPlaceholder('/assets/icons/person.png', overlayBody, () => renderEditView(null), "No categories found.", "Add a Category");
            return;
        }

        const listContainer = div('category-list-container', 'list-container');
        categories.forEach(cat => {
            const listItem = div(`category-item-${cat.id}`, 'list-item');
            const categoryName = span('', 'item-name');
            categoryName.innerText = cat.name;

            const actionsContainer = div('', 'item-actions');
            const editBtn = createButton('editCategory', 'icon-buttons', '', 'edit-icon', 'editBlack.png');
            editBtn.addEventListener('click', () => renderEditView(cat));
            
            const deleteBtn = createButton('deleteCategory', 'icon-buttons', '', 'delete-icon', 'deleteBlack.png');
            deleteBtn.addEventListener('click', () => {
                showDeleteConfirmation(`Are you sure you want to delete category "${cat.name}"?`, async () => {
                    const response = await fetchData(`/api/materials/categories/${cat.id}`, { method: 'DELETE' });
                    if (response.status === 'success') {
                        alertPopup('success', 'Category deleted successfully!');
                        // Update the local categories array
                        categories = categories.filter(c => c.id !== cat.id);
                        renderListView(); // Re-render the list
                        refreshCallback(); // Refresh the main materials content
                    } else {
                        alertPopup('error', response.message || 'Failed to delete category.');
                    }
                });
            });

            actionsContainer.append(editBtn, deleteBtn);
            listItem.append(categoryName, actionsContainer);
            listContainer.append(listItem);
        });
        overlayBody.append(listContainer);
    };

    const renderEditView = (cat = null) => {
        const isEdit = cat !== null;
        overlayBody.innerHTML = '';
        addCategoryBtn.style.display = 'none';
        overlayHeaderContainer.innerText = isEdit ? `Edit Category: ${cat.name}` : 'Add New Category';

        const form = document.createElement('form');
        form.id = 'categoryForm';
        form.classList.add('form-edit-forms');

        const formHeader = div('createFormHeader', 'create-form-headers');
        const nameInput = createInput('text', 'edit', 'Category Name', 'categoryName', 'name', cat?.name || '', 'Enter category name', null, 255);
        
        formHeader.append(nameInput);

        const formFooter = div('createFormFooter', 'create-form-footers');
        const cancelBtn = createButton('cancelBtn', 'wide-buttons', 'Cancel', 'cancelText');
        cancelBtn.addEventListener('click', renderListView);

        const saveBtn = createButton('saveBtn', 'wide-buttons', isEdit ? 'Save Changes' : 'Create Category', 'saveText');
        saveBtn.addEventListener('click', async () => {
            const nameEl = nameInput.querySelector('input');
            if (!validateInput(nameEl)) {
                return alertPopup('error', 'Category name is required.');
            }
            const payload = {
                name: nameEl.value,
            };

            const url = isEdit ? `/api/materials/categories/${cat.id}` : '/api/materials/categories';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetchPostJson(url, method, payload);

            if (response.status === 'success') {
                alertPopup('success', isEdit ? 'Category updated!' : 'Category created!');
                hideOverlayWithBg(overlayBackground);
                refreshCallback();
            } else {
                alertPopup('error', response.message || 'Failed to save category.');
            }
        });

        formFooter.append(cancelBtn, saveBtn);
        form.append(formHeader, formFooter);
        overlayBody.append(form);
    };

    renderListView();
    showOverlayWithBg(overlayBackground);
}

async function createUnitOverlay(unit = null, refreshCallback) {
    const isEditMode = unit !== null;
    const overlayTitle = 'Manage Units';

    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = overlayTitle;
    
    const addUnitBtn = createButton('addUnitBtn', 'solid-buttons', 'Add Unit', 'addUnitBtnText', 'addUnitBtnIcon');
    addUnitBtn.addEventListener('click', () => {
        renderEditView(null);
    });

    overlayHeader.append(overlayHeaderContainer, addUnitBtn);

    let units = await fetchData('/api/materials/units'); // Changed to let
    if (units === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load units.');
    }

    const renderListView = () => {
        overlayBody.innerHTML = '';
        addUnitBtn.style.display = 'block';
        overlayHeaderContainer.innerText = 'Manage Units';

        if (units.length === 0) {
            showEmptyPlaceholder('/assets/icons/person.png', overlayBody, () => renderEditView(null), "No units found.", "Add a Unit");
            return;
        }

        const listContainer = div('unit-list-container', 'list-container');
        units.forEach(un => {
            const listItem = div(`unit-item-${un.id}`, 'list-item');
            const unitName = span('', 'item-name');
            unitName.innerText = un.name;

            const actionsContainer = div('', 'item-actions');
            const editBtn = createButton('editUnit', 'icon-buttons', '', 'edit-icon', 'editBlack.png');
            editBtn.addEventListener('click', () => renderEditView(un));
            
            const deleteBtn = createButton('deleteUnit', 'icon-buttons', '', 'delete-icon', 'deleteBlack.png');
            deleteBtn.addEventListener('click', () => {
                showDeleteConfirmation(`Are you sure you want to delete unit "${un.name}"?`, async () => {
                    const response = await fetchData(`/api/materials/units/${un.id}`, { method: 'DELETE' });
                    if (response.status === 'success') {
                        alertPopup('success', 'Unit deleted successfully!');
                        // Update the local units array
                        units = units.filter(u => u.id !== un.id);
                        renderListView(); // Re-render the list
                        refreshCallback(); // Refresh the main materials content
                    } else {
                        alertPopup('error', response.message || 'Failed to delete unit.');
                    }
                });
            });

            actionsContainer.append(editBtn, deleteBtn);
            listItem.append(unitName, actionsContainer);
            listContainer.append(listItem);
        });
        overlayBody.append(listContainer);
    };

    const renderEditView = (un = null) => {
        const isEdit = un !== null;
        overlayBody.innerHTML = '';
        addUnitBtn.style.display = 'none';
        overlayHeaderContainer.innerText = isEdit ? `Edit Unit: ${un.name}` : 'Add New Unit';

        const form = document.createElement('form');
        form.id = 'unitForm';
        form.classList.add('form-edit-forms');

        const formHeader = div('createFormHeader', 'create-form-headers');
        const nameInput = createInput('text', 'edit', 'Unit Name', 'unitName', 'name', un?.name || '', 'Enter unit name', null, 255);
        
        formHeader.append(nameInput);

        const formFooter = div('createFormFooter', 'create-form-footers');
        const cancelBtn = createButton('cancelBtn', 'wide-buttons', 'Cancel', 'cancelText');
        cancelBtn.addEventListener('click', renderListView);

        const saveBtn = createButton('saveBtn', 'wide-buttons', isEdit ? 'Save Changes' : 'Create Unit', 'saveText');
        saveBtn.addEventListener('click', async () => {
            const nameEl = nameInput.querySelector('input');
            if (!validateInput(nameEl)) {
                return alertPopup('error', 'Unit name is required.');
            }
            const payload = {
                name: nameEl.value,
            };

            const url = isEdit ? `/api/materials/units/${un.id}` : '/api/materials/units';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetchPostJson(url, method, payload);

            if (response.status === 'success') {
                alertPopup('success', isEdit ? 'Unit updated!' : 'Unit created!');
                hideOverlayWithBg(overlayBackground);
                refreshCallback();
            } else {
                alertPopup('error', response.message || 'Failed to save unit.');
            }
        });

        formFooter.append(cancelBtn, saveBtn);
        form.append(formHeader, formFooter);
        overlayBody.append(form);
    };

    renderListView();
    showOverlayWithBg(overlayBackground);
}

async function generateMaterialsContent(role) {
    const materialsBodyContent = document.getElementById('materialsBodyContainer'); // Assuming a div with this ID in the HTML
    materialsBodyContent.innerHTML = ''; // Clear existing content

    // New Header
    const bodyHeader = div('', 'body-header');
    const bodyHeaderContainer = div('', 'body-header-container');
    const title = span('', 'body-header-title');
    title.innerText = 'Materials';
    const subtitle = span('', 'body-header-subtitle');
    subtitle.innerText = 'Manage and track all construction materials.';
    bodyHeaderContainer.append(title, subtitle);
    bodyHeader.append(bodyHeaderContainer);
    
    const user = await fetchData('/profile');
    if (user === 'error') {
        return alertPopup('error', 'Could not fetch user profile. Please reload the page.');
    }
    const currentUserId = user.user_id;

    // Add Material Button (Admin, PM, Engineer, Foreman)
    const allowedRolesForAdd = ['admin', 'engineer', 'project manager', 'foreman'];
    if (allowedRolesForAdd.includes(role)) {
        const addMaterialBtn = createButton('addMaterialBtn', 'solid-buttons', 'Add Material', 'addMaterialBtnText', 'addMaterialBtnIcon');
        addMaterialBtn.addEventListener('click', () => {
            createMaterialOverlay(null, () => renderMaterials(new URLSearchParams(), role, currentUserId));
        });
        bodyHeader.append(addMaterialBtn);
    }

    const materialsContainer = div('materials-main-container');
    const materialsSubHeader = div('materials-sub-header');
    const suppliersButton = div('suppliers-button', 'sub-header-buttons');
    suppliersButton.innerText = 'Suppliers';
    const categoriesButton = div('categories-button', 'sub-header-buttons');
    categoriesButton.innerText = 'Categories';
    const unitsButton = div('units-button', 'sub-header-buttons');
    unitsButton.innerText = 'Units';
    materialsSubHeader.append(suppliersButton, categoriesButton, unitsButton);
    suppliersButton.addEventListener('click', () => {
        createSupplierOverlay(null, () => renderMaterials(new URLSearchParams(), role, currentUserId));
    });
    categoriesButton.addEventListener('click', () => {
        createCategoryOverlay(null, () => renderMaterials(new URLSearchParams(), role, currentUserId));
    });
    unitsButton.addEventListener('click', () => {
        createUnitOverlay(null, () => renderMaterials(new URLSearchParams(), role, currentUserId));
    });
    const filterContainer = div('materials-filter-container');
    const materialsListContainer = div('materials-list-container');
    const paginationContainer = div('materialsPaginationContainer', 'pagination-container');
    
    materialsContainer.append(materialsSubHeader, filterContainer, materialsListContainer, paginationContainer);
    materialsBodyContent.append(bodyHeader, materialsContainer);

    let currentPage = 1;
    let itemsPerPage = 10;
    
    async function renderMaterials(urlParams = new URLSearchParams(), currentRole, currentUserId) {
        materialsListContainer.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);

        const data = await fetchData(`/api/materials?${urlParams.toString()}`);
        materialsListContainer.innerHTML = '';
        
        if (data === 'error' || data.materials.length === 0) {
            showEmptyPlaceholder('/assets/icons/materials.png', materialsListContainer, null, "No materials found.");
            return;
        }

        data.materials.forEach(material => {
            materialsListContainer.append(createMaterialCard(material, currentRole, currentUserId, () => renderMaterials(urlParams, currentRole, currentUserId)));
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: data.total,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderMaterials(urlParams, currentRole, currentUserId);
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1;
                renderMaterials(urlParams, currentRole, currentUserId);
            }
        });
        paginationContainer.append(paginationControls);
    }

    async function applyFilterToMaterials(filteredUrlParams) {
        currentPage = 1;
        await renderMaterials(filteredUrlParams, role, currentUserId);
    }

    const filters = await createFilterContainer(
        applyFilterToMaterials,
        'Search by material name...', 
        { name: true, sort: true, category: true, status: true },
        'itemName',
        'newest'
    );
    
    filterContainer.append(filters);

    await renderMaterials(new URLSearchParams(), role, currentUserId); // Initial render
}



async function generateLogsContent() {
    const logsBodyContent = document.getElementById('logsBodyContent');
    logsBodyContent.innerHTML = ''; // Clear existing content

    const logsContainer = div('logs-main-container');
    const filterContainer = div('logs-filter-container');
    const scrollableLogListWrapper = div('scrollable-log-list-wrapper');
    const logListContainer = div('logs-list-container');
    const paginationContainer = div('paginationContainer', 'pagination-container');
    
    scrollableLogListWrapper.append(logListContainer);
    logsContainer.append(filterContainer, scrollableLogListWrapper, paginationContainer);
    logsBodyContent.append(logsContainer);

    let currentPage = 1;
    let itemsPerPage = 10;
    let allLogs = []; // Cache for all logs

    function createLogCard(logData) {
        const logCard = div('', 'log-cards');
        const logCardHeader = div('', 'log-card-headers');
        const logProjectName = span('', 'log-project-names');
        logProjectName.innerText = logData.project_name;
        const logDate = span('', 'log-dates');
        logDate.innerText = dateFormatting(logData.created_at, 'date');
        
        if (logData.creator_name) {
            const logCreatorName = span('', 'log-creator-names');
            logCreatorName.innerText = `Created by: ${logData.creator_name}`;
            logCardHeader.append(logCreatorName, logDate);
        } else {
            logCardHeader.append(logData.project_id !== 0 ? logProjectName : '', logDate);
        }

        const logCardBody = div('', 'log-card-bodies');
        
        const logCardIcon = span('', 'log-card-icons');
        const action = logData.action;

        const actionStyles = {
            edit: { icon: 'editWhite.png', bgColor: '#1976d2' },
            delete: { icon: 'deleteWhite.png', bgColor: '#d32f2f' },
            create: { icon: 'addWhite.png', bgColor: '#388e3c' },
            approved: { icon: 'checkWhite.png', bgColor: '#689f38' },
            declined: { icon: 'xWhite.png', bgColor: '#f57c00' },
            requests: { icon: 'weightsWhite.png', bgColor: '#7b1fa2' }
        };

        const style = actionStyles[action];
        if (style) {
            logCardIcon.style.backgroundImage = `url('/assets/icons/${style.icon}')`;
            logCardIcon.style.backgroundColor = style.bgColor;
        }

        const logCardName = span('', 'log-card-names');
        if (logData.type === 'item' && (logData.action === 'approved' || logData.action === 'declined')) {
            logCardName.innerText = logData.log_name;
        } else {
            logCardName.innerText = `${logData.full_name} ${logData.log_name}`;
        }

        const logCardFooter = div('', 'log-card-footers');
        const logDetailsBtn = createButton('logDetailsBtn', 'solid-buttons', 'Details', 'logDetailsText', '', () => {});
        const logDetailsIcon  = span('logDetailsIcon', 'btn-icons');
        
        const clickableActions = ['edit']; // Only 'edit' has a details view now
        if (clickableActions.includes(logData.action)) {
            logDetailsBtn.style.cursor = 'pointer';
            logDetailsBtn.addEventListener('click', () => showLogDetailsOverlay(logData.log_id));
        } else {
            logDetailsBtn.style.display = 'none';
        }
    
        logDetailsBtn.append(logDetailsIcon);
        logCardFooter.append(logDetailsBtn);
        logCardBody.append(logCardIcon, logCardName);
        logCard.append(logCardHeader,logCardBody, logCardFooter);
        return logCard;
    }

    function renderPage() {
        logListContainer.innerHTML = '';
        paginationContainer.innerHTML = '';

        if (allLogs.length === 0) {
            showEmptyPlaceholder('/assets/icons/emptyLogs.png', logListContainer, null, "No logs found for the selected filters.");
            return;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageLogs = allLogs.slice(start, end);

        pageLogs.forEach(log => {
            logListContainer.append(createLogCard(log));
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: allLogs.length,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderPage();
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1;
                renderPage();
            }
        });
        paginationContainer.append(paginationControls);
    }

    async function fetchAndRender(urlParams = new URLSearchParams()) {
        logListContainer.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        const logs = await fetchData(`/api/logs?${urlParams.toString()}`);
        
        if (logs === 'error') {
            logListContainer.innerHTML = '';
            showEmptyPlaceholder('/assets/icons/emptyLogs.png', logListContainer, null, "An error occurred while fetching logs.");
            allLogs = [];
        } else {
            allLogs = logs;
        }
        
        currentPage = 1;
        renderPage();
    }

    const filters = await createFilterContainer(
        fetchAndRender,
        'Search by user...', 
        { name: true, project: true, dateFrom: true, dateTo: true, sort: true },
        'username',
        'newest'
    );
    
    filterContainer.append(filters);

    await fetchAndRender(new URLSearchParams());
}

function createProjectCard(projects, num) {
    const progressCardContainer = div(`projectProgressCards`, 'project-progress-cards');
    const progressCardHeader = div(`progressCardHeader`, 'progress-card-header');
    const progressCardName = div(`progressCardName`, 'progress-card-name');
    progressCardName.innerText = projects.project_name;
    const progressCardStatus = div(`progressCardStatus`, 'progress-card-status');
    if(projects.project_status === "planning") warnType(progressCardStatus, "glass", '', '', '');
    if(projects.project_status === "in progress") warnType(progressCardStatus, "glass", 'yellow', '', '');
    if(projects.project_status === "completed") warnType(progressCardStatus, "glass", 'green', '', '');
    progressCardStatus.innerText = projects.project_status;
    const progressCardBody = div(`progressCardBody`, 'progress-card-body');
    const progressCardLocation = div(`progressCardLocation`, 'progress-card-location');
    const locationCardIcon = div(`locationCardIcon`, 'light-icons');
    const locationCardName = div(`locationCardName`, 'location-card-name');
    locationCardName.innerText = projects.project_location;
    const progressCardPersonnel = div(`progressCardPersonnel`, 'progress-card-personnel');
    const personnelCardIcon = div(`personnelCardIcon`, 'light-icons');
    const personnelCardCount = div(`personnelCardCount`, 'personnel-card-count');
    personnelCardCount.innerText =  `${projects.total_personnel} personnel`;
    const progressCardDue = div(`progressCardDue`, 'progress-card-due');
    const dueCardIcon = div(`dueCardIcon`, 'light-icons');
    const dueCardDate = div(`dueCardDate`, 'due-card-date');
    dueCardDate.innerText = `Due ${dateFormatting(projects.duedate, 'date')}`

    const progressCardFooter = div(`progressCardFooter`, 'progress-card-footer');
    const progressUpperSection = div(`progressUpperSection`, 'progress-upper-section');
    const progressText = div(`progressText`,'progress-text');
    progressText.innerText = 'Progress';
    const progressPercent = div(`progressPercent`, 'progress-percent');
    const pctString = projects.total_milestone > 0 ? `${Math.floor(projects.completed_milestone / projects.total_milestone * 100)}%` : '0%';
    progressPercent.innerText = pctString;
    const progressLowerSection = div(`progressLowerSection`, 'progress-lower-section');
    const style = document.createElement('style');
    style.innerHTML = `
    @keyframes progressBarAnim${num} {
        0% { width: 0%; }
        100% { width: ${pctString}; }
    }`;
    document.head.appendChild(style);
    const progressBar = div(`progressBar`, 'progress-bar');
    progressBar.style.width = pctString;
    progressBar.style.animation = `progressBarAnim${num} 1s ease`;
    progressBar.addEventListener("animationend", () => {
        style.remove();
    }, {once: true})
    num ++;
    progressLowerSection.append(progressBar);
    progressUpperSection.append(progressText, progressPercent);
    progressCardFooter.append(progressUpperSection, progressLowerSection);
    progressCardDue.append(dueCardIcon, dueCardDate);
    progressCardPersonnel.append(personnelCardIcon, personnelCardCount);
    progressCardLocation.append(locationCardIcon, locationCardName);
    progressCardBody.append(progressCardLocation, progressCardPersonnel, progressCardDue);
    progressCardHeader.append(progressCardName, progressCardStatus);
    progressCardContainer.append(progressCardHeader, progressCardBody, progressCardFooter);
    return progressCardContainer;
}

const tabContents = {
    analytics: {
        generateContent: async() => await generateAnalyticsContent(),
        generateGraphs: async() => ''
    },
    assets: {
        generateContent: async() => await generateAssetsContent(),
        generateGraphs: async() => ''
    },
    dashboard: {
        generateContent: async() => await generateDashboardContent(),
        generateGraphs: async() => await initDashboardGraphs()
    },
    inventory: {
        generateContent: async function renderInventory(projectId, role, refreshActiveTabContentFn) {
            const inventorySectionContainer = div('inventorySectionContainer');
            inventorySectionContainer.innerText = 'Inventory Content for Project: ' + projectId + ' (Role: ' + role + ')'; // Example with parameters
            return inventorySectionContainer;
        },
        generateGraphs: async() => ''
    },
    logs: {
        generateContent: async() => await generateLogsContent(),
        generateGraphs: async() => ''
    },
    materials: {
        generateContent: async(role) => await generateMaterialsContent(role),
        generateGraphs: async() => '' 
    },
    personnel: {
        generateContent: async() => await generatePersonnelContent(),
        generateGraphs: async() => ''
    },
    projects: {
        generateContent: async() => await generateProjectsContent(),
        generateGraphs: async() => ''
    },
    reports: {
        generateContent: async() => await generateReportsContent(),
        generateGraphs: async() => ''
    },
    settings: {
        generateContent: async() => '',
        generateGraphs: async() => ''
    }
}

export async function displayContents(tabName, tabType, role) {
    if(role !== 'admin') return alertPopup('error', 'Unauthorized Role');
    const pageName = document.getElementById('pageName');
    if(tabType === 'upperTabs'){
        pageName.innerText = formatString(tabName);
        await generateContent(tabName, role);
    } else {
        await generateProjectContent(tabName, role);
    }
}

async function generateContent(tabName, role) {
    const bodyContainer = document.getElementById(`${tabName}BodyContainer`);
    const pageData = tabContents[tabName];
    await pageData.generateContent(role);
    bodyContainer.style.display = 'flex';
    bodyContainer.style.opacity = 1;
    pageData.generateGraphs();
}

async function generatePersonnelContent() {
    const personnelBodyContent = document.getElementById('personnelBodyContent');
    personnelBodyContent.innerHTML = '';
    showEmptyPlaceholder('/assets/icons/personnel.png', personnelBodyContent, null, "Personnel Content Coming Soon");
}

async function generateAssetsContent() {
    const assetsBodyContent = document.getElementById('assetsBodyContent');
    assetsBodyContent.innerHTML = '';
    showEmptyPlaceholder('/assets/icons/inventory.png', assetsBodyContent, null, "Assets Content Coming Soon");
}

async function generateReportsContent() {
    const reportsBodyContent = document.getElementById('reportsBodyContent');
    reportsBodyContent.innerHTML = '';
    showEmptyPlaceholder('/assets/icons/logs.png', reportsBodyContent, null, "Reports Content Coming Soon");
}

async function generateAnalyticsContent() {
    const analyticsBodyContent = document.getElementById('analyticsBodyContent');
    analyticsBodyContent.innerHTML = '';

    // Filter Section
    const filterSection = div('', 'analytics-filter-section');
    
    // Date Range Filter
    const dateRangeControl = div('', 'analytics-filter-control');
    const dateRangeLabel = span('', 'analytics-filter-label');
    dateRangeLabel.innerText = 'Date Range';
    const dateRangeSelect = document.createElement('select');
    dateRangeSelect.className = 'analytics-filter-select';
    dateRangeSelect.id = 'analyticsDateRange';
    dateRangeSelect.innerHTML = `
        <option value="today">Today</option>
        <option value="this-week">This Week</option>
        <option value="this-month" selected>This Month</option>
        <option value="last-month">Last Month</option>
        <option value="this-year">This Year</option>
        <option value="custom">Custom Range</option>
    `;
    dateRangeControl.append(dateRangeLabel, dateRangeSelect);

    filterSection.append(dateRangeControl);

    // Event listeners for filters
    dateRangeSelect.addEventListener('change', (e) => {
        console.log('Date range changed to:', e.target.value);
    });

    // Inventory Overview Section Title
    const inventoryTitle = span('', 'analytics-section-title');
    inventoryTitle.innerText = 'Inventory Overview';

    // Metric Cards Grid
    const metricsGrid = div('', 'analytics-metrics-grid');
    
    const metrics = [
        {
            label: 'TOTAL ITEMS',
            value: '2,847',
            subtext: 'Across all categories',
            status: 'success',
            statusText: '↑ 12% from last month'
        },
        {
            label: 'INVENTORY VALUE',
            value: '₱485,320',
            subtext: 'Total current value',
            status: 'success',
            statusText: '↑ 8.5% growth'
        },
        {
            label: 'LOW STOCK ITEMS',
            value: '24',
            subtext: 'Require attention',
            status: 'warning',
            statusText: 'Reorder soon'
        },
        {
            label: 'OUT OF STOCK',
            value: '5',
            subtext: 'Unavailable items',
            status: 'error',
            statusText: 'Urgent action needed'
        },
        {
            label: 'OVERSTOCKED ITEMS',
            value: '12',
            subtext: 'Excess inventory',
            status: 'info',
            statusText: 'Review allocation'
        },
        {
            label: 'STOCK TURNOVER RATE',
            value: '4.2x',
            subtext: 'Per year average',
            status: 'success',
            statusText: 'Healthy rate'
        }
    ];

    metrics.forEach(metric => {
        const card = createAnalyticsMetricCard(metric);
        metricsGrid.append(card);
    });

    analyticsBodyContent.append(filterSection, inventoryTitle, metricsGrid);

    // Material Usage Per Project Section
    const materialUsageTitle = span('', 'analytics-section-title');
    materialUsageTitle.innerText = 'Material Usage Per Project';
    
    const materialUsageTable = createMaterialUsageTable();
    
    // Create header with title and search
    const materialUsageHeader = div('', 'analytics-section-header');
    materialUsageHeader.append(materialUsageTitle, materialUsageTable.searchSection);
    
    analyticsBodyContent.append(materialUsageHeader, materialUsageTable.container);

    // Waste and Damage Cost Section
    const wasteDamageTitle = span('', 'analytics-section-title');
    wasteDamageTitle.innerText = 'Waste and Damage Cost Per Project';
    
    const wasteDamageTable = createWasteDamageTable();
    
    // Create header with title and search
    const wasteDamageHeader = div('', 'analytics-section-header');
    wasteDamageHeader.append(wasteDamageTitle, wasteDamageTable.searchSection);
    
    analyticsBodyContent.append(wasteDamageHeader, wasteDamageTable.container);

    // Milestones, Tasks, and Project Progress Section
    const projectProgressSection = await createProjectProgressSection();
    analyticsBodyContent.append(projectProgressSection);
}

function createWasteDamageTable() {
    const container = div('', 'waste-damage-container');
    
    // Search bar section
    const searchSection = div('', 'waste-damage-search-section');
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'waste-damage-search-input';
    searchInput.placeholder = 'Search project';
    searchSection.append(searchInput);
    
    // Table wrapper
    const tableWrapper = div('', 'waste-damage-table-wrapper');
    const table = document.createElement('table');
    table.className = 'waste-damage-table';
    
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Project Name', 'Total Items Lost', 'Total Waste Value', 'Action'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.innerText = headerText;
        headerRow.append(th);
    });
    thead.append(headerRow);
    table.append(thead);
    
    // Table body with sample data
    const tbody = document.createElement('tbody');
    const projectData = [
        { name: 'Downtown Plaza Renovation', itemsLost: 8, wasteValue: '₱42,300', id: 1 },
        { name: 'Highway Bridge Construction', itemsLost: 12, wasteValue: '₱67,800', id: 2 },
        { name: 'Commercial Complex', itemsLost: 5, wasteValue: '₱28,500', id: 3 },
        { name: 'Park Development Project', itemsLost: 9, wasteValue: '₱51,200', id: 4 },
        { name: 'Residential Complex Phase 1', itemsLost: 7, wasteValue: '₱38,900', id: 5 }
    ];
    
    projectData.forEach(project => {
        const row = document.createElement('tr');
        row.dataset.projectName = project.name.toLowerCase();
        const nameCell = document.createElement('td');
        nameCell.innerText = project.name;
        const itemsCell = document.createElement('td');
        itemsCell.innerText = project.itemsLost;
        itemsCell.style.textAlign = 'center';
        const valueCell = document.createElement('td');
        valueCell.innerText = project.wasteValue;
        valueCell.style.textAlign = 'center';
        valueCell.style.fontWeight = '600';
        valueCell.style.color = 'var(--red-text)';
        
        const actionCell = document.createElement('td');
        actionCell.style.textAlign = 'center';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'waste-damage-view-btn';
        viewBtn.innerText = 'View';
        viewBtn.addEventListener('click', () => {
            showWasteDamageModal(project);
        });
        actionCell.append(viewBtn);
        
        row.append(nameCell, itemsCell, valueCell, actionCell);
        tbody.append(row);
    });
    table.append(tbody);
    tableWrapper.append(table);
    container.append(tableWrapper);
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const projectName = row.dataset.projectName;
            if (projectName.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
    
    return { container, table, searchSection };
}

function showWasteDamageModal(project) {
    // Modal background
    const modalBg = div('', 'waste-damage-modal-bg');
    
    // Modal content
    const modal = div('', 'waste-damage-modal');
    
    // Modal header
    const header = div('', 'waste-damage-modal-header');
    const title = span('', 'waste-damage-modal-title');
    title.innerText = `Waste & Damage - ${project.name}`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'waste-damage-modal-close';
    closeBtn.innerHTML = '✕';
    header.append(title, closeBtn);
    
    // Modal body with waste/damage list
    const body = div('', 'waste-damage-modal-body');
    
    // Sample waste/damage data for the project
    const wasteItems = [
        { name: 'Concrete Mix 1:2:4', category: 'Concrete', reason: 'Spillage during transport', quantity: 12, unit: 'bags', value: 5400 },
        { name: 'Steel Reinforcement', category: 'Steel', reason: 'Rust and corrosion', quantity: 8, unit: 'kg', value: 960 },
        { name: 'Wooden Formwork', category: 'Wood', reason: 'Water damage', quantity: 5, unit: 'pcs', value: 4000 },
        { name: 'Cement', category: 'Concrete', reason: 'Moisture damage', quantity: 10, unit: 'bags', value: 3800 },
        { name: 'Sand (Grade A)', category: 'Aggregates', reason: 'Contamination', quantity: 45, unit: 'cubic meter', value: 36000 },
        { name: 'Paint (Indoor)', category: 'Finishing', reason: 'Expired/Unusable', quantity: 8, unit: 'liters', value: 5200 },
        { name: 'Electrical Wire', category: 'Electrical', reason: 'Accidental damage', quantity: 120, unit: 'meters', value: 3000 },
        { name: 'Door Frames', category: 'Hardware', reason: 'Scratched/Dented', quantity: 2, unit: 'pcs', value: 5000 }
    ];
    
    // Waste/Damage table
    const wasteTable = document.createElement('table');
    wasteTable.className = 'waste-detail-table';
    
    const wasteThead = document.createElement('thead');
    const wasteHeaderRow = document.createElement('tr');
    const wasteHeaders = ['Material Name', 'Category', 'Reason', 'Quantity', 'Unit', 'Estimated Value'];
    wasteHeaders.forEach(headerText => {
        const th = document.createElement('th');
        th.innerText = headerText;
        wasteHeaderRow.append(th);
    });
    wasteThead.append(wasteHeaderRow);
    wasteTable.append(wasteThead);
    
    const wasteTbody = document.createElement('tbody');
    let totalWasteValue = 0;
    wasteItems.forEach(item => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.innerText = item.name;
        
        const categoryCell = document.createElement('td');
        categoryCell.innerText = item.category;
        categoryCell.style.textAlign = 'center';
        
        const reasonCell = document.createElement('td');
        reasonCell.innerText = item.reason;
        
        const quantityCell = document.createElement('td');
        quantityCell.innerText = item.quantity;
        quantityCell.style.textAlign = 'center';
        
        const unitCell = document.createElement('td');
        unitCell.innerText = item.unit;
        unitCell.style.textAlign = 'center';
        
        const valueCell = document.createElement('td');
        valueCell.innerText = `₱${item.value.toLocaleString()}`;
        valueCell.style.textAlign = 'center';
        valueCell.style.fontWeight = '600';
        valueCell.style.color = 'var(--red-text)';
        
        totalWasteValue += item.value;
        row.append(nameCell, categoryCell, reasonCell, quantityCell, unitCell, valueCell);
        wasteTbody.append(row);
    });
    wasteTable.append(wasteTbody);
    body.append(wasteTable);
    
    // Summary section
    const summary = div('', 'waste-damage-summary');
    const summaryTitle = span('', 'waste-damage-summary-title');
    summaryTitle.innerText = 'Damage Summary';
    const summaryContent = div('', 'waste-damage-summary-content');
    
    const totalItems = span('', 'summary-item');
    totalItems.innerHTML = `<strong>Total Items Damaged:</strong> ${wasteItems.length}`;
    
    const totalValue = span('', 'summary-item');
    totalValue.innerHTML = `<strong>Total Waste Value:</strong> ₱${totalWasteValue.toLocaleString()}`;
    totalValue.style.color = 'var(--red-text)';
    totalValue.style.fontWeight = '700';
    
    summaryContent.append(totalItems, totalValue);
    summary.append(summaryTitle, summaryContent);
    body.append(summary);
    
    modal.append(header, body);
    modalBg.append(modal);
    document.body.append(modalBg);
    
    // Close button events
    closeBtn.addEventListener('click', () => {
        modalBg.remove();
    });
    
    modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) {
            modalBg.remove();
        }
    });
}

function createMaterialUsageTable() {
    const container = div('', 'material-usage-container');
    
    // Search bar section
    const searchSection = div('', 'material-usage-search-section');
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'material-usage-search-input';
    searchInput.placeholder = 'Search project';
    searchSection.append(searchInput);
    
    // Table wrapper
    const tableWrapper = div('', 'material-usage-table-wrapper');
    const table = document.createElement('table');
    table.className = 'material-usage-table';
    
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Project Name', 'Total Materials', 'Total Quantity', 'Total Cost', 'Action'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.innerText = headerText;
        headerRow.append(th);
    });
    thead.append(headerRow);
    table.append(thead);
    
    // Table body with sample data
    const tbody = document.createElement('tbody');
    const projectData = [
        { name: 'Downtown Plaza Renovation', materials: 12, quantity: 487, cost: '₱145,600', id: 1 },
        { name: 'Highway Bridge Construction', materials: 18, quantity: 892, cost: '₱234,500', id: 2 },
        { name: 'Commercial Complex', materials: 9, quantity: 356, cost: '₱98,750', id: 3 },
        { name: 'Park Development Project', materials: 15, quantity: 623, cost: '₱187,300', id: 4 },
        { name: 'Residential Complex Phase 1', materials: 11, quantity: 489, cost: '₱167,450', id: 5 }
    ];
    
    projectData.forEach(project => {
        const row = document.createElement('tr');
        row.dataset.projectName = project.name.toLowerCase();
        const nameCell = document.createElement('td');
        nameCell.innerText = project.name;
        const materialsCell = document.createElement('td');
        materialsCell.innerText = project.materials;
        materialsCell.style.textAlign = 'center';
        const quantityCell = document.createElement('td');
        quantityCell.innerText = project.quantity;
        quantityCell.style.textAlign = 'center';
        const costCell = document.createElement('td');
        costCell.innerText = project.cost;
        costCell.style.textAlign = 'right';
        costCell.style.fontWeight = '600';
        
        const actionCell = document.createElement('td');
        actionCell.style.textAlign = 'center';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'material-usage-view-btn';
        viewBtn.innerText = 'View';
        viewBtn.addEventListener('click', () => {
            showMaterialUsageModal(project);
        });
        actionCell.append(viewBtn);
        
        row.append(nameCell, materialsCell, quantityCell, costCell, actionCell);
        tbody.append(row);
    });
    table.append(tbody);
    tableWrapper.append(table);
    container.append(tableWrapper);
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const projectName = row.dataset.projectName;
            if (projectName.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
    
    return { container, table, searchSection };
}

function showMaterialUsageModal(project) {
    // Modal background
    const modalBg = div('', 'material-usage-modal-bg');
    
    // Modal content
    const modal = div('', 'material-usage-modal');
    
    // Modal header
    const header = div('', 'material-usage-modal-header');
    const title = span('', 'material-usage-modal-title');
    title.innerText = `Materials Used - ${project.name}`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'material-usage-modal-close';
    closeBtn.innerHTML = '✕';
    header.append(title, closeBtn);
    
    // Modal body with materials list
    const body = div('', 'material-usage-modal-body');
    
    // Sample materials data for the project
    const materials = [
        { name: 'Concrete Mix 1:2:4', plannedQty: 125, actualQty: 120, unit: 'bags', price: 450, total: 54000 },
        { name: 'Steel Reinforcement', plannedQty: 90, actualQty: 85, unit: 'kg', price: 120, total: 10200 },
        { name: 'Wooden Formwork', plannedQty: 50, actualQty: 45, unit: 'pcs', price: 800, total: 36000 },
        { name: 'Cement', plannedQty: 100, actualQty: 95, unit: 'bags', price: 380, total: 36100 },
        { name: 'Sand (Grade A)', plannedQty: 220, actualQty: 200, unit: 'cubic meter', price: 800, total: 160000 },
        { name: 'Gravel', plannedQty: 160, actualQty: 150, unit: 'cubic meter', price: 600, total: 90000 },
        { name: 'Paint (Indoor)', plannedQty: 55, actualQty: 50, unit: 'liters', price: 650, total: 32500 },
        { name: 'Electrical Wire', plannedQty: 850, actualQty: 800, unit: 'meters', price: 25, total: 20000 },
        { name: 'Plumbing Pipes', plannedQty: 130, actualQty: 120, unit: 'meters', price: 450, total: 54000 },
        { name: 'Door Frames', plannedQty: 26, actualQty: 24, unit: 'pcs', price: 2500, total: 60000 }
    ];
    
    // Materials table
    const materialsTable = document.createElement('table');
    materialsTable.className = 'materials-detail-table';
    
    const matThead = document.createElement('thead');
    const matHeaderRow = document.createElement('tr');
    const matHeaders = ['Material Name', 'Planned Qty', 'Actual Qty', 'Unit', 'Unit Price', 'Total'];
    matHeaders.forEach(headerText => {
        const th = document.createElement('th');
        th.innerText = headerText;
        matHeaderRow.append(th);
    });
    matThead.append(matHeaderRow);
    materialsTable.append(matThead);
    
    const matTbody = document.createElement('tbody');
    let totalCost = 0;
    materials.forEach(material => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.innerText = material.name;
        
        const plannedQtyCell = document.createElement('td');
        plannedQtyCell.innerText = material.plannedQty;
        plannedQtyCell.style.textAlign = 'center';
        
        const actualQtyCell = document.createElement('td');
        actualQtyCell.innerText = material.actualQty;
        actualQtyCell.style.textAlign = 'center';
        
        const unitCell = document.createElement('td');
        unitCell.innerText = material.unit;
        unitCell.style.textAlign = 'center';
        
        const priceCell = document.createElement('td');
        priceCell.innerText = `₱${material.price.toLocaleString()}`;
        priceCell.style.textAlign = 'center';
        
        const totalCell = document.createElement('td');
        totalCell.innerText = `₱${material.total.toLocaleString()}`;
        totalCell.style.textAlign = 'center';
        totalCell.style.fontWeight = '600';
        
        totalCost += material.total;
        row.append(nameCell, plannedQtyCell, actualQtyCell, unitCell, priceCell, totalCell);
        matTbody.append(row);
    });
    materialsTable.append(matTbody);
    body.append(materialsTable);
    
    // Summary section
    const summary = div('', 'material-usage-summary');
    const summaryTitle = span('', 'material-usage-summary-title');
    summaryTitle.innerText = 'Project Summary';
    const summaryContent = div('', 'material-usage-summary-content');
    
    const totalMaterials = span('', 'summary-item');
    totalMaterials.innerHTML = `<strong>Total Materials:</strong> ${materials.length}`;
    
    const totalAmount = span('', 'summary-item');
    totalAmount.innerHTML = `<strong>Total Cost:</strong> ₱${totalCost.toLocaleString()}`;
    totalAmount.style.color = 'var(--green-text)';
    totalAmount.style.fontWeight = '700';
    
    summaryContent.append(totalMaterials, totalAmount);
    summary.append(summaryTitle, summaryContent);
    body.append(summary);
    
    modal.append(header, body);
    modalBg.append(modal);
    document.body.append(modalBg);
    
    // Close button events
    closeBtn.addEventListener('click', () => {
        modalBg.remove();
    });
    
    modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) {
            modalBg.remove();
        }
    });
}

function createAnalyticsMetricCard(metric) {
    const card = div('', 'analytics-metric-card');
    
    const label = span('', 'metric-card-label');
    label.innerText = metric.label;
    
    const value = span('', 'metric-card-value');
    value.innerText = metric.value;
    
    const subtext = span('', 'metric-card-subtext');
    subtext.innerText = metric.subtext;
    
    const statusBadge = span('', `metric-card-badge metric-badge-${metric.status}`);
    statusBadge.innerText = metric.statusText;
    
    card.append(label, value, subtext, statusBadge);
    return card;
}

async function generateDashboardContent() {
    const dashboardBodyContent = document.getElementById(`dashboardBodyContent`);
    dashboardBodyContent.append(
        await dashboardSummaryCards(),
        await dashboardActiveProjects('inprogress'), 
        dashboardGraphContainer(), 
        await recentMaterialsRequest()
    );
}

async function createProjectOverlay(refreshCallback) {
    const isEditMode = false; // For now, only create mode
    const overlayTitle = 'Add New Project';

    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = overlayTitle;
    overlayHeader.append(overlayHeaderContainer);

    const form = document.createElement('form');
    form.id = 'projectForm';
    form.classList.add('form-edit-forms');
    form.enctype = 'multipart/form-data';

    const createProjectFormHeader = div('createProjectFormHeader', 'create-form-headers');
    const createProjectFormFooter = div('createProjectFormFooter', 'create-form-footers');

    const projectNameInput = createInput('text', 'edit', 'Project Name', 'projectName', 'project_name', '', 'Enter project name', null, 150);
    const projectLocationInput = createInput('text', 'edit', 'Location', 'projectLocation', 'project_location', '', 'Enter project location', null, 150);
    const projectBudgetInput = createInput('text', 'edit', 'Budget (₱)', 'projectBudget', 'project_budget', '', '0.00', 0.01, 999999999999.99, 'decimal', 'Minimum 0.01');
    const projectDueDateInput = createInput('date', 'edit', 'Due Date', 'projectDueDate', 'duedate', '', '');
    
    const imageDropAreaContainer = div('imageDropAreaContainer', 'input-box-containers');
    const imageLabelContainer = div('imageLabelContainer', 'label-container');
    const imageLabel = document.createElement('label');
    imageLabel.className = 'input-labels';
    imageLabel.innerText = 'Project Image';
    const imageSubLabel = span('imageSubLabel', 'input-sub-labels');
    imageSubLabel.innerText = 'Optional, but recommended';
    imageLabelContainer.append(imageLabel);

    const imageDropArea = div('imageDropArea', 'image-drop-area');
    const imageDropAreaText = span('', 'image-drop-text');
    imageDropAreaText.innerText = 'Drag & drop an image or click to select';
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.name = 'image';
    imageInput.accept = 'image/*';
    imageInput.style.display = 'none';

    const imagePreview = div('imagePreview', 'image-preview');
    imagePreview.style.display = 'none';

    imageDropArea.append(imageDropAreaText, imageInput, imagePreview);
    imageDropAreaContainer.append(imageLabelContainer, imageDropArea, imageSubLabel);


    imageDropArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) {
            imageDropAreaText.innerText = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.style.backgroundImage = `url(${e.target.result})`;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imageDropAreaText.innerText = 'Drag & drop an image or click to select';
            imagePreview.style.backgroundImage = 'none';
            imagePreview.style.display = 'none';
        }
    });
    // Drag and Drop listeners
    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageDropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'dragover') imageDropArea.classList.add('drag-over');
            if (eventName === 'dragleave' || eventName === 'drop') imageDropArea.classList.remove('drag-over');
            if (eventName === 'drop') {
                const file = e.dataTransfer.files[0];
                 if (file) {
                    imageInput.files = e.dataTransfer.files;
                    imageDropAreaText.innerText = file.name;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        imagePreview.style.backgroundImage = `url(${e.target.result})`;
                        imagePreview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    });

    createProjectFormHeader.append(
        projectNameInput,
        projectLocationInput,
        projectBudgetInput,
        projectDueDateInput,
        imageDropAreaContainer
    );

    const cancelBtn = createButton('cancelCreateBtn', 'wide-buttons', 'Cancel', 'cancelCreateText');
    cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    const saveProjectData = async () => {
        const projectNameEl = projectNameInput.querySelector('input');
        const projectLocationEl = projectLocationInput.querySelector('input');
        const projectBudgetEl = projectBudgetInput.querySelector('input');
        const projectDueDateEl = projectDueDateInput.querySelector('input');

        const isNameValid = validateInput(projectNameEl);
        const isLocationValid = validateInput(projectLocationEl);
        const isBudgetValid = validateInput(projectBudgetEl);
        const isDueDateValid = validateInput(projectDueDateEl);

        if (!isNameValid || !isLocationValid || !isBudgetValid || !isDueDateValid) {
            alertPopup('error', 'Please fill in all required fields correctly.');
            return false;
        }

        const payload = {
            project_name: projectNameEl.value,
            project_location: projectLocationEl.value,
            project_budget: parseFloat(projectBudgetEl.value),
            duedate: projectDueDateEl.value
        };

        if (isNaN(payload.project_budget) || payload.project_budget <= 0) {
            alertPopup('error', 'Please enter a valid positive number for the budget.');
            return false;
        }
        
        if (!payload.project_name || !payload.project_location || isNaN(payload.project_budget) || !payload.duedate) {
            alertPopup('error', 'Please fill in all required fields correctly.');
            return false;
        }

        const formData = new FormData();
        for (const key in payload) {
            if (payload[key]) formData.append(key, payload[key]);
        }

        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        const url = '/api/projects';
        const method = 'POST';

        const response = await fetch(url, { method, body: formData });

        if (response.ok) {
            const responseData = await response.json();
            alertPopup('success', responseData.message);
            hideOverlayWithBg(overlayBackground);
            refreshCallback();
            return true;
        } else {
            const errorData = await response.json();
            alertPopup('error', errorData.message || 'Failed to create project.');
            return false;
        }
    };

    const actionButton = createButton('createBtn', 'wide-buttons', 'Create Project', 'createBtnText');
    createProjectFormFooter.append(cancelBtn, actionButton);

    actionButton.addEventListener('click', async () => {
        await saveProjectData();
    });

    form.append(createProjectFormHeader, createProjectFormFooter);
    overlayBody.append(form);

    showOverlayWithBg(overlayBackground);
}

async function generateProjectsContent(role) {
    const adminProjectsBodyHeader = document.getElementById('adminProjectsBodyHeader');
    adminProjectsBodyHeader.innerHTML = ''; // Clear existing detail view header
    adminProjectsBodyHeader.style.backgroundImage = ''; // Clear any background image set by detail view

    const projectsHeaderContainer = div('projectsHeaderContainer', 'body-header-container');
    const projectsHeaderTitle = div('projectsHeaderTitle', 'body-header-title');
    projectsHeaderTitle.innerText = 'Project Management';
    const projectsHeaderSubtitle = div('projectsHeaderSubtitle', 'body-header-subtitle');
    projectsHeaderSubtitle.innerText = 'Create and manage construction projects and milestones';
    
    projectsHeaderContainer.append(projectsHeaderTitle, projectsHeaderSubtitle);
    adminProjectsBodyHeader.append(projectsHeaderContainer);
    const createProjectBtn = createButton('createProjectBtn', 'solid-buttons', 'Create Project', 'createProjectBtnText', 'createProjectBtnIcon');
    createProjectBtn.addEventListener('click', () => {
        createProjectOverlay(() => generateProjectsContent(role));
    });
    adminProjectsBodyHeader.append(createProjectBtn);
    const projectsBodyContent = document.getElementById('projectsBodyContent');
    projectsBodyContent.innerHTML = ''; // Clear existing content
    adminProjectsBodyHeader.style.padding = '1.5rem';

    const filterContainer = div('materials-filter-container');
    const projectsContainer = div('projects-main-container');
    const paginationContainer = div('materialsPaginationContainer', 'pagination-container');
    
    projectsBodyContent.append(filterContainer, projectsContainer, paginationContainer);

    let currentPage = 1;
    let itemsPerPage = 10;

    async function renderProjects(urlParams = new URLSearchParams()) {
        projectsContainer.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);

        const data = await fetchData(`/api/allProjects?${urlParams.toString()}`);
        projectsContainer.innerHTML = '';
        
        if (data === 'error' || data.projects.length === 0) {
            showEmptyPlaceholder('/assets/icons/projects.png', projectsContainer, null, "No projects found.");
            return;
        }

        let num = 1;
        data.projects.forEach(project => {
            const projectCard = createProjectCard(project, num);
            projectCard.addEventListener('click', () => generateProjectContent(`project${project.project_id}`, role));
            projectCard.classList.add('hoverable');
            projectsContainer.append(projectCard);
            num++;
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: data.total,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderProjects(urlParams);
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1;
                renderProjects(urlParams);
            }
        });
        paginationContainer.append(paginationControls);
    }

    async function applyFilterToProjects(filteredUrlParams) {
        currentPage = 1;
        await renderProjects(filteredUrlParams);
    }

    const filters = await createFilterContainer(
        applyFilterToProjects,
        'Search by project name...', 
        { name: true, dateFrom: true, dateTo: true, sort: true },
        'name',
        'newest'
    );
    
    filterContainer.append(filters);

    await renderProjects(new URLSearchParams());
}



async function dashboardSummaryCards() {
    const dashboardSummaryCards = div('dashboardSummaryCards', 'summary-cards');
    const dashboardCardData = {
        activeProjects: {
            title: "activeProjects",
            data: "-",
            info: "No projects so far",
            color: "darkblue"
        },
        activePersonnel: {
            title: "activePersonnel",
            data: "-",
            info: "No personnel exists",
            color: "green"
        }, 
        pendingRequest:  {
            title: "pendingRequest",
            data: "-",
            info: "No pending requests so far",
            color: "darkorange"
        },
        budgetUtilization: {
            title: "budgetUtilization",
            data: "36.7%",
            info: "₱34.3M of ₱93.5M",
            color: "red"
        }
    };

    function modifyCardData(objectCardData, data, info) {
        objectCardData.data = data;
        objectCardData.info = info;
    }
    const data = await fetchData('/api/adminSummaryCards/dashboard');
    if(data === 'error') return;
    const cardData = data[0];
    if(cardData){
        if(cardData.total_projects !== 0) modifyCardData(dashboardCardData['activeProjects'], cardData.active_projects, `${cardData.total_projects} total projects`);
        if(cardData.total_personnel !== 0) modifyCardData(dashboardCardData['activePersonnel'], cardData.active_personnel, `${cardData.total_personnel} total personnel`);
        if(cardData.pending_requests !== 0) modifyCardData(dashboardCardData['pendingRequest'], cardData.pending_requests, `Material request awaiting for approval`); 
    }
    const activeProjectsData = dashboardCardData['activeProjects'];
    const activePersonnelData = dashboardCardData['activePersonnel'];
    const pendingRequestData = dashboardCardData['pendingRequest'];
    const budgetUtilizationData = dashboardCardData['budgetUtilization'];

    dashboardSummaryCards.append(
        createSummaryCards(activeProjectsData), 
        createSummaryCards(activePersonnelData),
        createSummaryCards(pendingRequestData),
        createSummaryCards(budgetUtilizationData)
    );
    return dashboardSummaryCards;
}

function createSummaryCards(cardData) {
    const cardContainer = div(`${cardData.title}Card`, 'cards');
    const cardHeaders = div(`${cardData.title}Header`, 'card-headers');
    const cardTint = div(`${cardData.title}Tint`, `card-tints`)
    cardTint.style.backgroundColor = cardData.color;
    const cardNames = div(`${cardData.title}Title`, 'card-names');
    cardNames.innerText = formatString(cardData.title);
    const cardIcon = div(`${cardData.title}Icon`, 'card-icons');
    const cardContent = div(`${cardData.title}Content`, 'card-content');
    const cardValue = div(`${cardData.title}Value`, 'card-value');
    cardValue.innerText = cardData.data;
    const cardInfo = div(`${cardData.title}Info`, 'card-info');
    cardInfo.innerText = cardData.info;

    cardContainer.append(cardHeaders, cardContent);
    cardHeaders.append(cardTint, cardNames, cardIcon);
    cardContent.append(cardValue, cardInfo);
    return cardContainer;
}

function dashboardGraphContainer() {
    const projectOverviewContainer = div('projectOverviewContainer');

    const projectStatus = div('projectStatus', 'graph-containers');
    const projectStatusHeader = div('projectStatusHeader', 'graph-headers');
    const projectStatusTitle = div('projectStatusTitle', 'graph-titles');
    const projectStatusSubtitle = div('projectStatusSubtitle', 'graph-subtitles');
    projectStatusTitle.innerText = 'Project Status';
    projectStatusSubtitle.innerText = 'Distribution of project statuses';
    projectStatusHeader.append(projectStatusTitle, projectStatusSubtitle);

    const projectStatusGraph = document.createElement('canvas');
    projectStatusGraph.id = 'projectStatusGraph';
    projectStatusGraph.className = 'graphs';
    projectStatus.append(projectStatusHeader, projectStatusGraph);

    const budgetOverview = div('budgetOverview', 'graph-containers');
    const budgetOverviewHeader = div('projectOverviewHeader', 'graph-headers');
    const budgetOverviewTitle = div('budgetOverviewTitle', 'graph-titles');
    const budgetOverviewSubtitle = div('budgetOverviewSubtitle', 'graph-subtitles');
    budgetOverviewTitle.innerText = 'Budget Overview';
    budgetOverviewSubtitle.innerText = "Budget vs actual spending by project (in millions)\nSTATIC PA TONG BAR GRAPH (WILL UPDATE SOON PAG MAY BUDGET SYSTEM NA)";
    budgetOverviewHeader.append(budgetOverviewTitle, budgetOverviewSubtitle);
    const budgetOverviewGraph = document.createElement('canvas');
    budgetOverviewGraph.id = 'budgetOverviewGraph';
    budgetOverviewGraph.className = 'graphs';
    budgetOverview.append(budgetOverviewHeader, budgetOverviewGraph);

    projectOverviewContainer.append(projectStatus, budgetOverview);
    return projectOverviewContainer;
}

async function initDashboardGraphs() {
    let progress = 0, planning = 0, completed = 0;
    const data = await fetchData('/api/projectStatusGraph');
    if(data === 'error') return;
    if(data.length > 0){
        progress = data[0].in_progress;
        planning =  data[0].planning;
        completed = data[0].completed;
    }
    
    const projectStatusGraph = document.getElementById('projectStatusGraph').getContext('2d');
    new Chart(projectStatusGraph, {
        type: 'doughnut', 
        data: {
            labels: ['Completed', 'Progress', 'Planning'],
            datasets: [{
                label: 'Project Status',
                data: [completed, progress, planning],
                backgroundColor: ['#1A3E72', '#4187bfff', '#97a6c4'],
                borderColor: ['#f0f0f0', '#f0f0f0'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: [`Total Projects: ${planning + progress + completed}`],
                    font: {
                        size: 12,
                        weight: 500,
                        family: 'Inter, Arial'
                    },
                    align: 'center',
                    gap: 10,
                    color: '#666666',
                    padding: 20
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.raw;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${percentage}%`;
                        }
                    }
                }
            }
        }
    });
    const budgetOverviewGraph = document.getElementById('budgetOverviewGraph').getContext('2d');
    new Chart(budgetOverviewGraph, {
        type: 'bar', 
        data: {
            labels: ['Geanhs', 'City Hall', 'Dali Imus'],
            datasets: [
                {
                    label: 'Budget',
                    data: [4, 5, 3],
                    backgroundColor: ['#1A3E72'],
                    borderColor: ['#f0f0f0'],
                    borderWidth: 1
                }, {
                    label: 'Spent',
                    data: [2, 1, 2.5],
                    backgroundColor: ['#4187bfff'],
                    borderColor: ['#f0f0f0'],
                    borderWidth: 1
                }   
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: function(index) {
                        const label = this.getLabelForValue(index);
                        const maxLength = 10; 

                        if (label.length > maxLength) {
                            return label.substring(0, maxLength) + '…';
                        }

                        return label;
                        }
                    }
                }
            }
        }
    });
}

async function dashboardActiveProjects(filter) {
    const activeProjectsContainer = div('activeProjectsContainer', 'active-projects');

    const activeProjectsHeader = div('activeProjectsHeader', 'content-card-header');
    const activeProjectsTitle = div('activeProjectsTitle', 'content-card-title');
    activeProjectsTitle.innerText = 'Active Projects';
    const activeProjectsSubtitle = div('activeProjectsSubtitle', 'content-card-subtitle');
    activeProjectsSubtitle.innerText = 'Currently in-progress construction projects';
    const activeProjectsBody = div('activeProjectsBody', 'content-card-body');
    const data = await fetchData(`/api/${filter}Projects`);
    if(data === 'error') return;
    if(data.length === 0) {
        const progressCardContainer = div('projectProgressCards', 'project-progress-cards');
        progressCardContainer.innerText = "There's no active projects so far";

        activeProjectsBody.append(progressCardContainer);
        activeProjectsHeader.append(activeProjectsTitle, activeProjectsSubtitle);
        activeProjectsContainer.append(activeProjectsHeader, activeProjectsBody);
        return activeProjectsContainer;
    } 
    let num  = 1;
    for (const projects of data) {
        const projectCard = createProjectCard(projects, num);
        activeProjectsBody.append(projectCard);
        num++;
    }
    activeProjectsHeader.append(activeProjectsTitle, activeProjectsSubtitle);
    activeProjectsContainer.append(activeProjectsHeader, activeProjectsBody);
    return activeProjectsContainer;
    
}

async function recentMaterialsRequest() {
    const recentRequestContainer = div(`recentRequestContainer`, `recent-request-container`);
    const recentRequestHeader = div(`recentRequestHeader`, `content-card-header`);
    const recentRequestBody = div(`recentRequestBody`,  `content-card-body`);
    const recentRequestTitle = div(`recentRequestTitle`, `content-card-title`);
    recentRequestTitle.innerText = 'Recent Material Requests';
    const recentRequestSubtitle = div(`recentRequestSubtitle`, `content-card-subtitle`);
    recentRequestSubtitle.innerText = 'Latest material requests requiring attention';
    
    const data = await fetchData(`/api/recentMatReqs`);
    if(data === 'error') return;
    if(data.length === 0){
        const requestCardContainer = div(`requestCardContainer`, `request-card-container`);
        requestCardContainer.innerText = 'There are no requests so far';
        recentRequestContainer.append(recentRequestHeader, recentRequestBody);
        recentRequestHeader.append(recentRequestTitle, recentRequestSubtitle);
        recentRequestBody.append(requestCardContainer);

        return recentRequestContainer;
    }
    for (const requests of data) {

        const requestCardContainer = div(`requestCardContainer`, `request-card-container`);
        const requestCardLeft = div(`requestCardLeft`, `request-card-left`);
        const requestCardHeader = div(`requestCardHeader`, `request-card-header`);
        const requestCardTitle = div(`requestCardTitle`, `request-card-title`);
        requestCardTitle.innerText = `${requests.project_name}`;
        const requestCardPriority = div(`requestCardPriority`, `request-card-priority`);
        if(requests.priority_level === "medium") warnType(requestCardPriority, "solid", 'yellow', '', '');
        if(requests.priority_level === "low") warnType(requestCardPriority, "solid", 'green', '', '');
        if(requests.priority_level === "high") warnType(requestCardPriority, "solid", 'red', '', '');
        requestCardPriority.innerText = `${formatString(requests.priority_level)} Priority`;
        const requestCardBody = div(`requestCardBody`, `request-card-body`);
        const requestCardName = div(`requestCardName`, `request-card-name`);
        requestCardName.innerText = `Requested by ${requests.requested_by} • `;
        const requestCardItemCount = div(`requestCardItemCount`, `request-card-item-count`);
        requestCardItemCount.innerText = `${requests.item_count} items • `; 
        const requestCardCost = div(`requestCardCost`, `request-card-cost`);
        requestCardCost.innerText = `₱${requests.cost}`;
        const requestCardRight = div(`requestCardRight`, `request-card-right`);
        const requestStatusContainer = div(`requestStatusContainer`, `request-status-container`);
        const requestStatusIcon = div(`requestStatusIcon`, `request-status-icon`);
        requestStatusIcon.classList.add('icons');
        const requestStatusLabel = div(`requestStatusLabel`, `request-status-label`);
        if(requests.status === "pending") warnType(requestStatusContainer, "", 'yellow', requestStatusIcon, requestStatusLabel);
        if(requests.status === "approved") warnType(requestStatusContainer, "", 'green', requestStatusIcon, requestStatusLabel);
        if(requests.status === "rejected") warnType(requestStatusContainer, "", 'red', requestStatusIcon, requestStatusLabel);
        requestStatusLabel.innerText = `${requests.status}`;
        const requestCardDate = div(`requestCardDate`, `request-card-date`);
        requestCardDate.innerText = `${dateFormatting(requests.request_date, 'dateTime')}`; 
        

        recentRequestContainer.append(recentRequestHeader, recentRequestBody);
        recentRequestHeader.append(recentRequestTitle, recentRequestSubtitle);
        recentRequestBody.append(requestCardContainer);
        requestCardContainer.append(requestCardLeft, requestCardRight);
        requestCardLeft.append(requestCardHeader, requestCardBody, requestCardDate);
        requestCardHeader.append(requestCardTitle, requestCardPriority);
        requestCardBody.append(requestCardName, requestCardItemCount, requestCardCost);
        requestCardRight.append(requestStatusContainer);
        requestStatusContainer.append(requestStatusIcon, requestStatusLabel);
    }
    return recentRequestContainer;
}

async function generateProjectContent(projectTabName, role) { //project1
    const projectId = projectTabName.replace(/project/g, '');
    const projectsBodyContent = document.getElementById('projectsBodyContent');
    projectsBodyContent.innerHTML = '';

    const adminProjectsBodyHeader = document.getElementById('adminProjectsBodyHeader');
    adminProjectsBodyHeader.innerHTML = ''; 

    const projectsBodyHeader = div('projectsBodyHeader');
    
    // --- Start of back button addition ---
    const backButton = div('projectDetailBackBtn', 'icons-with-bg');
    backButton.style.backgroundImage = 'url(/assets/icons/backWhite.png)';
    backButton.style.cursor = 'pointer';
    backButton.addEventListener('click', () => {
        generateProjectsContent(role); 
    });

    // --- End of back button addition ---
    const projectsHeaderContainer = div('projectsHeaderContainer', 'body-header-container');
    const projectsHeaderTitle = div('projectsHeaderTitle', 'body-header-title');
    const projectsHeaderLocation = div('projectsHeaderLocation');
    const projectsHeaderIcon = div('projectsHeaderIcon', 'icons');
    const projectsHeaderSubtitle = div('projectsHeaderSubtitle', 'body-header-subtitle');
    const projectsHeaderStatus = div('projectsHeaderStatus', 'status');
    const projectsOverallPercent = div('projectsOverallPercent');

    projectsHeaderLocation.append(projectsHeaderIcon, projectsHeaderSubtitle);
    projectsHeaderContainer.append(projectsHeaderTitle, projectsHeaderLocation, projectsHeaderStatus);

    projectsBodyHeader.append(backButton, projectsHeaderContainer, projectsOverallPercent);
    adminProjectsBodyHeader.append(projectsBodyHeader);
    adminProjectsBodyHeader.style.padding = '0';
    await createProjectDetailCard(projectId);
    projectsBodyContent.append(createSectionTabs(role, projectId));
    const selectionTabContent = document.getElementById('selectionTabContent'); //initial tab dat u will see on selectionTabs
    const milestoneTab = document.getElementById('selectionTabMilestones');
    const render = {label: "Milestones", render: renderMilestones};
    selectionTabRenderEvent(selectionTabContent, milestoneTab, render, projectId, role);
}

async function createProjectDetailCard(projectId) {
    const data = await fetchData(`/api/getProjectCard/${projectId}`);
    if(data === 'error') return alertPopup('error', 'Network Connection Error');

    const projectsBodyHeader = document.getElementById('projectsBodyHeader');
    projectsBodyHeader.style.backgroundImage = `url(/image/${data.image})`;

    const projectsOverallPercent = document.getElementById('projectsOverallPercent');
    projectsOverallPercent.innerText = `${Math.round(data.progress)}%`;

    const projectsHeaderTitle = document.getElementById('projectsHeaderTitle');
    projectsHeaderTitle.innerText = data.project_name;
    projectsHeaderTitle.style.color = 'var(--white-ishy-text)';

    const projectsHeaderIcon = document.getElementById('projectsHeaderIcon');
    projectsHeaderIcon.style.backgroundImage = 'url(/assets/icons/locationWhite.png)';
    
    const projectsHeaderSubtitle = document.getElementById('projectsHeaderSubtitle');
    projectsHeaderSubtitle.innerText = data.project_location;
    projectsHeaderSubtitle.style.color = `#cccccc`;
    
    const projectsHeaderStatus = document.getElementById('projectsHeaderStatus'); 
    if(data.status === 'in progress') warnType(projectsHeaderStatus, 'glass', 'yellow');
    if(data.status === 'planning') warnType(projectsHeaderStatus, 'glass', 'white');
    if(data.status === 'completed') warnType(projectsHeaderStatus, 'glass', 'green');
    projectsHeaderStatus.innerText = data.status;
}

function createSectionTabs(role, projectId) {
    const newContents = [
        {id: "selectionTabMilestones", label: "Milestones", render: renderMilestones},
        {id: "selectionTabWorkers", label: "Personnel", render: renderWorker},
    ]

    const selectionTabContent = div('selectionTabContent');
    selectionTabContent.id = 'selectionTabContent';
    const selectionTabContainer = div('selectionTabContainer');
    selectionTabContainer.id = 'selectionTabContainer';
    const selectionTabHeader = div('selectionTabHeader');

    for (const contents of newContents) {
        const elem = div(contents.id, 'selection-tabs');
        elem.id = contents.id;
        elem.innerText = contents.label;
        elem.addEventListener("click", async() => {
            await selectionTabRenderEvent(selectionTabContent, elem, contents, projectId, role)
        });
        selectionTabHeader.append(elem);
    }
    selectionTabContainer.append(selectionTabHeader, selectionTabContent);
    return selectionTabContainer;
}

function hideSelectionContents(contentContainer, tabClassName) { //done refactoring this, ready to use na anywhere
    const sameClassTabs = document.querySelectorAll(`.${tabClassName}`);
    for (const tab of sameClassTabs) {
        tab.classList.remove('selected');
    }
    contentContainer.innerHTML = "";
}

async function selectionTabRenderEvent(content, tab, newContent, projectId, role) {
    hideSelectionContents(content, tab.className);
    tab.classList.add('selected');
    content.append(await newContent.render(role, projectId));
}

async function renderMilestones(role, projectId) {
    const milestoneSectionContainer = div('milestoneSectionContainer');
    const milestoneSectionHeader = div('milestoneSectionHeader');
    const milestoneHeaderTitle = div('milestoneHeaderTitle');
    const milestoneHeaderText = span('milestoneHeaderText');
    milestoneHeaderText.innerText = 'Project Milestones';
    const milestoneSubheaderText = span('milestoneSubheaderText');
    milestoneSubheaderText.innerText = 'Track progress across construction milestones and tasks';
    let milestoneAddBtn = div('emptyDiv');
    if(role !== 'foreman') {
        milestoneAddBtn = createButton('milestoneAddBtn', 'solid-buttons', 'Create', 'milestoneAddText', 'milestoneAddIcon');
        milestoneAddBtn.addEventListener("click", () => { createMilestoneOl(projectId, () => refreshAdminProjectContent(projectId, role)) });
    }
    const milestoneSectionBody = div('milestoneSectionBody');
    const data = await fetchData(`/api/milestones/${projectId}`);
    if(data === "error") return alertPopup('error', 'Network Connection Error');
    if(data.length === 0) {
        if(role !== 'foreman') {
            showEmptyPlaceholder('/assets/icons/noMilestones.png', milestoneSectionBody, () => createMilestoneOl(projectId, () => refreshAdminProjectContent(projectId, role)), "There are no milestones yet", "Create Milestones", projectId);
        } else {
            showEmptyPlaceholder('/assets/icons/noMilestones.png', milestoneSectionBody, null, "There are no milestones yet", null, projectId);
        }
    } else {
        let counter = 1;
        let interval = 100;
        for (const milestone of data) {
            const milestonePartContainer = div('', 'milestone-part-container');
            const milestoneProgressContainer = div('', 'milestone-vertical-container');
            const milestoneProgressBar = div('', 'milestone-progress-bar');
            milestoneProgressBar.style.setProperty('--progress', `0%`);
            setTimeout(() => {
                requestAnimationFrame(() => {
                    milestoneProgressBar.style.setProperty(
                        '--progress',
                        `${roundDecimal(milestone.milestone_progress)}%`
                    );
                });
            }, interval);
            interval += 500;
            const milestoneProgressPoint = div('', 'milestone-progress-point')
            if(milestone.status === 'completed') milestoneProgressPoint.classList.add('completed');
            const milestoneCard = div('', 'milestone-cards');
            if(counter % 2 === 0) {
                milestoneCard.style.transform = 'translate(calc(0% + 1.5rem))';
                milestoneCard.classList.add("lefty");
            }
            if(counter % 2 !== 0) {
                milestoneCard.style.transform = 'translate(calc(-100% + -1.5rem))';
                milestoneCard.classList.remove("lefty");
            }
            const milestoneCardHeader = div('', 'milestone-card-header');
            const milestoneCardName = div('', 'milestone-card-name');
            milestoneCardName.innerText = milestone.milestone_name;
            const milestoneCardStatus = div('', 'milestone-card-status');
            milestoneCardStatus.classList.add('status');
            milestoneCardStatus.innerText = milestone.status;
            milestoneCard.addEventListener("mouseenter", () => {
                const startWidth = milestoneCardStatus.offsetWidth;
                milestoneCardStatus.innerText = `${roundDecimal(milestone.milestone_progress)}%`;
                const endWidth = milestoneCardStatus.offsetWidth;
                milestoneCardStatus.style.width = `${startWidth}px`;
                milestoneCardStatus.offsetWidth;
                milestoneCardStatus.style.width = `${endWidth}px`;
            });
            milestoneCard.addEventListener("mouseleave", () => {
                const startWidth = milestoneCardStatus.offsetWidth;
                milestoneCardStatus.innerText = milestone.status;
                const endWidth = milestoneCardStatus.offsetWidth;
                milestoneCardStatus.style.width = `${startWidth}px`;
                milestoneCardStatus.offsetWidth;
                milestoneCardStatus.style.width = `${endWidth}px`;
            });
            milestoneCard.addEventListener("transitionend", () => {
                milestoneCardStatus.style.width = 'auto';
            });
            if(milestone.status === 'not started') warnType(milestoneCardStatus, 'solid', 'white');
            if(milestone.status === 'in progress') warnType(milestoneCardStatus, 'solid', 'yellow');
            if(milestone.status === 'completed') warnType(milestoneCardStatus, 'solid', 'green');
            if(milestone.status === 'overdue') warnType(milestoneCardStatus, 'solid', 'red');
            const milestoneCardDescription = div('', 'milestone-card-description');
            milestoneCardDescription.innerText = milestone.milestone_description;
            const milestoneCardBody = div('', 'milestone-card-body');
            const milestoneCardView = div('', 'milestone-card-view');
            const milestoneCardViewText = span('milestoneCardViewText', 'btn-texts');
            milestoneCardViewText.innerText = 'View More';
            const milestoneCardViewIcon = span('milestoneCardViewIcon', 'btn-icons');
            milestoneCardView.append(milestoneCardViewText, milestoneCardViewIcon);
            milestoneCardView.addEventListener("click", () => {
                milestoneFullOl(projectId, milestone.id, milestone.milestone_name, async() => {
                    const projectsBodyContent = document.getElementById('projectsBodyContent');
                    projectsBodyContent.innerHTML = "";
                    await generateProjectContent(`project${projectId}`, role);
                }, role); //eto yung callback na ipapasa sa modal para pag ka save auto update ang ui
            });

            milestoneSectionHeader.append(milestoneHeaderTitle, milestoneAddBtn);
            milestoneHeaderTitle.append(milestoneHeaderText, milestoneSubheaderText);
            milestoneCardBody.append(milestoneCardView);
            milestoneCardHeader.append(milestoneCardName, milestoneCardStatus);
            milestoneCard.append(milestoneCardHeader, milestoneCardDescription, milestoneCardBody);
            milestoneProgressContainer.append(milestoneProgressBar, milestoneProgressPoint);
            milestonePartContainer.append(milestoneProgressContainer, milestoneCard);
            milestoneSectionBody.append(milestonePartContainer);
            counter ++;
        }
    }
    

    milestoneSectionContainer.append(milestoneSectionHeader, milestoneSectionBody);
    
    return milestoneSectionContainer;
}

async function renderWorker(role, projectId) {
    const workerSectionContainer = div('workerSectionContainer');

    const filterContainer = div('personnel-filter-container');
    const personnelContainer = div('personnel-main-container');
    const paginationContainer = div('personnelPaginationContainer', 'pagination-container');
    
    workerSectionContainer.append(filterContainer, personnelContainer, paginationContainer);

    let currentPage = 1;
    let itemsPerPage = 10;

    async function renderPersonnel(urlParams = new URLSearchParams()) {
        personnelContainer.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);
        urlParams.set('projectId', projectId);

        const data = await fetchData(`/api/personnel/project?${urlParams.toString()}`);
        personnelContainer.innerHTML = '';
        
        if (data === 'error' || data.personnel.length === 0) {
            showEmptyPlaceholder('/assets/icons/personnel.png', personnelContainer, null, "No personnel found for this project.");
            return;
        }

        data.personnel.forEach(person => {
            personnelContainer.append(createPersonnelCard(person, () => renderPersonnel(urlParams)));
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: data.total,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderPersonnel(urlParams);
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1;
                renderPersonnel(urlParams);
            }
        });
        paginationContainer.append(paginationControls);
    }

    async function applyFilterToPersonnel(filteredUrlParams) {
        currentPage = 1;
        await renderPersonnel(filteredUrlParams);
    }

    const filters = await createFilterContainer(
        applyFilterToPersonnel,
        'Search by name...', 
        { name: true, sort: true, role: true }, // Added role filter
        'name',
        'newest'
    );
    
    filterContainer.append(filters);

    await renderPersonnel(new URLSearchParams());

    return workerSectionContainer;
}

async function refreshAdminProjectContent(currentProjectId, role) {
    await createProjectDetailCard(currentProjectId);

    const selectionTabContent = document.getElementById('selectionTabContent');
    if (!selectionTabContent) return;

    const selectionTabContainer = document.getElementById('selectionTabContainer');
    if (!selectionTabContainer) return;

    const activeTab = selectionTabContainer.querySelector('.selection-tabs.selected');

    let currentRenderFunction;
    const newContents = [
        {id: "selectionTabMilestones", label: "Milestones", render: renderMilestones},
        {id: "selectionTabWorkers", label: "Personnel", render: renderWorker},
    ];

    if (activeTab) {
        const foundTab = newContents.find(item => item.id === activeTab.id);
        if (foundTab) {
            currentRenderFunction = foundTab.render;
        }
    }
    
    if (!currentRenderFunction) { 
        currentRenderFunction = renderMilestones; 
    }

    selectionTabContent.innerHTML = '';
    selectionTabContent.append(await currentRenderFunction(role, currentProjectId));
}

async function createProjectProgressSection() {
    const section = div('', 'project-progress-analytics-section');
    
    // Filter controls
    const filterContainer = div('', 'project-progress-filters');
    
    // Project Filter
    const projectFilterControl = div('', 'filter-control');
    const projectFilterLabel = span('', 'filter-label');
    projectFilterLabel.innerText = 'Project Filter';
    const projectFilterSelect = document.createElement('select');
    projectFilterSelect.className = 'filter-select';
    projectFilterSelect.id = 'projectProgressFilter';
    
    const projects = await fetchData('/api/projects');
    projectFilterSelect.innerHTML = '<option value="">All Projects</option>';
    if (projects !== 'error' && Array.isArray(projects)) {
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.project_id;
            option.innerText = project.project_name;
            projectFilterSelect.append(option);
        });
    }
    
    projectFilterControl.append(projectFilterLabel, projectFilterSelect);
    filterContainer.append(projectFilterControl);
    
    // Milestone Status Filter
    const milestoneFilterControl = div('', 'filter-control');
    const milestoneFilterLabel = span('', 'filter-label');
    milestoneFilterLabel.innerText = 'Milestone Status';
    const milestoneFilterSelect = document.createElement('select');
    milestoneFilterSelect.className = 'filter-select';
    milestoneFilterSelect.id = 'milestoneStatusFilter';
    milestoneFilterSelect.innerHTML = `
        <option value="">All Statuses</option>
        <option value="completed">Completed</option>
        <option value="in-progress">In Progress</option>
        <option value="pending">Pending</option>
        <option value="upcoming">Upcoming</option>
    `;
    
    milestoneFilterControl.append(milestoneFilterLabel, milestoneFilterSelect);
    filterContainer.append(milestoneFilterControl);
    
    section.append(filterContainer);
    
    // Tabs
    const tabContainer = div('', 'project-progress-tabs');
    const tabs = ['Overview', 'Milestones', 'Tasks'];
    let activeTab = 'Overview';
    
    tabs.forEach(tab => {
        const tabBtn = document.createElement('button');
        tabBtn.className = `progress-tab-btn ${tab === activeTab ? 'active' : ''}`;
        tabBtn.innerText = tab;
        tabBtn.addEventListener('click', async () => {
            document.querySelectorAll('.progress-tab-btn').forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');
            activeTab = tab;
            await renderTabContent();
        });
        tabContainer.append(tabBtn);
    });
    
    section.append(tabContainer);
    
    // Content container
    const contentContainer = div('', 'project-progress-content-container');
    section.append(contentContainer);
    
    // Render tab content function
    async function renderTabContent() {
        contentContainer.innerHTML = '';
        const selectedProjectId = projectFilterSelect.value || null;
        const selectedMilestoneStatus = milestoneFilterSelect.value || '';
        const dateRange = 'this-month';
        
        let content;
        if (activeTab === 'Overview') {
            content = await renderProjectProgressOverview(selectedProjectId, dateRange, selectedMilestoneStatus);
        } else if (activeTab === 'Milestones') {
            content = await renderMilestonesTracking(selectedProjectId, dateRange, selectedMilestoneStatus);
        } else if (activeTab === 'Tasks') {
            content = await renderTaskAnalytics(selectedProjectId, dateRange);
        }
        
        contentContainer.append(content);
    }
    
    // Event listeners for filters
    projectFilterSelect.addEventListener('change', renderTabContent);
    milestoneFilterSelect.addEventListener('change', renderTabContent);
    
    // Initial render
    await renderTabContent();
    
    return section;
}

async function renderProjectProgressOverview(projectId = null, dateRange = 'this-month', statusFilter = '') {
    const container = div('', 'progress-overview-container');
    
    // Fetch project data
    const projects = await fetchData('/api/projects');
    if (projects === 'error') {
        const empty = div('', 'empty-state');
        empty.innerText = 'Failed to load projects';
        container.append(empty);
        return container;
    }
    
    if (!projects || !Array.isArray(projects) || projects.length === 0) {
        const emptyState = div('', 'empty-state-container');
        emptyState.className = 'empty-state-container';
        const emptyIcon = div('', 'empty-state-icon');
        emptyIcon.style.backgroundImage = 'url(/assets/icons/projects.png)';
        const emptyMessage = span('', 'empty-state-message');
        emptyMessage.innerText = 'No projects available';
        const emptyDescription = span('', 'empty-state-description');
        emptyDescription.innerText = 'Create a new project to get started';
        emptyState.append(emptyIcon, emptyMessage, emptyDescription);
        container.append(emptyState);
        return container;
    }
    
    // ===== OVERALL PROJECT COMPLETION SECTION =====
    const overallCompletionSection = div('', 'overall-completion-section');
    
    // Add title
    const overallTitle = span('', 'section-subtitle');
    overallTitle.innerText = 'Overall Project Completion';
    overallCompletionSection.append(overallTitle);
    
    // Container for layout
    const overallCompletionContainer = div('', 'overall-completion-container');
    
    // Calculate overall completion
    let totalMilestones = 0;
    let completedMilestones = 0;
    let activeProjects = 0;
    let onTimeProjects = 0;
    
    projects.forEach(project => {
        totalMilestones += project.total_milestone || 0;
        completedMilestones += project.completed_milestone || 0;
        if (project.project_status === 'in progress') {
            activeProjects++;
        }
        const status = getProjectStatus(project);
        if (status === 'On Track' || project.project_status === 'completed') {
            onTimeProjects++;
        }
    });
    
    const overallPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
    
    // Left side - Overall completion percentage
    const overallCompletionLeft = div('', 'overall-completion-left');
    const percentageDisplay = span('', 'overall-percentage-display');
    percentageDisplay.innerText = `${overallPercent}%`;
    const percentageLabel = span('', 'overall-percentage-label');
    percentageLabel.innerText = 'Overall Portfolio Completion';
    overallCompletionLeft.append(percentageDisplay, percentageLabel);
    
    // Right side - Project cards
    const overallCompletionRight = div('', 'overall-completion-right');
    
    let filteredProjects = projects;
    if (projectId) {
        filteredProjects = projects.filter(p => p.project_id == projectId);
    }
    if (statusFilter) {
        filteredProjects = filteredProjects.filter(p => {
            const status = getProjectStatus(p);
            return status.toLowerCase() === statusFilter.toLowerCase();
        });
    }
    
    filteredProjects.forEach(project => {
        const projectCardCompact = createProjectCompactCard(project);
        overallCompletionRight.append(projectCardCompact);
    });
    
    overallCompletionContainer.append(overallCompletionLeft, overallCompletionRight);
    overallCompletionSection.append(overallCompletionContainer);
    container.append(overallCompletionSection);
    
    // ===== METRICS CARDS SECTION =====
    const metricsSection = div('', 'overview-metrics-section');
    
    // Find project closest to deadline
    let daysToDeadline = 999;
    let criticalProject = null;
    projects.forEach(project => {
        const days = calculateDaysRemaining(project.duedate);
        if (days > 0 && days < daysToDeadline) {
            daysToDeadline = days;
            criticalProject = project.project_name || 'Unknown Project';
        }
    });
    
    const onTimePercent = projects.length > 0 ? Math.round((onTimeProjects / projects.length) * 100) : 0;
    
    const metrics = [
        {
            label: 'ACTIVE PROJECTS',
            value: activeProjects.toString(),
            subtext: 'All projects in progress',
            status: 'success',
            statusText: 'Total portfolio'
        },
        {
            label: 'DAYS TO CRITICAL DEADLINE',
            value: daysToDeadline === 999 ? '—' : daysToDeadline.toString(),
            subtext: criticalProject || 'No critical deadlines',
            status: daysToDeadline < 7 ? 'warning' : 'info',
            statusText: daysToDeadline < 7 ? 'Urgent attention' : 'On track'
        },
        {
            label: 'ON-TIME COMPLETION RATE',
            value: `${onTimePercent}%`,
            subtext: `${onTimeProjects} of ${projects.length} projects`,
            status: onTimePercent >= 70 ? 'success' : (onTimePercent >= 50 ? 'warning' : 'error'),
            statusText: 'Monitor closely'
        }
    ];
    
    metrics.forEach(metric => {
        const card = createOverviewMetricCard(metric);
        metricsSection.append(card);
    });
    
    container.append(metricsSection);
    
    // ===== PROJECT STATUS SUMMARY TABLE =====
    const summaryTitle = span('', 'section-subtitle');
    summaryTitle.innerText = 'Project Status Summary';
    container.append(summaryTitle);
    
    const summaryTable = createProjectStatusSummaryTable(filteredProjects.length > 0 ? filteredProjects : projects);
    container.append(summaryTable);
    
    return container;
}

function createProjectCompactCard(project) {
    const card = div('', 'project-card-item');
    
    // Header with name and percentage
    const header = div('', 'project-card-header');
    const name = span('', 'project-card-name');
    name.innerText = project.project_name;
    
    const percentageValue = span('', 'project-card-percentage');
    const progressPercent = project.total_milestone > 0 ? Math.round((project.completed_milestone / project.total_milestone) * 100) : 0;
    percentageValue.innerText = `${progressPercent}%`;
    
    header.append(name, percentageValue);
    
    // Progress bar
    const progressBar = createProgressBar(progressPercent, '100%');
    
    // Footer with dates and status
    const footer = div('', 'project-card-footer');
    const startDate = span('', 'project-card-date');
    startDate.innerText = `Start: ${dateFormatting(project.start_date || project.created_at || new Date(), 'date')}`;
    
    const targetDate = span('', 'project-card-date');
    targetDate.innerText = `Target: ${dateFormatting(project.duedate || new Date(), 'date')}`;
    
    const statusValue = getProjectStatus(project);
    const statusBadge = span('', `project-card-status status-${statusValue.toLowerCase().replace(/\s+/g, '-')}`);
    statusBadge.innerText = statusValue;
    
    footer.append(startDate, targetDate, statusBadge);
    
    card.append(header, progressBar, footer);
    
    // Add click event
    card.addEventListener('click', () => {
        showProjectDetailsModal(project);
    });
    card.style.cursor = 'pointer';
    
    return card;
}

function createOverviewMetricCard(metric) {
    const card = div('', 'overview-metric-card');
    
    const label = span('', 'metric-label');
    label.innerText = metric.label;
    
    const value = span('', 'metric-value');
    value.innerText = metric.value;
    
    const subtext = span('', 'metric-subtext');
    subtext.innerText = metric.subtext;
    
    const statusBadge = span('', `metric-badge metric-badge-${metric.status}`);
    statusBadge.innerText = metric.statusText;
    
    card.append(label, value, subtext, statusBadge);
    return card;
}

function createProjectStatusSummaryTable(projects) {
    const tableContainer = div('', 'project-status-table-container');
    
    const table = document.createElement('table');
    table.className = 'project-status-summary-table';
    
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['PROJECT', 'PROGRESS', 'STATUS', 'START DATE', 'TARGET END', 'DAYS REMAINING', 'OVERDUE TASKS'];
    
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.innerText = headerText;
        headerRow.append(th);
    });
    
    thead.append(headerRow);
    table.append(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    
    projects.forEach(project => {
        const row = document.createElement('tr');
        
        // Project name
        const nameCell = document.createElement('td');
        nameCell.className = 'project-name-cell';
        nameCell.innerText = project.project_name;
        
        // Progress
        const progressCell = document.createElement('td');
        progressCell.className = 'progress-cell';
        const percent = project.total_milestone > 0 ? Math.round((project.completed_milestone / project.total_milestone) * 100) : 0;
        const progressBar = createProgressBar(percent, '120px');
        progressCell.append(progressBar);
        
        // Status
        const statusCell = document.createElement('td');
        statusCell.className = 'status-cell';
        const status = getProjectStatus(project);
        const statusSpan = span('', `status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`);
        statusSpan.innerText = status;
        statusCell.append(statusSpan);
        
        // Start date
        const startDateCell = document.createElement('td');
        startDateCell.innerText = dateFormatting(project.start_date || project.created_at || new Date(), 'date');
        
        // Target end date
        const endDateCell = document.createElement('td');
        endDateCell.innerText = dateFormatting(project.duedate || new Date(), 'date');
        
        // Days remaining
        const daysCell = document.createElement('td');
        const daysRemaining = calculateDaysRemaining(project.duedate);
        daysCell.innerText = daysRemaining > 0 ? `${daysRemaining} days` : 'Overdue';
        if (daysRemaining < 0) {
            daysCell.style.color = '#d32f2f';
            daysCell.style.fontWeight = '600';
        }
        
        // Overdue tasks count
        const overdueCell = document.createElement('td');
        overdueCell.className = 'overdue-cell';
        overdueCell.innerText = (project.overdue_tasks_count || 0).toString();
        if (project.overdue_tasks_count > 0) {
            overdueCell.style.color = '#d32f2f';
            overdueCell.style.fontWeight = '600';
        }
        
        row.append(nameCell, progressCell, statusCell, startDateCell, endDateCell, daysCell, overdueCell);
        
        // Add row click event with visual feedback
        row.style.cursor = 'pointer';
        row.classList.add('clickable-row');
        row.addEventListener('click', async (e) => {
            console.log('Project row clicked:', project.project_name);
            try {
                await showProjectDetailsModal(project);
            } catch (error) {
                console.error('Error showing project modal:', error);
                alertPopup('Unable to load project details', warnType.bad);
            }
        });
        
        // Add hover effect
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#f5f5f5';
        });
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = '';
        });
        
        tbody.append(row);
    });
    
    table.append(tbody);
    tableContainer.append(table);
    
    return tableContainer;
}

function createProgressBar(percent, width = '100%') {
    const container = div('', 'progress-bar-container');
    container.style.width = width;
    
    const bar = div('', 'progress-bar-fill');
    bar.style.width = `${Math.min(percent, 100)}%`;
    
    // Color based on percentage
    if (percent >= 75) {
        bar.style.backgroundColor = '#388e3c'; // Green
    } else if (percent >= 50) {
        bar.style.backgroundColor = '#1976d2'; // Blue
    } else if (percent >= 25) {
        bar.style.backgroundColor = '#f57c00'; // Orange
    } else {
        bar.style.backgroundColor = '#d32f2f'; // Red
    }
    
    container.append(bar);
    return container;
}

function getProjectStatus(project) {
    const percent = project.total_milestone > 0 ? (project.completed_milestone / project.total_milestone) * 100 : 0;
    const daysRemaining = calculateDaysRemaining(project.duedate);
    
    if (project.project_status === 'completed') {
        return 'Completed';
    } else if (daysRemaining < 0) {
        return 'Delayed';
    } else if (percent < 50 && daysRemaining < 7) {
        return 'At Risk';
    } else if (daysRemaining < 3 && percent < 100) {
        return 'At Risk';
    }
    return 'On Track';
}

function calculateDaysRemaining(endDate) {
    if (!endDate) return 0;
    const today = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
}

function calculateProjectDuration(startDate, endDate) {
    if (!startDate || !endDate) return 'N/A';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    
    if (days < 30) {
        return `${days} days`;
    } else if (days < 365) {
        const months = Math.round(days / 30);
        return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
        const years = Math.floor(days / 365);
        const remainingMonths = Math.round((days % 365) / 30);
        return remainingMonths > 0 
            ? `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
            : `${years} year${years !== 1 ? 's' : ''}`;
    }
}

// ======================================================
// MILESTONES TRACKING - Refactored for Better Readability
// ======================================================
/**
 * REFACTORING SUMMARY (January 2026)
 * 
 * This section has been refactored to improve code organization and maintainability:
 * 
 * KEY IMPROVEMENTS:
 * 1. Separation of Concerns:
 *    - Data fetching (_fetchProjectsData)
 *    - Data validation and processing (_processMilestoneData)
 *    - UI rendering (_renderProjectMilestoneSection, _renderMilestoneTimeline)
 *    - Event handling (_createMilestoneStep with click handlers)
 * 
 * 2. Modular Helper Functions:
 *    - _filterProjects: Project filtering logic
 *    - _calculateMilestoneStats: Statistics calculation
 *    - _createStatusIndicator: Status icon generation
 *    - _createMilestoneContent: Content section building
 *    - _renderEmptyState: Centralized empty state handling
 * 
 * 3. Enhanced Modal System:
 *    - showMilestoneDetailsModalRefactored: Main modal function
 *    - _createMilestoneModalHeader: Header with close button
 *    - _createMilestoneModalBody: Details grid and description
 *    - _createMilestoneTasksSection: Async tasks fetching
 *    - _setupModalCloseEvents: Event listener management
 * 
 * 4. Validation & Error Handling:
 *    - Comprehensive data validation at each step
 *    - Multiple empty state scenarios (no projects, no milestones, filtered results)
 *    - Try-catch blocks for async operations
 *    - Graceful degradation on API failures
 * 
 * 5. Color-Coded Status System:
 *    - Completed: Green (#388e3c)
 *    - In Progress: Orange (#f57c00)
 *    - Pending: Blue (#1976d2)
 *    - Overdue: Red (#d32f2f)
 *    - Not Started: Gray (#999)
 * 
 * 6. Interactive Features:
 *    - Clickable milestones open detailed modal
 *    - Modal shows: title, status, due date, progress, description, associated tasks
 *    - Overlay click and close button dismiss modal
 *    - Smooth transitions and hover effects
 * 
 * 7. Dynamic Updates:
 *    - Filters update without page reload
 *    - Status badges reflect real-time milestone state
 *    - Overdue detection based on current date comparison
 *    - Progress percentages display when available
 */

/**
 * Main renderer for the Milestones Tracking tab
 * Handles: data fetching, validation, project filtering, and UI composition
 */
async function renderMilestonesTracking(projectId = null, dateRange = 'this-month', statusFilter = '') {
    const container = div('', 'milestones-tracking-container');
    
    try {
        // PHASE 1: DATA FETCHING & VALIDATION
        const projects = await _fetchProjectsData();
        if (!projects || projects.length === 0) {
            return _renderEmptyState(container, 'No projects available', 'Create a project to manage milestones');
        }
        
        // PHASE 2: PROJECT FILTERING
        const filteredProjects = _filterProjects(projects, projectId);
        
        // PHASE 3: RENDER EACH PROJECT'S MILESTONES
        for (const project of filteredProjects) {
            const projectSection = await _renderProjectMilestoneSection(project, statusFilter);
            if (projectSection) {
                container.append(projectSection);
            }
        }
        
        // If no sections rendered, show empty state
        if (container.children.length === 0) {
            return _renderEmptyState(container, 'No milestones available', 'Create a milestone to get started');
        }
        
    } catch (error) {
        console.error('Error rendering milestones:', error);
        return _renderEmptyState(container, 'Error loading milestones', 'Please try again later');
    }
    
    return container;
}

/**
 * PHASE 1: DATA FETCHING
 * Fetches all projects from the API
 */
async function _fetchProjectsData() {
    const projects = await fetchData('/api/projects');
    return (projects === 'error' || !Array.isArray(projects)) ? [] : projects;
}

/**
 * PHASE 2: FILTERING
 * Filters projects by ID if specified
 */
function _filterProjects(projects, projectId) {
    return projectId ? projects.filter(p => p.project_id == projectId) : projects;
}

/**
 * PHASE 3: RENDER PROJECT SECTION
 * Builds a complete project milestone section with header, stats, and timeline
 */
async function _renderProjectMilestoneSection(project, statusFilter) {
    try {
        // Fetch milestones for this project
        const milestones = await fetchData(`/api/milestones/${project.project_id}`);
        if (milestones === 'error' || !Array.isArray(milestones) || milestones.length === 0) {
            return null;
        }
        
        // Create project section container
        const projectSection = div('', 'milestone-project-section');
        
        // Render project header with stats
        const projectHeader = _renderProjectMilestoneHeader(project, milestones);
        projectSection.append(projectHeader);
        
        // Render milestone timeline
        const timeline = await _renderMilestoneTimeline(milestones, project.project_id, statusFilter);
        projectSection.append(timeline);
        
        return projectSection;
    } catch (error) {
        console.error(`Error rendering milestones for project ${project.project_id}:`, error);
        return null;
    }
}

/**
 * Renders the project header with milestone statistics
 */
function _renderProjectMilestoneHeader(project, milestones) {
    const header = div('', 'milestone-project-header');
    const projectName = span('', 'project-name');
    projectName.innerText = project.project_name;
    
    // Calculate milestone statistics
    const stats = _calculateMilestoneStats(milestones);
    
    // Render stats badges
    const statsContainer = span('', 'milestone-stats');
    statsContainer.innerHTML = `
        <span class="stat completed"><strong>${stats.completed}</strong> Completed</span>
        <span class="stat pending"><strong>${stats.pending}</strong> Pending</span>
        <span class="stat upcoming"><strong>${stats.upcoming}</strong> Upcoming</span>
        ${stats.overdue > 0 ? `<span class="stat overdue"><strong>${stats.overdue}</strong> Overdue</span>` : ''}
    `;
    
    header.append(projectName, statsContainer);
    return header;
}

/**
 * Calculates milestone statistics (completed, pending, upcoming, overdue counts)
 */
function _calculateMilestoneStats(milestones) {
    const today = new Date();
    const stats = { total: milestones.length, completed: 0, pending: 0, overdue: 0, upcoming: 0 };
    
    milestones.forEach(m => {
        const dueDate = new Date(m.duedate);
        
        if (m.status === 'completed') {
            stats.completed++;
        } else if (m.status === 'pending') {
            stats.pending++;
            if (dueDate < today) stats.overdue++;
        } else if (m.status === 'not started') {
            if (dueDate < today) stats.overdue++;
            else stats.upcoming++;
        }
    });
    
    stats.upcoming = stats.total - stats.completed - stats.pending;
    return stats;
}

/**
 * PHASE 3: RENDER TIMELINE
 * Creates the visual milestone timeline with all steps and indicators
 */
async function _renderMilestoneTimeline(milestones, projectId, statusFilter = '') {
    const timeline = div('', 'milestone-timeline');
    
    try {
        // STEP 1: Validate and process milestone data
        let processedMilestones = _processMilestoneData(milestones);
        
        // STEP 2: Apply status filter if provided
        if (statusFilter) {
            processedMilestones = _filterMilestonesByStatus(processedMilestones, statusFilter);
        }
        
        // STEP 3: Render milestones or empty state
        if (processedMilestones.length === 0) {
            return _renderMilestoneEmptyState(timeline, statusFilter);
        }
        
        // STEP 4: Render each milestone as a timeline step
        processedMilestones.forEach((milestone, index) => {
            const step = _createMilestoneStep(milestone, projectId);
            timeline.append(step);
            
            // Add connecting line between steps
            if (index < processedMilestones.length - 1) {
                const connector = div('', 'milestone-connector');
                timeline.append(connector);
            }
        });
        
    } catch (error) {
        console.error('Error rendering timeline:', error);
        return _renderMilestoneEmptyState(timeline, false, 'Error loading milestones');
    }
    
    return timeline;
}

/**
 * Processes raw milestone data from API into standardized format with status detection
 */
function _processMilestoneData(milestones) {
    if (!Array.isArray(milestones) || milestones.length === 0) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    
    return milestones.map(m => {
        const dueDate = new Date(m.duedate);
        const isOverdue = dueDate < today && (m.status === 'pending' || m.status === 'not started');
        
        return {
            id: m.id || m.milestone_id,
            name: m.milestone_name,
            description: m.milestone_description || '',
            status: isOverdue ? 'overdue' : m.status,
            dueDate: dueDate,
            isOverdue: isOverdue,
            progress: m.milestone_progress || 0
        };
    });
}

/**
 * Filters milestones by status for display
 */
function _filterMilestonesByStatus(milestones, statusFilter) {
    if (!statusFilter) return milestones;
    return milestones.filter(m => m.status === statusFilter || (statusFilter === 'overdue' && m.isOverdue));
}

/**
 * Renders empty state for milestone timeline
 */
function _renderMilestoneEmptyState(timeline, statusFilter, customMessage = null) {
    const emptyState = div('', 'empty-milestone-state');
    const emptyIcon = div('', 'empty-state-icon');
    emptyIcon.style.backgroundImage = 'url(/assets/icons/noMilestones.png)';
    
    const emptyMessage = span('', 'empty-state-message');
    const emptyDescription = span('', 'empty-state-description');
    
    if (customMessage) {
        emptyMessage.innerText = customMessage;
        emptyDescription.innerText = 'Please check your settings or try again';
    } else if (statusFilter) {
        emptyMessage.innerText = 'No milestones matching the selected status';
        emptyDescription.innerText = 'Try adjusting your filters';
    } else {
        emptyMessage.innerText = 'No milestones available';
        emptyDescription.innerText = 'Create a milestone to get started';
    }
    
    emptyState.append(emptyIcon, emptyMessage, emptyDescription);
    timeline.append(emptyState);
    return timeline;
}

/**
 * Creates a single milestone step element with all visual indicators
 */
function _createMilestoneStep(milestone, projectId) {
    const step = div('', `milestone-step ${milestone.status}`);
    
    // Create status indicator
    const indicator = _createStatusIndicator(milestone.status);
    
    // Create step content
    const content = _createMilestoneContent(milestone);
    
    step.append(indicator, content);
    
    // EVENT HANDLING: Make milestone clickable to show details
    step.style.cursor = 'pointer';
    step.addEventListener('click', async () => {
        await showMilestoneDetailsModal(milestone, projectId);
    });
    
    return step;
}

/**
 * Creates the status indicator icon based on milestone status
 */
function _createStatusIndicator(status) {
    const indicator = div('', 'step-indicator');
    const indicatorIcon = span('', 'indicator-icon');
    
    const statusConfig = {
        'completed': { icon: '✓', class: 'completed-indicator' },
        'in progress': { icon: '●', class: 'in-progress-indicator' },
        'overdue': { icon: '⚠', class: 'overdue-indicator' },
        'not started': { icon: '○', class: 'not-started-indicator' },
        'pending': { icon: '○', class: 'not-started-indicator' }
    };
    
    const config = statusConfig[status] || { icon: '○', class: 'not-started-indicator' };
    indicatorIcon.innerHTML = config.icon;
    indicator.classList.add(config.class);
    indicator.append(indicatorIcon);
    
    return indicator;
}

/**
 * Creates the content section of a milestone step (name, details, badges, description)
 */
function _createMilestoneContent(milestone) {
    const content = div('', 'step-content');
    
    // Milestone name
    const name = span('', 'milestone-name');
    name.innerText = milestone.name;
    
    // Milestone details and badges
    const details = span('', 'milestone-details');
    details.innerHTML = `<strong>${dateFormatting(milestone.dueDate, 'date')}</strong>`;
    
    // Status badge
    const statusBadge = span('', `milestone-status-badge status-${milestone.status.toLowerCase().replace(/\s+/g, '-')}`);
    statusBadge.innerText = milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1);
    details.append(statusBadge);
    
    // Overdue warning badge
    if (milestone.isOverdue) {
        const overdueWarning = span('', 'milestone-overdue-warning');
        overdueWarning.innerText = '⚠ OVERDUE';
        details.append(overdueWarning);
    }
    
    // Progress display
    if (milestone.progress > 0) {
        const progressDisplay = span('', 'milestone-progress-display');
        progressDisplay.innerText = `${Math.round(milestone.progress)}% complete`;
        details.append(progressDisplay);
    }
    
    content.append(name, details);
    
    // Description section
    if (milestone.description) {
        const descriptionText = span('', 'milestone-description');
        descriptionText.innerText = milestone.description;
        content.append(descriptionText);
    }
    
    return content;
}

/**
 * Renders empty state UI with icon, message, and description
 */
function _renderEmptyState(container, message, description) {
    const emptyState = div('', 'empty-state-container');
    const emptyIcon = div('', 'empty-state-icon');
    emptyIcon.style.backgroundImage = 'url(/assets/icons/noMilestones.png)';
    
    const emptyMessage = span('', 'empty-state-message');
    emptyMessage.innerText = message;
    
    const emptyDescription = span('', 'empty-state-description');
    emptyDescription.innerText = description;
    
    emptyState.append(emptyIcon, emptyMessage, emptyDescription);
    container.append(emptyState);
    return container;
}

/**
 * ============================================================================
 * REFACTORED MILESTONE MODAL FUNCTIONS
 * Organized with clear separation of concerns for maintainability
 * ============================================================================
 */

/**
 * MILESTONE DETAILS MODAL - REFACTORED
 * Displays comprehensive milestone information in an interactive modal
 * Organized with clear sections: header, details, description, tasks
 */
/**
 * Shows milestone details modal with comprehensive information
 * Refactored to match project and task modal styles
 */
async function showMilestoneDetailsModalRefactored(milestone, projectId) {
    try {
        // Create modal background
        const modalBg = div('', 'modal-overlay');
        const modal = div('', 'modal-container project-info-modal');
        
        // HEADER
        const header = div('', 'modal-header-simple');
        const titleEl = span('', 'modal-title-simple');
        titleEl.innerText = milestone.name;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-button-simple';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Close modal');
        
        header.append(titleEl, closeBtn);
        modal.append(header);
        
        // Fetch associated tasks
        const tasks = milestone.id ? await fetchData(`/api/tasks/${milestone.id}`) : [];
        const tasksData = tasks !== 'error' && Array.isArray(tasks) ? tasks : [];
        
        // Calculate milestone statistics
        const totalTasks = tasksData.length;
        const completedTasks = tasksData.filter(t => t.status === 'completed').length;
        const inProgressTasks = tasksData.filter(t => t.status === 'in progress').length;
        const overdueTasks = tasksData.filter(t => {
            const dueDate = new Date(t.due_date);
            const today = new Date();
            return dueDate < today && t.status !== 'completed';
        }).length;
        
        const dueDate = new Date(milestone.dueDate);
        const today = new Date();
        const daysRemaining = calculateDaysRemaining(dueDate);
        const isOverdue = milestone.isOverdue || (dueDate < today && milestone.status !== 'completed');
        
        // MILESTONE INFORMATION SECTION
        const infoContainer = div('', 'modal-table-container');
        const infoTable = document.createElement('table');
        infoTable.className = 'modal-info-table';
        
        // Table header
        const infoThead = document.createElement('thead');
        const infoHeaderRow = document.createElement('tr');
        const infoHeaders = ['Milestone Information', 'Details', 'Status'];
        
        infoHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.innerText = headerText;
            infoHeaderRow.append(th);
        });
        
        infoThead.append(infoHeaderRow);
        infoTable.append(infoThead);
        
        // Table body with milestone details
        const infoTbody = document.createElement('tbody');
        
        const milestoneInfo = [
            {
                label: 'Milestone ID',
                value: `#${milestone.id}`,
                status: milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)
            },
            {
                label: 'Due Date',
                value: dateFormatting(dueDate, 'date'),
                status: isOverdue ? '⚠️ Overdue' : (daysRemaining > 0 ? `${daysRemaining} days left` : 'Due today')
            },
            {
                label: 'Progress',
                value: milestone.progress ? `${Math.round(milestone.progress)}%` : '0%',
                status: milestone.progress >= 75 ? 'On Track' : (milestone.progress >= 50 ? 'In Progress' : 'Behind')
            },
            {
                label: 'Current Status',
                value: milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1),
                status: isOverdue ? 'Needs Attention' : 'Normal'
            },
            {
                label: 'Total Tasks',
                value: totalTasks.toString(),
                status: `${completedTasks} completed`
            },
            {
                label: 'Tasks in Progress',
                value: inProgressTasks.toString(),
                status: inProgressTasks > 0 ? 'Active' : 'None'
            },
            {
                label: 'Overdue Tasks',
                value: overdueTasks.toString(),
                status: overdueTasks > 0 ? '⚠️ Action Required' : '✓ All Clear'
            }
        ];
        
        milestoneInfo.forEach(info => {
            const row = document.createElement('tr');
            
            const labelCell = document.createElement('td');
            labelCell.innerText = info.label;
            labelCell.style.fontWeight = '500';
            
            const valueCell = document.createElement('td');
            valueCell.innerText = info.value;
            
            const statusCell = document.createElement('td');
            statusCell.innerText = info.status;
            
            // Color coding
            if (info.label === 'Due Date' && isOverdue) {
                statusCell.style.color = '#d32f2f';
                statusCell.style.fontWeight = '600';
            }
            
            if (info.label === 'Overdue Tasks' && overdueTasks > 0) {
                statusCell.style.color = '#d32f2f';
                statusCell.style.fontWeight = '600';
            }
            
            if (info.label === 'Progress' && milestone.progress < 50) {
                statusCell.style.color = '#f57c00';
            } else if (info.label === 'Progress' && milestone.progress >= 75) {
                statusCell.style.color = '#2e7d32';
                statusCell.style.fontWeight = '600';
            }
            
            row.append(labelCell, valueCell, statusCell);
            infoTbody.append(row);
        });
        
        infoTable.append(infoTbody);
        infoContainer.append(infoTable);
        modal.append(infoContainer);
        
        // DESCRIPTION SECTION (if available)
        if (milestone.description) {
            const descContainer = div('', 'modal-table-container');
            descContainer.style.marginTop = '24px';
            
            const descTitle = div('', 'modal-section-subtitle');
            descTitle.innerText = 'MILESTONE DESCRIPTION';
            descContainer.append(descTitle);
            
            const descContent = div('', 'task-description-content');
            descContent.innerText = milestone.description;
            descContainer.append(descContent);
            
            modal.append(descContainer);
        }
        
        // ASSOCIATED TASKS TABLE (if available)
        if (tasksData.length > 0) {
            const tasksTableContainer = div('', 'modal-table-container');
            tasksTableContainer.style.marginTop = '24px';
            
            const tasksTitle = div('', 'modal-section-subtitle');
            tasksTitle.innerText = 'ASSOCIATED TASKS';
            tasksTableContainer.append(tasksTitle);
            
            const tasksTable = document.createElement('table');
            tasksTable.className = 'modal-info-table';
            
            const tThead = document.createElement('thead');
            const tHeaderRow = document.createElement('tr');
            const tHeaders = ['Task Name', 'Status', 'Assignee', 'Priority'];
            
            tHeaders.forEach(headerText => {
                const th = document.createElement('th');
                th.innerText = headerText;
                tHeaderRow.append(th);
            });
            
            tThead.append(tHeaderRow);
            tasksTable.append(tThead);
            
            const tTbody = document.createElement('tbody');
            
            tasksData.slice(0, 8).forEach(task => {
                const row = document.createElement('tr');
                
                const nameCell = document.createElement('td');
                nameCell.innerText = task.task_name;
                nameCell.style.fontWeight = '500';
                
                const statusCell = document.createElement('td');
                const statusText = (task.status || 'pending').charAt(0).toUpperCase() + (task.status || 'pending').slice(1);
                statusCell.innerText = statusText;
                
                // Add color coding for status
                if (task.status === 'completed') {
                    statusCell.style.color = '#2e7d32';
                    statusCell.style.fontWeight = '600';
                } else if (task.status === 'in progress') {
                    statusCell.style.color = '#1976d2';
                    statusCell.style.fontWeight = '600';
                }
                
                const assigneeCell = document.createElement('td');
                assigneeCell.innerText = task.assigned_to || 'Unassigned';
                
                const priorityCell = document.createElement('td');
                const taskDueDate = task.due_date ? new Date(task.due_date) : null;
                const isTaskOverdue = taskDueDate && taskDueDate < today && task.status !== 'completed';
                
                if (isTaskOverdue) {
                    priorityCell.innerText = '⚠️ Overdue';
                    priorityCell.style.color = '#d32f2f';
                    priorityCell.style.fontWeight = '600';
                } else if (task.status === 'completed') {
                    priorityCell.innerText = '✓ Complete';
                    priorityCell.style.color = '#2e7d32';
                } else {
                    priorityCell.innerText = task.priority || 'Normal';
                }
                
                row.append(nameCell, statusCell, assigneeCell, priorityCell);
                tTbody.append(row);
            });
            
            tasksTable.append(tTbody);
            tasksTableContainer.append(tasksTable);
            
            // Show count if more tasks exist
            if (tasksData.length > 8) {
                const moreText = span('', 'modal-more-items-text');
                moreText.innerText = `+ ${tasksData.length - 8} more task${tasksData.length - 8 !== 1 ? 's' : ''}`;
                tasksTableContainer.append(moreText);
            }
            
            modal.append(tasksTableContainer);
        }
        
        // SUMMARY SECTION
        const summarySection = div('', 'modal-summary-section');
        const summaryTitle = div('', 'modal-summary-title');
        summaryTitle.innerText = 'MILESTONE SUMMARY';
        summarySection.append(summaryTitle);
        
        const summaryGrid = div('', 'modal-summary-grid');
        
        const summaryItems = [
            { label: 'Total Tasks:', value: totalTasks },
            { label: 'Completed:', value: completedTasks },
            { label: 'In Progress:', value: inProgressTasks },
            { label: 'Overdue:', value: overdueTasks }
        ];
        
        summaryItems.forEach(item => {
            const itemEl = div('', 'modal-summary-item');
            const label = span('', 'summary-label');
            label.innerText = item.label;
            const value = span('', 'summary-value');
            value.innerText = item.value;
            itemEl.append(label, value);
            summaryGrid.append(itemEl);
        });
        
        summarySection.append(summaryGrid);
        modal.append(summarySection);
        
        modalBg.append(modal);
        
        // Event handlers
        closeBtn.addEventListener('click', () => {
            modalBg.classList.add('modal-fade-out');
            setTimeout(() => modalBg.remove(), 300);
        });
        
        modalBg.addEventListener('click', (e) => {
            if (e.target === modalBg) {
                modalBg.classList.add('modal-fade-out');
                setTimeout(() => modalBg.remove(), 300);
            }
        });
        
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                modalBg.classList.add('modal-fade-out');
                setTimeout(() => modalBg.remove(), 300);
                document.removeEventListener('keydown', escHandler);
            }
        });
        
        document.body.append(modalBg);
        requestAnimationFrame(() => modalBg.classList.add('modal-fade-in'));
        
    } catch (error) {
        console.error('Error showing milestone details:', error);
        alertPopup('Unable to load milestone details', warnType.bad);
    }
}

/**
 * Creates the modal header with title, status badge, and close button
 */
function _createMilestoneModalHeader(milestone) {
    const header = div('', 'modal-header modal-header-style');
    const headerContent = div('', 'modal-header-content');
    
    // Milestone title
    const title = span('', 'modal-title modal-title-style');
    title.innerText = milestone.name;
    
    // Status badge
    const statusBadge = span('', `milestone-badge status-${milestone.status.toLowerCase().replace(/\s+/g, '-')}`);
    statusBadge.innerText = milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1);
    
    headerContent.append(title, statusBadge);
    header.append(headerContent);
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#999';
    closeBtn.style.transition = 'color 0.3s ease';
    closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#333');
    closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = '#999');
    
    header.append(closeBtn);
    header.closeBtn = closeBtn; // Store reference for event setup
    
    return header;
}

/**
 * Creates the modal body with details grid, description, and tasks section label
 */
function _createMilestoneModalBody(milestone) {
    const body = div('', 'modal-body modal-body-style');
    
    // Details grid
    const detailsGrid = div('', 'milestone-details-grid');
    
    // Due date row
    const dueDateRow = _createDetailRow('Due Date:', dateFormatting(milestone.dueDate, 'date'));
    detailsGrid.append(dueDateRow);
    
    // Status row
    const statusRow = _createDetailRow('Status:', milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1));
    detailsGrid.append(statusRow);
    
    // Progress row (if available)
    if (milestone.progress && milestone.progress > 0) {
        const progressRow = _createDetailRow('Progress:', `${Math.round(milestone.progress)}%`);
        detailsGrid.append(progressRow);
    }
    
    // Overdue warning (if applicable)
    if (milestone.isOverdue) {
        const overdueRow = _createDetailRow('⚠ Status:', 'OVERDUE', true);
        detailsGrid.append(overdueRow);
    }
    
    body.append(detailsGrid);
    
    // Description section (if available)
    if (milestone.description) {
        const descriptionSection = div('', 'milestone-description-section');
        const descriptionLabel = span('', 'section-label');
        descriptionLabel.innerText = 'Description';
        
        const descriptionText = span('', 'milestone-description-text');
        descriptionText.innerText = milestone.description;
        
        descriptionSection.append(descriptionLabel, descriptionText);
        body.append(descriptionSection);
    }
    
    return body;
}

/**
 * Fetches and creates the associated tasks section
 */
async function _createMilestoneTasksSection(milestoneId) {
    const tasksSection = div('', 'milestone-tasks-section');
    const tasksLabel = span('', 'section-label');
    tasksLabel.innerText = 'Associated Tasks';
    
    const tasksList = div('', 'milestone-tasks-list');
    
    try {
        const tasks = await fetchData(`/api/tasks/${milestoneId}`);
        
        if (tasks !== 'error' && Array.isArray(tasks) && tasks.length > 0) {
            // Render each task
            tasks.forEach(task => {
                const taskItem = _createTaskItemForModal(task);
                tasksList.append(taskItem);
            });
        } else {
            // No tasks available
            const noTasks = span('', 'no-tasks-message');
            noTasks.innerText = 'No tasks for this milestone';
            tasksList.append(noTasks);
        }
    } catch (error) {
        console.error('Error fetching tasks:', error);
        const noTasks = span('', 'no-tasks-message');
        noTasks.innerText = 'Unable to load tasks';
        tasksList.append(noTasks);
    }
    
    tasksSection.append(tasksLabel, tasksList);
    return tasksSection;
}

/**
 * Creates a single task item for display in the milestone modal
 */
function _createTaskItemForModal(task) {
    const taskItem = div('', 'milestone-task-item');
    
    const taskName = span('', 'task-item-name');
    taskName.innerText = task.task_name;
    
    const taskStatus = span('', `task-item-status status-${(task.status || 'pending').toLowerCase()}`);
    taskStatus.innerText = (task.status || 'pending').charAt(0).toUpperCase() + (task.status || 'pending').slice(1);
    
    taskItem.append(taskName, taskStatus);
    return taskItem;
}

/**
 * Creates a detail row for the modal details grid
 */
function _createDetailRow(label, value, isWarning = false) {
    const row = div('', 'detail-row');
    if (isWarning) row.style.color = '#d32f2f';
    
    const labelSpan = span('', 'detail-label');
    labelSpan.innerText = label;
    
    const valueSpan = span('', 'detail-value');
    valueSpan.innerText = value;
    
    row.append(labelSpan, valueSpan);
    return row;
}

/**
 * Creates error state in modal body
 */
function _createModalErrorState(modal, message) {
    const errorBody = div('', 'modal-body');
    const errorMessage = span('', 'no-tasks-message');
    errorMessage.innerText = message;
    errorBody.append(errorMessage);
    modal.append(errorBody);
}

/**
 * Sets up close event listeners for modal
 */
function _setupModalCloseEvents(modal, modalBg) {
    const header = modal.querySelector('.modal-header');
    if (header && header.closeBtn) {
        header.closeBtn.addEventListener('click', () => modalBg.remove());
    }
    
    modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) modalBg.remove();
    });
}

// ============================================================================
// Legacy functions below - kept for compatibility, superseded by refactored code
// ============================================================================

async function createMilestoneTimeline(milestones, projectId, statusFilter = '') {
    const timeline = div('', 'milestone-timeline');
    
    // Validate milestones array
    if (!Array.isArray(milestones) || milestones.length === 0) {
        const emptyState = div('', 'empty-milestone-state');
        const emptyIcon = div('', 'empty-state-icon');
        emptyIcon.style.backgroundImage = 'url(/assets/icons/noMilestones.png)';
        const emptyMessage = span('', 'empty-state-message');
        emptyMessage.innerText = 'No milestones available';
        const emptyDescription = span('', 'empty-state-description');
        emptyDescription.innerText = 'Create a milestone to get started';
        emptyState.append(emptyIcon, emptyMessage, emptyDescription);
        timeline.append(emptyState);
        return timeline;
    }
    
    // Process milestones data
    let processedMilestones = milestones.map(m => {
        const dueDate = new Date(m.duedate);
        const today = new Date();
        const isOverdue = dueDate < today && (m.status === 'pending' || m.status === 'not started');
        
        // Map API status to display status
        let displayStatus = m.status;
        if (isOverdue) {
            displayStatus = 'overdue';
        }
        
        return {
            id: m.id || m.milestone_id,
            name: m.milestone_name,
            description: m.milestone_description || '',
            status: displayStatus,
            dueDate: dueDate,
            isOverdue: isOverdue,
            progress: m.milestone_progress || 0
        };
    });
    
    // Filter by status if provided
    if (statusFilter) {
        processedMilestones = processedMilestones.filter(m => 
            m.status === statusFilter || (statusFilter === 'overdue' && m.isOverdue)
        );
    }
    
    // Show empty state if no milestones match filter
    if (processedMilestones.length === 0) {
        const emptyState = div('', 'empty-milestone-state');
        const emptyIcon = div('', 'empty-state-icon');
        emptyIcon.style.backgroundImage = 'url(/assets/icons/noMilestones.png)';
        const emptyMessage = span('', 'empty-state-message');
        emptyMessage.innerText = 'No milestones matching the selected status';
        const emptyDescription = span('', 'empty-state-description');
        emptyDescription.innerText = `Try adjusting your filters`;
        emptyState.append(emptyIcon, emptyMessage, emptyDescription);
        timeline.append(emptyState);
        return timeline;
    }
    
    // Render each milestone
    processedMilestones.forEach((milestone, index) => {
        const step = div('', `milestone-step ${milestone.status}`);
        
        // Step indicator with status icon
        const indicator = div('', 'step-indicator');
        const indicatorIcon = span('', 'indicator-icon');
        
        switch (milestone.status) {
            case 'completed':
                indicatorIcon.innerHTML = '✓';
                indicator.classList.add('completed-indicator');
                break;
            case 'in progress':
                indicatorIcon.innerHTML = '●';
                indicator.classList.add('in-progress-indicator');
                break;
            case 'overdue':
                indicatorIcon.innerHTML = '⚠';
                indicator.classList.add('overdue-indicator');
                break;
            case 'not started':
                indicatorIcon.innerHTML = '○';
                indicator.classList.add('not-started-indicator');
                break;
            default:
                indicatorIcon.innerHTML = '○';
                break;
        }
        
        indicator.append(indicatorIcon);
        
        // Step content
        const content = div('', 'step-content');
        const name = span('', 'milestone-name');
        name.innerText = milestone.name;
        
        const details = span('', 'milestone-details');
        details.innerHTML = `<strong>${dateFormatting(milestone.dueDate, 'date')}</strong>`;
        
        // Add status badge
        const statusBadge = span('', `milestone-status-badge status-${milestone.status.toLowerCase().replace(/\s+/g, '-')}`);
        statusBadge.innerText = milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1);
        details.append(statusBadge);
        
        // Add overdue warning if applicable
        if (milestone.isOverdue) {
            const overdueWarning = span('', 'milestone-overdue-warning');
            overdueWarning.innerText = '⚠ OVERDUE';
            details.append(overdueWarning);
        }
        
        // Add progress if available
        if (milestone.progress > 0) {
            const progressDisplay = span('', 'milestone-progress-display');
            progressDisplay.innerText = `${Math.round(milestone.progress)}% complete`;
            details.append(progressDisplay);
        }
        
        content.append(name, details);
        
        // Add description if available
        if (milestone.description) {
            const descriptionText = span('', 'milestone-description');
            descriptionText.innerText = milestone.description;
            content.append(descriptionText);
        }
        
        step.append(indicator, content);
        
        // Make milestone clickable for details
        step.style.cursor = 'pointer';
        step.addEventListener('click', async () => {
            await showMilestoneDetailsModal(milestone, projectId);
        });
        
        timeline.append(step);
        
        // Add connecting line between steps
        if (index < processedMilestones.length - 1) {
            const connector = div('', 'milestone-connector');
            timeline.append(connector);
        }
    });
    
    return timeline;
}

async function renderTaskAnalytics(projectId = null, dateRange = 'this-month') {
    const container = div('', 'task-analytics-container');
    
    // Task distribution chart
    const chartSection = div('', 'task-chart-section');
    const chartTitle = span('', 'section-subtitle');
    chartTitle.innerText = 'Task Distribution by Status';
    
    const taskStats = {
        completed: 45,
        inProgress: 28,
        pending: 32,
        overdue: 8
    };
    
    const chartContainer = div('', 'task-distribution-chart');
    const pieChart = createTaskPieChart(taskStats);
    chartContainer.append(pieChart);
    
    chartSection.append(chartTitle, chartContainer);
    container.append(chartSection);
    
    // Task summary cards
    const summarySection = div('', 'task-summary-section');
    const summaryTitle = span('', 'section-subtitle');
    summaryTitle.innerText = 'Task Summary';
    
    const summaryCards = div('', 'task-summary-grid');
    
    const summaryMetrics = [
        { label: 'Total Tasks', value: Object.values(taskStats).reduce((a, b) => a + b, 0), color: '#1976d2' },
        { label: 'Completed', value: taskStats.completed, color: '#388e3c' },
        { label: 'In Progress', value: taskStats.inProgress, color: '#f57c00' },
        { label: 'Overdue', value: taskStats.overdue, color: '#d32f2f' }
    ];
    
    summaryMetrics.forEach(metric => {
        const card = div('', 'task-summary-card');
        const metricLabel = span('', 'task-metric-label');
        metricLabel.innerText = metric.label;
        const metricValue = span('', 'task-metric-value');
        metricValue.innerText = metric.value.toString();
        metricValue.style.color = metric.color;
        card.append(metricLabel, metricValue);
        summaryCards.append(card);
    });
    
    summarySection.append(summaryTitle, summaryCards);
    container.append(summarySection);
    
    // Grouped tasks list
    const tasksSection = div('', 'tasks-list-section');
    const tasksTitle = span('', 'section-subtitle');
    tasksTitle.innerText = 'Tasks by Status';
    tasksSection.append(tasksTitle);
    
    const statusGroups = [
        { status: 'completed', label: 'Completed', color: '#388e3c' },
        { status: 'in-progress', label: 'In Progress', color: '#f57c00' },
        { status: 'pending', label: 'Pending', color: '#1976d2' },
        { status: 'overdue', label: 'Overdue', color: '#d32f2f' }
    ];
    
    // Sample tasks
    const sampleTasks = [
        { id: 1, name: 'Site Inspection', status: 'completed', assignee: 'John Smith', category: 'Inspection', priority: 'High', startDate: new Date(2026, 0, 5), dueDate: new Date(2026, 0, 10), completedDate: new Date(2026, 0, 9), description: 'Complete site inspection and safety assessment' },
        { id: 2, name: 'Material Procurement', status: 'completed', assignee: 'Jane Doe', category: 'Procurement', priority: 'Medium', startDate: new Date(2026, 0, 6), dueDate: new Date(2026, 0, 12), completedDate: new Date(2026, 0, 11), description: 'Order and receive all necessary construction materials' },
        { id: 3, name: 'Foundation Laying', status: 'in-progress', assignee: 'Mike Johnson', category: 'Construction', priority: 'High', startDate: new Date(2026, 0, 10), dueDate: new Date(2026, 0, 20), description: 'Excavate and pour foundation concrete' },
        { id: 4, name: 'Framing Work', status: 'in-progress', assignee: 'Sarah Williams', category: 'Construction', priority: 'High', startDate: new Date(2026, 0, 12), dueDate: new Date(2026, 0, 25), description: 'Frame walls and install structural supports' },
        { id: 5, name: 'Electrical Installation', status: 'pending', assignee: 'Tom Brown', category: 'Installation', priority: 'Medium', startDate: new Date(2026, 0, 20), dueDate: new Date(2026, 1, 5), description: 'Install electrical wiring and fixtures' },
        { id: 6, name: 'Plumbing Installation', status: 'pending', assignee: 'Lisa Anderson', category: 'Installation', priority: 'Medium', startDate: new Date(2026, 0, 22), dueDate: new Date(2026, 1, 8), description: 'Install plumbing pipes and water systems' },
        { id: 7, name: 'Concrete Pouring', status: 'overdue', assignee: 'Robert Davis', category: 'Construction', priority: 'Critical', startDate: new Date(2026, 0, 1), dueDate: new Date(2026, 0, 8), description: 'Pour concrete for second floor slab' },
        { id: 8, name: 'Safety Inspection', status: 'overdue', assignee: 'Jennifer Wilson', category: 'Inspection', priority: 'Critical', startDate: new Date(2026, 0, 5), dueDate: new Date(2026, 0, 12), description: 'Complete safety compliance inspection' }
    ];
    
    statusGroups.forEach(group => {
        const groupTasks = sampleTasks.filter(t => t.status === group.status);
        if (groupTasks.length === 0) return;
        
        const groupContainer = div('', 'task-status-group');
        const groupHeader = div('', 'task-group-header');
        const groupLabel = span('', 'task-group-label');
        groupLabel.innerText = `${group.label} (${groupTasks.length})`;
        groupLabel.style.color = group.color;
        groupHeader.append(groupLabel);
        groupContainer.append(groupHeader);
        
        const tasksList = div('', 'task-items-list');
        groupTasks.forEach(task => {
            const taskItem = createTaskItem(task, group.color);
            tasksList.append(taskItem);
        });
        
        groupContainer.append(tasksList);
        tasksSection.append(groupContainer);
    });
    
    container.append(tasksSection);
    
    return container;
}

function createTaskItem(task, statusColor) {
    const item = div('', 'task-item');
    
    const indicator = div('', 'task-status-indicator');
    indicator.style.backgroundColor = statusColor;
    
    const content = div('', 'task-item-content');
    
    const name = span('', 'task-item-name');
    name.innerText = task.name;
    
    const assignee = span('', 'task-item-assignee');
    assignee.innerText = task.assignee;
    
    content.append(name, assignee);
    
    item.append(indicator, content);
    
    // Make clickable
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
        showTaskDetailsModal(task);
    });
    
    return item;
}

function createTaskPieChart(taskStats) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('width', '150');
    svg.setAttribute('height', '150');
    
    const total = Object.values(taskStats).reduce((a, b) => a + b, 0);
    const colors = ['#388e3c', '#f57c00', '#1976d2', '#d32f2f'];
    const labels = Object.keys(taskStats);
    
    let currentAngle = 0;
    
    labels.forEach((label, index) => {
        const value = taskStats[label];
        const sliceAngle = (value / total) * 360;
        
        // Create pie slice
        const startAngle = (currentAngle - 90) * (Math.PI / 180);
        const endAngle = ((currentAngle + sliceAngle) - 90) * (Math.PI / 180);
        
        const x1 = 100 + 80 * Math.cos(startAngle);
        const y1 = 100 + 80 * Math.sin(startAngle);
        const x2 = 100 + 80 * Math.cos(endAngle);
        const y2 = 100 + 80 * Math.sin(endAngle);
        
        const largeArc = sliceAngle > 180 ? 1 : 0;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`);
        path.setAttribute('fill', colors[index]);
        path.setAttribute('stroke', '#fff');
        path.setAttribute('stroke-width', '2');
        
        svg.append(path);
        
        currentAngle += sliceAngle;
    });
    
    return svg;
}

/**
 * Shows comprehensive project details modal with milestones, tasks, and statistics
 * Clean table-based layout matching the waste & damage modal style
 */
async function showProjectDetailsModal(project) {
    try {
        // Fetch related data
        const milestones = await fetchData(`/api/milestones/${project.project_id}`);
        const milestonesData = milestones !== 'error' && Array.isArray(milestones) ? milestones : [];
        
        // Calculate project statistics
        const totalMilestones = milestonesData.length;
        const completedMilestones = milestonesData.filter(m => m.status === 'completed').length;
        const inProgressMilestones = milestonesData.filter(m => m.status === 'in progress').length;
        const overdueMilestones = milestonesData.filter(m => {
            const dueDate = new Date(m.duedate);
            const today = new Date();
            return dueDate < today && m.status !== 'completed';
        }).length;
        
        const completionPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
        const daysRemaining = calculateDaysRemaining(project.duedate);
        const status = getProjectStatus(project);
        
        // Create modal background
        const modalBg = div('', 'modal-overlay');
        const modal = div('', 'modal-container project-info-modal');
        
        // HEADER
        const header = div('', 'modal-header-simple');
        const titleEl = span('', 'modal-title-simple');
        titleEl.innerText = project.project_name;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-button-simple';
        closeBtn.innerHTML = '×';
        closeBtn.setAttribute('aria-label', 'Close modal');
        
        header.append(titleEl, closeBtn);
        modal.append(header);
        
        // PROJECT INFORMATION SECTION
        const infoContainer = div('', 'modal-table-container');
        const infoTable = document.createElement('table');
        infoTable.className = 'modal-info-table';
        
        // Table header
        const infoThead = document.createElement('thead');
        const infoHeaderRow = document.createElement('tr');
        const infoHeaders = ['Project Information', 'Details', 'Status'];
        
        infoHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.innerText = headerText;
            infoHeaderRow.append(th);
        });
        
        infoThead.append(infoHeaderRow);
        infoTable.append(infoThead);
        
        // Table body with project details
        const infoTbody = document.createElement('tbody');
        
        const projectInfo = [
            {
                label: 'Project ID',
                value: `#${project.project_id}`,
                status: status
            },
            {
                label: 'Location',
                value: project.project_location || 'Not specified',
                status: daysRemaining > 0 ? 'Active' : 'Overdue'
            },
            {
                label: 'Start Date',
                value: dateFormatting(project.start_date || project.created_at || new Date(), 'date'),
                status: 'Commenced'
            },
            {
                label: 'Target End Date',
                value: dateFormatting(project.duedate || new Date(), 'date'),
                status: daysRemaining > 0 ? `${daysRemaining} days left` : `${Math.abs(daysRemaining)} days overdue`
            },
            {
                label: 'Project Duration',
                value: calculateProjectDuration(project.start_date || project.created_at, project.duedate),
                status: completionPercent >= 75 ? 'On Schedule' : 'Monitor'
            },
            {
                label: 'Total Personnel',
                value: (project.total_personnel || 0).toString(),
                status: project.total_personnel > 0 ? 'Assigned' : 'None'
            },
            {
                label: 'Overall Progress',
                value: `${completionPercent}%`,
                status: `${completedMilestones}/${totalMilestones} milestones`
            },
            {
                label: 'Overdue Tasks',
                value: (project.overdue_tasks_count || 0).toString(),
                status: project.overdue_tasks_count > 0 ? 'Action Required' : 'All Clear'
            }
        ];
        
        projectInfo.forEach(info => {
            const row = document.createElement('tr');
            
            const labelCell = document.createElement('td');
            labelCell.innerText = info.label;
            labelCell.style.fontWeight = '500';
            
            const valueCell = document.createElement('td');
            valueCell.innerText = info.value;
            
            const statusCell = document.createElement('td');
            statusCell.innerText = info.status;
            
            row.append(labelCell, valueCell, statusCell);
            infoTbody.append(row);
        });
        
        infoTable.append(infoTbody);
        infoContainer.append(infoTable);
        modal.append(infoContainer);
        
        // MILESTONES TABLE (if available)
        if (milestonesData.length > 0) {
            const milestonesTableContainer = div('', 'modal-table-container');
            milestonesTableContainer.style.marginTop = '24px';
            
            const milestonesTitle = div('', 'modal-section-subtitle');
            milestonesTitle.innerText = 'PROJECT MILESTONES';
            milestonesTableContainer.append(milestonesTitle);
            
            const milestonesTable = document.createElement('table');
            milestonesTable.className = 'modal-info-table';
            
            const mThead = document.createElement('thead');
            const mHeaderRow = document.createElement('tr');
            const mHeaders = ['Milestone Name', 'Status', 'Due Date', 'Progress'];
            
            mHeaders.forEach(headerText => {
                const th = document.createElement('th');
                th.innerText = headerText;
                mHeaderRow.append(th);
            });
            
            mThead.append(mHeaderRow);
            milestonesTable.append(mThead);
            
            const mTbody = document.createElement('tbody');
            
            milestonesData.slice(0, 8).forEach(milestone => {
                const row = document.createElement('tr');
                row.style.cursor = 'pointer';
                row.classList.add('clickable-milestone-row');
                
                const nameCell = document.createElement('td');
                nameCell.innerText = milestone.milestone_name;
                nameCell.style.fontWeight = '500';
                
                const statusCell = document.createElement('td');
                const statusText = (milestone.status || 'pending').charAt(0).toUpperCase() + (milestone.status || 'pending').slice(1);
                statusCell.innerText = statusText;
                
                // Add color coding for status
                if (milestone.status === 'completed') {
                    statusCell.style.color = '#2e7d32';
                    statusCell.style.fontWeight = '600';
                } else if (milestone.status === 'in progress') {
                    statusCell.style.color = '#1976d2';
                    statusCell.style.fontWeight = '600';
                }
                
                const dateCell = document.createElement('td');
                dateCell.innerText = dateFormatting(new Date(milestone.duedate), 'date');
                
                const progressCell = document.createElement('td');
                const milestoneDate = new Date(milestone.duedate);
                const today = new Date();
                const isOverdue = milestoneDate < today && milestone.status !== 'completed';
                
                if (isOverdue) {
                    progressCell.innerText = '⚠️ Overdue';
                    progressCell.style.color = '#d32f2f';
                    progressCell.style.fontWeight = '600';
                } else if (milestone.status === 'completed') {
                    progressCell.innerText = '✓ Completed';
                    progressCell.style.color = '#2e7d32';
                } else {
                    const daysLeft = calculateDaysRemaining(milestone.duedate);
                    progressCell.innerText = daysLeft > 0 ? `${daysLeft} days left` : 'Due today';
                }
                
                row.append(nameCell, statusCell, dateCell, progressCell);
                
                // Make milestone row clickable
                row.addEventListener('click', async () => {
                    modalBg.remove();
                    const processedMilestone = {
                        id: milestone.milestone_id || milestone.id,
                        name: milestone.milestone_name,
                        description: milestone.milestone_description || '',
                        status: milestone.status,
                        dueDate: new Date(milestone.duedate),
                        isOverdue: isOverdue,
                        progress: milestone.milestone_progress || 0
                    };
                    await showMilestoneDetailsModal(processedMilestone, project.project_id);
                });
                
                mTbody.append(row);
            });
            
            milestonesTable.append(mTbody);
            milestonesTableContainer.append(milestonesTable);
            
            // Show count if more milestones exist
            if (milestonesData.length > 8) {
                const moreText = span('', 'modal-more-items-text');
                moreText.innerText = `+ ${milestonesData.length - 8} more milestone${milestonesData.length - 8 !== 1 ? 's' : ''}`;
                milestonesTableContainer.append(moreText);
            }
            
            modal.append(milestonesTableContainer);
        }
        
        // SUMMARY SECTION
        const summarySection = div('', 'modal-summary-section');
        const summaryTitle = div('', 'modal-summary-title');
        summaryTitle.innerText = 'PROJECT SUMMARY';
        summarySection.append(summaryTitle);
        
        const summaryGrid = div('', 'modal-summary-grid');
        
        const summaryItems = [
            { label: 'Total Milestones:', value: totalMilestones },
            { label: 'Completed:', value: completedMilestones },
            { label: 'In Progress:', value: inProgressMilestones },
            { label: 'Overdue:', value: overdueMilestones }
        ];
        
        summaryItems.forEach(item => {
            const itemEl = div('', 'modal-summary-item');
            const label = span('', 'summary-label');
            label.innerText = item.label;
            const value = span('', 'summary-value');
            value.innerText = item.value;
            itemEl.append(label, value);
            summaryGrid.append(itemEl);
        });
        
        summarySection.append(summaryGrid);
        modal.append(summarySection);
        
        modalBg.append(modal);
        
        // Event handlers
        closeBtn.addEventListener('click', () => {
            modalBg.classList.add('modal-fade-out');
            setTimeout(() => modalBg.remove(), 300);
        });
        
        modalBg.addEventListener('click', (e) => {
            if (e.target === modalBg) {
                modalBg.classList.add('modal-fade-out');
                setTimeout(() => modalBg.remove(), 300);
            }
        });
        
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                modalBg.classList.add('modal-fade-out');
                setTimeout(() => modalBg.remove(), 300);
                document.removeEventListener('keydown', escHandler);
            }
        });
        
        document.body.append(modalBg);
        requestAnimationFrame(() => modalBg.classList.add('modal-fade-in'));
        
    } catch (error) {
        console.error('Error showing project details:', error);
        alertPopup('Unable to load project details', warnType.bad);
    }
}

/**
 * Legacy wrapper - redirects to refactored modal function
 * @deprecated Use showMilestoneDetailsModalRefactored for new code
 */
async function showMilestoneDetailsModal(milestone, projectId) {
    return await showMilestoneDetailsModalRefactored(milestone, projectId);
}

/**
 * Shows task details modal with comprehensive information
 * Matches the project modal style for consistency
 */
function showTaskDetailsModal(task) {
    // Create modal background
    const modalBg = div('', 'modal-overlay');
    const modal = div('', 'modal-container project-info-modal');
    
    // HEADER
    const header = div('', 'modal-header-simple');
    const titleEl = span('', 'modal-title-simple');
    titleEl.innerText = task.name;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-button-simple';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close modal');
    
    header.append(titleEl, closeBtn);
    modal.append(header);
    
    // TASK INFORMATION SECTION
    const infoContainer = div('', 'modal-table-container');
    const infoTable = document.createElement('table');
    infoTable.className = 'modal-info-table';
    
    // Table header
    const infoThead = document.createElement('thead');
    const infoHeaderRow = document.createElement('tr');
    const infoHeaders = ['Task Information', 'Details', 'Status'];
    
    infoHeaders.forEach(headerText => {
        const th = document.createElement('th');
        th.innerText = headerText;
        infoHeaderRow.append(th);
    });
    
    infoThead.append(infoHeaderRow);
    infoTable.append(infoThead);
    
    // Calculate task duration and days info
    const today = new Date();
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const startDate = task.startDate ? new Date(task.startDate) : null;
    const completedDate = task.completedDate ? new Date(task.completedDate) : null;
    
    let daysRemaining = 0;
    let statusText = task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ');
    
    if (task.status === 'completed') {
        statusText = completedDate ? `Completed on ${dateFormatting(completedDate, 'date')}` : 'Completed';
    } else if (dueDate) {
        daysRemaining = calculateDaysRemaining(dueDate);
        if (daysRemaining < 0) {
            statusText = `${Math.abs(daysRemaining)} days overdue`;
        } else if (daysRemaining === 0) {
            statusText = 'Due today';
        } else {
            statusText = `${daysRemaining} days remaining`;
        }
    }
    
    const duration = startDate && dueDate ? calculateProjectDuration(startDate, dueDate) : 'N/A';
    
    // Table body with task details
    const infoTbody = document.createElement('tbody');
    
    const taskInfo = [
        {
            label: 'Task ID',
            value: `#${task.id}`,
            status: task.priority || 'Normal'
        },
        {
            label: 'Category',
            value: task.category || 'General',
            status: task.status === 'overdue' ? '⚠️ Overdue' : statusText
        },
        {
            label: 'Assigned To',
            value: task.assignee,
            status: task.status === 'in-progress' ? 'Working' : (task.status === 'completed' ? 'Completed' : 'Assigned')
        },
        {
            label: 'Priority Level',
            value: task.priority || 'Normal',
            status: task.priority === 'Critical' ? '🔴 Critical' : (task.priority === 'High' ? '🟠 High' : '🟢 Normal')
        },
        {
            label: 'Start Date',
            value: startDate ? dateFormatting(startDate, 'date') : 'Not set',
            status: startDate ? 'Commenced' : 'Pending'
        },
        {
            label: 'Due Date',
            value: dueDate ? dateFormatting(dueDate, 'date') : 'Not set',
            status: daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : (daysRemaining > 0 ? `${daysRemaining} days left` : 'Due today')
        },
        {
            label: 'Task Duration',
            value: duration,
            status: task.status === 'completed' ? 'Finished' : 'In Timeline'
        }
    ];
    
    // Add completion date if task is completed
    if (task.status === 'completed' && completedDate) {
        taskInfo.push({
            label: 'Completed Date',
            value: dateFormatting(completedDate, 'date'),
            status: '✓ Done'
        });
    }
    
    taskInfo.forEach(info => {
        const row = document.createElement('tr');
        
        const labelCell = document.createElement('td');
        labelCell.innerText = info.label;
        labelCell.style.fontWeight = '500';
        
        const valueCell = document.createElement('td');
        valueCell.innerText = info.value;
        
        const statusCell = document.createElement('td');
        statusCell.innerText = info.status;
        
        // Color coding for specific fields
        if (info.label === 'Priority Level') {
            if (task.priority === 'Critical') {
                statusCell.style.color = '#d32f2f';
                statusCell.style.fontWeight = '600';
            } else if (task.priority === 'High') {
                statusCell.style.color = '#f57c00';
                statusCell.style.fontWeight = '600';
            }
        }
        
        if (info.label === 'Due Date' && daysRemaining < 0) {
            statusCell.style.color = '#d32f2f';
            statusCell.style.fontWeight = '600';
        }
        
        row.append(labelCell, valueCell, statusCell);
        infoTbody.append(row);
    });
    
    infoTable.append(infoTbody);
    infoContainer.append(infoTable);
    modal.append(infoContainer);
    
    // TASK DESCRIPTION SECTION (if available)
    if (task.description) {
        const descContainer = div('', 'modal-table-container');
        descContainer.style.marginTop = '24px';
        
        const descTitle = div('', 'modal-section-subtitle');
        descTitle.innerText = 'TASK DESCRIPTION';
        descContainer.append(descTitle);
        
        const descContent = div('', 'task-description-content');
        descContent.innerText = task.description;
        descContainer.append(descContent);
        
        modal.append(descContainer);
    }
    
    // SUMMARY SECTION
    const summarySection = div('', 'modal-summary-section');
    const summaryTitle = div('', 'modal-summary-title');
    summaryTitle.innerText = 'TASK SUMMARY';
    summarySection.append(summaryTitle);
    
    const summaryGrid = div('', 'modal-summary-grid');
    
    const summaryItems = [
        { label: 'Status:', value: task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ') },
        { label: 'Assignee:', value: task.assignee },
        { label: 'Priority:', value: task.priority || 'Normal' },
        { label: 'Category:', value: task.category || 'General' }
    ];
    
    summaryItems.forEach(item => {
        const itemEl = div('', 'modal-summary-item');
        const label = span('', 'summary-label');
        label.innerText = item.label;
        const value = span('', 'summary-value');
        value.innerText = item.value;
        itemEl.append(label, value);
        summaryGrid.append(itemEl);
    });
    
    summarySection.append(summaryGrid);
    modal.append(summarySection);
    
    modalBg.append(modal);
    
    // Event handlers
    closeBtn.addEventListener('click', () => {
        modalBg.classList.add('modal-fade-out');
        setTimeout(() => modalBg.remove(), 300);
    });
    
    modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) {
            modalBg.classList.add('modal-fade-out');
            setTimeout(() => modalBg.remove(), 300);
        }
    });
    
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modalBg.classList.add('modal-fade-out');
            setTimeout(() => modalBg.remove(), 300);
            document.removeEventListener('keydown', escHandler);
        }
    });
    
    document.body.append(modalBg);
    requestAnimationFrame(() => modalBg.classList.add('modal-fade-in'));
}
