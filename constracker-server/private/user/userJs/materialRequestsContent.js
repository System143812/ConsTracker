import { fetchData } from "/js/apiURL.js";
import { div, span, createButton, createFilterContainer, createPaginationControls } from "/js/components.js";
import { showEmptyPlaceholder } from "/js/popups.js";
import { createOverlayWithBg, hideOverlayWithBg } from "/mainJs/overlays.js";
import { dateFormatting } from "/js/string.js";

async function showMaterialRequestDetails(requestId) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = `Material Request #${requestId}`;

    const data = await fetchData(`/api/material-requests/${requestId}`);
    if (data === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to fetch material request details.');
    }

    const { header, items } = data;

    const headerInfo = div('', 'request-header-info');
    headerInfo.innerHTML = `
        <p><strong>Project:</strong> ${header.project_name}</p>
        <p><strong>Request Type:</strong> ${header.request_type}</p>
        <p><strong>Supplier:</strong> ${header.supplier_name || 'N/A'}</p>
        <p><strong>Status:</strong> ${header.status}</p>
        <p><strong>Requester:</strong> ${header.requester_name}</p>
        <p><strong>Approver:</strong> ${header.approver_name || 'N/A'}</p>
        <p><strong>Approved At:</strong> ${header.approved_at ? dateFormatting(header.approved_at, 'dateTime') : 'N/A'}</p>
    `;
    overlayBody.append(headerInfo);

    const itemsTable = document.createElement('table');
    itemsTable.classList.add('request-items-table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const headers = ['Item', 'Requested', 'Received', 'Accepted', 'Rejected', 'Pending'];
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.innerText = headerText;
        headerRow.append(th);
    });
    thead.append(headerRow);

    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.item_name}</td>
            <td>${item.requested_quantity}</td>
            <td>${item.received_quantity}</td>
            <td>${item.accepted_quantity}</td>
            <td>${item.rejected_quantity}</td>
            <td>${item.pending_quantity}</td>
        `;
        tbody.append(row);
    });

    itemsTable.append(thead, tbody);
    overlayBody.append(itemsTable);

    const closeButton = createButton('closeOverlayBtn', 'wide-buttons', 'Close');
    closeButton.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
    overlayBody.append(closeButton);
}

export async function generateMaterialRequestsContent(role) {
    const materialRequestsBodyContent = document.getElementById('material-requestsBodyContainer'); 
    materialRequestsBodyContent.innerHTML = '';

    const bodyHeader = div('', 'body-header');
    const bodyHeaderContainer = div('', 'body-header-container');
    const title = span('', 'body-header-title');
    title.innerText = 'Material Requests';
    const subtitle = span('', 'body-header-subtitle');
    subtitle.innerText = 'Browse and manage your material requests.';
    bodyHeaderContainer.append(title, subtitle);
    bodyHeader.append(bodyHeaderContainer);

    const materialRequestsContainer = div('material-requests-main-container');
    const filterContainer = div('material-requests-filter-container');
    const materialRequestsListContainer = div('material-requests-list-container');
    const paginationContainer = div('material-requests-pagination-container', 'pagination-container');
    
    materialRequestsContainer.append(filterContainer, materialRequestsListContainer, paginationContainer);
    materialRequestsBodyContent.append(bodyHeader, materialRequestsContainer);

    let currentPage = 1;
    let itemsPerPage = 10;
    
    async function renderMaterialRequests(urlParams = new URLSearchParams()) {
        materialRequestsListContainer.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);

        const data = await fetchData(`/api/material-requests?${urlParams.toString()}`);
        materialRequestsListContainer.innerHTML = '';
        
        if (data === 'error' || data.requests.length === 0) {
            showEmptyPlaceholder('/assets/icons/materialsRequest.png', materialRequestsListContainer, null, "No material requests found.");
            return;
        }

        const table = document.createElement('table');
        table.classList.add('material-requests-table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headers = ['Request ID', 'Project', 'Requester', 'Type', 'Stage', 'Item Count', 'Total Cost', 'Date'];
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.innerText = headerText;
            headerRow.append(th);
        });
        thead.append(headerRow);

        data.requests.forEach(request => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${request.id}</td>
                <td>${request.project_name}</td>
                <td>${request.requester_name}</td>
                <td>${request.request_type}</td>
                <td>${request.current_stage}</td>
                <td>${request.item_count}</td>
                <td>₱${request.total_cost ? request.total_cost.toLocaleString() : '0'}</td>
                <td>${dateFormatting(request.created_at, 'dateTime')}</td>
            `;
            row.addEventListener('click', () => showMaterialRequestDetails(request.id));
            tbody.append(row);
        });

        table.append(thead, tbody);
        materialRequestsListContainer.append(table);

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: data.total,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderMaterialRequests(urlParams);
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1;
                renderMaterialRequests(urlParams);
            }
        });
        paginationContainer.append(paginationControls);
    }

    async function applyFilterToMaterialRequests(filteredUrlParams) {
        currentPage = 1;
        await renderMaterialRequests(filteredUrlParams);
    }

    const filters = await createFilterContainer(
        applyFilterToMaterialRequests,
        'Search by requester...', 
        { project: true, request_type: true, current_stage: true, dateFrom: true, dateTo: true, requester: true, sort: true },
        'requester',
        'newest'
    );
    
    filterContainer.append(filters);

    await renderMaterialRequests(new URLSearchParams());
}
