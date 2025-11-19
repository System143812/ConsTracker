import { urlBase } from "/js/apiURL.js";
import { formatString } from "https://constracker.share.zrok.io/js/string.js";

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
    tabIcon.style.backgroundImage = `url(${urlBase}/assets/icons/${tabName}.png)`;
    const tabText = document.createElement('p');
    tabText.id = `${tabName}Name`;
    tabText.classList = 'tab-names';
    tabText.innerText = formatString(tabName);
    const sidebarContentContainer = document.getElementById('sidebarContentContainer');
    sidebarContentContainer.append(sideTab);
    sideTab.append(tabIcon, tabText);

}

function mobileHideSidebar(tabs) {
    for (const tab of tabs) {
        tab.addEventListener("click", () => {
            const sidebarContainer = document.getElementById('sidebarContainer');
            if(sidebarContainer.classList.contains('showMobile')) {
                document.getElementById('sidebarOverlay').classList.toggle("showMobile");
                sidebarContainer.classList.toggle("showMobile");
                sidebarContainer.classList.toggle('hide');
            }
        });
    }
}

export function sidebarInitEvents(eventFunction) {
    const tabs = document.querySelectorAll('.sidebar-tabs');
    for (const tab of tabs) {
        if(tab.id !== 'logoutTab') {
            tab.addEventListener("click", async() => {
                await showLoader();
                
                const currentTab = `${(tab.id).replace(/Tab/g, "")}`;
                await eventFunction(currentTab);

                await hideLoader();
            });
        }
    }
    mobileHideSidebar(tabs);
}
