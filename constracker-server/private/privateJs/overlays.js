import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType, showEmptyPlaceholder } from "/js/popups.js";
import { div, span, button, editFormButton, createInput, deleteFormButton, createButton, createLogs } from "/js/components.js";


function roundDecimal(number) {
    return Math.floor(number * 100) / 100;
}

export function showOverlayWithBg(overlayDiv) {
    overlayDiv.style.display = 'flex';
    setTimeout(() => {overlayDiv.classList.add('show')}, 50);
}

export function hideOverlayWithBg(overlayDiv) {
    overlayDiv.classList.remove('show');
    setTimeout(() => {overlayDiv.remove()}, 520);
}

export function createOverlayWithBg() {
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
    return {overlayBackground, overlayContainer, overlayHeader, overlayBody};
}

export function showDeleteConfirmation(itemName, onConfirm) {
    const { overlayBackground, overlayHeader, overlayBody } = createOverlayWithBg();
    overlayHeader.innerText = 'Confirm Deletion';
    
    const confirmationMessage = div('confirmation-message');
    confirmationMessage.innerText = `Are you sure you want to delete "${itemName}"?`;
    
    const buttonContainer = div('confirmation-buttons');
    const confirmBtn = createButton('confirm-delete-btn', 'solid-buttons', 'Confirm', 'confirm-delete-txt');
    const cancelBtn = createButton('cancel-delete-btn', 'wide-buttons', 'Cancel', 'cancel-delete-txt');

    confirmBtn.addEventListener('click', () => {
        onConfirm();
        hideOverlayWithBg(overlayBackground);
    });

    cancelBtn.addEventListener('click', () => {
        hideOverlayWithBg(overlayBackground);
    });

    buttonContainer.append(cancelBtn, confirmBtn);
    overlayBody.append(confirmationMessage, buttonContainer);
    showOverlayWithBg(overlayBackground);
}

function removeSelectedChildren(parentDiv) {
    for (const child of parentDiv.children) {
        child.classList.remove("selected");
    }
}

function hideContents(div) {
    div.innerHTML = "";
}

async function updateContents(divContainer, newContentFn) {
    hideContents(divContainer);
    divContainer.append(await newContentFn());
}

async function renderEditWeights(weightsData, type = null , data) {

    async function saveEditWeights(form) {
        const weightsKeyValue = []; 
        const inputFields = form.querySelectorAll('input, textarea, select');
        const logDetails = [];
        for (const inputField of inputFields) {
            weightsKeyValue.push({
                id: Number(inputField.dataset.id),
                originalVal: Number(inputField.dataset.original),
                value: Number(inputField.value)
            });          
            const labelName = inputField.closest('#weightContainer')?.querySelector("#weightName").innerText;            
            if(Number(inputField.dataset.original) !== Number(inputField.value)) {
                logDetails.push({
                    label: `${labelName} weight`,
                    varName: "weight",
                    oldVal: Number(inputField.dataset.original),
                    newVal: Number(inputField.value)
                });
            }
            inputField.dataset.original = inputField.value; 
        }

        let updateWeightUrl;
        if(type === "milestones") {    
            if (logDetails.length > 0) {
                await createLogs('non-item', 'edit', 'updated the milestone weights', data.projectId, logDetails);
            }
            updateWeightUrl = '/api/edit/milestones/weights';
        } else {
            if (logDetails.length > 0) {
                await createLogs('non-item', 'edit', `updated the task weights of milestone ${data.milestoneName}`, data.projectId, logDetails);
            }
            updateWeightUrl = '/api/edit/tasks/weights';
        }
        
        const response = await fetchPostJson(updateWeightUrl, 'POST', weightsKeyValue, 'Saved weights');
        if(response === "error") return alertPopup("error", "Network Connection Error");
        
    }

    const weightEditContainer = div('weightEditContainer', 'form-edit-containers');
    const weightEditHeader = div('weightEditHeader','form-edit-headers');

    const goBackBtn = button('goBackBtn');
    const goBackBtnIcon = div('goBackBtnIcon', 'icons');

    const weightEditIntro = div('weightEditIntro', 'form-edit-intros');
    const weightEditTitle = span('weightEditTitle', 'form-edit-titles');
    const weightEditBody = div('weightEditBody', 'form-edit-bodies');
    const weightEditForm = document.createElement('form');
    weightEditForm.id = 'weightEditForm';
    weightEditForm.className = 'form-edit-forms';
    const weightFormHeader = div('weightFormHeader');
    // const weightTypeName = span('weightTypeName');
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
            weightTotalLabel.innerText = `Total Weight: ${roundDecimal(totalWeight)}%`;
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
        const input = weightInput.querySelector('input');
        input.dataset.id = weightData.id;
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
        weightEditTitle.innerText = 'Milestone Weights';
    } else {
        weightEditTitle.innerText = 'Task Weights';
    }
    weightTotalLabel.innerText = `Total Weight: ${roundDecimal(totalWeight)}%`;
    if(totalWeight > 100) {
        weightTotalErr.classList.add('error');
        weightTotalErr.innerText = weightTotalErr.dataset.errorMsg;
    } else {
        weightTotalErr.classList.remove('error');
        weightTotalErr.innerText = `${roundDecimal(100 - totalWeight)}% remaining`;
    }
    weightTotalContainer.append(weightTotalLabel, weightTotalErr);
    weightFormHeader.append(weightTotalContainer);
    weightEditForm.append(weightFormHeader, weightFormBody);
    weightEditBody.append(weightEditForm);
    goBackBtn.append(goBackBtnIcon);
    weightEditIntro.append(weightEditTitle);

    weightEditHeader.append(
        goBackBtn,
        weightEditIntro,
        data.role !== 'foreman' ? editFormButton(weightEditForm, () => alertPopup("success", "Saved Successfully"), data.updateUiFn, () => recheckWeightFields(), () => saveEditWeights(weightEditForm)) : ""
    );
    weightEditContainer.append(weightEditHeader, weightEditBody);

    goBackBtn.addEventListener("click", () => {
        if(type === 'milestones') {
            updateContents(overlayBody, () => renderEditMilestone(data.projectId, data.milestoneId, data.updateUiFn, data.overlayBackground, data.role));
        } else {
            updateContents(overlayBody, () => renderEditTask(data.projectId, data.milestoneId, data.milestoneName, data.taskId, data.updateUiFn, data.overlayBody, data.role));
        }       
    });

    return weightEditContainer;
}

async function renderEditMilestone(projectId, milestoneId, updateUiFn, overlayBackground, role) { //milestone tab content ng milestone edit ol
    const milestoneEditContainer = div('milestoneEditContainer', 'form-edit-containers');
    const milestoneData = await fetchData(`/api/milestone/${milestoneId}`);
    if(milestoneData === "error") return alertPopup('error', 'Network Connection Error');
    if(!milestoneData) {
        showEmptyPlaceholder(null, milestoneEditContainer, null, "Failed to get milestone data");
        return milestoneEditContainer;
    }
    const milestoneWeightData = await fetchData(`/api/milestones/${projectId}`);
    if(milestoneWeightData === "error") return alertPopup('error', 'Network Connection Error');
    if(milestoneWeightData.length === 0) {
        showEmptyPlaceholder(null, milestoneEditContainer, null, "Failed to get milestone weights data");
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

    const weightsButton = createButton('weightsFormBtn', 'solid-buttons', 'Milestones Weights', 'weightsBtnText', '',
        () => updateContents(overlayBody, () => renderEditWeights(milestoneWeightData, 'milestones', { projectId, milestoneId, updateUiFn, overlayBackground, role }))
    );
    const spanArrowIcon = span('weightsBtnIcon', 'btn-icons');
    weightsButton.append(spanArrowIcon);

    milestoneFormHeader.append(
        createInput('text', 'read', 'Milestone Name', 'milestoneInputName', 'milestone_name', milestoneData.milestone_name, 'Enter milestone name', '', '', '', ''),
        createInput('textarea', 'read', 'Description', 'milestoneInputDescription', 'milestone_description', milestoneData.milestone_description, 'Enter milestone description', '', '100', '', '100 characters max')
    );
    const duedate = dateFormatting(milestoneData.duedate, 'calendar');
    milestoneFormBody.append(
        createInput('date', 'read', 'Due Date', 'milestoneInputDue', 'milestone_due', duedate, 'Select due date', '', '', '', `mm/dd/yyyy`),
        weightsButton
    );
    
    async function saveMilestone() {
        const updatedMilestone = {};

        const milestoneName = document.getElementById('milestoneInputName').value;
        if (milestoneName !== milestoneData.milestone_name) {
            updatedMilestone.milestone_name = milestoneName;
        }

        const milestoneDescription = document.getElementById('milestoneInputDescription').value;
        if (milestoneDescription !== milestoneData.milestone_description) {
            updatedMilestone.milestone_description = milestoneDescription;
        }

        const milestoneDueDateString = document.getElementById('milestoneInputDue').value;
        const originalDateString = dateFormatting(milestoneData.duedate, 'calendar');

        if (milestoneDueDateString !== originalDateString) {
            updatedMilestone.duedate = milestoneDueDateString;
        }
        
        if (Object.keys(updatedMilestone).length === 0) {
            // No changes were made
            return;
        }

        const response = await fetchPostJson(`/api/milestones/${milestoneId}`, 'PUT', updatedMilestone, null);
        if (response !== 'error') {
            alertPopup('success', 'Milestone updated successfully!');
        }
    }
    
    milestoneFormFooter.append(
        role !== "foreman" ? deleteFormButton(milestoneData.id, 'Milestone', 
            () => {
                fetch(`/api/milestones/${milestoneData.id}`, { method: 'DELETE' });
                alertPopup("success", "Milestone Deleted Successfully");
            }, 
            updateUiFn, 
            () => { hideOverlayWithBg(overlayBackground) }
        ) : ""
    );

    milestoneEditForm.append(milestoneFormHeader, milestoneFormBody, milestoneFormFooter);
    milestoneEditBody.append(milestoneEditForm);
    milestoneEditIntro.append(milestoneEditTitle, milestoneEditSubtitle);
    milestoneEditHeader.append(milestoneEditIntro, role !== 'foreman' ? editFormButton(milestoneEditForm, () => { alertPopup('success', 'Saved Successfully') }, updateUiFn, '', saveMilestone) : "");
    milestoneEditContainer.append(milestoneEditHeader, milestoneEditBody);

    return milestoneEditContainer;
}

async function renderEditTask(projectId, milestoneId, milestoneName, taskId, updateUiFn, overlayBody, role) {
    const taskEditContainer = div('taskEditContainer', 'form-edit-containers');
    const taskData = await fetchData(`/api/task/${taskId}`);
    if(taskData === "error") return alertPopup('error', 'Network Connection Error');
    if(taskData.length === 0) {
        showEmptyPlaceholder(null, taskEditContainer, null, "Failed to get task data");
        return taskEditContainer;
    }
    const taskWeightData = await fetchData(`/api/tasks/${milestoneId}`);
    if(taskWeightData === "error") return alertPopup('error', 'Network Connection Error');
    if(taskWeightData.length === 0) {
        showEmptyPlaceholder(null, taskEditContainer, null, "Failed to get task weights data");
        return taskEditContainer;
    }
    const taskEditHeader = div('taskEditHeader', 'form-edit-headers');
    const goBackBtn = button('goBackBtn');
    const goBackBtnIcon = div('goBackBtnIcon', 'icons');
    goBackBtn.addEventListener("click", () => {
        updateContents(overlayBody, () => renderViewTask(projectId, milestoneId, milestoneName, updateUiFn, overlayBody, role));
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

    const weightsButton = createButton('weightsFormBtn', 'solid-buttons', 'Tasks Weights', 'weightsBtnText', '',
        () => updateContents(overlayBody, () => renderEditWeights(taskWeightData, "tasks", { projectId, milestoneId, milestoneName, taskId, updateUiFn, overlayBody, role }))
     );
    const spanArrowIcon = span('weightsBtnIcon', 'btn-icons');
    weightsButton.append(spanArrowIcon);

    taskFormHeader.append(
        createInput('text', 'read', 'Task Name', 'taskInputName', 'task_name', taskData.task_name, 'Enter task name')
    );
    taskFormBody.append(
        createInput('text', 'read', 'Progress', 'taskInputProgress', 'task_progress', taskData.task_progress, 'Enter progress percentage', 0, 100, 'decimal', 'maximum: 100%'),
        weightsButton
        // createInput('text', 'read', 'Weights', 'taskInputWeights', 'task_weights', taskData.weights, 'Enter weight amount', 0, 100, 'decimal', 'maximum: 100%')
    );
    
    async function saveTask() {
        const taskName = document.getElementById('taskInputName').value;
        const taskProgress = document.getElementById('taskInputProgress').value;
        
        const updatedTask = {
            task_name: taskName,
            task_progress: taskProgress,
        };

        const response = await fetchPostJson(`/api/tasks/${taskId}`, 'PUT', updatedTask, null);
        if (response !== 'error') {
            alertPopup('success', 'Task updated successfully!');
        }
    }

    if(role !== 'foreman') {
        const deleteBtn = deleteFormButton(taskData.id, 'Task', () => alertPopup("success", "Task Deleted Successfully"), 
            async () => {
                await fetch(`/api/tasks/${taskData.id}`, { method: 'DELETE' });
                updateContents(overlayBody, () => renderViewTask(projectId, milestoneId, milestoneName, updateUiFn, overlayBody, role));
            }, 
            () => {}
        );
        taskFormFooter.append(deleteBtn);
    } else {
        taskFormFooter.append("");
    }
    taskEditForm.append(taskFormHeader, taskFormBody, taskFormFooter);
    taskEditBody.append(taskEditForm);
    goBackBtn.append(goBackBtnIcon);
    taskEditHeader.append(goBackBtn, role !== 'foreman' ? editFormButton(taskEditForm, () => { alertPopup("success", "Saved Successfully") }, async () => { 
        await updateUiFn(); 
        await updateContents(overlayBody, () => renderViewTask(projectId, milestoneId, milestoneName, updateUiFn, overlayBody, role)); 
    }, '', saveTask) : "");
    taskEditContainer.append(taskEditHeader, taskEditBody);

    return taskEditContainer;
}

async function renderViewTask(projectId, milestoneId, milestoneName, updateUiFn, overlayBody, role) { //tasks tab content ng milestone edit ol
    const taskViewContainer = div('taskViewContainer', 'form-edit-containers');
    const tasks = await fetchData(`/api/tasks/${milestoneId}`);
    if(tasks === "error") return alertPopup('error', 'Network Connection Error');
    
    const taskViewHeader = div('taskViewHeader', 'form-edit-headers');
    const taskViewIntro = div('taskViewIntro', 'form-edit-intros');
    const taskViewTitle = span('taskViewTitle', 'form-edit-titles');
    const taskViewSubtitle = span('taskViewSubtitle', 'form-edit-subtitles');
    taskViewTitle.innerText = `Tasks for ${milestoneName}`;
    taskViewSubtitle.innerText = "Click to view and manage tasks under this milestone";
    const taskViewBody = div('taskEditBody', 'form-edit-bodies');

    if(tasks.length === 0) {
        showEmptyPlaceholder(null, taskViewBody, null, "No tasks found for this milestone.");
    } else {
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
                updateContents(overlayBody, () => renderEditTask(projectId, milestoneId, milestoneName, task.id, updateUiFn, overlayBody, role));
            });
            taskViewBody.append(taskContainer);
            count++;
        }
    }

    const newTaskBtn = createButton('taskAddBtn', 'solid-buttons', 'New', 'taskAddText', 'taskAddIcon');
    newTaskBtn.addEventListener("click", () => {
        createTaskOl(milestoneId, () => updateContents(overlayBody, () => renderViewTask(projectId, milestoneId, milestoneName, updateUiFn, overlayBody, role)));
    });
    
    taskViewIntro.append(taskViewTitle, taskViewSubtitle);
    taskViewHeader.append(taskViewIntro, role !== 'foreman' ? newTaskBtn : "");
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
        updateContents(overlayBody, async() => await renderViewTask(projectId, milestoneId, milestoneName, updateUiFn, overlayBody, role));
    });

    overlayHeader.append(milestoneBar, taskBar);
    overlayBody.append(await renderEditMilestone(projectId, milestoneId, updateUiFn, overlayBackground, role));
    milestoneBar.classList.add("selected"); 
    showOverlayWithBg(overlayBackground);
}

export function createMilestoneOl(projectId, updateUiFn) {
    const {overlayBackground, overlayHeader, overlayBody} = createOverlayWithBg();
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = 'Create new milestone';
    overlayHeader.append(overlayHeaderContainer);
    const newMilestoneForm = document.createElement('form');
    newMilestoneForm.className = 'form-edit-forms';
    const newMilestoneFormHeader = div('newMilestoneFormHeader', 'create-form-headers');
    const newMilestoneFormFooter =  div('newMilestoneFormFooter', 'create-form-footers');
    const cancelBtn = createButton('cancelCreateBtn', 'wide-buttons', 'Cancel', 'cancelCreateText');
    const createBtn = createButton('createBtn', 'wide-buttons', 'Create', 'createBtnText');
    cancelBtn.addEventListener('click', () => { hideOverlayWithBg(overlayBackground) });

    createBtn.addEventListener('click', async () => {
        const milestoneNameInput = document.getElementById('milestoneInputName');
        const milestoneDescriptionInput = document.getElementById('milestoneInputDescription');
        const milestoneDueInput = document.getElementById('milestoneInputDue');

        if (!milestoneNameInput.value || !milestoneDueInput.value) {
            alertPopup('error', 'Milestone Name and Due Date are required.');
            return;
        }

        const newMilestone = {
            project_id: projectId,
            milestone_name: milestoneNameInput.value,
            milestone_description: milestoneDescriptionInput.value,
            duedate: milestoneDueInput.value,
            weights: 0,
        };

        const response = await fetchPostJson('/api/milestones', 'POST', newMilestone, null);
        if (response !== 'error') {
            alertPopup('success', 'Milestone created successfully!');
            hideOverlayWithBg(overlayBackground);
            await updateUiFn();
        }
    });

    newMilestoneFormFooter.append(cancelBtn, createBtn);
    newMilestoneFormHeader.append(
        createInput('text', 'edit', 'Milestone Name', 'milestoneInputName', 'milestone_name', '', 'Enter milestone name', '', 50, '', '50 characters max'),
        createInput('textarea', 'edit', 'Description', 'milestoneInputDescription', 'milestone_description', '', 'Enter milestone description', '', 100, '', '100 characters max'),
        createInput('date', 'edit', 'Due Date', 'milestoneInputDue', 'milestone_due', '', 'Select due date', '', '', '', `mm/dd/yyyy`)       
    );
    newMilestoneForm.append(newMilestoneFormHeader, newMilestoneFormFooter);
    overlayBody.append(newMilestoneForm);
    showOverlayWithBg(overlayBackground);
}

export function createFilterOverlay(left = null, right = null, top = null, bottom = null) {
    const filterOverlayContainer = div('filterOverlayContainer',  'filter-overlay-containers');
    const filterOverlayHeader = div('filterOverlayHeader');
    const filterOverlayBody = div('filterOverlayBody');
    filterOverlayContainer.append(filterOverlayHeader, filterOverlayBody);
    if(left !== null) filterOverlayContainer.style.left = left;
    if(right !== null) filterOverlayContainer.style.right = right;
    if(top !== null) filterOverlayContainer.style.top = top;
    if(bottom !== null) filterOverlayContainer.style.bottom = bottom;
    return {filterOverlayContainer, filterOverlayHeader, filterOverlayBody};
}

export function createTaskOl(milestoneId, updateUiFn) {
    const {overlayBackground, overlayHeader, overlayBody} = createOverlayWithBg();
    const overlayHeaderContainer = div('', 'overlay-header-containers');
    overlayHeaderContainer.innerText = 'Create new task';
    overlayHeader.append(overlayHeaderContainer);
    const newTaskForm = document.createElement('form');
    newTaskForm.className = 'form-edit-forms';
    const newTaskFormHeader = div('newTaskFormHeader', 'create-form-headers');
    const newTaskFormFooter =  div('newTaskFormFooter', 'create-form-footers');
    const cancelBtn = createButton('cancelCreateBtn', 'wide-buttons', 'Cancel', 'cancelCreateText');
    const createBtn = createButton('createBtn', 'wide-buttons', 'Create', 'createBtnText');
    cancelBtn.addEventListener('click', () => { hideOverlayWithBg(overlayBackground) });

    createBtn.addEventListener('click', async () => {
        const taskNameInput = document.getElementById('taskInputName');
        const taskDueInput = document.getElementById('taskInputDue');

        if (!taskNameInput.value || !taskDueInput.value) {
            alertPopup('error', 'Task Name and Due Date are required.');
            return;
        }

        const newTask = {
            milestone_id: milestoneId,
            task_name: taskNameInput.value,
            duedate: taskDueInput.value,
            weights: 0,
        };

        const response = await fetchPostJson('/api/tasks', 'POST', newTask, null);
        if (response !== 'error') {
            alertPopup('success', 'Task created successfully!');
            hideOverlayWithBg(overlayBackground);
            await updateUiFn();
        }
    });

    newTaskFormFooter.append(cancelBtn, createBtn);
    newTaskFormHeader.append(
        createInput('text', 'edit', 'Task Name', 'taskInputName', 'task_name', '', 'Enter task name', '', 50, '', '50 characters max'),
        createInput('date', 'edit', 'Due Date', 'taskInputDue', 'task_due', '', 'Select due date', '', '', '', `mm/dd/yyyy`)
    );
    newTaskForm.append(newTaskFormHeader, newTaskFormFooter);
    overlayBody.append(newTaskForm);
    showOverlayWithBg(overlayBackground);
}

export async function showLogDetailsOverlay(logId) {
    const { overlayBackground, overlayContainer, overlayHeader, overlayBody } = createOverlayWithBg();

    const logData = await fetchData(`/api/logs/${logId}/details`);
    if (logData === 'error') {
        alertPopup('error', 'Failed to fetch log details.');
        hideOverlayWithBg(overlayBackground);
        return;
    }

    overlayHeader.classList.add('log-details');
    // --- Title & Subtitle ---
    const title = div('log-detail-title', 'log-detail-title');
    let formattedLogName = '';
    if (logData.log_name && typeof logData.log_name === 'string') {
        formattedLogName = logData.log_name.charAt(0).toUpperCase() + logData.log_name.slice(1);
    }
    title.textContent = `"${formattedLogName}"`;
    const subtitle = div('log-detail-subtitle', 'log-detail-subtitle');
    if (logData.type === 'item' && logData.action === 'create') {
        subtitle.textContent = `Approved by: ${logData.full_name || 'N/A'}`;
    } else {
        subtitle.textContent = logData.project_name || 'General'; // Fallback for other logs
    }
    overlayHeader.append(title, subtitle);

    // --- By/Date Section ---
    const byDateContainer = div('log-detail-by-date', 'log-detail-by-date');
    
    // For By field
    const byInfoContainer = div('', 'log-detail-info-group'); // Group icon and text
    const byIcon = span('', 'log-detail-icon'); // Common class for icons
    byIcon.style.backgroundImage = `url('/assets/icons/person.png')`;
    const byText = span('log-detail-by');
    byText.textContent = logData.full_name || '[Deleted User]';
    byInfoContainer.append(byIcon, byText);
    byDateContainer.append(byInfoContainer);

    // For Date field
    const dateInfoContainer = div('', 'log-detail-info-group'); // Group icon and text
    const dateIcon = span('', 'log-detail-icon'); // Common class for icons
    dateIcon.style.backgroundImage = `url('/assets/icons/calendar.png')`;
    const dateText = span('log-detail-date');
    dateText.textContent = dateFormatting(logData.created_at, 'date');
    dateInfoContainer.append(dateIcon, dateText);
    byDateContainer.append(dateInfoContainer);
    
    // Move byDateContainer to be directly under overlayContainer, before overlayBody
    overlayContainer.insertBefore(byDateContainer, overlayBody);

    // --- Changes Section (edit only) ---
    if (logData.action === 'edit' && logData.details && logData.details.length > 0) {
        const changesContainer = div('log-detail-changes-container', 'log-detail-changes-container');
        const changesHeader = div('log-detail-changes-header', 'log-detail-changes-header');
        const changesTitle = span('log-detail-changes-title');
        changesTitle.textContent = 'Changes';
        const showOldValuesToggle = span('log-detail-show-old-toggle', 'log-detail-show-old-toggle');
        showOldValuesToggle.textContent = 'Show old values';
        changesHeader.append(changesTitle, showOldValuesToggle);

        const changesBody = div('log-detail-changes-body', 'log-detail-changes-body');

        logData.details.forEach(detail => {
            const changeEntry = div('log-change-entry', 'log-change-entry');
            
            const changeText = span('log-change-text');
            if (detail.label === 'Image') {
                changeText.textContent = 'Changed Image';
                showOldValuesToggle.style.display = 'none';
            } else {
                changeText.textContent = `Changed ${detail.label} to ${detail.new_value}`;
            }

            const oldValText = span('log-change-old-val', 'log-change-old-val');
            let formattedOldValue = detail.old_value;
            // Check if it's a date string like "YYYY-MM-DD HH:MM:SS"
            if (typeof detail.old_value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(detail.old_value)) {
                formattedOldValue = dateFormatting(detail.old_value, 'date');
            }
            oldValText.textContent = `(was ${formattedOldValue})`;
            oldValText.style.display = 'none'; // Initially hidden

            changeEntry.append(changeText, oldValText);
            changesBody.append(changeEntry);
        });

        showOldValuesToggle.addEventListener('click', () => {
            const showingOld = showOldValuesToggle.classList.toggle('show-old');
            showOldValuesToggle.textContent = showingOld ? 'Hide old values' : 'Show old values';
            changesBody.querySelectorAll('.log-change-entry').forEach(entry => {
                const oldVal = entry.querySelector('.log-change-old-val');
                oldVal.style.display = showingOld ? 'inline' : 'none';
            });
        });

        changesContainer.append(changesHeader, changesBody);
        overlayBody.append(changesContainer);
    }

    showOverlayWithBg(overlayBackground);
}