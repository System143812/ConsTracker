import { fetchData } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, button, editFormButton } from "/js/components.js";

function showOverlayWithBg(overlayDiv) {
    overlayDiv.style.display = 'flex';
    setTimeout(() => {overlayDiv.classList.add('show')}, 50);
}

function hideOverlayWithBg(overlayDiv) {
    overlayDiv.classList.remove('show');
    setTimeout(() => {overlayDiv.style.display = 'none'}, 520);
}

function createOverlayWithBg() {
    const overlayBackground = div('overlayBackground', 'overlays');
    const overlayContainer = div('overlayContainer', 'overlay-containers');
    overlayBackground.append(overlayContainer);
    document.querySelector('body').append(overlayBackground);
    overlayBackground.addEventListener("click", (e) => {
        if(!overlayContainer.contains(e.target)) {
            hideOverlayWithBg(overlayBackground);
        }
    });
    const overlayHeader = div('overlayHeader', 'overlay-headers');
    const overlayBody = div('overlayBody', 'overlay-bodies'); //eto yung body kung san i rerender yung ol dynamic contents
    overlayContainer.append(overlayHeader, overlayBody); 
    return {overlayBackground, overlayHeader, overlayBody};
}

function hideContents(div) {
    div.innerHTML = "";
}

function removeSelectedChildren(parentDiv) {
    for (const child of parentDiv.children) {
        child.classList.remove("selected");
    }
}

function renderEditMilestone(divContainer, milestoneData) {
    const milestoneEditContainer = div('milestoneEditContainer');
    console.log(milestoneData);
    const milestoneEditHeader = div('milestoneEditHeader');
    const milestoneEditTitle = span('milestoneEditTitle');
    milestoneEditTitle.innerText = milestoneData.milestone_name;
    const milestoneEditBody = div('milestoneEditBody');
    milestoneEditHeader.append(milestoneEditTitle, editFormButton());
    milestoneEditContainer.append(milestoneEditHeader, milestoneEditBody);

    
    
    divContainer.append(milestoneEditContainer);

}

async function renderEditTask(divContainer, milestoneData) {
    // const data = await fetchData(`/api/tasks/${milestoneData.id}`);
    const taskEditContainer = div('taskEditContainer');
    taskEditContainer.innerText = "Task Overview";


    divContainer.append(taskEditContainer);
}

export function milestoneFullOl(milestoneData) {
    const {overlayBackground, overlayHeader, overlayBody} = createOverlayWithBg();
    const milestoneBar = div('milestoneBar');
    milestoneBar.innerText = 'Milestones';
    const taskBar = div('taskBar');
    taskBar.innerText = 'Tasks';
    milestoneBar.addEventListener("click", () => {
        removeSelectedChildren(overlayHeader);
        hideContents(overlayBody);
        milestoneBar.classList.add("selected");
        renderEditMilestone(overlayBody, milestoneData);
    });
    taskBar.addEventListener("click", async() => {
        removeSelectedChildren(overlayHeader);
        hideContents(overlayBody);
        taskBar.classList.add("selected");
        await renderEditTask(overlayBody, milestoneData);
    });

    overlayHeader.append(milestoneBar, taskBar);
    renderEditMilestone(overlayBody, milestoneData);
    milestoneBar.classList.add("selected"); 
    showOverlayWithBg(overlayBackground);
}

export function createMilestoneOl(projectId) {

}