import { alertPopup, expiredTokenPopup } from "./popups.js";
import { emptyFieldExists, redAllFields } from "./validateFields.js";

const loadingOverlay = document.getElementById("loadingOverlay");
const loginContainer = document.getElementById("loginFormContainer");
const imageContainer = document.getElementById("loginImageContainer");

loadingOverlay.classList.add("show");

const form = document.getElementById("loginForm");
const inputs = form.querySelectorAll("input");

async function navigateDashboard(role) {
    if(role === "admin"){
        window.location.href = `/admin/dashboard`;
    } else {
        window.location.href = `/user/dashboard`;
    }
}

form.addEventListener("submit", async(e) => {
    e.preventDefault();
    if(await emptyFieldExists(inputs, form)){
        return;
    } else {
        const formData = new FormData(form);
        const jsonData = Object.fromEntries(formData.entries())
        try {
            loadingOverlay.classList.add('show');
            const response = await fetch(`/login`, {
                method: "POST",
                headers: {
                    "Content-Type":"application/json"
                }, 
                body: JSON.stringify(jsonData),
                credentials: "include"
            });
            const data = await response.json();
            if(data.status !== "success") {
                loadingOverlay.classList.remove("show");
                alertPopup('error', 'Invalid Credentials');
                redAllFields(inputs, form);
                return console.log("Invalid Credentials");
            }
            alertPopup('success', 'Successfully logged in');
            try {
                await navigateDashboard(data.role);
                setTimeout(() => {
                    loadingOverlay.classList.remove("show");
                }, 2000);
            } catch (error) {
                loadingOverlay.classList.remove("show");
                alertPopup('error', 'Login failed');
                return console.log(error);
            } 
            console.log(data);
        } catch (error) {
            loadingOverlay.classList.remove("show");
            alertPopup('error', 'Network connection error');
            console.log(`Login Failed: ${error}`);
        }
    }
});

async function checkToken(url) {
    try {
        const response = await fetch(url, { credentials: "include" });
        const data = await response.json();
        if(!data) return alertPopup('error', 'Server Error');
        if(data.status === "success" || data.status === "missing token") return;
        if(data.status === "expired token") return expiredTokenPopup();
    } catch (error) {
        console.error(`Error Occured: ${error}`)
        alertPopup('error', 'Network Connection Error')
    }   
}

window.onload = async() => {
    await checkToken(`/checkToken`);
    Array.from(loginContainer.children).forEach((child) => {
        child.style.opacity = 1;
    });
    Array.from(imageContainer.children).forEach((child) => {
        child.style.opacity = 1;
    });
    loadingOverlay.classList.remove("show");
};