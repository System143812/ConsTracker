import { fetchData } from "/js/apiURL.js";
import { div, span, createPaginationControls, createFilterContainer } from "/js/components.js";
import { showEmptyPlaceholder } from "/js/popups.js";

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

    projectSelect.addEventListener('change', fetchAndRenderInventory);

    function renderInventory(itemsToDisplay) {
        inventoryListContainer.innerHTML = '';
        paginationContainer.innerHTML = '';

        if (itemsToDisplay.length === 0) {
            showEmptyPlaceholder('/assets/icons/inventory.png', inventoryListContainer, null, "No Materials found.");
            return;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = itemsToDisplay.slice(start, end);

        pageItems.forEach(item => {
            const card = createInventoryCard(item);
            inventoryListContainer.append(card);
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: itemsToDisplay.length,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderInventory(itemsToDisplay);
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1; 
                renderInventory(itemsToDisplay);
            }
        });
        if (itemsToDisplay.length > itemsPerPage) {
            paginationContainer.append(paginationControls);
        }
    }

    async function applyFilterToInventory(filteredUrlParams) {
        currentPage = 1;
        await renderInventoryWithFilters(filteredUrlParams);
    }

    async function renderInventoryWithFilters(urlParams = new URLSearchParams()) {
        inventoryListContainer.innerHTML = '<div class="loading-dots"></div>';
        
        // Get filter values from URL params
        const nameFilter = urlParams.get('name')?.toLowerCase() || '';
        const projectFilter = urlParams.get('project')?.toLowerCase() || 'all';
        const categoryFilter = urlParams.get('category') || 'all';
        const dateFromFilter = urlParams.get('dateFrom') || 'all';
        const dateToFilter = urlParams.get('dateTo') || 'all';
        const sortFilter = urlParams.get('sort') || 'newest';

        // Determine which inventory to fetch
        let selectedInventoryId = projectSelect.value;
        if (projectFilter !== 'all' && projectFilter !== '') {
            selectedInventoryId = projectFilter;
        }

        let url = selectedInventoryId === 'main' 
            ? '/api/inventory' 
            : `/api/inventory/project/${selectedInventoryId}`;

        const data = await fetchData(url);
        allInventory = (data && data !== 'error') ? data : [];

        // Update title and subtitle
        if (selectedInventoryId !== 'main') {
            const selectedProject = projects.find(p => p.id == selectedInventoryId);
            title.innerText = selectedProject ? `${selectedProject.name} Inventory` : 'Inventory Overview';
            subtitle.innerText = selectedProject ? `Stock levels for the ${selectedProject.name} project.` : 'Stock levels of all items.';
        } else {
            title.innerText = 'Main Inventory Overview';
            subtitle.innerText = 'Stock levels of all items in the main inventory.';
        }

        // Apply filters
        let filteredInventory = allInventory.filter(item => {
            const itemNameMatch = item.item_name.toLowerCase().includes(nameFilter);
            const categoryMatch = categoryFilter === 'all' || item.category_id === parseInt(categoryFilter);
            return itemNameMatch && categoryMatch;
        });

        // Sort
        if (sortFilter === 'newest') {
            filteredInventory.sort((a, b) => b.item_id - a.item_id);
        } else if (sortFilter === 'oldest') {
            filteredInventory.sort((a, b) => a.item_id - b.item_id);
        } else if (sortFilter === 'atoz') {
            filteredInventory.sort((a, b) => a.item_name.localeCompare(b.item_name));
        } else if (sortFilter === 'ztoa') {
            filteredInventory.sort((a, b) => b.item_name.localeCompare(a.item_name));
        }

        inventoryListContainer.innerHTML = '';
        renderInventory(filteredInventory);
    }

    async function fetchAndRenderInventory() {
        currentPage = 1;
        const urlParams = new URLSearchParams();
        urlParams.set('project', projectSelect.value);
        await renderInventoryWithFilters(urlParams);
    }

    // Create the filter container
    const filters = await createFilterContainer(
        applyFilterToInventory,
        'Search by item name...', 
        { name: true, project: false, category: true, dateFrom: false, dateTo: false, sort: true },
        'itemName',
        'newest'
    );

    filterContainer.append(filters);

    await fetchAndRenderInventory();
}
