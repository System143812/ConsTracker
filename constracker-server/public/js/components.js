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
    el.type = "button";
    if(id) el.id = id;
    if(className) el.className = className;
    return el;
}

export function emptyPlaceholder(divContainer, textContent) {
    const emptyContainer = div('', 'empty-containers');
    const emptyIcon = span('emptyIcon', 'icons');
    const emptyText = span('', 'empty-texts');
    emptyText.innerText = textContent;
    emptyContainer.append(emptyIcon, emptyText);
    divContainer.append(emptyContainer);
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

export function deleteFormButton(itemId, itemName, successPopupFn, updateUiFn, closeOverlayFn) {
    const deleteBtn = createButton('deleteFormBtn', 'wide-buttons', `Delete ${itemName}`, 'deleteBtnText', 'deleteBtnIcon');
    deleteBtn.addEventListener("click", () => {
        successPopupFn();
        updateUiFn();
        closeOverlayFn();
    });
    return deleteBtn;
}

export function editFormButton(form, successPopupFn, updateUiFn) {
    const editBtnContainer = div('editBtnContainer');
    const editButton = createButton('editFormBtn', 'solid-buttons',  'Edit', 'editBtnText', 'editBtnIcon');
    const saveButton = createButton('saveFormBtn', 'solid-buttons', 'Save', 'saveBtnText');
    const cancelButton = createButton('cancelFormBtn', 'solid-buttons', 'Cancel', 'cancelBtnText');
    const inputFields = form.querySelectorAll('input');
    let changes = [];
    editButton.addEventListener("click", () => {
        editBtnContainer.innerHTML = "";
        editBtnContainer.append(cancelButton, saveButton);
        
        for (const inputField of inputFields) {
            inputField.classList.remove('read');
            inputField.classList.add('edit');
            inputField.removeAttribute("readOnly");
        }
    })
    cancelButton.addEventListener("click", () => {
        editBtnContainer.innerHTML = "";
        editBtnContainer.append(editButton);
        for (const inputField of inputFields) {
            inputField.classList.add('read');
            inputField.classList.remove('edit');
            inputField.setAttribute("readOnly", true);
            inputField.value = inputField.dataset.original;
        }
    });
    saveButton.addEventListener("click", () => {
        editBtnContainer.innerHTML = "";
        editBtnContainer.append(editButton);
        updateUiFn();
        for (const inputField of inputFields) {
            inputField.classList.add('read');
            inputField.classList.remove('edit');
            inputField.setAttribute("readOnly", true);
            if(inputField.dataset.numType === 'decimal') {
                const parts = inputField.value.split(".");
                if(inputField.value.includes(".") && !parts[1]) {
                    
                    inputField.value = inputField.value + "00";
                }
            }
            if(inputField.dataset.original !== inputField.value) { //add to sa log details
                
            }
            console.log(inputField.value);
            inputField.dataset.original = inputField.value;  
        }
        return successPopupFn();
    });
    editBtnContainer.append(editButton);

    return editBtnContainer;
}

export function limitNumberInput(input, min = 0, max = 100, numType = "whole", decimals = 2) { //note: need i-handle ang num with decimal but empty ang decimal value sa save
    input.addEventListener("input", () => {
        let value = input.value;

        if (numType === "whole") {
            value = value.replace(/\D+/g, "");
            input.value = value === "" ? "" : Math.min(Math.max(Number(value), min), max);
            return;
        }

        value = value.replace(/[^0-9.]/g, "");
        const parts = value.split(".");
        if (parts.length > 2) value = parts[0] + "." + parts.slice(1).join("");

        if (parts[1]?.length > decimals) value = parts[0] + "." + parts[1].slice(0, decimals);
        
        if(value.includes(".") && parts[1] || parts[0]) {
            let num = Number(value);
            if(num > max) value = max;
        }
        input.value = value;
    });

    input.addEventListener("keydown", e => {
        if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
        if (e.key === "." && input.value.includes(".")) e.preventDefault();
    });
}




export function createInput(inputType, mode, label, inputId, name, defaultVal, placeholder, min = null, max = null, numType = null) {
    const inputBoxContainer = div('inputBoxContainer', 'input-box-containers');

    const labelEl = document.createElement("label");
    labelEl.className = "input-labels";
    labelEl.htmlFor = inputId;
    labelEl.innerText = label;

    const inputEl = document.createElement("input");
    inputEl.type = inputType;
    inputEl.name = name;
    inputEl.id = inputId;
    inputEl.className = `input-fields ${mode}`;
    inputEl.value = defaultVal ?? "";
    inputEl.placeholder = placeholder ?? "";
    inputEl.dataset.numType = numType ?? "";
    inputEl.dataset.original = defaultVal ?? "";

    if (mode === "read") {
        inputEl.readOnly = true;
    }

    const errorSpan = span('', 'error-messages');
    errorSpan.innerText = `${label} Required`;

    if(numType) limitNumberInput(inputEl, min, max, numType);

    inputEl.addEventListener('input', () => {
        if(inputEl.value === '') {
            inputEl.classList.add('error');
            errorSpan.classList.add('show');
        } else {
            inputEl.classList.remove('error');
            errorSpan.classList.remove('show');
        }
    });

    inputBoxContainer.append(labelEl, inputEl, errorSpan);
    return inputBoxContainer;
}

