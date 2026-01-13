function removeRedFields(inputFields, form){
    inputFields.forEach(element => {
        const inputBox = form.querySelector(`#${element.name}Box`);
        const inputError = form.querySelector(`#${element.name}Error`);
        inputBox.classList.remove('show-error-box');
        inputError.classList.remove('show-error-message');
    });
}

export function emptyFieldExists(inputFields, form) { //sa login lang to ginamit, gumawa nako ng bagong version nito
    removeRedFields(inputFields, form);
    return new Promise(resolve => {
        setTimeout(() => {
            let emptyExist = false;
            inputFields.forEach(element => {
                const inputBox = form.querySelector(`#${element.name}Box`);
                const inputError = form.querySelector(`#${element.name}Error`);
                const inputValue = inputBox.value.trim("");
                if(inputValue === "") {
                    inputBox.classList.add('show-error-box');
                    inputError.classList.add('show-error-message');
                    emptyExist = true;
                } else {
                    inputBox.classList.remove('show-error-box');
                    inputError.classList.remove('show-error-message');
                }
            });
            resolve(emptyExist);
        }, 100);
    });
}

export function redAllFields(inputFields, form) {
    removeRedFields(inputFields, form);
    inputFields.forEach(element => {
        const inputBox = form.querySelector(`#${element.name}Box`);
        inputBox.classList.add('show-error-box');
    });
}


