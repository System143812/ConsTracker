const loadingOverlay = document.getElementById("loadingOverlay");
loadingOverlay.classList.add("show");

import { fetchData } from "/js/apiURL.js";
import { createTab, sidebarInitEvents, createProjectsTab, noProjectTabPlaceholder } from "/mainJs/sidebar.js";
import { alertPopup } from "/js/popups.js";
import { displayUserContents } from "/user/userContent.js";

const dateTime = new Date();
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayString = `${days[dateTime.getDay()]}`;
const monthString = `${months[dateTime.getMonth()]}`;
const formattedDateTime = `${dayString}, ${monthString} ${dateTime.getDate()}, ${dateTime.getFullYear()}`;

const date = document.getElementById('dateTime');
date.innerText = formattedDateTime;

const profileIcon = document.getElementById('profileIcon');
const profileName = document.getElementById('profileName');
const hamburgerBtn = document.getElementById('hamburgerButton');
const outerContainer = document.getElementById('outerContainer');
const sidebarContainer =  document.getElementById('sidebarContainer');
const contentContainer = document.getElementById('contentContainer');
const dashboardBodyContent = document.getElementById('dashboardBodyContent');
const sidebarHeaderContainer = document.getElementById('sidebarHeaderContainer');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const brandLogo = document.getElementById('brandLogo');
const logoutBtn = document.getElementById('logoutTab');
let currentTab = 'dashboard';

function noProjectBodyPlaceholder() {
    const noProjectBodyContainer = document.createElement('div');
    noProjectBodyContainer.id = 'noProjectBodyContainer';
    const noProjectBodyImage = document.createElement('div');
    noProjectBodyImage.id = 'noProjectBodyImage';
    const noProjectBodyText = document.createElement('div');
    noProjectBodyText.id = 'noProjectBodyText';
    noProjectBodyText.innerText = 'You are not assigned to any projects yet';
    noProjectBodyContainer.append(noProjectBodyImage, noProjectBodyText);
    return noProjectBodyContainer;
}   

async function initListeners() {
    sidebarHeaderContainer.addEventListener("click", () => {
        setTimeout(() => {
            sidebarHeaderContainer.classList.toggle("hovered");
            brandLogo.classList.toggle("hovered");
        }, 150);
    });

    hamburgerBtn.addEventListener("click", () => {
        sidebarContainer.classList.toggle("hide");
        sidebarContainer.classList.toggle("showMobile");
        sidebarOverlay.classList.toggle("showMobile");
    });

    sidebarOverlay.addEventListener("click", (e) => {
        if(e.target === sidebarOverlay)  {
            sidebarOverlay.classList.toggle("showMobile")
            sidebarContainer.classList.toggle("showMobile");
            sidebarContainer.classList.toggle("hide");
        }
    });

    logoutBtn.addEventListener("click", logout);
}

async function logout() {
    const data = await fetchData('/logout');
    if(data === 'error') return;
    if(data.status === "success") window.location.href = '/';
        return alertPopup("success", `Logged out successfully`);
}

async function getProfileData() {
    const data = await fetchData('/profile');
    if(data === 'error') return;
    const profileIconAcronym = ((data.full_name.match(/\b\w/g).slice(0, 2)).join(""));
    profileIcon.innerText = profileIconAcronym;
    profileName.innerText = data.full_name;

    await getAccessLevel(data.role);
}

async function getAccessLevel(role) {
    const data = await fetchData('/access');
    if(data === 'error') return;
    for await(const element of data) {
        createTab(element);
    }
    const projects = await fetchData('/api/myProjects');
    if(projects === 'error') return;
    if(projects.length === 0) {
        noProjectTabPlaceholder();
        dashboardBodyContent.append(noProjectBodyPlaceholder());
        document.getElementById('dashboardTab').classList.add('selected');
        await displayUserContents(currentTab, 'upperTabs', role);
        sidebarInitEvents(displayUserContents, role);
        const sideTabs = document.querySelectorAll('.sidebar-tabs');
        for (const sideTab of sideTabs) {
            if(sideTab.id !== 'logoutTab') sideTab.addEventListener("click", () => {
                dashboardBodyContent.append(noProjectBodyPlaceholder());
            });
        }

    } else {
        for (const project of projects) {
            createProjectsTab(project);
        }
        document.getElementById('dashboardTab').classList.add('selected');
        await displayUserContents(currentTab, 'upperTabs', role);
        sidebarInitEvents(displayUserContents, role);
    }
}

window.onload = async() => {
    try {
        await initListeners();
        await getProfileData();
    } catch (error) {
        console.error(`Error Occured: ${error}`);
        alertPopup('error', 'Network Connection Error');
    } finally {
        Array.from(outerContainer.children).forEach(child => child.style.opacity = 1);
        loadingOverlay.classList.remove("show");
    }
};