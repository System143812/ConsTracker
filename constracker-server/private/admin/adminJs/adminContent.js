import { urlBase } from "/js/config";
import { formatString, dateFormatting } from `${urlBase}/js/string.js`;
import { alertPopup, warnType } from `${urlBase}/js/popups.js`;

// const urlBase = "https://constracker.share.zrok.io";
// const urlBase2 = "http://192.168.8.142:3000"; //Pang local development lang to, change it relative to your current ip

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
        generateContent: async () => '',
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
    settings: {
        generateContent: async() => '',
        generateGraphs: async() => ''
    }
}

async function fetchData(url) {
    try {
        const response = await fetch(`${urlBase}${url}`, {
            headers: {
                "Accept":"application/json"
            },
            credentials: "include"
        });
        const data = await response.json();
        if(!data){
            alertPopup('error', 'Server Error');
            return 'error';
        } 
        if(data.status === 'invalid token' || data.status === 'missing token' || data.status === 'expired token') {
            window.location.href = urlBase;
            alertPopup('error', 'Invalid/Expired Token');
            return 'error';
        }
        return data;
    } catch (error) {
        console.log(`Error occured: ${error}`);
        alertPopup('error', 'Network Connection Error');
        return 'error';
    }
}

export async function displayContents(tabName) {
    hideContents();
    const pageName = document.getElementById('pageName');
    pageName.innerText = formatString(tabName);
    const tabDiv = document.getElementById(`${tabName}Tab`);
    tabDiv.classList.add('selected');
    await generateContent(tabName);
}

function hideContents() {
    const tabs = document.querySelectorAll('.sidebar-tabs');
    for (const tab of tabs) {
        tab.classList.remove('selected');
    }
    const bodyContainers = document.querySelectorAll('.body-container');
    for (const bodyContainer of bodyContainers) {
        bodyContainer.style.opacity = 0;
        bodyContainer.style.display = 'none';
    }
    const bodyContents = document.querySelectorAll('.body-content');
    for (const bodyContent of bodyContents) {
        bodyContent.innerHTML = "";
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
    projectsBodyContent.append(await dashboardActiveProjects('all'));
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
    let { progress,  planning } = 0;
    const data = await fetchData('/api/projectStatusGraph');
    if(data === 'error') return;
    if(data.length === 0){
        progress = 0,
        planning = 0
        return;
    }
    progress = data[0].in_progress;
    planning =  data[0].planning;
    
    const projectStatusGraph = document.getElementById('projectStatusGraph').getContext('2d');
    new Chart(projectStatusGraph, {
        type: 'pie', 
        data: {
            labels: ['Progress', 'Planning'],
            datasets: [{
                label: 'Project Status',
                data: [progress, planning],
                backgroundColor: ['rgba(23, 63, 112, 1)', 'rgba(19, 94, 58, 1)'],
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
                    backgroundColor: ['rgba(23, 63, 112, 0.95)'],
                    borderColor: ['#f0f0f0'],
                    borderWidth: 1
                }, {
                    label: 'Spent',
                    data: [2, 1, 2.5],
                    backgroundColor: ['rgba(19, 94, 58, 0.95)'],
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



function div(id, className) {
    const el = document.createElement('div');
    if(id) el.id = id;
    if(className) el.className = className;
    return el;
}