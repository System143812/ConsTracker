import { fetchData } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";

function div(id, className) {
    const el = document.createElement('div');
    if(id) el.id = id;
    if(className) el.className = className;
    return el;
}

function createOverlayWithBg() {
    const overlayBackground = div('overlayBackground', 'overlays');
    const overlayContainer = div('overlayContainer', 'overlay-containers');
    overlayBackground.append(overlayContainer);
    document.querySelector('body').append(overlayBackground);
    return {overlayBackground, overlayContainer};
}

function showOverlayWithBg(overlayDiv) {
    overlayDiv.style.display = 'flex';
    setTimeout(() => {overlayDiv.classList.add('show')}, 50);
}

function hideOverlayWithBg(overlayDiv) {
    overlayDiv.classList.remove('show');
    setTimeout(() => {overlayDiv.style.display = 'none'}, 520);
}

function hideContents(div) {
    div.innerHTML = "";
}

function renderEditMilestone(divContainer) {
    const milestoneEditContainer = div('milestoneEditContainer');
    milestoneEditContainer.innerText = "Milestone Overview";

    divContainer.append(milestoneEditContainer);

}

export function milestoneFullOl(milestoneData) {
    const {overlayBackground, overlayContainer} = createOverlayWithBg();
    const milestoneTabs = div('milestoneHeaderTabs');
    const milestoneBody = div('milestoneBody');
    renderEditMilestone(milestoneBody); 
    overlayContainer.append(milestoneTabs, milestoneBody);

    showOverlayWithBg(overlayBackground);
    overlayBackground.addEventListener("click", (e) => {
        if(e.target !== overlayContainer) {
            hideOverlayWithBg(overlayBackground);
        }
    });
}

export function createMilestoneOl(projectId) {

}