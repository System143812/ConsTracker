    const loadingOverlay = document.getElementById("loadingOverlay");
    loadingOverlay.classList.add("show");

    import { fetchData } from "/js/apiURL.js";
    import { createTab, sidebarInitEvents } from "/mainJs/sidebar.js";
    import { formatString } from "/js/string.js";
    import { alertPopup } from "/js/popups.js";
    import { displayContents } from "/admin/adminContent.js";

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
    const roleIcon = document.getElementById('sidebarRoleIcon');
    const roleName = document.getElementById('sidebarRoleName');
    const roleEmail = document.getElementById('roleEmail');
    const hamburgerBtn = document.getElementById('hamburgerButton');
    const outerContainer = document.getElementById('outerContainer');
    const sidebarContainer =  document.getElementById('sidebarContainer');
    const contentContainer = document.getElementById('contentContainer');
    const sidebarHeaderContainer = document.getElementById('sidebarHeaderContainer');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const brandLogo = document.getElementById('brandLogo');
    const logoutBtn = document.getElementById('logoutTab');
    let currentTab = 'dashboard';
    
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
        if(data.role === 'engineer') roleIcon.classList.add('engineer');
        if(data.role === 'project manager') roleIcon.classList.add('manager');
        if(data.role === 'foreman') roleIcon.classList.add('foreman');
        roleName.innerText = formatString(data.role); 
        roleEmail.innerText = data.email;
        await getAccessLevel(data.role);
    }

    async function getAccessLevel(role) {
        const data = await fetchData('/access');
        if(data === 'error') return;
        for await(const element of data) {
            createTab(element);
        }
        document.getElementById('dashboardTab').classList.add('selected');
        await displayContents(currentTab, 'upperTabs', role);
        sidebarInitEvents(displayContents, role);
    }

window.onload =  async() => {
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