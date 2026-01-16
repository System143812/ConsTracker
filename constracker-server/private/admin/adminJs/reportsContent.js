import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, button, createButton, createFilterContainer, createPaginationControls, createInput, createFilterInput, editFormButton, validateInput, createSelect, createTable, createTableRow, createTableCell, createTableHeader } from "/js/components.js";
import { createOverlayWithBg, hideOverlayWithBg, showOverlayWithBg } from "/mainJs/overlays.js";

export async function generateReportsContent(role) {
    const reportsBodyHeader = document.getElementById('reportsBodyHeader');
    const reportsBodyContent = document.getElementById('reportsBodyContent');
    reportsBodyContent.innerHTML = ''; // Clear existing content

    const bodyHeaderContainer = reportsBodyHeader.querySelector('.body-header-container');
    const title = bodyHeaderContainer.querySelector('.body-header-title');
    const subtitle = bodyHeaderContainer.querySelector('.body-header-subtitle');
    title.innerText = 'Reports';
    subtitle.innerText = 'Generate and view detailed project reports';

    const reportTypesContainer = div('reportTypesContainer', 'report-types-container');
    const progressReportBtn = createButton('progressReportBtn', 'solid-buttons btn-blue', 'Progress Reports');
    const inventoryReportBtn = createButton('inventoryReportBtn', 'solid-buttons btn-blue', 'Inventory Reports');

    reportTypesContainer.append(progressReportBtn, inventoryReportBtn);

    const progressReportHeader = div('', 'sub-report-header');
    progressReportHeader.innerText = 'Progress Reports';
    const progressReportsFilterContainer = div('progressReportsFilterContainer', 'filter-container');
    const progressReportsListContainer = div('progressReportsListContainer', 'reports-list-container');
    const progressReportsPaginationContainer = div('progressReportsPaginationContainer', 'pagination-container');

    const inventoryReportHeader = div('', 'sub-report-header');
    inventoryReportHeader.innerText = 'Inventory Reports';
    const inventoryReportsFilterContainer = div('inventoryReportsFilterContainer', 'filter-container');
    const inventoryReportsListContainer = div('inventoryReportsListContainer', 'reports-list-container');
    const inventoryReportsPaginationContainer = div('inventoryReportsPaginationContainer', 'pagination-container');

    // Append all elements directly to body-content
    reportsBodyContent.append(reportTypesContainer, progressReportHeader, progressReportsFilterContainer, progressReportsListContainer, progressReportsPaginationContainer, inventoryReportHeader, inventoryReportsFilterContainer, inventoryReportsListContainer, inventoryReportsPaginationContainer);

    progressReportBtn.addEventListener('click', () => displayProgressReports(progressReportHeader, progressReportsFilterContainer, progressReportsListContainer, progressReportsPaginationContainer, role));
    inventoryReportBtn.addEventListener('click', () => displayInventoryReports(inventoryReportHeader, inventoryReportsFilterContainer, inventoryReportsListContainer, inventoryReportsPaginationContainer, role));

    // Initially display progress reports
    await displayProgressReports(progressReportHeader, progressReportsFilterContainer, progressReportsListContainer, progressReportsPaginationContainer, role);
}

async function displayProgressReports(headerElement, filterContainer, reportsListContainer, paginationContainer, role) {

    let currentPage = 1;
    let itemsPerPage = 10;
    let allProgressReports = [];

    async function fetchAndRenderProgressReports(urlParams = new URLSearchParams()) {
        reportsListContainer.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);

        const data = await fetchData(`/api/progress-reports?${urlParams.toString()}`);
        reportsListContainer.innerHTML = '';

        if (data === 'error' || data.length === 0) {
            showEmptyPlaceholder('/assets/icons/logs.png', reportsListContainer, null, "No progress reports found.");
            allProgressReports = [];
            return;
        }

        allProgressReports = data;
        renderProgressReportsPage();
    }

    function renderProgressReportsPage() {
        reportsListContainer.innerHTML = '';
        paginationContainer.innerHTML = '';

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageReports = allProgressReports.slice(start, end);

        if (pageReports.length === 0) {
            showEmptyPlaceholder('/assets/icons/logs.png', reportsListContainer, null, "No progress reports found.");
            return;
        }

        pageReports.forEach(report => {
            const reportCard = createProgressReportCard(report);
            reportsListContainer.append(reportCard);
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: allProgressReports.length,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderProgressReportsPage();
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1;
                fetchAndRenderProgressReports(new URLSearchParams()); // Re-fetch with new limit
            }
        });
        paginationContainer.append(paginationControls);
    }

    async function applyFilterToProgressReports(filteredUrlParams) {
        currentPage = 1;
        await fetchAndRenderProgressReports(filteredUrlParams);
    }

    const projects = await fetchData('/api/selection/project'); // Fetch projects for filter
    const projectOptions = projects.map(p => ({ id: p.id, name: p.name }));
    projectOptions.unshift({ id: 'all', name: 'All Projects' });

    const filters = await createFilterContainer(
        applyFilterToProgressReports,
        'Search by reporter...', 
        { name: true, project: true, dateFrom: true, dateTo: true, sort: true },
        'reporterName',
        'newest',
        { projectOptions: projectOptions } // Pass project options to filter
    );
    filterContainer.append(filters);

    await fetchAndRenderProgressReports(new URLSearchParams());

    if (['admin', 'engineer', 'foreman'].includes(role)) {
        const createReportBtn = createButton('createProgressReportBtn', 'solid-buttons btn-green', 'Create Progress Report');
        filterContainer.append(createReportBtn);
        createReportBtn.addEventListener('click', () => createProgressReportOverlay(() => fetchAndRenderProgressReports(new URLSearchParams())));
    }
}

function createProgressReportCard(report) {
    const card = div(`progress-report-card-${report.report_id}`, 'report-card');
    
    // Determine status badge color
    let statusClass = 'status-badge status-submitted';
    if (report.status === 'approved') statusClass = 'status-badge status-approved';
    else if (report.status === 'rejected') statusClass = 'status-badge status-rejected';
    else if (report.status === 'draft') statusClass = 'status-badge status-draft';
    
    card.innerHTML = `
        <div class="report-card-header">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span class="report-title">Report #${report.report_id}</span>
                <span class="${statusClass}">${report.status}</span>
            </div>
            <span class="report-date">${dateFormatting(report.report_date, 'date')}</span>
        </div>
        <div class="report-card-body">
            <p><strong>Project:</strong> ${report.project_name || 'N/A'}</p>
            <p><strong>Task:</strong> ${report.task_name || 'N/A'}</p>
            <p><strong>Reported By:</strong> ${report.reported_by_name}</p>
            ${report.safety_conditions ? `<p><strong>Safety Conditions:</strong> ${report.safety_conditions}</p>` : ''}
            ${report.remarks ? `<p><strong>Remarks:</strong> ${report.remarks}</p>` : ''}
        </div>
        <div class="report-card-footer">
            <button class="solid-buttons blue view-details-btn">View Details</button>
            ${report.status === 'submitted' ? `
                <button class="solid-buttons green approve-btn">Approve</button>
                <button class="solid-buttons red reject-btn">Reject</button>
            ` : ''}
        </div>
    `;
    
    const viewDetailsBtn = card.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', () => showProgressReportDetails(report));
    
    if (report.status === 'submitted') {
        const approveBtn = card.querySelector('.approve-btn');
        const rejectBtn = card.querySelector('.reject-btn');
        
        approveBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to approve this progress report?')) {
                const response = await fetch(`/api/progress-reports/${report.report_id}/approve`, {
                    method: 'PUT'
                });
                
                if (response.ok) {
                    alertPopup('success', 'Progress report approved successfully!');
                    location.reload(); // Reload to refresh reports
                } else {
                    const error = await response.json();
                    alertPopup('error', error.message || 'Failed to approve report.');
                }
            }
        });
        
        rejectBtn.addEventListener('click', () => {
            showRejectReportOverlay(report.report_id, 'progress', () => location.reload());
        });
    }
    
    return card;
}

async function showProgressReportDetails(report) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = `Progress Report #${report.report_id} - ${dateFormatting(report.report_date, 'date')}`;

    const reportDetailsContainer = div('', 'report-details-overlay-content');
    reportDetailsContainer.innerHTML = `
        <p><strong>Project:</strong> ${report.project_name || 'N/A'}</p>
        <p><strong>Task:</strong> ${report.task_name || 'N/A'}</p>
        <p><strong>Reported By:</strong> ${report.reported_by_name}</p>
        ${report.safety_conditions ? `<p><strong>Safety Conditions:</strong> ${report.safety_conditions}</p>` : ''}
        ${report.remarks ? `<p><strong>Remarks:</strong> ${report.remarks}</p>` : ''}
    `;

    const photosHeader = div('', 'photos-header');
    photosHeader.innerText = 'Photos';
    reportDetailsContainer.append(photosHeader);

    const photos = await fetchData(`/api/progress-reports/${report.report_id}/photos`);
    if (photos !== 'error' && photos.length > 0) {
        const photoGallery = div('', 'photo-gallery');
        photos.forEach(photoUrl => {
            const imgContainer = div('', 'photo-gallery-item');
            const img = document.createElement('img');
            img.src = `/progressReportImages/${photoUrl}`; // Adjusted path
            imgContainer.append(img);
            photoGallery.append(imgContainer);
        });
        reportDetailsContainer.append(photoGallery);
    } else {
        const noPhotos = div('', 'no-photos-message');
        noPhotos.innerText = 'No photos available for this report.';
        reportDetailsContainer.append(noPhotos);
    }

    overlayBody.append(reportDetailsContainer);
    showOverlayWithBg(overlayBackground);
}


async function createProgressReportOverlay(refreshReportsCallback) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = 'Create New Progress Report';

    const form = document.createElement('form');
    form.id = 'progressReportForm';
    form.classList.add('form-edit-forms');
    form.enctype = 'multipart/form-data';

    const formHeader = div('', 'create-form-headers');
    const formFooter = div('', 'create-form-footers');

    const projects = await fetchData('/api/selection/project');
    const projectOptions = projects.map(p => ({ id: p.id, name: p.name }));
    const { select: projectSelect, container: projectSelectContainer } = createSelect('reportProjectSelect', 'Project', null, null, null, projectOptions);

    const tasks = await fetchData('/api/selection/task'); // Assuming there's a /api/selection/task that returns tasks for selected project
    const taskOptions = tasks.map(t => ({ id: t.id, name: t.name }));
    taskOptions.unshift({ id: '', name: 'No Specific Task' }); // Option for no specific task
    const { select: taskSelect, container: taskSelectContainer } = createSelect('reportTaskSelect', 'Task (Optional)', null, null, null, taskOptions);


    const reportDateInput = createInput('date', 'edit', 'Report Date', 'reportDate', 'report_date', new Date().toISOString().split('T')[0], '');
    const safetyConditionsInput = createInput('textarea', 'edit', 'Safety Conditions (Optional)', 'safetyConditions', 'safety_conditions', '', 'Describe safety conditions...');
    const remarksInput = createInput('textarea', 'edit', 'Remarks (Optional)', 'remarks', 'remarks', '', 'Add any additional remarks...');

    // Image Upload
    const imageDropAreaContainer = div('imageDropAreaContainer', 'input-box-containers');
    const imageLabel = document.createElement('label');
    imageLabel.className = 'input-labels';
    imageLabel.innerText = 'Proof Photos (Max 5)';
    const imageSubLabel = span('imageSubLabel', 'input-sub-labels');
    imageSubLabel.innerText = 'Drag & drop or click to select multiple images';

    const imageDropArea = div('imageDropArea', 'image-drop-area');
    const imageDropAreaText = span('', 'image-drop-text');
    imageDropAreaText.innerText = 'No files chosen';
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.name = 'photos';
    imageInput.accept = 'image/*';
    imageInput.multiple = true;
    imageInput.style.display = 'none';

    const imagePreviewContainer = div('imagePreviewContainer', 'image-preview-container');

    imageDropArea.append(imageDropAreaText, imageInput);
    imageDropAreaContainer.append(imageLabel, imageSubLabel, imageDropArea, imagePreviewContainer);

    imageDropArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => {
        imagePreviewContainer.innerHTML = '';
        const files = Array.from(imageInput.files).slice(0, 5); // Limit to 5 files
        if (files.length > 0) {
            imageDropAreaText.innerText = `${files.length} file(s) selected`;
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgPreview = div('', 'image-preview-thumbnail');
                    imgPreview.style.backgroundImage = `url(${e.target.result})`;
                    imagePreviewContainer.append(imgPreview);
                };
                reader.readAsDataURL(file);
            });
        } else {
            imageDropAreaText.innerText = 'No files chosen';
        }
    });

    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageDropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'dragover') imageDropArea.classList.add('drag-over');
            if (eventName === 'dragleave' || eventName === 'drop') imageDropArea.classList.remove('drag-over');
            if (eventName === 'drop') {
                imageInput.files = e.dataTransfer.files;
                imageInput.dispatchEvent(new Event('change')); // Trigger change event to update preview
            }
        });
    });

    formHeader.append(
        projectSelectContainer,
        taskSelectContainer,
        reportDateInput,
        safetyConditionsInput,
        remarksInput,
        imageDropAreaContainer
    );

    const cancelBtn = createButton('cancelReportBtn', 'wide-buttons', 'Cancel');
    cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    const saveReportBtn = createButton('saveReportBtn', 'wide-buttons btn-blue', 'Create Report');
    saveReportBtn.addEventListener('click', async () => {
        const projectId = projectSelect.dataset.value;
        const taskId = taskSelect.dataset.value || null;
        const reportDate = reportDateInput.querySelector('input').value;
        const safetyConditions = safetyConditionsInput.querySelector('textarea').value;
        const remarks = remarksInput.querySelector('textarea').value;

        if (!projectId || !reportDate) {
            return alertPopup('error', 'Project and Report Date are required.');
        }

        const formData = new FormData();
        formData.append('project_id', projectId);
        if (taskId) formData.append('task_id', taskId);
        formData.append('report_date', reportDate);
        formData.append('safety_conditions', safetyConditions);
        formData.append('remarks', remarks);

        Array.from(imageInput.files).slice(0, 5).forEach(file => {
            formData.append('photos', file);
        });

        const response = await fetch('/api/progress-reports', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            alertPopup('success', 'Progress report created successfully!');
            hideOverlayWithBg(overlayBackground);
            refreshReportsCallback();
        } else {
            const errorData = await response.json();
            alertPopup('error', errorData.message || 'Failed to create progress report.');
        }
    });

    formFooter.append(cancelBtn, saveReportBtn);
    form.append(formHeader, formFooter);
    overlayBody.append(form);
    showOverlayWithBg(overlayBackground);
}


async function displayInventoryReports(headerElement, filterContainer, reportsListContainer, paginationContainer, role) {

    let currentPage = 1;
    let itemsPerPage = 10;
    let allInventoryReports = [];

    async function fetchAndRenderInventoryReports(urlParams = new URLSearchParams()) {
        reportsListContainer.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);

        const data = await fetchData(`/api/inventory-reports?${urlParams.toString()}`);
        reportsListContainer.innerHTML = '';

        if (data === 'error' || data.length === 0) {
            showEmptyPlaceholder('/assets/icons/inventory.png', reportsListContainer, null, "No inventory reports found.");
            allInventoryReports = [];
            return;
        }

        allInventoryReports = data;
        renderInventoryReportsPage();
    }

    function renderInventoryReportsPage() {
        reportsListContainer.innerHTML = '';
        paginationContainer.innerHTML = '';

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageReports = allInventoryReports.slice(start, end);

        if (pageReports.length === 0) {
            showEmptyPlaceholder('/assets/icons/inventory.png', reportsListContainer, null, "No inventory reports found.");
            return;
        }

        pageReports.forEach(report => {
            const reportCard = createInventoryReportCard(report);
            reportsListContainer.append(reportCard);
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: allInventoryReports.length,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderInventoryReportsPage();
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1;
                fetchAndRenderInventoryReports(new URLSearchParams());
            }
        });
        paginationContainer.append(paginationControls);
    }

    async function applyFilterToInventoryReports(filteredUrlParams) {
        currentPage = 1;
        await fetchAndRenderInventoryReports(filteredUrlParams);
    }

    const projects = await fetchData('/api/selection/project'); // Fetch projects for filter
    const projectOptions = projects.map(p => ({ id: p.id, name: p.name }));
    projectOptions.unshift({ id: 'all', name: 'All Projects' });

    const filters = await createFilterContainer(
        applyFilterToInventoryReports,
        'Search by reporter...', 
        { name: true, project: true, dateFrom: true, dateTo: true, sort: true },
        'reporterName',
        'newest',
        { projectOptions: projectOptions }
    );
    filterContainer.append(filters);

    await fetchAndRenderInventoryReports(new URLSearchParams());

    if (['admin', 'engineer', 'foreman'].includes(role)) {
        const createReportBtn = createButton('createInventoryReportBtn', 'solid-buttons green', 'Create Inventory Report');
        filterContainer.append(createReportBtn);
        createReportBtn.addEventListener('click', () => createInventoryReportOverlay(() => fetchAndRenderInventoryReports(new URLSearchParams())));
    }
}

function createInventoryReportCard(report) {
    const card = div(`inventory-report-card-${report.report_id}`, 'report-card');
    
    // Determine status badge color
    let statusClass = 'status-badge status-submitted';
    if (report.status === 'approved') statusClass = 'status-badge status-approved';
    else if (report.status === 'rejected') statusClass = 'status-badge status-rejected';
    else if (report.status === 'draft') statusClass = 'status-badge status-draft';
    
    card.innerHTML = `
        <div class="report-card-header">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span class="report-title">Report #${report.report_id}</span>
                <span class="${statusClass}">${report.status}</span>
            </div>
            <span class="report-date">${dateFormatting(report.report_date, 'date')}</span>
        </div>
        <div class="report-card-body">
            <p><strong>Project:</strong> ${report.project_name || 'N/A'}</p>
            <p><strong>Reported By:</strong> ${report.reported_by_name}</p>
            ${report.remarks ? `<p><strong>Remarks:</strong> ${report.remarks}</p>` : ''}
        </div>
        <div class="report-card-footer">
            <button class="solid-buttons blue view-details-btn">View Details</button>
            ${report.status === 'submitted' ? `
                <button class="solid-buttons green approve-btn">Approve</button>
                <button class="solid-buttons red reject-btn">Reject</button>
            ` : ''}
        </div>
    `;
    
    const viewDetailsBtn = card.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', () => showInventoryReportDetails(report));
    
    if (report.status === 'submitted') {
        const approveBtn = card.querySelector('.approve-btn');
        const rejectBtn = card.querySelector('.reject-btn');
        
        approveBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to approve this inventory report? This will deduct items from inventory.')) {
                const response = await fetch(`/api/inventory-reports/${report.report_id}/approve`, {
                    method: 'PUT'
                });
                
                if (response.ok) {
                    alertPopup('success', 'Inventory report approved and inventory deducted successfully!');
                    location.reload(); // Reload to refresh reports
                } else {
                    const error = await response.json();
                    alertPopup('error', error.message || 'Failed to approve report.');
                }
            }
        });
        
        rejectBtn.addEventListener('click', () => {
            showRejectReportOverlay(report.report_id, 'inventory', () => location.reload());
        });
    }
    
    return card;
}

async function showInventoryReportDetails(report) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = `Inventory Report #${report.report_id} - ${dateFormatting(report.report_date, 'date')}`;

    const reportDetailsContainer = div('', 'report-details-overlay-content');
    reportDetailsContainer.innerHTML = `
        <p><strong>Project:</strong> ${report.project_name || 'N/A'}</p>
        <p><strong>Reported By:</strong> ${report.reported_by_name}</p>
        ${report.remarks ? `<p><strong>Remarks:</strong> ${report.remarks}</p>` : ''}
    `;

    const itemsHeader = div('', 'items-header');
    itemsHeader.innerText = 'Items Used';
    reportDetailsContainer.append(itemsHeader);

    const items = await fetchData(`/api/inventory-reports/${report.report_id}/items`);
    if (items !== 'error' && items.length > 0) {
        const tableHeaders = ['Item Name', 'Quantity Used', 'Task', 'Milestone'];
        const tableData = items.map(item => [
            item.item_name,
            item.quantity_used,
            item.task_name || 'N/A',
            item.milestone_name || 'N/A'
        ]);
        const itemsTable = createTable('inventoryItemsTable', tableHeaders, tableData);
        reportDetailsContainer.append(itemsTable);
    } else {
        const noItems = div('', 'no-items-message');
        noItems.innerText = 'No items reported in this inventory report.';
        reportDetailsContainer.append(noItems);
    }

    overlayBody.append(reportDetailsContainer);
    showOverlayWithBg(overlayBackground);
}

async function createInventoryReportOverlay(refreshReportsCallback) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = 'Create New Inventory Report';

    const form = document.createElement('form');
    form.id = 'inventoryReportForm';
    form.classList.add('form-edit-forms');

    const formHeader = div('', 'create-form-headers');
    const formFooter = div('', 'create-form-footers');

    const projects = await fetchData('/api/selection/project');
    const projectOptions = projects.map(p => ({ id: p.id, name: p.name }));
    const { select: projectSelect, container: projectSelectContainer } = createSelect('inventoryReportProjectSelect', 'Project', null, null, null, projectOptions);

    const reportDateInput = createInput('date', 'edit', 'Report Date', 'inventoryReportDate', 'report_date', new Date().toISOString().split('T')[0], '');
    const remarksInput = createInput('textarea', 'edit', 'Remarks (Optional)', 'inventoryRemarks', 'remarks', '', 'Add any additional remarks...');

    const itemsUsedHeader = div('', 'items-used-header');
    itemsUsedHeader.innerText = 'Items Used';
    const addRemoveItemBtnContainer = div('', 'add-remove-item-btn-container');
    const addItemBtn = createButton('addItemBtn', 'solid-buttons btn-blue', 'Add Item');
    addRemoveItemBtnContainer.append(addItemBtn);

    const itemsListContainer = div('itemsListContainer', 'items-list-container');
    let itemsUsed = []; // Array to hold items to be reported

    addItemBtn.addEventListener('click', async () => {
        const items = await fetchData('/api/materials'); // Fetch all materials
        const itemOptions = items.materials.map(i => ({ id: i.item_id, name: `${i.item_name} (${i.unit_name})` }));

        const tasks = await fetchData('/api/selection/task'); // Fetch all tasks for selected project
        const taskOptions = tasks.map(t => ({ id: t.id, name: t.name }));
        taskOptions.unshift({ id: '', name: 'No Specific Task' });

        const milestones = await fetchData('/api/milestones/' + projectSelect.dataset.value); // Fetch all milestones for selected project
        const milestoneOptions = milestones.map(m => ({ id: m.id, name: m.milestone_name }));
        milestoneOptions.unshift({ id: '', name: 'No Specific Milestone' });

        const itemEntryContainer = div('', 'item-entry-container');
        const { select: itemSelect, container: itemSelectContainer } = createSelect('itemSelect', 'Item', null, null, null, itemOptions);
        const quantityInput = createInput('number', 'edit', 'Quantity Used', 'quantityUsed', 'quantity_used', '', '0', 1);
        const { select: itemTaskSelect, container: itemTaskSelectContainer } = createSelect('itemTaskSelect', 'Task (Optional)', null, null, null, taskOptions);
        const { select: itemMilestoneSelect, container: itemMilestoneSelectContainer } = createSelect('itemMilestoneSelect', 'Milestone (Optional)', null, null, null, milestoneOptions);

        const removeItemBtn = createButton('removeItemBtn', 'solid-buttons btn-red', 'Remove');
        removeItemBtn.addEventListener('click', () => {
            itemEntryContainer.remove();
            itemsUsed = itemsUsed.filter(item => item !== itemEntryContainer); // Remove from array
        });

        itemEntryContainer.append(
            itemSelectContainer,
            quantityInput,
            itemTaskSelectContainer,
            itemMilestoneSelectContainer,
            removeItemBtn
        );
        itemsListContainer.append(itemEntryContainer);
        itemsUsed.push(itemEntryContainer); // Add to array for later retrieval
    });

    formHeader.append(
        projectSelectContainer,
        reportDateInput,
        remarksInput,
        itemsUsedHeader,
        addRemoveItemBtnContainer,
        itemsListContainer
    );

    const cancelBtn = createButton('cancelInventoryReportBtn', 'wide-buttons', 'Cancel');
    cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    const saveInventoryReportBtn = createButton('saveInventoryReportBtn', 'wide-buttons btn-blue', 'Create Report');
    saveReportBtn.addEventListener('click', async () => {
        const projectId = projectSelect.dataset.value;
        const reportDate = reportDateInput.querySelector('input').value;
        const remarks = remarksInput.querySelector('textarea').value;

        if (!projectId || !reportDate) {
            return alertPopup('error', 'Project and Report Date are required.');
        }

        const itemsToReport = itemsUsed.map(itemContainer => {
            const item_id = itemContainer.querySelector('#itemSelect').dataset.value;
            const quantity_used = parseInt(itemContainer.querySelector('#quantityUsed input').value);
            const task_id = itemContainer.querySelector('#itemTaskSelect').dataset.value || null;
            const milestone_id = itemContainer.querySelector('#itemMilestoneSelect').dataset.value || null;

            if (!item_id || isNaN(quantity_used) || quantity_used <= 0) {
                alertPopup('error', 'Please ensure all items have a valid item and quantity.');
                throw new Error('Invalid item data');
            }
            return { item_id: parseInt(item_id), quantity_used, task_id: task_id ? parseInt(task_id) : null, milestone_id: milestone_id ? parseInt(milestone_id) : null };
        });

        if (itemsToReport.length === 0) {
            return alertPopup('error', 'At least one item must be added to the inventory report.');
        }

        const payload = {
            project_id: parseInt(projectId),
            report_date: reportDate,
            remarks: remarks,
            items_used: itemsToReport
        };

        try {
            const response = await fetchPostJson('/api/inventory-reports', 'POST', payload);
            if (response.status === 'success') {
                alertPopup('success', 'Inventory report created successfully!');
                hideOverlayWithBg(overlayBackground);
                refreshReportsCallback();
            } else {
                alertPopup('error', response.message || 'Failed to create inventory report.');
            }
        } catch (error) {
            alertPopup('error', error.message || 'An unexpected error occurred.');
        }
    });

    formFooter.append(cancelBtn, saveReportBtn);
    form.append(formHeader, formFooter);
    overlayBody.append(form);
    showOverlayWithBg(overlayBackground);
}

function showRejectReportOverlay(reportId, reportType, refreshCallback) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = `Reject ${reportType === 'progress' ? 'Progress' : 'Inventory'} Report`;

    const form = document.createElement('form');
    form.classList.add('form-edit-forms');

    const formBody = div('', 'reject-form-body');
    
    const remarksLabel = document.createElement('label');
    remarksLabel.classList.add('input-labels');
    remarksLabel.innerText = 'Rejection Reason';
    
    const remarksTextarea = document.createElement('textarea');
    remarksTextarea.classList.add('form-textarea');
    remarksTextarea.placeholder = 'Please provide a reason for rejecting this report...';
    remarksTextarea.style.width = '100%';
    remarksTextarea.style.minHeight = '120px';
    remarksTextarea.style.padding = '10px';
    remarksTextarea.style.borderRadius = '4px';
    remarksTextarea.style.border = '1px solid #ddd';
    remarksTextarea.style.fontFamily = 'inherit';
    
    formBody.append(remarksLabel, remarksTextarea);

    const formFooter = div('', 'create-form-footers');
    const cancelBtn = createButton('cancelRejectBtn', 'wide-buttons', 'Cancel');
    cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    const rejectBtn = createButton('submitRejectBtn', 'wide-buttons btn-red', 'Reject Report');
    rejectBtn.addEventListener('click', async () => {
        const remarks = remarksTextarea.value.trim();
        
        if (!remarks) {
            return alertPopup('error', 'Please provide a rejection reason.');
        }

        const endpoint = reportType === 'progress' 
            ? `/api/progress-reports/${reportId}/reject`
            : `/api/inventory-reports/${reportId}/reject`;

        try {
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ remarks })
            });

            if (response.ok) {
                alertPopup('success', 'Report rejected successfully.');
                hideOverlayWithBg(overlayBackground);
                refreshCallback();
            } else {
                const error = await response.json();
                alertPopup('error', error.message || 'Failed to reject report.');
            }
        } catch (error) {
            alertPopup('error', error.message || 'An error occurred.');
        }
    });

    formFooter.append(cancelBtn, rejectBtn);
    form.append(formBody, formFooter);
    overlayBody.append(form);
    showOverlayWithBg(overlayBackground);
}
