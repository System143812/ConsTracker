import { fetchData } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, button, editFormButton, emptyPlaceholder, createInput, deleteFormButton } from "/js/components.js";


function roundDecimal(number) {
    return number * 10 / 10;
}

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
    overlayBackground.addEventListener("click", () => {
        hideOverlayWithBg(overlayBackground);
    });
    overlayContainer.addEventListener("click", (e) => {
        e.stopPropagation();
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

async function updateContents(divContainer, newContentFn) {
    hideContents(divContainer);
    divContainer.append(await newContentFn());
}

async function renderEditMilestone(milestoneId, updateUiFn, overlayBackground) { //milestone tab content ng milestone edit ol
    const milestoneEditContainer = div('milestoneEditContainer');
    const milestoneData = await fetchData(`/api/milestone/${milestoneId}`);
    if(milestoneData === "error") return alertPopup('error', 'Network Connection Error');
    if(milestoneData.length === 0) {
        emptyPlaceholder(milestoneEditContainer, "Failed to get milestone data");
        return milestoneEditContainer;
    }
    console.log(milestoneData);
    const milestoneEditHeader = div('milestoneEditHeader');
    const milestoneEditIntro = div('milestoneEditIntro');
    const milestoneEditTitle = span('milestoneEditTitle');
    const milestoneEditSubtitle = span('milestoneEditSubtitle');
    milestoneEditTitle.innerText = "Milestone Details";
    milestoneEditSubtitle.innerText = "View and edit information for this milestone";
    const milestoneEditBody = div('milestoneEditBody');
    const milestoneEditForm = document.createElement('form');
    milestoneEditForm.id = 'milestoneEditForm';

    const milestoneFormHeader = div('milestoneFormHeader');
    const milestoneFormBody = div('milestoneFormBody');
    const milestoneFormFooter = div('milestoneFormFooter');

    milestoneFormHeader.append(
        createInput('text', 'read', 'Milestone Name', 'milestoneInputName', 'milestone_name', milestoneData.milestone_name, 'Enter milestone name', '', '', '', ''),
        createInput('textarea', 'read', 'Description', 'milestoneInputDescription', 'milestone_description', milestoneData.milestone_description, 'Enter milestone description', '', '100', '', '100 characters max')
    );
    const duedate = dateFormatting(milestoneData.duedate, 'calendar');
    milestoneFormBody.append(
        createInput('text', 'read', 'Weights', 'milestoneInputWeights', 'milestone_weights', milestoneData.weights, 'Enter weight amount', 0, 100, 'decimal', 'maximum: 100%'),
        createInput('date', 'read', 'Due Date', 'milestoneInputDue', 'milestone_due', duedate, 'Select due date', '', '', '', `mm/dd/yyyy`),
    );
    milestoneFormFooter.append(
        deleteFormButton(milestoneData.id, 'Milestone', () => { alertPopup("success", "Milestone Deleted Successfully") }, updateUiFn, () => { hideOverlayWithBg(overlayBackground) })
    );

    milestoneEditForm.append(milestoneFormHeader, milestoneFormBody, milestoneFormFooter);
    milestoneEditBody.append(milestoneEditForm);
    milestoneEditIntro.append(milestoneEditTitle, milestoneEditSubtitle);
    milestoneEditHeader.append(milestoneEditIntro, editFormButton(milestoneEditForm, () => { alertPopup('success', 'Saved Successfully') }, updateUiFn));
    milestoneEditContainer.append(milestoneEditHeader, milestoneEditBody);

    return milestoneEditContainer;

}

async function renderEditTask(milestoneId, milestoneName, taskId, updateUiFn, overlayBody) {
    const taskEditContainer = div('taskEditContainer');
    const taskData = await fetchData(`/api/task/${taskId}`);
    if(taskData === "error") return alertPopup('error', 'Network Connection Error');
    if(taskData.length === 0) {
        emptyPlaceholder(taskEditContainer, "Failed to get task data");
        return taskEditContainer;
    }
    const taskEditHeader = div('taskEditHeader');
    const goBackBtn = button('goBackBtn');
    const goBackBtnIcon = div('goBackBtnIcon', 'icons');
    goBackBtn.addEventListener("click", () => {
        updateContents(overlayBody, () => renderViewTask(milestoneId, milestoneName, updateUiFn, overlayBody));
    });
    const taskEditBody = div('taskEditBody')
    const taskEditForm = document.createElement('form');
    taskEditForm.addEventListener("submit", (e) => {
        e.preventDefault();
    });
    taskEditForm.id = 'taskEditForm';

    const taskFormHeader = div('taskFormHeader');
    const taskFormBody = div('taskFormBody');
    const taskFormFooter = div('taskFormFooter');

    taskFormHeader.append(createInput('text', 'read', 'Task Name', 'taskInputName', 'task_name', taskData.task_name, 'Enter task name'));
    taskFormBody.append(
        createInput('text', 'read', 'Progress', 'taskInputProgress', 'task_progress', taskData.task_progress, 'Enter progress percentage', 0, 100, 'decimal', 'maximum: 100%'),
        createInput('text', 'read', 'Weights', 'taskInputWeights', 'task_weights', taskData.weights, 'Enter weight amount', 0, 100, 'decimal', 'maximum: 100%')
    );

    taskFormFooter.append(deleteFormButton(taskData.id, 'Task', () => { alertPopup("success", "Task Deleted Successfully") }, updateUiFn, () => updateContents(overlayBody, () => renderViewTask(milestoneId, milestoneName, updateUiFn, overlayBody))));
    taskEditForm.append(taskFormHeader, taskFormBody, taskFormFooter);
    taskEditBody.append(taskEditForm);
    goBackBtn.append(goBackBtnIcon);
    taskEditHeader.append(goBackBtn, editFormButton(taskEditForm, () => { alertPopup("success", "Saved Successfully") }, updateUiFn));
    taskEditContainer.append(taskEditHeader, taskEditBody);

    return taskEditContainer;
}

async function renderViewTask(milestoneId, milestoneName, updateUiFn, overlayBody) { //tasks tab content ng milestone edit ol
    const taskViewContainer = div('taskViewContainer');
    const tasks = await fetchData(`/api/tasks/${milestoneId}`);
    if(tasks === "error") return alertPopup('error', 'Network Connection Error');
    if(tasks.length === 0) {
        emptyPlaceholder(taskViewContainer, "Failed to get tasks");
        return taskViewContainer;
    }

    const taskViewHeader = div('taskViewHeader');
    const taskViewIntro = div('taskViewIntro');
    const taskViewTitle = span('taskViewTitle');
    const taskViewSubtitle = span('taskViewSubtitle');
    taskViewTitle.innerText = `Tasks for ${milestoneName}`;
    taskViewSubtitle.innerText = "Click to view and manage tasks under this milestone";
    const taskViewBody = div('taskEditBody');
    let count = 1;
    for (const task of tasks) {
        const taskContainer = div('', 'task-containers');
        const taskHeader = div('', 'task-headers');
        const taskNumber = span('', 'task-numbers');
        taskNumber.innerText = `Task ${count} : `;
        const taskName =  span('', 'task-names');
        taskName.innerText = task.task_name;
        const taskStatus = div('taskStatus', 'status');
        taskStatus.innerText = task.status;
        if(task.status === 'completed') warnType(taskStatus, 'solid', 'green');
        if(task.status === 'overdue') warnType(taskStatus, 'solid', 'red');
        if(task.status === 'in progress') warnType(taskStatus, 'solid', 'yellow');
        if(task.status === 'not started') warnType(taskStatus, 'solid', 'white');
        const taskProgressBarContainer = div('', 'task-progress-bar-containers');
        const taskProgressBar =  div('', 'task-progress-bars');
        taskProgressBar.style.setProperty(`--progress`, `0%`);
        setTimeout(() => {
            requestAnimationFrame(() => {
                taskProgressBar.style.setProperty(`--progress`, `${roundDecimal(task.task_progress)}%`);
            });
        }, 200);
        const taskProgressBarData = div('', 'task-progress-bar-data');
        const taskProgressLabel = span('', 'task-progress-labels');
        taskProgressLabel.innerText = 'Progress';
        const taskProgressPct = span('', 'task-progress-pct');
        taskProgressPct.innerText = `${roundDecimal(task.task_progress)}%`;

        taskProgressBarData.append(taskProgressLabel, taskProgressPct);
        taskProgressBarContainer.append(taskProgressBar);
        taskHeader.append(taskNumber, taskName, taskStatus);
        taskContainer.append(taskHeader, taskProgressBarContainer, taskProgressBarData);
        taskContainer.addEventListener("click", () => {
            updateContents(overlayBody, () => renderEditTask(milestoneId, milestoneName, task.id, updateUiFn, overlayBody));
        });
        taskViewBody.append(taskContainer);
        count++;
    }
    
    taskViewIntro.append(taskViewTitle, taskViewSubtitle);
    taskViewHeader.append(taskViewIntro);
    taskViewContainer.append(taskViewHeader, taskViewBody);

    return taskViewContainer;
}

export async function milestoneFullOl(milestoneId, milestoneName, updateUiFn) { //milestone edit ol itslef -- dito nkalgay yung tasks and milestone content, (reusable)
    const {overlayBackground, overlayHeader, overlayBody} = createOverlayWithBg();
    const milestoneBar = div('milestoneBar');
    milestoneBar.innerText = 'Milestones';
    const taskBar = div('taskBar');
    taskBar.innerText = 'Tasks';
    milestoneBar.addEventListener("click", () => {
        removeSelectedChildren(overlayHeader);
        milestoneBar.classList.add("selected");
        updateContents(overlayBody, async() => await renderEditMilestone(milestoneId, updateUiFn, overlayBackground));
    });
    taskBar.addEventListener("click", () => {
        removeSelectedChildren(overlayHeader);
        taskBar.classList.add("selected");
        updateContents(overlayBody, async() => await renderViewTask(milestoneId, milestoneName, updateUiFn, overlayBody));
    });

    overlayHeader.append(milestoneBar, taskBar);
    overlayBody.append(await renderEditMilestone(milestoneId, updateUiFn, overlayBackground));
    milestoneBar.classList.add("selected"); 
    showOverlayWithBg(overlayBackground);
}

export function createMilestoneOl(projectId) {

}