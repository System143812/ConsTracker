import { fetchData } from "/js/apiURL.js";
import { formatString, dateFormatting } from "/js/string.js";
import { alertPopup, warnType } from "/js/popups.js";
import { hideContents } from "/mainJs/sidebar.js";



export async function displayUserContents(tabName, tabType) {
    if(tabType === 'upperTabs') {
        console.log('display yung dashboard');
    } else {
        console.log('display yung profileTabs');
    }
}