import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { hideContents } from "/mainJs/sidebar.js";
import { createMilestoneOl, milestoneFullOl, showLogDetailsOverlay, createOverlayWithBg, hideOverlayWithBg, showDeleteConfirmation, showOverlayWithBg } from "/mainJs/overlays.js";
import { div, span, button, createButton, createFilterContainer, createPaginationControls, createInput, createFilterInput, editFormButton, createSelect } from "/js/components.js";
import { createProjectCard, generateProjectsContent, generateProjectContent, createProjectDetailCard, createSectionTabs, hideSelectionContents, selectionTabRenderEvent, renderMilestones, renderInventory, renderWorker, createProjectPersonnelCard, refreshProjectDetailsContent } from "/mainJs/projectsContent.js";
import { generateAssetsContent } from "./assetsContent.js";
import { generateMaterialRequestsContent } from "./materialRequestsContent.js";
import { generateReportsContent } from "./userReportsContent.js";

const requiredRoles = ['engineer', 'foreman', 'project manager'];

const defaultImageBackgroundColors = [
    '#B388EB', '#FFD180', '#80CBC4', '#E1BEE7', '#C5E1A5',
    '#F48FB1', '#81D4FA', '#FFF59D', '#A7FFEB', '#FFAB91'
];
















function hideDivContents(div) {
    div.innerHTML = "";
}

async function updateDivContents(divContainer, newContentFn) {
    hideDivContents(divContainer);
    divContainer.append(await newContentFn());
}





















async function generateLogsContent(role) {
    const logsBodyContent = document.getElementById('logsBodyContent');
    logsBodyContent.innerHTML = '';

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
        fetchAndRender, // The new applyFilterCallback
        'Search by user...', 
        { name: true, project: true, dateFrom: true, dateTo: true, sort: true }, // Updated 'recent' to 'sort'
        'username',
        'newest'
    );
    
    filterContainer.append(filters);

    await fetchAndRender(new URLSearchParams()); // Initial render without filters
}

async function generateUserDashboardContent(role) {
    const dashboardBodyContent = document.getElementById('dashboardBodyContent');
    if(!requiredRoles.includes(role)){
        alertPopup('error', 'Unauthorized Role');
        return window.location.href = '/'
    } 
    if(role === 'engineer'){
        dashboardBodyContent.append(
            
        );
    } else {
        dashboardBodyContent.append(

        );
    }
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
        logDetailsBtn.style.display = 'none'; // Hide button if not applicable
    }

    logDetailsBtn.append(logDetailsIcon);
    logCardFooter.append(logDetailsBtn);
    logCardBody.append(logCardIcon, logCardName);
    logCard.append(logCardHeader,logCardBody, logCardFooter);
    return logCard;
}

const tabContents = {
    assets: {
        generateContent: async(role) => await generateAssetsContent(role),
        generateGraphs: async() => ''
    },
    dashboard: {
        generateContent: async(role) => await generateUserDashboardContent(role),
        generateGraphs: async() => await initDashboardGraphs()
    },
    logs: {
        generateContent: async(role) => {
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
    'material-requests': {
        generateContent: async(role) => await generateMaterialRequestsContent(role),
        generateGraphs: async() => '' 
    },
    project: {
        generateContent: async(tabName, role) => {
            const { generateProjectContent } = await import("/mainJs/projectsContent.js");
            return await generateProjectContent(tabName, role);
        }
    },
    reports: {
        generateContent: async(role) => await generateReportsContent(role),
        generateGraphs: async() => ''
    },
    settings: {
        generateContent: async(role) => '',
        generateGraphs: async() => ''
    }
}

export async function displayUserContents(tabName, tabType, role) {
    let bodyContainer;
    const pageName = document.getElementById('pageName');
    if(tabType === 'upperTabs'){
        const divContent = document.getElementById(`${tabName}BodyContainer`);
        bodyContainer = divContent;
        pageName.innerText = formatString(tabName);
        await tabContents[tabName].generateContent(role);
    } else {
        const divContent = document.getElementById('projectsBodyContainer');
        bodyContainer = divContent;
        pageName.innerText = 'Projects';
        const { generateProjectContent } = await import("/mainJs/projectsContent.js");
        await generateProjectContent(tabName, role);
    }
    bodyContainer.style.display = 'flex';
    bodyContainer.style.opacity = 1;
}
