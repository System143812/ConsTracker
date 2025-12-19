import { fetchData } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, button, editFormButton, emptyPlaceholder, createInput, deleteFormButton, createButton } from "/js/components.js";


function roundDecimal(number) {
    return Math.floor(number * 100) / 100;
}

function showOverlayWithBg(overlayDiv) {
    overlayDiv.style.display = 'flex';
    setTimeout(() => {overlayDiv.classList.add('show')}, 50);
}

function hideOverlayWithBg(overlayDiv) {
    overlayDiv.classList.remove('show');
    setTimeout(() => {overlayDiv.remove()}, 520);
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

async function renderEditWeights(weightsData, type = null , data) {
    const weightEditContainer = div('weightEditContainer', 'form-edit-containers');
    const weightEditHeader = div('weightEditHeader','form-edit-headers');

    const goBackBtn = button('goBackBtn');
    const goBackBtnIcon = div('goBackBtnIcon', 'icons');

    const weightEditIntro = div('weightEditIntro', 'form-edit-intros');
    const weightEditTitle = span('weightEditTitle', 'form-edit-titles');
    const weightEditSubtitle = span('weightEditSubtitle', 'form-edit-subtitles');
    const weightEditBody = div('weightEditBody', 'form-edit-bodies');
    const weightEditForm = document.createElement('form');
    weightEditForm.id = 'weightEditForm';
    weightEditForm.className = 'form-edit-forms';
    const weightFormHeader = div('weightFormHeader');
    const weightTypeName = span('weightTypeName');
    const weightTotalContainer = span('weightTotalContainer');
    const weightTotalLabel = span('weightTotalLabel');
    const weightTotalErr = span('weightTotalErr');
    weightTotalErr.dataset.errorMsg = "You can't allocate more than 100%";
    const weightFormBody = div('weightFormBody');
    let totalWeight = 0;
    let count = 1;

    function recheckWeightFields() {
        const inputFields = weightEditForm.querySelectorAll('input');
        totalWeight = 0;
        for (const inputField of inputFields) {
            totalWeight += Number(inputField.value);
            weightTotalLabel.innerText = `Total Weight: ${totalWeight}%`;
            if(totalWeight > 100) {
                weightTotalErr.classList.add('error');
                weightTotalErr.innerText = weightTotalErr.dataset.errorMsg;
            } else {
                weightTotalErr.classList.remove('error');
                weightTotalErr.innerText = `${roundDecimal(100 - totalWeight)}% remaining`;
            }
        }
    }

    for (const weightData of weightsData) {
        const weightContainer = div('weightContainer');
        const weightName = div('weightName');
        const weightInputContainer = div('weightInputContainer');
        let weightInput;
        
        if(type === "milestones") {
            weightName.innerText = weightData.milestone_name;
            weightInput = createInput('text', 'read', '', `milestoneWeightInput${count}`, 'milestone_weight', weightData.weights, 'Weight %', 0, 100, 'decimal', 'max: 100%');
        } else {
            weightName.innerText = weightData.task_name;
            weightInput = createInput('text', 'read', '', `taskWeightInput${count}`, 'task_weight', weightData.weights, 'Weight %', 0, 100, 'decimal', 'max: 100%');
        }
        totalWeight += Number(weightData.weights);

        const weightInputField = weightInput.querySelector('input');
        weightInputField.addEventListener("input", () => {
            recheckWeightFields();
        });

        weightInputContainer.append(weightInput);
        weightContainer.append(weightName, weightInputContainer);
        weightFormBody.append(weightContainer);
        count ++;
    }

    if(type === "milestones") {
        weightTypeName.innerText = 'Milestone\nNames';
        weightEditTitle.innerText = 'Milestone Weights';
        weightEditSubtitle.innerText = '';
    } else {
        weightTypeName.innerText = 'Task\nNames';
        weightEditTitle.innerText = 'Task Weights';
        weightEditSubtitle.innerText = '';
    }
    weightTotalLabel.innerText = `Total Weight: ${totalWeight}%`;
    if(totalWeight > 100) {
        weightTotalErr.classList.add('error');
        weightTotalErr.innerText = weightTotalErr.dataset.errorMsg;
    } else {
        weightTotalErr.classList.remove('error');
        weightTotalErr.innerText = `${roundDecimal(100 - totalWeight)}% remaining`;
    }
    weightTotalContainer.append(weightTotalLabel, weightTotalErr);
    weightFormHeader.append(weightTypeName, weightTotalContainer);
    weightEditForm.append(weightFormHeader, weightFormBody);
    weightEditBody.append(weightEditForm);
    goBackBtn.append(goBackBtnIcon);
    weightEditIntro.append(weightEditTitle, weightEditSubtitle);

    weightEditHeader.append(
        goBackBtn,
        weightEditIntro,
        data.role !== 'foreman' ? editFormButton(weightEditForm, () => alertPopup("success", "Saved Successfully"), data.updateUiFn, () => recheckWeightFields()) : ""
    );
    weightEditContainer.append(weightEditHeader, weightEditBody);

    goBackBtn.addEventListener("click", () => {
        if(type === 'milestones') {
            updateContents(overlayBody, () => renderEditMilestone(data.projectId, data.milestoneId, data.updateUiFn, data.overlayBackground, data.role));
        } else {
            updateContents(overlayBody, () => renderEditTask(data.milestoneId, data.milestoneName, data.taskId, data.updateUiFn, data.overlayBody, data.role));
        }       
    });

    return weightEditContainer;
}

async function renderEditMilestone(projectId, milestoneId, updateUiFn, overlayBackground, role) { //milestone tab content ng milestone edit ol
    const milestoneEditContainer = div('milestoneEditContainer', 'form-edit-containers');
    const milestoneData = await fetchData(`/api/milestone/${milestoneId}`);
    if(milestoneData === "error") return alertPopup('error', 'Network Connection Error');
    if(milestoneData.length === 0) {
        emptyPlaceholder(milestoneEditContainer, "Failed to get milestone data");
        return milestoneEditContainer;
    }
    const milestoneWeightData = await fetchData(`/api/milestones/${projectId}`);
    if(milestoneWeightData === "error") return alertPopup('error', 'Network Connection Error');
    if(milestoneWeightData.length === 0) {
        emptyPlaceholder(milestoneEditContainer, "Failed to get milestone weights data");
        return milestoneEditContainer;
    }
    const milestoneEditHeader = div('milestoneEditHeader', 'form-edit-headers');
    const milestoneEditIntro = div('milestoneEditIntro', 'form-edit-intros');
    const milestoneEditTitle = span('milestoneEditTitle', 'form-edit-titles');
    const milestoneEditSubtitle = span('milestoneEditSubtitle', 'form-edit-subtitles');
    milestoneEditTitle.innerText = "Milestone Details";
    milestoneEditSubtitle.innerText = "View and edit information for this milestone";
    const milestoneEditBody = div('milestoneEditBody', 'form-edit-bodies');
    const milestoneEditForm = document.createElement('form');
    milestoneEditForm.id = 'milestoneEditForm';
    milestoneEditForm.className = 'form-edit-forms';
    const milestoneFormHeader = div('milestoneFormHeader');
    const milestoneFormBody = div('milestoneFormBody');
    const milestoneFormFooter = div('milestoneFormFooter');

    const weightsButton = createButton('weightsFormBtn', 'solid-buttons', 'Milestones Weights', 'weightsBtnText', '');
    const spanArrowIcon = span('weightsBtnIcon', 'btn-icons');
    weightsButton.append(spanArrowIcon);
    weightsButton.addEventListener("click", () => {
        updateContents(overlayBody, () => renderEditWeights(milestoneWeightData, 'milestones', { projectId, milestoneId, updateUiFn, overlayBackground, role }));
    });
    milestoneFormHeader.append(
        createInput('text', 'read', 'Milestone Name', 'milestoneInputName', 'milestone_name', milestoneData.milestone_name, 'Enter milestone name', '', '', '', ''),
        createInput('textarea', 'read', 'Description', 'milestoneInputDescription', 'milestone_description', milestoneData.milestone_description, 'Enter milestone description', '', '100', '', '100 characters max')
    );
    const duedate = dateFormatting(milestoneData.duedate, 'calendar');
    milestoneFormBody.append(
        // createInput('text', 'read', 'Weights', 'milestoneInputWeights', 'milestone_weights', milestoneData.weights, 'Enter weight amount', 0, 100, 'decimal', 'maximum: 100%'),
        createInput('date', 'read', 'Due Date', 'milestoneInputDue', 'milestone_due', duedate, 'Select due date', '', '', '', `mm/dd/yyyy`),
        weightsButton
    );
    
    milestoneFormFooter.append(
        role !== "foreman" ? deleteFormButton(milestoneData.id, 'Milestone', () => { alertPopup("success", "Milestone Deleted Successfully") }, updateUiFn, () => { hideOverlayWithBg(overlayBackground) }) : ""
    );

    milestoneEditForm.append(milestoneFormHeader, milestoneFormBody, milestoneFormFooter);
    milestoneEditBody.append(milestoneEditForm);
    milestoneEditIntro.append(milestoneEditTitle, milestoneEditSubtitle);
    milestoneEditHeader.append(milestoneEditIntro, role !== 'foreman' ? editFormButton(milestoneEditForm, () => { alertPopup('success', 'Saved Successfully') }, updateUiFn) : "");
    milestoneEditContainer.append(milestoneEditHeader, milestoneEditBody);

    return milestoneEditContainer;

}

async function renderEditTask(milestoneId, milestoneName, taskId, updateUiFn, overlayBody, role) {
    const taskEditContainer = div('taskEditContainer', 'form-edit-containers');
    const taskData = await fetchData(`/api/task/${taskId}`);
    if(taskData === "error") return alertPopup('error', 'Network Connection Error');
    if(taskData.length === 0) {
        emptyPlaceholder(taskEditContainer, "Failed to get task data");
        return taskEditContainer;
    }
    const taskWeightData = await fetchData(`/api/tasks/${milestoneId}`);
    if(taskWeightData === "error") return alertPopup('error', 'Network Connection Error');
    if(taskWeightData.length === 0) {
        emptyPlaceholder(taskEditContainer, "Failed to get task weights data");
        return taskEditContainer;
    }
    const taskEditHeader = div('taskEditHeader', 'form-edit-headers');
    const goBackBtn = button('goBackBtn');
    const goBackBtnIcon = div('goBackBtnIcon', 'icons');
    goBackBtn.addEventListener("click", () => {
        updateContents(overlayBody, () => renderViewTask(milestoneId, milestoneName, updateUiFn, overlayBody, role));
    });
    const taskEditBody = div('taskEditBody', 'form-edit-bodies');
    const taskEditForm = document.createElement('form');
    taskEditForm.addEventListener("submit", (e) => {
        e.preventDefault();
    });
    taskEditForm.id = 'taskEditForm';
    taskEditForm.className = 'form-edit-forms'

    const taskFormHeader = div('taskFormHeader');
    const taskFormBody = div('taskFormBody');
    const taskFormFooter = div('taskFormFooter');

    const weightsButton = createButton('weightsFormBtn', 'solid-buttons', 'Tasks Weights', 'weightsBtnText', '');
    const spanArrowIcon = span('weightsBtnIcon', 'btn-icons');
    weightsButton.append(spanArrowIcon);
    weightsButton.addEventListener("click", () => {
        updateContents(overlayBody, () => renderEditWeights(taskWeightData, "tasks", { milestoneId, milestoneName, taskId, updateUiFn, overlayBody, role }));
    });

    taskFormHeader.append(
        createInput('text', 'read', 'Task Name', 'taskInputName', 'task_name', taskData.task_name, 'Enter task name')
    );
    taskFormBody.append(
        createInput('text', 'read', 'Progress', 'taskInputProgress', 'task_progress', taskData.task_progress, 'Enter progress percentage', 0, 100, 'decimal', 'maximum: 100%'),
        weightsButton
        // createInput('text', 'read', 'Weights', 'taskInputWeights', 'task_weights', taskData.weights, 'Enter weight amount', 0, 100, 'decimal', 'maximum: 100%')
    );
    
    if(role !== 'foreman') {
        taskFormFooter.append(
            deleteFormButton(taskData.id, 'Task', () => { alertPopup("success", "Task Deleted Successfully") }, updateUiFn, () => updateContents(overlayBody, () => renderViewTask(milestoneId, milestoneName, updateUiFn, overlayBody)))
        );
    } else {
        taskFormFooter.append("");
    }
    taskEditForm.append(taskFormHeader, taskFormBody, taskFormFooter);
    taskEditBody.append(taskEditForm);
    goBackBtn.append(goBackBtnIcon);
    taskEditHeader.append(goBackBtn, role !== 'foreman' ? editFormButton(taskEditForm, () => { alertPopup("success", "Saved Successfully") }, updateUiFn) : "");
    taskEditContainer.append(taskEditHeader, taskEditBody);

    return taskEditContainer;
}

async function renderViewTask(milestoneId, milestoneName, updateUiFn, overlayBody, role) { //tasks tab content ng milestone edit ol
    const taskViewContainer = div('taskViewContainer', 'form-edit-containers');
    const tasks = await fetchData(`/api/tasks/${milestoneId}`);
    if(tasks === "error") return alertPopup('error', 'Network Connection Error');
    if(tasks.length === 0) {
        emptyPlaceholder(taskViewContainer, "Failed to get tasks");
        return taskViewContainer;
    }

    const taskViewHeader = div('taskViewHeader', 'form-edit-headers');
    const taskViewIntro = div('taskViewIntro', 'form-edit-intros');
    const taskViewTitle = span('taskViewTitle', 'form-edit-titles');
    const taskViewSubtitle = span('taskViewSubtitle', 'form-edit-subtitles');
    taskViewTitle.innerText = `Tasks for ${milestoneName}`;
    taskViewSubtitle.innerText = "Click to view and manage tasks under this milestone";
    const taskViewBody = div('taskEditBody', 'form-edit-bodies');
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
            updateContents(overlayBody, () => renderEditTask(milestoneId, milestoneName, task.id, updateUiFn, overlayBody, role));
        });
        taskViewBody.append(taskContainer);
        count++;
    }
    
    taskViewIntro.append(taskViewTitle, taskViewSubtitle);
    taskViewHeader.append(taskViewIntro, role !== 'foreman' ? createButton('taskAddBtn', 'solid-buttons', 'New', 'taskAddText', 'taskAddIcon') : "");
    taskViewContainer.append(taskViewHeader, taskViewBody);

    return taskViewContainer;
}

export async function milestoneFullOl(projectId, milestoneId, milestoneName, updateUiFn, role) { //milestone edit ol itslef -- dito nkalgay yung tasks and milestone content, (reusable)
    const {overlayBackground, overlayHeader, overlayBody} = createOverlayWithBg();
    const milestoneBar = div('milestoneBar');
    milestoneBar.innerText = 'Milestones';
    const taskBar = div('taskBar');
    taskBar.innerText = 'Tasks';
    milestoneBar.addEventListener("click", () => {
        removeSelectedChildren(overlayHeader);
        milestoneBar.classList.add("selected");
        updateContents(overlayBody, async() => await renderEditMilestone(projectId, milestoneId, updateUiFn, overlayBackground, role));
    });
    taskBar.addEventListener("click", () => {
        removeSelectedChildren(overlayHeader);
        taskBar.classList.add("selected");
        updateContents(overlayBody, async() => await renderViewTask(milestoneId, milestoneName, updateUiFn, overlayBody, role));
    });

    overlayHeader.append(milestoneBar, taskBar);
    overlayBody.append(await renderEditMilestone(projectId, milestoneId, updateUiFn, overlayBackground, role));
    milestoneBar.classList.add("selected"); 
    showOverlayWithBg(overlayBackground);
}

export function createMilestoneOl(projectId) {
    const {overlayBackground, overlayHeader, overlayBody} = createOverlayWithBg();
    overlayBody.innerText = "Gawa na boii";
    showOverlayWithBg(overlayBackground);
}