import { fetchData } from "/js/apiURL.js";
import { div, span, createFilterContainer, createPaginationControls } from "/js/components.js";
import { showEmptyPlaceholder } from "/js/popups.js";

export async function generateInventoryContent(role) {
    const inventoryBodyContent = document.getElementById('inventoryBodyContainer'); 
    inventoryBodyContent.innerHTML = '';

    const bodyHeader = div('', 'body-header');
    const bodyHeaderContainer = div('', 'body-header-container');
    const title = span('', 'body-header-title');
    title.innerText = 'Inventory Overview';
    const subtitle = span('', 'body-header-subtitle');
    subtitle.innerText = 'Stock levels of all items in the main inventory or a specific project.';
    bodyHeaderContainer.append(title, subtitle);
    bodyHeader.append(bodyHeaderContainer);

    const inventoryContainer = div('inventory-main-container');
    const controlsContainer = div('inventory-controls-container');
    const filterContainer = div('inventory-filter-container');
    const inventoryListContainer = div('inventory-list-container');
    const paginationContainer = div('inventoryPaginationContainer', 'pagination-container');
    
    inventoryContainer.append(controlsContainer, filterContainer, inventoryListContainer, paginationContainer);
    inventoryBodyContent.append(bodyHeader, inventoryContainer);

    let currentPage = 1;
    let itemsPerPage = 10;
    let allInventory = [];
    let filteredInventory = [];

    // --- Project Selection Dropdown ---
    const projectSelectContainer = div('project-select-container');
    const projectSelectLabel = document.createElement('label');
    projectSelectLabel.htmlFor = 'project-select';
    projectSelectLabel.innerText = 'Select Inventory:';
    
    const projectSelect = document.createElement('select');
    projectSelect.id = 'project-select';
    projectSelect.classList.add('filter-select');

    // Default Main Inventory Option
    const mainOption = document.createElement('option');
    mainOption.value = 'main';
    mainOption.innerText = 'Main Inventory';
    projectSelect.append(mainOption);

    // Fetch and populate projects
    const projects = await fetchData('/api/selection/project');
    if (projects !== 'error' && projects.length > 0) {
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.innerText = project.name;
            projectSelect.append(option);
        });
    }
    
    projectSelectContainer.append(projectSelectLabel, projectSelect);
    controlsContainer.append(projectSelectContainer);
    
    projectSelect.addEventListener('change', () => {
        fetchAndRenderInventory();
    });

    function renderInventoryTable() {
        inventoryListContainer.innerHTML = '';
        paginationContainer.innerHTML = '';

        const itemsToRender = filteredInventory;

        if (itemsToRender.length === 0) {
            showEmptyPlaceholder('/assets/icons/inventory.png', inventoryListContainer, null, "No inventory data found.");
            return;
        }

        const table = document.createElement('table');
        table.classList.add('inventory-table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headers = ['Item Name', 'Description', 'Category', 'Unit', 'Stock Balance'];
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.innerText = headerText;
            headerRow.append(th);
        });
        thead.append(headerRow);

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = itemsToRender.slice(start, end);

        pageItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.item_name}</td>
                <td>${item.item_description || 'N/A'}</td>
                <td>${item.category_name || 'N/A'}</td>
                <td>${item.unit_name || 'N/A'}</td>
                <td>${item.stock_balance}</td>
            `;
            tbody.append(row);
        });

        table.append(thead, tbody);
        inventoryListContainer.append(table);

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: itemsToRender.length,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderInventoryTable();
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1;
                renderInventoryTable();
            }
        });
        paginationContainer.append(paginationControls);
    }

    function applyFilters() {
        const nameFilter = document.getElementById('inventory-name-filter').value.toLowerCase();
        
        filteredInventory = allInventory.filter(item => {
            const nameMatch = !nameFilter || item.item_name.toLowerCase().includes(nameFilter);
            return nameMatch;
        });

        currentPage = 1;
        renderInventoryTable();
    }

    async function fetchAndRenderInventory() {
        inventoryListContainer.innerHTML = '<div class="loading-spinner"></div>';
        const selectedInventory = projectSelect.value;
        
        let url = '/api/inventory';
        if (selectedInventory !== 'main') {
            url = `/api/inventory/project/${selectedInventory}`;
            const selectedProject = projects.find(p => p.id == selectedInventory);
            title.innerText = `${selectedProject.name} Inventory`;
            subtitle.innerText = `Stock levels for the ${selectedProject.name} project.`;
        } else {
            title.innerText = 'Main Inventory Overview';
            subtitle.innerText = 'Stock levels of all items in the main inventory.';
        }

        const data = await fetchData(url);
        
        if (data === 'error') {
            inventoryListContainer.innerHTML = '';
            showEmptyPlaceholder('/assets/icons/inventory.png', inventoryListContainer, null, "An error occurred while fetching inventory data.");
            allInventory = [];
        } else {
            allInventory = data;
        }
        
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
