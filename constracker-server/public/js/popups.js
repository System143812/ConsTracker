const urlBase2 = 'https://constracker.share.zrok.io';
const urlBase = 'http://localhost:3000';

const errorImg = new Image();
errorImg.src = `${urlBase}/assets/icons/remove.png`;
const successImg = new Image();
successImg.src = `${urlBase}/assets/icons/check.png`;


export function alertPopup(status, message) {
    const popupContainer = document.createElement('div');
    popupContainer.id = 'alertPopupContainer';
    const popupIcon = document.createElement('div');
    popupIcon.id = 'alertPopupIcon';
    const popupMessage = document.createElement('div');
    popupMessage.id = 'alertPopupMessage';
    popupMessage.innerText = message;
    if(status === "error"){
        popupContainer.classList.add('error');
        popupIcon.classList.add('error');
        popupIcon.style.backgroundImage = `url(${errorImg.src})`;
        popupMessage.classList.add('error');
    } else if(status === "success") {
        popupContainer.classList.remove('error');
        popupIcon.classList.remove('error');
        popupIcon.style.backgroundImage = `url(${successImg.src})`;
        popupMessage.classList.remove('error');
    } else {
        return;
    }
    document.body.appendChild(popupContainer);
    popupContainer.append(popupIcon, popupMessage);

    popupContainer.style.opacity = 1;
    popupContainer.style.pointerEvents = 'auto';
    setTimeout(() => { 
        popupContainer.style.opacity = 0;
        popupContainer.pointerEvents = 'none';   
    }, 3000);
}

export function expiredTokenPopup() {
    const expTokenContainer = document.createElement('div');
    expTokenContainer.id = 'expTokenContainer';
    const expTokenContent = document.createElement('div');
    expTokenContent.id = 'expTokenContent';
    const expTokenHeader = document.createElement('div')
    expTokenHeader.id = 'expTokenHeader';
    expTokenHeader.innerText = "Your session has expired. Please log in again.";
    const expTokenFooter = document.createElement('div');
    expTokenFooter.id = 'expTokenFooter';
    const expTokenNavigate = document.createElement('div');
    expTokenNavigate.id = 'expTokenNavigate';
    expTokenNavigate.innerText = "Ok";
    expTokenNavigate.addEventListener("click", () => {expTokenContainer.classList.remove("show")});
    document.body.append(expTokenContainer);
    expTokenContainer.append(expTokenContent);
    expTokenContent.append(expTokenHeader, expTokenFooter);
    expTokenFooter.append(expTokenNavigate);

    expTokenContainer.classList.add("show");
}

export function warnType(div, type, color, divIcon, divText) {
    const chooseColor = {
        red: {
            color: (curr_div) => { 
                curr_div.classList.remove('yellow');
                curr_div.classList.remove('green');
                curr_div.classList.add('red');
                curr_div.classList.remove('white');
            }
        },
        yellow: {
            color: (curr_div) => {    
                curr_div.classList.remove('green');
                curr_div.classList.remove('red');
                curr_div.classList.add('yellow');
                curr_div.classList.remove('white');
            }
        },
        green: {
            color: (curr_div) => { 
                curr_div.classList.remove('red');
                curr_div.classList.remove('yellow');
                curr_div.classList.add('green');
                curr_div.classList.remove('white');
            }
        },
        white: {
            color: (curr_div) => { 
                curr_div.classList.add('white');
                curr_div.classList.remove('red');
                curr_div.classList.remove('yellow');
                curr_div.classList.remove('green');
            }
        }
    };
    const warnBox = div;
    if(!divIcon && !divText){
        if(type === 'solid'){
            warnBox.classList.add('warn-solid');
            if(!color) return;
            chooseColor[color].color(warnBox);
        } else {
            warnBox.classList.add('warn-glass');
            if(!color) return;
            chooseColor[color].color(warnBox);
        }
    } else {
        const warnIcon = divIcon;
        const warnText = divText;
        if(!color) return;
        warnBox.classList.add('warn-big-container');
        warnIcon.classList.add('warn-big-icon');
        warnText.classList.add('warn-big-text');
        if(color !== 'green'){
            chooseColor[color].color(warnBox);
            chooseColor[color].color(warnIcon);
            chooseColor[color].color(warnText);
        } else {
            return;
        }  
    } 
}

export function showEmptyPlaceholder(iconPath, contentContainer, popupOverlay, placeholderText, actionText, contentId) {
    const emptyContentPlaceholder = document.createElement('div');
    emptyContentPlaceholder.className = 'empty-content-placeholder';
    const emptyContentIcon = document.createElement('div');
    emptyContentIcon.classList.add('empty-placeholders');
    emptyContentIcon.style.backgroundImage = `url(${iconPath})`;
    const emptyContentText = document.createElement('div');
    emptyContentText.className = 'empty-content-text';
    emptyContentText.innerText = placeholderText;
    const emptyContentAction = document.createElement('div');
    emptyContentAction.innerText = actionText;
    emptyContentAction.className = 'empty-content-action';
    emptyContentAction.addEventListener("click", () => {
        popupOverlay(contentId);
    });
    emptyContentPlaceholder.append(emptyContentIcon, emptyContentText, emptyContentAction);
    contentContainer.append(emptyContentPlaceholder);
}