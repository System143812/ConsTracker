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
    
    const assetItems = await fetchData('/api/assets/items');
    if (assetItems === 'error' || assetItems.length === 0) {
        overlayBody.innerHTML = '<p>No items marked as "asset" found. Please create an asset-type item first in the Materials section.</p>';
        const closeButton = createButton('closeOverlayBtn', 'wide-buttons', 'Close');
        closeButton.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
        overlayBody.append(closeButton);
        return;
    }

    const projects = await fetchData('/api/selection/project');
    if (projects === 'error') {
        hideOverlayWithBg(overlayBackground);
        // show error
        return;
    }

    const itemLabel = document.createElement('label');
    itemLabel.textContent = 'Asset Type';
    const itemSelect = document.createElement('select');
    itemSelect.id = 'assetItem';
    assetItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item.item_id;
        option.textContent = item.item_name;
        itemSelect.append(option);
    });

    const serialInput = createInput('text', 'serial_number', 'serialNumber', '', 'Serial Number');

    const conditionLabel = document.createElement('label');
    conditionLabel.textContent = 'Condition';
    const conditionSelect = document.createElement('select');
    conditionSelect.id = 'conditionStatus';
    ['excellent', 'good', 'fair', 'poor', 'damaged'].forEach(s => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s.charAt(0).toUpperCase() + s.slice(1);
        conditionSelect.append(o);
    });

    const usageLabel = document.createElement('label');
    usageLabel.textContent = 'Usage Status';
    const usageSelect = document.createElement('select');
    usageSelect.id = 'usageStatus';
    ['available', 'in-use', 'maintenance', 'retired'].forEach(s => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s.charAt(0).toUpperCase() + s.slice(1);
        usageSelect.append(o);
    });

    const projectLabel = document.createElement('label');
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

    const inspectedInput = createInput('date', 'last_inspected_at', 'lastInspectedAt', '', 'Last Inspected');

    const submitButton = createButton('submitAsset', 'solid-buttons', 'Add Asset');
    submitButton.type = 'submit';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const assetData = {
            item_id: document.getElementById('assetItem').value,
            serial_number: document.getElementById('serialNumber').value,
            condition_status: document.getElementById('conditionStatus').value,
            usage_status: document.getElementById('usageStatus').value,
            project_id: document.getElementById('project').value || null,
            last_inspected_at: document.getElementById('lastInspectedAt').value || null,
        };

        const result = await fetchData('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assetData)
        });

        if (result.status === 'success') {
            hideOverlayWithBg(overlayBackground);
            if (refreshCallback) refreshCallback();
        } else {
            console.error('Failed to create asset:', result);
        }
    });

    form.append(itemLabel, itemSelect, serialInput, conditionLabel, conditionSelect, usageLabel, usageSelect, projectLabel, projectSelect, inspectedInput, submitButton);
    overlayBody.append(form);
    const closeButton = createButton('closeOverlayBtn', 'wide-buttons', 'Cancel');
    closeButton.addEventListener('click', () => hideOverlayWithBg(overlayBackground));
    overlayBody.append(closeButton);
}


export async function generateAssetsContent() {
    const assetsBodyContent = document.getElementById('assetsBodyContainer');
    assetsBodyContent.innerHTML = '';

    const bodyHeader = div('', 'body-header');
    const headerContainer = div('', 'body-header-container');
    const title = span('', 'body-header-title');
    title.innerText = 'Asset Management';
    const subtitle = span('', 'body-header-subtitle');
    subtitle.innerText = 'Track and manage all company assets';
    headerContainer.append(title, subtitle);
    
    const createAssetBtn = createButton('createAssetBtn', 'solid-buttons', 'Add Asset');
    createAssetBtn.addEventListener('click', () => createAssetOverlay(renderAssets));
    bodyHeader.append(headerContainer, createAssetBtn);

    const assetsListContainer = div('assets-list-container');
    assetsBodyContent.append(bodyHeader, assetsListContainer);

    async function renderAssets() {
        assetsListContainer.innerHTML = '<div class="loading-spinner"></div>';
        const data = await fetchData('/api/assets');
        assetsListContainer.innerHTML = '';

        if (data === 'error' || data.length === 0) {
            showEmptyPlaceholder('/assets/icons/assets.png', assetsListContainer, null, "No assets found.");
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
