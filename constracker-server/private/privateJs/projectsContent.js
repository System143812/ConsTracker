import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, createButton, createFilterContainer, createPaginationControls, createInput, validateInput } from "/js/components.js";
import { createMilestoneOl, milestoneFullOl, createOverlayWithBg, hideOverlayWithBg } from "/mainJs/overlays.js";

function roundDecimal(number) {
    return Math.floor(number * 100) / 100;
}

export function createProjectCard(projects, num) {
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
    const percent = projects.total_milestone > 0 ? Math.floor(projects.completed_milestone / projects.total_milestone * 100) : 0;
    const pctString = `${percent}%`;
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
    if (percent === 100) {
        progressBar.style.backgroundColor = 'var(--dark-green-text)';
    }
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
    return progressCardContainer;
}

export async function createProjectOverlay(refreshCallback) {
    const isEditMode = false; // For now, only create mode
    const overlayTitle = 'Add New Project';

    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = overlayTitle;
    overlayHeader.append(overlayHeaderContainer);

    const form = document.createElement('form');
    form.id = 'projectForm';
    form.classList.add('form-edit-forms');
    form.enctype = 'multipart/form-data';

    const createProjectFormHeader = div('createProjectFormHeader', 'create-form-headers');
    const createProjectFormFooter = div('createProjectFormFooter', 'create-form-footers');

    const projectNameInput = createInput('text', 'edit', 'Project Name', 'projectName', 'project_name', '', 'Enter project name', null, 150);
    const projectLocationInput = createInput('text', 'edit', 'Location', 'projectLocation', 'project_location', '', 'Enter project location', null, 150);
    const projectBudgetInput = createInput('text', 'edit', 'Budget (₱)', 'projectBudget', 'project_budget', '', '0.00', 0.01, 999999999999.99, 'decimal', 'Minimum 0.01');
    const projectDueDateInput = createInput('date', 'edit', 'Due Date', 'projectDueDate', 'duedate', '', '');
    
    const imageDropAreaContainer = div('imageDropAreaContainer', 'input-box-containers');
    const imageLabelContainer = div('imageLabelContainer', 'label-container');
    const imageLabel = document.createElement('label');
    imageLabel.className = 'input-labels';
    imageLabel.innerText = 'Project Image';
    const imageSubLabel = span('imageSubLabel', 'input-sub-labels');
    imageSubLabel.innerText = 'Optional, but recommended';
    imageLabelContainer.append(imageLabel);

    const imageDropArea = div('imageDropArea', 'image-drop-area');
    const imageDropAreaText = span('', 'image-drop-text');
    imageDropAreaText.innerText = 'Drag & drop an image or click to select';
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.name = 'image';
    imageInput.accept = 'image/*';
    imageInput.style.display = 'none';

    const imagePreview = div('imagePreview', 'image-preview');
    imagePreview.style.display = 'none';

    imageDropArea.append(imageDropAreaText, imageInput, imagePreview);
    imageDropAreaContainer.append(imageLabelContainer, imageDropArea, imageSubLabel);


    imageDropArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) {
            imageDropAreaText.innerText = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.style.backgroundImage = `url(${e.target.result})`;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imageDropAreaText.innerText = 'Drag & drop an image or click to select';
            imagePreview.style.backgroundImage = 'none';
            imagePreview.style.display = 'none';
        }
    });
    // Drag and Drop listeners
    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageDropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'dragover') imageDropArea.classList.add('drag-over');
            if (eventName === 'dragleave' || eventName === 'drop') imageDropArea.classList.remove('drag-over');
            if (eventName === 'drop') {
                const file = e.dataTransfer.files[0];
                 if (file) {
                    imageInput.files = e.dataTransfer.files;
                    imageDropAreaText.innerText = file.name;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        imagePreview.style.backgroundImage = `url(${e.target.result})`;
                        imagePreview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    });

    createProjectFormHeader.append(
        projectNameInput,
        projectLocationInput,
        projectBudgetInput,
        projectDueDateInput,
        imageDropAreaContainer
    );

    const cancelBtn = createButton('cancelCreateBtn', 'wide-buttons', 'Cancel', 'cancelCreateText');
    cancelBtn.addEventListener('click', () => hideOverlayWithBg(overlayBackground));

    const saveProjectData = async () => {
        const projectNameEl = projectNameInput.querySelector('input');
        const projectLocationEl = projectLocationInput.querySelector('input');
        const projectBudgetEl = projectBudgetInput.querySelector('input');
        const projectDueDateEl = projectDueDateInput.querySelector('input');

        const isNameValid = validateInput(projectNameEl);
        const isLocationValid = validateInput(projectLocationEl);
        const isBudgetValid = validateInput(projectBudgetEl);
        const isDueDateValid = validateInput(projectDueDateEl);

        if (!isNameValid || !isLocationValid || !isBudgetValid || !isDueDateValid) {
            alertPopup('error', 'Please fill in all required fields correctly.');
            return false;
        }

        const payload = {
            project_name: projectNameEl.value,
            project_location: projectLocationEl.value,
            project_budget: parseFloat(projectBudgetEl.value),
            duedate: projectDueDateEl.value
        };

        if (isNaN(payload.project_budget) || payload.project_budget <= 0) {
            alertPopup('error', 'Please enter a valid positive number for the budget.');
            return false;
        }
        
        if (!payload.project_name || !payload.project_location || isNaN(payload.project_budget) || !payload.duedate) {
            alertPopup('error', 'Please fill in all required fields correctly.');
            return false;
        }

        const formData = new FormData();
        for (const key in payload) {
            if (payload[key]) formData.append(key, payload[key]);
        }

        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        const url = '/api/projects';
        const method = 'POST';

        const response = await fetch(url, { method, body: formData });

        if (response.ok) {
            const responseData = await response.json();
            alertPopup('success', responseData.message);
            hideOverlayWithBg(overlayBackground);
            refreshCallback();
            return true;
        } else {
            const errorData = await response.json();
            alertPopup('error', errorData.message || 'Failed to create project.');
            return false;
        }
    };

    const actionButton = createButton('createBtn', 'wide-buttons', 'Create Project', 'createBtnText');
    createProjectFormFooter.append(cancelBtn, actionButton);

    actionButton.addEventListener('click', async () => {
        await saveProjectData();
    });

    form.append(createProjectFormHeader, createProjectFormFooter);
    overlayBody.append(form);

    hideOverlayWithBg(overlayBackground); // This was showOverlayWithBg originally, changed to hide to match other overlay functions
}

export async function generateProjectsContent(role) {
    const adminProjectsBodyHeader = document.getElementById('adminProjectsBodyHeader');
    const projectsBodyContent = document.getElementById('projectsBodyContent');
    projectsBodyContent.innerHTML = ''; // Clear existing content
    adminProjectsBodyHeader.innerHTML = ''; // Clear existing detail view header
    adminProjectsBodyHeader.style.backgroundImage = ''; // Clear any background image set by detail view

    const projectsHeaderContainer = div('projectsHeaderContainer', 'body-header-container');
    const projectsHeaderTitle = div('projectsHeaderTitle', 'body-header-title');
    projectsHeaderTitle.innerText = 'Project Management';
    const projectsHeaderSubtitle = div('projectsHeaderSubtitle', 'body-header-subtitle');
    projectsHeaderSubtitle.innerText = 'Create and manage construction projects and milestones';
    
    projectsHeaderContainer.append(projectsHeaderTitle, projectsHeaderSubtitle);
    adminProjectsBodyHeader.append(projectsHeaderContainer);
    const createProjectBtn = createButton('createProjectBtn', 'solid-buttons btn-blue', 'Create Project', 'createProjectBtnText', 'addIconWhite');
    createProjectBtn.addEventListener('click', () => {
        createProjectOverlay(() => generateProjectsContent(role));
    });
    adminProjectsBodyHeader.append(createProjectBtn);
    adminProjectsBodyHeader.style.padding = '1.5rem';

    const filterContainer = div('materials-filter-container'); // Reusing class name for consistency
    const projectsContainer = div('projects-main-container');
    const paginationContainer = div('materialsPaginationContainer', 'pagination-container'); // Reusing class name for consistency
    
    projectsBodyContent.append(filterContainer, projectsContainer, paginationContainer);

    let currentPage = 1;
    let itemsPerPage = 10;

    async function renderProjects(urlParams = new URLSearchParams()) {
        projectsContainer.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);

        const data = await fetchData(`/api/allProjects?${urlParams.toString()}`);
        projectsContainer.innerHTML = '';
        
        if (data === 'error' || data.projects.length === 0) {
            showEmptyPlaceholder('/assets/icons/projects.png', projectsContainer, null, "No projects found.");
            return;
        }

        let num = 1;
        data.projects.forEach(project => {
            const projectCard = createProjectCard(project, num);
            projectCard.addEventListener('click', () => generateProjectContent(`project${project.project_id}`, role));
            projectCard.classList.add('hoverable');
            projectsContainer.append(projectCard);
            num++;
        });

        const paginationControls = createPaginationControls({
            currentPage,
            totalItems: data.total,
            itemsPerPage,
            onPageChange: (page) => {
                currentPage = page;
                renderProjects(urlParams);
            },
            onItemsPerPageChange: (limit) => {
                itemsPerPage = limit;
                currentPage = 1;
                renderProjects(urlParams);
            }
        });
        paginationContainer.append(paginationControls);
    }

    async function applyFilterToProjects(filteredUrlParams) {
        currentPage = 1;
        await renderProjects(filteredUrlParams);
    }

    const filters = await createFilterContainer(
        applyFilterToProjects,
        'Search by project name...', 
        { name: true, dateFrom: true, dateTo: true, sort: true },
        'name',
        'newest'
    );
    
    filterContainer.append(filters);

    await renderProjects(new URLSearchParams()); // Initial render
}


export async function generateProjectContent(projectTabName, role) { //project1
    const projectId = projectTabName.replace(/project/g, '');
    const projectsBodyContent = document.getElementById('projectsBodyContent');
    projectsBodyContent.innerHTML = '';

    const projectsBodyHeader = div('projectsBodyHeader');
    
    // Admin-specific header logic
    if (role === 'admin') {
        const adminProjectsBodyHeader = document.getElementById('adminProjectsBodyHeader');
        if (adminProjectsBodyHeader) { // Check if element exists before manipulating
            adminProjectsBodyHeader.innerHTML = ''; 
            adminProjectsBodyHeader.style.backgroundImage = ''; // Clear any background image set by detail view
        }
        
        // --- Start of back button addition ---
        const backButton = div('projectDetailBackBtn', 'icons-with-bg');
        backButton.style.backgroundImage = 'url(/assets/icons/backWhite.png)';
        backButton.style.cursor = 'pointer';
        backButton.addEventListener('click', () => {
            generateProjectsContent(role); 
        });
        projectsBodyHeader.append(backButton);
        // --- End of back button addition ---

        const projectsHeaderContainer = div('projectsHeaderContainer', 'body-header-container');
        const projectsHeaderTitle = div('projectsHeaderTitle', 'body-header-title');
        const projectsHeaderLocation = div('projectsHeaderLocation');
        const projectsHeaderIcon = div('projectsHeaderIcon', 'icons');
        const projectsHeaderSubtitle = div('projectsHeaderSubtitle', 'body-header-subtitle');
        const projectsHeaderStatus = div('projectsHeaderStatus', 'status');
        const projectsOverallPercent = div('projectsOverallPercent');

        projectsHeaderLocation.append(projectsHeaderIcon, projectsHeaderSubtitle);
        projectsHeaderContainer.append(projectsHeaderTitle, projectsHeaderLocation, projectsHeaderStatus);

        projectsBodyHeader.append(projectsHeaderContainer, projectsOverallPercent);
        if (adminProjectsBodyHeader) {
            adminProjectsBodyHeader.append(projectsBodyHeader);
            adminProjectsBodyHeader.style.padding = '0';
        }
    }
    
    await createProjectDetailCard(projectId);
    projectsBodyContent.append(createSectionTabs(role, projectId)); // Pass role to createSectionTabs
    const selectionTabContent = document.getElementById('selectionTabContent'); //initial tab dat u will see on selectionTabs
    const milestoneTab = document.getElementById('selectionTabMilestones');
    const render = {label: "Milestones", render: renderMilestones};
    selectionTabRenderEvent(selectionTabContent, milestoneTab, render, projectId, role);
}

export async function createProjectDetailCard(projectId) {
    const data = await fetchData(`/api/getProjectCard/${projectId}`);
    if(data === 'error') return alertPopup('error', 'Network Connection Error');

    const projectsBodyHeader = document.getElementById('projectsBodyHeader');
    projectsBodyHeader.style.backgroundImage = `url(/image/${data.image})`;

    const projectsOverallPercent = document.getElementById('projectsOverallPercent');
    projectsOverallPercent.innerText = `${Math.round(data.progress)}%`;

    const projectsHeaderTitle = document.getElementById('projectsHeaderTitle');
    projectsHeaderTitle.innerText = data.project_name;
    projectsHeaderTitle.style.color = 'var(--white-ishy-text)';

    const projectsHeaderIcon = document.getElementById('projectsHeaderIcon');
    projectsHeaderIcon.style.backgroundImage = 'url(/assets/icons/locationWhite.png)';
    
    const projectsHeaderSubtitle = document.getElementById('projectsHeaderSubtitle');
    projectsHeaderSubtitle.innerText = data.project_location;
    projectsHeaderSubtitle.style.color = `#cccccc`;
    
    const projectsHeaderStatus = div('projectsHeaderStatus', 'status'); // It's missing the initial div creation
    if(data.status === 'in progress') warnType(projectsHeaderStatus, 'glass', 'yellow');
    if(data.status === 'planning') warnType(projectsHeaderStatus, 'glass', 'white');
    if(data.status === 'completed') warnType(projectsHeaderStatus, 'glass', 'green');
    projectsHeaderStatus.innerText = data.status;
}

export function createSectionTabs(role, projectId) {
    let newContents = [];
    if (role === 'admin') {
        newContents = [
            {id: "selectionTabMilestones", label: "Milestones", render: renderMilestones},
            {id: "selectionTabWorkers", label: "Personnel & Workers", render: renderWorker},
        ];
    } else { // For regular users
        newContents = [
            {id: "selectionTabMilestones", label: "Milestones", render: renderMilestones},
            {id: "selectionTabInventory", label: "Inventory", render: renderInventory},
            {id: "selectionTabWorkers", label: "Personnel & Workers", render: renderWorker},
            {id: "selectionTabAnalytics", label: "Analytics", render: renderAnalytics},
        ];
    }

    const selectionTabContent = div('selectionTabContent');
    selectionTabContent.id = 'selectionTabContent';
    const selectionTabContainer = div('selectionTabContainer');
    selectionTabContainer.id = 'selectionTabContainer';
    const selectionTabHeader = div('selectionTabHeader');

    for (const contents of newContents) {
        const elem = div(contents.id, 'selection-tabs');
        elem.id = contents.id;
        elem.innerText = contents.label;
        elem.addEventListener("click", async() => {
            await selectionTabRenderEvent(selectionTabContent, elem, contents, projectId, role)
        });
        selectionTabHeader.append(elem);
    }
    selectionTabContainer.append(selectionTabHeader, selectionTabContent);
    return selectionTabContainer;
}

async function renderAnalytics() {
    const analyticsSectionContainer = div('analyticsSectionContainer');
    analyticsSectionContainer.innerText = 'Analytics';
    return analyticsSectionContainer;
}

export function hideSelectionContents(contentContainer, tabClassName) { //done refactoring this, ready to use na anywhere
    const sameClassTabs = document.querySelectorAll(`.${tabClassName}`);
    for (const tab of sameClassTabs) {
        tab.classList.remove('selected');
    }
    contentContainer.innerHTML = "";
}

export async function selectionTabRenderEvent(content, tab, newContent, projectId, role) {
    hideSelectionContents(content, tab.className);
    tab.classList.add('selected');
    content.append(await newContent.render(role, projectId));
}

export async function renderMilestones(role, projectId) {
    const milestoneSectionContainer = div('milestoneSectionContainer');
    const milestoneSectionHeader = div('milestoneSectionHeader');
    const milestoneHeaderTitle = div('milestoneHeaderTitle');
    const milestoneHeaderText = span('milestoneHeaderText');
    milestoneHeaderText.innerText = 'Project Milestones';
    const milestoneSubheaderText = span('milestoneSubheaderText');
    milestoneSubheaderText.innerText = 'Track progress across construction milestones and tasks';
    let milestoneAddBtn = div('emptyDiv');
    if(role !== 'foreman') {
        milestoneAddBtn = createButton('milestoneAddBtn', 'solid-buttons', 'Create', 'milestoneAddText', 'milestoneAddIcon');
        milestoneAddBtn.addEventListener("click", () => { createMilestoneOl(projectId, () => refreshProjectDetailsContent(projectId, role)) });
    }
    const milestoneSectionBody = div('milestoneSectionBody');
    const data = await fetchData(`/api/milestones/${projectId}`);
    if(data === "error") return alertPopup('error', 'Network Connection Error');
    if(data.length === 0) {
        if(role !== 'foreman') {
            showEmptyPlaceholder('/assets/icons/noMilestones.png', milestoneSectionBody, () => createMilestoneOl(projectId, () => refreshProjectDetailsContent(projectId, role)), "There are no milestones yet", "Create Milestones", projectId);
        } else {
            showEmptyPlaceholder('/assets/icons/noMilestones.png', milestoneSectionBody, null, "There are no milestones yet", null, projectId);
        }
    } else {
        let counter = 1;
        let interval = 100;
        for (const milestone of data) {
            const milestonePartContainer = div('', 'milestone-part-container');
            const milestoneProgressContainer = div('', 'milestone-vertical-container');
            const milestoneProgressBar = div('', 'milestone-progress-bar');
            milestoneProgressBar.style.setProperty('--progress', `0%`);
            setTimeout(() => {
                requestAnimationFrame(() => {
                    milestoneProgressBar.style.setProperty(
                        '--progress',
                        `${roundDecimal(milestone.milestone_progress)}%`
                    );
                });
            }, interval);
            interval += 500;
            const milestoneProgressPoint = div('', 'milestone-progress-point')
            if(milestone.status === 'completed') milestoneProgressPoint.classList.add('completed');
            const milestoneCard = div('', 'milestone-cards');
            if(counter % 2 === 0) {
                milestoneCard.style.transform = 'translate(calc(0% + 1.5rem))';
                milestoneCard.classList.add("lefty");
            }
            if(counter % 2 !== 0) {
                milestoneCard.style.transform = 'translate(calc(-100% + -1.5rem))';
                milestoneCard.classList.remove("lefty");
            }
            const milestoneCardHeader = div('', 'milestone-card-header');
            const milestoneCardName = div('', 'milestone-card-name');
            milestoneCardName.innerText = milestone.milestone_name;
            const milestoneCardStatus = div('', 'milestone-card-status');
            milestoneCardStatus.classList.add('status');
            milestoneCardStatus.innerText = milestone.status;
            milestoneCard.addEventListener("mouseenter", () => {
                const startWidth = milestoneCardStatus.offsetWidth;
                milestoneCardStatus.innerText = `${roundDecimal(milestone.milestone_progress)}%`;
                const endWidth = milestoneCardStatus.offsetWidth;
                milestoneCardStatus.style.width = `${startWidth}px`;
                milestoneCardStatus.offsetWidth;
                milestoneCardStatus.style.width = `${endWidth}px`;
            });
            milestoneCard.addEventListener("mouseleave", () => {
                const startWidth = milestoneCardStatus.offsetWidth;
                milestoneCardStatus.innerText = milestone.status;
                const endWidth = milestoneCardStatus.offsetWidth;
                milestoneCardStatus.style.width = `${startWidth}px`;
                milestoneCardStatus.offsetWidth;
                milestoneCardStatus.style.width = `${endWidth}px`;
            });
            milestoneCard.addEventListener("transitionend", () => {
                milestoneCardStatus.style.width = 'auto';
            });
            if(milestone.status === 'not started') warnType(milestoneCardStatus, 'solid', 'white');
            if(milestone.status === 'in progress') warnType(milestoneCardStatus, 'solid', 'yellow');
            if(milestone.status === 'completed') warnType(milestoneCardStatus, 'solid', 'green');
            if(milestone.status === 'overdue') warnType(milestoneCardStatus, 'solid', 'red');
            const milestoneCardDescription = div('', 'milestone-card-description');
            milestoneCardDescription.innerText = milestone.milestone_description;
            const milestoneCardBody = div('', 'milestone-card-body');
            const milestoneCardView = div('', 'milestone-card-view');
            const milestoneCardViewText = span('milestoneCardViewText', 'btn-texts');
            milestoneCardViewText.innerText = 'View More';
            const milestoneCardViewIcon = span('milestoneCardViewIcon', 'btn-icons');
            milestoneCardView.append(milestoneCardViewText, milestoneCardViewIcon);
            milestoneCardView.addEventListener("click", () => {
                milestoneFullOl(projectId, milestone.id, milestone.milestone_name, async() => {
                    const projectsBodyContent = document.getElementById('projectsBodyContent');
                    projectsBodyContent.innerHTML = "";
                    await generateProjectContent(`project${projectId}`, role);
                }, role); //eto yung callback na ipapasa sa modal para pag ka save auto update ang ui
            });

            milestoneSectionHeader.append(milestoneHeaderTitle, milestoneAddBtn);
            milestoneHeaderTitle.append(milestoneHeaderText, milestoneSubheaderText);
            milestoneCardBody.append(milestoneCardView);
            milestoneCardHeader.append(milestoneCardName, milestoneCardStatus);
            milestoneCard.append(milestoneCardHeader, milestoneCardDescription, milestoneCardBody);
            milestoneProgressContainer.append(milestoneProgressBar, milestoneProgressPoint);
            milestonePartContainer.append(milestoneProgressContainer, milestoneCard);
            milestoneSectionBody.append(milestonePartContainer);
            counter ++;
        }
    }
    

    milestoneSectionContainer.append(milestoneSectionHeader, milestoneSectionBody);
    
    return milestoneSectionContainer;
}

export async function renderInventory(role, projectId) {
    const inventorySectionContainer = div('inventorySectionContainer');
    const inventorySectionHeader = div('inventorySectionHeader');
    const inventoryHeaderTitle = div('inventoryHeaderTitle');
    inventoryHeaderTitle.innerText = 'Project Inventory';
    
    inventorySectionHeader.append(inventoryHeaderTitle);

    const filterContainer = div('inventory-filter-container');
    const inventoryListContainer = div('inventory-list-container');
    const paginationContainer = div('inventoryPaginationContainer', 'pagination-container');
    
    inventorySectionContainer.append(inventorySectionHeader, filterContainer, inventoryListContainer, paginationContainer);

    let currentPage = 1;
    let itemsPerPage = 10;
    let allInventory = [];
    let filteredInventory = [];

    function renderInventoryTable() {
        inventoryListContainer.innerHTML = '';
        paginationContainer.innerHTML = '';

        const itemsToRender = filteredInventory;

        if (itemsToRender.length === 0) {
            showEmptyPlaceholder('/assets/icons/inventory.png', inventoryListContainer, null, "No inventory data found for this project.");
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
        const nameFilter = document.getElementById('project-inventory-name-filter').value.toLowerCase();
        
        filteredInventory = allInventory.filter(item => {
            const nameMatch = !nameFilter || item.item_name.toLowerCase().includes(nameFilter);
            return nameMatch;
        });

        currentPage = 1;
        renderInventoryTable();
    }

    async function fetchAndRenderInventory() {
        inventoryListContainer.innerHTML = '<div class="loading-spinner"></div>';
        const data = await fetchData(`/api/inventory/project/${projectId}`);
        
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
    searchInput.id = 'project-inventory-name-filter';
    searchInput.placeholder = 'Search by item name...';
    searchInput.addEventListener('input', applyFilters);
    filterContainer.append(searchInput);

    await fetchAndRenderInventory();
    
    return inventorySectionContainer;
}


export async function renderWorker(role, projectId) {
    const workerSectionContainer = div('workerSectionContainer');
    const workerSectionHeader = div('workerSectionHeader');
    const workerHeaderTitle = div('workerHeaderTitle');
    workerHeaderTitle.innerText = 'Personnel & Workers';
    const addPeopleBtn = createButton('addPeopleBtn', 'text-buttons', 'Add People', 'addPeopleText');
    
    workerSectionHeader.append(workerHeaderTitle, addPeopleBtn);

    const filterContainer = div('personnel-filter-container');
    const personnelContainer = div('personnel-main-container');
    personnelContainer.id = 'personnel-main-container';
    const paginationContainer = div('personnelPaginationContainer', 'pagination-container');
    
    workerSectionContainer.append(workerSectionHeader, filterContainer, personnelContainer, paginationContainer);

    let currentPage = 1;
    let itemsPerPage = 10;

    async function renderPersonnel(urlParams = new URLSearchParams()) {
        personnelContainer.innerHTML = '<div class="loading-spinner"></div>';
        paginationContainer.innerHTML = '';

        urlParams.set('page', currentPage);
        urlParams.set('limit', itemsPerPage);
        urlParams.set('projectId', projectId);

        const data = await fetchData(`/api/personnel/project?${urlParams.toString()}`);
        personnelContainer.innerHTML = '';
        
        if (data === 'error' || data.personnel.length === 0) {
            showEmptyPlaceholder('/assets/icons/personnel.png', personnelContainer, null, "No personnel found for this project.");
            return;
        }

        data.personnel.forEach(person => {
            personnelContainer.append(createProjectPersonnelCard(person, () => renderPersonnel(urlParams)));
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
        'Search by name...', 
        { name: true, sort: true, role: true },
        'name',
        'newest'
    );
    
    filterContainer.append(filters);

    await renderPersonnel(new URLSearchParams());
    
    return workerSectionContainer;
}

export function createProjectPersonnelCard(person, refreshCallback) {
    const card = div(`personnel-card-${person.user_id}`, 'personnel-card');

    const profileIcon = div('profileIcon', 'personnel-profile-icon');
    profileIcon.innerText = person.username.charAt(0).toUpperCase();

    const infoContainer = div('personnel-info-container');
    const name = span('personnelName', 'personnel-name');
    name.innerText = person.username;
    const email = span('personnelEmail', 'personnel-email');
    email.innerText = person.email;
    const role = span('personnelRole', 'personnel-role');
    role.innerText = person.role;

    infoContainer.append(name, email, role);
    card.append(profileIcon, infoContainer);
    return card;
}

// Renamed from refreshAdminProjectContent to be more generic
export async function refreshProjectDetailsContent(currentProjectId, role) {
    await createProjectDetailCard(currentProjectId);

    const selectionTabContent = document.getElementById('selectionTabContent');
    if (!selectionTabContent) return;

    const selectionTabContainer = document.getElementById('selectionTabContainer');
    if (!selectionTabContainer) return;

    const activeTab = selectionTabContainer.querySelector('.selection-tabs.selected');

    let currentRenderFunction;
    let newContents = [];
    if (role === 'admin') {
        newContents = [
            {id: "selectionTabMilestones", label: "Milestones", render: renderMilestones},
            {id: "selectionTabWorkers", label: "Personnel & Workers", render: renderWorker},
        ];
    } else { // For regular users
        newContents = [
            {id: "selectionTabMilestones", label: "Milestones", render: renderMilestones},
            {id: "selectionTabInventory", label: "Inventory", render: renderInventory},
            {id: "selectionTabWorkers", label: "Personnel & Workers", render: renderWorker},
            {id: "selectionTabAnalytics", label: "Analytics", render: renderAnalytics},
        ];
    }

    if (activeTab) {
        const foundTab = newContents.find(item => item.id === activeTab.id);
        if (foundTab) {
            currentRenderFunction = foundTab.render;
        }
    }
    
    if (!currentRenderFunction) { 
        currentRenderFunction = renderMilestones; 
    }

    selectionTabContent.innerHTML = '';
    selectionTabContent.append(await currentRenderFunction(role, currentProjectId));
}
