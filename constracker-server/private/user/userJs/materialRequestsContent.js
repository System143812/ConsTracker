import { fetchData } from "/js/apiURL.js";
import { div, span, createButton, createFilterContainer, createPaginationControls, createInput, createItemSearch, createFilterInput, createSelect } from "/js/components.js";
import { showEmptyPlaceholder, warnType } from "/js/popups.js";
import { createOverlayWithBg, hideOverlayWithBg, showOverlayWithBg } from "/mainJs/overlays.js";
import { dateFormatting, formatString } from "/js/string.js";

function validateFilterInput(filterInput) {
    const value = filterInput.dataset.value;
    if (!value || value === 'all' || value === '') {
        filterInput.classList.add('error');
        return false;
    } else {
        filterInput.classList.remove('error');
        return true;
    }
}

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
    const approverSelect = createFilterInput('select', 'dropdown', 'requestApprover', 'approver_id', 'all', 'Select an approver', null, 'single', 1, []);
    approverSelect.style.display = 'none'; // Initially hidden

    projectSelect.addEventListener("change", async () => {
        const projectId = projectSelect.dataset.value;
        const optionOverlay = approverSelect.querySelector('.selection-overlays');
        optionOverlay.innerHTML = ''; // Clear existing options

        if (projectId && projectId !== 'all') {
            const personnel = await fetchData(`/api/projects/${projectId}/personnel`);
            if (personnel !== 'error' && personnel.personnel) {
                const approverOptions = personnel.personnel.map(p => ({ id: p.user_id, name: p.full_name }));
                
                approverOptions.forEach(option => {
                    const optionCard = div('optionCard', 'option-cards');
                    optionCard.dataset.value = option.id;
                    const optionCardTitle = div('', 'option-card-titles');
                    const optionCardName = span('', 'option-card-names');
                    optionCardName.innerText = option.name;
                    const optionCardIcon = span('', 'option-card-icons');
                    optionCardIcon.classList.add('btn-icons');
                    optionCardTitle.append(optionCardName);
                    optionCard.append(optionCardTitle, optionCardIcon);
                    optionOverlay.append(optionCard);
                    
                    optionCard.addEventListener("click", () => {
                        if (optionCard.classList.contains('selected')) {
                            optionCard.classList.remove('selected');
                            approverSelect.dataset.value = 'all';
                            approverSelect.querySelector('.select-option-text').innerText = 'Select an approver';
                        } else {
                            const allCards = optionOverlay.querySelectorAll('.option-cards');
                            allCards.forEach(card => card.classList.remove('selected'));
                            optionCard.classList.add('selected');
                            approverSelect.dataset.value = option.id;
                            approverSelect.querySelector('.btn-texts').innerText = option.name;
                        }
                    });
                });
                approverSelect.style.display = 'block';
            } else {
                approverSelect.style.display = 'none';
            }
        } else {
            approverSelect.style.display = 'none';
        }
    });

    requestTypeSelect.addEventListener("click", () => {
        if (requestTypeSelect.dataset.value === 'supplier') {
            supplierSelect.style.display = 'block';
        } else {
            supplierSelect.style.display = 'none';
        }
    });

    // --- Category and Unit Selection for Material Request ---
    const categories = await fetchData('/api/materials/categories');
    const units = await fetchData('/api/materials/units');
    
    if (categories === 'error' || units === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load material data.');
    }

    const { container: categorySelectContainer, select: categorySelect } = createSelect('requestCategorySelect', 'Category (Filter)', null, null, 'all', categories);
    const { container: unitSelectContainer, select: unitSelect } = createSelect('requestUnitSelect', 'Unit (Filter)', null, null, 'all', units);
    
    // Initially hide unit select
    unitSelectContainer.style.display = 'none';

    // Add category change listener for dynamic unit visibility and population
    categorySelect.addEventListener('change', async (e) => {
        const selectedCategoryId = categorySelect.dataset.value;
        
        if (!selectedCategoryId || selectedCategoryId === 'all') {
            // Hide unit select and reset it completely
            unitSelectContainer.style.display = 'none';
            unitSelect.innerHTML = '<option value="all">Select Unit</option>';
            unitSelect.value = 'all';
            unitSelect.dataset.value = 'all';
        } else {
            // Fetch units for the selected category
            const categoryUnits = await fetchData(`/api/materials/categories/${selectedCategoryId}/units`);
            
            if (categoryUnits !== 'error' && Array.isArray(categoryUnits) && categoryUnits.length > 0) {
                // Clear existing options
                unitSelect.innerHTML = '<option value="all">Select Unit</option>';
                
                // Populate with category-specific units
                categoryUnits.forEach(unit => {
                    const option = document.createElement('option');
                    option.value = unit.id;
                    option.innerText = unit.name;
                    unitSelect.appendChild(option);
                });
                
                // Reset to first option (blank/select)
                unitSelect.value = 'all';
                unitSelect.dataset.value = 'all';
                
                // Show unit select only if units exist
                unitSelectContainer.style.display = 'block';
            } else {
                // Hide unit select if category has no units
                unitSelectContainer.style.display = 'none';
                unitSelect.innerHTML = '<option value="all">Select Unit</option>';
                unitSelect.value = 'all';
                unitSelect.dataset.value = 'all';
            }
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
        const itemSearchContainer = createItemSearch(async (selectedItem) => {
            const quantity = prompt(`Enter quantity for ${selectedItem.item_name}:`);
            if (quantity && !isNaN(quantity) && Number(quantity) > 0) {
                requestedItems.push({ ...selectedItem, quantity: Number(quantity) });
                renderRequestedItems();
                itemSearchContainer.remove();
            } else if (quantity) {
                alert('Please enter a valid positive number for the quantity.');
            }
        });
        overlayBody.append(itemSearchContainer);
    });

    // --- Footer and Submit Buttons ---
    const footer = div('request-footer');
    const saveDraftBtn = createButton('saveDraftBtn', 'wide-buttons', 'Save as Draft');
    const submitBtn = createButton('submitRequestBtn', 'wide-buttons solid-buttons', 'Submit Request');
    
    const handleSubmit = async (status) => {
        let isValid = true;
        if (!validateFilterInput(projectSelect)) isValid = false;
        if (!validateFilterInput(requestTypeSelect)) isValid = false;
        
        if (requestTypeSelect.dataset.value === 'supplier') {
            if (!validateFilterInput(supplierSelect)) isValid = false;
        }

        if (requestedItems.length === 0) {
            isValid = false;
        }

        if (!isValid) {
            alertPopup('error', 'Please fill all required fields and add at least one item.');
            return;
        }

        const payload = {
            project_id: projectSelect.dataset.value,
            request_type: requestTypeSelect.dataset.value,
            supplier_id: requestTypeSelect.dataset.value === 'supplier' ? supplierSelect.dataset.value : null,
            approver: approverSelect.dataset.value,
            items: requestedItems,
            status: status
        };

        const result = await fetch('/api/material-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (result.ok) {
            const responseData = await result.json();
            alertPopup('success', responseData.message || 'Request successfully created!');
            hideOverlayWithBg(overlayBackground);
            if (refreshCallback) refreshCallback();
        } else {
            const errorData = await result.json();
            alertPopup('error', errorData.message || 'Failed to create request.');
        }
    };

    saveDraftBtn.addEventListener('click', () => handleSubmit('DRAFT'));
    submitBtn.addEventListener('click', () => handleSubmit('requested'));

    footer.append(saveDraftBtn, submitBtn);
    form.append(projectSelect, requestTypeSelect, supplierSelect, approverSelect, categorySelectContainer, unitSelectContainer, itemsHeader, itemsContainer, addItemBtn, footer);
    overlayBody.append(form);

    renderRequestedItems(); // Initial render
    showOverlayWithBg(overlayBackground);
}

async function showMaterialRequestDetails(requestId, requestCode, refreshCallback) {
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
        declineButton.addEventListener('click', () => {
            const remarks = document.getElementById('remarks').value;
            showDeleteConfirmation('Are you sure you want to decline this request?', async () => {
                const result = await fetchData(`/api/material-requests/${requestId}/decline`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ remarks })
                });

                if (result.status === 'success') {
                    hideOverlayWithBg(overlayBackground);
                    if (refreshCallback) refreshCallback();
                    alertPopup('success', 'Request declined successfully.');
                } else {
                    alertPopup('error', 'Failed to decline request.');
                }
            });
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
            createDeliveryOverlay(requestId, requestCode, refreshCallback);
        });
        actionsContainer.append(recordDeliveryButton);
    }

    if (header.status === 'verifying' || header.status === 'partially_verified') {
        const verifyButton = createButton('verifyDeliveryBtn', 'solid-buttons', 'Verify Items');
        verifyButton.addEventListener('click', () => {
            createVerificationOverlay(requestId, requestCode, items, refreshCallback);
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
    showOverlayWithBg(overlayBackground);
}

function createVerificationOverlay(requestId, requestCode, items, refreshCallback) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = `Verify Items for Request ${requestCode}`;

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


function createDeliveryOverlay(requestId, requestCode, refreshCallback) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = `Record Delivery for Request ${requestCode}`;

    const form = document.createElement('form');
    form.id = 'deliveryForm';
    form.classList.add('form-edit-forms');

    const deliveredByInput = createInput('text', 'edit', 'Delivered By', 'deliveredBy', 'delivered_by', '', 'Enter name of delivery person');
    const deliveryDateInput = createInput('date', 'edit', 'Delivery Date', 'deliveryDate', 'delivery_date', '');

    const statusContainer = div(null, 'input-box-containers');
    const statusLabel = document.createElement('label');
    statusLabel.textContent = 'Delivery Status';
    statusLabel.className = 'input-labels';
    const deliveryStatusSelect = document.createElement('select');
    deliveryStatusSelect.id = 'deliveryStatus';
    const statuses = ['partial', 'complete'];
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        deliveryStatusSelect.append(option);
    });
    const statusErrorSpan = span(null, 'error-messages');
    statusErrorSpan.dataset.errMsg = 'Status Required';
    statusContainer.append(statusLabel, deliveryStatusSelect, statusErrorSpan);

    const footer = div(null, 'create-form-footers');
    const submitButton = createButton('submitDelivery', 'wide-buttons', 'Submit');
    const cancelButton = createButton('cancelDelivery', 'wide-buttons', 'Cancel');
    cancelButton.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
    footer.append(cancelButton, submitButton);

    submitButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        let isValid = true;
        if (!validateInput(deliveredByInput.querySelector('input'))) isValid = false;
        if (!validateInput(deliveryDateInput.querySelector('input'))) isValid = false;
        if (!validateInput(deliveryStatusSelect)) isValid = false;

        if (!isValid) {
            alertPopup('error', 'Please fill in all required fields.');
            return;
        }

        const deliveryData = {
            delivered_by: deliveredByInput.querySelector('input').value,
            delivery_date: deliveryDateInput.querySelector('input').value,
            delivery_status: deliveryStatusSelect.value
        };

        const result = await fetch(`/api/material-requests/${requestId}/deliveries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deliveryData)
        });

        if (result.ok) {
            const responseData = await result.json();
            alertPopup('success', responseData.message || 'Delivery recorded successfully!');
            hideOverlayWithBg(overlayBackground);
            if (refreshCallback) refreshCallback();
        } else {
            const errorData = await result.json();
            alertPopup('error', errorData.message || 'Failed to record delivery.');
        }
    });

    form.append(deliveredByInput, deliveryDateInput, statusContainer, footer);
    overlayBody.append(form);
}

export async function generateMaterialRequestsContent(role) {
    const materialRequestsBodyHeader = document.getElementById('material-requestsBodyHeader'); 
    const materialRequestsBodyContent = document.getElementById('material-requestsBodyContent');
    materialRequestsBodyContent.innerHTML = '';

    // Update header section
    const bodyHeaderContainer = materialRequestsBodyHeader.querySelector('.body-header-container');
    const title = bodyHeaderContainer.querySelector('.body-header-title');
    const subtitle = bodyHeaderContainer.querySelector('.body-header-subtitle');
    title.innerText = 'Material Requests';
    subtitle.innerText = 'Browse and manage all material requests.';
    
    // Clear any previous buttons and add Create Request button
    const existingBtn = materialRequestsBodyHeader.querySelector('.solid-buttons');
    if (existingBtn) existingBtn.remove();
    const createRequestBtn = createButton('createRequestBtn', 'solid-buttons btn-blue', 'Create Request', 'createRequestBtnText', 'addMaterialBtnIcon');
    createRequestBtn.addEventListener('click', () => createMaterialRequestOverlay(renderMaterialRequests));
    materialRequestsBodyHeader.append(createRequestBtn);

    // Setup content section
    const filterContainer = div('material-requests-filter-container');
    const materialRequestsListContainer = div('material-requests-list-container');
    const paginationContainer = div('material-requests-pagination-container', 'pagination-container');
    
    materialRequestsBodyContent.append(filterContainer, materialRequestsListContainer, paginationContainer);

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
            if (request.priority_level) {
                if(request.priority_level === "medium") warnType(requestCardPriority, "solid", 'yellow', '', '');
                if(request.priority_level === "low") warnType(requestCardPriority, "solid", 'green', '', '');
                if(request.priority_level === "high") warnType(requestCardPriority, "solid", 'red', '', '');
                requestCardPriority.innerText = `${request.priority_level} Priority`;
            } else {
                requestCardPriority.innerText = 'No Priority';
                warnType(requestCardPriority, "solid", 'grey', '', ''); // Apply a neutral style for 'No Priority'
            }
            const requestCardBody = div(`requestCardBody`, `request-card-body`);
            const requestCardName = div(`requestCardName`, `request-card-name`);
            requestCardName.innerText = `Requested by ${request.requester_name} • `;
            const requestCardItemCount = div(`requestCardItemCount`, `request-card-item-count`);
            requestCardItemCount.innerText = `${request.item_count} item(s) • `; 
            const requestCardCost = div(`requestCardCost`, `request-card-cost`);
            requestCardCost.innerText = `₱${request.total_cost ? request.total_cost.toLocaleString() : '0'}`;
            const requestCardRight = div(`requestCardRight`, `request-card-right`);
            const requestStatusContainer = div(`requestStatusContainer`, `request-status-container`);
            const requestStatusIcon = div(`requestStatusIcon`, `request-status-icon`);
            requestStatusIcon.classList.add('icons');
            const requestStatusLabel = div(`requestStatusLabel`, `request-status-label`);
            if(request.status === "pending") warnType(requestStatusContainer, "", 'yellow', requestStatusIcon, requestStatusLabel);
            if(request.status === "approved") warnType(requestStatusContainer, "", 'green', requestStatusIcon, requestStatusLabel);
            if(request.status === "rejected") warnType(requestStatusContainer, "", 'red', requestStatusIcon, requestStatusLabel);
            requestStatusLabel.innerText = `${request.status}`;
            const requestCardDate = div(`requestCardDate`, `request-card-date`);
            requestCardDate.innerText = `${dateFormatting(request.created_at, 'dateTime')}`; 
            
            const requestStage = div('requestCardStage', 'request-stage-text');
            requestStage.innerText = `Stage: ${formatString(request.current_stage)}`;

            requestCardContainer.append(requestCardLeft, requestCardRight);
            requestCardLeft.append(requestCardHeader, requestCardBody, requestCardDate, requestStage);
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
