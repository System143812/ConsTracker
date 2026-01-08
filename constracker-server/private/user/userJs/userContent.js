import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { hideContents } from "/mainJs/sidebar.js";
import { createMilestoneOl, milestoneFullOl, showLogDetailsOverlay, createOverlayWithBg, hideOverlayWithBg, showDeleteConfirmation, showOverlayWithBg } from "/mainJs/overlays.js";
import { div, span, button, createButton, createFilterContainer, createPaginationControls, createInput, createFilterInput } from "/js/components.js";

const requiredRoles = ['engineer', 'foreman', 'project manager'];

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
            categorySelect.querySelector('#selectOptionText').innerText = selectedCategory.name;
            categorySelect.dataset.value = material.category_id;
        }
    } else {
        categorySelect.querySelector('#selectOptionText').innerText = 'Select a category';
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
            supplierSelect.querySelector('#selectOptionText').innerText = selectedSupplier.name;
            supplierSelect.dataset.value = material.supplier_id;
        }
    } else {
        supplierSelect.querySelector('#selectOptionText').innerText = 'Select a supplier';
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
            unitSelect.querySelector('#selectOptionText').innerText = selectedUnit.name;
            unitSelect.dataset.value = material.unit_id;
        }
    } else {
        unitSelect.querySelector('#selectOptionText').innerText = 'Select a unit';
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

    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = overlayTitle;
    overlayBody.append(form, actionButtonsContainer);

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
    const filterContainer = div('materials-filter-container');
    const materialsListContainer = div('materials-list-container');
    const paginationContainer = div('materialsPaginationContainer', 'pagination-container');
    
    materialsContainer.append(filterContainer, materialsListContainer, paginationContainer);
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


function hideDivContents(div) {
    div.innerHTML = "";
}

async function updateDivContents(divContainer, newContentFn) {
    hideDivContents(divContainer);
    divContainer.append(await newContentFn());
}

const tabContents = {
    dashboard: {
        generateContent: async(role) => await generateDashboardContent(role),
        generateGraphs: async() => await initDashboardGraphs()
    },
    logs: {
        generateContent: async(role) => await generateLogsContent(role),
        generateGraphs: async() => ''
    },
    materials: {
        generateContent: async(role) => await generateMaterialsContent(role),
        generateGraphs: async() => '' 
    },
    project: {
        generateContent: async(tabName, role) => await generateProjectContent(tabName, role)
    },
    settings: {
        generateContent: async(role) => '',
        generateGraphs: async() => ''
    }
}

export async function displayUserContents(tabName, tabType, role) {
    let bodyContainer;
    const pageName = document.getElementById('pageName');
    if(tabType === 'upperTabs'){
        const divContent = document.getElementById(`${tabName}BodyContainer`);
        bodyContainer = divContent;
        pageName.innerText = formatString(tabName);
        await tabContents[tabName].generateContent(role);
    } else {
        const divContent = document.getElementById('projectsBodyContainer');
        bodyContainer = divContent;
        pageName.innerText = 'Projects';
        await tabContents['project'].generateContent(tabName, role);
    }
    bodyContainer.style.display = 'flex';
    bodyContainer.style.opacity = 1;
}

async function generateDashboardContent(role) {
    const dashboardBodyContent = document.getElementById('dashboardBodyContent');
    if(!requiredRoles.includes(role)){
        alertPopup('error', 'Unauthorized Role');
        return window.location.href = '/'
    } 
    if(role === 'engineer'){
        dashboardBodyContent.append(
            
        );
    } else {
        dashboardBodyContent.append(

        );
    }
}

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
        logDetailsBtn.style.display = 'none'; // Hide button if not applicable
    }

    logDetailsBtn.append(logDetailsIcon);
    logCardFooter.append(logDetailsBtn);
    logCardBody.append(logCardIcon, logCardName);
    logCardHeader.append(logData.project_id !== 0 ? logProjectName : '', logDate);
    logCard.append(logCardHeader,logCardBody, logCardFooter);
    return logCard;
}


async function generateProjectContent(projectTabName, role) { //project1
    const projectId = projectTabName.replace(/project/g, '');
    const projectsBodyContent = document.getElementById('projectsBodyContent');
    await createProjectCard(projectId);
    if(!requiredRoles.includes(role)){
        alertPopup('error', 'Unauthorized Role');
        return window.location.href = '/';
    } 
    if(role === 'engineer'){
        projectsBodyContent.append(
            createSectionTabs(role, projectId)
            
        );
    } else {
        projectsBodyContent.append(
            createSectionTabs(role, projectId)

        );
    }
    const selectionTabContent = document.getElementById('selectionTabContent'); //nitial tab dat u will see on selectionTabs
    const milestoneTab = document.getElementById('selectionTabMilestones');
    const render = {label: "Milestones", render: renderMilestones};
    selectionTabRenderEvent(selectionTabContent, milestoneTab, render, projectId, role);
}

async function refreshUserProjectContent(currentProjectId, role) {
    await createProjectCard(currentProjectId);

    const selectionTabContent = document.getElementById('selectionTabContent');
    if (!selectionTabContent) return;

    const selectionTabContainer = document.getElementById('selectionTabContainer');
    if (!selectionTabContainer) return;

    const activeTab = selectionTabContainer.querySelector('.selection-tabs.selected');

    let currentRenderFunction;
    const newContents = [
        {id: "selectionTabMilestones", label: "Milestones", render: renderMilestones},
        {id: "selectionTabInventory", label: "Inventory", render: renderInventory},
        {id: "selectionTabWorkers", label: "Personnel & Workers", render: renderWorker},
        {id: "selectionTabAnalytics", label: "Analytics", render: renderAnalytics},  
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

async function createProjectCard(projectId) {
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

function hideSelectionContents(contentContainer, tabClassName) { //done refactoring this, ready to use na anywhere
    const sameClassTabs = document.querySelectorAll(`.${tabClassName}`);
    for (const tab of sameClassTabs) {
        tab.classList.remove('selected');
    }
    contentContainer.innerHTML = "";
}

function createSectionTabs(role, projectId) {
    const newContents = [
        {id: "selectionTabMilestones", label: "Milestones", render: renderMilestones},
        {id: "selectionTabInventory", label: "Inventory", render: renderInventory},
        {id: "selectionTabWorkers", label: "Personnel & Workers", render: renderWorker},
        {id: "selectionTabAnalytics", label: "Analytics", render: renderAnalytics},  
        // {id: "selectionTabEwan", label: "Ewan", render: renderMilestones} test lang    
    ]

    const selectionTabContent = div('selectionTabContent');
    const selectionTabContainer = div('selectionTabContainer');
    const selectionTabHeader = div('selectionTabHeader');

    for (const contents of newContents) {
        const elem = div(`${contents.id}`, 'selection-tabs');
        elem.innerText = contents.label;
        elem.addEventListener("click", async() => {
            await selectionTabRenderEvent(selectionTabContent, elem, contents, projectId, role)
        });
        selectionTabHeader.append(elem);
    }
    selectionTabContainer.append(selectionTabHeader, selectionTabContent);
    return selectionTabContainer;
}

async function selectionTabRenderEvent(content, tab, newContent, projectId, role) {
    hideSelectionContents(content, tab.className);
    tab.classList.add('selected');
    content.append(await newContent.render(role, projectId));
}

function roundDecimal(number) {
    return number * 10 / 10;
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
        milestoneAddBtn.addEventListener("click", () => { createMilestoneOl(projectId, () => refreshUserProjectContent(projectId, role)) });
    }
    const milestoneSectionBody = div('milestoneSectionBody');
    const data = await fetchData(`/api/milestones/${projectId}`);
    if(data === "error") return alertPopup('error', 'Network Connection Error');
    if(data.length === 0) {
        if(role !== 'foreman') {
            showEmptyPlaceholder('/assets/icons/noMilestones.png', milestoneSectionBody, () => createMilestoneOl(projectId, () => refreshUserProjectContent(projectId, role)), "There are no milestones yet", "Create Milestones", projectId);
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
                    const projectsOverallPercent = document.getElementById('projectsOverallPercent');
                    const projectsBodyContent = document.getElementById('projectsBodyContent');
                    projectsOverallPercent.innerHTML = "";
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

async function renderInventory() {
    const inventorySectionContainer = div('inventorySectionContainer');
    inventorySectionContainer.innerText = 'Inventory';
    return inventorySectionContainer;
}

async function renderWorker() {
    const workerSectionContainer = div('workerSectionContainer');
    workerSectionContainer.innerText = 'Personnel & Workers';
    return workerSectionContainer;
}

async function renderAnalytics() {
    const analyticsSectionContainer = div('analyticsSectionContainer');
    analyticsSectionContainer.innerText = 'Analytics';
    return analyticsSectionContainer;
}

async function renderLogs(logListContainer, urlParams = new URLSearchParams()) {
    logListContainer.innerHTML = '<div class="loading-spinner"></div>'; // Show a loading spinner
    const logs = await fetchData(`/api/logs?${urlParams.toString()}`);
    logListContainer.innerHTML = '';
    
    if (logs === 'error' || logs.length === 0) {
        showEmptyPlaceholder('../assets/icons/emptyLogs.png', logListContainer, null, "No logs found for the selected filters.");
        return;
    }

    logs.forEach(log => {
        logListContainer.append(createLogCard(log));
    });
}

async function generateLogsContent(role) {
    const logsBodyContent = document.getElementById('logsBodyContent');
    logsBodyContent.innerHTML = '';

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
        fetchAndRender, // The new applyFilterCallback
        'Search by user...', 
        { name: true, project: true, dateFrom: true, dateTo: true, sort: true }, // Updated 'recent' to 'sort'
        'username',
        'newest'
    );
    
    filterContainer.append(filters);

    await fetchAndRender(new URLSearchParams()); // Initial render without filters
}
