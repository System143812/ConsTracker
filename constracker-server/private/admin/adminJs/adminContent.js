import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, button, createButton, createFilterContainer, createPaginationControls, createInput, createFilterInput, editFormButton, validateInput } from "/js/components.js";
import { renderSettingsPage } from "/mainJs/settings.js";
// Fix: Combine these into one line and ensure the path is correct
import { createMilestoneOl, milestoneFullOl, showLogDetailsOverlay, createOverlayWithBg, hideOverlayWithBg, showDeleteConfirmation, showOverlayWithBg as overlayShow } from "/mainJs/overlays.js";
// Update this line at the top of adminContent.js
let allPersonnel = [];


const defaultImageBackgroundColors = [
    '#B388EB', '#FFD180', '#80CBC4', '#E1BEE7', '#C5E1A5',
    '#F48FB1', '#81D4FA', '#FFF59D', '#A7FFEB', '#FFAB91'
];

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



    overlayShow(overlayBackground);
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
        const addMaterialBtn = createButton('addMaterialBtn', 'solid-buttons blue white', 'Add Material', 'addMaterialBtnText', 'addMaterialBtnIcon');
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
        generateContent: async(role) => await generateInventoryContent(role),
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
        generateContent: async() => await generateSettingsContent(),
        generateGraphs: async() => ''
    }
}

export async function displayContents(tabName, tabType, role) {
    if(role !== 'admin') return alertPopup('error', 'Unauthorized Role');
    const pageName = document.getElementById('pageName');
    
    if(tabType === 'upperTabs'){
        pageName.innerText = formatString(tabName);
        
        // Handle the Personnel tab specifically
        if (tabName === 'personnel') {
            const personnelContainer = document.getElementById('personnelBodyContent');
            const personnelBody = document.getElementById('personnelBodyContainer');
            
            // 1. Clear the "Coming Soon" text
            personnelContainer.innerHTML = ''; 
            
            // 2. Build the new UI (Add Button + Filters)
            const content = await displayPersonnel('personnelBodyContent', role);
            personnelContainer.append(content);

            // 3. Show the container (matching your sidebar logic)
            personnelBody.style.display = 'flex';
            setTimeout(() => { personnelBody.style.opacity = 1; }, 50);
        } else {
            // Default behavior for other tabs (Dashboard, Materials, etc.)
            await generateContent(tabName, role);
        }
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

async function generateSettingsContent() {
    const settingsBodyContent = document.getElementById('settingsBodyContent');
    if (!settingsBodyContent) return;
    settingsBodyContent.innerHTML = '';
    await renderSettingsPage(settingsBodyContent);
}


export async function renderPersonnel(params) {
    const workerSectionContainer = div('workerSectionContainer', 'worker-section');
    
    // Create Add User Button
    const addUserBtn = createButton('addUserBtn', 'primary-btn', 'Add New Personnel');
    addUserBtn.style.marginBottom = '20px';
    
    addUserBtn.addEventListener('click', () => {
        const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
        
        overlayHeader.innerText = "Register Staff Member";
        
        const emailInput = createInput('regEmail', 'email', 'Staff Email Address');
        const submitBtn = createButton('regSubmitBtn', 'primary-btn', 'Generate & Send Credentials');
        const statusText = div('regStatus', 'info-message');
        
        // Secure Mask Display
        const maskInput = createInput('regMask', 'text', '**********');
        maskInput.readOnly = true;
        maskInput.style.textAlign = 'center';
        maskInput.style.letterSpacing = '4px';

        overlayBody.append(emailInput, maskInput, submitBtn, statusText);
        showOverlayWithBg(overlayBackground);

        submitBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            if(!email) return alertPopup('warn', 'Please enter an email');

            submitBtn.disabled = true;
            submitBtn.innerText = "Processing...";
            maskInput.value = "********"; 

            try {
                const response = await fetch('/api/register/generate-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await response.json();

                if(data.success) {
                    maskInput.value = "****************"; // Masked for security
                    submitBtn.innerText = "Email Sent!";
                    alertPopup('success', 'User created and email sent!');
                    // Optionally refresh the personnel list here
                } else {
                    throw new Error(data.message);
                }
            } catch (error) {
                submitBtn.disabled = false;
                submitBtn.innerText = "Try Again";
                alertPopup('error', error.message);
            }
        });
    });

    workerSectionContainer.append(addUserBtn);

    
    return workerSectionContainer;
}

// Ensure this is at the top of your file

export async function displayPersonnel(container, parentId, role) {
    const target = typeof container === 'string' ? document.getElementById(container) : container;
    if (!target) return;
    
    target.innerHTML = ''; 

    // --- 1. THE HEADER (Title only) ---
    const bodyHeader = div('', 'body-header');
    const headerTextContainer = div('', 'body-header-container');
    const title = span('', 'body-header-title', 'Personnel');
    const subtitle = span('', 'body-header-subtitle', 'Manage team members and system access.');
    headerTextContainer.append(title, subtitle);
    target.append(bodyHeader);

    // --- 2. THE FILTER & ACTION LINE ---
    const personnelMainContainer = div('personnel-main-container', 'materials-main-container');
    
    // Create a wrapper for Search Bar + Add Button
    const filterActionWrapper = div('', 'filter-action-wrapper');
    const filterArea = div('personnel-filter-container', 'materials-filter-container');
    
    const addBtn = createButton('addPersonnelBtn', 'solid-buttons blue white', 'Add Personnel +');
    addBtn.style.setProperty('color', '#ffffff', 'important');
    addBtn.addEventListener('click', () => showAddUserOverlay());

    // Put both in the wrapper
    filterActionWrapper.append(filterArea, addBtn);

    const listGrid = div('userListContainer', 'personnel-grid');
    personnelMainContainer.append(filterActionWrapper, listGrid);
    target.append(personnelMainContainer);

    let allPersonnel = [];

    // --- 3. THE RENDER ENGINE ---
    const renderPersonnelCards = (keyword = '', sortOrder = 'asc', status = 'all') => {
        listGrid.innerHTML = '';
        let filtered = allPersonnel.filter(user => {
            const nameMatch = (user.full_name || "").toLowerCase().includes(keyword.toLowerCase());
            const statusMatch = (status === 'all') || 
                                (status === 'active' && user.is_active == 1) || 
                                (status === 'inactive' && user.is_active == 0);
            return nameMatch && statusMatch;
        });

        filtered.sort((a, b) => {
            const valA = (a.full_name || "").toUpperCase();
            const valB = (b.full_name || "").toUpperCase();
            return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });

        if (filtered.length === 0) {
            showEmptyPlaceholder('/assets/icons/personnel.png', listGrid, null, "No personnel found matching your search.");
            return;
        }

        filtered.forEach(user => {
            listGrid.append(createPersonnelCard(user));
        });
    };

    // --- 4. THE FILTER BAR ---
    const filterBar = await createFilterContainer(
        (urlParams) => {
            // createFilterContainer's name search writes to the `name` param.
            const rawKeyword = urlParams.get('name') || 'all';
            const keyword = rawKeyword === 'all' ? '' : rawKeyword;

            // Sort is optional for this screen; default to A-Z.
            const sort = urlParams.get('sort') || 'asc';

            // Status should be single-select: all | active | inactive.
            const status = urlParams.get('status') || 'all';

            renderPersonnelCards(keyword, sort, status);
        },
        'Search personnel by name...',
        {
            name: true,
            sort: {
                default: 'asc',
                options: [
                    { id: 'asc', label: 'Alphabetical (A-Z)' },
                    { id: 'desc', label: 'Alphabetical (Z-A)' }
                ]
            },
            status: {
                mode: 'single',
                options: [
                    { id: 'all', label: 'All' },
                    { id: 'active', label: 'Active' },
                    { id: 'inactive', label: 'Inactive' }
                ]
            }
        },
        'name',
        'asc'
    );

    filterArea.append(filterBar);

    // --- 5. DATA FETCH ---
    const users = await fetchData('/api/users');
    if (users !== 'error') {
        allPersonnel = users;
        renderPersonnelCards();
    }
}

// Helper to create the Dribbble-like card
function createPersonnelCard(user) {
    const card = div(null, 'personnel-card');
    // Used by edit/terminate overlays to update the selected card in-place
    card.dataset.userId = user.user_id;
    const nameParts = user.full_name ? user.full_name.trim().split(' ') : ["?"];
    const initials = nameParts.length > 1 
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0][0].toUpperCase();

    const statusClass = user.is_active == 1 ? 'status-active' : 'status-inactive';

    card.innerHTML = `
        <div class="avatar-wrapper">
            <div class="personnel-avatar">${initials}</div>
            <div class="status-bubble ${statusClass}"></div>
        </div>
        <div class="personnel-info" style="text-align: center;">
            <div class="personnel-name">${user.full_name}</div>
            <div class="personnel-role-tag" style="font-size: 11px; color: var(--blue-text); font-weight: 600; text-transform: uppercase;">${formatString(user.role)}</div>
            <div class="personnel-email" style="font-size: 12px; color: var(--grayed-text);">${user.email}</div>
        </div>
        <div class="card-actions" style="margin-top: 15px; display: flex; gap: 8px; width: 100%;">
            <button class="warn-glass" style="flex: 1; font-size: 11px; padding: 8px;" onclick="editCredentials('${user.user_id}')">Edit</button>
            <button class="warn-glass red" style="flex: 1; font-size: 11px; padding: 8px;" onclick="terminatePersonnel('${user.user_id}')">Terminate</button>
        </div>
    `;
    return card;
}

async function fetchAndRenderUsers(container) {
    // NOTE: This function is used to refresh the admin Personnel grid after add/edit/terminate.
    // It must NOT wrap the existing grid inside another `.personnel-grid`, otherwise the layout
    // can collapse into a single-column (vertical) list on desktop.

    try {
        const users = await fetchData('/api/users');

        // Safety check: ensure users is an array
        if (!Array.isArray(users)) {
            console.error("Expected array from /api/users but got:", users);
            container.innerHTML = `<p style="padding: 20px; color: gray;">No personnel found or error loading data.</p>`;
            return;
        }

        // Decide the render target: if the caller passes the grid container itself, render into it.
        // Otherwise, create a grid child (for legacy callers).
        let renderTarget = container;
        const isGridContainer = container?.id === 'userListContainer' || container?.classList?.contains('personnel-grid');
        if (!isGridContainer) {
            container.innerHTML = '';
            renderTarget = div(null, 'personnel-grid');
            container.append(renderTarget);
        } else {
            container.classList.add('personnel-grid');
            container.innerHTML = '';
        }

        users.forEach(user => {
            // Reuse the same card builder used by the main Personnel renderer.
            renderTarget.append(createPersonnelCard(user));
        });
    } catch (error) {
        console.error("Error rendering users:", error);
        container.innerHTML = `<p style="color: red; padding: 20px;">Failed to load personnel.</p>`;
    }
}

// -----------------------------
// Inventory / Assets / Reports / Analytics (Admin)
// -----------------------------

function createSectionActionsRow() {
    const row = div('', 'filter-header');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.gap = '12px';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.marginBottom = '16px';
    return row;
}

function createInlineControlContainer() {
    const left = div('', 'filter-controls');
    left.style.display = 'flex';
    left.style.flexWrap = 'wrap';
    left.style.gap = '10px';
    left.style.alignItems = 'center';
    return left;
}

function createSelectInput(id, labelText, options, selectedValue = '') {
    const container = div(`${id}Container`, 'input-box-containers');
    container.style.margin = '0';
    container.style.minWidth = '220px';
    const label = document.createElement('label');
    label.className = 'input-labels';
    label.htmlFor = id;
    label.innerText = labelText;
    const select = document.createElement('select');
    select.id = id;
    select.className = 'input-fields edit';
    select.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    select.value = selectedValue;
    container.append(label, select);
    return { container, select };
}

function createGridContainer() {
    const grid = div('', 'materials-grid');
    // Reuse the same responsive grid the Materials section uses.
    return grid;
}

function pill(text, type = 'good') {
    const el = span('', 'material-status');
    el.innerText = text;
    if (type === 'low') warnType(el, 'solid', 'yellow');
    if (type === 'good') warnType(el, 'solid', 'green');
    if (type === 'danger') warnType(el, 'solid', 'red');
    return el;
}

function createSimpleCardHeader(titleText, rightEl = null) {
    const header = div('', 'material-title-status');
    const title = span('', 'material-name');
    title.innerText = titleText;
    header.append(title);
    if (rightEl) header.append(rightEl);
    return header;
}

function createKeyValue(label, value) {
    const item = div('', 'material-detail-item');
    const k = span('', 'label');
    k.innerText = label;
    const v = span('', 'value');
    v.innerText = value;
    item.append(k, v);
    return item;
}

async function generateInventoryContent() {
    const inventoryBodyContent = document.getElementById('inventoryBodyContent');
    inventoryBodyContent.innerHTML = '';

    const actionsRow = createSectionActionsRow();
    const leftControls = createInlineControlContainer();
    const rightControls = createInlineControlContainer();
    rightControls.style.justifyContent = 'flex-end';

    // Project filter
    const projects = await fetchData('/api/selection/project');
    const projectOptions = [{ value: '', label: 'All Projects' }].concat(
        Array.isArray(projects) ? projects.map(p => ({ value: String(p.id), label: p.name })) : []
    );
    const { container: projectSelectBox, select: projectSelect } = createSelectInput('inventoryProjectSelect', 'Project', projectOptions);

    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.className = 'input-fields edit';
    searchBox.placeholder = 'Search material name...';
    searchBox.style.minWidth = '260px';

    const addBtn = createButton('inventoryAddBtn', 'solid-buttons white', 'Add Inventory Item', 'inventoryAddTxt');
    addBtn.type = 'button';

    leftControls.append(projectSelectBox);
    leftControls.append(searchBox);
    rightControls.append(addBtn);
    actionsRow.append(leftControls, rightControls);

    const grid = createGridContainer();
    inventoryBodyContent.append(actionsRow, grid);

    async function loadAndRender() {
        const projectId = projectSelect.value || '';
        const q = (searchBox.value || '').trim().toLowerCase();
        const url = projectId ? `/api/inventory?project_id=${encodeURIComponent(projectId)}` : '/api/inventory';
        const rows = await fetchData(url);
        grid.innerHTML = '';

        const data = Array.isArray(rows) ? rows : [];
        const filtered = q ? data.filter(r => String(r.item_name || '').toLowerCase().includes(q)) : data;

        if (filtered.length === 0) {
            showEmptyPlaceholder('/assets/icons/inventory.png', grid, null, 'No inventory items found');
            return;
        }

        filtered.forEach(r => {
            const card = div('', 'material-card');
            const imageContainer = div('', 'material-image-container');
            imageContainer.classList.add('default-image-bg');

            // Item image (if present)
            if (r.image_url) {
                let img;
                if (r.image_url.length > 60 && !r.image_url.includes('-')) img = `/itemImages/${r.image_url}`;
                else if (r.image_url !== 'constrackerWhite.svg') img = `/image/${r.image_url}`;
                else img = `/assets/pictures/constrackerWhite.svg`;
                imageContainer.style.backgroundImage = `url(${img})`;
            }

            const info = div('', 'material-info-container');
            const statusPill = pill(r.status === 'low' ? 'LOW' : 'GOOD', r.status === 'low' ? 'low' : 'good');
            const header = createSimpleCardHeader(r.item_name || 'Item', statusPill);

            const details = div('', 'material-details');
            details.append(
                createKeyValue('Project:', r.project_name || 'N/A'),
                createKeyValue('Current:', `${r.current_amount ?? 0}`),
                createKeyValue('Max:', `${r.max_capacity ?? 0}`),
                createKeyValue('Min:', `${r.min_amount ?? 0}`)
            );

            const footer = div('', 'material-status-actions');
            const actions = div('', 'material-actions-container');

            const editBtn = span('', 'material-action-btn green-text');
            editBtn.innerText = 'Edit';
            editBtn.addEventListener('click', () => openInventoryOverlay('edit', r, loadAndRender));

            const deleteBtn = span('', 'material-action-btn red-text');
            deleteBtn.innerText = 'Remove';
            deleteBtn.addEventListener('click', async () => {
                const ok = confirm(`Remove ${r.item_name} from ${r.project_name}?`);
                if (!ok) return;
                const resp = await fetch(`/api/inventory/${r.inventory_id}`, { method: 'DELETE' });
                const data = await resp.json().catch(() => ({}));
                if (!resp.ok) return alertPopup('error', data?.message || 'Failed to remove inventory item');
                alertPopup('success', 'Removed successfully');
                loadAndRender();
            });

            actions.append(editBtn, deleteBtn);
            footer.append(actions);

            info.append(header, details, footer);
            card.append(imageContainer, info);
            grid.append(card);
        });
    }

    async function openInventoryOverlay(mode, row, refreshFn) {
        const isEdit = mode === 'edit';
        const { overlayBackground, overlayContainer, overlayHeader, overlayBody } = createOverlayWithBg();
        overlayContainer.classList.add('modal-lg');
        overlayHeader.innerHTML = '';

        const headerWrap = div('', 'overlay-header-containers overlay-header-flex');
        const titleWrap = div('', 'overlay-title-wrap');
        const title = span('', 'overlay-title');
        const subtitle = span('', 'overlay-subtitle');
        title.innerText = isEdit ? 'Edit Inventory Item' : 'Add Inventory Item';
        subtitle.innerText = isEdit ? 'Update current stock and thresholds.' : 'Start tracking a material per project.';
        titleWrap.append(title, subtitle);
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'overlay-close-btn';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
        headerWrap.append(titleWrap, closeBtn);
        overlayHeader.append(headerWrap);

        overlayBody.innerHTML = '';
        const form = document.createElement('form');
        form.className = 'form-edit-forms personnel-add-form';

        // Project + Item selectors (Add only)
        let projectSel;
        let itemSel;

        if (!isEdit) {
            const projOptions = [{ value: '', label: 'Select a project...' }].concat(projectOptions.filter(o => o.value));
            const projSelect = createSelectInput('invProjectId', 'Project', projOptions);
            projectSel = projSelect.select;

            const items = await fetchData('/api/selection/item');
            const itemOptions = [{ value: '', label: 'Select a material...' }].concat(
                Array.isArray(items) ? items.map(i => ({ value: String(i.id), label: i.name })) : []
            );
            const itemSelect = createSelectInput('invItemId', 'Material', itemOptions);
            itemSel = itemSelect.select;
            form.append(projSelect.container, itemSelect.container);
        } else {
            // In edit mode show the fixed identity as read-only fields
            const proj = createInput('text', 'edit', 'Project', 'invProjectName', 'project_name', row.project_name || '', '', null, 255);
            const item = createInput('text', 'edit', 'Material', 'invItemName', 'item_name', row.item_name || '', '', null, 255);
            const projEl = proj.querySelector('input');
            const itemEl = item.querySelector('input');
            if (projEl) projEl.readOnly = true;
            if (itemEl) itemEl.readOnly = true;
            form.append(proj, item);
        }

        const currentInput = createInput('number', 'edit', 'Current Amount', 'invCurrent', 'current_amount', String(row?.current_amount ?? 0), '0', 0, 9999999);
        const maxInput = createInput('number', 'edit', 'Max Capacity', 'invMax', 'max_capacity', String(row?.max_capacity ?? ''), 'e.g. 500', 1, 9999999);
        const minInput = createInput('number', 'edit', 'Low Threshold (Min Amount)', 'invMin', 'min_amount', String(row?.min_amount ?? 0), 'e.g. 30', 0, 9999999);

        const actions = div('', 'overlay-action-row');
        const cancelBtn = createButton('invCancel', 'glass-buttons', 'Cancel', 'invCancelTxt');
        const saveBtn = createButton('invSave', 'solid-buttons white', isEdit ? 'Save Changes' : 'Add Item', 'invSaveTxt');
        cancelBtn.type = 'button';
        saveBtn.type = 'button';
        cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
        actions.append(cancelBtn, saveBtn);

        form.append(currentInput, maxInput, minInput, actions);
        overlayBody.append(form);
        overlayShow(overlayBackground);

        async function submit() {
            const cur = Number(document.getElementById('invCurrent')?.value);
            const max = Number(document.getElementById('invMax')?.value);
            const min = Number(document.getElementById('invMin')?.value);
            if (!Number.isFinite(cur) || cur < 0) return alertPopup('warn', 'Current amount must be 0 or greater');
            if (!Number.isFinite(max) || max <= 0) return alertPopup('warn', 'Max capacity must be greater than 0');
            if (!Number.isFinite(min) || min < 0) return alertPopup('warn', 'Min amount must be 0 or greater');

            saveBtn.disabled = true;
            try {
                const endpoint = isEdit ? `/api/inventory/${row.inventory_id}` : '/api/inventory';
                const payload = isEdit
                    ? { current_amount: cur, max_capacity: max, min_amount: min }
                    : { project_id: Number(projectSel?.value), item_id: Number(itemSel?.value), current_amount: cur, max_capacity: max, min_amount: min };

                if (!isEdit) {
                    if (!payload.project_id) return alertPopup('warn', 'Please select a project');
                    if (!payload.item_id) return alertPopup('warn', 'Please select a material');
                }

                const resp = await fetch(endpoint, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json().catch(() => ({}));
                if (!resp.ok) throw new Error(data?.message || 'Request failed');
                alertPopup('success', isEdit ? 'Inventory updated' : 'Inventory item added');
                hideOverlayWithBg(overlayBackground);
                refreshFn();
            } catch (e) {
                saveBtn.disabled = false;
                alertPopup('error', e?.message || 'Failed');
            }
        }
        saveBtn.addEventListener('click', submit);
        form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    }

    projectSelect.addEventListener('change', loadAndRender);
    searchBox.addEventListener('input', () => loadAndRender());
    addBtn.addEventListener('click', () => openInventoryOverlay('add', {}, loadAndRender));

    await loadAndRender();
}

async function generateAssetsContent() {
    const assetsBodyContent = document.getElementById('assetsBodyContent');
    assetsBodyContent.innerHTML = '';

    const actionsRow = createSectionActionsRow();
    const leftControls = createInlineControlContainer();
    const rightControls = createInlineControlContainer();
    rightControls.style.justifyContent = 'flex-end';

    const projects = await fetchData('/api/selection/project');
    const projectOptions = [{ value: '', label: 'All Projects' }].concat(
        Array.isArray(projects) ? projects.map(p => ({ value: String(p.id), label: p.name })) : []
    );
    const { container: projectSelectBox, select: projectSelect } = createSelectInput('assetsProjectSelect', 'Project', projectOptions);

    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.className = 'input-fields edit';
    searchBox.placeholder = 'Search asset name/tag...';
    searchBox.style.minWidth = '260px';

    const addBtn = createButton('assetsAddBtn', 'solid-buttons white', 'Add Asset', 'assetsAddTxt');
    addBtn.type = 'button';

    leftControls.append(projectSelectBox, searchBox);
    rightControls.append(addBtn);
    actionsRow.append(leftControls, rightControls);

    const grid = createGridContainer();
    assetsBodyContent.append(actionsRow, grid);

    async function loadAndRender() {
        const projectId = projectSelect.value || '';
        const q = (searchBox.value || '').trim().toLowerCase();
        const url = projectId ? `/api/assets?project_id=${encodeURIComponent(projectId)}` : '/api/assets';
        const rows = await fetchData(url);
        grid.innerHTML = '';
        const data = Array.isArray(rows) ? rows : [];
        const filtered = q
            ? data.filter(r => (`${r.asset_name || ''} ${r.asset_tag || ''}`.toLowerCase().includes(q)))
            : data;

        if (filtered.length === 0) {
            showEmptyPlaceholder('/assets/icons/inventory.png', grid, null, 'No assets found');
            return;
        }

        filtered.forEach(r => {
            const card = div('', 'material-card');
            const imageContainer = div('', 'material-image-container');
            imageContainer.classList.add('default-image-bg');
            imageContainer.style.backgroundImage = `url(/assets/icons/assets.png)`;

            const info = div('', 'material-info-container');
            const statusText = String(r.status || 'available').toUpperCase().replace('_', ' ');
            const statusPill = pill(statusText, r.status === 'maintenance' ? 'low' : (r.status === 'retired' ? 'danger' : 'good'));
            const header = createSimpleCardHeader(r.asset_name || 'Asset', statusPill);

            const details = div('', 'material-details');
            details.append(
                createKeyValue('Type:', r.asset_type || 'N/A'),
                createKeyValue('Tag:', r.asset_tag || 'N/A'),
                createKeyValue('Project:', r.project_name || 'Unassigned'),
                createKeyValue('Value:', r.asset_value != null ? `₱${Number(r.asset_value).toLocaleString()}` : 'N/A')
            );

            const footer = div('', 'material-status-actions');
            const actions = div('', 'material-actions-container');
            const editBtn = span('', 'material-action-btn green-text');
            editBtn.innerText = 'Edit';
            editBtn.addEventListener('click', () => openAssetsOverlay('edit', r, loadAndRender));
            const deleteBtn = span('', 'material-action-btn red-text');
            deleteBtn.innerText = 'Delete';
            deleteBtn.addEventListener('click', async () => {
                const ok = confirm(`Delete asset: ${r.asset_name}?`);
                if (!ok) return;
                const resp = await fetch(`/api/assets/${r.asset_id}`, { method: 'DELETE' });
                const data = await resp.json().catch(() => ({}));
                if (!resp.ok) return alertPopup('error', data?.message || 'Failed to delete asset');
                alertPopup('success', 'Asset deleted');
                loadAndRender();
            });
            actions.append(editBtn, deleteBtn);
            footer.append(actions);

            info.append(header, details, footer);
            card.append(imageContainer, info);
            grid.append(card);
        });
    }

    async function openAssetsOverlay(mode, row, refreshFn) {
        const isEdit = mode === 'edit';
        const { overlayBackground, overlayContainer, overlayHeader, overlayBody } = createOverlayWithBg();
        overlayContainer.classList.add('modal-lg');
        overlayHeader.innerHTML = '';

        const headerWrap = div('', 'overlay-header-containers overlay-header-flex');
        const titleWrap = div('', 'overlay-title-wrap');
        const title = span('', 'overlay-title');
        const subtitle = span('', 'overlay-subtitle');
        title.innerText = isEdit ? 'Edit Asset' : 'Add Asset';
        subtitle.innerText = 'Track and manage company assets across projects.';
        titleWrap.append(title, subtitle);
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'overlay-close-btn';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
        headerWrap.append(titleWrap, closeBtn);
        overlayHeader.append(headerWrap);

        overlayBody.innerHTML = '';
        const form = document.createElement('form');
        form.className = 'form-edit-forms personnel-add-form';

        const nameInput = createInput('text', 'edit', 'Asset Name', 'assetName', 'asset_name', row?.asset_name || '', 'e.g. Concrete Mixer', null, 255);
        const typeInput = createInput('text', 'edit', 'Asset Type', 'assetType', 'asset_type', row?.asset_type || '', 'e.g. Equipment', null, 120);
        const tagInput = createInput('text', 'edit', 'Asset Tag (optional)', 'assetTag', 'asset_tag', row?.asset_tag || '', 'e.g. EQ-0001', null, 120);

        const statusOptions = [
            { value: 'available', label: 'Available' },
            { value: 'in_use', label: 'In Use' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'retired', label: 'Retired' }
        ];
        const { container: statusBox, select: statusSelect } = createSelectInput('assetStatus', 'Status', statusOptions, row?.status || 'available');

        const { container: projectBox, select: projectSelect2 } = createSelectInput(
            'assetProject',
            'Assigned Project',
            [{ value: '', label: 'Unassigned' }].concat(projectOptions.filter(o => o.value)),
            row?.project_id ? String(row.project_id) : ''
        );

        const purchaseInput = createInput('date', 'edit', 'Purchase Date', 'assetPurchaseDate', 'purchase_date', row?.purchase_date || '', '');
        const valueInput = createInput('text', 'edit', 'Asset Value (₱)', 'assetValue', 'asset_value', row?.asset_value ?? '', '0.00', 0, 999999999.99, 'decimal', 'Minimum 0');
        const notesInput = createInput('textarea', 'edit', 'Notes (optional)', 'assetNotes', 'notes', row?.notes || '', 'Add any notes...', null, 500);

        const actions = div('', 'overlay-action-row');
        const cancelBtn = createButton('assetCancel', 'glass-buttons', 'Cancel', 'assetCancelTxt');
        const saveBtn = createButton('assetSave', 'solid-buttons white', isEdit ? 'Save Changes' : 'Add Asset', 'assetSaveTxt');
        cancelBtn.type = 'button';
        saveBtn.type = 'button';
        cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
        actions.append(cancelBtn, saveBtn);

        form.append(nameInput, typeInput, tagInput, statusBox, projectBox, purchaseInput, valueInput, notesInput, actions);
        overlayBody.append(form);
        overlayShow(overlayBackground);

        async function submit() {
            const payload = {
                asset_name: String(document.getElementById('assetName')?.value || '').trim(),
                asset_type: String(document.getElementById('assetType')?.value || '').trim(),
                asset_tag: String(document.getElementById('assetTag')?.value || '').trim(),
                status: statusSelect.value,
                project_id: projectSelect2.value ? Number(projectSelect2.value) : null,
                purchase_date: document.getElementById('assetPurchaseDate')?.value || null,
                asset_value: String(document.getElementById('assetValue')?.value || '').trim(),
                notes: String(document.getElementById('assetNotes')?.value || '').trim()
            };
            if (!payload.asset_name) return alertPopup('warn', 'Asset name is required');

            saveBtn.disabled = true;
            try {
                const endpoint = isEdit ? `/api/assets/${row.asset_id}` : '/api/assets';
                const resp = await fetch(endpoint, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json().catch(() => ({}));
                if (!resp.ok) throw new Error(data?.message || 'Request failed');
                alertPopup('success', isEdit ? 'Asset updated' : 'Asset added');
                hideOverlayWithBg(overlayBackground);
                refreshFn();
            } catch (e) {
                saveBtn.disabled = false;
                alertPopup('error', e?.message || 'Failed');
            }
        }
        saveBtn.addEventListener('click', submit);
        form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    }

    projectSelect.addEventListener('change', loadAndRender);
    searchBox.addEventListener('input', () => loadAndRender());
    addBtn.addEventListener('click', () => openAssetsOverlay('add', {}, loadAndRender));

    await loadAndRender();
}

async function generateReportsContent() {
    const reportsBodyContent = document.getElementById('reportsBodyContent');
    reportsBodyContent.innerHTML = '';

    const actionsRow = createSectionActionsRow();
    const leftControls = createInlineControlContainer();
    const rightControls = createInlineControlContainer();
    rightControls.style.justifyContent = 'flex-end';

    const projects = await fetchData('/api/selection/project');
    const projectOptions = [{ value: '', label: 'All Projects' }].concat(
        Array.isArray(projects) ? projects.map(p => ({ value: String(p.id), label: p.name })) : []
    );
    const { container: projectSelectBox, select: projectSelect } = createSelectInput('reportsProjectSelect', 'Project', projectOptions);

    const users = await fetchData('/api/selection/user');
    const userOptions = [{ value: '', label: 'All Users' }].concat(
        Array.isArray(users) ? users.map(u => ({ value: String(u.id), label: u.name })) : []
    );
    const { container: userSelectBox, select: userSelect } = createSelectInput('reportsUserSelect', 'User', userOptions);

    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.className = 'input-fields edit';
    searchBox.placeholder = 'Search report title...';
    searchBox.style.minWidth = '260px';

    const refreshBtn = createButton('reportsRefreshBtn', 'glass-buttons', 'Refresh', 'reportsRefreshTxt');
    refreshBtn.type = 'button';

    leftControls.append(projectSelectBox, userSelectBox, searchBox);
    rightControls.append(refreshBtn);
    actionsRow.append(leftControls, rightControls);

    const list = div('', 'logs-container');
    reportsBodyContent.append(actionsRow, list);

    async function loadAndRender() {
        const qs = new URLSearchParams();
        if (projectSelect.value) qs.set('project_id', projectSelect.value);
        if (userSelect.value) qs.set('user_id', userSelect.value);
        const url = `/api/reports${qs.toString() ? `?${qs.toString()}` : ''}`;
        const rows = await fetchData(url);
        const q = (searchBox.value || '').trim().toLowerCase();
        list.innerHTML = '';
        const data = Array.isArray(rows) ? rows : [];
        const filtered = q ? data.filter(r => String(r.report_title || '').toLowerCase().includes(q)) : data;

        if (filtered.length === 0) {
            showEmptyPlaceholder('/assets/icons/logs.png', list, null, 'No reports found');
            return;
        }

        filtered.forEach(r => {
            const card = div('', 'log-card');
            card.style.cursor = 'pointer';

            const top = div('', 'log-card-top');
            const name = div('', 'log-name');
            name.innerText = r.report_title || 'Report';
            const meta = div('', 'log-meta');
            meta.innerText = `${r.created_by_name || 'User'} • ${r.project_name || 'No Project'} • ${dateFormatting(r.created_at, 'date')}`;
            top.append(name, meta);

            const snippet = div('', 'log-snippet');
            const text = String(r.report_body || '');
            snippet.innerText = text.length > 140 ? text.slice(0, 140) + '…' : text;

            card.append(top, snippet);
            card.addEventListener('click', () => openReportOverlay(r));
            list.append(card);
        });
    }

    function openReportOverlay(r) {
        const { overlayBackground, overlayContainer, overlayHeader, overlayBody } = createOverlayWithBg();
        overlayContainer.classList.add('modal-lg');
        overlayHeader.innerHTML = '';

        const headerWrap = div('', 'overlay-header-containers overlay-header-flex');
        const titleWrap = div('', 'overlay-title-wrap');
        const title = span('', 'overlay-title');
        const subtitle = span('', 'overlay-subtitle');
        title.innerText = r.report_title || 'Report';
        subtitle.innerText = `${r.created_by_name || 'User'} • ${r.project_name || 'No Project'} • ${dateFormatting(r.created_at, 'date')}`;
        titleWrap.append(title, subtitle);
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'overlay-close-btn';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
        headerWrap.append(titleWrap, closeBtn);
        overlayHeader.append(headerWrap);

        overlayBody.innerHTML = '';
        const body = div('', 'form-edit-containers');
        body.style.padding = '12px';
        const content = document.createElement('div');
        content.style.whiteSpace = 'pre-wrap';
        content.style.lineHeight = '1.5';
        content.style.color = 'var(--default-text)';
        content.innerText = r.report_body || '';
        body.append(content);
        overlayBody.append(body);
        overlayShow(overlayBackground);
    }

    projectSelect.addEventListener('change', loadAndRender);
    userSelect.addEventListener('change', loadAndRender);
    searchBox.addEventListener('input', () => loadAndRender());
    refreshBtn.addEventListener('click', loadAndRender);

    await loadAndRender();
}

async function generateAnalyticsContent() {
    const analyticsBodyContent = document.getElementById('analyticsBodyContent');
    analyticsBodyContent.innerHTML = '';

    const data = await fetchData('/api/analytics/summary');
    if (!data || data === 'error') {
        showEmptyPlaceholder('/assets/icons/analytics.png', analyticsBodyContent, null, 'Failed to load analytics');
        return;
    }

    const summary = data.summary || {};
    const charts = data.charts || {};

    // Summary cards (reuse dashboard card container styles)
    const cards = div('', 'dashboard-summary-cards');
    cards.style.display = 'grid';
    cards.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
    cards.style.gap = '12px';
    cards.style.marginBottom = '16px';

    function metricCard(label, value) {
        const c = div('', 'dashboard-summary-card');
        c.style.padding = '14px';
        c.style.borderRadius = '14px';
        c.style.background = 'var(--inner-container)';
        c.style.boxShadow = 'var(--shadow)';
        const l = div('', 'summary-label');
        l.style.color = 'var(--grayed-text)';
        l.style.fontSize = '12px';
        l.innerText = label;
        const v = div('', 'summary-value');
        v.style.fontSize = '22px';
        v.style.fontWeight = '700';
        v.style.color = 'var(--default-text)';
        v.innerText = value;
        c.append(l, v);
        return c;
    }

    cards.append(
        metricCard('Total Projects', summary.total_projects ?? 0),
        metricCard('In Progress', summary.in_progress_projects ?? 0),
        metricCard('Completed', summary.completed_projects ?? 0),
        metricCard('Low Inventory Items', summary.low_items ?? 0),
        metricCard('Total Assets', summary.total_assets ?? 0)
    );

    const graphsRow = div('', 'dashboard-graph-container');
    graphsRow.style.display = 'grid';
    graphsRow.style.gridTemplateColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
    graphsRow.style.gap = '14px';

    function chartCard(titleText, canvasId) {
        const card = div('', 'graph-card');
        card.style.background = 'var(--inner-container)';
        card.style.borderRadius = '14px';
        card.style.boxShadow = 'var(--shadow)';
        card.style.padding = '14px';
        const t = div('', 'graph-title');
        t.style.fontWeight = '700';
        t.style.marginBottom = '10px';
        t.innerText = titleText;
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        canvas.style.maxHeight = '280px';
        card.append(t, canvas);
        return card;
    }

    const projectsChartCard = chartCard('Projects by Status', 'adminProjectsByStatusChart');
    const inventoryChartCard = chartCard('Low Inventory by Project', 'adminLowInventoryByProjectChart');
    graphsRow.append(projectsChartCard, inventoryChartCard);

    analyticsBodyContent.append(cards, graphsRow);

    // Render charts (Chart.js is already loaded in adminDashboard.html)
    try {
        const byStatus = Array.isArray(charts.projectsByStatus) ? charts.projectsByStatus : [];
        const statusLabels = byStatus.map(r => formatString(r.status));
        const statusData = byStatus.map(r => Number(r.count) || 0);
        new Chart(document.getElementById('adminProjectsByStatusChart'), {
            type: 'doughnut',
            data: { labels: statusLabels, datasets: [{ data: statusData }] },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const lowByProject = Array.isArray(charts.lowInventoryByProject) ? charts.lowInventoryByProject : [];
        const projLabels = lowByProject.map(r => r.project_name);
        const projData = lowByProject.map(r => Number(r.count) || 0);
        new Chart(document.getElementById('adminLowInventoryByProjectChart'), {
            type: 'bar',
            data: { labels: projLabels, datasets: [{ data: projData }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } catch (e) {
        console.warn('Analytics chart render failed:', e?.message || e);
    }
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

    overlayShow(overlayBackground);
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

function showAddPersonnelOverlay() {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    
    overlayHeader.innerText = "Register New Personnel";
    
    // Create the Form Elements
    const emailInput = createInput('regEmail', 'email', 'Enter staff email');
    const generateBtn = createButton('regGenerateBtn', 'primary-btn', 'Generate & Send Password');
    const statusMsg = div('regStatus', 'error-message'); // Reuse your error class
    
    // The "Masked" Password Display
    const maskDisplay = createInput('regMask', 'text', '**********');
    maskDisplay.readOnly = true;
    maskDisplay.style.textAlign = "center";
    maskDisplay.style.fontSize = "20px";
    maskDisplay.style.letterSpacing = "5px";

    overlayBody.append(emailInput, maskDisplay, generateBtn, statusMsg);
    showOverlayWithBg(overlayBackground);

    // Logic for Generation
    generateBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!email) return alert("Please enter an email");

        generateBtn.disabled = true;
        generateBtn.innerText = "Processing...";
        maskDisplay.value = "********"; 

        try {
            const response = await fetch('/api/register/generate-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                maskDisplay.value = "****************"; // Keep it masked
                generateBtn.innerText = "Email Sent!";
                statusMsg.style.color = "#28a745";
                statusMsg.innerText = "Credentials sent successfully.";
                statusMsg.style.display = "block";
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            generateBtn.disabled = false;
            generateBtn.innerText = "Try Again";
            statusMsg.innerText = error.message;
            statusMsg.style.display = "block";
        }
    });
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


async function showAddUserOverlay() {
    const { overlayBackground, overlayContainer, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayContainer.classList.add('modal-lg', 'personnel-add-modal');

    // Header (title + close)
    overlayHeader.innerHTML = '';
    const headerWrap = div('', 'overlay-header-containers overlay-header-flex');
    const titleWrap = div('', 'overlay-title-wrap');
    const title = span('', 'overlay-title');
    const subtitle = span('', 'overlay-subtitle');
    title.innerText = 'Register New Personnel';
    subtitle.innerText = 'Create an account and send credentials to the new team member.';
    titleWrap.append(title, subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'overlay-close-btn';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    headerWrap.append(titleWrap, closeBtn);
    overlayHeader.append(headerWrap);

    overlayBody.innerHTML = '';

    // Form
    const form = document.createElement('form');
    form.id = 'regPersonnelForm';
    form.className = 'form-edit-forms personnel-add-form';

    const nameInputBox = createInput('text', 'edit', 'Full Name', 'regFullName', 'full_name', '', 'e.g. Juan Dela Cruz', null, 150);
    const emailInputBox = createInput('email', 'edit', 'Email Address', 'regEmailInput', 'email', '', 'e.g. juan@company.com', null, 150);

    // Role select (styled like inputs)
    const roleBox = div('regRoleBox', 'input-box-containers');
    const roleLabel = document.createElement('label');
    roleLabel.className = 'input-labels';
    roleLabel.htmlFor = 'regRoleInput';
    roleLabel.innerText = 'Role';

    const roleSelect = document.createElement('select');
    roleSelect.id = 'regRoleInput';
    roleSelect.name = 'role';
    roleSelect.className = 'input-fields edit';
    roleSelect.innerHTML = '<option value="">Loading roles...</option>';

    const roleErr = span('', 'error-messages');
    roleErr.dataset.errMsg = 'Role Required';
    roleErr.dataset.defaultMsg = ' ';
    roleErr.innerText = roleErr.dataset.defaultMsg;

    roleSelect.addEventListener('change', () => validateInput(roleSelect));

    roleBox.append(roleLabel, roleSelect, roleErr);

    // Success (masked password) - only for confirmation
    const successBox = div('regSuccessContainer', 'input-box-containers');
    successBox.style.display = 'none';
    const passLabel = document.createElement('label');
    passLabel.className = 'input-labels';
    passLabel.innerText = 'Temporary Password Generated';

    const maskInput = document.createElement('input');
    maskInput.id = 'regMaskInput';
    maskInput.readOnly = true;
    maskInput.className = 'input-fields read';
    maskInput.style.textAlign = 'center';
    maskInput.style.letterSpacing = '6px';

    const passNote = span('', 'error-messages');
    passNote.dataset.defaultMsg = 'Credentials were sent via email.';
    passNote.innerText = passNote.dataset.defaultMsg;

    successBox.append(passLabel, maskInput, passNote);

    // Actions
    const actions = div('regActions', 'overlay-action-row');
    const cancelBtn = createButton('regCancelBtn', 'glass-buttons', 'Cancel', 'regCancelTxt');
    // Primary action button should have white text on the blue background
    const submitBtn = createButton('regSubmitBtn', 'solid-buttons white', 'Generate & Send Credentials', 'regSubmitTxt');

    cancelBtn.type = 'button';
    submitBtn.type = 'button';

    cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    actions.append(cancelBtn, submitBtn);

    form.append(nameInputBox, emailInputBox, roleBox, successBox, actions);
    overlayBody.append(form);

    overlayShow(overlayBackground);

    // Populate roles
    try {
        const roles = await fetchData('/api/roles');
        if (roles && roles.length > 0) {
            roleSelect.innerHTML = '<option value="">Select a role...</option>' + roles.map(r => `<option value="${r}">${formatString(r)}</option>`).join('');
        } else {
            roleSelect.innerHTML = `
                <option value="">Select a role...</option>
                <option value="admin">Admin</option>
                <option value="engineer">Engineer</option>
                <option value="foreman">Foreman</option>
                <option value="project manager">Project Manager</option>`;
        }
    } catch (e) {
        roleSelect.innerHTML = `
            <option value="">Select a role...</option>
            <option value="engineer">Engineer</option>
            <option value="foreman">Foreman</option>
            <option value="project manager">Project Manager</option>`;
    }

    async function submit() {
        const nameVal = document.getElementById('regFullName')?.value.trim();
        const emailVal = document.getElementById('regEmailInput')?.value.trim();
        const roleVal = document.getElementById('regRoleInput')?.value;

        // Basic validation
        validateInput(document.getElementById('regFullName'));
        validateInput(document.getElementById('regEmailInput'));
        validateInput(document.getElementById('regRoleInput'));

        if (!nameVal || !emailVal || !roleVal) {
            return alertPopup('warn', 'Please complete all required fields');
        }

        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        const originalTxt = submitBtn.querySelector('.btn-texts')?.innerText || submitBtn.innerText;
        if (submitBtn.querySelector('.btn-texts')) submitBtn.querySelector('.btn-texts').innerText = 'Sending...';
        else submitBtn.innerText = 'Sending...';

        try {
            const response = await fetch('/api/register/generate-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: nameVal, email: emailVal, role: roleVal })
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to create account');

            successBox.style.display = 'block';
            maskInput.value = '****************';

            if (submitBtn.querySelector('.btn-texts')) submitBtn.querySelector('.btn-texts').innerText = 'Credentials Sent';
            else submitBtn.innerText = 'Credentials Sent';

            submitBtn.disabled = true;
            alertPopup('success', `Account created for ${nameVal}`);

            // Refresh personnel list
            const userListContainer = document.getElementById('userListContainer');
            if (userListContainer) fetchAndRenderUsers(userListContainer);

        } catch (err) {
            submitBtn.disabled = false;
            if (submitBtn.querySelector('.btn-texts')) submitBtn.querySelector('.btn-texts').innerText = originalTxt;
            else submitBtn.innerText = originalTxt;
            alertPopup('error', err.message);
        } finally {
            submitBtn.classList.remove('loading');
        }
    }

    submitBtn.addEventListener('click', submit);
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
}

// -----------------------------
// Personnel: Edit & Terminate overlays
// -----------------------------

function computeInitials(fullName) {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return (parts[0][0] || '?').toUpperCase();
    return ((parts[0][0] || '?') + (parts[parts.length - 1][0] || '?')).toUpperCase();
}

function updatePersonnelCardInPlace(userId, patch) {
    const card = document.querySelector(`.personnel-card[data-user-id="${userId}"]`);
    if (!card) return;

    if (patch.full_name) {
        const nameEl = card.querySelector('.personnel-name');
        const avatarEl = card.querySelector('.personnel-avatar');
        if (nameEl) nameEl.textContent = patch.full_name;
        if (avatarEl) avatarEl.textContent = computeInitials(patch.full_name);
    }

    if (patch.email) {
        const emailEl = card.querySelector('.personnel-email');
        if (emailEl) emailEl.textContent = patch.email;
    }

    if (patch.role) {
        const roleEl = card.querySelector('.personnel-role-tag');
        if (roleEl) roleEl.textContent = formatString(patch.role);
    }

    if (typeof patch.is_active !== 'undefined') {
        const bubble = card.querySelector('.status-bubble');
        if (bubble) {
            bubble.classList.remove('status-active', 'status-inactive');
            bubble.classList.add(patch.is_active == 1 ? 'status-active' : 'status-inactive');
        }
    }
}

async function editCredentials(userId) {
    const user = await fetchData(`/api/users/${userId}`);
    if (!user || user === 'error') {
        return alertPopup('error', 'Unable to load personnel details');
    }

    const { overlayBackground, overlayContainer, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayContainer.classList.add('modal-lg', 'personnel-add-modal');

    // Header (title + close) - reuse Add Personnel overlay design
    overlayHeader.innerHTML = '';
    const headerWrap = div('', 'overlay-header-containers overlay-header-flex');
    const titleWrap = div('', 'overlay-title-wrap');
    const title = span('', 'overlay-title');
    const subtitle = span('', 'overlay-subtitle');
    title.innerText = 'Edit Personnel';
    subtitle.innerText = 'Update personnel information and system access.';
    titleWrap.append(title, subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'overlay-close-btn';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    headerWrap.append(titleWrap, closeBtn);
    overlayHeader.append(headerWrap);

    overlayBody.innerHTML = '';

    // Form
    const form = document.createElement('form');
    form.id = 'editPersonnelForm';
    form.className = 'form-edit-forms personnel-add-form';

    const nameInputBox = createInput('text', 'edit', 'Full Name', 'editFullName', 'full_name', user.full_name || '', 'e.g. Juan Dela Cruz', null, 150);
    const emailInputBox = createInput('email', 'edit', 'Email Address', 'editEmailInput', 'email', user.email || '', 'e.g. juan@company.com', null, 150);

    // Role select (styled like inputs)
    const roleBox = div('editRoleBox', 'input-box-containers');
    const roleLabel = document.createElement('label');
    roleLabel.className = 'input-labels';
    roleLabel.htmlFor = 'editRoleInput';
    roleLabel.innerText = 'Role';

    const roleSelect = document.createElement('select');
    roleSelect.id = 'editRoleInput';
    roleSelect.name = 'role';
    roleSelect.className = 'input-fields edit';
    roleSelect.innerHTML = '<option value="">Loading roles...</option>';

    const roleErr = span('', 'error-messages');
    roleErr.dataset.errMsg = 'Role Required';
    roleErr.dataset.defaultMsg = ' ';
    roleErr.innerText = roleErr.dataset.defaultMsg;

    roleSelect.addEventListener('change', () => validateInput(roleSelect));
    roleBox.append(roleLabel, roleSelect, roleErr);

    // Optional password update (leave blank to keep current password)
    const passwordInputBox = createInput(
        'password',
        'edit',
        'New Password (optional)',
        'editPassword',
        'password',
        '',
        'Leave blank to keep current password',
        null,
        100
    );
    const confirmPasswordInputBox = createInput(
        'password',
        'edit',
        'Confirm New Password',
        'editPasswordConfirm',
        'password_confirm',
        '',
        'Re-enter the new password',
        null,
        100
    );

    // Actions
    const actions = div('editActions', 'overlay-action-row');
    const cancelBtn = createButton('editCancelBtn', 'glass-buttons', 'Cancel', 'editCancelTxt');
    // Primary action button should have white text on the blue background
    const saveBtn = createButton('editSaveBtn', 'solid-buttons white', 'Save Changes', 'editSaveTxt');

    cancelBtn.type = 'button';
    saveBtn.type = 'button';
    cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    actions.append(cancelBtn, saveBtn);
    form.append(nameInputBox, emailInputBox, roleBox, passwordInputBox, confirmPasswordInputBox, actions);
    overlayBody.append(form);

    overlayShow(overlayBackground);

    // Populate roles
    try {
        const roles = await fetchData('/api/roles');
        if (roles && roles.length > 0) {
            roleSelect.innerHTML = '<option value="">Select a role...</option>' + roles.map(r => `<option value="${r}">${formatString(r)}</option>`).join('');
        } else {
            roleSelect.innerHTML = `
                <option value="">Select a role...</option>
                <option value="admin">Admin</option>
                <option value="engineer">Engineer</option>
                <option value="foreman">Foreman</option>
                <option value="project manager">Project Manager</option>`;
        }
    } catch (e) {
        roleSelect.innerHTML = `
            <option value="">Select a role...</option>
            <option value="admin">Admin</option>
            <option value="engineer">Engineer</option>
            <option value="foreman">Foreman</option>
            <option value="project manager">Project Manager</option>`;
    }

    // Select current role after options are ready
    if (user.role) roleSelect.value = user.role;

    async function submit() {
        const nameEl = document.getElementById('editFullName');
        const emailEl = document.getElementById('editEmailInput');
        const roleEl = document.getElementById('editRoleInput');

        validateInput(nameEl);
        validateInput(emailEl);
        validateInput(roleEl);

        const fullName = nameEl?.value.trim();
        const email = emailEl?.value.trim();
        const role = roleEl?.value;

        const pwEl = document.getElementById('editPassword');
        const pwConfirmEl = document.getElementById('editPasswordConfirm');
        const newPassword = (pwEl?.value || '').trim();
        const confirmPassword = (pwConfirmEl?.value || '').trim();

        if (!fullName || !email || !role) {
            return alertPopup('warn', 'Please complete all required fields');
        }

        if (newPassword) {
            if (newPassword.length < 6) {
                return alertPopup('warn', 'Password must be at least 6 characters');
            }
            if (newPassword !== confirmPassword) {
                return alertPopup('warn', 'Passwords do not match');
            }
        }

        saveBtn.disabled = true;
        const originalTxt = saveBtn.querySelector('.btn-texts')?.innerText || saveBtn.innerText;
        if (saveBtn.querySelector('.btn-texts')) saveBtn.querySelector('.btn-texts').innerText = 'Saving...';
        else saveBtn.innerText = 'Saving...';

        try {
            const resp = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: fullName, email, role, password: newPassword || '' })
            });
            const data = await resp.json();
            if (!resp.ok || data?.success === false) throw new Error(data?.message || 'Failed to update personnel');

            updatePersonnelCardInPlace(userId, { full_name: fullName, email, role });
            alertPopup('success', 'Personnel updated successfully');
            hideOverlayWithBg(overlayBackground);
        } catch (err) {
            saveBtn.disabled = false;
            if (saveBtn.querySelector('.btn-texts')) saveBtn.querySelector('.btn-texts').innerText = originalTxt;
            else saveBtn.innerText = originalTxt;
            alertPopup('error', err.message);
        }
    }

    saveBtn.addEventListener('click', submit);
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
}

async function terminatePersonnel(userId) {
    const user = await fetchData(`/api/users/${userId}`);
    if (!user || user === 'error') {
        return alertPopup('error', 'Unable to load personnel details');
    }

    const { overlayBackground, overlayContainer, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayContainer.classList.add('modal-lg', 'personnel-add-modal');

    // Header (title + close)
    overlayHeader.innerHTML = '';
    const headerWrap = div('', 'overlay-header-containers overlay-header-flex');
    const titleWrap = div('', 'overlay-title-wrap');
    const title = span('', 'overlay-title');
    const subtitle = span('', 'overlay-subtitle');
    title.innerText = 'Termination';
    subtitle.innerText = `Terminate access for ${user.full_name || 'this user'}.`;
    titleWrap.append(title, subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'overlay-close-btn';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
    headerWrap.append(titleWrap, closeBtn);
    overlayHeader.append(headerWrap);

    overlayBody.innerHTML = '';

    const form = document.createElement('form');
    form.id = 'terminatePersonnelForm';
    form.className = 'form-edit-forms personnel-add-form';

    const reasonBox = createInput('textarea', 'edit', 'Termination Reason', 'terminationReason', 'termination_reason', '', 'Provide a reason for termination...', null, 500);
    const reasonEl = reasonBox.querySelector('textarea') || reasonBox.querySelector('input');

    // Actions: Cancel + Terminate (disabled until reason filled)
    const actions = div('terminateActions', 'overlay-action-row');
    const cancelBtn = createButton('terminateCancelBtn', 'glass-buttons', 'Cancel', 'terminateCancelTxt');
    // Primary action button should have white text on the blue background
    const terminateBtn = createButton('terminateConfirmBtn', 'solid-buttons white', 'Terminate', 'terminateConfirmTxt');

    cancelBtn.type = 'button';
    terminateBtn.type = 'button';
    terminateBtn.disabled = true;
    terminateBtn.style.opacity = '0.6';
    terminateBtn.style.cursor = 'not-allowed';

    cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    function syncTerminateState() {
        const hasReason = !!(reasonEl?.value || '').trim();
        terminateBtn.disabled = !hasReason;
        terminateBtn.style.opacity = hasReason ? '1' : '0.6';
        terminateBtn.style.cursor = hasReason ? 'pointer' : 'not-allowed';
    }
    if (reasonEl) {
        reasonEl.addEventListener('input', syncTerminateState);
        syncTerminateState();
    }

    actions.append(cancelBtn, terminateBtn);
    form.append(reasonBox, actions);
    overlayBody.append(form);
    overlayShow(overlayBackground);

    async function submit() {
        const reason = (document.getElementById('terminationReason')?.value || '').trim();
        if (!reason) return;

        terminateBtn.disabled = true;
        const originalTxt = terminateBtn.querySelector('.btn-texts')?.innerText || terminateBtn.innerText;
        if (terminateBtn.querySelector('.btn-texts')) terminateBtn.querySelector('.btn-texts').innerText = 'Terminating...';
        else terminateBtn.innerText = 'Terminating...';

        try {
            const resp = await fetch(`/api/users/${userId}/terminate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await resp.json();
            if (!resp.ok || data?.success === false) throw new Error(data?.message || 'Failed to terminate personnel');

            // Refresh list to ensure the terminated account is removed from the UI
            const userListContainer = document.getElementById('userListContainer');
            if (userListContainer) fetchAndRenderUsers(userListContainer);
            alertPopup('success', 'Personnel terminated successfully');
            hideOverlayWithBg(overlayBackground);
        } catch (err) {
            terminateBtn.disabled = false;
            if (terminateBtn.querySelector('.btn-texts')) terminateBtn.querySelector('.btn-texts').innerText = originalTxt;
            else terminateBtn.innerText = originalTxt;
            syncTerminateState();
            alertPopup('error', err.message);
        }
    }

    terminateBtn.addEventListener('click', submit);
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
}

// Ensure inline onclick handlers work (adminContent.js is loaded as a module)
window.editCredentials = editCredentials;
window.terminatePersonnel = terminatePersonnel;
