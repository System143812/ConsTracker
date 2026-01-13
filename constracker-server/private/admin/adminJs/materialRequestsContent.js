import { fetchData } from "/js/apiURL.js";
import { div, span, createButton, createFilterContainer, createPaginationControls, createInput, createItemSearch } from "/js/components.js";
import { showEmptyPlaceholder } from "/js/popups.js";
import { createOverlayWithBg, hideOverlayWithBg } from "/mainJs/overlays.js";
import { dateFormatting } from "/js/string.js";

async function createMaterialRequestOverlay(refreshCallback) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = 'Create Material Request';

    let requestedItems = [];

    const form = document.createElement('form');
    form.id = 'materialRequestForm';

    // --- Project and Type Selection ---
    const projects = await fetchData('/api/selection/project');
    if (projects === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load projects.');
    }
    const requestTypes = [{ id: 'supplier', name: 'Supplier' }, { id: 'main_inventory', name: 'Main Inventory' }];
    const suppliers = await fetchData('/api/materials/suppliers');
     if (suppliers === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load suppliers.');
    }

    const projectSelect = createFilterInput('select', 'dropdown', 'requestProject', 'project_id', 'all', 'Select a project', null, 'single', 1, projects);
    const requestTypeSelect = createFilterInput('select', 'dropdown', 'requestType', 'request_type', 'all', 'Select request type', null, 'single', 1, requestTypes);
    const supplierSelect = createFilterInput('select', 'dropdown', 'requestSupplier', 'supplier_id', 'all', 'Select a supplier', null, 'single', 1, suppliers);
    supplierSelect.style.display = 'none'; // Initially hidden

    requestTypeSelect.querySelector('.dropdown-input').addEventListener('change', () => {
        if (requestTypeSelect.dataset.value === 'supplier') {
            supplierSelect.style.display = 'block';
        } else {
            supplierSelect.style.display = 'none';
        }
    });
    
    // --- Items Section ---
    const itemsHeader = document.createElement('h4');
    itemsHeader.innerText = 'Requested Items';
    const itemsContainer = div('request-items-container');
    const addItemBtn = createButton('addItemBtn', 'text-buttons', '+ Add Item');
    
    const renderRequestedItems = () => {
        itemsContainer.innerHTML = '';
        if (requestedItems.length === 0) {
            itemsContainer.innerText = 'No items added yet.';
            return;
        }
        requestedItems.forEach((item, index) => {
            const itemElement = div('requested-item', `req-item-${index}`);
            itemElement.innerHTML = `<span>${item.item_name} (Qty: ${item.quantity})</span>`;
            const removeBtn = createButton('remove-item', 'icon-buttons', 'x');
            removeBtn.addEventListener('click', () => {
                requestedItems.splice(index, 1);
                renderRequestedItems();
            });
            itemElement.append(removeBtn);
            itemsContainer.append(itemElement);
        });
    };

    addItemBtn.addEventListener('click', () => {
        createItemSearch(async (selectedItem) => {
            const quantity = prompt(`Enter quantity for ${selectedItem.item_name}:`);
            if (quantity && !isNaN(quantity) && Number(quantity) > 0) {
                requestedItems.push({ ...selectedItem, quantity: Number(quantity) });
                renderRequestedItems();
            } else if (quantity) {
                alert('Please enter a valid positive number for the quantity.');
            }
        });
    });

    // --- Footer and Submit Buttons ---
    const footer = div('request-footer');
    const saveDraftBtn = createButton('saveDraftBtn', 'wide-buttons', 'Save as Draft');
    const submitBtn = createButton('submitRequestBtn', 'wide-buttons solid-buttons', 'Submit Request');
    
    const handleSubmit = async (status) => {
        const payload = {
            project_id: projectSelect.dataset.value,
            request_type: requestTypeSelect.dataset.value,
            supplier_id: requestTypeSelect.dataset.value === 'supplier' ? supplierSelect.dataset.value : null,
            items: requestedItems,
            status: status
        };

        if (!payload.project_id || !payload.request_type || (payload.request_type === 'supplier' && !payload.supplier_id) || payload.items.length === 0) {
            alert('Please fill all required fields and add at least one item.');
            return;
        }

        const result = await fetchData('/api/material-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (result.status === 'success') {
            hideOverlayWithBg(overlayBackground);
            if (refreshCallback) refreshCallback();
            alert('Request successfully created!');
        } else {
            console.error('Failed to create request:', result);
            alert('Failed to create request.');
        }
    };

    saveDraftBtn.addEventListener('click', () => handleSubmit('DRAFT'));
    submitBtn.addEventListener('click', () => handleSubmit('requested'));

    footer.append(saveDraftBtn, submitBtn);
    form.append(projectSelect, requestTypeSelect, supplierSelect, itemsHeader, itemsContainer, addItemBtn, footer);
    overlayBody.append(form);

    renderRequestedItems(); // Initial render
}

async function showMaterialRequestDetails(requestId, refreshCallback) {
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

    const deliveriesHeader = document.createElement('h3');
    deliveriesHeader.innerText = 'Deliveries';
    overlayBody.append(deliveriesHeader);

    const deliveriesContainer = div('deliveries-container');
    overlayBody.append(deliveriesContainer);

    const deliveriesData = await fetchData(`/api/material-requests/${requestId}/deliveries`);
    if (deliveriesData && deliveriesData.length > 0) {
        const deliveriesTable = document.createElement('table');
        const dThead = document.createElement('thead');
        dThead.innerHTML = `<tr><th>Date</th><th>Delivered By</th><th>Status</th><th>Acknowledged By</th></tr>`;
        const dTbody = document.createElement('tbody');
        deliveriesData.forEach(delivery => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${dateFormatting(delivery.delivery_date, 'date')}</td>
                <td>${delivery.delivered_by}</td>
                <td>${delivery.delivery_status}</td>
                <td>${delivery.acknowledged_by_name}</td>
            `;
            dTbody.append(row);
        });
        deliveriesTable.append(dThead, dTbody);
            deliveriesContainer.append(deliveriesTable);
        } else {
            deliveriesContainer.innerText = 'No deliveries recorded yet.';
        }
        
        const activityHeader = document.createElement('h3');
        activityHeader.innerText = 'Activity Log';
        overlayBody.append(activityHeader);
        
        const activityContainer = div('activity-log-container');
        overlayBody.append(activityContainer);
        
        const actionsData = await fetchData(`/api/material-requests/${requestId}/actions`);
        if (actionsData && actionsData.length > 0) {
            actionsData.forEach(action => {
                const actionElement = div('', 'activity-log-item');
                actionElement.innerHTML = `
                    <p class="action-info"><strong>${action.action.toUpperCase()}</strong> by ${action.performed_by_name}</p>
                    <p class="action-date">${dateFormatting(action.created_at, 'dateTime')}</p>
                    ${action.remarks ? `<p class="action-remarks">Remarks: ${action.remarks}</p>` : ''}
                `;
                activityContainer.append(actionElement);
            });
        } else {
            activityContainer.innerText = 'No actions recorded yet.';
        }
        
        const actionsContainer = div('', 'request-actions-container');
    if (header.status === 'requested') {
        const remarksInput = createInput('text', 'remarks', 'remarks', '', 'Add remarks (optional)...');
        
        const approveButton = createButton('approveRequestBtn', 'solid-buttons', 'Approve');
        approveButton.addEventListener('click', async () => {
            const remarks = document.getElementById('remarks').value;
            const result = await fetchData(`/api/material-requests/${requestId}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remarks })
            });

            if (result.status === 'success') {
                hideOverlayWithBg(overlayBackground);
                if (refreshCallback) refreshCallback();
            } else {
                console.error('Failed to approve request:', result);
            }
        });

        const declineButton = createButton('declineRequestBtn', 'danger-buttons', 'Decline');
        declineButton.addEventListener('click', async () => {
            const remarks = document.getElementById('remarks').value;
            const result = await fetchData(`/api/material-requests/${requestId}/decline`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remarks })
            });

            if (result.status === 'success') {
                hideOverlayWithBg(overlayBackground);
                if (refreshCallback) refreshCallback();
            } else {
                console.error('Failed to decline request:', result);
            }
        });

        actionsContainer.append(remarksInput, approveButton, declineButton);
    }

    if (header.status === 'approved') {
        const remarksInput = createInput('text', 'remarks', 'remarks', '', 'Add remarks (optional)...');
        const orderButton = createButton('orderRequestBtn', 'solid-buttons', 'Mark as Ordered');
        orderButton.addEventListener('click', async () => {
            const remarks = document.getElementById('remarks').value;
            const result = await fetchData(`/api/material-requests/${requestId}/order`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remarks })
            });
            if (result.status === 'success') {
                hideOverlayWithBg(overlayBackground);
                if (refreshCallback) refreshCallback();
            } else {
                console.error('Failed to mark as ordered:', result);
            }
        });
        actionsContainer.append(remarksInput, orderButton);
    }

    if (header.status === 'ordered') {
        const recordDeliveryButton = createButton('recordDeliveryBtn', 'solid-buttons', 'Record Delivery');
        recordDeliveryButton.addEventListener('click', () => {
            createDeliveryOverlay(requestId, refreshCallback);
        });
        actionsContainer.append(recordDeliveryButton);
    }

    if (header.status === 'verifying' || header.status === 'partially_verified') {
        const verifyButton = createButton('verifyDeliveryBtn', 'solid-buttons', 'Verify Items');
        verifyButton.addEventListener('click', () => {
            createVerificationOverlay(requestId, items, refreshCallback);
        });
        actionsContainer.append(verifyButton);
    }

    if (['verified', 'partially_verified', 'disputed'].includes(header.status)) {
        const reviewRemarks = createInput('text', 'review_remarks', 'reviewRemarks', '', 'Add review comments...');
        const reviewButton = createButton('submitReviewBtn', 'solid-buttons', 'Submit Review');

        reviewButton.addEventListener('click', async () => {
            const remarks = document.getElementById('reviewRemarks').value;
            if (!remarks) {
                alert('Review comments cannot be empty.');
                return;
            }

            const result = await fetchData(`/api/material-requests/${requestId}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remarks })
            });

            if (result.status === 'success') {
                hideOverlayWithBg(overlayBackground);
                showMaterialRequestDetails(requestId, refreshCallback);
            } else {
                console.error('Failed to submit review:', result);
            }
        });

        actionsContainer.append(reviewRemarks, reviewButton);
    }

    overlayBody.append(actionsContainer);


    const closeButton = createButton('closeOverlayBtn', 'wide-buttons', 'Close');
    closeButton.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
    overlayBody.append(closeButton);
}

function createVerificationOverlay(requestId, items, refreshCallback) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = `Verify Items for Request #${requestId}`;

    const form = document.createElement('form');
    form.id = 'verificationForm';

    const verificationItemsContainer = div('verification-items-container');
    
    items.forEach(item => {
        const itemContainer = div(`verify-item-${item.id}`, 'verification-item');
        
        itemContainer.innerHTML = `
            <span class="item-name">${item.item_name}</span>
            <span class="item-qty">Pending: ${item.pending_quantity}</span>
        `;
        
        const acceptedInput = createInput('number', `accepted_${item.id}`, `accepted_qty_${item.id}`, '', 'Accepted Qty');
        acceptedInput.min = 0;
        const rejectedInput = createInput('number', `rejected_${item.id}`, `rejected_qty_${item.id}`, '', 'Rejected Qty');
        rejectedInput.min = 0;
        const remarksInput = createInput('text', `remarks_${item.id}`, `remarks_${item.id}`, '', 'Remarks');
        
        itemContainer.append(acceptedInput, rejectedInput, remarksInput);
        verificationItemsContainer.append(itemContainer);
    });

    form.append(verificationItemsContainer);

    const submitButton = createButton('submitVerification', 'solid-buttons', 'Submit Verification');
    submitButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        let validationFailed = false;
        const verificationData = items.map(item => {
            const accepted_qty = parseInt(document.getElementById(`accepted_qty_${item.id}`).value) || 0;
            const rejected_qty = parseInt(document.getElementById(`rejected_qty_${item.id}`).value) || 0;
            const remarks = document.getElementById(`remarks_${item.id}`).value;
            
            if (accepted_qty + rejected_qty > item.pending_quantity) {
                console.error(`Qty for ${item.item_name} exceeds pending quantity.`);
                validationFailed = true;
                return null; 
            }
            
            return {
                mr_item_id: item.id,
                accepted_qty,
                rejected_qty,
                remarks
            };
        }).filter(Boolean);

        if (validationFailed) {
            // Show error popup to the user
            alert('One or more item quantities exceed the pending amount.');
            return;
        }

        if (verificationData.length === 0) {
            alert('No quantities were entered for verification.');
            return;
        }

        const result = await fetchData(`/api/material-requests/${requestId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verificationData)
        });

        if (result.status === 'success') {
            hideOverlayWithBg(overlayBackground);
            if (refreshCallback) refreshCallback();
        } else {
            console.error('Failed to submit verification:', result);
        }
    });

    overlayBody.append(form, submitButton);

    const closeButton = createButton('closeOverlayBtn', 'wide-buttons', 'Cancel');
    closeButton.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
    overlayBody.append(closeButton);
}


function createDeliveryOverlay(requestId, refreshCallback) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = `Record Delivery for Request #${requestId}`;

    const form = document.createElement('form');

    const deliveredByInput = createInput('text', 'delivered_by', 'deliveredBy', '', 'Delivered By');
    const deliveryDateInput = createInput('date', 'delivery_date', 'deliveryDate', '', 'Delivery Date');
    
    const statusLabel = document.createElement('label');
    statusLabel.textContent = 'Delivery Status';
    const deliveryStatusSelect = document.createElement('select');
    deliveryStatusSelect.id = 'deliveryStatus';
    const statuses = ['partial', 'complete'];
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        deliveryStatusSelect.append(option);
    });
    
    const submitButton = createButton('submitDelivery', 'solid-buttons', 'Submit');
    submitButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const deliveryData = {
            delivered_by: document.getElementById('deliveredBy').value,
            delivery_date: document.getElementById('deliveryDate').value,
            delivery_status: document.getElementById('deliveryStatus').value
        };

        if (!deliveryData.delivered_by || !deliveryData.delivery_date) {
            // handle error - maybe replace with a popup
            console.error("Delivery person and date are required.");
            return;
        }

        const result = await fetchData(`/api/material-requests/${requestId}/deliveries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deliveryData)
        });

        if (result.status === 'success') {
            hideOverlayWithBg(overlayBackground);
            if (refreshCallback) refreshCallback();
        } else {
            console.error('Failed to record delivery:', result);
        }
    });

    form.append(deliveredByInput, deliveryDateInput, statusLabel, deliveryStatusSelect, submitButton);
    overlayBody.append(form);

    const closeButton = createButton('closeOverlayBtn', 'wide-buttons', 'Cancel');
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
    subtitle.innerText = 'Browse and manage all material requests.';
    bodyHeaderContainer.append(title, subtitle);
    const createRequestBtn = createButton('createRequestBtn', 'solid-buttons', 'Create Request', 'createRequestBtnText', 'addIcon');
    createRequestBtn.addEventListener('click', () => createMaterialRequestOverlay(renderMaterialRequests));
    bodyHeader.append(bodyHeaderContainer, createRequestBtn);

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
            row.addEventListener('click', () => showMaterialRequestDetails(request.id, renderMaterialRequests));
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
