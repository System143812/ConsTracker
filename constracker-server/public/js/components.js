
export function div(id, className) {
    const el = document.createElement('div');
    if(id) el.id = id;
    if(className) el.className = className;
    return el;
}

export function span(id, className) {
    const el = document.createElement('span');
    if(id) el.id = id;
    if(className) el.className = className;
    return el;
}

export function button(id, className) {
    const el = document.createElement('button');
    if(id) el.id = id;
    if(className) el.className = className;
    return el;
}

export function createButton(elemId, elemClass = null, buttonTextString, btnTextId, iconId = null) {
    const buttonContainer = button(elemId, elemClass)
    let buttonIcon;
    let buttonText;
    if(iconId) {
        buttonIcon = span(iconId, 'btn-icons');
        buttonText = span(btnTextId, 'btn-texts');
        buttonText.innerText = buttonTextString;
        buttonContainer.append(buttonIcon, buttonText);
        return buttonContainer;
    } else {
        buttonText = span(btnTextId, 'btn-texts');
        buttonText.innerText = buttonTextString;
        buttonContainer.append(buttonText);
        return buttonContainer;
    }
}

export function editFormButton() {
    const editBtnContainer = div('editBtnContainer');
    const editButton = createButton('editFormBtn', 'edit-form-btn',  'Edit', 'editBtnText', 'editBtnIcon');
    const saveButton = createButton('saveFormBtn', 'save-form-btn', 'Save', 'saveBtnText');
    const cancelButton = createButton('cancelFormBtn', 'cancel-form-btn', 'Cancel', 'cancelBtnText');
    editButton.addEventListener("click", () => {
        editBtnContainer.innerHTML = "";
        editBtnContainer.append(cancelButton, saveButton);
    })
    cancelButton.addEventListener("click", () => {
        editBtnContainer.innerHTML = "";
        editBtnContainer.append(editButton);
    });
    editBtnContainer.append(editButton);

    return editBtnContainer;
}