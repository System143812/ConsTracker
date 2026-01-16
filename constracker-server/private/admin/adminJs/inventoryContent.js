import { fetchData } from "/js/apiURL.js";
import { div, span, createPaginationControls } from "/js/components.js";

function createEmptyPlaceholder() {
    const placeholder = div('empty-inventory-placeholder');
    const img = document.createElement('img');
    img.src = '/assets/icons/inventory.png'; 
    img.alt = 'Empty Inventory';

    const title = document.createElement('h3');
    title.textContent = 'No Items Found';

    const message = document.createElement('p');
    message.textContent = 'There are currently no items in this inventory that match your search.';

    placeholder.append(img, title, message);
    return placeholder;
}

function createInventoryCard(item) {
    const card = div(null, 'inventory-item-card');

    const imageContainer = div(null, 'item-image-container');
    const itemImage = document.createElement('img');
    
    if (item.image_path) {
        itemImage.src = `/itemImages/${item.image_path}`;
        itemImage.alt = item.item_name;
        itemImage.classList.add('item-image');
    } else {
        itemImage.src = '/assets/icons/weightsBlue.png';
        itemImage.alt = 'Default Item Image';
        itemImage.classList.add('item-image-placeholder');
    }
    imageContainer.append(itemImage);

    const infoContainer = div(null, 'item-info-container');
    const itemName = div(null, 'item-name');
    itemName.textContent = item.item_name;

    const itemDescription = div(null, 'item-description');
    itemDescription.textContent = item.item_description || 'No description available.';

    const detailsGrid = div(null, 'item-details-grid');
    const categoryDetail = div(null, 'detail-item');
    categoryDetail.innerHTML = `<span class="detail-label">Category</span><span class="detail-value">${item.category_name || 'N/A'}</span>`;
    
    const unitDetail = div(null, 'detail-item');
    unitDetail.innerHTML = `<span class="detail-label">Unit</span><span class="detail-value">${item.unit_name || 'N/A'}</span>`;
    
    detailsGrid.append(categoryDetail, unitDetail);
    infoContainer.append(itemName, itemDescription, detailsGrid);

    const stockContainer = div(null, 'item-stock-container');
    const stockLabel = span('Stock Balance', 'stock-label');
    const stockBalance = span(item.stock_balance, 'stock-balance');

    if (item.stock_balance <= 0) {
        stockBalance.classList.add('out-of-stock');
    } else if (item.stock_balance <= 10) { 
        stockBalance.classList.add('low-stock');
    }

    stockContainer.append(stockLabel, stockBalance);
    card.append(imageContainer, infoContainer, stockContainer);

    return card;
}

export async function generateInventoryContent(role) {
    const inventoryBodyHeader = document.getElementById('inventoryBodyHeader');
    const inventoryBodyContent = document.getElementById('inventoryBodyContent'); 
    inventoryBodyContent.innerHTML = ''; 

    const inventoryBodyHeaderContainer = inventoryBodyHeader.querySelector('.body-header-container');
    const title = inventoryBodyHeaderContainer.querySelector('.body-header-title');
    const subtitle = inventoryBodyHeaderContainer.querySelector('.body-header-subtitle');
    title.innerText = 'Inventory Overview';
    subtitle.innerText = 'Stock levels of all items in the main inventory or a specific project.';

    const projectSelectContainer = div(null, 'project-select-container');
    const projectSelectLabel = document.createElement('label');
    projectSelectLabel.htmlFor = 'project-select';
    projectSelectLabel.innerText = 'Select Inventory:';
    
    const projectSelect = document.createElement('select');
    projectSelect.id = 'project-select';
    projectSelect.classList.add('filter-select');

    const mainOption = document.createElement('option');
    mainOption.value = 'main';
    mainOption.innerText = 'Main Inventory';
    projectSelect.append(mainOption);

    const projects = await fetchData('/api/selection/project');
    if (projects && projects !== 'error' && projects.length > 0) {
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.innerText = project.name;
            projectSelect.append(option);
        });
    }
    
    projectSelectContainer.append(projectSelectLabel, projectSelect);

    const filterContainer = div('inventory-filter-container', 'inventory-filter-container');
    const inventoryListContainer = div('inventory-list-container', 'inventory-list-container');
    const paginationContainer = div('inventoryPaginationContainer', 'pagination-container');
    
    inventoryBodyContent.append(projectSelectContainer, filterContainer, inventoryListContainer, paginationContainer);

    let currentPage = 1;
    let itemsPerPage = 12;
    let allInventory = [];
    let filteredInventory = [];
    
    projectSelect.addEventListener('change', fetchAndRenderInventory);

    function renderInventory() {
        inventoryListContainer.innerHTML = '';
        paginationContainer.innerHTML = '';

        if (filteredInventory.length === 0) {
            inventoryListContainer.append(createEmptyPlaceholder());
            return;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = filteredInventory.slice(start, end);

        pageItems.forEach(item => {
            const card = createInventoryCard(item);
            inventoryListContainer.append(card);
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: filteredInventory.length,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderInventory();
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1; 
                renderInventory();
            }
        });
        if (filteredInventory.length > itemsPerPage) {
            paginationContainer.append(paginationControls);
        }
    }

    function applyFilters() {
        const nameFilter = document.getElementById('inventory-name-filter').value.toLowerCase();
        
        filteredInventory = allInventory.filter(item => 
            item.item_name.toLowerCase().includes(nameFilter)
        );

        currentPage = 1;
        renderInventory();
    }

    async function fetchAndRenderInventory() {
        inventoryListContainer.innerHTML = '<div class="loading-dots"></div>'; 
        const selectedInventory = projectSelect.value;
        
        let url = selectedInventory === 'main' 
            ? '/api/inventory' 
            : `/api/inventory/project/${selectedInventory}`;

        if (selectedInventory !== 'main') {
            const selectedProject = projects.find(p => p.id == selectedInventory);
            title.innerText = `${selectedProject.name} Inventory`;
            subtitle.innerText = `Stock levels for the ${selectedProject.name} project.`;
        } else {
            title.innerText = 'Main Inventory Overview';
            subtitle.innerText = 'Stock levels of all items in the main inventory.';
        }

        const data = await fetchData(url);
        
        allInventory = (data && data !== 'error') ? data : [];
        applyFilters();
    }
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'inventory-name-filter';
    searchInput.placeholder = 'Search by item name...';
    searchInput.addEventListener('input', applyFilters);
    filterContainer.append(searchInput);

    await fetchAndRenderInventory();
}
