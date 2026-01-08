import { formatString } from "/js/string.js";

const loadingOverlay = document.getElementById('loadingOverlay');
async function showLoader() { 
    loadingOverlay.classList.add('show');
    await new Promise(resolve => setTimeout(resolve, 0));
    
};
async function hideLoader() {
    loadingOverlay.classList.remove('show'); 
    await new Promise(resolve => setTimeout(resolve, 0));
};

export function createTab(tabName) {
    const sideTab = document.createElement('div');
    sideTab.id =`${tabName}Tab`;
    sideTab.className = 'sidebar-tabs';
    const tabIcon = document.createElement('div'); 
    tabIcon.id =  `${tabName}Icon`;
    tabIcon.className = 'tab-icons';
    tabIcon.style.backgroundImage = `url(/assets/icons/${tabName}.png)`;
    const tabText = document.createElement('div');
    tabText.id = `${tabName}Name`;
    tabText.classList.add('tab-names');
    tabText.innerText = formatString(tabName);
    const sidebarContentContainer = document.getElementById('sidebarContentContainer');
    sidebarContentContainer.append(sideTab);
    sideTab.append(tabIcon, tabText);

}

export function createProjectsTab(projects) { // usually sa user this, i prefer. Coz admin doesn't need this layout
    const sidebarProjectContainer = document.getElementById('sidebarProjectContainer');
    const projectTabs = document.createElement('div');
    if(projects.length === 0) console.log('hi pogi');
    projectTabs.id = `projectTabNum${projects.project_id}`;
    projectTabs.className = 'sidebar-project-tabs';
    const projectTabIcon = document.createElement('div');
    projectTabIcon.className = 'tab-icons';
    projectTabIcon.style.backgroundImage = `url(/assets/icons/projects.png)`; 
    const projectTabName = document.createElement('div');
    projectTabName.id = `projectName${projects.project_id}`;
    projectTabName.classList.add('tab-names');
    const projectTabText = document.createElement('div');
    projectTabText.className = 'tab-text';
    projectTabText.innerText = projects.project_name;
    sidebarProjectContainer.append(projectTabs);
    projectTabs.append(projectTabIcon, projectTabName);
    projectTabName.append(projectTabText);
} 

export function noProjectTabPlaceholder() {
    const sidebarProjectContainer = document.getElementById('sidebarProjectContainer');
    const noProjectContainer = document.createElement('div');
    noProjectContainer.id = 'noProjectContainer';
    const noProjectIcon = document.createElement('div');
    noProjectIcon.id = 'noProjectIcon';
    noProjectIcon.className = 'sidebar-big-icon';
    noProjectIcon.style.backgroundImage = `url(/assets/icons/wip.png)`
    const noProjectText = document.createElement('div');
    noProjectText.innerText = 'No projects so far';

    sidebarProjectContainer.append(noProjectContainer);
    noProjectContainer.append(noProjectIcon, noProjectText);
}

// Add displayContents and role to the parameters
function mobileHideSidebar(tabs, displayContents, role) { // Add params
    for (const tab of tabs) {
        tab.addEventListener("click", async() => {
            hideContents();
            tab.classList.add('selected');
            await showLoader();
            try {
                const currentTab = `${(tab.id).replace(/Tab/g, "")}`;
                // Now displayContents is defined here!
                await displayContents(currentTab, 'upperTabs', role);
            } catch (e) {
                console.error("Navigation error:", e);
            } finally {
                await hideLoader();
            }
        });
    }
}


    

export function hideContents() {
    const tabs = document.querySelectorAll('.sidebar-tabs');
    const projectTabs = document.querySelectorAll('.sidebar-project-tabs');
    for (const tab of tabs) {
        tab.classList.remove('selected');
    }
    for (const projectTab of projectTabs) {
        projectTab.classList.remove('selected');
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

export function sidebarInitEvents(displayContents, role) { 
    const tabs = document.querySelectorAll('.sidebar-tabs');
    // FIX 1: Define projectTabs inside the function so it's accessible
    const projectTabs = document.querySelectorAll('.sidebar-project-tabs');

    // Loop 1: Upper Tabs
    for (const tab of tabs) {
        if(tab.id !== 'logoutTab') {
            tab.addEventListener("click", async() => {
                hideContents();
                tab.classList.add('selected');
                await showLoader();
                const currentTab = `${(tab.id).replace(/Tab/g, "")}`;
                try {
                    await displayContents(currentTab, 'upperTabs', role); 
                } catch (e) {
                    console.error("Navigation error:", e);
                }
                await hideLoader();
            });
        }
    }

    // FIX 2: Moved this loop INSIDE the sidebarInitEvents function
    for (const projectTab of projectTabs) {
        projectTab.addEventListener("click", async() => {
            hideContents();
            projectTab.classList.add('selected');
            await showLoader();
            try {
                const projectTabId = `${(projectTab.id).replace(/TabNum/g, "")}`;
                await displayContents(projectTabId, 'lowerTabs', role); 
            } catch (e) {
                console.error("Project navigation error:", e);
            }
            await hideLoader();
        });
    }
    
    // Optional: If you use these mobile functions, call them here
    mobileHideSidebar(tabs, displayContents, role);
    mobileHideSidebar(projectTabs, displayContents, role);
}
