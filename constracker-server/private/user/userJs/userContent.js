import { fetchData } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType } from "/js/popups.js";
import { hideContents } from "/mainJs/sidebar.js";

const requiredRoles = ['engineer', 'foreman'];

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
        return window.location.href = '/'
    } 
    if(role === 'engineer'){
        projectsBodyContent.append(
            createSectionTabs(role)
            
        );
    } else {
        projectsBodyContent.append(
            

        );
    }
    const selectionTabContent = document.getElementById('selectionTabContent'); //nitial tab dat u will see on selectionTabs
    const milestoneTab = document.getElementById('selectionTabMilestones');
    const render = {label: "Milestones", render: renderMilestones};
    selectionTabRenderEvent(selectionTabContent, milestoneTab, render);
}

async function createProjectCard(projectId) {
    const data = await fetchData(`/api/getProjectCard/${projectId}`);
    if(data === 'error') return alertPopup('error', 'Network Connection Error');
    const projectsBodyHeader = document.getElementById('projectsBodyHeader');
    projectsBodyHeader.style.backgroundImage = `url(/image/${data.image})`;
    const projectsHeaderTitle = document.getElementById('projectsHeaderTitle');
    projectsHeaderTitle.innerText = data.project_name;
    projectsHeaderTitle.style.color = 'var(--white-ishy-text)';
    const projectsHeaderIcon = document.getElementById('projectsHeaderIcon');
    projectsHeaderIcon.style.backgroundImage = 'url(/assets/icons/locationWhite.png)';
    const projectsHeaderSubtitle = document.getElementById('projectsHeaderSubtitle');
    projectsHeaderSubtitle.innerText = data.project_location;
    projectsHeaderSubtitle.style.color = `#cccccc`;
    const projectsHeaderStatus = document.getElementById('projectsHeaderStatus'); 
    if(data.status === 'in progress') warnType(projectsHeaderStatus, 'solid', 'yellow');
    if(data.status === 'planning') warnType(projectsHeaderStatus, 'solid', 'white');
    if(data.status === 'completed') warnType(projectsHeaderStatus, 'solid', 'green');
    projectsHeaderStatus.innerText = data.status;
}

function hideSelectionContents(div) {
    const selectionTabs = document.querySelectorAll('.selection-tabs');
    for (const tab of selectionTabs) {
        tab.classList.remove('selected');
    }
    div.innerHTML = "";
    
}

function createSectionTabs(role) {
    const tabs = [
        {id: "selectionTabMilestones", label: "Milestones", render: renderMilestones},
        {id: "selectionTabInventory", label: "Inventory", render: renderInventory},
        {id: "selectionTabWorkers", label: "Personnel & Workers", render: renderMilestones},
        {id: "selectionTabAnalytics", label: "Analytics", render: renderMilestones},  
        // {id: "selectionTabEwan", label: "Ewan", render: renderMilestones} test lang    
    ]

    const selectionTabContent = div('selectionTabContent');
    const selectionTabContainer = div('selectionTabContainer');
    const selectionTabHeader = div('selectionTabHeader');

    for (const tab of tabs) {
        const elem = div(`${tab.id}`, 'selection-tabs');
        elem.innerText = tab.label;
        elem.addEventListener("click", async() => {
            await selectionTabRenderEvent(selectionTabContent, elem, tab)
        });
        selectionTabHeader.append(elem);
    }
    selectionTabContainer.append(selectionTabHeader, selectionTabContent);
    return selectionTabContainer;
}

async function selectionTabRenderEvent(content, selectionTab, tab) {
    hideSelectionContents(content);
    selectionTab.classList.add('selected');
    content.append(await tab.render());
}


async function renderMilestones() {
    const milestoneSectionContainer = div('milestoneSectionContainer');
    milestoneSectionContainer.innerText = 'Milestone';
    return milestoneSectionContainer;
}

async function renderInventory() {
    const inventorySectionContainer = div('inventoryText');
    inventorySectionContainer.innerText = 'Inventory';
    return inventorySectionContainer;
}


function div(id, className) {
    const el = document.createElement('div');
    if(id) el.id = id;
    if(className) el.className = className;
    return el;
}