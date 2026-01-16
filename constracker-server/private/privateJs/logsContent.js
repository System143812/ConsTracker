import { fetchData } from "/js/apiURL.js";
import { dateFormatting } from "/js/string.js";
import { showEmptyPlaceholder } from "/js/popups.js";
import { div, span, createButton, createFilterContainer, createPaginationControls } from "/js/components.js";
import { showLogDetailsOverlay } from "/mainJs/overlays.js";

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

export async function generateLogsContent() {
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