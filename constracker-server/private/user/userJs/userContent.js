import { fetchData } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { hideContents } from "/mainJs/sidebar.js";
import { createMilestoneOl, milestoneFullOl } from "/mainJs/overlays.js";
import { div, span, button, createButton } from "/js/components.js";

const requiredRoles = ['engineer', 'foreman', 'project manager'];

const tabContents = {
    dashboard: {
        generateContent: async(role) => await generateDashboardContent(role),
        generateGraphs: async() => await initDashboardGraphs()
    },
    project: {
        generateContent: async(tabName, role) => await generateProjectContent(tabName, role)
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
        await tabContents['project'].generateContent(tabName, role);
    }
    bodyContainer.style.display = 'flex';
    bodyContainer.style.opacity = 1;
}

async function generateDashboardContent(role) {
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

async function generateProjectContent(projectTabName, role) { //project1
    const projectId = projectTabName.replace(/project/g, '');
    const projectsBodyContent = document.getElementById('projectsBodyContent');
    await createProjectCard(projectId);
    if(!requiredRoles.includes(role)){
        alertPopup('error', 'Unauthorized Role');
        return window.location.href = '/';
    } 
    if(role === 'engineer'){
        projectsBodyContent.append(
            createSectionTabs(role, projectId)
            
        );
    } else {
        projectsBodyContent.append(
            createSectionTabs(role, projectId)

        );
    }
    const selectionTabContent = document.getElementById('selectionTabContent'); //nitial tab dat u will see on selectionTabs
    const milestoneTab = document.getElementById('selectionTabMilestones');
    const render = {label: "Milestones", render: renderMilestones};
    selectionTabRenderEvent(selectionTabContent, milestoneTab, render, projectId, role);
}

async function createProjectCard(projectId) {
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
    const projectsHeaderStatus = document.getElementById('projectsHeaderStatus'); 
    if(data.status === 'in progress') warnType(projectsHeaderStatus, 'glass', 'yellow');
    if(data.status === 'planning') warnType(projectsHeaderStatus, 'glass', 'white');
    if(data.status === 'completed') warnType(projectsHeaderStatus, 'glass', 'green');
    projectsHeaderStatus.innerText = data.status;
}

function hideSelectionContents(contentContainer, tabClassName) { //done refactoring this, ready to use na anywhere
    const sameClassTabs = document.querySelectorAll(`.${tabClassName}`);
    for (const tab of sameClassTabs) {
        tab.classList.remove('selected');
    }
    contentContainer.innerHTML = "";
}

function createSectionTabs(role, projectId) {
    const newContents = [
        {id: "selectionTabMilestones", label: "Milestones", render: renderMilestones},
        {id: "selectionTabInventory", label: "Inventory", render: renderInventory},
        {id: "selectionTabWorkers", label: "Personnel & Workers", render: renderWorker},
        {id: "selectionTabAnalytics", label: "Analytics", render: renderAnalytics},  
        // {id: "selectionTabEwan", label: "Ewan", render: renderMilestones} test lang    
    ]

    const selectionTabContent = div('selectionTabContent');
    const selectionTabContainer = div('selectionTabContainer');
    const selectionTabHeader = div('selectionTabHeader');

    for (const contents of newContents) {
        const elem = div(`${contents.id}`, 'selection-tabs');
        elem.innerText = contents.label;
        elem.addEventListener("click", async() => {
            await selectionTabRenderEvent(selectionTabContent, elem, contents, projectId, role)
        });
        selectionTabHeader.append(elem);
    }
    selectionTabContainer.append(selectionTabHeader, selectionTabContent);
    return selectionTabContainer;
}

async function selectionTabRenderEvent(content, tab, newContent, projectId, role) {
    hideSelectionContents(content, tab.className);
    tab.classList.add('selected');
    content.append(await newContent.render(role, projectId));
}

function roundDecimal(number) {
    return number * 10 / 10;
}

async function renderMilestones(role, projectId) {
    const milestoneSectionContainer = div('milestoneSectionContainer');
    const milestoneSectionHeader = div('milestoneSectionHeader');
    const milestoneHeaderTitle = div('milestoneHeaderTitle');
    const milestoneHeaderText = span('milestoneHeaderText');
    milestoneHeaderText.innerText = 'Project Milestones';
    const milestoneSubheaderText = span('milestoneSubheaderText');
    milestoneSubheaderText.innerText = 'Track progress across construction milestones and tasks';
    let milestoneAddBtn = div('emptyDiv');
    if(role !== 'foreman') {
        milestoneAddBtn = createButton('milestoneAddBtn', 'solid-buttons', 'New Milestone', 'milestoneAddText', 'milestoneAddIcon');
        milestoneAddBtn.addEventListener("click", () => {

        });
    }
    const milestoneSectionBody = div('milestoneSectionBody');
    const data = await fetchData(`/api/milestones/${projectId}`);
    if(data === "error") return alertPopup('error', 'Network Connection Error');
    if(data.length === 0) {
        showEmptyPlaceholder('/assets/icons/noMilestones.png', milestoneSectionBody, createMilestoneOl(projectId), "There are no milestones yet", "Create Milestones", projectId);
    } else {
        let counter = 1;
        let interval = 0;
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
            milestoneCardView.innerText = 'View More';
            milestoneCardView.addEventListener("click", () => {
                milestoneFullOl(milestone);
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

async function renderInventory() {
    const inventorySectionContainer = div('inventorySectionContainer');
    inventorySectionContainer.innerText = 'Inventory';
    return inventorySectionContainer;
}

async function renderWorker() {
    const workerSectionContainer = div('workerSectionContainer');
    workerSectionContainer.innerText = 'Personnel & Workers';
    return workerSectionContainer;
}

async function renderAnalytics() {
    const analyticsSectionContainer = div('analyticsSectionContainer');
    analyticsSectionContainer.innerText = 'Analytics';
    return analyticsSectionContainer;
}
