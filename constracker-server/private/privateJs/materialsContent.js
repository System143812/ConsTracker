import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, button, createButton, createFilterContainer, createPaginationControls, createInput, createFilterInput, editFormButton, validateInput, createSelect } from "/js/components.js";
import { createOverlayWithBg, hideOverlayWithBg, showDeleteConfirmation, showOverlayWithBg } from "/mainJs/overlays.js";

const defaultImageBackgroundColors = [
    '#B388EB', '#FFD180', '#80CBC4', '#E1BEE7', '#C5E1A5',
    '#F48FB1', '#81D4FA', '#FFF59D', '#FFAB91'
];

function roundDecimal(number) {
    return Math.floor(number * 100) / 100;
}

export function createMaterialCard(material, role, currentUserId, refreshMaterialsContentFn) {
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
    const itemDesc = span('itemCardDescription', 'item-card-descriptions');
    itemDesc.innerText = material.item_description || 'N/A';
    detailsContainer.append(
        itemDesc,
        createDetailItem('CATEGORY', material.category_name || 'N/A'),
        createDetailItem('UNIT', material.unit_name || 'N/A'),
        createDetailItem('SUPPLIER', material.supplier_name || 'N/A')
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
        declineSpan.addEventListener('click', () => {
            showDeleteConfirmation(`Are you sure you want to decline ${material.item_name}? This action cannot be undone.`, async () => {
                const response = await fetch(`/api/materials/${material.item_id}/decline`, { method: 'PUT' });
                if (response.ok) {
                    alertPopup('success', `${material.item_name} declined.`);
                    refreshMaterialsContentFn();
                } else {
                    alertPopup('error', `Failed to decline ${material.item_name}.`);
                }
            });
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
    
    statusActions.append(actionsContainer, price);
    infoContainer.append(titleStatusContainer, detailsContainer, statusActions);
    card.append(imageContainer, infoContainer);
    return card;
}

export async function createMaterialOverlay(material = null, refreshMaterialsContentFn) {
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

    const itemTypeOptions = [
        { id: 'consumable', name: 'Consumable' },
        { id: 'non-consumable', name: 'Non-Consumable' },
        { id: 'asset', name: 'Asset' }
    ];
    
    // Create item type select (literal select element)
    const itemTypeSelectContainer = div('itemTypeSelectContainer', 'input-box-containers');
    const itemTypeLabel = document.createElement('label');
    itemTypeLabel.className = 'input-labels';
    itemTypeLabel.innerText = 'Item Type';
    const itemTypeSelect = document.createElement('select');
    itemTypeSelect.id = 'materialItemTypeSelect';
    itemTypeSelect.name = 'item_type';
    const itemTypeDefaultOption = document.createElement('option');
    itemTypeDefaultOption.value = '';
    itemTypeDefaultOption.innerText = 'Select Item Type';
    itemTypeSelect.appendChild(itemTypeDefaultOption);
    itemTypeOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.id;
        option.innerText = opt.name;
        if (material?.item_type === opt.id) option.selected = true;
        itemTypeSelect.appendChild(option);
    });
    const itemTypeErrorSpan = span(``, 'error-messages');
    itemTypeErrorSpan.dataset.errMsg = `Item Type Required`;
    itemTypeErrorSpan.dataset.defaultMsg = " ";
    itemTypeErrorSpan.innerText = itemTypeErrorSpan.dataset.defaultMsg;
    itemTypeSelectContainer.append(itemTypeLabel, itemTypeSelect, itemTypeErrorSpan);

    const trackConditionContainer = div('trackConditionContainer', 'input-box-containers-checkbox');
    const trackConditionLabel = document.createElement('label');
    trackConditionLabel.htmlFor = 'trackConditionCheckbox';
    trackConditionLabel.classList.add('input-labels');
    trackConditionLabel.innerText = 'Track Condition';
    const trackConditionCheckbox = document.createElement('input');
    trackConditionCheckbox.type = 'checkbox';
    trackConditionCheckbox.id = 'trackConditionCheckbox';
    trackConditionCheckbox.name = 'track_condition';
    trackConditionCheckbox.checked = material?.track_condition || false;
    trackConditionContainer.append(trackConditionCheckbox, trackConditionLabel);

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

    // --- Selects (Category, Supplier, Unit) - Literal select elements ---
    
    // Category Select
    const categorySelectContainer = div('materialCategorySelectContainer', 'input-box-containers');
    const categoryLabel = document.createElement('label');
    categoryLabel.className = 'input-labels';
    categoryLabel.innerText = 'Category';
    const categorySelect = document.createElement('select');
    categorySelect.id = 'materialCategorySelect';
    categorySelect.name = 'category_id';
    categorySelect.dataset.value = material?.category_id || 'all';
    const categoryDefaultOption = document.createElement('option');
    categoryDefaultOption.value = 'all';
    categoryDefaultOption.innerText = 'Select Category';
    categorySelect.appendChild(categoryDefaultOption);
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.innerText = cat.name;
        if (material?.category_id === cat.id) option.selected = true;
        categorySelect.appendChild(option);
    });
    const categoryErrorSpan = span(``, 'error-messages');
    categoryErrorSpan.dataset.errMsg = `Category Required`;
    categoryErrorSpan.dataset.defaultMsg = " ";
    categoryErrorSpan.innerText = categoryErrorSpan.dataset.defaultMsg;
    categorySelectContainer.append(categoryLabel, categorySelect, categoryErrorSpan);

    // Supplier Select
    const supplierSelectContainer = div('materialSupplierSelectContainer', 'input-box-containers');
    const supplierLabel = document.createElement('label');
    supplierLabel.className = 'input-labels';
    supplierLabel.innerText = 'Supplier';
    const supplierSelect = document.createElement('select');
    supplierSelect.id = 'materialSupplierSelect';
    supplierSelect.name = 'supplier_id';
    supplierSelect.dataset.value = material?.supplier_id || 'all';
    const supplierDefaultOption = document.createElement('option');
    supplierDefaultOption.value = 'all';
    supplierDefaultOption.innerText = 'Select Supplier';
    supplierSelect.appendChild(supplierDefaultOption);
    suppliers.forEach(sup => {
        const option = document.createElement('option');
        option.value = sup.id;
        option.innerText = sup.name;
        if (material?.supplier_id === sup.id) option.selected = true;
        supplierSelect.appendChild(option);
    });
    const supplierErrorSpan = span(``, 'error-messages');
    supplierErrorSpan.dataset.errMsg = `Supplier Required`;
    supplierErrorSpan.dataset.defaultMsg = " ";
    supplierErrorSpan.innerText = supplierErrorSpan.dataset.defaultMsg;
    supplierSelectContainer.append(supplierLabel, supplierSelect, supplierErrorSpan);

    // Unit Select
    const unitSelectContainer = div('materialUnitSelectContainer', 'input-box-containers');
    const unitLabel = document.createElement('label');
    unitLabel.className = 'input-labels';
    unitLabel.innerText = 'Unit';
    const unitSelect = document.createElement('select');
    unitSelect.id = 'materialUnitSelect';
    unitSelect.name = 'unit_id';
    unitSelect.dataset.value = material?.unit_id || 'all';
    const unitDefaultOption = document.createElement('option');
    unitDefaultOption.value = 'all';
    unitDefaultOption.innerText = 'Select Unit';
    unitSelect.appendChild(unitDefaultOption);
    units.forEach(u => {
        const option = document.createElement('option');
        option.value = u.id;
        option.innerText = u.name;
        if (material?.unit_id === u.id) option.selected = true;
        unitSelect.appendChild(option);
    });
    const unitErrorSpan = span(``, 'error-messages');
    unitErrorSpan.dataset.errMsg = `Unit Required`;
    unitErrorSpan.dataset.defaultMsg = " ";
    unitErrorSpan.innerText = unitErrorSpan.dataset.defaultMsg;
    unitSelectContainer.append(unitLabel, unitSelect, unitErrorSpan);

    // Initially hide unit select if no category is selected
    if (!material?.category_id) {
        unitSelectContainer.style.display = 'none';
    }

    // Add category change listener for dynamic unit visibility and population
    categorySelect.addEventListener('change', async (e) => {
        const selectedCategoryId = categorySelect.value;
        categorySelect.dataset.value = selectedCategoryId;
        
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

    createMaterialFormHeader.append(
        materialNameInput,
        materialDescriptionInput,
        categorySelectContainer,
        supplierSelectContainer,
        unitSelectContainer,
        itemTypeSelectContainer,
        materialPriceInput,
        materialSizeInput,
        trackConditionContainer,
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
        if (!validateInput(itemTypeSelect)) isValid = false;
        if (!validateInput(categorySelect)) isValid = false;
        if (!validateInput(supplierSelect)) isValid = false;
        if (!validateInput(unitSelect)) isValid = false;

        const payload = {
            item_name: itemNameEl.value,
            item_description: materialDescriptionInput.querySelector('textarea').value,
            price: parseFloat(priceEl.value),
            size: materialSizeInput.querySelector('input').value,
            category_id: parseInt(categorySelect.value),
            supplier_id: parseInt(supplierSelect.value),
            unit_id: parseInt(unitSelect.value),
            item_type: itemTypeSelect.value,
            track_condition: trackConditionCheckbox.checked ? 1 : 0
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

export async function createSupplierOverlay(supplier = null, refreshCallback, role = null, currentUserId = null) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = 'Manage Suppliers';
    
    const addSupplierBtn = createButton('addSupplierBtn', 'solid-buttons btn-blue', 'Add Supplier', 'addSupplierBtnText', 'addIconWhite');
    
    overlayHeader.append(overlayHeaderContainer, addSupplierBtn);
    addSupplierBtn.style.margin = '0 1rem';
    overlayHeader.style.padding = '0.5rem';
    let suppliers = await fetchData('/api/materials/suppliers');
    if (suppliers === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load suppliers.');
    }

    const renderListView = () => {
        overlayBody.innerHTML = '';
        overlayHeaderContainer.innerText = 'Manage Suppliers';

        if (suppliers.length === 0) {
            showEmptyPlaceholder('/assets/icons/person.png', overlayBody, () => renderEditView(null), "No suppliers found.", "Add Supplier");
            return;
        }

        const listContainer = div('supplier-list-container', 'overlay-items-list');
        
        suppliers.forEach(sup => {
            const listItem = div(`supplier-item-${sup.id}`, 'overlay-item-card');
            
            const itemInfo = div('', 'overlay-item-info');
            const itemName = div('', 'overlay-item-title');
            itemName.innerText = sup.name;
            
            const itemDetails = div('', 'overlay-item-details');
            if (sup.email) {
                const emailSpan = span('', 'item-detail');
                emailSpan.innerHTML = `<strong>Email:</strong> ${sup.email}`;
                itemDetails.append(emailSpan);
            }
            if (sup.contact_number) {
                const contactSpan = span('', 'item-detail');
                contactSpan.innerHTML = `<strong>Contact:</strong> ${sup.contact_number}`;
                itemDetails.append(contactSpan);
            }
            
            const statusBadge = span('', 'status-badge');
            statusBadge.innerText = sup.status || 'pending';
            statusBadge.className = `status-badge status-${(sup.status || 'pending').toLowerCase()}`;
            
            itemInfo.append(itemName, itemDetails, statusBadge);
            
            const actionsContainer = div('', 'overlay-item-actions');
            
            // Check if user can edit (creator and pending, or admin/engineer)
            const isCreator = sup.created_by === currentUserId;
            const isPending = sup.status === 'pending';
            const isAdmin = role === 'admin';
            const isEngineer = role === 'engineer';
            const canEdit = (isCreator && isPending) || isAdmin || isEngineer;
            const canDelete = (isCreator && isPending) || isAdmin || isEngineer;
            const canApprove = (isAdmin || isEngineer) && isPending;

            // Show approve/decline buttons for admin/engineer on pending suppliers
            if (canApprove) {
                const approveBtn = createButton('', 'overlay-icon-btn', 'Approve', '', null);
                approveBtn.style.backgroundColor = '#d4edda';
                approveBtn.style.color = '#155724';
                approveBtn.style.fontSize = '12px';
                approveBtn.style.fontWeight = '600';
                approveBtn.style.width = 'auto';
                approveBtn.style.padding = '0.4rem 0.8rem';
                approveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const updatePayload = { status: 'approved' };
                    fetchPostJson(`/api/materials/suppliers/${sup.id}`, 'PUT', updatePayload).then(response => {
                        if (response.status === 'success') {
                            alertPopup('success', 'Supplier approved!');
                            fetchData('/api/materials/suppliers').then(data => {
                                suppliers = data;
                                renderListView();
                            });
                        } else {
                            alertPopup('error', response.message || 'Failed to approve supplier.');
                        }
                    });
                });
                actionsContainer.append(approveBtn);

                const declineBtn = createButton('', 'overlay-icon-btn', 'Decline', '', null);
                declineBtn.style.backgroundColor = '#f8d7da';
                declineBtn.style.color = '#721c24';
                declineBtn.style.fontSize = '12px';
                declineBtn.style.fontWeight = '600';
                declineBtn.style.width = 'auto';
                declineBtn.style.padding = '0.4rem 0.8rem';
                declineBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showDeleteConfirmation(`Decline supplier "${sup.name}"?`, async () => {
                        const updatePayload = { status: 'rejected' };
                        const response = await fetchPostJson(`/api/materials/suppliers/${sup.id}`, 'PUT', updatePayload);
                        if (response.status === 'success') {
                            alertPopup('success', 'Supplier declined!');
                            suppliers = await fetchData('/api/materials/suppliers');
                            renderListView();
                        } else {
                            alertPopup('error', response.message || 'Failed to decline supplier.');
                        }
                    });
                });
                actionsContainer.append(declineBtn);
            } else if (canEdit && !isPending) {
                // Show edit button only if not pending
                const editBtn = createButton('', 'overlay-icon-btn edit-btn', '', 'edit-icon-small', 'editBlack.png');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    renderEditView(sup);
                });
                actionsContainer.append(editBtn);
            } else if (canEdit && isPending) {
                // Show edit button for creators of pending suppliers
                const editBtn = createButton('', 'overlay-icon-btn edit-btn', '', 'edit-icon-small', 'editBlack.png');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    renderEditView(sup);
                });
                actionsContainer.append(editBtn);
            }
            
            if (canDelete) {
                const deleteBtn = createButton('', 'overlay-icon-btn delete-btn', '', 'delete-icon-small', 'deleteBlack.png');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showDeleteConfirmation(`Are you sure you want to delete supplier "${sup.name}"?`, async () => {
                        const response = await fetchData(`/api/materials/suppliers/${sup.id}`, { method: 'DELETE' });
                        if (response.status === 'success') {
                            alertPopup('success', 'Supplier deleted successfully!');
                            suppliers = await fetchData('/api/materials/suppliers');
                            renderListView();
                        } else {
                            alertPopup('error', response.message || 'Failed to delete supplier.');
                        }
                    });
                });
                actionsContainer.append(deleteBtn);
            }

            listItem.append(itemInfo, actionsContainer);
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
        form.classList.add('overlay-form');

        const formContent = div('', 'overlay-form-content');
        const nameInput = createInput('text', 'edit', 'Supplier Name', 'supplierName', 'name', sup?.name || '', 'Enter supplier name', null, 255);
        const addressInput = createInput('text', 'edit', 'Address', 'supplierAddress', 'address', sup?.address || '', 'Enter address', null, 255);
        const contactInput = createInput('text', 'edit', 'Contact', 'supplierContact', 'contact', sup?.contact_number || '', 'Enter contact number', null, 50);
        const emailInput = createInput('email', 'edit', 'Email', 'supplierEmail', 'email', sup?.email || '', 'Enter email address', null, 255);
        
        formContent.append(nameInput, addressInput, contactInput, emailInput);

        const formActions = div('', 'overlay-form-actions');
        const cancelBtn = createButton('', 'overlay-btn-secondary', 'Cancel', 'cancelText');
        cancelBtn.addEventListener('click', renderListView);

        const saveBtn = createButton('', 'overlay-btn-primary', isEdit ? 'Save Changes' : 'Create Supplier', 'saveText');
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

        formActions.append(cancelBtn, saveBtn);
        form.append(formContent, formActions);
        overlayBody.append(form);
    };

    addSupplierBtn.addEventListener('click', () => renderEditView(null));

    renderListView();
    showOverlayWithBg(overlayBackground);
}

export async function createCategoryOverlay(category = null, refreshCallback, role = null, currentUserId = null) {
    const { overlayBackground, overlayContainer, overlayHeader, overlayBody } = createOverlayWithBg();
    
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = 'Manage Categories';
    // overlayBody.style.overflow = 'auto';
    // overlayContainer.style.overflow = 'auto';
    // overlayBody.style.maxHeight = '50%';
    // overlayContainer.style.maxHeight = '50%';
    
    const addCategoryBtn = createButton('addCategoryBtn', 'solid-buttons btn-blue', 'Add Category', 'addCategoryBtnText', 'addIconWhite');
    addCategoryBtn.style.margin = '0 1rem';
    overlayHeader.append(overlayHeaderContainer, addCategoryBtn);
    overlayHeader.style.padding = '0.5rem';

    let categories = await fetchData('/api/materials/categories');
    if (categories === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load categories.');
    }

    const renderListView = () => {
        overlayBody.innerHTML = '';
        overlayHeaderContainer.innerText = 'Manage Categories';

        if (categories.length === 0) {
            showEmptyPlaceholder('/assets/icons/folder.png', overlayBody, () => renderEditView(null), "No categories found.", "Add Category");
            return;
        }

        const listContainer = div('category-list-container', 'overlay-items-list');
        
        categories.forEach(cat => {
            const listItem = div(`category-item-${cat.id}`, 'overlay-item-card');
            
            const itemInfo = div('', 'overlay-item-info');
            const itemName = div('', 'overlay-item-title');
            itemName.innerText = cat.name;
            
            itemInfo.append(itemName);
            
            const actionsContainer = div('', 'overlay-item-actions');

            // Foreman cannot edit/delete categories
            const isForemanOnly = role === 'foreman';
            
            if (!isForemanOnly) {
                const editBtn = createButton('', 'overlay-icon-btn edit-btn', '', 'edit-icon-small', 'editBlack.png');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    renderEditView(cat);
                });
                actionsContainer.append(editBtn);
                
                const deleteBtn = createButton('', 'overlay-icon-btn delete-btn', '', 'delete-icon-small', 'deleteBlack.png');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showDeleteConfirmation(`Are you sure you want to delete category "${cat.name}"?`, async () => {
                        const response = await fetchData(`/api/materials/categories/${cat.id}`, { method: 'DELETE' });
                        if (response.status === 'success') {
                            alertPopup('success', 'Category deleted successfully!');
                            categories = categories.filter(c => c.id !== cat.id);
                            renderListView();
                            refreshCallback();
                        } else {
                            alertPopup('error', response.message || 'Failed to delete category.');
                        }
                    });
                });
                actionsContainer.append(deleteBtn);
            }

            listItem.append(itemInfo, actionsContainer);
            listContainer.append(listItem);
        });
        overlayBody.append(listContainer);
    };

    const renderEditView = async (cat = null) => {
        const isEdit = cat !== null;
        overlayBody.innerHTML = '';
        addCategoryBtn.style.display = 'none';
        overlayHeaderContainer.innerText = isEdit ? `Edit Category: ${cat.name}` : 'Add New Category';

        const form = document.createElement('form');
        form.id = 'categoryForm';
        form.classList.add('overlay-form');

        const formContent = div('', 'overlay-form-content');
        const nameInput = createInput('text', 'edit', 'Category Name', '', 'name', cat?.name || '', 'Enter category name', null, 255);
        
        const units = await fetchData('/api/materials/units');
        if (units === 'error') {
            alertPopup('error', 'Failed to load units for form.');
            renderListView();
            return;
        }

        let defaultUnitIds = 'all';
        if (isEdit) {
            const associatedUnits = await fetchData(`/api/materials/categories/${cat.id}/units`);
            if (associatedUnits !== 'error' && associatedUnits.length > 0) {
                defaultUnitIds = associatedUnits.map(unit => unit.id).join(',');
            }
        }

        const unitsContainer = div('unitsSelectContainer', 'input-box-containers');
        const unitsLabel = document.createElement('label');
        unitsLabel.className = 'input-labels';
        unitsLabel.innerText = 'Associated Units';

        const unitsSelect = document.createElement('select');
        unitsSelect.id = 'categoryUnitsSelect';
        unitsSelect.multiple = true;
        
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.id;
            option.innerText = unit.name;
            unitsSelect.appendChild(option);
        });

        if (isEdit) {
            const defaultUnitIdsArray = defaultUnitIds === 'all' ? [] : defaultUnitIds.split(',');
            Array.from(unitsSelect.options).forEach(option => {
                if (defaultUnitIdsArray.includes(option.value)) {
                    option.selected = true;
                }
            });
        }
        
        unitsContainer.append(unitsLabel, unitsSelect);

        formContent.append(nameInput, unitsContainer);

        const formActions = div('', 'overlay-form-actions');
        const cancelBtn = createButton('', 'overlay-btn-secondary', 'Cancel', 'cancelText');
        cancelBtn.addEventListener('click', renderListView);

        const saveBtn = createButton('', 'overlay-btn-primary', isEdit ? 'Save Changes' : 'Create Category', 'saveText');
        saveBtn.addEventListener('click', async () => {
            const nameEl = nameInput.querySelector('input');
            if (!validateInput(nameEl)) {
                return alertPopup('error', 'Category name is required.');
            }
            
            const selectedUnits = Array.from(unitsSelect.selectedOptions).map(opt => parseInt(opt.value));

            const payload = {
                name: nameEl.value,
                unit_ids: selectedUnits
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

        formActions.append(cancelBtn, saveBtn);
        form.append(formContent, formActions);
        overlayBody.append(form);
    };

    addCategoryBtn.addEventListener('click', () => renderEditView(null));

    renderListView();
    showOverlayWithBg(overlayBackground);
}

export async function createUnitOverlay(unit = null, refreshCallback) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = 'Units';
    
    overlayHeader.append(overlayHeaderContainer);

    let units = await fetchData('/api/materials/units');
    if (units === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load units.');
    }

    const renderListView = () => {
        overlayBody.innerHTML = '';
        overlayHeaderContainer.innerText = 'Units';

        if (units.length === 0) {
            showEmptyPlaceholder('/assets/icons/measurement.png', overlayBody, null, "No units available.");
            return;
        }

        const listContainer = div('unit-list-container', 'overlay-items-list');
        
        units.forEach(un => {
            const listItem = div(`unit-item-${un.id}`, 'overlay-item-card');
            
            const itemInfo = div('', 'overlay-item-info');
            const itemName = div('', 'overlay-item-title');
            itemName.innerText = un.name;
            listItem.style.padding = '0.5rem 1rem';
            
            itemInfo.append(itemName);
            listItem.append(itemInfo);
            listContainer.append(listItem);
        });
        overlayBody.append(listContainer);
    };

    renderListView();
    showOverlayWithBg(overlayBackground);
}

export async function generateMaterialsContent(role) {
    const materialsBodyHeader = document.getElementById('materialsBodyHeader');
    const materialsBodyContent = document.getElementById('materialsBodyContent'); 
    materialsBodyContent.innerHTML = ''; // Clear existing content

    // Update Header
    const bodyHeaderContainer = materialsBodyHeader.querySelector('.body-header-container');
    const title = bodyHeaderContainer.querySelector('.body-header-title');
    const subtitle = bodyHeaderContainer.querySelector('.body-header-subtitle');
    title.innerText = 'Materials';
    subtitle.innerText = 'Manage and track all construction materials.';
    
    const user = await fetchData('/profile');
    if (user === 'error') {
        return alertPopup('error', 'Could not fetch user profile. Please reload the page.');
    }
    const currentUserId = user.user_id;

    // Clear any previous buttons and add Material Button (Admin, PM, Engineer, Foreman)
    const existingBtn = materialsBodyHeader.querySelector('.solid-buttons');
    if (existingBtn) existingBtn.remove();
    const allowedRolesForAdd = ['admin', 'engineer', 'project manager', 'foreman'];
    if (allowedRolesForAdd.includes(role)) {
        const addMaterialBtn = createButton('addMaterialBtn', 'solid-buttons btn-blue', 'Add Material', 'addMaterialBtnText', 'addIconWhite');
        addMaterialBtn.addEventListener('click', () => {
            createMaterialOverlay(null, () => renderMaterials(new URLSearchParams(), role, currentUserId));
        });
        materialsBodyHeader.append(addMaterialBtn);
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
        createSupplierOverlay(null, () => renderMaterials(new URLSearchParams(), role, currentUserId), role, currentUserId);
    });
    categoriesButton.addEventListener('click', () => {
        createCategoryOverlay(null, () => renderMaterials(new URLSearchParams(), role, currentUserId), role, currentUserId);
    });
    unitsButton.addEventListener('click', () => {
        createUnitOverlay(null, () => renderMaterials(new URLSearchParams(), role, currentUserId));
    });
    const filterContainer = div('materials-filter-container');
    const materialsListContainer = div('materials-list-container');
    const paginationContainer = div('materialsPaginationContainer', 'pagination-container');
    
    materialsContainer.append(filterContainer, materialsListContainer, paginationContainer);
    materialsBodyContent.append(materialsSubHeader, materialsContainer);

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
