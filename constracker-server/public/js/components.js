import { alertPopup } from "/js/popups.js";
import { showOverlayWithBg, hideOverlayWithBg, createFilterOverlay } from "/mainJs/overlays.js";
import { fetchData, fetchPostJson } from "/js/apiURL.js";

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

function getErrSpan(inputField) {
    return inputField
        .closest('.input-box-containers')
        ?.querySelector('.error-messages');
}

function hideInputErr(inputField) {
    inputField.classList.remove("error"); 
    const errSpan = getErrSpan(inputField);
    errSpan.innerText = errSpan.dataset.defaultMsg;
    if(errSpan) errSpan.classList.remove("show");
}

function showInputErr(inputField) {
    inputField.classList.add("error");
    const errSpan = getErrSpan(inputField);
    errSpan.innerText = errSpan.dataset.errMsg;
    if(errSpan) errSpan.classList.add("show");
}

function validateInput(inputEl) {
    if (inputEl.value.trim() === '') {
        showInputErr(inputEl);
    } else {
        hideInputErr(inputEl);
    }
}

function getFilteredValues(filtersForm) {
    let filteredUrlParams = new URLSearchParams();
    const filters = filtersForm.querySelectorAll('[data-name]');
    let searchType;
    for (const filter of filters) {
        if(filter.dataset.searchType) searchType = filter.dataset.searchType;
        if(filter.dataset.value === "all") {
            // Do not append if value is "all" as it's the default and not needed in the URL
        } else if(filter.dataset.type === 'select') { // Specifically handle select inputs
            const values = filter.dataset.value.split(','); // Always split for select, even if single
            for (const value of values) {
                filteredUrlParams.append(filter.dataset.name, value);
            }
        } else {
            filteredUrlParams.append(`${filter.dataset.name}`, `${filter.dataset.value}`);
        }
    }
    if(searchType) filteredUrlParams.set('searchType', searchType);
    return filteredUrlParams;
}

function filterByName(applyFilterCallback, filtersForm) {
    const filterNameContainer = createFilterInput('text', '', 'filterByName', 'name', 'all', 'Search name', 'username');
    let debounceTimer;

    filterNameContainer.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (filterNameContainer.value === '') {
                filterNameContainer.dataset.value = 'all';
            } else {
                filterNameContainer.dataset.value = filterNameContainer.value;
            }
            const filteredUrlParams = getFilteredValues(filtersForm);
            applyFilterCallback(filteredUrlParams);
        }, 300); // 300ms delay
    });
    return filterNameContainer;
}

async function filterByProject(applyFilterCallback, filtersForm) {
    const projectOptionData = await fetchData(`/api/selection/project`);
    if(projectOptionData === 'error') return;
    
    const projectOptionObj = await projectOptionData;
    const filterProjectContainer = createFilterInput('select', 'dropdown', 'filterByProject', 'project', 'all', '', '', 'multiple', 2, projectOptionObj, '' );
    
    const optionCards = filterProjectContainer.querySelectorAll('.option-cards');
    for (const optionCard of optionCards) {
        optionCard.addEventListener("click", () => {
            const filteredUrlParams = getFilteredValues(filtersForm);
            applyFilterCallback(filteredUrlParams);
        });
    }
    return filterProjectContainer;
}

async function filterByRecent(applyFilterCallback, filtersForm) {
    const filterRecentContainer = div('filterByRecent', 'filter-group');
    const title = span('filterRecentTitle', 'filter-title');
    title.textContent = 'Sort by';
    
    const recentHidden = createFilterInput('hidden', '', 'filterRecentHidden', 'recent', 'newest');
    
    const newestRadio = div('newestRadioContainer', 'radio-container');
    const newestInput = document.createElement('input');
    newestInput.type = 'radio';
    newestInput.name = 'recent';
    newestInput.id = 'newest';
    newestInput.checked = true;
    const newestLabel = document.createElement('label');
    newestLabel.htmlFor = 'newest';
    newestLabel.textContent = 'Newest';
    
    newestRadio.append(newestInput, newestLabel);

    const oldestRadio = div('oldestRadioContainer', 'radio-container');
    const oldestInput = document.createElement('input');
    oldestInput.type = 'radio';
    oldestInput.name = 'recent';
    oldestInput.id = 'oldest';
    const oldestLabel = document.createElement('label');
    oldestLabel.htmlFor = 'oldest';
    oldestLabel.textContent = 'Oldest';
    
    oldestRadio.append(oldestInput, oldestLabel);
    
    function triggerUpdate() {
        const filteredUrlParams = getFilteredValues(filtersForm);
        applyFilterCallback(filteredUrlParams);
    }

    newestInput.addEventListener('change', () => {
        if(newestInput.checked) {
            recentHidden.dataset.value = 'newest';
            triggerUpdate();
        }
    });
    
    oldestInput.addEventListener('change', () => {
        if(oldestInput.checked) {
            recentHidden.dataset.value = 'oldest';
            triggerUpdate();
        }
    });

    filterRecentContainer.append(title, recentHidden, newestRadio, oldestRadio);
    return filterRecentContainer;
}

async function filterByDateFrom(applyFilterCallback, filtersForm) {
    const filterDateFromContainer = div('filterDateFromContainer', 'filter-group');
    const title = span('filterDateFromTitle', 'filter-title');
    title.textContent = 'From';
    const dateInput = createFilterInput('date', '', 'filterByDateFrom', 'dateFrom', 'all', '');

    dateInput.addEventListener('input', () => {
        dateInput.dataset.value = dateInput.value || 'all';
        const filteredUrlParams = getFilteredValues(filtersForm);
        applyFilterCallback(filteredUrlParams);
    });
    
    filterDateFromContainer.append(title, dateInput);
    return filterDateFromContainer;
}

async function filterByDateTo(applyFilterCallback, filtersForm) {
    const filterDateToContainer = div('filterDateToContainer', 'filter-group');
    const title = span('filterDateToTitle', 'filter-title');
    title.textContent = 'To';
    const dateInput = createFilterInput('date', '', 'filterByDateTo', 'dateTo', 'all', '');

    dateInput.addEventListener('input', () => {
        dateInput.dataset.value = dateInput.value || 'all';
        const filteredUrlParams = getFilteredValues(filtersForm);
        applyFilterCallback(filteredUrlParams);
    });

    filterDateToContainer.append(title, dateInput);
    return filterDateToContainer;
}

async function filterByCategory(applyFilterCallback, filtersForm) {
    const categoryOptionData = await fetchData(`/api/selection/category`);
    if(categoryOptionData === 'error') return;
    
    const categoryOptionObj = categoryOptionData; // Removed redundant await
    
    // Add a check to ensure it's an array
    if (!Array.isArray(categoryOptionObj)) {
        console.error("categoryOptionObj is not an array:", categoryOptionObj);
        return div('filterByCategory'); // Return an empty div or handle error gracefully
    }

    const filterCategoryContainer = createFilterInput('select', 'dropdown', 'filterByCategory', 'category', 'all', '', '', 'multiple', 2, categoryOptionObj, '' );
    
    const optionCards = filterCategoryContainer.querySelectorAll('.option-cards');
    for (const optionCard of optionCards) {
        optionCard.addEventListener("click", () => {
            const filteredUrlParams = getFilteredValues(filtersForm);
            applyFilterCallback(filteredUrlParams);
        });
    }
    return filterCategoryContainer;
}

export async function createFilterContainer(applyFilterCallback, searchBar = null, defaultFilterList, searchType = null) {
    const filterList = Object.keys(defaultFilterList);
    const filtersObj = {
        name: {
            filterFunction: (applyFilterCallback, filtersForm) => filterByName(applyFilterCallback, filtersForm)
        },
        recent: {
            filterFunction: async(applyFilterCallback, filtersForm) => await filterByRecent(applyFilterCallback, filtersForm)
        },
        project: {
            filterFunction: async(applyFilterCallback, filtersForm) => await filterByProject(applyFilterCallback, filtersForm)
        },
        dateFrom: {
            filterFunction: async(applyFilterCallback, filtersForm) => await filterByDateFrom(applyFilterCallback, filtersForm)
        },
        dateTo: {
            filterFunction: async(applyFilterCallback, filtersForm) => await filterByDateTo(applyFilterCallback, filtersForm)
        },
        category: {
            filterFunction: async(applyFilterCallback, filtersForm) => await filterByCategory(applyFilterCallback, filtersForm)
        }
    }

    const filtersForm = document.createElement('form');
    filtersForm.id = "filterContainer";
    const filterBtn = createButton('filterBtn', 'solid-buttons', 'Filter by',  'filterBtnText', 'filterBtnIcon');
    const { filterOverlayContainer, filterOverlayHeader, filterOverlayBody } = createFilterOverlay(searchBar ? '' : '0', searchBar ? '0' : '', '120%', '');
    filterOverlayHeader.innerText = 'Filters';
    const filterBtnContainer = div('filterBtnContainer');
    filterBtnContainer.append(filterBtn, filterOverlayContainer);
    let searchBarDiv;
    const searchBarContainer = div('searchBarContainer');
    const searchBarIcon = span("searchBarIcon", "icons");
    if(searchBar) {
        searchBarDiv = filtersObj['name'].filterFunction(applyFilterCallback, filtersForm);
        searchBarContainer.append(searchBarIcon, searchBarDiv);
        filtersForm.append(searchBarContainer);
    }
    
    filtersForm.append(filterBtnContainer);

    for (const filterName of filterList) {
        if(filterName !== 'name') filterOverlayBody.append(await filtersObj[filterName].filterFunction(applyFilterCallback, filtersForm));   
    }

    const filterBtnIcon = filterBtn.querySelector("#filterBtnIcon");
    filterBtn.addEventListener('click', () => {
        if(!filterOverlayContainer.classList.contains("show")) {
            filterBtnIcon.classList.add("hide");
            showOverlayWithBg(filterOverlayContainer);
        } else {
            filterBtnIcon.classList.remove("hide");
            filterOverlayContainer.classList.remove('show');
            setTimeout(() => {filterOverlayContainer.style.display = 'none'}, 160);
        }
    });
    filtersForm.addEventListener("submit", (e) => { e.preventDefault() });

    return filtersForm;
}

export async function createLogs(logType, action, logName, project_id = null, logDetailsObj) {
    try {
        const logObject = {
            logName: logName,
            projectId: project_id,
            type: logType,
            action: action,
            logDetails: logDetailsObj
        }
        const response = await fetchPostJson('/api/logs', '', logObject, '');
        if(response === "error") return alertPopup('error', 'Network Connection Error');
    } catch (error) {
        return alertPopup("error", `Network Connection Error`);
    }
}

export function createButton(elemId, elemClass = null, buttonTextString, btnTextId, iconId = null, eventFunction = null) {
    const buttonContainer = button(elemId, elemClass)
    let buttonIcon;
    let buttonText;
    if(iconId) {
        buttonIcon = span(iconId, 'btn-icons');
        buttonText = span(btnTextId, 'btn-texts');
        buttonText.innerText = buttonTextString;
        buttonContainer.append(buttonIcon, buttonText);
    } else {
        buttonText = span(btnTextId, 'btn-texts');
        buttonText.innerText = buttonTextString;
        buttonContainer.append(buttonText);
    }
    if(eventFunction) buttonContainer.addEventListener("click", () => {
        eventFunction();
    });

    return buttonContainer;
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

export function editFormButton(form, successPopupFn, updateUiFn, recheckFieldsFn = null, saveFn = null) {
    const editBtnContainer = div('editBtnContainer');
    const editButton = createButton('editFormBtn', 'solid-buttons',  'Edit', 'editBtnText', 'editBtnIcon');
    const saveButton = createButton('saveFormBtn', 'solid-buttons', 'Save', 'saveBtnText');
    const cancelButton = createButton('cancelFormBtn', 'solid-buttons', 'Cancel', 'cancelBtnText');
    const inputFields = form.querySelectorAll('input, textarea');
    let changes = [];
    editButton.addEventListener("click", () => {
        editBtnContainer.innerHTML = "";
        editBtnContainer.append(cancelButton, saveButton);
        
        for (const inputField of inputFields) {
            inputField.classList.remove('read');
            inputField.classList.add('edit');
            inputField.removeAttribute("readOnly");
            validateInput(inputField);
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
            validateInput(inputField);
        }
        if(recheckFieldsFn) recheckFieldsFn();
    });
    saveButton.addEventListener("click", async() => {
        let changes = false;
        if(document.getElementById("weightTotalErr")?.classList.contains("error")) return alertPopup("error", "Invalid input value");
        for (const inputField of inputFields) {
            if(inputField.classList.contains("error")) return alertPopup("error", "Invalid input value");
        }

        editBtnContainer.innerHTML = "";
        editBtnContainer.append(editButton);
        
        for (const inputField of inputFields) {
            inputField.classList.add('read');
            inputField.classList.remove('edit');
            inputField.setAttribute("readOnly", true);

            if(inputField.dataset.numType === 'decimal') { //pag nag save ka ng number field but ang last char is dot, this will trigger. Gagawing .00 ang last char.
                const parts = inputField.value.split(".");
                if(inputField.value.includes(".") && !parts[1]) {
                    inputField.value = inputField.value + "00";
                }
            }
            if(inputField.dataset.original !== inputField.value) changes = true;
            validateInput(inputField);
        }
        if(!changes) return;
        if(saveFn) {
            await saveFn();
            await updateUiFn();
            return;
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


function createFilterInput(inputType, inputVariant = null,  inputId, name, defaultVal, placeholder, searchType = null, selectType = null, selectLimit = null, selectOptionObj = null, optionLabel = null) {
    let filterInput;
    if(inputType === 'select') {
        if(inputVariant && inputVariant === 'dropdown') {
            console.log("this is the object", selectOptionObj);
            filterInput = document.createElement('button');
            filterInput.id = inputId;
            filterInput.classList.add('select-option-dropdowns')
            const selectOptionText = span('selectOptionText', 'btn-texts');
            const selectIcon = span('selectOptionIcon', 'btn-icons');
            const optionOverlay = div('selectionOverlay', 'selection-overlays');

            if(selectType === 'single') {
                selectOptionText.innerText = `Select a ${name}`;
                selectLimit = 1;
            } else {
                selectOptionText.innerText = 'All';    
            }

            function selectOptionCard(card, icon) {
                card.classList.add('selected');
                icon.style.display = 'flex';
                setTimeout(() => { icon.classList.add('show') }, 50);
            }

            function unselectOptionCard(card, icon) {
                card.classList.remove('selected');
                icon.classList.remove('show');
                setTimeout(() => { icon.style.display = 'none' }, 110);
            }

            for (const option of selectOptionObj) {
                const optionCard = div('optionCard', 'option-cards');
                optionCard.dataset.value = option.id;
                const optionCardTitle = div('', 'option-card-titles');
                const optionCardName = span('', 'option-card-names');
                optionCardName.innerText = option.name;
                const optionCardLabel = span('', 'option-card-labels');
                if(optionLabel) optionCardLabel.innerText = option.label;
                const optionCardIcon = span('', 'option-card-icons');
                optionCardIcon.classList.add('btn-icons');
                optionCardTitle.append(optionCardName, optionLabel ? optionCardLabel : '');
                optionCard.append(optionCardTitle, optionCardIcon);
                optionOverlay.append(optionCard);
                
                optionCard.addEventListener("click", () => {
                    let initialValues = [];
                    if(selectType === 'multiple') {
                        if(optionCard.classList.contains('selected')) {
                            unselectOptionCard(optionCard, optionCardIcon);
                        } else {
                            selectOptionCard(optionCard, optionCardIcon);
                        }
                        const cards = optionOverlay.querySelectorAll('.option-cards');
                        let notAllSelected = false;
                        let selectedCount = 0;
                        
                        for (const card of cards) {
                            if(!card.classList.contains('selected')) {
                                notAllSelected = true;
                            } else {
                                initialValues.push(card.dataset.value);
                                selectedCount++;
                            }
                        };

                        if(!notAllSelected) {
                            initialValues = 'all';
                            selectOptionText.innerText = 'All';
                        } else if(selectedCount === 0) {
                            initialValues = 'all';
                            selectOptionText.innerText = `Select a ${name}`;
                        } else {
                            selectOptionText.innerText = `(${selectedCount}) selected`;
                        }
                        filterInput.dataset.value = initialValues;
                    } else if(selectType === 'single') {
                        if(optionCard.classList.contains('selected')) {
                            unselectOptionCard(optionCard, optionCardIcon);
                            filterInput.dataset.value = 'all';
                            selectOptionText.innerText = `Select a ${name}`;
                        } else {
                            const cards = optionOverlay.querySelectorAll('.option-cards');
                            for (const card of cards) {
                                unselectOptionCard(card, card.querySelector('.option-card-icons'));    
                            }
                            setTimeout(() => {
                                selectOptionCard(optionCard, optionCardIcon);
                                console.log(`Eto value ng project single: `, initialValues);
                                selectOptionText.innerText = optionCardName.innerText;
                            }, 120);
                            initialValues.push(optionCard.dataset.value);
                            filterInput.dataset.value = initialValues;
                        }
                        
                    } else return console.error(`Error: ${selectType} is not a valid selectType`);
                });
            }    
            filterInput.dataset.name = name;
            filterInput.dataset.value = defaultVal ?? 'all';

            filterInput.append(selectOptionText, selectIcon, optionOverlay);
            optionOverlay.addEventListener("click", (e) => {
                e.stopPropagation();
            })
            filterInput.addEventListener("click", () => {
                if(optionOverlay.classList.contains('show')) {
                    optionOverlay.classList.remove("show");
                    setTimeout(() => {
                        optionOverlay.style.display = 'none';
                    }, 160);
                } else {
                    showOverlayWithBg(optionOverlay);
                }
            });
        } else if(inputVariant && inputVariant === 'radio') {
            
            if(selectType === 'single') selectLimit = 1;
            
            filterInput = div(inputId);
            filterInput.classList.add('select-option-radios');
            filterInput.dataset.name = name;

            for (const option of selectOptionObj) {
                const optionRadioContainers = div('optionRadio', 'option-radio-containers');
                const optionRadio = document.createElement('input');
                optionRadio.type = 'radio';
                optionRadio.setAttribute('selected')
                const optionCardName = div('', 'option-card-names');
                optionCardName.innerText = option.name;
                optionRadioContainers.addEventListener("click", () => {
                    
                });
            }

        } else return console.error(`Error: ${inputVariant} is not a valid inputVariant`);
    } else {
        if(inputType === 'text' || inputType === 'date' || inputType === 'hidden') {
            filterInput = document.createElement('input');
            filterInput.type = inputType;
        }   
        
        filterInput.id = inputId;
        filterInput.dataset.name = name;
        filterInput.dataset.defaultValue = defaultVal ?? 'all';
        filterInput.dataset.searchType = searchType ?? "";
        if(filterInput.value === "") filterInput.dataset.value = 'all';
        filterInput.placeholder = placeholder ?? "";
        
    }
    filterInput.dataset.type = inputType;
    return filterInput;
}

export function createInput(inputType, mode, label, inputId, name, defaultVal, placeholder, min = null, max = null, numType = null, defaultLabel = null) {
    const inputBoxContainer = div('inputBoxContainer', 'input-box-containers');

    const labelEl = document.createElement("label");
    labelEl.className = "input-labels";
    labelEl.htmlFor = inputId;
    labelEl.innerText = label;
    let inputEl;
    if(inputType === 'textarea') {
        inputEl = document.createElement("textarea");
        inputEl.rows = 3;
    } else {
        inputEl = document.createElement("input");
        inputEl.type = inputType;
    }
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

    const errorSpan = span(``, 'error-messages');
    errorSpan.dataset.errMsg = `${label} Required`;
    errorSpan.dataset.defaultMsg = defaultLabel ?? " ";
    errorSpan.innerText = errorSpan.dataset.defaultMsg;
    if(!numType && max) {
        inputEl.addEventListener("input", () => {
            if(inputEl.value.length > max) {
                inputEl.value = inputEl.value.slice(0, max);
            }
        });
    };
    if(numType) limitNumberInput(inputEl, min, max, numType);

    inputEl.addEventListener('input', () => {
        validateInput(inputEl);
    });

    inputBoxContainer.append(labelEl, inputEl, errorSpan);
    return inputBoxContainer;
}

