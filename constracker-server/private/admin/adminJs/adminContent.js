import { fetchData } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showDeleteConfirmation, showEmptyPlaceholder } from "/js/popups.js";
import { createFilterContainer, createButton, createPaginationControls} from "/js/components.js";
import { createMilestoneOl, milestoneFullOl, showLogDetailsOverlay, createOverlayWithBg, hideOverlayWithBg } from "/mainJs/overlays.js";


async function generateLogsContent() {
    const logsBodyContent = document.getElementById('logsBodyContent');
    logsBodyContent.innerHTML = ''; // Clear existing content

    const logsContainer = div('logs-main-container');
    const filterContainer = div('logs-filter-container');
    const scrollableLogListWrapper = div('scrollable-log-list-wrapper'); // New wrapper for scrolling
    const logListContainer = div('logs-list-container');
    const paginationContainer = div('paginationContainer', 'pagination-container');
    
    scrollableLogListWrapper.append(logListContainer); // logListContainer goes inside the wrapper
    logsContainer.append(filterContainer, scrollableLogListWrapper, paginationContainer); // Append filter and wrapper
    logsBodyContent.append(logsContainer);

    let currentPage = 1;
    let itemsPerPage = 10;
    
    function createLogCard(logData) {
        const logCard = div('', 'log-cards');
        const logCardHeader = div('', 'log-card-headers');
        const logProjectName = span('', 'log-project-names');
        logProjectName.innerText = logData.project_name;
        const logDate = span('', 'log-dates');
        logDate.innerText = dateFormatting(logData.created_at, 'date');
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
        logCardName.innerText = `${logData.full_name} ${logData.log_name}`;

        const logCardFooter = div('', 'log-card-footers');
        const logDetailsBtn = createButton('logDetailsBtn', 'solid-buttons', 'Details', 'logDetailsText', '', () => {});
        const logDetailsIcon  = span('logDetailsIcon', 'btn-icons');
        
        const clickableActions = ['edit', 'requests', 'approved', 'declined'];
        if (clickableActions.includes(logData.action)) {
            logDetailsBtn.style.cursor = 'pointer';
            logDetailsBtn.addEventListener('click', () => showLogDetailsOverlay(logData.log_id));
        } else {
            logDetailsBtn.style.display = 'none';
        }
    
        logDetailsBtn.append(logDetailsIcon);
        logCardFooter.append(logDetailsBtn);
        logCardBody.append(logCardIcon, logCardName);
        logCardHeader.append(logData.project_id !== 0 ? logProjectName : '', logDate);
        logCard.append(logCardHeader,logCardBody, logCardFooter);
        return logCard;
    }

    async function renderLogs(urlParams = new URLSearchParams()) {
        logListContainer.innerHTML = '<div class="loading-spinner"></div>'; // Show a loading spinner
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);

        const data = await fetchData(`/api/logs?${urlParams.toString()}`);
        logListContainer.innerHTML = '';
        
        if (data === 'error' || data.logs.length === 0) {
            showEmptyPlaceholder('/assets/icons/emptyLogs.png', logListContainer, null, "No logs found for the selected filters.");
            return;
        }

        data.logs.forEach(log => {
            logListContainer.append(createLogCard(log));
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: data.total,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderLogs(urlParams);
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1; // Reset to first page
                renderLogs(urlParams);
            }
        });
        paginationContainer.append(paginationControls);
    }

    // New function to be passed as the filter callback
    async function applyFilterToLogs(filteredUrlParams) {
        currentPage = 1;
        await renderLogs(filteredUrlParams);
    }

    const filters = await createFilterContainer(
        applyFilterToLogs, // The new applyFilterCallback
        'Search by user...', 
        { name: true, project: true, dateFrom: true, dateTo: true, recent: true }, // Removed category
        'username'
    );
    
    filterContainer.append(filters);

    await renderLogs(new URLSearchParams()); // Initial render without filters
}

const tabContents = {
    dashboard: {
        generateContent: async() => await generateDashboardContent(),
        generateGraphs: async() => await initDashboardGraphs()
    },
    projects: {
        generateContent: async() => await generateProjectsContent(),
        generateGraphs: async() => ''
    },
    inventory: {
        generateContent: async function renderInventory(projectId, role, refreshActiveTabContentFn) {
            const inventorySectionContainer = div('inventorySectionContainer');
            inventorySectionContainer.innerText = 'Inventory Content for Project: ' + projectId + ' (Role: ' + role + ')'; // Example with parameters
            return inventorySectionContainer;
        },
        generateGraphs: async() => ''
    },
    materialsRequest: {
        generateContent: async() => '',
        generateGraphs: async() => ''
    },
    personnel: {
        generateContent: async() => '',
        generateGraphs: async() => ''
    },
    logs: {
        generateContent: async() => await generateLogsContent(),
        generateGraphs: async() => ''
    },
    settings: {
        generateContent: async() => '',
        generateGraphs: async() => ''
    }
}

export async function displayContents(tabName, tabType, role) {
    if(role !== 'admin') return alertPopup('error', 'Unauthorized Role');
    const pageName = document.getElementById('pageName');
    if(tabType === 'upperTabs'){
        pageName.innerText = formatString(tabName);
        await generateContent(tabName);
    } else {
        pageName.innerText = 'Projects'
    }
}

async function generateContent(tabName) {
    const bodyContainer = document.getElementById(`${tabName}BodyContainer`);
    const pageData = tabContents[tabName];
    await pageData.generateContent();
    bodyContainer.style.display = 'flex';
    bodyContainer.style.opacity = 1;
    pageData.generateGraphs();
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

async function generateProjectsContent() {
    const projectsBodyContent = document.getElementById('projectsBodyContent');
    projectsBodyContent.innerHTML = ''; // Clear existing content

    const projectsContainer = div('projects-main-container');
    const projectListContainer = div('project-list-container');
    const projectDetailsContainer = div('project-details-container');

    projectsContainer.append(projectListContainer, projectDetailsContainer);
    projectsBodyContent.append(projectsContainer);

    const projects = await fetchData('/api/allProjects');
    if (projects === 'error' || projects.length === 0) {
        showEmptyPlaceholder(null, projectListContainer, null, "No projects found.");
        return;
    }

    const projectList = div('project-list');
    projects.forEach(project => {
        const projectItem = div(`project-item-${project.project_id}`, 'project-list-item');
        projectItem.textContent = project.project_name;
        projectItem.addEventListener('click', () => {
            document.querySelectorAll('.project-list-item').forEach(item => item.classList.remove('selected'));
            projectItem.classList.add('selected');
            showProjectDetails(project.project_id, projectDetailsContainer);
        });
        projectList.append(projectItem);
    });

    projectListContainer.append(projectList);

    // Show the first project's details by default
    if (projects.length > 0) {
        projectList.children[0].classList.add('selected');
        showProjectDetails(projects[0].project_id, projectDetailsContainer);
    }
}

async function showProjectDetails(projectId, container) {
    // New helper function to update project percentage
    async function updateProjectPercentage() {
        const data = await fetchData(`/api/getProjectCard/${projectId}`);
        if(data === 'error') return alertPopup('error', 'Network Connection Error');
        const projectsOverallPercent = document.getElementById('projectsOverallPercent');
        if (projectsOverallPercent) { // Ensure element exists before updating
            projectsOverallPercent.innerText = `${Math.round(data.progress)}%`;
        }
    }

    // New helper function to refresh the content of the currently active tab
    async function refreshActiveTabContent(currentProjectId, role) { // currentProjectId and role passed to ensure context
        await updateProjectPercentage(currentProjectId); // Update project percentage

        const selectionTabContent = document.getElementById('selectionTabContent');
        if (!selectionTabContent) return; // Should not happen if initialized correctly

        const activeTab = selectionTabContent.closest('.selection-tab-container')?.querySelector('.selection-tabs.selected');

        let currentRenderFunction;
        let currentTabData;

        // Retrieve the render function and tab data from the active tab element
        if (activeTab && activeTab.tabData) {
            currentTabData = activeTab.tabData;
            currentRenderFunction = currentTabData.render;
        } else {
            // Default to milestones if no tab is active or tabData is missing
            currentTabData = {id: "selectionTabMilestones", label: "Milestones", render: generateMilestonesContent};
            currentRenderFunction = generateMilestonesContent;
        }
        
        // Clear the current content and append the refreshed content
        selectionTabContent.innerHTML = '';
        selectionTabContent.append(await currentRenderFunction(currentProjectId, role, refreshActiveTabContent));
    }


    let selectionTabContainer = container.querySelector('#selectionTabContainer'); // Try to find it inside the container

    if (!selectionTabContainer) {
        // If selectionTabContainer doesn't exist, create it once
        container.innerHTML = ''; // Clear previous details before appending new structure
        selectionTabContainer = createSectionTabs('admin', projectId, refreshActiveTabContent); // Pass refresh function here
        container.append(selectionTabContainer);
    } else {
        // If it exists, ensure its body content is cleared before re-rendering new content for the selected tab
        const selectionTabContent = selectionTabContainer.querySelector('#selectionTabContent');
        selectionTabContent.innerHTML = '';
    }

    // Now, call the initial rendering of the active tab content
    await refreshActiveTabContent(projectId, 'admin'); // Initial refresh for the current project
}

async function generateMilestonesContent(projectId, role, refreshActiveTabContentFn) {
    const milestonesBody = div('milestones-body');
    const milestones = await fetchData(`/api/milestones/${projectId}`);

    if (milestones === 'error' || milestones.length === 0) {
        showEmptyPlaceholder('/assets/icons/noMilestones.png', milestonesBody, () => createMilestoneOl(projectId, refreshActiveTabContentFn), "No milestones found for this project.", "Create Milestones", projectId);
    } else {
        milestones.forEach(milestone => {
            const milestoneCard = div(`milestone-card-${milestone.id}`, 'milestone-card');
            const milestoneName = div('milestone-name');
            milestoneName.textContent = milestone.milestone_name;
            const milestoneActions = div('milestone-actions');
            const deleteBtn = createButton(`delete-milestone-${milestone.id}`, 'icon-buttons', '', 'delete-milestone-txt', 'deleteIcon');
            
            milestoneCard.addEventListener('click', (e) => {
                if (e.target.closest('.icon-buttons')) return;
                milestoneFullOl(projectId, milestone.id, milestone.milestone_name, refreshActiveTabContentFn, role); // Pass refreshActiveTabContentFn
            });

            deleteBtn.addEventListener('click', async () => {
                showDeleteConfirmation(milestone.milestone_name, async () => {
                    const response = await fetch(`/api/milestones/${milestone.id}`, { method: 'DELETE' });
                    if (response.ok) {
                        alertPopup('success', 'Milestone deleted successfully!');
                        await refreshActiveTabContentFn(projectId, role); // Use refreshActiveTabContentFn
                    } else {
                        alertPopup('error', 'Failed to delete milestone.');
                    }
                });
            });

            milestoneActions.append(deleteBtn);
            milestoneCard.append(milestoneName, milestoneActions);
            milestonesBody.append(milestoneCard);
        });
    }

    return milestonesBody; // Only return the body
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
        const pctString = `${Math.floor(projects.completed_milestone / projects.total_milestone * 100)}%`;
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
        activeProjectsBody.append(progressCardContainer);  
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



function span(id, className) {
    const el = document.createElement('span');
    if(id) el.id = id;
    if(className) el.className = className;
    return el;
}

function div(id, className) {
    const el = document.createElement('div');
    if(id) el.id = id;
    if(className) el.className = className;
    return el;
}