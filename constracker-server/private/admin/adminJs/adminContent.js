// adminContent.js - Top of file
import { fetchData } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";

// Ensure createSectionTabs is HERE
import { 
    createFilterContainer, 
    createButton, 
    createPaginationControls, 
    div, 
    span, 
    createInput, 
    createFilterInput,
    createSectionTabs 
} from "/js/components.js";

// Ensure it is NOT here
import { 
    createMilestoneOl, 
    milestoneFullOl, 
    showLogDetailsOverlay, 
    createOverlayWithBg, 
    hideOverlayWithBg, 
    showDeleteConfirmation 
} from "/mainJs/overlays.js";

const defaultImageBackgroundColors = [
    '#B388EB', '#FFD180', '#80CBC4', '#E1BEE7', '#C5E1A5',
    '#F48FB1', '#81D4FA', '#FFF59D', '#A7FFEB', '#FFAB91'
];

function createMaterialCard(material, role, currentUserId, refreshMaterialsContentFn) {
    const card = div(`material-card-${material.item_id}`, 'material-card');

    const imageUrl = material.image_url && material.image_url !== 'constrackerWhite.svg'
        ? `/image/${material.image_url}`
        : `/assets/pictures/constrackerWhite.svg`;

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
        const approveBtn = createButton('approveMaterialBtn', 'solid-buttons', 'Approve', 'approveBtnText', 'checkWhite.png');
        approveBtn.addEventListener('click', async () => {
            const response = await fetch(`/api/materials/${material.item_id}/approve`, { method: 'PUT' });
            if (response.ok) {
                alertPopup('success', `${material.item_name} approved successfully!`);
                refreshMaterialsContentFn();
            } else {
                alertPopup('error', `Failed to approve ${material.item_name}.`);
            }
        });
        actionsContainer.append(approveBtn);
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
        const editBtn = createButton('editMaterialBtn', 'solid-buttons', 'Edit', 'editBtnText', 'editWhite.png');
        editBtn.addEventListener('click', () => createMaterialOverlay(material, refreshMaterialsContentFn));
        actionsContainer.append(editBtn);
    }

    if (role === 'admin' || role === 'engineer') {
        const deleteBtn = createButton('deleteMaterialBtn', 'icon-buttons', '', 'deleteBtnText', 'deleteRed.png');
        deleteBtn.addEventListener('click', () => {
            showDeleteConfirmation(material.item_name, async () => {
                const response = await fetch(`/api/materials/${material.item_id}`, { method: 'DELETE' });
                if (response.ok) {
                    alertPopup('success', `${material.item_name} deleted successfully!`);
                    refreshMaterialsContentFn();
                } else {
                    alertPopup('error', `Failed to delete ${material.item_name}.`);
                }
            });
        });
        actionsContainer.append(deleteBtn);
    }
    
    statusActions.append(actionsContainer);
    infoContainer.append(titleStatusContainer, detailsContainer, price, statusActions);
    card.append(imageContainer, infoContainer);
    return card;
}

async function createMaterialOverlay(material = null, refreshMaterialsContentFn) {
    const isEditMode = material !== null;
    const overlayTitle = isEditMode ? `Edit Material: ${material.item_name}` : 'Add New Material';

    const categories = await fetchData('/api/materials/categories');
    const suppliers = await fetchData('/api/materials/suppliers');
    const units = await fetchData('/api/materials/units');

    if (categories === 'error' || suppliers === 'error' || units === 'error') {
        return alertPopup('error', 'Failed to load material data for form.');
    }

    const form = document.createElement('form');
    form.id = 'materialForm';
    form.classList.add('overlay-form');

    const materialNameInput = createInput('text', isEditMode ? 'edit' : 'default', 'Material Name', 'materialName', 'item_name', material?.item_name || '', 'Enter material name', null, 255);
    const materialDescriptionInput = createInput('textarea', isEditMode ? 'edit' : 'default', 'Description', 'materialDescription', 'item_description', material?.item_description || '', 'Enter description', null, 255);
    const materialPriceInput = createInput('text', isEditMode ? 'edit' : 'default', 'Base Price (₱)', 'materialPrice', 'price', material?.price || '', '0.00', 0.01, 99999999.99, 'decimal', 'Minimum 0.01');
    const materialSizeInput = createInput('text', isEditMode ? 'edit' : 'default', 'Size', 'materialSize', 'size', material?.size || '', 'e.g., 2x4, 1/2 inch', null, 255);
    const materialImageUrlInput = createInput('text', isEditMode ? 'edit' : 'default', 'Image URL', 'materialImageUrl', 'image_url', material?.image_url || 'constrackerWhite.svg', 'e.g., constrackerWhite.svg', null, 255);

    // Category Select
    const categorySelectContainer = div('categorySelectContainer', 'input-box-containers');
    const categoryLabel = document.createElement('label');
    categoryLabel.htmlFor = 'materialCategorySelect';
    categoryLabel.classList.add('input-labels');
    categoryLabel.innerText = 'Category';
    const categorySelect = createFilterInput('select', 'dropdown', 'materialCategorySelect', 'category_id', material?.category_id || '', '', '', 'single', 1, categories);
    if (isEditMode && material?.category_id) {
        const selectedCategory = categories.find(cat => cat.id === material.category_id);
        if (selectedCategory) {
            categorySelect.querySelector('.select-option-dropdowns .selectOptionText').innerText = selectedCategory.name;
            categorySelect.dataset.value = material.category_id;
        }
    } else {
        categorySelect.querySelector('.select-option-dropdowns .selectOptionText').innerText = 'Select a category';
    }
    categorySelectContainer.append(categoryLabel, categorySelect);

    // Supplier Select
    const supplierSelectContainer = div('supplierSelectContainer', 'input-box-containers');
    const supplierLabel = document.createElement('label');
    supplierLabel.htmlFor = 'materialSupplierSelect';
    supplierLabel.classList.add('input-labels');
    supplierLabel.innerText = 'Supplier';
    const supplierSelect = createFilterInput('select', 'dropdown', 'materialSupplierSelect', 'supplier_id', material?.supplier_id || '', '', '', 'single', 1, suppliers);
    if (isEditMode && material?.supplier_id) {
        const selectedSupplier = suppliers.find(sup => sup.id === material.supplier_id);
        if (selectedSupplier) {
            supplierSelect.querySelector('.select-option-dropdowns .selectOptionText').innerText = selectedSupplier.name;
            supplierSelect.dataset.value = material.supplier_id;
        }
    } else {
        supplierSelect.querySelector('.select-option-dropdowns .selectOptionText').innerText = 'Select a supplier';
    }
    supplierSelectContainer.append(supplierLabel, supplierSelect);

    // Unit Select
    const unitSelectContainer = div('unitSelectContainer', 'input-box-containers');
    const unitLabel = document.createElement('label');
    unitLabel.htmlFor = 'materialUnitSelect';
    unitLabel.classList.add('input-labels');
    unitLabel.innerText = 'Unit';
    const unitSelect = createFilterInput('select', 'dropdown', 'materialUnitSelect', 'unit_id', material?.unit_id || '', '', '', 'single', 1, units);
    if (isEditMode && material?.unit_id) {
        const selectedUnit = units.find(u => u.id === material.unit_id);
        if (selectedUnit) {
            unitSelect.querySelector('.select-option-dropdowns .selectOptionText').innerText = selectedUnit.name;
            unitSelect.dataset.value = material.unit_id;
        }
    } else {
        unitSelect.querySelector('.select-option-dropdowns .selectOptionText').innerText = 'Select a unit';
    }
    unitSelectContainer.append(unitLabel, unitSelect);


    form.append(
        materialNameInput,
        materialDescriptionInput,
        materialPriceInput,
        materialSizeInput,
        materialImageUrlInput,
        categorySelectContainer,
        supplierSelectContainer,
        unitSelectContainer
    );

    const actionButtonsContainer = div('materialActionButtons', 'action-buttons-container');
    const saveButton = createButton('saveMaterialBtn', 'solid-buttons', 'Save', 'saveBtnText');
    const cancelButton = createButton('cancelMaterialBtn', 'solid-buttons', 'Cancel', 'cancelBtnText');

    cancelButton.addEventListener('click', () => {
        hideOverlayWithBg();
    });

    saveButton.addEventListener('click', async () => {
        const payload = {
            item_name: materialNameInput.querySelector('input').value,
            item_description: materialDescriptionInput.querySelector('textarea').value,
            price: parseFloat(materialPriceInput.querySelector('input').value),
            size: materialSizeInput.querySelector('input').value,
            image_url: materialImageUrlInput.querySelector('input').value,
            category_id: parseInt(categorySelect.dataset.value),
            supplier_id: parseInt(supplierSelect.dataset.value),
            unit_id: parseInt(unitSelect.dataset.value)
        };

        if (!payload.item_name || isNaN(payload.price) || payload.price <= 0 || !payload.category_id || !payload.supplier_id || !payload.unit_id) {
            return alertPopup('error', 'Please fill in all required fields correctly (ensure price is a positive number).');
        }

        let response;
        if (isEditMode) {
            response = await fetch(`/api/materials/${material.item_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch('/api/materials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (response.ok) {
            alertPopup('success', isEditMode ? 'Material updated successfully!' : 'Material added successfully, awaiting approval!');
            hideOverlayWithBg();
            refreshMaterialsContentFn();
        } else {
            const errorData = await response.json();
            alertPopup('error', errorData.message || 'Failed to save material.');
        }
    });

    actionButtonsContainer.append(cancelButton, saveButton);

    const { overlay, overlayBody } = createOverlayWithBg(overlayTitle, form, actionButtonsContainer);
    overlayBody.append(form, actionButtonsContainer);

    showOverlayWithBg(overlay);
}

async function generateMaterialsContent(role) {
    const materialsBodyContent = document.getElementById('materialsBodyContainer'); // Assuming a div with this ID in the HTML
    materialsBodyContent.innerHTML = ''; // Clear existing content

    const materialsContainer = div('materials-main-container');
    const headerContainer = div('materials-header-container');
    const filterContainer = div('materials-filter-container');
    const materialsListContainer = div('materials-list-container');
    const paginationContainer = div('materialsPaginationContainer', 'pagination-container');
    
    const user = await fetchData('/profile');
    if (user === 'error') {
        return alertPopup('error', 'Could not fetch user profile. Please reload the page.');
    }
    const currentUserId = user.user_id;

    // Add Material Button (Admin, PM, Engineer, Foreman)
    const allowedRolesForAdd = ['admin', 'engineer', 'project manager', 'foreman'];
    if (allowedRolesForAdd.includes(role)) {
        const addMaterialBtn = createButton('addMaterialBtn', 'solid-buttons', 'Add Material', 'addMaterialBtnText', 'addWhite.png');
        addMaterialBtn.addEventListener('click', () => {
            createMaterialOverlay(null, () => renderMaterials(new URLSearchParams(), role, currentUserId));
        });
        headerContainer.append(addMaterialBtn);
    }

    headerContainer.append(filterContainer);
    materialsContainer.append(headerContainer, materialsListContainer, paginationContainer);
    materialsBodyContent.append(materialsContainer);

    let currentPage = 1;
    let itemsPerPage = 10;
    
    async function renderMaterials(urlParams = new URLSearchParams(), currentRole, currentUserId) {
        materialsListContainer.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);

        const data = await fetchData(`/api/materials?${urlParams.toString()}`);
        materialsListContainer.innerHTML = '';
        
        if (data === 'error' || data.length === 0) {
            showEmptyPlaceholder('/assets/icons/materials.png', materialsListContainer, null, "No materials found.");
            return;
        }

        data.forEach(material => {
            materialsListContainer.append(createMaterialCard(material, currentRole, currentUserId, () => renderMaterials(urlParams, currentRole, currentUserId)));
        });
    }

    async function applyFilterToMaterials(filteredUrlParams) {
        currentPage = 1;
        await renderMaterials(filteredUrlParams, role, currentUserId);
    }

    const filters = await createFilterContainer(
        applyFilterToMaterials,
        'Search by material name...', 
        { name: true, sort: true, category: true },
        'itemName',
        'atoz'
    );
    
    filterContainer.append(filters);

    await renderMaterials(new URLSearchParams(), role, currentUserId); // Initial render
}


async function generateLogsContent() {
    const data = await fetchData('/api/logs?page=1&limit=10');
    
    // Safety Check:
    if (!data || data === 'error' || !data.logs) {
        console.error("Logs data is missing or malformed");
        return div('error-msg', 'Could not load logs.');
    }

    // Now it is safe to check length
    if (data.logs.length === 0) {
    const logsBodyContent = document.getElementById('logsBodyContent');
    logsBodyContent.innerHTML = ''; // Clear existing content

    const logsContainer = div('logs-main-container');
    const filterContainer = div('logs-filter-container');
    const scrollableLogListWrapper = div('scrollable-log-list-wrapper'); // New wrapper for scrolling
    const logListContainer = div('logs-list-container');
    const paginationContainer = div('paginationContainer', 'pagination-container');
    
    scrollableLogListWrapper.append(logListContainer); // logListContainer goes inside the wrapper
    logsContainer.append(filterContainer, scrollableLogListWrapper, paginationContainer); // Append filter and wrapper
    logsBodyContent.append(logsContainer);

    let currentPage = 1;
    let itemsPerPage = 10;
    
    function createLogCard(logData) {
        const logCard = div('', 'log-cards');
        const logCardHeader = div('', 'log-card-headers');
        const logProjectName = span('', 'log-project-names');
        logProjectName.innerText = logData.project_name;
        const logDate = span('', 'log-dates');
        logDate.innerText = dateFormatting(logData.created_at, 'date');
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
        logCardName.innerText = `${logData.full_name} ${logData.log_name}`;

        const logCardFooter = div('', 'log-card-footers');
        const logDetailsBtn = createButton('logDetailsBtn', 'solid-buttons', 'Details', 'logDetailsText', '', () => {});
        const logDetailsIcon  = span('logDetailsIcon', 'btn-icons');
        
        const clickableActions = ['edit', 'requests', 'approved', 'declined'];
        if (clickableActions.includes(logData.action)) {
            logDetailsBtn.style.cursor = 'pointer';
            logDetailsBtn.addEventListener('click', () => showLogDetailsOverlay(logData.log_id));
        } else {
            logDetailsBtn.style.display = 'none';
        }
    
        logDetailsBtn.append(logDetailsIcon);
        logCardFooter.append(logDetailsBtn);
        logCardBody.append(logCardIcon, logCardName);
        logCardHeader.append(logData.project_id !== 0 ? logProjectName : '', logDate);
        logCard.append(logCardHeader,logCardBody, logCardFooter);
        return logCard;
    }

    async function renderLogs(urlParams = new URLSearchParams()) {
        logListContainer.innerHTML = '<div class="loading-spinner"></div>'; // Show a loading spinner
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);

        const data = await fetchData(`/api/logs?${urlParams.toString()}`);
        logListContainer.innerHTML = '';
        
        if (data === 'error' || data.logs.length === 0) {
            showEmptyPlaceholder('/assets/icons/emptyLogs.png', logListContainer, null, "No logs found for the selected filters.");
            return;
        }

        data.logs.forEach(log => {
            logListContainer.append(createLogCard(log));
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: data.total,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderLogs(urlParams);
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1; // Reset to first page
                renderLogs(urlParams);
            }
        });
        paginationContainer.append(paginationControls);
    }

    // New function to be passed as the filter callback
    async function applyFilterToLogs(filteredUrlParams) {
        currentPage = 1;
        await renderLogs(filteredUrlParams);
    }

    const filters = await createFilterContainer(
        applyFilterToLogs, // The new applyFilterCallback
        'Search by user...', 
        { name: true, project: true, dateFrom: true, dateTo: true, sort: true }, // Changed 'recent' to 'sort'
        'username'
    );
    
    filterContainer.append(filters);

    await renderLogs(new URLSearchParams()); // Initial render without filters
    }
}


//displayContents here
//updated displayContents to handle parameters correctly
export async function displayContents(tabName, tabType, role) {
    // Hide all containers first to prevent overlapping
    document.querySelectorAll('.body-container').forEach(container => {
        container.style.display = 'none';
        container.style.opacity = 0;
    });

    const pageName = document.getElementById('pageName');
    
    if (tabType === 'upperTabs') {
        pageName.innerText = formatString(tabName);
        await generateContent(tabName, role);
    } else {
        pageName.innerText = 'Projects';
        // Handle lower tabs (specific projects) if necessary
    }
}


async function generateContent(tabName, role) {
    const bodyContainer = document.getElementById(`${tabName}BodyContainer`);
    if (!bodyContainer) {
        console.error(`Container not found: ${tabName}BodyContainer`);
        return;
    }

    const pageData = tabContents[tabName];
    if (!pageData) {
        console.error(`No content generator for tab: ${tabName}`);
        return;
    }

    // Call the generator and pass the role
    const content = await pageData.generateContent(role);
    
    // If the function returns an element (like Dashboard does), append it
    if (content instanceof HTMLElement) {
        bodyContainer.innerHTML = '';
        bodyContainer.append(content);
    }

    bodyContainer.style.display = 'flex';
    setTimeout(() => { bodyContainer.style.opacity = 1; }, 50);
    
    if (pageData.generateGraphs) {
        await pageData.generateGraphs();
    }
}

export async function generateDashboardContent(role) {
    const dashboardBodyContainer = div('dashboardBodyContainer', 'body-container');
    
    // Create a scrollable wrapper to prevent layout breaking
    const scrollWrapper = div('dashboardScrollWrapper');
    scrollWrapper.style.cssText = "flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; padding: 20px;";
    dashboardBodyContainer.append(scrollWrapper);

    // Header
    const overviewTitle = div('overviewTitle', 'body-header-title');
    overviewTitle.innerText = "Dashboard Overview";
    scrollWrapper.append(overviewTitle);

    // 1. Summary Cards (Load and Append)
    try {
        const summary = await dashboardSummaryCards();
        if (summary) scrollWrapper.append(summary);
    } catch (e) { console.error("Dashboard Summary Error:", e); }

    // 2. Graph Row (Static HTML first)
    const graphRow = div('dashboardGraphRow');
    graphRow.style.cssText = "display: flex; gap: 20px; height: 350px; min-height: 350px;";
    graphRow.innerHTML = `
        <div class="graph-box" style="flex: 1; background: white; padding: 20px; border-radius: 12px; border: 1px solid #e0e0e0; position: relative;">
            <canvas id="projectStatusGraph"></canvas>
        </div>
        <div class="graph-box" style="flex: 1; background: white; padding: 20px; border-radius: 12px; border: 1px solid #e0e0e0; position: relative;">
            <canvas id="budgetOverviewGraph"></canvas>
        </div>
    `;
    scrollWrapper.append(graphRow);

    // 3. Recent Requests (Load and Append)
    try {
        const requests = await recentMaterialsRequest();
        if (requests) scrollWrapper.append(requests);
    } catch (e) { console.error("Recent Requests Error:", e); }

    // CRITICAL: Delay graph initialization so the DOM is ready
    setTimeout(() => {
        try {
            if (typeof initDashboardGraphs === 'function') {
                initDashboardGraphs();
            }
        } catch (err) {
            console.error("Chart.js failed to initialize:", err);
        }
    }, 200);

    return dashboardBodyContainer;
}


export async function generateProjectsContent(role) {
    const projectsBodyContent = document.getElementById('projectsBodyContent');
    if (!projectsBodyContent) return;
    projectsBodyContent.innerHTML = ''; 

    // Header container for the action button
    const projectActionsHeader = div('project-actions-header');
    projectActionsHeader.style.cssText = "display: flex; justify-content: flex-end; padding: 10px 0;";

    if (role === 'admin') {
        const addProjectBtn = createButton('addProjectBtn', 'solid-buttons', 'Add New Project', 'addProjectBtnText', 'addWhite.png');
        addProjectBtn.addEventListener('click', () => createProjectOverlay(() => generateProjectsContent(role)));
        projectActionsHeader.append(addProjectBtn);
    }

    const projectsContainer = div('projects-main-container');
    const projectListContainer = div('project-list-container');
    const projectDetailsContainer = div('project-details-container');

    projectsContainer.append(projectListContainer, projectDetailsContainer);
    
    // Append button header first, then content
    projectsBodyContent.append(projectActionsHeader, projectsContainer);

    const projects = await fetchData('/api/allProjects');
    if (projects === 'error' || !projects || projects.length === 0) {
        showEmptyPlaceholder(null, projectListContainer, null, "No projects found.");
        return;
    }

    const projectList = div('project-list');
    projects.forEach(project => {
        const projectItem = div(`project-item-${project.project_id}`, 'project-list-item');
        projectItem.textContent = project.project_name;
        projectItem.addEventListener('click', () => {
            document.querySelectorAll('.project-list-item').forEach(item => item.classList.remove('selected'));
            projectItem.classList.add('selected');
            showProjectDetails(project.project_id, projectDetailsContainer);
        });
        projectList.append(projectItem);
    });

    projectListContainer.append(projectList);
    if (projects.length > 0) {
        projectList.children[0].click();
    }
}

const tabContents = {
    dashboard: {
        generateContent: async (role) => await generateDashboardContent(role),
        generateGraphs: async () => await initDashboardGraphs()
    },
    projects: {
        generateContent: async (role) => await generateProjectsContent(role),
        generateGraphs: async () => ''
    },
    inventory: {
        generateContent: async (projectId, role) => {
            const container = div('inventorySectionContainer');
            container.innerText = `Inventory Content for Project: ${projectId} (Role: ${role})`;
            return container;
        },
        generateGraphs: async () => ''
    },
    materialsRequest: {
        generateContent: async () => '',
        generateGraphs: async () => ''
    },
    personnel: {
        generateContent: async () => '',
        generateGraphs: async () => ''
    },
    logs: {
        generateContent: async () => await generateLogsContent(),
        generateGraphs: async () => ''
    },
    materials: {
        generateContent: async (role) => await generateMaterialsContent(role),
        generateGraphs: async () => ''
    },
    settings: {
        generateContent: async () => '',
        generateGraphs: async () => ''
    }
};



async function createProjectOverlay(refreshCallback) {
    const overlayTitle = 'Add New Project';
    
    const form = document.createElement('form');
    form.id = 'projectForm';
    form.classList.add('overlay-form');

    // Form Fields
    const projectNameInput = createInput('text', 'default', 'Project Name', 'projectName', 'project_name', '', 'Enter project name');
    const projectLocationInput = createInput('text', 'default', 'Location', 'projectLocation', 'project_location', '', 'e.g. Imus, Cavite');
    
    // Status Select (using your createFilterInput component style)
    const statusOptions = [
        { id: 'planning', name: 'Planning' },
        { id: 'in progress', name: 'In Progress' }
    ];
    
    const statusSelectContainer = div('statusSelectContainer', 'input-box-containers');
    const statusLabel = document.createElement('label');
    statusLabel.innerText = 'Initial Status';
    statusLabel.classList.add('input-labels');
    
    const statusSelect = createFilterInput('select', 'dropdown', 'projectStatusSelect', 'project_status', '', '', '', 'single', 1, statusOptions);
    statusSelect.querySelector('.select-option-dropdowns .selectOptionText').innerText = 'Select Status';
    
    statusSelectContainer.append(statusLabel, statusSelect);
    form.append(projectNameInput, projectLocationInput, statusSelectContainer);

    const actionButtons = div('projectActionButtons', 'action-buttons-container');
    const saveBtn = createButton('saveProjectBtn', 'solid-buttons', 'Create Project', 'saveBtnText');
    const cancelBtn = createButton('cancelProjectBtn', 'solid-buttons', 'Cancel', 'cancelBtnText');

    cancelBtn.addEventListener('click', () => hideOverlayWithBg());

    saveBtn.addEventListener('click', async () => {
        const payload = {
            project_name: projectNameInput.querySelector('input').value,
            project_location: projectLocationInput.querySelector('input').value,
            project_status: statusSelect.dataset.value
        };

        if (!payload.project_name || !payload.project_location || !payload.project_status) {
            return alertPopup('error', 'Please fill in all fields.');
        }

        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alertPopup('success', 'Project created successfully!');
            hideOverlayWithBg();
            refreshCallback();
        } else {
            alertPopup('error', 'Failed to create project.');
        }
    });

    actionButtons.append(cancelBtn, saveBtn);
    const { overlay } = createOverlayWithBg(overlayTitle, form, actionButtons);
    showOverlayWithBg(overlay);
}



async function showProjectDetails(projectId, container, role = 'admin') {
    // 1. Define the Tab Array based on role. 
    // This ensures createSectionTabs receives an ARRAY, not a string.
    const roleTabs = {
        'admin': ['Overview', 'Milestones', 'Inventory', 'Personnel', 'Logs'],
        'project manager': ['Overview', 'Milestones', 'Inventory', 'Personnel'],
        'engineer': ['Overview', 'Milestones', 'Inventory'],
        'foreman': ['Overview', 'Inventory']
    };

    const tabsToCreate = roleTabs[role] || ['Overview'];

    // Helper: Update percentage
    async function updateProjectPercentage() {
        const data = await fetchData(`/api/getProjectCard/${projectId}`);
        if(data === 'error') return; 
        const projectsOverallPercent = document.getElementById('projectsOverallPercent');
        if (projectsOverallPercent) {
            projectsOverallPercent.innerText = `${Math.round(data.progress)}%`;
        }
    }

    // Helper: Refresh Tab Content
    async function refreshActiveTabContent(currentProjectId, currentRole) {
        await updateProjectPercentage();

        const selectionTabContent = document.getElementById('selectionTabContent');
        if (!selectionTabContent) return;

        const activeTab = document.querySelector('.selection-tabs.selected');
        
        // Logic to determine which content to render
        let renderFn = generateMilestonesContent; // Default
        if (activeTab && activeTab.innerText === 'Inventory') renderFn = generateMaterialsContent;
        // ... add other tab logic here if needed ...

        selectionTabContent.innerHTML = '';
        const content = await renderFn(currentProjectId, currentRole, refreshActiveTabContent);
        selectionTabContent.append(content);
    }

    let selectionTabContainer = container.querySelector('#selectionTabContainer');

    if (!selectionTabContainer) {
        container.innerHTML = '';
        // CRITICAL FIX: Passing 'tabsToCreate' (The Array) instead of 'admin' (The String)
        selectionTabContainer = createSectionTabs(tabsToCreate, projectId, refreshActiveTabContent);
        container.append(selectionTabContainer);
    } else {
        const selectionTabContent = selectionTabContainer.querySelector('#selectionTabContent');
        if (selectionTabContent) selectionTabContent.innerHTML = '';
    }

    await refreshActiveTabContent(projectId, role);
}


async function generateMilestonesContent(projectId, role, refreshActiveTabContentFn) {
    const milestonesBody = div('milestones-body');
    const milestones = await fetchData(`/api/milestones/${projectId}`);

    if (milestones === 'error' || milestones.length === 0) {
        showEmptyPlaceholder('/assets/icons/noMilestones.png', milestonesBody, () => createMilestoneOl(projectId, refreshActiveTabContentFn), "No milestones found for this project.", "Create Milestones", projectId);
    } else {
        milestones.forEach(milestone => {
            const milestoneCard = div(`milestone-card-${milestone.id}`, 'milestone-card');
            const milestoneName = div('milestone-name');
            milestoneName.textContent = milestone.milestone_name;
            const milestoneActions = div('milestone-actions');
            const deleteBtn = createButton(`delete-milestone-${milestone.id}`, 'icon-buttons', '', 'delete-milestone-txt', 'deleteIcon');
            
            milestoneCard.addEventListener('click', (e) => {
                if (e.target.closest('.icon-buttons')) return;
                milestoneFullOl(projectId, milestone.id, milestone.milestone_name, refreshActiveTabContentFn, role); // Pass refreshActiveTabContentFn
            });

            deleteBtn.addEventListener('click', async () => {
                showDeleteConfirmation(milestone.milestone_name, async () => {
                    const response = await fetch(`/api/milestones/${milestone.id}`, { method: 'DELETE' });
                    if (response.ok) {
                        alertPopup('success', 'Milestone deleted successfully!');
                        await refreshActiveTabContentFn(projectId, role); // Use refreshActiveTabContentFn
                    } else {
                        alertPopup('error', 'Failed to delete milestone.');
                    }
                });
            });

            milestoneActions.append(deleteBtn);
            milestoneCard.append(milestoneName, milestoneActions);
            milestonesBody.append(milestoneCard);
        });
    }

    return milestonesBody; // Only return the body
}

async function dashboardSummaryCards() {
    const dashboardSummaryCards = div('dashboardSummaryCards', 'summary-cards');
    
    // Default data so the page doesn't look broken if the API fails
    const dashboardCardData = {
        activeProjects: { title: "activeProjects", data: "-", info: "No projects so far", color: "darkblue" },
        activePersonnel: { title: "activePersonnel", data: "-", info: "No personnel exists", color: "green" }, 
        pendingRequest:  { title: "pendingRequest", data: "-", info: "No pending requests", color: "darkorange" },
        budgetUtilization: { title: "budgetUtilization", data: "0%", info: "No data available", color: "red" }
    };

    function modifyCardData(objectCardData, data, info) {
        objectCardData.data = data;
        objectCardData.info = info;
    }

    // Try to get data, but don't crash if it fails
    const data = await fetchData('/api/adminSummaryCards/dashboard');
    
    // If the API works, update the default data
    if(data !== 'error' && data.length > 0){
        const cardData = data[0];
        modifyCardData(dashboardCardData['activeProjects'], cardData.active_projects, `${cardData.total_projects} total projects`);
        modifyCardData(dashboardCardData['activePersonnel'], cardData.active_personnel, `${cardData.total_personnel} total personnel`);
        modifyCardData(dashboardCardData['pendingRequest'], cardData.pending_requests, `Requests awaiting approval`); 
    }

    // Always append and return, even if data is still "-"
    dashboardSummaryCards.append(
        createSummaryCards(dashboardCardData['activeProjects']), 
        createSummaryCards(dashboardCardData['activePersonnel']),
        createSummaryCards(dashboardCardData['pendingRequest']),
        createSummaryCards(dashboardCardData['budgetUtilization'])
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

/**
 * Initializes charts and data visualizations for the dashboard
 */
export async function initDashboardGraphs() {
    const ctx = document.getElementById('projectStatusChart');
    if (!ctx) return;

    try {
        const data = await fetchData('/api/dashboard/graphData');
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels || ['Planning', 'In Progress', 'Completed'],
                datasets: [{
                    data: data.values || [0, 0, 0],
                    backgroundColor: ['#FFD180', '#81D4FA', '#C5E1A5'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Load recent activity preview
        const activityList = document.getElementById('dashboardActivityList');
        const logs = await fetchData('/api/logs?page=1&limit=5');
        if (logs && logs.logs) {
            activityList.innerHTML = logs.logs.map(log => `
                <div class="mini-log-item">
                    <strong>${log.full_name}</strong> ${log.log_name}
                    <span>${dateFormatting(log.created_at, 'date')}</span>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Failed to initialize charts:", err);
    }
}

async function dashboardActiveProjects(filter = 'inprogress') {
    const activeProjectsContainer = div('activeProjectsContainer', 'active-projects');

    const activeProjectsHeader = div('activeProjectsHeader', 'content-card-header');
    const activeProjectsTitle = div('activeProjectsTitle', 'content-card-title');
    activeProjectsTitle.innerText = 'Active Projects';
    const activeProjectsSubtitle = div('activeProjectsSubtitle', 'content-card-subtitle');
    activeProjectsSubtitle.innerText = 'Currently in-progress construction projects';
    const activeProjectsBody = div('activeProjectsBody', 'content-card-body');
    
    const data = await fetchData(`/api/${filter}Projects`);
    
    // Check if fetch failed
    if(data === 'error') return activeProjectsContainer;

    // Check if no projects exist
    if(data.length === 0) {
        const noProjectsCard = div('projectProgressCards', 'project-progress-cards');
        noProjectsCard.innerText = "There's no active projects so far";

        activeProjectsBody.append(noProjectsCard);
        activeProjectsHeader.append(activeProjectsTitle, activeProjectsSubtitle);
        activeProjectsContainer.append(activeProjectsHeader, activeProjectsBody);
        return activeProjectsContainer;
    } 

    // Logic for rendering projects
    let num = 1;
    for (const projects of data) {
        const progressCardContainer = div(`projectProgressCards_${num}`, 'project-progress-cards');
        const progressCardHeader = div(`progressCardHeader_${num}`, 'progress-card-header');
        const progressCardName = div(`progressCardName_${num}`, 'progress-card-name');
        progressCardName.innerText = projects.project_name;
        
        const progressCardStatus = div(`progressCardStatus_${num}`, 'progress-card-status');
        if(projects.project_status === "planning") warnType(progressCardStatus, "glass", '', '', '');
        if(projects.project_status === "in progress") warnType(progressCardStatus, "glass", 'yellow', '', '');
        if(projects.project_status === "completed") warnType(progressCardStatus, "glass", 'green', '', '');
        progressCardStatus.innerText = projects.project_status;

        const progressCardBody = div(`progressCardBody_${num}`, 'progress-card-body');
        const progressCardLocation = div(`progressCardLocation_${num}`, 'progress-card-location');
        progressCardLocation.innerText = projects.project_location;

        const progressCardFooter = div(`progressCardFooter_${num}`, 'progress-card-footer');
        
        // SAFE MATH: Prevent division by zero
        const total = projects.total_milestone || 0;
        const completed = projects.completed_milestone || 0;
        const calcPercent = total > 0 ? Math.floor((completed / total) * 100) : 0;
        const pctString = `${calcPercent}%`;

        const progressPercent = div(`progressPercent_${num}`, 'progress-percent');
        progressPercent.innerText = pctString;

        const progressLowerSection = div(`progressLowerSection_${num}`, 'progress-lower-section');
        const progressBar = div(`progressBar_${num}`, 'progress-bar');
        progressBar.style.width = pctString;

        progressLowerSection.append(progressBar);
        progressCardFooter.append(progressPercent, progressLowerSection);
        progressCardBody.append(progressCardLocation);
        progressCardHeader.append(progressCardName, progressCardStatus);
        progressCardContainer.append(progressCardHeader, progressCardBody, progressCardFooter);
        
        activeProjectsBody.append(progressCardContainer);
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
    
    // Always append the header so the dashboard doesn't look empty while loading
    recentRequestContainer.append(recentRequestHeader, recentRequestBody);
    recentRequestHeader.append(recentRequestTitle, recentRequestSubtitle);

    // Fetch the data
    const data = await fetchData(`/api/recentMatReqs`);

    // 1. SAFETY CHECK: Prevents the "data is not iterable" crash if server returns 500 or "error"
    if (data === 'error' || !data || !Array.isArray(data) || data.length === 0) {
        const emptyPlaceholder = div(`emptyPlaceholder`, `request-card-container`);
        emptyPlaceholder.style.cssText = "display: flex; justify-content: center; padding: 40px; color: #888; font-style: italic;";
        
        if (data === 'error') {
            emptyPlaceholder.innerText = 'Failed to connect to server. Please try again later.';
        } else {
            emptyPlaceholder.innerText = 'There are no recent material requests so far.';
        }
        
        recentRequestBody.append(emptyPlaceholder);
        return recentRequestContainer;
    }

    // 2. DATA PROCESSING: Only runs if data is a valid array
    for (const requests of data) {
        const requestCardContainer = div(`requestCardContainer`, `request-card-container`);
        const requestCardLeft = div(`requestCardLeft`, `request-card-left`);
        const requestCardHeader = div(`requestCardHeader`, `request-card-header`);
        const requestCardTitle = div(`requestCardTitle`, `request-card-title`);
        requestCardTitle.innerText = `${requests.project_name}`;
        
        const requestCardPriority = div(`requestCardPriority`, `request-card-priority`);
        // Use if/else if for cleaner logic
        if(requests.priority_level === "medium") warnType(requestCardPriority, "solid", 'yellow', '', '');
        else if(requests.priority_level === "low") warnType(requestCardPriority, "solid", 'green', '', '');
        else if(requests.priority_level === "high") warnType(requestCardPriority, "solid", 'red', '', '');
        
        requestCardPriority.innerText = `${formatString(requests.priority_level)} Priority`;
        
        const requestCardBody = div(`requestCardBody`, `request-card-body`);
        const requestCardName = div(`requestCardName`, `request-card-name`);
        requestCardName.innerText = `Requested by ${requests.requested_by} • `;
        
        const requestCardItemCount = div(`requestCardItemCount`, `request-card-item-count`);
        requestCardItemCount.innerText = `${requests.item_count} items • `;
        
        const requestCardCost = div(`requestCardCost`, `request-card-cost`);
        // 3. COST FORMATTING: Prevents errors if cost is null from the database
        const numericCost = requests.cost ? Number(requests.cost) : 0;
        requestCardCost.innerText = `₱${numericCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        const requestCardRight = div(`requestCardRight`, `request-card-right`);
        const requestStatusContainer = div(`requestStatusContainer`, `request-status-container`);
        const requestStatusIcon = div(`requestStatusIcon`, `request-status-icon`);
        requestStatusIcon.classList.add('icons');
        const requestStatusLabel = div(`requestStatusLabel`, `request-status-label`);
        
        if(requests.status === "pending") warnType(requestStatusContainer, "", 'yellow', requestStatusIcon, requestStatusLabel);
        else if(requests.status === "approved") warnType(requestStatusContainer, "", 'green', requestStatusIcon, requestStatusLabel);
        else if(requests.status === "rejected") warnType(requestStatusContainer, "", 'red', requestStatusIcon, requestStatusLabel);
        
        requestStatusLabel.innerText = `${requests.status}`;
        
        const requestCardDate = div(`requestCardDate`, `request-card-date`);
        requestCardDate.innerText = `${dateFormatting(requests.request_date, 'dateTime')}`; 

        // Append everything in correct order
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
