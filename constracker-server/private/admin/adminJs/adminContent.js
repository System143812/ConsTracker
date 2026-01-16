import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, button, createButton, createFilterContainer, createPaginationControls, createInput, createFilterInput, editFormButton, validateInput, createSelect } from "/js/components.js";
import { createMilestoneOl, milestoneFullOl, showLogDetailsOverlay, createOverlayWithBg, hideOverlayWithBg, showDeleteConfirmation, showOverlayWithBg } from "/mainJs/overlays.js";
import { generateInventoryContent } from "/admin/inventoryContent.js";
import { generateMaterialRequestsContent } from "/admin/materialRequestsContent.js";
import { generateAssetsContent } from "/admin/assetsContent.js";
import { generateReportsContent } from "/admin/reportsContent.js";
import { createMaterialCard, createMaterialOverlay, createSupplierOverlay, createCategoryOverlay, createUnitOverlay, generateMaterialsContent } from "/mainJs/materialsContent.js";
import { createProjectCard, createProjectOverlay, generateProjectsContent, generateProjectContent, createProjectDetailCard, createSectionTabs, hideSelectionContents, selectionTabRenderEvent, renderMilestones, renderInventory, renderWorker, createProjectPersonnelCard, refreshProjectDetailsContent } from "/mainJs/projectsContent.js";

const defaultImageBackgroundColors = [
    '#B388EB', '#FFD180', '#80CBC4', '#E1BEE7', '#C5E1A5',
    '#F48FB1', '#81D4FA', '#FFF59D', '#FFAB91'
];

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
        generateContent: async function renderInventory(role) {
            return await generateInventoryContent(role);
        },
        generateGraphs: async() => ''
    },
    'material-requests': {
        generateContent: async(role) => await generateMaterialRequestsContent(role),
        generateGraphs: async() => '' 
    },
    logs: {
        generateContent: async() => {
            const { generateLogsContent } = await import("/mainJs/logsContent.js");
            return await generateLogsContent();
        },
        generateGraphs: async() => ''
    },
    materials: {
        generateContent: async(role) => {
            const { generateMaterialsContent } = await import("/mainJs/materialsContent.js");
            return await generateMaterialsContent(role);
        },
        generateGraphs: async() => '' 
    },
    personnel: {
        generateContent: async() => await generatePersonnelContent(),
        generateGraphs: async() => ''
    },
    projects: {
        generateContent: async(role) => {
            const { generateProjectsContent } = await import("/mainJs/projectsContent.js");
            return await generateProjectsContent(role);
        },
        generateGraphs: async() => ''
    },
    reports: {
        generateContent: async() => await generateReportsContent(),
        generateGraphs: async() => ''
    },
    settings: {
        generateContent: async() => '',
        generateGraphs: async() => ''
    }
}

export async function displayContents(tabName, tabType, role) {
    // Removed role restriction here, as per user's request that reports tab is available for all users.
    // Specific role-based access for content generation should be handled within generateContent functions if needed.
    const pageName = document.getElementById('pageName');
    
    if(tabType === 'upperTabs'){
        pageName.innerText = formatString(tabName);
        await generateContent(tabName, role);
    } else {
        const { generateProjectContent } = await import("/mainJs/projectsContent.js");
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

async function generatePersonnelContent(role) {
    const personnelBodyHeader = document.getElementById('personnelBodyHeader');
    personnelBodyHeader.innerHTML = ''; // Clear existing detail view header
    personnelBodyHeader.style.backgroundImage = ''; // Clear any background image set by detail view

    const personnelHeaderContainer = div('personnelHeaderContainer', 'body-header-container');
    const personnelHeaderTitle = div('personnelHeaderTitle', 'body-header-title');
    personnelHeaderTitle.innerText = 'Personnel Management';
    const personnelHeaderSubtitle = div('personnelHeaderSubtitle', 'body-header-subtitle');
    personnelHeaderSubtitle.innerText = 'Manage and track key personnel across all projects';
    
    personnelHeaderContainer.append(personnelHeaderTitle, personnelHeaderSubtitle);
    personnelBodyHeader.append(personnelHeaderContainer);
    const createPersonnelBtn = createButton('createPersonnelBtn', 'solid-buttons btn-blue', 'Add Personnel', 'createPersonnelBtnText', 'addIconWhite');
    createPersonnelBtn.addEventListener('click', () => {
        createPersonnelOverlay(() => generatePersonnelContent(role));
    });
    personnelBodyHeader.append(createPersonnelBtn);
    const personnelBodyContent = document.getElementById('personnelBodyContent');
    personnelBodyContent.innerHTML = ''; // Clear existing content
    personnelBodyHeader.style.padding = '1.5rem';

    const filterContainer = div('materials-filter-container');
    const personnelContainer = div('personnel-main-container');
    const personnelGrid = div('personnel-grid-container', 'personnel-grid');
    const paginationContainer = div('personnelPaginationContainer', 'pagination-container');
    
    personnelContainer.append(personnelGrid);
    personnelBodyContent.append(filterContainer, personnelContainer, paginationContainer);

    let currentPage = 1;
    let itemsPerPage = 10;

    async function renderPersonnel(urlParams = new URLSearchParams()) {
        personnelGrid.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);

        const data = await fetchData(`/api/allPersonnel?${urlParams.toString()}`);
        personnelGrid.innerHTML = '';
        
        if (data === 'error' || data.users.length === 0) {
            showEmptyPlaceholder('/assets/icons/personnel.png', personnelBodyContent, null, "No personnel found.");
            return;
        }

        data.users.forEach(user => {
            const personnelCard = createPersonnelCard(user);
            personnelGrid.append(personnelCard);
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
        'Search by personnel name...', 
        { name: true, sort: true },
        'name',
        'newest'
    );
    
    filterContainer.append(filters);

    await renderPersonnel(new URLSearchParams());
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
    
    const addBtn = createButton('addPersonnelBtn', 'solid-buttons btn-blue', 'Add Personnel', 'addPersonnelBtnText', 'addIconWhite');
    addBtn.style.setProperty('color', '#ffffff', 'important');
    addBtn.addEventListener('click', () => showAddPersonnelOverlay());

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
            const keyword = urlParams.get('itemName') || ''; 
            const sort = urlParams.get('sort') || 'asc';
            const status = urlParams.get('status') || 'all';
            renderPersonnelCards(keyword, sort, status);
        },
        'Search personnel by name...', 
        { name: true, sort: true, status: true },
        'itemName', 
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
    container.innerHTML = ""; // Clear current list
    
    try {
        const users = await fetchData('/api/users');
        
        // Safety check: ensure users is an array
        if (!Array.isArray(users)) {
            console.error("Expected array from /api/users but got:", users);
            container.innerHTML = `<p style="padding: 20px; color: gray;">No personnel found or error loading data.</p>`;
            return;
        }

        // Create the Dribbble-style Grid
        const grid = div(null, 'personnel-grid');
        
        users.forEach(user => {
            const card = div(null, 'personnel-card');

            // 1. Generate Initials (First letter of first and last name)
            // e.g. "Juan Dela Cruz" -> "JC"
            const nameParts = user.full_name ? user.full_name.trim().split(' ') : ["?"];
            const initials = nameParts.length > 1 
                ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                : nameParts[0][0].toUpperCase();

            // 2. Status Color (is_active is 1 or 0 in your DB)
            const statusClass = user.is_active == 1 ? 'status-active' : 'status-inactive';

            card.innerHTML = `
                <div class="avatar-wrapper">
                    <div class="personnel-avatar">${initials}</div>
                    <div class="status-bubble ${statusClass}"></div>
                </div>
                <div class="personnel-info">
                    <div class="personnel-name">${user.full_name || 'Unnamed User'}</div>
                    <div class="personnel-role-tag">${formatString(user.role)}</div>
                    <div class="personnel-email">${user.email}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-edit-card" onclick="editCredentials('${user.user_id}')">Edit Credentials</button>
                    <button class="btn-terminate-card" onclick="terminatePersonnel('${user.user_id}')">Terminate</button>
                </div>
            `;
            
            grid.append(card);
        });
        
        container.append(grid);
    } catch (error) {
        console.error("Error rendering users:", error);
        container.innerHTML = `<p style="color: red; padding: 20px;">Failed to load personnel.</p>`;
    }
}





async function generateAnalyticsContent() {
    const analyticsBodyHeader = document.getElementById('analyticsBodyHeader');
    const analyticsBodyContent = document.getElementById('analyticsBodyContent');
    analyticsBodyContent.innerHTML = '';

    const bodyHeaderContainer = analyticsBodyHeader.querySelector('.body-header-container');
    const title = bodyHeaderContainer.querySelector('.body-header-title');
    const subtitle = bodyHeaderContainer.querySelector('.body-header-subtitle');
    title.innerText = 'Analytics';
    subtitle.innerText = 'Visualize project data and key metrics';

    showEmptyPlaceholder('/assets/icons/analytics.png', analyticsBodyContent, null, "Analytics Content Coming Soon");
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
        if (requests.priority_level) {
            if(requests.priority_level === "medium") warnType(requestCardPriority, "solid", 'yellow', '', '');
            if(requests.priority_level === "low") warnType(requestCardPriority, "solid", 'green', '', '');
            if(requests.priority_level === "high") warnType(requestCardPriority, "solid", 'red', '', '');
            requestCardPriority.innerText = `${formatString(requests.priority_level)} Priority`;
        } else {
            requestCardPriority.innerText = 'No Priority';
            warnType(requestCardPriority, "solid", 'grey', '', '');
        }
        const requestCardBody = div(`requestCardBody`, `request-card-body`);
        const requestCardName = div(`requestCardName`, `request-card-name`);
        requestCardName.innerText = `Requested by ${requests.requested_by} • `;
        const requestCardItemCount = div(`requestCardItemCount`, `request-card-item-count`);
        requestCardItemCount.innerText = `${requests.item_count} item(s) • `; 
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
        
        const requestStage = div('requestCardStage', 'request-stage-text');
        requestStage.innerText = `Stage: ${formatString(requests.current_stage)}`;

        recentRequestContainer.append(recentRequestHeader, recentRequestBody);
        recentRequestHeader.append(recentRequestTitle, recentRequestSubtitle);
        recentRequestBody.append(requestCardContainer);
        requestCardContainer.append(requestCardLeft, requestCardRight);
        requestCardLeft.append(requestCardHeader, requestCardBody, requestCardDate, requestStage);
        requestCardHeader.append(requestCardTitle, requestCardPriority);
        requestCardBody.append(requestCardName, requestCardItemCount, requestCardCost);
        requestCardRight.append(requestStatusContainer);
        requestStatusContainer.append(requestStatusIcon, requestStatusLabel);
    }
    return recentRequestContainer;
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







async function dashboardSummaryCards() {
    const dashboardSummaryCards = div('dashboardSummaryCards', 'summary-cards');
    const dashboardCardData = {
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
        awaitingDeliveries: {
            title: "awaitingDeliveries",
            data: "-",
            info: "No requests awaiting delivery",
            color: "#FFC107" // amber
        },
        partiallyVerified: {
            title: "partiallyVerified",
            data: "-",
            info: "No partially verified requests",
            color: "#2196F3" // blue
        },
        disputedRequests: {
            title: "disputedRequests",
            data: "-",
            info: "No disputed requests",
            color: "#F44336" // red
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
        if(cardData.total_personnel !== 0) modifyCardData(dashboardCardData['activePersonnel'], cardData.active_personnel, `${cardData.total_personnel} total personnel`);
        if(cardData.pending_requests > 0) modifyCardData(dashboardCardData['pendingRequest'], cardData.pending_requests, `Material request awaiting for approval`); 
        if(cardData.awaiting_deliveries > 0) modifyCardData(dashboardCardData['awaitingDeliveries'], cardData.awaiting_deliveries, `Requests awaiting delivery`);
        if(cardData.partially_verified > 0) modifyCardData(dashboardCardData['partiallyVerified'], cardData.partially_verified, `Partially verified requests`);
        if(cardData.disputed_requests > 0) modifyCardData(dashboardCardData['disputedRequests'], cardData.disputed_requests, `Disputed requests`);
    }

    dashboardSummaryCards.append(
        createSummaryCards(dashboardCardData['activePersonnel']),
        createSummaryCards(dashboardCardData['pendingRequest']),
        createSummaryCards(dashboardCardData['awaitingDeliveries']),
        createSummaryCards(dashboardCardData['partiallyVerified']),
        createSummaryCards(dashboardCardData['disputedRequests'])
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

    const materialUsageOverview = div('materialUsageOverview', 'graph-containers');
    const materialUsageOverviewHeader = div('projectOverviewHeader', 'graph-headers');
    const materialUsageOverviewTitle = div('materialUsageOverviewTitle', 'graph-titles');
    const materialUsageOverviewSubtitle = div('materialUsageOverviewSubtitle', 'graph-subtitles');
    materialUsageOverviewTitle.innerText = 'Material Usage by Category';
    materialUsageOverviewSubtitle.innerText = 'Inventory distribution across material categories';
    materialUsageOverviewHeader.append(materialUsageOverviewTitle, materialUsageOverviewSubtitle);
    
    const materialFilterContainer = div('materialFilterContainer', 'graph-filter-container');
    const materialFilterLabel = span('', 'graph-filter-label');
    materialFilterLabel.innerText = 'Filter: ';
    const materialFilterSelect = document.createElement('select');
    materialFilterSelect.id = 'materialFilterSelect';
    materialFilterSelect.className = 'graph-filter-select';
    materialFilterSelect.innerHTML = `
        <option value="all">All Categories</option>
        <option value="top5">Top 5</option>
        <option value="top10">Top 10</option>
        <option value="bottom5">Bottom 5</option>
        <option value="bottom10">Bottom 10</option>
    `;
    materialFilterContainer.append(materialFilterLabel, materialFilterSelect);
    
    const materialUsageOverviewGraph = document.createElement('canvas');
    materialUsageOverviewGraph.id = 'materialUsageOverviewGraph';
    materialUsageOverviewGraph.className = 'graphs';
    materialUsageOverview.append(materialUsageOverviewHeader, materialFilterContainer, materialUsageOverviewGraph);

    projectOverviewContainer.append(projectStatus, materialUsageOverview);
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
            maintainAspectRatio: true,
            aspectRatio: 1,
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
    
    const materialUsageData = await fetchData('/api/materialUsageGraph');
    let materialUsageChart = null;
    
    if(materialUsageData && materialUsageData !== 'error') {
        const filterSelect = document.getElementById('materialFilterSelect');
        
        // Function to filter and sort data
        function getFilteredData(filter) {
            let filtered = [...materialUsageData];
            
            // Sort by quantity descending
            filtered.sort((a, b) => (b.total_quantity || 0) - (a.total_quantity || 0));
            
            switch(filter) {
                case 'top5':
                    return filtered.slice(0, 5);
                case 'top10':
                    return filtered.slice(0, 10);
                case 'bottom5':
                    return filtered.slice(-5).reverse();
                case 'bottom10':
                    return filtered.slice(-10).reverse();
                case 'all':
                default:
                    return filtered;
            }
        }
        
        // Function to update chart
        function updateMaterialUsageChart(filter) {
            const filteredData = getFilteredData(filter);
            const labels = filteredData.map(item => item.category_name || 'Uncategorized');
            const quantities = filteredData.map(item => item.total_quantity || 0);
            
            if (materialUsageChart) {
                materialUsageChart.data.labels = labels;
                materialUsageChart.data.datasets[0].data = quantities;
                materialUsageChart.update();
            } else {
                const materialUsageOverviewGraph = document.getElementById('materialUsageOverviewGraph').getContext('2d');
                materialUsageChart = new Chart(materialUsageOverviewGraph, {
                    type: 'bar', 
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Total Quantity (Units)',
                                data: quantities,
                                backgroundColor: [
                                    '#1A3E72', '#4187bfff', '#97a6c4', '#5ba3d0', '#2c5aa0', 
                                    '#7db8d4', '#3d6fa0', '#6b9fc4', '#1f4a7a', '#8cc4db',
                                    '#2d5a9a', '#6ba3d5', '#5595c7', '#0f3a5f', '#9ecef5'
                                ],
                                borderColor: ['#f0f0f0'],
                                borderWidth: 1,
                                borderRadius: 4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        aspectRatio: 1,
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    font: {
                                        size: 12,
                                        weight: 500
                                    },
                                    padding: 15,
                                    usePointStyle: true
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                padding: 12,
                                titleFont: {
                                    size: 13,
                                    weight: 'bold'
                                },
                                bodyFont: {
                                    size: 12
                                },
                                borderColor: '#fff',
                                borderWidth: 1,
                                callbacks: {
                                    label: function(context) {
                                        const value = context.raw;
                                        return `Quantity: ${value.toLocaleString()} units`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    font: {
                                        size: 11
                                    },
                                    callback: function(value) {
                                        return value.toLocaleString();
                                    }
                                },
                                grid: {
                                    color: 'rgba(0,0,0,0.05)',
                                    drawBorder: false
                                }
                            },
                            x: {
                                ticks: {
                                    font: {
                                        size: 11,
                                        weight: 500
                                    },
                                    callback: function(index) {
                                        const label = this.getLabelForValue(index);
                                        const maxLength = 15; 

                                        if (label && label.length > maxLength) {
                                            return label.substring(0, maxLength) + '…';
                                        }

                                        return label;
                                    }
                                },
                                grid: {
                                    display: false,
                                    drawBorder: false
                                }
                            }
                        }
                    }
                });
            }
        }
        
        // Event listener for filter change
        filterSelect.addEventListener('change', (e) => {
            updateMaterialUsageChart(e.target.value);
        });
        
        // Initial chart render
        updateMaterialUsageChart('all');
    }
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





















