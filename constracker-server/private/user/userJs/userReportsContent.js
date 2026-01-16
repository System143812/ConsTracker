import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, button, createButton, createFilterContainer, createPaginationControls, createInput, createFilterInput, editFormButton, validateInput, createSelect, createTable, createTableRow, createTableCell, createTableHeader } from "/js/components.js";
import { createOverlayWithBg, hideOverlayWithBg, showOverlayWithBg } from "/mainJs/overlays.js";

export async function generateReportsContent(role) {
    const reportsBodyContent = document.getElementById('reportsBodyContainer');
    reportsBodyContent.innerHTML = ''; // Clear existing content

    const bodyHeader = div('', 'body-header');
    const bodyHeaderContainer = div('', 'body-header-container');
    const title = span('', 'body-header-title');
    title.innerText = 'Reports';
    const subtitle = span('', 'body-header-subtitle');
    subtitle.innerText = 'Generate and view detailed project reports';
    bodyHeaderContainer.append(title, subtitle);
    bodyHeader.append(bodyHeaderContainer);

    const reportTypesContainer = div('reportTypesContainer', 'report-types-container');
    const progressReportBtn = createButton('progressReportBtn', 'solid-buttons btn-blue', 'Progress Reports');
    const inventoryReportBtn = createButton('inventoryReportBtn', 'solid-buttons btn-blue', 'Inventory Reports');

    reportTypesContainer.append(progressReportBtn, inventoryReportBtn);

    const reportsDisplayArea = div('reportsDisplayArea', 'reports-display-area');

    reportsBodyContent.append(bodyHeader, reportTypesContainer, reportsDisplayArea);

    progressReportBtn.addEventListener('click', () => displayProgressReports(reportsDisplayArea, role));
    inventoryReportBtn.addEventListener('click', () => displayInventoryReports(reportsDisplayArea, role));

    // Initially display progress reports
    await displayProgressReports(reportsDisplayArea, role);
}

async function displayProgressReports(displayArea, role) {
    displayArea.innerHTML = '';
    const header = div('', 'sub-report-header');
    header.innerText = 'Progress Reports';
    displayArea.append(header);

    const filterContainer = div('progressReportsFilterContainer', 'filter-container');
    const reportsListContainer = div('progressReportsListContainer', 'reports-list-container');
    const paginationContainer = div('progressReportsPaginationContainer', 'pagination-container');

    displayArea.append(filterContainer, reportsListContainer, paginationContainer);

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
    card.innerHTML = `
        <div class="report-card-header">
            <span class="report-title">Report #${report.report_id}</span>
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
        </div>
    `;
    const viewDetailsBtn = card.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', () => showProgressReportDetails(report));
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


async function displayInventoryReports(displayArea, role) {
    displayArea.innerHTML = '';
    const header = div('', 'sub-report-header');
    header.innerText = 'Inventory Reports';
    displayArea.append(header);

    const filterContainer = div('inventoryReportsFilterContainer', 'filter-container');
    const reportsListContainer = div('inventoryReportsListContainer', 'reports-list-container');
    const paginationContainer = div('inventoryReportsPaginationContainer', 'pagination-container');

    displayArea.append(filterContainer, reportsListContainer, paginationContainer);

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
    card.innerHTML = `
        <div class="report-card-header">
            <span class="report-title">Report #${report.report_id}</span>
            <span class="report-date">${dateFormatting(report.report_date, 'date')}</span>
        </div>
        <div class="report-card-body">
            <p><strong>Project:</strong> ${report.project_name || 'N/A'}</p>
            <p><strong>Reported By:</strong> ${report.reported_by_name}</p>
            ${report.remarks ? `<p><strong>Remarks:</strong> ${report.remarks}</p>` : ''}
        </div>
        <div class="report-card-footer">
            <button class="solid-buttons blue view-details-btn">View Details</button>
        </div>
    `;
    const viewDetailsBtn = card.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', () => showInventoryReportDetails(report));
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
