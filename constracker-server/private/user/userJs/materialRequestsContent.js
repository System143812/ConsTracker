import { fetchData } from "/js/apiURL.js";
import { div, span, createButton, createFilterContainer, createPaginationControls, createFilterInput } from "/js/components.js";
import { showEmptyPlaceholder } from "/js/popups.js";
import { createOverlayWithBg, hideOverlayWithBg, showOverlayWithBg } from "/mainJs/overlays.js";
import { dateFormatting } from "/js/string.js";

async function showMaterialRequestDetails(requestId, requestCode) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = `Material Request ${requestCode}`;

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
    const materialRequestsBodyContainer = document.getElementById('material-requestsBodyContainer'); 
    materialRequestsBodyContainer.innerHTML = '';

    // Setup header section
    const materialRequestsBodyHeader = div('material-requestsBodyHeader', 'body-header');
    const bodyHeaderContainer = div('', 'body-header-container');
    const title = div('', 'body-header-title');
    title.innerText = 'Material Requests';
    const subtitle = div('', 'body-header-subtitle');
    subtitle.innerText = 'Browse and manage your material requests.';
    bodyHeaderContainer.append(title, subtitle);
    materialRequestsBodyHeader.append(bodyHeaderContainer);

    // Setup content section
    const materialRequestsBodyContent = div('material-requestsBodyContent', 'body-content');
    const filterContainer = div('material-requests-filter-container');
    const materialRequestsListContainer = div('material-requests-list-container');
    const paginationContainer = div('material-requests-pagination-container', 'pagination-container');
    
    materialRequestsBodyContent.append(filterContainer, materialRequestsListContainer, paginationContainer);
    materialRequestsBodyContainer.append(materialRequestsBodyHeader, materialRequestsBodyContent);

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

        data.requests.forEach(request => {
            const requestCardContainer = div(`requestCardContainer`, `request-card-container`);
            requestCardContainer.classList.add('hoverable');
            requestCardContainer.addEventListener('click', () => showMaterialRequestDetails(request.id, request.request_code, renderMaterialRequests));
            const requestCardLeft = div(`requestCardLeft`, `request-card-left`);
            const requestCardHeader = div(`requestCardHeader`, `request-card-header`);
            const requestCardTitle = div(`requestCardTitle`, `request-card-title`);
            requestCardTitle.innerText = `${request.project_name}`;
            const requestCardPriority = div(`requestCardPriority`, `request-card-priority`);
            if(request.priority_level === "medium") warnType(requestCardPriority, "solid", 'yellow', '', '');
            if(request.priority_level === "low") warnType(requestCardPriority, "solid", 'green', '', '');
            if(request.priority_level === "high") warnType(requestCardPriority, "solid", 'red', '', '');
            requestCardPriority.innerText = `${request.priority_level} Priority`;
            const requestCardBody = div(`requestCardBody`, `request-card-body`);
            const requestCardName = div(`requestCardName`, `request-card-name`);
            requestCardName.innerText = `Requested by ${request.requester_name} • `;
            const requestCardItemCount = div(`requestCardItemCount`, `request-card-item-count`);
            requestCardItemCount.innerText = `${request.item_count} items • `; 
            const requestCardCost = div(`requestCardCost`, `request-card-cost`);
            requestCardCost.innerText = `₱${request.total_cost ? request.total_cost.toLocaleString() : '0'}`;
            const requestCardRight = div(`requestCardRight`, `request-card-right`);
            const requestStatusContainer = div(`requestStatusContainer`, `request-status-container`);
            const requestStatusIcon = div(`requestStatusIcon`, `request-status-icon`);
            requestStatusIcon.classList.add('icons');
            const requestStatusLabel = div(`requestStatusLabel`, `request-status-label`);
            if(request.current_stage === "pending") warnType(requestStatusContainer, "", 'yellow', requestStatusIcon, requestStatusLabel);
            if(request.current_stage === "approved") warnType(requestStatusContainer, "", 'green', requestStatusIcon, requestStatusLabel);
            if(request.current_stage === "rejected") warnType(requestStatusContainer, "", 'red', requestStatusIcon, requestStatusLabel);
            requestStatusLabel.innerText = `${request.current_stage}`;
            const requestCardDate = div(`requestCardDate`, `request-card-date`);
            requestCardDate.innerText = `${dateFormatting(request.created_at, 'dateTime')}`; 
            
            requestCardContainer.append(requestCardLeft, requestCardRight);
            requestCardLeft.append(requestCardHeader, requestCardBody, requestCardDate);
            requestCardHeader.append(requestCardTitle, requestCardPriority);
            requestCardBody.append(requestCardName, requestCardItemCount, requestCardCost);
            requestCardRight.append(requestStatusContainer);
            requestStatusContainer.append(requestStatusIcon, requestStatusLabel);
            materialRequestsListContainer.append(requestCardContainer);
        });

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
