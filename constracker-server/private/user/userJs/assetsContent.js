import { fetchData } from "/js/apiURL.js";
import { div, span, createButton, createInput } from "/js/components.js";
import { showEmptyPlaceholder } from "/js/popups.js";
import { createOverlayWithBg, hideOverlayWithBg } from "/mainJs/overlays.js";
import { dateFormatting } from "/js/string.js";

async function createAssetOverlay(refreshCallback) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = 'Add New Asset';

    const form = document.createElement('form');
    form.id = 'assetForm';
    form.classList.add('form-edit-forms');

    const assetItems = await fetchData('/api/assets/items');
    if (assetItems === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load asset types.');
    }
    if (assetItems.length === 0) {
        overlayBody.innerHTML = '<p>No items marked as "asset" found. Please create an asset-type item first in the Materials section.</p>';
        const closeButton = createButton('closeOverlayBtn', 'wide-buttons', 'Close');
        closeButton.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
        overlayBody.append(closeButton);
        return;
    }

    const projects = await fetchData('/api/selection/project');
    if (projects === 'error') {
        hideOverlayWithBg(overlayBackground);
        return alertPopup('error', 'Failed to load projects.');
    }

    // Asset Type Select
    const itemSelectContainer = div('assetItemContainer', 'input-box-containers');
    const itemLabel = document.createElement('label');
    itemLabel.className = 'input-labels';
    itemLabel.textContent = 'Asset Type';
    const itemSelect = document.createElement('select');
    itemSelect.id = 'assetItem';
    assetItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item.item_id;
        option.textContent = item.item_name;
        itemSelect.append(option);
    });
    const itemErrorSpan = span(null, 'error-messages');
    itemErrorSpan.dataset.errMsg = 'Asset Type Required';
    itemSelectContainer.append(itemLabel, itemSelect, itemErrorSpan);

    const serialInput = createInput('text', 'edit', 'Serial Number', 'serialNumber', 'serial_number', '', 'Enter serial number');

    // Condition Select
    const conditionSelectContainer = div('conditionContainer', 'input-box-containers');
    const conditionLabel = document.createElement('label');
    conditionLabel.className = 'input-labels';
    conditionLabel.textContent = 'Condition';
    const conditionSelect = document.createElement('select');
    conditionSelect.id = 'conditionStatus';
    ['excellent', 'good', 'fair', 'poor', 'damaged'].forEach(s => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s.charAt(0).toUpperCase() + s.slice(1);
        conditionSelect.append(o);
    });
    const conditionErrorSpan = span(null, 'error-messages');
    conditionErrorSpan.dataset.errMsg = 'Condition Required';
    conditionSelectContainer.append(conditionLabel, conditionSelect, conditionErrorSpan);

    // Usage Status Select
    const usageSelectContainer = div('usageContainer', 'input-box-containers');
    const usageLabel = document.createElement('label');
    usageLabel.className = 'input-labels';
    usageLabel.textContent = 'Usage Status';
    const usageSelect = document.createElement('select');
    usageSelect.id = 'usageStatus';
    ['available', 'in-use', 'maintenance', 'retired'].forEach(s => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s.charAt(0).toUpperCase() + s.slice(1);
        usageSelect.append(o);
    });
    const usageErrorSpan = span(null, 'error-messages');
    usageErrorSpan.dataset.errMsg = 'Usage Status Required';
    usageSelectContainer.append(usageLabel, usageSelect, usageErrorSpan);

    // Project Select
    const projectSelectContainer = div('projectContainer', 'input-box-containers');
    const projectLabel = document.createElement('label');
    projectLabel.className = 'input-labels';
    projectLabel.textContent = 'Assign to Project';
    const projectSelect = document.createElement('select');
    projectSelect.id = 'project';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Not Assigned';
    projectSelect.append(defaultOption);
    projects.forEach(p => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.name;
        projectSelect.append(o);
    });
    const projectErrorSpan = span(null, 'error-messages'); // Not strictly required, but good for consistency
    projectSelectContainer.append(projectLabel, projectSelect, projectErrorSpan);

    const inspectedInput = createInput('date', 'edit', 'Last Inspected', 'lastInspectedAt', 'last_inspected_at', '');

    const footer = div(null, 'create-form-footers');
    const submitButton = createButton('submitAsset', 'wide-buttons', 'Add Asset');
    const cancelButton = createButton('closeOverlayBtn', 'wide-buttons', 'Cancel');
    cancelButton.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
    footer.append(cancelButton, submitButton);

    submitButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        let isValid = true;
        if (!validateInput(itemSelect)) isValid = false;
        if (!validateInput(serialInput.querySelector('input'))) isValid = false;
        if (!validateInput(conditionSelect)) isValid = false;
        if (!validateInput(usageSelect)) isValid = false;
        // Project and inspected date are optional

        if (!isValid) {
            alertPopup('error', 'Please fill in all required fields.');
            return;
        }

        const assetData = {
            item_id: itemSelect.value,
            serial_number: serialInput.querySelector('input').value,
            condition_status: conditionSelect.value,
            usage_status: usageSelect.value,
            project_id: projectSelect.value || null,
            last_inspected_at: inspectedInput.querySelector('input').value || null,
        };

        const result = await fetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assetData)
        });
        
        const responseData = await result.json();

        if (result.ok) {
            alertPopup('success', responseData.message);
            hideOverlayWithBg(overlayBackground);
            if (refreshCallback) refreshCallback();
        } else {
            alertPopup('error', responseData.message || 'Failed to create asset.');
        }
    });

    form.append(itemSelectContainer, serialInput, conditionSelectContainer, usageSelectContainer, projectSelectContainer, inspectedInput, footer);
    overlayBody.append(form);
}


export async function generateAssetsContent() {
    const assetsBodyHeader = document.getElementById('assetsBodyHeader');
    const assetsBodyContent = document.getElementById('assetsBodyContent');
    assetsBodyContent.innerHTML = '';

    const headerContainer = assetsBodyHeader.querySelector('.body-header-container');
    const title = headerContainer.querySelector('.body-header-title');
    const subtitle = headerContainer.querySelector('.body-header-subtitle');
    title.innerText = 'Asset Management';
    subtitle.innerText = 'Track and manage all company assets';
    
    // Clear any previous buttons and add create asset button
    const existingBtn = assetsBodyHeader.querySelector('.solid-buttons');
    if (existingBtn) existingBtn.remove();
    const createAssetBtn = createButton('createAssetBtn', 'solid-buttons btn-blue', 'Add Asset', 'createAssetBtnText', 'addIconWhite');
    createAssetBtn.addEventListener('click', () => createAssetOverlay(renderAssets));
    assetsBodyHeader.append(createAssetBtn);

    const assetsListContainer = div('assets-list-container');
    assetsBodyContent.append(assetsListContainer);

    async function renderAssets() {
        assetsListContainer.innerHTML = '';
        const data = await fetchData('/api/assets');

        if (data === 'error' || data.length === 0) {
            showEmptyPlaceholder('/assets/icons/assets.png', assetsBodyContent, null, "No assets found.");
            return;
        }

        const table = document.createElement('table');
        table.classList.add('assets-table');
        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>Asset Name</th><th>Serial Number</th><th>Condition</th><th>Usage Status</th><th>Project</th><th>Last Inspected</th></tr>';
        const tbody = document.createElement('tbody');

        data.forEach(asset => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${asset.item_name}</td>
                <td>${asset.serial_number || 'N/A'}</td>
                <td>${asset.condition_status}</td>
                <td>${asset.usage_status}</td>
                <td>${asset.project_name || 'Not Assigned'}</td>
                <td>${asset.last_inspected_at ? dateFormatting(asset.last_inspected_at, 'date') : 'N/A'}</td>
            `;
            // Add click listener for details/edit later
            tbody.append(row);
        });

        table.append(thead, tbody);
        assetsListContainer.append(table);
    }

    await renderAssets();
}
