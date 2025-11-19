const loadingOverlay = document.getElementById("loadingOverlay");
loadingOverlay.classList.add("show");


window.onload = async() => {
    loadingOverlay.classList.remove("show");
};